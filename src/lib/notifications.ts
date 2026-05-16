import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_NO_SHOW"
  | "APPOINTMENT_RESCHEDULED"
  | "APPOINTMENT_ASSIGNED"
  | "PAYMENT_RECEIVED"
  | "INVOICE_GENERATED"
  | "PAYMENT_OVERDUE"
  | "PLAN_CHANGED"
  | "WHATSAPP_DISCONNECTED"
  | "USAGE_LIMIT_APPROACHING"
  | "TEAM_MEMBER_ADDED"
  | "TEAM_MEMBER_REMOVED"
  | "SETTINGS_CHANGED"
  | "PATIENT_REGISTERED";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  linkUrl?: string;
}

/**
 * Create an in-app notification for a user.
 * Fire-and-forget — call without await in hot paths.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.parse(JSON.stringify(params.data)) : undefined,
        linkUrl: params.linkUrl ?? null,
      },
    });
  } catch (err) {
    console.error("[createNotification]", err);
  }
}

/**
 * Notify all CLINIC_OWNER users for a given clinic.
 */
export async function notifyClinicOwners(
  clinicId: string,
  params: Omit<CreateNotificationParams, "userId">
) {
  const owners = await prisma.user.findMany({
    where: { clinicId, role: "CLINIC_OWNER", isActive: true },
    select: { id: true },
  });
  await Promise.all(owners.map((o) => createNotification({ ...params, userId: o.id })));
}

/**
 * Notify all CLINIC_OWNER + CLINIC_STAFF users for a given clinic.
 */
export async function notifyClinicStaff(
  clinicId: string,
  params: Omit<CreateNotificationParams, "userId">
) {
  const staff = await prisma.user.findMany({
    where: { clinicId, role: { in: ["CLINIC_OWNER", "CLINIC_STAFF"] }, isActive: true },
    select: { id: true },
  });
  await Promise.all(staff.map((s) => createNotification({ ...params, userId: s.id })));
}
