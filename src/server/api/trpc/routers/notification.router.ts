import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { protectedProcedure } from "../procedures";

export const notificationRouter = createTRPCRouter({
  // ── LIST ──────────────────────────────────────────────────────────────────

  list: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(30),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        userId: ctx.user.id,
        ...(input.unreadOnly ? { read: false } : {}),
      };

      const items = await ctx.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  // ── UNREAD COUNT ──────────────────────────────────────────────────────────

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.notification.count({
      where: { userId: ctx.user.id, read: false },
    });
    return { count };
  }),

  // ── MARK AS READ ──────────────────────────────────────────────────────────

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { read: true, readAt: new Date() },
      });
      return { ok: true };
    }),

  // ── MARK ALL AS READ ──────────────────────────────────────────────────────

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.prisma.notification.updateMany({
      where: { userId: ctx.user.id, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { count: result.count };
  }),

  // ── DELETE ────────────────────────────────────────────────────────────────

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.notification.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      return { ok: true };
    }),

  // ── DELETE ALL READ ───────────────────────────────────────────────────────

  deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.prisma.notification.deleteMany({
      where: { userId: ctx.user.id, read: true },
    });
    return { count: result.count };
  }),
});
