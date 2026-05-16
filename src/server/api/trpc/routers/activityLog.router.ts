import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure, adminProcedure } from "../procedures";
import { subMonths } from "date-fns";

export const activityLogRouter = createTRPCRouter({
  // ── LIST (clinic scoped) ─────────────────────────────────────────────────

  list: clinicProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        userId: z.string().optional(),
        action: z.string().optional(),
        targetType: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        clinicId: ctx.clinicId,
      };

      if (input.startDate || input.endDate) {
        where.createdAt = {
          ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
          ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
        };
      }
      if (input.userId) where.userId = input.userId;
      if (input.action) where.action = input.action;
      if (input.targetType) where.targetType = input.targetType;

      const [items, total] = await Promise.all([
        ctx.prisma.activityLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, role: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.prisma.activityLog.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── LIST ALL (super admin) ────────────────────────────────────────────────

  listAll: adminProcedure
    .input(
      z.object({
        clinicId: z.string().optional(),
        userId: z.string().optional(),
        action: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.clinicId) where.clinicId = input.clinicId;
      if (input.userId) where.userId = input.userId;
      if (input.action) where.action = input.action;
      if (input.startDate || input.endDate) {
        where.createdAt = {
          ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
          ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
        };
      }

      const [items, total] = await Promise.all([
        ctx.prisma.activityLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.prisma.activityLog.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── DISTINCT USERS (for filter dropdown) ─────────────────────────────────

  getUsers: clinicProcedure.query(async ({ ctx }) => {
    const logs = await ctx.prisma.activityLog.findMany({
      where: { clinicId: ctx.clinicId, userId: { not: null } },
      select: { userId: true, user: { select: { name: true } } },
      distinct: ["userId"],
      take: 50,
    });
    return logs.map((l) => ({ id: l.userId!, name: l.user?.name ?? "Unknown" }));
  }),

  // ── CLEANUP OLD LOGS (cron) ───────────────────────────────────────────────

  cleanup: adminProcedure.mutation(async ({ ctx }) => {
    const cutoff = subMonths(new Date(), 12);
    const result = await ctx.prisma.activityLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return { deleted: result.count };
  }),
});
