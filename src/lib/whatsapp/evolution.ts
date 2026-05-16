/**
 * Evolution API client for WhatsApp integration
 * https://github.com/EvolutionAPI/evolution-api
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

export interface EvolutionInstance {
  instanceName: string;
  status: "open" | "connecting" | "close";
  phoneNumber?: string;
  qrCode?: string;
}

// ── INSTANCE MANAGEMENT ──────────────────────────────────────────────────────

export async function createEvolutionInstance(clinicId: string): Promise<{
  instanceName: string;
  qrCode: string | null;
}> {
  const instanceName = `clinic_${clinicId}`;
  const url = `${EVOLUTION_API_URL}/instance/create`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/webhooks/whatsapp`,
        byEvents: true,
        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Evolution API createInstance failed: ${err}`);
  }

  const data = await response.json();
  return {
    instanceName,
    qrCode: data.qrcode?.base64 ?? null,
  };
}

export async function getInstanceQRCode(instanceName: string): Promise<string | null> {
  const url = `${EVOLUTION_API_URL}/instance/connect/${instanceName}`;

  const response = await fetch(url, {
    headers: { apikey: EVOLUTION_API_KEY },
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.qrcode?.base64 ?? null;
}

export async function getInstanceStatus(instanceName: string): Promise<{
  connected: boolean;
  status: "open" | "connecting" | "close";
  phoneNumber?: string;
}> {
  const url = `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`;

  try {
    const response = await fetch(url, {
      headers: { apikey: EVOLUTION_API_KEY },
    });

    if (!response.ok) return { connected: false, status: "close" };

    const data = await response.json();
    const state = data.instance?.state ?? "close";

    return {
      connected: state === "open",
      status: state as "open" | "connecting" | "close",
      phoneNumber: data.instance?.profilePictureUrl ? data.instance.owner?.split(":")[0] : undefined,
    };
  } catch {
    return { connected: false, status: "close" };
  }
}

export async function deleteEvolutionInstance(instanceName: string): Promise<void> {
  await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
    method: "DELETE",
    headers: { apikey: EVOLUTION_API_KEY },
  });
}

export async function logoutEvolutionInstance(instanceName: string): Promise<void> {
  await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
    method: "DELETE",
    headers: { apikey: EVOLUTION_API_KEY },
  });
}

export async function restartEvolutionInstance(instanceName: string): Promise<void> {
  await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
    method: "PUT",
    headers: { apikey: EVOLUTION_API_KEY },
  });
}

// ── MESSAGE SENDING ──────────────────────────────────────────────────────────

export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  // Algerian: starts with 0 → replace with 213
  if (cleaned.startsWith("0")) {
    cleaned = "213" + cleaned.slice(1);
  }
  // If no country code, prepend 213
  if (!cleaned.startsWith("213") && !cleaned.startsWith("1") && cleaned.length <= 10) {
    cleaned = "213" + cleaned;
  }
  return cleaned;
}

export async function sendEvolutionMessage(
  instanceName: string,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;
  const formatted = formatPhoneForWhatsApp(phoneNumber);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formatted,
        textMessage: { text: message },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Evolution API sendText failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.key?.id };
  } catch (error) {
    console.error("[Evolution] sendMessage error:", error);
    return { success: false, error: String(error) };
  }
}

// ── FALLBACK (no Evolution API configured) ───────────────────────────────────

export function isEvolutionConfigured(): boolean {
  return !!(EVOLUTION_API_URL && EVOLUTION_API_KEY);
}
