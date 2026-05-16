import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEvolutionMessage } from "@/lib/whatsapp/evolution";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret header
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Fetch messages ready to send
  const messages = await prisma.whatsAppMessage.findMany({
    where: {
      status: "QUEUED",
      scheduledFor: { lte: now },
      direction: "OUTBOUND",
    },
    include: {
      patient: true,
    },
    take: 50,
    orderBy: { scheduledFor: "asc" },
  });

  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    // Get the clinic's WhatsApp config (efficient: batch or cache per clinicId)
    const config = await prisma.whatsAppConfig.findUnique({
      where: { clinicId: msg.clinicId },
    });

    if (!config || !config.isConnected || !config.instanceName) {
      // No valid config — mark as failed
      await prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: { status: "FAILED", errorMessage: "WhatsApp not connected for this clinic" },
      });
      failed++;
      continue;
    }

    try {
      const result = await sendEvolutionMessage(
        config.instanceName,
        msg.patient.phone,
        msg.content
      );

      await prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: {
          status: result.success ? "SENT" : "FAILED",
          externalId: result.messageId ?? null,
          sentAt: new Date(),
          errorMessage: result.error ?? null,
        },
      });

      if (result.success) sent++;
      else failed++;
    } catch (error) {
      console.error("[Cron] Failed to send message:", msg.id, error);
      await prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: { status: "FAILED", errorMessage: String(error) },
      });
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: messages.length,
    sent,
    failed,
    timestamp: now.toISOString(),
  });
}
