import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure, adminProcedure, protectedProcedure } from "../procedures";
import type { Prisma } from "@prisma/client";

const workingHoursSchema = z.record(
  z.string(),
  z.object({ open: z.boolean(), start: z.string().optional(), end: z.string().optional() })
);

export const clinicRouter = createTRPCRouter({
  // ── Clinic-scoped ─────────────────────────────────────────────────────────

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
    .input(z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.clinic.update({ where: { id: ctx.clinicId! }, data: input });
    }),

  getStaff: clinicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { clinicId: ctx.clinicId!, isActive: true },
      select: { id: true, name: true, email: true, phone: true, role: true, lastActive: true },
      orderBy: { name: "asc" },
    });
  }),

  // ── Admin procedures ──────────────────────────────────────────────────────

  adminStats: adminProcedure.query(async ({ ctx }) => {
    const [total, active, totalPatients, rev] = await Promise.all([
      ctx.prisma.clinic.count(),
      ctx.prisma.clinic.count({ where: { isActive: true } }),
      ctx.prisma.patient.count(),
      ctx.prisma.clinic.aggregate({ where: { isActive: true }, _sum: { monthlyFee: true } }),
    ]);
    return { total, active, totalPatients, monthlyRevenue: rev._sum.monthlyFee ?? 0 };
  }),

  adminList: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["all", "active", "inactive"]).default("all"),
      plan: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { city: { contains: input.search, mode: "insensitive" } },
          { slug: { contains: input.search, mode: "insensitive" } },
        ];
      }
      if (input.status === "active") where.isActive = true;
      if (input.status === "inactive") where.isActive = false;
      if (input.plan && input.plan !== "all") where.subscriptionPlan = input.plan;

      const [clinics, total] = await Promise.all([
        ctx.prisma.clinic.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { patients: true, doctors: true, services: true, appointments: true } },
          },
        }),
        ctx.prisma.clinic.count({ where }),
      ]);
      return { clinics, total, page: input.page, totalPages: Math.ceil(total / input.limit) };
    }),

  checkSlug: adminProcedure
    .input(z.object({ slug: z.string(), excludeId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.prisma.clinic.findFirst({
        where: {
          slug: input.slug,
          ...(input.excludeId ? { NOT: { id: input.excludeId } } : {}),
        },
      });
      return { available: !existing };
    }),

  adminGetById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const clinic = await ctx.prisma.clinic.findUnique({
        where: { id: input.id },
        include: {
          doctors: {
            orderBy: { name: "asc" },
            include: { _count: { select: { appointments: true } } },
          },
          services: { where: { isActive: true }, orderBy: { name: "asc" } },
          users: {
            where: { isActive: true },
            select: { id: true, name: true, email: true, phone: true, role: true, lastActive: true, isActive: true },
            orderBy: { name: "asc" },
          },
          _count: { select: { patients: true, doctors: true, services: true, appointments: true } },
          whatsappConfig: { select: { isConnected: true, phoneNumber: true } },
        },
      });
      if (!clinic) throw new TRPCError({ code: "NOT_FOUND" });

      const monthAppointments = await ctx.prisma.appointment.count({
        where: { clinicId: input.id, date: { gte: monthStart, lte: monthEnd } },
      });

      const recentAppointments = await ctx.prisma.appointment.findMany({
        where: { clinicId: input.id },
        orderBy: { date: "desc" },
        take: 10,
        include: {
          patient: { select: { name: true, phone: true } },
          service: { select: { name: true } },
          doctor: { select: { name: true } },
        },
      });

      return { ...clinic, monthAppointments, recentAppointments };
    }),

  adminCreate: adminProcedure
    .input(z.object({
      name: z.string().min(3),
      slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
      logo: z.string().optional(),
      phone: z.string().min(9),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string(),
      workingHours: workingHoursSchema.optional(),
      holidays: z.array(z.string()).optional(),
      subscriptionPlan: z.enum(["BASIC", "PRO", "ENTERPRISE"]).default("BASIC"),
      monthlyFee: z.number().positive().default(12000),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.clinic.findUnique({ where: { slug: input.slug } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Ce slug est déjà utilisé" });
      const { holidays, email, workingHours, ...rest } = input;
      return ctx.prisma.clinic.create({
        data: {
          ...rest,
          email: email || undefined,
          workingHours: (workingHours ?? {}) as Prisma.InputJsonValue,
          holidays: holidays?.map((d) => new Date(d)) ?? [],
        },
      });
    }),

  adminUpdate: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(3).optional(),
      slug: z.string().optional(),
      logo: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      workingHours: workingHoursSchema.optional(),
      holidays: z.array(z.string()).optional(),
      subscriptionPlan: z.enum(["BASIC", "PRO", "ENTERPRISE"]).optional(),
      monthlyFee: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, holidays, email, workingHours, ...rest } = input;
      return ctx.prisma.clinic.update({
        where: { id },
        data: {
          ...rest,
          email: email || undefined,
          ...(workingHours ? { workingHours: workingHours as Prisma.InputJsonValue } : {}),
          ...(holidays ? { holidays: holidays.map((d) => new Date(d)) } : {}),
        },
      });
    }),

  adminDelete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.clinic.delete({ where: { id: input.id } });
    }),

  adminToggleActive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const clinic = await ctx.prisma.clinic.findUniqueOrThrow({ where: { id: input.id } });
      return ctx.prisma.clinic.update({
        where: { id: input.id },
        data: { isActive: !clinic.isActive },
      });
    }),

  // Legacy (keep for existing admin page)
  listAll: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.clinic.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { patients: true, appointments: true } } },
    });
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      phone: z.string().min(9),
      email: z.string().email().optional(),
      city: z.string().optional(),
      subscriptionPlan: z.enum(["BASIC", "PRO", "ENTERPRISE"]).default("BASIC"),
      monthlyFee: z.number().default(12000),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.clinic.create({ data: input });
    }),
});
