/**
 * Message scheduling logic: when an appointment is created or confirmed,
 * queue the relevant WhatsApp messages at the right times.
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_TEMPLATES, buildTemplateVariables, renderTemplate } from "./templates";
import type { MessageType } from "@prisma/client";

interface ScheduleParams {
  appointmentId: string;
  clinicId: string;
}

export async function scheduleMessagesForAppointment({ appointmentId, clinicId }: ScheduleParams) {
  // Load appointment with all needed relations
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      clinic: { include: { whatsappConfig: true } },
      doctor: true,
      service: true,
    },
  });

  if (!appointment) return;

  const config = appointment.clinic.whatsappConfig;
  if (!config || !config.isConnected || !config.instanceName) return;

  const aptDate = appointment.date;
  const now = new Date();

  const vars = buildTemplateVariables({
    patientName: appointment.patient.name,
    clinicName: appointment.clinic.name,
    appointmentDate: aptDate,
    doctorName: appointment.doctor?.name,
    serviceName: appointment.service?.name,
    clinicAddress: appointment.clinic.address,
    clinicPhone: appointment.clinic.phone,
  });

  const messagesToCreate: {
    type: MessageType;
    scheduledFor: Date;
    template: string;
  }[] = [];

  // 1. Confirmation request — send immediately
  if (config.autoConfirm) {
    messagesToCreate.push({
      type: "CONFIRMATION",
      scheduledFor: new Date(now.getTime() + 30_000), // 30 seconds from now
      template: config.confirmTemplate ?? DEFAULT_TEMPLATES.confirmTemplate,
    });
  }

  // 2. 24h reminder
  if (config.autoReminder24h) {
    const target = new Date(aptDate.getTime() - 24 * 60 * 60 * 1000);
    if (target > now) {
      messagesToCreate.push({
        type: "REMINDER_24H",
        scheduledFor: target,
        template: config.reminder24hTemplate ?? DEFAULT_TEMPLATES.reminder24hTemplate,
      });
    }
  }

  // 3. 2h reminder
  if (config.autoReminder2h) {
    const target = new Date(aptDate.getTime() - 2 * 60 * 60 * 1000);
    if (target > now) {
      messagesToCreate.push({
        type: "REMINDER_2H",
        scheduledFor: target,
        template: config.reminder2hTemplate ?? DEFAULT_TEMPLATES.reminder2hTemplate,
      });
    }
  }

  // 4. Follow-up (24h after appointment)
  if (config.autoFollowUp) {
    const target = new Date(aptDate.getTime() + 24 * 60 * 60 * 1000);
    messagesToCreate.push({
      type: "FOLLOW_UP",
      scheduledFor: target,
      template: config.followUpTemplate ?? DEFAULT_TEMPLATES.followUpTemplate,
    });
  }

  // Create queued messages
  await prisma.whatsAppMessage.createMany({
    data: messagesToCreate.map(({ type, scheduledFor, template }) => ({
      clinicId,
      patientId: appointment.patientId,
      appointmentId,
      direction: "OUTBOUND" as const,
      messageType: type,
      content: renderTemplate(template, vars),
      status: "QUEUED" as const,
      scheduledFor,
    })),
    skipDuplicates: true,
  });
}

export async function scheduleNoShowRecovery(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      clinic: { include: { whatsappConfig: true } },
      doctor: true,
      service: true,
    },
  });

  if (!appointment) return;
  const config = appointment.clinic.whatsappConfig;
  if (!config || !config.isConnected || !config.autoNoShowRecovery) return;

  const vars = buildTemplateVariables({
    patientName: appointment.patient.name,
    clinicName: appointment.clinic.name,
    appointmentDate: appointment.date,
    doctorName: appointment.doctor?.name,
    serviceName: appointment.service?.name,
    clinicAddress: appointment.clinic.address,
    clinicPhone: appointment.clinic.phone,
  });

  // Send 1 hour after appointment
  const scheduledFor = new Date(appointment.date.getTime() + 60 * 60 * 1000);
  const content = renderTemplate(
    config.noShowRecoveryTemplate ?? DEFAULT_TEMPLATES.noShowRecoveryTemplate,
    vars
  );

  await prisma.whatsAppMessage.create({
    data: {
      clinicId: appointment.clinicId,
      patientId: appointment.patientId,
      appointmentId,
      direction: "OUTBOUND",
      messageType: "NO_SHOW_RECOVERY",
      content,
      status: "QUEUED",
      scheduledFor,
    },
  });
}
