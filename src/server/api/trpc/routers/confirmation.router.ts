import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { agentProcedure } from "../procedures";

export const confirmationRouter = createTRPCRouter({
  getQueue: agentProcedure
    .input(z.object({ clinicId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        status: { in: ["PENDING", "CONFIRMING"] },
        date: { gte: new Date() },
      };

      if (ctx.role !== "SUPER_ADMIN") {
        where.OR = [{ confirmedBy: null }, { confirmedBy: ctx.userId }];
      }

      if (input.clinicId) where.clinicId = input.clinicId;

      return ctx.prisma.appointment.findMany({
        where,
        include: {
          patient: true,
          clinic: { select: { name: true, phone: true } },
          service: true,
          doctor: true,
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        take: 100,
      });
    }),

  assignToMe: agentProcedure
    .input(z.object({ appointmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.appointment.update({
        where: { id: input.appointmentId },
        data: { status: "CONFIRMING", confirmedBy: ctx.userId },
      });
    }),

  confirm: agentProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        method: z.enum(["whatsapp_manual", "call", "whatsapp_auto"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.update({
        where: { id: input.appointmentId },
        data: {
          status: "CONFIRMED",
          confirmedBy: ctx.userId,
          confirmedAt: new Date(),
          confirmMethod: input.method,
          confirmNotes: input.notes,
          confirmAttempts: { increment: 1 },
        },
      });

      await ctx.prisma.agentPerformance.upsert({
        where: { userId: ctx.userId! },
        create: {
          userId: ctx.userId!,
          totalConfirmed: 1,
          weekConfirmed: 1,
          confirmationRate: 100,
          weekStart: new Date(),
        },
        update: {
          totalConfirmed: { increment: 1 },
          weekConfirmed: { increment: 1 },
        },
      });

      return appointment;
    }),

  markNoAnswer: agentProcedure
    .input(z.object({ appointmentId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.appointment.update({
        where: { id: input.appointmentId },
        data: {
          confirmAttempts: { increment: 1 },
          confirmNotes: input.notes,
        },
      });
    }),

  markCancelled: agentProcedure
    .input(z.object({ appointmentId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.appointment.update({
        where: { id: input.appointmentId },
        data: {
          status: "CANCELLED",
          confirmNotes: input.reason,
          confirmedBy: ctx.userId,
          confirmedAt: new Date(),
        },
      });
    }),
});
