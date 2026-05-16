import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, addDays, format } from "date-fns";

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}-${rand}`;
}

const PLAN_LIMITS: Record<string, number> = {
  BASIC: 300,
  PRO: 800,
  ENTERPRISE: 999_999,
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const lastMonthStart = startOfMonth(lastMonth);
  const lastMonthEnd = endOfMonth(lastMonth);
  const period = format(lastMonth, "MMMM yyyy");
  const dueDate = addDays(now, 30);

  const clinics = await prisma.clinic.findMany({
    where: { isActive: true, cancelledAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      monthlyFee: true,
      subscriptionPlan: true,
    },
  });

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const clinic of clinics) {
    try {
      // Skip if already invoiced this period
      const existing = await prisma.invoice.findFirst({
        where: { clinicId: clinic.id, period },
      });
      if (existing) { skipped++; continue; }

      // Check appointment count for overage
      const appointmentCount = await prisma.appointment.count({
        where: {
          clinicId: clinic.id,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      });
      const limit = PLAN_LIMITS[clinic.subscriptionPlan] ?? 300;
      const overageCount = Math.max(0, appointmentCount - limit);
      const overageAmount = overageCount * 50; // 50 DA per overage appointment

      const totalAmount = clinic.monthlyFee + overageAmount;

      const lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [
        {
          description: `Abonnement ${clinic.subscriptionPlan} — ${period}`,
          quantity: 1,
          unitPrice: clinic.monthlyFee,
          total: clinic.monthlyFee,
        },
      ];
      if (overageCount > 0) {
        lineItems.push({
          description: `Dépassement: ${overageCount} RDV supplémentaires (limit: ${limit})`,
          quantity: overageCount,
          unitPrice: 50,
          total: overageAmount,
        });
      }

      // Ensure unique invoice number
      let invoiceNumber = generateInvoiceNumber();
      for (let i = 0; i < 5; i++) {
        const exists = await prisma.invoice.findUnique({ where: { invoiceNumber } });
        if (!exists) break;
        invoiceNumber = generateInvoiceNumber();
      }

      await prisma.invoice.create({
        data: {
          clinicId: clinic.id,
          invoiceNumber,
          dueDate,
          amount: totalAmount,
          period,
          lineItems,
          status: "UNPAID",
        },
      });

      // Update next billing date on clinic
      await prisma.clinic.update({
        where: { id: clinic.id },
        data: { nextBillingDate: addDays(now, 30) },
      });

      generated++;
    } catch (err) {
      errors.push(`${clinic.name}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    period,
    total: clinics.length,
    generated,
    skipped,
    errors,
  });
}
