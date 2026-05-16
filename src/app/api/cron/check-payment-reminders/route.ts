import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { differenceInDays, subDays } from "date-fns";

type ReminderType =
  | "before_5d"
  | "due_today"
  | "overdue_7d"
  | "overdue_14d"
  | "overdue_30d"
  | "overdue_45d";

interface ReminderRule {
  type: ReminderType;
  label: string;
  action?: "suspend";
}

const REMINDER_RULES: ReminderRule[] = [
  { type: "before_5d", label: "5 jours avant échéance" },
  { type: "due_today", label: "Date d'échéance" },
  { type: "overdue_7d", label: "7 jours de retard" },
  { type: "overdue_14d", label: "14 jours de retard" },
  { type: "overdue_30d", label: "30 jours de retard (avertissement de suspension)" },
  { type: "overdue_45d", label: "45 jours de retard — SUSPENSION AUTOMATIQUE", action: "suspend" },
];

function getReminderType(daysOverdue: number, daysUntilDue: number): ReminderType | null {
  if (daysOverdue <= 0) {
    if (daysUntilDue === 5) return "before_5d";
    if (daysUntilDue === 0) return "due_today";
    return null;
  }
  if (daysOverdue >= 45) return "overdue_45d";
  if (daysOverdue >= 30) return "overdue_30d";
  if (daysOverdue >= 14) return "overdue_14d";
  if (daysOverdue >= 7) return "overdue_7d";
  return null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let remindersSent = 0;
  let suspended = 0;
  const errors: string[] = [];

  // Get all unpaid/overdue invoices
  const unpaidInvoices = await prisma.invoice.findMany({
    where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    include: {
      clinic: { select: { id: true, name: true, phone: true, email: true, isActive: true, suspendedAt: true } },
      reminders: { orderBy: { sentAt: "desc" }, take: 1 },
    },
  });

  for (const invoice of unpaidInvoices) {
    try {
      const daysOverdue = Math.max(0, differenceInDays(now, invoice.dueDate));
      const daysUntilDue = Math.max(0, differenceInDays(invoice.dueDate, now));

      // Update invoice status to OVERDUE if past due
      if (daysOverdue > 0 && invoice.status === "UNPAID") {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "OVERDUE" },
        });
      }

      const reminderType = getReminderType(daysOverdue, daysUntilDue);
      if (!reminderType) continue;

      // Check if this type of reminder was already sent recently (within 1 day)
      const lastReminder = invoice.reminders[0];
      if (lastReminder?.type === reminderType &&
          differenceInDays(now, lastReminder.sentAt) < 1) {
        continue;
      }

      // Record reminder
      await prisma.paymentReminder.create({
        data: {
          invoiceId: invoice.id,
          type: reminderType,
          method: invoice.clinic.email ? "email" : "whatsapp",
        },
      });
      remindersSent++;

      // Auto-suspend at 45 days overdue
      const rule = REMINDER_RULES.find((r) => r.type === reminderType);
      if (rule?.action === "suspend" && !invoice.clinic.suspendedAt) {
        await prisma.clinic.update({
          where: { id: invoice.clinic.id },
          data: { isActive: false, suspendedAt: now, bookingPageEnabled: false },
        });
        await prisma.whatsAppConfig.updateMany({
          where: { clinicId: invoice.clinic.id },
          data: { autoReminder24h: false, autoReminder2h: false, autoFollowUp: false, autoConfirm: false },
        });
        suspended++;
      }
    } catch (err) {
      errors.push(`Invoice ${invoice.invoiceNumber}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: unpaidInvoices.length,
    remindersSent,
    suspended,
    errors,
  });
}
