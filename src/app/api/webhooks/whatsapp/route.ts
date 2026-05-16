import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEvolutionMessage } from "@/lib/whatsapp/evolution";

// ── GET: Evolution API / Meta webhook verification ───────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

// ── POST: Receive Evolution API events ───────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event as string | undefined;
    const data = body.data;

    switch (event) {
      case "messages.update":
        await handleMessageStatusUpdate(data);
        break;

      case "messages.upsert":
        await handleIncomingMessage(data, body.instance);
        break;

      case "connection.update":
        await handleConnectionUpdate(data, body.instance);
        break;

      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WhatsApp Webhook]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ── STATUS UPDATE ─────────────────────────────────────────────────────────────

async function handleMessageStatusUpdate(data: any) {
  const messageId = data?.key?.id as string | undefined;
  if (!messageId) return;

  const evolutionStatus = (data?.update?.status as string | undefined)?.toLowerCase();
  if (!evolutionStatus) return;

  const statusMap: Record<string, string> = {
    sent: "SENT",
    delivered: "DELIVERED",
    read: "READ",
    played: "READ",
  };
  const newStatus = statusMap[evolutionStatus];
  if (!newStatus) return;

  const msg = await prisma.whatsAppMessage.findFirst({
    where: { externalId: messageId },
  });
  if (!msg) return;

  await prisma.whatsAppMessage.update({
    where: { id: msg.id },
    data: {
      status: newStatus as any,
      deliveredAt: newStatus === "DELIVERED" ? new Date() : msg.deliveredAt,
      readAt: newStatus === "READ" ? new Date() : msg.readAt,
      repliedAt: newStatus === "REPLIED" ? new Date() : msg.repliedAt,
    },
  });
}

// ── INCOMING MESSAGE ──────────────────────────────────────────────────────────

async function handleIncomingMessage(data: any, instanceName?: string) {
  // Skip messages from self
  if (data?.key?.fromMe) return;

  const fromJid = data?.key?.remoteJid as string | undefined;
  if (!fromJid) return;

  // Extract phone number from JID (removes @s.whatsapp.net or @g.us)
  const from = fromJid.split("@")[0];
  if (!from) return;

  // Message content
  const messageText: string =
    data?.message?.conversation ??
    data?.message?.extendedTextMessage?.text ??
    "";

  if (!messageText.trim()) return;

  // Find patient by last 9 digits of phone
  const last9 = from.slice(-9);
  const patient = await prisma.patient.findFirst({
    where: { phone: { contains: last9 } },
    include: {
      clinic: {
        include: { whatsappConfig: true },
      },
    },
  });

  if (!patient) {
    console.log("[WhatsApp Webhook] Patient not found for", from);
    return;
  }

  const config = patient.clinic.whatsappConfig;
  const resolvedInstanceName = instanceName ?? config?.instanceName ?? null;

  // Detect confirmation / cancellation intent
  const isYes = /^(oui|yes|ok|confirme?|d'accord|agree|نعم|أكد|👍)/i.test(messageText.trim());
  const isNo = /^(non|no|annule?|cancel|لا|إلغ)/i.test(messageText.trim());

  if (isYes) {
    // Find nearest pending appointment
    const appointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        status: { in: ["PENDING", "CONFIRMING"] },
        date: { gte: new Date() },
      },
      orderBy: { date: "asc" },
    });

    if (appointment) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          confirmMethod: "whatsapp_auto",
          confirmNotes: `Patient replied: "${messageText}"`,
        },
      });

      // Log timeline
      await prisma.appointmentTimeline.create({
        data: {
          appointmentId: appointment.id,
          action: "CONFIRMED",
          details: { method: "whatsapp_auto_reply", reply: messageText },
        },
      });

      // Send confirmation acknowledgment
      if (resolvedInstanceName) {
        await sendEvolutionMessage(
          resolvedInstanceName,
          patient.phone,
          `✅ Parfait ! Votre rendez-vous est bien confirmé. Nous vous attendons !\n— ${patient.clinic.name}`
        );
      }
    }
  } else if (isNo) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        status: { in: ["PENDING", "CONFIRMING", "CONFIRMED"] },
        date: { gte: new Date() },
      },
      orderBy: { date: "asc" },
    });

    if (appointment) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "CANCELLED",
        },
      });

      await prisma.appointmentTimeline.create({
        data: {
          appointmentId: appointment.id,
          action: "CANCELLED",
          details: { method: "whatsapp_auto_reply", reply: messageText },
        },
      });

      if (resolvedInstanceName) {
        await sendEvolutionMessage(
          resolvedInstanceName,
          patient.phone,
          `Votre rendez-vous a été annulé. Merci de nous avoir prévenus. N'hésitez pas à en prendre un nouveau ! 📞 ${patient.clinic.phone}\n— ${patient.clinic.name}`
        );
      }
    }
  }

  // Always log the incoming message
  await prisma.whatsAppMessage.create({
    data: {
      clinicId: patient.clinicId,
      patientId: patient.id,
      direction: "INBOUND",
      messageType: "MANUAL",
      content: messageText,
      status: "READ",
    },
  });
}

// ── CONNECTION UPDATE ─────────────────────────────────────────────────────────

async function handleConnectionUpdate(data: any, instanceName?: string) {
  if (!instanceName) return;

  const state = data?.state as string | undefined;
  const isOpen = state === "open";

  // Extract clinicId from instance name (format: clinic_xxxxx)
  const match = instanceName.match(/^clinic_(.+)$/);
  if (!match) return;

  const clinicId = match[1];
  const phoneNumber = data?.phone ?? data?.me?.id?.split(":")[0] ?? "";

  await prisma.whatsAppConfig.updateMany({
    where: { clinicId },
    data: {
      isConnected: isOpen,
      phoneNumber: isOpen && phoneNumber ? phoneNumber : undefined,
    },
  });
}
