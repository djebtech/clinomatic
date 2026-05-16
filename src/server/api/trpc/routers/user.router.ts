import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { protectedProcedure } from "../procedures";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

export const userRouter = createTRPCRouter({
  // ── GET CURRENT USER (full profile) ──────────────────────────────────────

  getMe: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        avatar: true,
        jobTitle: true,
        department: true,
        timezone: true,
        startDate: true,
        employmentType: true,
        notificationPreferences: true,
        permissions: true,
        createdAt: true,
        lastActive: true,
        clinic: { select: { id: true, name: true, subscriptionPlan: true } },
      },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return user;
  }),

  // ── UPDATE PROFILE ────────────────────────────────────────────────────────

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        phone: z.string().min(9).max(20).optional(),
        jobTitle: z.string().max(100).optional(),
        department: z.string().max(100).optional(),
        timezone: z.string().optional(),
        avatar: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check phone uniqueness if changed
      if (input.phone) {
        const existing = await ctx.prisma.user.findFirst({
          where: { phone: input.phone, NOT: { id: ctx.user.id } },
        });
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Phone already in use" });
      }

      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
          ...(input.department !== undefined ? { department: input.department } : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
        },
        select: { id: true, name: true, email: true, phone: true, avatar: true },
      });
    }),

  // ── UPDATE NOTIFICATION PREFERENCES ──────────────────────────────────────

  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        email: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
        emailAppointments: z.boolean().optional(),
        emailPayments: z.boolean().optional(),
        emailSystem: z.boolean().optional(),
        emailDailySummary: z.boolean().optional(),
        quietHoursEnabled: z.boolean().optional(),
        quietHoursFrom: z.string().optional(),
        quietHoursTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Merge with existing
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { notificationPreferences: true },
      });
      const existing = (user?.notificationPreferences as Record<string, unknown>) ?? {};
      const merged = { ...existing, ...input };

      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { notificationPreferences: merged },
        select: { notificationPreferences: true },
      });
    }),

  // ── CHANGE PASSWORD ───────────────────────────────────────────────────────

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { password: true },
      });
      if (!user?.password) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No password set on this account" });
      }

      const valid = await bcrypt.compare(input.currentPassword, user.password);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
      }

      const hashed = await bcrypt.hash(input.newPassword, 12);
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { password: hashed },
      });

      return { ok: true };
    }),

  // ── GET ACTIVE SESSIONS ───────────────────────────────────────────────────

  getActiveSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await ctx.prisma.session.findMany({
      where: {
        userId: ctx.user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        updatedAt: true,
        token: true,
      },
    });

    // Mark current session by matching the auth session token
    const sessionObj = ctx.session as { session?: { token?: string } } | null;
    const currentToken = sessionObj?.session?.token;
    return sessions.map((s) => ({
      ...s,
      isCurrent: !!currentToken && s.token === currentToken,
      token: undefined, // don't expose token to client
    }));
  }),

  // ── REVOKE SESSION ────────────────────────────────────────────────────────

  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only allow revoking own sessions
      await ctx.prisma.session.deleteMany({
        where: { id: input.sessionId, userId: ctx.user.id },
      });
      return { ok: true };
    }),

  // ── REVOKE ALL OTHER SESSIONS ─────────────────────────────────────────────

  revokeOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    const sessionObj = ctx.session as { session?: { token?: string } } | null;
    const currentToken = sessionObj?.session?.token;
    const result = await ctx.prisma.session.deleteMany({
      where: {
        userId: ctx.user.id,
        ...(currentToken ? { token: { not: currentToken } } : {}),
      },
    });
    return { count: result.count };
  }),
});
