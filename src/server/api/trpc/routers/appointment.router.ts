import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure } from "../procedures";

const StatusSchema = z.enum([
  "PENDING", "CONFIRMING", "CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELLED", "RESCHEDULED",
]);

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function generateTimeSlots(
  startTime: string,
  endTime: string,
  duration: number,
  existing: Array<{ date: Date; duration: number }>,
  date: Date
): Array<{ time: string; available: boolean }> {
  const slots: Array<{ time: string; available: boolean }> = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const gap = 5;

  for (let min = startMinutes; min + duration <= endMinutes; min += duration + gap) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const slotStart = new Date(date);
    slotStart.setHours(h, m, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + duration);

    const conflict = existing.some((apt) => {
      const aStart = new Date(apt.date);
      const aEnd = new Date(aStart);
      aEnd.setMinutes(aEnd.getMinutes() + apt.duration);
      return slotStart < aEnd && slotEnd > aStart;
    });

    slots.push({ time: timeStr, available: !conflict });
  }
  return slots;
}

export const appointmentRouter = createTRPCRouter({
  stats: clinicProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    // Monday-based week
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekEnd); lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayApts, thisWeekCount, lastWeekCount, pendingApts, monthFinished, oldestPending] =
      await Promise.all([
        ctx.prisma.appointment.findMany({
          where: { clinicId: ctx.clinicId!, date: { gte: todayStart, lte: todayEnd } },
          select: { status: true },
        }),
        ctx.prisma.appointment.count({
          where: { clinicId: ctx.clinicId!, date: { gte: weekStart, lte: weekEnd } },
        }),
        ctx.prisma.appointment.count({
          where: { clinicId: ctx.clinicId!, date: { gte: lastWeekStart, lte: lastWeekEnd } },
        }),
        ctx.prisma.appointment.findMany({
          where: { clinicId: ctx.clinicId!, status: { in: ["PENDING", "CONFIRMING"] } },
          select: { createdAt: true },
        }),
        ctx.prisma.appointment.findMany({
          where: {
            clinicId: ctx.clinicId!,
            date: { gte: monthStart },
            status: { in: ["ATTENDED", "NO_SHOW"] },
          },
          select: { status: true },
        }),
        ctx.prisma.appointment.findFirst({
          where: { clinicId: ctx.clinicId!, status: "PENDING" },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
      ]);

    const weekTrend =
      lastWeekCount > 0 ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100) : 0;
    const noShowCount = monthFinished.filter((a) => a.status === "NO_SHOW").length;
    const noShowRate =
      monthFinished.length > 0 ? Math.round((noShowCount / monthFinished.length) * 100) : 0;
    const oldestDays = oldestPending
      ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 86400000)
      : null;

    return {
      today: {
        total: todayApts.length,
        confirmed: todayApts.filter((a) => a.status === "CONFIRMED").length,
        pending: todayApts.filter((a) => a.status === "PENDING" || a.status === "CONFIRMING").length,
        attended: todayApts.filter((a) => a.status === "ATTENDED").length,
      },
      thisWeek: { count: thisWeekCount, trend: weekTrend },
      pending: { count: pendingApts.length, oldestDays },
      noShowRate,
    };
  }),

  list: clinicProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.array(StatusSchema).optional(),
        doctorId: z.string().optional(),
        serviceId: z.string().optional(),
        source: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { clinicId: ctx.clinicId! };

      if (input.startDate) where.date = { ...where.date, gte: new Date(input.startDate) };
      if (input.endDate) where.date = { ...where.date, lte: new Date(input.endDate) };
      if (input.status?.length) where.status = { in: input.status };
      if (input.doctorId) where.doctorId = input.doctorId;
      if (input.serviceId) where.serviceId = input.serviceId;
      if (input.source) where.source = input.source;
      if (input.search) {
        where.patient = {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { phone: { contains: input.search } },
          ],
        };
      }

      const [appointments, total] = await Promise.all([
        ctx.prisma.appointment.findMany({
          where,
          include: {
            patient: { select: { id: true, name: true, phone: true } },
            service: { select: { id: true, name: true, duration: true, price: true, color: true } },
            doctor: { select: { id: true, name: true, specialty: true } },
            confirmer: { select: { id: true, name: true } },
          },
          orderBy: { date: "desc" },
          skip,
          take: input.limit,
        }),
        ctx.prisma.appointment.count({ where }),
      ]);

      return { appointments, total, page: input.page, totalPages: Math.ceil(total / input.limit) };
    }),

  checkAvailability: clinicProcedure
    .input(
      z.object({
        doctorId: z.string().optional(),
        date: z.string(),
        duration: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const date = new Date(input.date);
      const dayName = DAY_NAMES[date.getDay()];

      const clinic = await ctx.prisma.clinic.findUnique({
        where: { id: ctx.clinicId! },
        select: { workingHours: true },
      });

      const hours = clinic?.workingHours as Record<
        string,
        { open: boolean; start?: string; end?: string }
      > | null;
      const dayHours = hours?.[dayName];

      if (!dayHours?.open || !dayHours.start || !dayHours.end) {
        return { slots: [], closed: true };
      }

      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

      const existing = await ctx.prisma.appointment.findMany({
        where: {
          clinicId: ctx.clinicId!,
          date: { gte: dayStart, lte: dayEnd },
          ...(input.doctorId ? { doctorId: input.doctorId } : {}),
          status: { notIn: ["CANCELLED"] },
        },
        select: { date: true, duration: true },
      });

      const slots = generateTimeSlots(dayHours.start, dayHours.end, input.duration, existing, date);
      return { slots, closed: false };
    }),

  getById: clinicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const apt = await ctx.prisma.appointment.findFirst({
        where: { id: input.id, clinicId: ctx.clinicId! },
        include: {
          patient: true,
          service: true,
          doctor: true,
          confirmer: { select: { id: true, name: true } },
          whatsappMessages: { orderBy: { sentAt: "desc" }, take: 20 },
          timeline: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!apt) throw new TRPCError({ code: "NOT_FOUND" });
      return apt;
    }),

  create: clinicProcedure
    .input(
      z.object({
        patientId: z.string(),
        serviceId: z.string(),
        doctorId: z.string().optional(),
        date: z.string(),
        duration: z.number().optional(),
        price: z.number().optional(),
        source: z.string().default("manual"),
        sourceMessageId: z.string().optional(),
        status: z.enum(["PENDING", "CONFIRMED", "ATTENDED"]).default("PENDING"),
        paid: z.boolean().default(false),
        paymentMethod: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = await ctx.prisma.service.findUnique({ where: { id: input.serviceId } });
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      return ctx.prisma.appointment.create({
        data: {
          clinicId: ctx.clinicId!,
          patientId: input.patientId,
          serviceId: input.serviceId,
          doctorId: input.doctorId || null,
          date: new Date(input.date),
          duration: input.duration ?? service.duration,
          price: input.price ?? service.price,
          source: input.source,
          sourceMessageId: input.sourceMessageId,
          status: input.status,
          paid: input.paid,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          timeline: {
            create: {
              action: "CREATED",
              userId: ctx.userId,
              details: { status: input.status, source: input.source },
            },
          },
        },
        include: { patient: true, service: true, doctor: true },
      });
    }),

  update: clinicProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.string().optional(),
        duration: z.number().optional(),
        price: z.number().optional(),
        doctorId: z.string().nullable().optional(),
        serviceId: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
        paid: z.boolean().optional(),
        paymentMethod: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, date, ...rest } = input;
      return ctx.prisma.appointment.update({
        where: { id, clinicId: ctx.clinicId! },
        data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
      });
    }),

  reschedule: clinicProcedure
    .input(
      z.object({
        id: z.string(),
        newDate: z.string(),
        reason: z.string(),
        notifyPatient: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.appointment.update({
        where: { id: input.id, clinicId: ctx.clinicId! },
        data: {
          date: new Date(input.newDate),
          status: "RESCHEDULED",
          timeline: {
            create: {
              action: "RESCHEDULED",
              userId: ctx.userId,
              details: { reason: input.reason, newDate: input.newDate },
            },
          },
        },
      });
    }),

  cancel: clinicProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
        notifyPatient: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.appointment.update({
        where: { id: input.id, clinicId: ctx.clinicId! },
        data: {
          status: "CANCELLED",
          timeline: {
            create: {
              action: "CANCELLED",
              userId: ctx.userId,
              details: { reason: input.reason },
            },
          },
        },
      });
    }),

  markAttended: clinicProcedure
    .input(
      z.object({
        id: z.string(),
        paid: z.boolean().default(false),
        paymentMethod: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.appointment.update({
        where: { id: input.id, clinicId: ctx.clinicId! },
        data: {
          status: "ATTENDED",
          attended: true,
          attendedAt: new Date(),
          paid: input.paid,
          paidAt: input.paid ? new Date() : undefined,
          paymentMethod: input.paymentMethod,
          timeline: {
            create: {
              action: "ATTENDED",
              userId: ctx.userId,
              details: { paid: input.paid, paymentMethod: input.paymentMethod },
            },
          },
        },
      });
    }),

  markNoShow: clinicProcedure
    .input(z.object({ id: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const apt = await ctx.prisma.appointment.findFirst({
        where: { id: input.id, clinicId: ctx.clinicId! },
        select: { patientId: true },
      });
      if (!apt) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await ctx.prisma.$transaction([
        ctx.prisma.appointment.update({
          where: { id: input.id },
          data: {
            status: "NO_SHOW",
            noShowReason: input.reason,
            timeline: {
              create: {
                action: "NO_SHOW",
                userId: ctx.userId,
                details: { reason: input.reason },
              },
            },
          },
        }),
        ctx.prisma.patient.update({
          where: { id: apt.patientId },
          data: { globalRiskScore: { increment: 10 } },
        }),
      ]);
      return updated;
    }),

  delete: clinicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.appointment.delete({
        where: { id: input.id, clinicId: ctx.clinicId! },
      });
    }),

  // Keep backward-compatible
  updateStatus: clinicProcedure
    .input(
      z.object({
        id: z.string(),
        status: StatusSchema,
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = { status: input.status };
      if (input.status === "CONFIRMED") {
        updateData.confirmedAt = new Date();
        updateData.confirmedBy = ctx.userId;
      } else if (input.status === "ATTENDED") {
        updateData.attended = true;
        updateData.attendedAt = new Date();
      }
      if (input.notes) updateData.confirmNotes = input.notes;
      return ctx.prisma.appointment.update({
        where: { id: input.id, clinicId: ctx.clinicId! },
        data: updateData,
      });
    }),

  markPaid: clinicProcedure
    .input(
      z.object({
        id: z.string(),
        paymentMethod: z.enum(["cash", "card", "online"]).default("cash"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.appointment.update({
        where: { id: input.id, clinicId: ctx.clinicId! },
        data: { paid: true, paidAt: new Date(), paymentMethod: input.paymentMethod },
      });
    }),

  todaySummary: clinicProcedure.query(async ({ ctx }) => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const appointments = await ctx.prisma.appointment.findMany({
      where: { clinicId: ctx.clinicId!, date: { gte: todayStart, lte: todayEnd } },
      include: { patient: true, service: true, doctor: true },
      orderBy: { date: "asc" },
    });
    return {
      appointments,
      total: appointments.length,
      confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
      pending: appointments.filter((a) => a.status === "PENDING").length,
      attended: appointments.filter((a) => a.status === "ATTENDED").length,
    };
  }),
});
