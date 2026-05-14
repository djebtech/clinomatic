import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ExtractedAppointmentInfo {
  hasAppointment: boolean;
  patientName?: string;
  phone?: string;
  requestedDate?: string;
  requestedTime?: string;
  serviceKeywords?: string[];
  rawText: string;
}

export async function extractAppointmentInfo(text: string, clinicName: string): Promise<ExtractedAppointmentInfo> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are an assistant for an Algerian medical clinic called "${clinicName}".
Analyze this social media message and extract appointment booking information.

Message: "${text}"

Respond with a JSON object:
{
  "hasAppointment": boolean,
  "patientName": string or null,
  "phone": string or null,
  "requestedDate": "YYYY-MM-DD" or null,
  "requestedTime": "HH:MM" or null,
  "serviceKeywords": string[] (medical services mentioned)
}

Only respond with the JSON, no other text.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const extracted = JSON.parse(content.text);
    return { ...extracted, rawText: text };
  } catch (error) {
    console.error("[Claude] Extraction error:", error);
    return { hasAppointment: false, rawText: text };
  }
}

export async function generateAutoReply(
  patientName: string,
  clinicName: string,
  language: "ar" | "fr" = "ar"
): Promise<string> {
  const prompt =
    language === "ar"
      ? `اكتب رسالة رد قصيرة ومهنية باللغة العربية تؤكد استلام طلب الحجز من ${patientName} وتخبره أن فريق ${clinicName} سيتواصل معه قريباً لتأكيد الموعد.`
      : `Écris un court message professionnel en français confirmant la réception de la demande de rendez-vous de ${patientName} et informant que l'équipe de ${clinicName} le contactera bientôt.`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") return "";
  return content.text;
}
