interface SendMessageParams {
  phone: string;
  message: string;
  clinicId: string;
  apiUrl?: string;
  apiToken?: string;
}

export async function sendWhatsAppMessage({
  phone,
  message,
  clinicId,
  apiUrl,
  apiToken,
}: SendMessageParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = apiUrl || process.env.EVOLUTION_API_URL;
  const token = apiToken || process.env.EVOLUTION_API_KEY;

  if (!url || !token) {
    console.warn(`[WhatsApp] No API config for clinic ${clinicId}`);
    return { success: false, error: "WhatsApp API not configured" };
  }

  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("213") ? cleanPhone : `213${cleanPhone.startsWith("0") ? cleanPhone.slice(1) : cleanPhone}`;

    const response = await fetch(`${url}/message/sendText/${clinicId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: token,
      },
      body: JSON.stringify({
        number: formatted,
        textMessage: { text: message },
      }),
    });

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.key?.id };
  } catch (error) {
    console.error("[WhatsApp] Send error:", error);
    return { success: false, error: String(error) };
  }
}

export function buildConfirmationMessage(patientName: string, date: Date, clinicName: string): string {
  const day = date.toLocaleDateString("ar-DZ", { weekday: "long", day: "numeric", month: "long" });
  const time = date.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `مرحبا ${patientName} 👋\n\nنؤكد موعدك في ${clinicName}\n📅 ${day}\n⏰ الساعة ${time}\n\nرجاء الرد بـ *نعم* للتأكيد أو *لا* للإلغاء.`;
}

export function buildReminder24hMessage(patientName: string, date: Date): string {
  const time = date.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `مرحبا ${patientName} 🔔\n\nتذكير: موعدك *غداً* الساعة ${time}.\n\nنتطلع لرؤيتك! 🏥`;
}

export function buildReminder2hMessage(patientName: string, date: Date): string {
  const time = date.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `مرحبا ${patientName} ⏰\n\nتذكير: موعدك *اليوم* الساعة ${time} (خلال ساعتين).\n\nنراك قريباً! 👋`;
}

export function buildFollowUpMessage(patientName: string): string {
  return `مرحبا ${patientName} 😊\n\nنأمل أن تكون بصحة جيدة بعد زيارتك.\nهل أنت راضٍ عن خدمتنا؟ لا تتردد في حجز موعد جديد إذا احتجت ذلك! 🌟`;
}
