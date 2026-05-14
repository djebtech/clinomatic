import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure } from "../procedures";
import { sendWhatsAppMessage, buildConfirmationMessage, buildReminder24hMessage } from "@/lib/whatsapp";

export const whatsappRouter = createTRPCRouter({
  getConfig: clinicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.whatsAppConfig.findUnique({
      where: { clinicId: ctx.clinicId! },
    });
  }),

  updateConfig: clinicProcedure
    .input(
      z.object({
        phoneNumber: z.string().optional(),
        apiToken: z.string().optional(),
        apiUrl: z.string().optional(),
        autoReminder24h: z.boolean().optional(),
        autoReminder2h: z.boolean().optional(),
        autoFollowUp: z.boolean().optional(),
        autoRecall: z.boolean().optional(),
        recallDays: z.number().optional(),
        confirmTemplate: z.string().optional(),
        reminder24hTemplate: z.string().optional(),
        reminder2hTemplate: z.string().optional(),
        followUpTemplate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.whatsAppConfig.upsert({
        where: { clinicId: ctx.clinicId! },
        create: { ...input, clinicId: ctx.clinicId!, phoneNumber: input.phoneNumber ?? "" },
        update: input,
      });
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

      const result = await sendWhatsAppMessage({
        phone: appointment.patient.phone,
        message: input.message,
        clinicId: ctx.clinicId!,
        apiUrl: config?.apiUrl ?? undefined,
        apiToken: config?.apiToken ?? undefined,
      });

      await ctx.prisma.whatsAppMessage.create({
        data: {
          clinicId: ctx.clinicId!,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          direction: "OUTBOUND",
          messageType: "MANUAL",
          content: input.message,
          status: result.success ? "SENT" : "FAILED",
          errorMessage: result.error,
        },
      });

      return result;
    }),

  sendConfirmation: clinicProcedure
    .input(z.object({ appointmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.findFirst({
        where: { id: input.appointmentId, clinicId: ctx.clinicId! },
        include: { patient: true, clinic: true },
      });

      if (!appointment) throw new Error("Appointment not found");

      const config = await ctx.prisma.whatsAppConfig.findUnique({
        where: { clinicId: ctx.clinicId! },
      });

      const message =
        config?.confirmTemplate?.replace("{name}", appointment.patient.name) ||
        buildConfirmationMessage(appointment.patient.name, appointment.date, appointment.clinic.name);

      const result = await sendWhatsAppMessage({
        phone: appointment.patient.phone,
        message,
        clinicId: ctx.clinicId!,
        apiUrl: config?.apiUrl ?? undefined,
        apiToken: config?.apiToken ?? undefined,
      });

      await ctx.prisma.whatsAppMessage.create({
        data: {
          clinicId: ctx.clinicId!,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          direction: "OUTBOUND",
          messageType: "CONFIRMATION",
          content: message,
          status: result.success ? "SENT" : "FAILED",
          errorMessage: result.error,
        },
      });

      return result;
    }),

  getMessages: clinicProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.whatsAppMessage.findMany({
        where: { appointmentId: input.appointmentId },
        orderBy: { sentAt: "asc" },
      });
    }),
});
