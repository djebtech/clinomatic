import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure } from "../procedures";

const AppointmentStatusSchema = z.enum([
  "PENDING",
  "CONFIRMING",
  "CONFIRMED",
  "ATTENDED",
  "NO_SHOW",
  "CANCELLED",
  "RESCHEDULED",
]);

export const appointmentRouter = createTRPCRouter({
  list: clinicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        status: AppointmentStatusSchema.optional(),
        doctorId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.appointment.findMany({
        where: {
          clinicId: ctx.clinicId!,
          date: {
            gte: new Date(input.startDate),
            lte: new Date(input.endDate),
          },
          ...(input.status && { status: input.status }),
          ...(input.doctorId && { doctorId: input.doctorId }),
        },
        include: {
          patient: true,
          service: true,
          doctor: true,
          confirmer: { select: { name: true } },
        },
        orderBy: { date: "asc" },
      });
    }),

  getById: clinicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.findFirst({
        where: { id: input.id, clinicId: ctx.clinicId! },
        include: {
          patient: true,
          service: true,
          doctor: true,
          confirmer: { select: { name: true } },
          whatsappMessages: { orderBy: { sentAt: "desc" }, take: 10 },
        },
      });
      if (!appointment) throw new TRPCError({ code: "NOT_FOUND" });
      return appointment;
    }),

  create: clinicProcedure
    .input(
      z.object({
        patientId: z.string(),
        serviceId: z.string(),
        doctorId: z.string().optional(),
        date: z.string(),
        duration: z.number().default(30),
        source: z.string().default("manual"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = await ctx.prisma.service.findUnique({
        where: { id: input.serviceId },
      });
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      return ctx.prisma.appointment.create({
        data: {
          ...input,
          clinicId: ctx.clinicId!,
          date: new Date(input.date),
          duration: input.duration ?? service.duration,
          price: service.price,
          status: "PENDING",
        },
        include: { patient: true, service: true, doctor: true },
      });
    }),

  updateStatus: clinicProcedure
    .input(
      z.object({
        id: z.string(),
        status: AppointmentStatusSchema,
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = { status: input.status };

      if (input.status === "CONFIRMED") {
        updateData.confirmedAt = new Date();
        updateData.confirmedBy = ctx.userId;
      } else if (input.status === "ATTENDED") {
        updateData.attended = true;
        updateData.attendedAt = new Date();
        updateData.status = "ATTENDED";
      }

      if (input.notes) updateData.confirmNotes = input.notes;

      return ctx.prisma.appointment.update({
        where: { id: input.id, clinicId: ctx.clinicId! },
        data: updateData,
      });
    }),

  reschedule: clinicProcedure
    .input(z.object({ id: z.string(), newDate: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.appointment.update({
        where: { id: input.id, clinicId: ctx.clinicId! },
        data: { date: new Date(input.newDate), status: "RESCHEDULED" },
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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const appointments = await ctx.prisma.appointment.findMany({
      where: {
        clinicId: ctx.clinicId!,
        date: { gte: todayStart, lte: todayEnd },
      },
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
