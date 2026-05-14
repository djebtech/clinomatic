import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure, adminProcedure, protectedProcedure } from "../procedures";

export const clinicRouter = createTRPCRouter({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.clinicId) return null;
    return ctx.prisma.clinic.findUnique({
      where: { id: ctx.clinicId },
      include: {
        whatsappConfig: true,
        socialIntegrations: true,
        _count: { select: { patients: true, appointments: true, doctors: true } },
      },
    });
  }),

  update: clinicProcedure
    .input(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.clinic.update({
        where: { id: ctx.clinicId! },
        data: input,
      });
    }),

  getStaff: clinicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { clinicId: ctx.clinicId!, isActive: true },
      select: { id: true, name: true, email: true, phone: true, role: true, lastActive: true },
      orderBy: { name: "asc" },
    });
  }),

  // Admin: list all clinics
  listAll: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.clinic.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { patients: true, appointments: true } },
      },
    });
  }),

  // Admin: create clinic
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        phone: z.string().min(9),
        email: z.string().email().optional(),
        city: z.string().optional(),
        subscriptionPlan: z.enum(["BASIC", "PRO", "ENTERPRISE"]).default("BASIC"),
        monthlyFee: z.number().default(12000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.clinic.create({ data: input });
    }),
});
