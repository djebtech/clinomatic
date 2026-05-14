import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Evolution API webhook
    if (body.event === "messages.upsert") {
      const message = body.data;
      const fromNumber = message?.key?.remoteJid?.replace("@s.whatsapp.net", "");

      if (!fromNumber || message?.key?.fromMe) return NextResponse.json({ ok: true });

      // Find patient by phone
      const patient = await prisma.patient.findFirst({
        where: { phone: { contains: fromNumber.slice(-9) } },
        include: { clinic: { include: { whatsappConfig: true } } },
      });

      if (!patient) return NextResponse.json({ ok: true });

      // Log inbound message
      await prisma.whatsAppMessage.create({
        data: {
          clinicId: patient.clinicId,
          patientId: patient.id,
          direction: "INBOUND",
          messageType: "MANUAL",
          content: message?.message?.conversation || message?.message?.extendedTextMessage?.text || "",
          status: "READ",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WhatsApp Webhook]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
