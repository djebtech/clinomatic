import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure } from "../procedures";
import {
  createEvolutionInstance,
  getInstanceQRCode,
  getInstanceStatus,
  deleteEvolutionInstance,
  logoutEvolutionInstance,
  restartEvolutionInstance,
  sendEvolutionMessage,
  formatPhoneForWhatsApp,
} from "@/lib/whatsapp/evolution";
import { DEFAULT_TEMPLATES, renderTemplate, buildTemplateVariables, PREVIEW_VARS } from "@/lib/whatsapp/templates";

export const whatsappRouter = createTRPCRouter({
  // ── CONFIG ──────────────────────────────────────────────────────────────────

  getConfig: clinicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.whatsAppConfig.findUnique({
      where: { clinicId: ctx.clinicId! },
    });
  }),

  updateConfig: clinicProcedure
    .input(
      z.object({
        phoneNumber: z.string().optional(),
        autoConfirm: z.boolean().optional(),
        autoReminder24h: z.boolean().optional(),
        autoReminder2h: z.boolean().optional(),
        autoFollowUp: z.boolean().optional(),
        autoNoShowRecovery: z.boolean().optional(),
        autoRecall: z.boolean().optional(),
        recallDays: z.number().optional(),
        confirmTemplate: z.string().optional(),
        reminder24hTemplate: z.string().optional(),
        reminder2hTemplate: z.string().optional(),
        followUpTemplate: z.string().optional(),
        noShowRecoveryTemplate: z.string().optional(),
        recallTemplate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.whatsAppConfig.upsert({
        where: { clinicId: ctx.clinicId! },
        create: { ...input, clinicId: ctx.clinicId!, phoneNumber: input.phoneNumber ?? "" },
        update: input,
      });
    }),

  resetTemplates: clinicProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.whatsAppConfig.update({
      where: { clinicId: ctx.clinicId! },
      data: {
        confirmTemplate: DEFAULT_TEMPLATES.confirmTemplate,
        reminder24hTemplate: DEFAULT_TEMPLATES.reminder24hTemplate,
        reminder2hTemplate: DEFAULT_TEMPLATES.reminder2hTemplate,
        followUpTemplate: DEFAULT_TEMPLATES.followUpTemplate,
        noShowRecoveryTemplate: DEFAULT_TEMPLATES.noShowRecoveryTemplate,
        recallTemplate: DEFAULT_TEMPLATES.recallTemplate,
      },
    });
  }),

  getDefaultTemplates: clinicProcedure.query(() => {
    return DEFAULT_TEMPLATES;
  }),

  getPreviewVars: clinicProcedure.query(() => {
    return PREVIEW_VARS;
  }),

  previewTemplate: clinicProcedure
    .input(z.object({ template: z.string() }))
    .query(({ input }) => {
      return renderTemplate(input.template, PREVIEW_VARS);
    }),

  // ── INSTANCE MANAGEMENT ──────────────────────────────────────────────────────

  createInstance: clinicProcedure.mutation(async ({ ctx }) => {
    const clinicId = ctx.clinicId!;
    const { instanceName, qrCode } = await createEvolutionInstance(clinicId);

    // Upsert config with instanceName
    await ctx.prisma.whatsAppConfig.upsert({
      where: { clinicId },
      create: { clinicId, phoneNumber: "", instanceName, isConnected: false },
      update: { instanceName, isConnected: false },
    });

    return { instanceName, qrCode };
  }),

  getInstanceStatus: clinicProcedure.query(async ({ ctx }) => {
    const config = await ctx.prisma.whatsAppConfig.findUnique({
      where: { clinicId: ctx.clinicId! },
    });

    if (!config?.instanceName) {
      return { connected: false, status: "close" as const, phoneNumber: undefined, qrCode: null };
    }

    const status = await getInstanceStatus(config.instanceName);

    // If still connecting, get QR code
    let qrCode: string | null = null;
    if (status.status === "connecting" || !status.connected) {
      qrCode = await getInstanceQRCode(config.instanceName);
    }

    // Sync connected state in DB
    if (status.connected !== config.isConnected) {
      await ctx.prisma.whatsAppConfig.update({
        where: { clinicId: ctx.clinicId! },
        data: { isConnected: status.connected, phoneNumber: status.phoneNumber ?? config.phoneNumber },
      });
    }

    return { ...status, qrCode };
  }),

  getQRCode: clinicProcedure.query(async ({ ctx }) => {
    const config = await ctx.prisma.whatsAppConfig.findUnique({
      where: { clinicId: ctx.clinicId! },
    });
    if (!config?.instanceName) return null;
    return getInstanceQRCode(config.instanceName);
  }),

  disconnectInstance: clinicProcedure.mutation(async ({ ctx }) => {
    const config = await ctx.prisma.whatsAppConfig.findUnique({
      where: { clinicId: ctx.clinicId! },
    });
    if (!config?.instanceName) throw new Error("No instance found");

    await logoutEvolutionInstance(config.instanceName);
    await ctx.prisma.whatsAppConfig.update({
      where: { clinicId: ctx.clinicId! },
      data: { isConnected: false },
    });
    return { ok: true };
  }),

  restartInstance: clinicProcedure.mutation(async ({ ctx }) => {
    const config = await ctx.prisma.whatsAppConfig.findUnique({
      where: { clinicId: ctx.clinicId! },
    });
    if (!config?.instanceName) throw new Error("No instance found");
    await restartEvolutionInstance(config.instanceName);
    return { ok: true };
  }),

  // ── SEND MESSAGES ─────────────────────────────────────────────────────────────

  sendTestMessage: clinicProcedure
    .input(
      z.object({
        phoneNumber: z.string().min(9),
        template: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.prisma.whatsAppConfig.findUnique({
        where: { clinicId: ctx.clinicId! },
      });
      if (!config?.instanceName || !config.isConnected) {
        throw new Error("WhatsApp not connected");
      }

      const rendered = renderTemplate(input.template, PREVIEW_VARS);
      const result = await sendEvolutionMessage(config.instanceName, input.phoneNumber, rendered);

      if (!result.success) throw new Error(result.error ?? "Send failed");
      return result;
    }),

  sendManual: clinicProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.findFirst({
        where: { id: input.appointmentId, clinicId: ctx.clinicId! },
        include: { patient: true },
      });
      if (!appointment) throw new Error("Appointment not found");

      const config = await ctx.prisma.whatsAppConfig.findUnique({
        where: { clinicId: ctx.clinicId! },
      });
      if (!config?.instanceName || !config.isConnected) {
        throw new Error("WhatsApp not connected for this clinic");
      }

      const result = await sendEvolutionMessage(
        config.instanceName,
        appointment.patient.phone,
        input.message
      );

      await ctx.prisma.whatsAppMessage.create({
        data: {
          clinicId: ctx.clinicId!,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          direction: "OUTBOUND",
          messageType: "MANUAL",
          content: input.message,
          status: result.success ? "SENT" : "FAILED",
          externalId: result.messageId ?? null,
          errorMessage: result.error ?? null,
        },
      });

      return result;
    }),

  sendConfirmation: clinicProcedure
    .input(z.object({ appointmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.findFirst({
        where: { id: input.appointmentId, clinicId: ctx.clinicId! },
        include: { patient: true, clinic: true, doctor: true, service: true },
      });
      if (!appointment) throw new Error("Appointment not found");

      const config = await ctx.prisma.whatsAppConfig.findUnique({
        where: { clinicId: ctx.clinicId! },
      });
      if (!config?.instanceName || !config.isConnected) {
        throw new Error("WhatsApp not connected");
      }

      const vars = buildTemplateVariables({
        patientName: appointment.patient.name,
        clinicName: appointment.clinic.name,
        appointmentDate: appointment.date,
        doctorName: appointment.doctor?.name,
        serviceName: appointment.service?.name,
        clinicAddress: appointment.clinic.address,
        clinicPhone: appointment.clinic.phone,
      });

      const rendered = renderTemplate(
        config.confirmTemplate ?? DEFAULT_TEMPLATES.confirmTemplate,
        vars
      );

      const result = await sendEvolutionMessage(config.instanceName, appointment.patient.phone, rendered);

      await ctx.prisma.whatsAppMessage.create({
        data: {
          clinicId: ctx.clinicId!,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          direction: "OUTBOUND",
          messageType: "CONFIRMATION",
          content: rendered,
          status: result.success ? "SENT" : "FAILED",
          externalId: result.messageId ?? null,
          errorMessage: result.error ?? null,
        },
      });

      return result;
    }),

  // ── MESSAGE HISTORY ───────────────────────────────────────────────────────────

  getMessages: clinicProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.whatsAppMessage.findMany({
        where: { appointmentId: input.appointmentId },
        orderBy: { sentAt: "asc" },
      });
    }),

  getMessageHistory: clinicProcedure
    .input(
      z.object({
        messageType: z.string().optional(),
        status: z.string().optional(),
        direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { clinicId: ctx.clinicId! };

      if (input.messageType) where.messageType = input.messageType;
      if (input.status) where.status = input.status;
      if (input.direction) where.direction = input.direction;
      if (input.startDate || input.endDate) {
        where.sentAt = {};
        if (input.startDate) where.sentAt.gte = new Date(input.startDate);
        if (input.endDate) where.sentAt.lte = new Date(input.endDate);
      }

      const [total, messages] = await ctx.prisma.$transaction([
        ctx.prisma.whatsAppMessage.count({ where }),
        ctx.prisma.whatsAppMessage.findMany({
          where,
          include: { patient: { select: { name: true, phone: true } } },
          orderBy: { sentAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
      ]);

      return { messages, total, pages: Math.ceil(total / input.limit) };
    }),

  getAnalytics: clinicProcedure
    .input(z.object({ period: z.enum(["week", "month", "year"]) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const startDate =
        input.period === "week"
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : input.period === "month"
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const messages = await ctx.prisma.whatsAppMessage.findMany({
        where: {
          clinicId: ctx.clinicId!,
          sentAt: { gte: startDate },
          direction: "OUTBOUND",
        },
        select: { status: true, messageType: true, sentAt: true, deliveredAt: true, readAt: true },
      });

      const total = messages.length;
      const delivered = messages.filter((m) => ["DELIVERED", "READ", "REPLIED"].includes(m.status)).length;
      const read = messages.filter((m) => ["READ", "REPLIED"].includes(m.status)).length;
      const failed = messages.filter((m) => m.status === "FAILED").length;

      // By type breakdown
      const byType = messages.reduce<Record<string, number>>((acc, m) => {
        acc[m.messageType] = (acc[m.messageType] ?? 0) + 1;
        return acc;
      }, {});

      return {
        total,
        delivered,
        read,
        failed,
        deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        readRate: total > 0 ? Math.round((read / total) * 100) : 0,
        byType,
      };
    }),
});
