import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { adminProcedure } from "../procedures";

export const adminRouter = createTRPCRouter({
  getOverview: adminProcedure.query(async ({ ctx }) => {
    const [totalClinics, totalPatients, totalAppointments, activeAgents] = await Promise.all([
      ctx.prisma.clinic.count({ where: { isActive: true } }),
      ctx.prisma.patient.count(),
      ctx.prisma.appointment.count(),
      ctx.prisma.user.count({ where: { role: "CONFIRMATION_AGENT", isActive: true } }),
    ]);

    const recentClinics = await ctx.prisma.clinic.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: { select: { patients: true, appointments: true } },
      },
    });

    const pendingConfirmations = await ctx.prisma.appointment.count({
      where: { status: { in: ["PENDING", "CONFIRMING"] }, date: { gte: new Date() } },
    });

    return {
      totalClinics,
      totalPatients,
      totalAppointments,
      activeAgents,
      pendingConfirmations,
      recentClinics,
    };
  }),

  getAgentPerformance: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.agentPerformance.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { totalConfirmed: "desc" },
    });
  }),

  getAllClinics: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.clinic.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { patients: true, appointments: true, doctors: true } },
        whatsappConfig: { select: { isConnected: true } },
      },
    });
  }),

  toggleClinic: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.clinic.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  updateClinicPlan: adminProcedure
    .input(
      z.object({
        id: z.string(),
        subscriptionPlan: z.enum(["BASIC", "PRO", "ENTERPRISE"]),
        monthlyFee: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.clinic.update({
        where: { id: input.id },
        data: { subscriptionPlan: input.subscriptionPlan, monthlyFee: input.monthlyFee },
      });
    }),
});
