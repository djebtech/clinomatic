import { prisma } from "@/lib/prisma";

export type ActivityAction =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_INVITED"
  | "USER_ACTIVATED"
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_UPDATED"
  | "APPOINTMENT_DELETED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_CANCELLED"
  | "PATIENT_CREATED"
  | "PATIENT_UPDATED"
  | "PATIENT_DELETED"
  | "PAYMENT_RECORDED"
  | "INVOICE_GENERATED"
  | "PLAN_CHANGED"
  | "SETTINGS_UPDATED"
  | "WHATSAPP_MESSAGE_SENT"
  | "TEAM_MEMBER_ADDED"
  | "TEAM_MEMBER_REMOVED";

export interface CreateActivityLogParams {
  clinicId?: string;
  userId?: string;
  action: ActivityAction;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write an audit log entry. Fire-and-forget safe.
 */
export async function createActivityLog(params: CreateActivityLogParams) {
  try {
    await prisma.activityLog.create({
      data: {
        clinicId: params.clinicId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        targetName: params.targetName ?? null,
        details: params.details ? JSON.parse(JSON.stringify(params.details)) : undefined,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[createActivityLog]", err);
  }
}
