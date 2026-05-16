import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure, adminProcedure, protectedProcedure } from "../procedures";
import { TRPCError } from "@trpc/server";
import { addDays } from "date-fns";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { sendEmail, renderInvitationEmail } from "@/lib/email";
import { createActivityLog } from "@/lib/activity-log";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

const ROLE_LABELS: Record<string, string> = {
  CLINIC_OWNER: "Gérant",
  CLINIC_STAFF: "Personnel",
  CONFIRMATION_AGENT: "Agent de confirmation",
  DOCTOR: "Médecin",
};

export const teamRouter = createTRPCRouter({
  // ── LIST TEAM (clinic scoped) ─────────────────────────────────────────────

  list: clinicProcedure
    .input(
      z.object({
        role: z.string().optional(),
        status: z.enum(["all", "active", "inactive", "invited"]).default("all"),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { clinicId: ctx.clinicId };

      if (input.role && input.role !== "all") where.role = input.role;

      if (input.status === "active") where.isActive = true;
      else if (input.status === "inactive") where.isActive = false;
      else if (input.status === "invited") {
        where.isActive = false;
        where.invitedAt = { not: null };
      }

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
          { phone: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const members = await ctx.prisma.user.findMany({
        where,
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
          lastActive: true,
          createdAt: true,
          startDate: true,
          invitedAt: true,
          permissions: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return members;
    }),

  // ── LIST ALL (super admin) ────────────────────────────────────────────────

  listAll: adminProcedure
    .input(
      z.object({
        role: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.role && input.role !== "all") where.role = input.role;
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          include: {
            clinic: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return { users, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── INVITE TEAM MEMBER ────────────────────────────────────────────────────

  invite: clinicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(9),
        role: z.enum(["CLINIC_OWNER", "CLINIC_STAFF", "CONFIRMATION_AGENT", "DOCTOR"]),
        permissions: z.record(z.string(), z.boolean()).optional(),
        sendEmail: z.boolean().default(true),
        welcomeMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if email already exists in this clinic
      const existingByEmail = await ctx.prisma.user.findFirst({
        where: { email: input.email, clinicId: ctx.clinicId! },
      });
      if (existingByEmail) {
        throw new TRPCError({ code: "CONFLICT", message: "This email is already registered in your clinic" });
      }

      // Check phone uniqueness globally
      const existingByPhone = await ctx.prisma.user.findFirst({
        where: { phone: input.phone },
      });
      if (existingByPhone) {
        throw new TRPCError({ code: "CONFLICT", message: "This phone number is already registered" });
      }

      // Create user with inactive status (pending invite)
      const invitedUser = await ctx.prisma.user.create({
        data: {
          clinicId: ctx.clinicId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: input.role,
          isActive: false, // activated on acceptance
          permissions: input.permissions ? JSON.parse(JSON.stringify(input.permissions)) : undefined,
          invitedBy: ctx.user.id,
          invitedAt: new Date(),
        },
      });

      // Generate token (7-day expiry)
      const token = generateToken();
      await ctx.prisma.invitationToken.create({
        data: {
          token,
          email: input.email,
          userId: invitedUser.id,
          invitedBy: ctx.user.id,
          clinicId: ctx.clinicId,
          role: input.role,
          expiresAt: addDays(new Date(), 7),
        },
      });

      // Send invitation email
      if (input.sendEmail) {
        const clinic = await ctx.prisma.clinic.findUnique({
          where: { id: ctx.clinicId! },
          select: { name: true },
        });
        const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.clinomatic.dz"}/accept-invitation/${token}`;
        const { subject, html } = renderInvitationEmail({
          inviteeName: input.name,
          inviterName: ctx.user.name,
          clinicName: clinic?.name ?? "votre clinique",
          role: input.role,
          acceptUrl,
          expiresIn: "7 jours",
        });
        sendEmail({ to: input.email, subject, html }).catch(console.error);
      }

      // Activity log
      createActivityLog({
        clinicId: ctx.clinicId!,
        userId: ctx.user.id,
        action: "TEAM_MEMBER_ADDED",
        targetType: "user",
        targetId: invitedUser.id,
        targetName: input.name,
      }).catch(console.error);

      return { userId: invitedUser.id, token };
    }),

  // ── UPDATE MEMBER ─────────────────────────────────────────────────────────

  update: clinicProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["CLINIC_OWNER", "CLINIC_STAFF", "CONFIRMATION_AGENT", "DOCTOR"]).optional(),
        permissions: z.record(z.string(), z.boolean()).optional(),
        isActive: z.boolean().optional(),
        jobTitle: z.string().optional(),
        department: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify member belongs to this clinic
      const member = await ctx.prisma.user.findFirst({
        where: { id: input.userId, clinicId: ctx.clinicId! },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.permissions !== undefined ? { permissions: JSON.parse(JSON.stringify(input.permissions)) } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
          ...(input.department !== undefined ? { department: input.department } : {}),
        },
        select: { id: true, name: true, role: true, isActive: true },
      });
    }),

  // ── REMOVE MEMBER ─────────────────────────────────────────────────────────

  remove: clinicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove yourself" });
      }
      const member = await ctx.prisma.user.findFirst({
        where: { id: input.userId, clinicId: ctx.clinicId! },
        select: { name: true },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      // Deactivate rather than delete (preserve audit trail)
      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { isActive: false, clinicId: null },
      });

      createActivityLog({
        clinicId: ctx.clinicId!,
        userId: ctx.user.id,
        action: "TEAM_MEMBER_REMOVED",
        targetType: "user",
        targetId: input.userId,
        targetName: member.name,
      }).catch(console.error);

      return { ok: true };
    }),

  // ── RESEND INVITE ─────────────────────────────────────────────────────────

  resendInvite: clinicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.prisma.user.findFirst({
        where: { id: input.userId, clinicId: ctx.clinicId!, isActive: false },
        select: { name: true, email: true, role: true },
      });
      if (!member?.email) throw new TRPCError({ code: "NOT_FOUND" });

      // Expire old tokens
      await ctx.prisma.invitationToken.updateMany({
        where: { userId: input.userId, acceptedAt: null },
        data: { expiresAt: new Date() }, // expire immediately
      });

      // Create new token
      const token = generateToken();
      await ctx.prisma.invitationToken.create({
        data: {
          token,
          email: member.email,
          userId: input.userId,
          invitedBy: ctx.user.id,
          clinicId: ctx.clinicId,
          role: member.role,
          expiresAt: addDays(new Date(), 7),
        },
      });

      const clinic = await ctx.prisma.clinic.findUnique({
        where: { id: ctx.clinicId! },
        select: { name: true },
      });
      const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.clinomatic.dz"}/accept-invitation/${token}`;
      const { subject, html } = renderInvitationEmail({
        inviteeName: member.name,
        inviterName: ctx.user.name,
        clinicName: clinic?.name ?? "votre clinique",
        role: member.role,
        acceptUrl,
        expiresIn: "7 jours",
      });
      sendEmail({ to: member.email, subject, html }).catch(console.error);

      return { ok: true };
    }),

  // ── ACCEPT INVITATION (public) ────────────────────────────────────────────

  acceptInvitation: protectedProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8),
        name: z.string().min(2).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.prisma.invitationToken.findUnique({
        where: { token: input.token },
        include: { user: true, inviter: { select: { name: true } } },
      });

      if (!invitation) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invitation link" });
      if (invitation.acceptedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already accepted" });
      if (invitation.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation has expired" });

      const hashed = await bcrypt.hash(input.password, 12);

      await ctx.prisma.user.update({
        where: { id: invitation.userId },
        data: {
          isActive: true,
          password: hashed,
          ...(input.name ? { name: input.name } : {}),
        },
      });

      await ctx.prisma.invitationToken.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return { ok: true, clinicId: invitation.clinicId, role: invitation.role };
    }),

  // ── GET INVITATION INFO (public — for accept page) ────────────────────────

  getInvitationInfo: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.prisma.invitationToken.findUnique({
        where: { token: input.token },
        include: {
          user: { select: { name: true, email: true, role: true } },
          inviter: { select: { name: true } },
        },
      });

      if (!invitation) throw new TRPCError({ code: "NOT_FOUND" });
      if (invitation.acceptedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Already accepted" });
      if (invitation.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Expired" });

      const clinic = invitation.clinicId
        ? await ctx.prisma.clinic.findUnique({
            where: { id: invitation.clinicId },
            select: { name: true },
          })
        : null;

      return {
        name: invitation.user.name,
        email: invitation.user.email,
        role: invitation.role,
        roleLabel: ROLE_LABELS[invitation.role] ?? invitation.role,
        clinicName: clinic?.name ?? null,
        inviterName: invitation.inviter.name,
        expiresAt: invitation.expiresAt,
      };
    }),
});
