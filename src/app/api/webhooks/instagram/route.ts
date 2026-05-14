import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractAppointmentInfo } from "@/lib/claude";
import { hashPhone } from "@/lib/utils";

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

    for (const entry of body.entry ?? []) {
      for (const messaging of entry.messaging ?? []) {
        if (!messaging.message?.text) continue;

        const text = messaging.message.text;
        const senderId = messaging.sender.id;

        // Find clinic with this Instagram integration
        const integration = await prisma.socialIntegration.findFirst({
          where: { platform: "INSTAGRAM", accountId: entry.id, isActive: true },
          include: { clinic: true },
        });

        if (!integration) continue;

        const extracted = await extractAppointmentInfo(text, integration.clinic.name);

        if (!extracted.hasAppointment) continue;

        // Create/find patient
        const phone = extracted.phone || senderId;
        const phoneHash = hashPhone(phone);

        let patient = await prisma.patient.findFirst({
          where: { clinicId: integration.clinicId, phone },
        });

        if (!patient) {
          patient = await prisma.patient.create({
            data: {
              clinicId: integration.clinicId,
              name: extracted.patientName || "مريض انستغرام",
              phone,
              phoneHash,
              source: "instagram",
            },
          });
        }

        // Find matching service
        const services = await prisma.service.findMany({
          where: { clinicId: integration.clinicId, isActive: true },
        });

        const matchedService =
          services.find((s) =>
            extracted.serviceKeywords?.some(
              (kw) =>
                s.name.toLowerCase().includes(kw.toLowerCase()) ||
                (s.nameAr && s.nameAr.includes(kw))
            )
          ) || services[0];

        if (!matchedService) continue;

        const appointmentDate =
          extracted.requestedDate && extracted.requestedTime
            ? new Date(`${extracted.requestedDate}T${extracted.requestedTime}`)
            : new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.appointment.create({
          data: {
            clinicId: integration.clinicId,
            patientId: patient.id,
            serviceId: matchedService.id,
            date: appointmentDate,
            duration: matchedService.duration,
            price: matchedService.price,
            source: "instagram",
            sourceMessageId: messaging.message.mid,
            status: "PENDING",
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Instagram Webhook]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
