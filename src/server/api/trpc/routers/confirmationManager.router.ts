import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "../trpc";
import { adminProcedure, agentProcedure } from "../procedures";
import { hashPassword } from "@/lib/auth";

// ─── Manager procedures ────────────────────────────────────────────────────

export const confirmationManagerRouter = createTRPCRouter({
  // ── MANAGER STATS ────────────────────────────────────────────────────────

  getManagerStats: adminProcedure.query(async ({ ctx }) => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [
      agentCount,
      pendingCount,
      oldestPending,
      todayConfirmed,
      allConfirmations,
      allAttempts,
    ] = await Promise.all([
      ctx.prisma.user.count({ where: { role: "CONFIRMATION_AGENT", isActive: true } }),
      ctx.prisma.appointment.count({ where: { status: { in: ["PENDING", "CONFIRMING"] } } }),
      ctx.prisma.appointment.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      ctx.prisma.appointment.count({
        where: { status: "CONFIRMED", confirmedAt: { gte: todayStart, lte: todayEnd } },
      }),
      ctx.prisma.agentPerformance.aggregate({ _sum: { totalConfirmed: true, totalCalls: true } }),
      ctx.prisma.appointment.aggregate({ _sum: { confirmAttempts: true } }),
    ]);

    const totalConfirmed = allConfirmations._sum.totalConfirmed ?? 0;
    const totalAttempts = allAttempts._sum.confirmAttempts ?? 1;
    const successRate = totalAttempts > 0 ? Math.round((totalConfirmed / totalAttempts) * 100) : 0;
    const oldestDays = oldestPending
      ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 86400000)
      : null;

    return {
      agentCount,
      pendingCount,
      oldestDays,
      todayConfirmed,
      successRate,
    };
  }),

  // ── AGENT LIST ───────────────────────────────────────────────────────────

  getAgentList: adminProcedure.query(async ({ ctx }) => {
    const agents = await ctx.prisma.user.findMany({
      where: { role: "CONFIRMATION_AGENT" },
      include: {
        performance: true,
        agentClinics: {
          include: { clinic: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    const agentsWithPending = await Promise.all(
      agents.map(async (agent) => {
        const clinicIds = agent.agentClinics.map((ac) => ac.clinicId);
        const pendingCount = clinicIds.length
          ? await ctx.prisma.appointment.count({
              where: { clinicId: { in: clinicIds }, status: { in: ["PENDING", "CONFIRMING"] } },
            })
          : 0;
        const score = calculateScore(agent.performance);
        return { ...agent, pendingCount, performanceScore: score };
      })
    );

    return agentsWithPending;
  }),

  // ── GET SINGLE AGENT ─────────────────────────────────────────────────────

  getAgentDetails: adminProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.prisma.user.findUnique({
        where: { id: input.agentId },
        include: {
          performance: true,
          agentClinics: {
            include: { clinic: { select: { id: true, name: true, city: true } } },
          },
        },
      });
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });

      const clinicIds = agent.agentClinics.map((ac) => ac.clinicId);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

      const [pendingCount, todayConfirmed, weeklyStats] = await Promise.all([
        clinicIds.length
          ? ctx.prisma.appointment.count({
              where: { clinicId: { in: clinicIds }, status: { in: ["PENDING", "CONFIRMING"] } },
            })
          : Promise.resolve(0),
        ctx.prisma.appointment.count({
          where: {
            clinicId: { in: clinicIds },
            status: "CONFIRMED",
            confirmedBy: agent.id,
            confirmedAt: { gte: todayStart },
          },
        }),
        // Last 4 weeks daily confirmations
        ctx.prisma.appointment.findMany({
          where: {
            confirmedBy: agent.id,
            confirmedAt: { gte: new Date(Date.now() - 28 * 86400000) },
            status: "CONFIRMED",
          },
          select: { confirmedAt: true },
        }),
      ]);

      return {
        ...agent,
        pendingCount,
        todayConfirmed,
        performanceScore: calculateScore(agent.performance),
        weeklyStats,
      };
    }),

  // ── CREATE AGENT ─────────────────────────────────────────────────────────

  createAgent: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email().optional(),
        phone: z.string().min(9),
        dailyTarget: z.number().default(30),
        employmentType: z.string().optional(),
        assignedClinicIds: z.array(z.string()).optional(),
        tempPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orConditions: any[] = [{ phone: input.phone }];
      if (input.email) orConditions.push({ email: input.email });
      const existing = await ctx.prisma.user.findFirst({
        where: { OR: orConditions },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email or phone already exists" });
      }

      const hashed = await hashPassword(input.tempPassword);

      const agent = await ctx.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          password: hashed,
          role: "CONFIRMATION_AGENT",
          isActive: true,
          dailyTarget: input.dailyTarget,
          employmentType: input.employmentType,
          agentClinics: input.assignedClinicIds?.length
            ? {
                create: input.assignedClinicIds.map((clinicId) => ({
                  clinicId,
                  assignedBy: ctx.userId,
                })),
              }
            : undefined,
        },
      });

      await ctx.prisma.agentPerformance.create({
        data: {
          userId: agent.id,
          weekStart: new Date(),
        },
      });

      return agent;
    }),

  // ── UPDATE AGENT ─────────────────────────────────────────────────────────

  updateAgent: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        dailyTarget: z.number().optional(),
        employmentType: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.user.update({ where: { id }, data });
    }),

  // ── ASSIGN CLINICS ───────────────────────────────────────────────────────

  assignClinics: adminProcedure
    .input(
      z.object({
        agentId: z.string(),
        clinicIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Remove all existing assignments for this agent
      await ctx.prisma.clinicAgent.deleteMany({
        where: { agentId: input.agentId },
      });

      // Create new assignments
      if (input.clinicIds.length > 0) {
        await ctx.prisma.clinicAgent.createMany({
          data: input.clinicIds.map((clinicId) => ({
            clinicId,
            agentId: input.agentId,
            assignedBy: ctx.userId,
          })),
        });
      }

      return { success: true, count: input.clinicIds.length };
    }),

  // ── GET CLINICS (for assignment modal) ──────────────────────────────────

  getAllClinicsWithAssignments: adminProcedure.query(async ({ ctx }) => {
    const clinics = await ctx.prisma.clinic.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        agentAssignments: {
          include: { agent: { select: { id: true, name: true } } },
        },
        _count: {
          select: {
            appointments: {
              where: { status: { in: ["PENDING", "CONFIRMING"] } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return clinics;
  }),

  // ── AGENT: MY QUEUE ──────────────────────────────────────────────────────

  getMyQueue: agentProcedure
    .input(
      z.object({
        priority: z.enum(["all", "urgent", "today", "tomorrow", "week"]).default("all"),
        clinicId: z.string().optional(),
        sortBy: z.enum(["oldest", "soonest", "clinic"]).default("oldest"),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 3600000);
      const in48h = new Date(now.getTime() + 48 * 3600000);

      // Get agent's assigned clinics
      let clinicIds: string[] = [];
      if (ctx.role !== "SUPER_ADMIN") {
        const assignments = await ctx.prisma.clinicAgent.findMany({
          where: { agentId: ctx.userId! },
          select: { clinicId: true },
        });
        clinicIds = assignments.map((a) => a.clinicId);
        if (clinicIds.length === 0) return { appointments: [], total: 0, byClinic: {} };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        status: { in: ["PENDING", "CONFIRMING"] },
        ...(clinicIds.length > 0 ? { clinicId: { in: clinicIds } } : {}),
        ...(input.clinicId ? { clinicId: input.clinicId } : {}),
      };

      // Priority filter
      if (input.priority === "urgent") {
        where.OR = [
          { date: { lte: in24h } },
          { createdAt: { lte: new Date(now.getTime() - 48 * 3600000) } },
        ];
      } else if (input.priority === "today") {
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
        where.date = { lte: todayEnd };
      } else if (input.priority === "tomorrow") {
        const tomorrowStart = new Date(now); tomorrowStart.setDate(tomorrowStart.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrowStart); tomorrowEnd.setHours(23, 59, 59, 999);
        where.date = { gte: tomorrowStart, lte: tomorrowEnd };
      } else if (input.priority === "week") {
        const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
        where.date = { lte: weekEnd };
      }

      const orderBy =
        input.sortBy === "oldest"
          ? { createdAt: "asc" as const }
          : input.sortBy === "soonest"
          ? { date: "asc" as const }
          : { clinicId: "asc" as const };

      const appointments = await ctx.prisma.appointment.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, phone: true, gender: true, dateOfBirth: true, lastVisit: true, globalRiskScore: true } },
          clinic: { select: { id: true, name: true } },
          service: { select: { name: true, duration: true, price: true } },
          doctor: { select: { name: true, specialty: true } },
          timeline: { orderBy: { createdAt: "desc" }, take: 5 },
        },
        orderBy,
        take: 100,
      });

      // Add priority labels
      const withPriority = appointments.map((apt) => {
        const age = (now.getTime() - apt.createdAt.getTime()) / 3600000;
        const hoursUntil = (apt.date.getTime() - now.getTime()) / 3600000;
        const isUrgent = hoursUntil < 24 || age > 48;
        const isWarning = (hoursUntil >= 24 && hoursUntil < 48) || (age >= 24 && age < 48);
        return {
          ...apt,
          priority: isUrgent ? "urgent" : isWarning ? "warning" : "normal",
          hoursUntilAppointment: Math.round(hoursUntil),
          ageHours: Math.round(age),
        };
      });

      // Group by clinic for sidebar
      const byClinic: Record<string, number> = {};
      for (const apt of appointments) {
        const name = (apt.clinic as any).name as string;
        byClinic[name] = (byClinic[name] || 0) + 1;
      }

      return { appointments: withPriority, total: appointments.length, byClinic };
    }),

  // ── AGENT: CONFIRM APPOINTMENT ───────────────────────────────────────────

  confirmAppointment: agentProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        confirmMethod: z.string(),
        notes: z.string().optional(),
        sendReminders: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const apt = await ctx.prisma.appointment.update({
        where: { id: input.appointmentId },
        data: {
          status: "CONFIRMED",
          confirmedBy: ctx.userId,
          confirmedAt: new Date(),
          confirmMethod: input.confirmMethod,
          confirmNotes: input.notes,
          confirmAttempts: { increment: 1 },
          timeline: {
            create: {
              action: "CONFIRMED",
              userId: ctx.userId,
              details: { method: input.confirmMethod, notes: input.notes },
            },
          },
        },
      });

      // Update agent performance
      await ctx.prisma.agentPerformance.upsert({
        where: { userId: ctx.userId! },
        create: {
          userId: ctx.userId!,
          totalConfirmed: 1,
          weekConfirmed: 1,
          totalCalls: 0,
          confirmationRate: 100,
          weekStart: new Date(),
        },
        update: {
          totalConfirmed: { increment: 1 },
          weekConfirmed: { increment: 1 },
        },
      });

      return apt;
    }),

  // ── AGENT: RECORD ATTEMPT ────────────────────────────────────────────────

  recordAttempt: agentProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        attemptType: z.enum(["call_no_answer", "whatsapp_sent", "sms_sent"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actionMap = {
        call_no_answer: "CALL_NO_ANSWER",
        whatsapp_sent: "WHATSAPP_SENT",
        sms_sent: "SMS_SENT",
      };

      const [apt] = await ctx.prisma.$transaction([
        ctx.prisma.appointment.update({
          where: { id: input.appointmentId },
          data: {
            confirmAttempts: { increment: 1 },
            status: "CONFIRMING",
            timeline: {
              create: {
                action: actionMap[input.attemptType],
                userId: ctx.userId,
                details: { notes: input.notes },
              },
            },
          },
        }),
        ...(input.attemptType === "call_no_answer"
          ? [
              ctx.prisma.agentPerformance.upsert({
                where: { userId: ctx.userId! },
                create: { userId: ctx.userId!, totalCalls: 1, weekStart: new Date() },
                update: { totalCalls: { increment: 1 }, weekCalls: { increment: 1 } },
              }),
            ]
          : input.attemptType === "whatsapp_sent"
          ? [
              ctx.prisma.agentPerformance.upsert({
                where: { userId: ctx.userId! },
                create: { userId: ctx.userId!, totalWhatsAppSent: 1, weekStart: new Date() },
                update: { totalWhatsAppSent: { increment: 1 } },
              }),
            ]
          : []),
      ]);

      return apt;
    }),

  // ── AGENT: SCHEDULE CALLBACK ─────────────────────────────────────────────

  scheduleCallback: agentProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        scheduledFor: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.scheduledCallback.create({
        data: {
          appointmentId: input.appointmentId,
          agentId: ctx.userId!,
          scheduledFor: new Date(input.scheduledFor),
          notes: input.notes,
        },
      });
    }),

  // ── AGENT: MY STATS ──────────────────────────────────────────────────────

  getMyStats: agentProcedure.query(async ({ ctx }) => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date();
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    weekStart.setHours(0, 0, 0, 0);

    const [perf, todayConfirmed, todayCalls] = await Promise.all([
      ctx.prisma.agentPerformance.findUnique({ where: { userId: ctx.userId! } }),
      ctx.prisma.appointment.count({
        where: { confirmedBy: ctx.userId!, status: "CONFIRMED", confirmedAt: { gte: todayStart, lte: todayEnd } },
      }),
      ctx.prisma.appointment.count({
        where: {
          clinicId: { in: await ctx.prisma.clinicAgent.findMany({ where: { agentId: ctx.userId! }, select: { clinicId: true } }).then((r) => r.map((x) => x.clinicId)) },
          status: { in: ["PENDING", "CONFIRMING"] },
        },
      }),
    ]);

    return {
      performance: perf,
      todayConfirmed,
      pendingCount: todayCalls,
      dailyTarget: 30,
    };
  }),

  // ── LEADERBOARD ───────────────────────────────────────────────────────────

  getLeaderboard: adminProcedure
    .input(z.object({ period: z.enum(["today", "week", "month"]).default("week") }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let since: Date;
      if (input.period === "today") {
        since = new Date(now); since.setHours(0, 0, 0, 0);
      } else if (input.period === "week") {
        since = new Date(now); since.setDate(now.getDate() - 7);
      } else {
        since = new Date(now); since.setMonth(now.getMonth() - 1);
      }

      const confirmed = await ctx.prisma.appointment.groupBy({
        by: ["confirmedBy"],
        where: { status: "CONFIRMED", confirmedAt: { gte: since }, confirmedBy: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      const userIds = confirmed.map((c) => c.confirmedBy!).filter(Boolean);
      const users = await ctx.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });

      return confirmed.map((c) => ({
        agentId: c.confirmedBy,
        agentName: users.find((u) => u.id === c.confirmedBy)?.name ?? "Unknown",
        count: c._count.id,
      }));
    }),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function calculateScore(perf: { confirmationRate?: number; totalConfirmed?: number } | null): number {
  if (!perf) return 0;
  const rate = perf.confirmationRate ?? 0;
  const volume = Math.min((perf.totalConfirmed ?? 0) / 100, 1) * 100;
  return Math.round(rate * 0.6 + volume * 0.4);
}
