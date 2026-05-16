import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { adminProcedure } from "../procedures";
import { TRPCError } from "@trpc/server";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addDays,
  differenceInDays,
  format,
} from "date-fns";

// ── HELPERS ────────────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<string, { appointments: number; doctors: number }> = {
  BASIC: { appointments: 300, doctors: 1 },
  PRO: { appointments: 800, doctors: 5 },
  ENTERPRISE: { appointments: 999_999, doctors: 999 },
};

const PLAN_FEES: Record<string, number> = {
  BASIC: 12000,
  PRO: 22000,
  ENTERPRISE: 50000, // default enterprise
};

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}-${rand}`;
}

function formatDA(amount: number): string {
  return `${amount.toLocaleString("fr-DZ")} DA`;
}

// ── ROUTER ─────────────────────────────────────────────────────────────────────

export const billingRouter = createTRPCRouter({
  // ── OVERVIEW ───────────────────────────────────────────────────────────────

  getOverview: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const [allClinics, newThisMonth, invoices, payments, cancelledThisMonth] =
      await Promise.all([
        ctx.prisma.clinic.findMany({
          where: { cancelledAt: null },
          select: {
            id: true,
            subscriptionPlan: true,
            monthlyFee: true,
            isActive: true,
            suspendedAt: true,
            createdAt: true,
            balance: true,
          },
        }),
        ctx.prisma.clinic.count({
          where: { createdAt: { gte: thisMonthStart, lte: thisMonthEnd } },
        }),
        ctx.prisma.invoice.findMany({
          where: { date: { gte: thisMonthStart, lte: thisMonthEnd } },
          select: { amount: true, status: true, dueDate: true, clinicId: true },
        }),
        ctx.prisma.payment.findMany({
          where: { paymentDate: { gte: thisMonthStart, lte: thisMonthEnd } },
          select: { amount: true },
        }),
        ctx.prisma.clinic.count({
          where: { cancelledAt: { gte: thisMonthStart, lte: thisMonthEnd } },
        }),
      ]);

    const activeClinics = allClinics.filter((c) => !c.suspendedAt && c.isActive);
    const mrr = activeClinics.reduce((sum, c) => sum + c.monthlyFee, 0);

    // New MRR from clinics created this month
    const newClinics = allClinics.filter(
      (c) => c.createdAt >= thisMonthStart && c.createdAt <= thisMonthEnd
    );
    const newMrr = newClinics.reduce((sum, c) => sum + c.monthlyFee, 0);

    // Last month MRR (approximate)
    const lastMonthClinics = await ctx.prisma.clinic.findMany({
      where: {
        createdAt: { lte: lastMonthEnd },
        OR: [{ cancelledAt: null }, { cancelledAt: { gte: lastMonthEnd } }],
      },
      select: { monthlyFee: true },
    });
    const lastMrr = lastMonthClinics.reduce((sum, c) => sum + c.monthlyFee, 0);

    // Outstanding invoices
    const outstanding = await ctx.prisma.invoice.findMany({
      where: { status: { in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] } },
      select: { amount: true, dueDate: true },
    });
    const outstandingTotal = outstanding.reduce((s, i) => s + i.amount, 0);
    const overdue30 = outstanding
      .filter((i) => differenceInDays(now, i.dueDate) > 30)
      .reduce((s, i) => s + i.amount, 0);

    const clinicsWithBalance = await ctx.prisma.clinic.count({
      where: { balance: { lt: 0 } },
    });

    // Collections this month
    const collected = payments.reduce((s, p) => s + p.amount, 0);
    const expectedTotal = invoices.reduce((s, i) => s + i.amount, 0);

    // Plan distribution
    const planDist = { BASIC: 0, PRO: 0, ENTERPRISE: 0 };
    for (const c of activeClinics) {
      const plan = c.subscriptionPlan as keyof typeof planDist;
      if (plan in planDist) planDist[plan]++;
    }

    // Churn
    const totalClinicsLastMonth = lastMonthClinics.length;
    const churnRate =
      totalClinicsLastMonth > 0
        ? Math.round((cancelledThisMonth / totalClinicsLastMonth) * 100)
        : 0;

    return {
      mrr,
      lastMrr,
      mrrGrowth: lastMrr > 0 ? Math.round(((mrr - lastMrr) / lastMrr) * 100) : 0,
      arr: mrr * 12,
      newMrr,
      activeClinics: activeClinics.length,
      planDistribution: planDist,
      outstandingTotal,
      overdue30,
      clinicsWithBalance,
      collected,
      expectedTotal,
      collectionRate: expectedTotal > 0 ? Math.round((collected / expectedTotal) * 100) : 0,
      cancelledThisMonth,
      churnRate,
      newClinicCount: newThisMonth,
    };
  }),

  // ── REVENUE HISTORY (12 months) ────────────────────────────────────────────

  getRevenueHistory: adminProcedure
    .input(z.object({ months: z.number().min(1).max(24).default(12) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const result = [];

      for (let i = input.months - 1; i >= 0; i--) {
        const mStart = startOfMonth(subMonths(now, i));
        const mEnd = endOfMonth(subMonths(now, i));

        const [payments, invoices, newClinics] = await Promise.all([
          ctx.prisma.payment.aggregate({
            where: { paymentDate: { gte: mStart, lte: mEnd } },
            _sum: { amount: true },
          }),
          ctx.prisma.invoice.aggregate({
            where: { date: { gte: mStart, lte: mEnd } },
            _sum: { amount: true },
          }),
          ctx.prisma.clinic.aggregate({
            where: { createdAt: { gte: mStart, lte: mEnd } },
            _sum: { monthlyFee: true },
          }),
        ]);

        result.push({
          month: format(mStart, "MMM yyyy"),
          collections: payments._sum.amount ?? 0,
          invoiced: invoices._sum.amount ?? 0,
          newMrr: newClinics._sum.monthlyFee ?? 0,
        });
      }

      return result;
    }),

  // ── SUBSCRIPTIONS LIST ─────────────────────────────────────────────────────

  getSubscriptions: adminProcedure
    .input(
      z.object({
        status: z.enum(["all", "active", "suspended", "cancelled"]).default("all"),
        plan: z.enum(["all", "BASIC", "PRO", "ENTERPRISE"]).default("all"),
        paymentStatus: z.enum(["all", "current", "overdue", "grace"]).default("all"),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const where: Record<string, unknown> = {};

      if (input.status === "active") where.isActive = true, (where.suspendedAt = null), (where.cancelledAt = null);
      if (input.status === "suspended") where.suspendedAt = { not: null };
      if (input.status === "cancelled") where.cancelledAt = { not: null };
      if (input.plan !== "all") where.subscriptionPlan = input.plan;
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { city: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const clinics = await ctx.prisma.clinic.findMany({
        where,
        include: {
          invoices: {
            where: { status: { in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] } },
            orderBy: { dueDate: "asc" },
            take: 1,
          },
          payments: {
            orderBy: { paymentDate: "desc" },
            take: 1,
          },
          _count: { select: { appointments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      });

      const total = await ctx.prisma.clinic.count({ where });

      return {
        clinics: clinics.map((c) => {
          const oldestUnpaid = c.invoices[0];
          const daysOverdue = oldestUnpaid
            ? Math.max(0, differenceInDays(now, oldestUnpaid.dueDate))
            : 0;
          const lastPayment = c.payments[0] ?? null;

          let paymentStatus: "current" | "overdue" | "grace" = "current";
          if (oldestUnpaid) {
            paymentStatus = daysOverdue > 0 ? (daysOverdue <= 30 ? "grace" : "overdue") : "current";
          }

          return {
            id: c.id,
            name: c.name,
            logo: c.logo,
            city: c.city,
            subscriptionPlan: c.subscriptionPlan,
            monthlyFee: c.monthlyFee,
            isActive: c.isActive,
            suspendedAt: c.suspendedAt,
            cancelledAt: c.cancelledAt,
            balance: c.balance,
            createdAt: c.createdAt,
            nextBillingDate: c.nextBillingDate,
            paymentStatus,
            daysOverdue,
            lastPaymentDate: lastPayment?.paymentDate ?? null,
            lastPaymentAmount: lastPayment?.amount ?? null,
          };
        }),
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // ── SUBSCRIPTION DETAIL ────────────────────────────────────────────────────

  getSubscriptionDetail: adminProcedure
    .input(z.object({ clinicId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const [clinic, invoices, payments, notes, planChanges, appointmentsThisMonth] =
        await Promise.all([
          ctx.prisma.clinic.findUnique({
            where: { id: input.clinicId },
            include: {
              _count: { select: { doctors: true, patients: true, appointments: true } },
            },
          }),
          ctx.prisma.invoice.findMany({
            where: { clinicId: input.clinicId },
            include: { reminders: true, payments: true },
            orderBy: { date: "desc" },
          }),
          ctx.prisma.payment.findMany({
            where: { clinicId: input.clinicId },
            include: { recorder: { select: { name: true } } },
            orderBy: { paymentDate: "desc" },
          }),
          ctx.prisma.subscriptionNote.findMany({
            where: { clinicId: input.clinicId },
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          }),
          ctx.prisma.planChangeLog.findMany({
            where: { clinicId: input.clinicId },
            orderBy: { effectiveAt: "desc" },
          }),
          ctx.prisma.appointment.count({
            where: { clinicId: input.clinicId, createdAt: { gte: monthStart, lte: monthEnd } },
          }),
        ]);

      if (!clinic) throw new TRPCError({ code: "NOT_FOUND" });

      const limits = PLAN_LIMITS[clinic.subscriptionPlan] ?? PLAN_LIMITS.BASIC;
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const unpaidInvoices = invoices.filter((i) =>
        ["UNPAID", "PARTIALLY_PAID", "OVERDUE"].includes(i.status)
      );
      const totalOutstanding = unpaidInvoices.reduce((s, i) => s + i.amount, 0);

      return {
        clinic: {
          ...clinic,
          paymentMethod: clinic.paymentMethod,
        },
        limits,
        usage: {
          appointments: appointmentsThisMonth,
          appointmentLimit: limits.appointments,
          appointmentPct: Math.round((appointmentsThisMonth / limits.appointments) * 100),
          doctors: clinic._count.doctors,
          doctorLimit: limits.doctors,
        },
        invoices: invoices.map((inv) => ({
          ...inv,
          daysOverdue: inv.status !== "PAID" ? Math.max(0, differenceInDays(now, inv.dueDate)) : 0,
        })),
        payments,
        notes,
        planChanges,
        summary: {
          totalPaid,
          totalOutstanding,
          monthsSubscribed: differenceInDays(now, clinic.createdAt) > 0
            ? Math.ceil(differenceInDays(now, clinic.createdAt) / 30)
            : 1,
          latePayments: payments.filter((p) => {
            const inv = invoices.find((i) => i.id === p.invoiceId);
            return inv && p.paymentDate > inv.dueDate;
          }).length,
        },
      };
    }),

  // ── GENERATE INVOICE ───────────────────────────────────────────────────────

  generateInvoice: adminProcedure
    .input(
      z.object({
        clinicId: z.string(),
        period: z.string().optional(), // "Mai 2026"
        amount: z.number().optional(),
        discountAmount: z.number().default(0),
        dueDate: z.string().optional(), // ISO date, default +30 days
        notes: z.string().optional(),
        includeOverage: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clinic = await ctx.prisma.clinic.findUnique({
        where: { id: input.clinicId },
      });
      if (!clinic) throw new TRPCError({ code: "NOT_FOUND" });

      const now = new Date();
      const period = input.period ?? format(subMonths(now, 1), "MMMM yyyy");
      const dueDate = input.dueDate ? new Date(input.dueDate) : addDays(now, 30);

      // Calculate overages
      let overageAmount = 0;
      let overageCount = 0;
      const limits = PLAN_LIMITS[clinic.subscriptionPlan] ?? PLAN_LIMITS.BASIC;

      if (input.includeOverage) {
        const lastMonth = subMonths(now, 1);
        const count = await ctx.prisma.appointment.count({
          where: {
            clinicId: clinic.id,
            createdAt: { gte: startOfMonth(lastMonth), lte: endOfMonth(lastMonth) },
          },
        });
        overageCount = Math.max(0, count - limits.appointments);
        overageAmount = overageCount * 50; // 50 DA per appointment overage
      }

      const baseAmount = input.amount ?? clinic.monthlyFee;
      const totalAmount = baseAmount + overageAmount - input.discountAmount;

      const lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [
        {
          description: `Abonnement ${clinic.subscriptionPlan} — ${period}`,
          quantity: 1,
          unitPrice: baseAmount,
          total: baseAmount,
        },
      ];
      if (overageCount > 0) {
        lineItems.push({
          description: `Dépassement: ${overageCount} RDV supplémentaires`,
          quantity: overageCount,
          unitPrice: 50,
          total: overageAmount,
        });
      }
      if (input.discountAmount > 0) {
        lineItems.push({
          description: "Remise",
          quantity: 1,
          unitPrice: -input.discountAmount,
          total: -input.discountAmount,
        });
      }

      // Ensure unique invoice number
      let invoiceNumber = generateInvoiceNumber();
      let attempts = 0;
      while (attempts < 5) {
        const exists = await ctx.prisma.invoice.findUnique({ where: { invoiceNumber } });
        if (!exists) break;
        invoiceNumber = generateInvoiceNumber();
        attempts++;
      }

      const invoice = await ctx.prisma.invoice.create({
        data: {
          clinicId: clinic.id,
          invoiceNumber,
          dueDate,
          amount: totalAmount,
          discountAmount: input.discountAmount,
          period,
          lineItems,
          notes: input.notes ?? null,
          status: "UNPAID",
        },
      });

      return invoice;
    }),

  // ── RECORD PAYMENT ─────────────────────────────────────────────────────────

  recordPayment: adminProcedure
    .input(
      z.object({
        clinicId: z.string(),
        amount: z.number().positive(),
        paymentDate: z.string(), // ISO date
        paymentMethod: z.enum(["bank_transfer", "ccp", "baridimob", "cash", "card", "other"]),
        transactionReference: z.string().optional(),
        payerName: z.string().optional(),
        invoiceId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clinic = await ctx.prisma.clinic.findUnique({
        where: { id: input.clinicId },
      });
      if (!clinic) throw new TRPCError({ code: "NOT_FOUND" });

      const payment = await ctx.prisma.payment.create({
        data: {
          clinicId: input.clinicId,
          amount: input.amount,
          paymentDate: new Date(input.paymentDate),
          paymentMethod: input.paymentMethod,
          transactionReference: input.transactionReference ?? null,
          payerName: input.payerName ?? null,
          invoiceId: input.invoiceId ?? null,
          notes: input.notes ?? null,
          recordedBy: ctx.user.id,
        },
      });

      // Update clinic balance (positive = credit, negative = owes)
      await ctx.prisma.clinic.update({
        where: { id: input.clinicId },
        data: { balance: { increment: input.amount } },
      });

      // Update invoice status if linked
      if (input.invoiceId) {
        const invoice = await ctx.prisma.invoice.findUnique({
          where: { id: input.invoiceId },
          include: { payments: true },
        });
        if (invoice) {
          const totalPaidForInvoice = invoice.payments.reduce((s, p) => s + p.amount, 0);
          const newStatus =
            totalPaidForInvoice >= invoice.amount ? "PAID" : "PARTIALLY_PAID";
          await ctx.prisma.invoice.update({
            where: { id: input.invoiceId },
            data: {
              status: newStatus,
              paidAt: newStatus === "PAID" ? new Date() : undefined,
            },
          });
        }
      }

      // Auto-reactivate if suspended and balance cleared
      const updatedClinic = await ctx.prisma.clinic.findUnique({
        where: { id: input.clinicId },
        select: { balance: true, suspendedAt: true, subscriptionPlan: true },
      });
      if (updatedClinic?.suspendedAt && (updatedClinic.balance ?? 0) >= 0) {
        await ctx.prisma.clinic.update({
          where: { id: input.clinicId },
          data: { isActive: true, suspendedAt: null, bookingPageEnabled: true },
        });
        // Re-enable WhatsApp automation for PRO clinics
        if (updatedClinic.subscriptionPlan === "PRO") {
          await ctx.prisma.whatsAppConfig.updateMany({
            where: { clinicId: input.clinicId },
            data: { autoReminder24h: true, autoReminder2h: true, autoFollowUp: true },
          });
        }
      }

      return { payment, reactivated: !!updatedClinic?.suspendedAt && (updatedClinic.balance ?? 0) >= 0 };
    }),

  // ── CHANGE PLAN ────────────────────────────────────────────────────────────

  changePlan: adminProcedure
    .input(
      z.object({
        clinicId: z.string(),
        newPlan: z.enum(["BASIC", "PRO", "ENTERPRISE"]),
        newFee: z.number().optional(), // custom fee for ENTERPRISE
        effectiveDate: z.enum(["immediate", "next_cycle"]).default("immediate"),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clinic = await ctx.prisma.clinic.findUnique({
        where: { id: input.clinicId },
      });
      if (!clinic) throw new TRPCError({ code: "NOT_FOUND" });

      const newFee = input.newFee ?? PLAN_FEES[input.newPlan] ?? 22000;
      const now = new Date();

      // Calculate proration if immediate
      let prorationCredit = 0;
      let prorationCharge = 0;
      if (input.effectiveDate === "immediate" && input.newPlan !== clinic.subscriptionPlan) {
        const daysInMonth = endOfMonth(now).getDate();
        const daysRemaining = daysInMonth - now.getDate();
        const oldDailyRate = clinic.monthlyFee / daysInMonth;
        const newDailyRate = newFee / daysInMonth;
        prorationCredit = Math.round(oldDailyRate * daysRemaining);
        prorationCharge = Math.round(newDailyRate * daysRemaining);
      }

      // Log plan change
      await ctx.prisma.planChangeLog.create({
        data: {
          clinicId: clinic.id,
          fromPlan: clinic.subscriptionPlan,
          toPlan: input.newPlan,
          fromFee: clinic.monthlyFee,
          toFee: newFee,
          changedBy: ctx.user.id,
          reason: input.reason ?? null,
          effectiveAt: now,
        },
      });

      // Update clinic
      await ctx.prisma.clinic.update({
        where: { id: input.clinicId },
        data: { subscriptionPlan: input.newPlan, monthlyFee: newFee },
      });

      return { prorationCredit, prorationCharge, netCharge: prorationCharge - prorationCredit };
    }),

  // ── SUSPEND CLINIC ─────────────────────────────────────────────────────────

  suspendClinic: adminProcedure
    .input(z.object({ clinicId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.clinic.update({
        where: { id: input.clinicId },
        data: {
          isActive: false,
          suspendedAt: new Date(),
          bookingPageEnabled: false,
        },
      });

      // Disable WhatsApp automation
      await ctx.prisma.whatsAppConfig.updateMany({
        where: { clinicId: input.clinicId },
        data: { autoReminder24h: false, autoReminder2h: false, autoFollowUp: false, autoConfirm: false },
      });

      return { ok: true };
    }),

  // ── REACTIVATE CLINIC ──────────────────────────────────────────────────────

  reactivateClinic: adminProcedure
    .input(z.object({ clinicId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const clinic = await ctx.prisma.clinic.findUnique({
        where: { id: input.clinicId },
        select: { subscriptionPlan: true },
      });

      await ctx.prisma.clinic.update({
        where: { id: input.clinicId },
        data: { isActive: true, suspendedAt: null, bookingPageEnabled: true },
      });

      if (clinic?.subscriptionPlan === "PRO") {
        await ctx.prisma.whatsAppConfig.updateMany({
          where: { clinicId: input.clinicId },
          data: { autoReminder24h: true, autoReminder2h: true, autoFollowUp: true, autoConfirm: true },
        });
      }

      return { ok: true };
    }),

  // ── CANCEL SUBSCRIPTION ────────────────────────────────────────────────────

  cancelSubscription: adminProcedure
    .input(z.object({ clinicId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.clinic.update({
        where: { id: input.clinicId },
        data: {
          isActive: false,
          cancelledAt: new Date(),
          cancellationReason: input.reason ?? null,
          bookingPageEnabled: false,
          suspendedAt: null,
        },
      });

      return { ok: true };
    }),

  // ── SEND PAYMENT REMINDER (manual) ─────────────────────────────────────────

  sendReminder: adminProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        type: z.string().default("manual"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        include: { clinic: true },
      });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.prisma.paymentReminder.create({
        data: {
          invoiceId: input.invoiceId,
          type: input.type,
          method: "manual",
        },
      });

      return { ok: true, clinicName: invoice.clinic.name };
    }),

  // ── ADD SUBSCRIPTION NOTE ──────────────────────────────────────────────────

  addNote: adminProcedure
    .input(z.object({ clinicId: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.subscriptionNote.create({
        data: {
          clinicId: input.clinicId,
          authorId: ctx.user.id,
          content: input.content,
        },
        include: { author: { select: { name: true } } },
      });
    }),

  // ── UPDATE PAYMENT METHOD ──────────────────────────────────────────────────

  updatePaymentMethod: adminProcedure
    .input(
      z.object({
        clinicId: z.string(),
        paymentMethod: z.enum(["bank_transfer", "ccp", "baridimob", "cash", "card"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.clinic.update({
        where: { id: input.clinicId },
        data: { paymentMethod: input.paymentMethod },
      });
    }),

  // ── BULK GENERATE INVOICES ─────────────────────────────────────────────────

  bulkGenerateInvoices: adminProcedure
    .input(z.object({ clinicIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const period = format(subMonths(now, 1), "MMMM yyyy");
      const dueDate = addDays(now, 30);
      let generated = 0;

      for (const clinicId of input.clinicIds) {
        const clinic = await ctx.prisma.clinic.findUnique({ where: { id: clinicId } });
        if (!clinic) continue;

        // Skip if already invoiced this month
        const existing = await ctx.prisma.invoice.findFirst({
          where: { clinicId, period },
        });
        if (existing) continue;

        let invoiceNumber = generateInvoiceNumber();
        for (let i = 0; i < 5; i++) {
          const exists = await ctx.prisma.invoice.findUnique({ where: { invoiceNumber } });
          if (!exists) break;
          invoiceNumber = generateInvoiceNumber();
        }

        await ctx.prisma.invoice.create({
          data: {
            clinicId,
            invoiceNumber,
            dueDate,
            amount: clinic.monthlyFee,
            period,
            status: "UNPAID",
            lineItems: [
              {
                description: `Abonnement ${clinic.subscriptionPlan} — ${period}`,
                quantity: 1,
                unitPrice: clinic.monthlyFee,
                total: clinic.monthlyFee,
              },
            ],
          },
        });
        generated++;
      }

      return { generated };
    }),

  // ── GET INVOICE FOR PRINT ─────────────────────────────────────────────────

  getInvoiceForPrint: adminProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        include: { clinic: true },
      });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date,
          dueDate: invoice.dueDate,
          amount: invoice.amount,
          discountAmount: invoice.discountAmount,
          status: invoice.status,
          period: invoice.period,
          lineItems: invoice.lineItems,
          notes: invoice.notes,
          paidAt: invoice.paidAt,
        },
        clinic: {
          id: invoice.clinic.id,
          name: invoice.clinic.name,
          phone: invoice.clinic.phone,
          email: invoice.clinic.email,
          address: invoice.clinic.address,
          city: invoice.clinic.city,
          paymentMethod: invoice.clinic.paymentMethod,
        },
      };
    }),

  // ── QUICK STATS for chips ──────────────────────────────────────────────────

  getQuickStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();

    const [overdue, renewingSoon, cancelled30d] = await Promise.all([
      // Clinics with overdue invoices
      ctx.prisma.invoice.groupBy({
        by: ["clinicId"],
        where: {
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
          dueDate: { lt: now },
        },
        _count: { id: true },
      }),
      // Clinics renewing in next 7 days
      ctx.prisma.clinic.count({
        where: {
          isActive: true,
          nextBillingDate: { gte: now, lte: addDays(now, 7) },
        },
      }),
      // Cancelled in last 30 days
      ctx.prisma.clinic.count({
        where: { cancelledAt: { gte: subMonths(now, 1) } },
      }),
    ]);

    return {
      overdueCount: overdue.length,
      renewingSoon,
      cancelledRecently: cancelled30d,
    };
  }),
});
