/**
 * Email sending utility.
 * Wire to Resend / Nodemailer / SendGrid by setting RESEND_API_KEY in env.
 * Falls back to console.log in development.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[EMAIL STUB] To: ${payload.to} | Subject: ${payload.subject}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Clinomatic <notifications@clinomatic.dz>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[sendEmail] Resend error:", err);
    }
  } catch (err) {
    console.error("[sendEmail]", err);
  }
}

// ── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clinomatic</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0f766e, #0d9488); padding: 28px 32px; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { margin: 4px 0 0; opacity: 0.85; font-size: 13px; }
    .body { padding: 32px; color: #374151; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; }
    .info-value { font-weight: 600; color: #111827; }
    .btn { display: inline-block; background: #0f766e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
    .footer a { color: #6b7280; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Clinomatic</h1>
      <p>Gestion de clinique moderne</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>Clinomatic · Bab Ezzouar, Alger · <a href="mailto:support@clinomatic.dz">support@clinomatic.dz</a></p>
      <p style="margin-top:8px"><a href="#">Paramètres de notification</a> · <a href="#">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function renderInvitationEmail(params: {
  inviteeName: string;
  inviterName: string;
  clinicName: string;
  role: string;
  acceptUrl: string;
  expiresIn: string;
}) {
  const roleLabels: Record<string, string> = {
    CLINIC_OWNER: "Gérant",
    CLINIC_STAFF: "Personnel",
    CONFIRMATION_AGENT: "Agent de confirmation",
    DOCTOR: "Médecin",
  };
  const roleLabel = roleLabels[params.role] ?? params.role;

  return {
    subject: `Invitation à rejoindre ${params.clinicName} sur Clinomatic`,
    html: baseLayout(`
      <p>Bonjour <strong>${params.inviteeName}</strong>,</p>
      <p><strong>${params.inviterName}</strong> vous invite à rejoindre l'équipe de <strong>${params.clinicName}</strong> sur Clinomatic.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Clinique</span><span class="info-value">${params.clinicName}</span></div>
        <div class="info-row"><span class="info-label">Rôle</span><span class="info-value">${roleLabel}</span></div>
        <div class="info-row"><span class="info-label">Expire dans</span><span class="info-value">${params.expiresIn}</span></div>
      </div>
      <p>Pour accepter l'invitation, cliquez sur le bouton ci-dessous et créez votre mot de passe&nbsp;:</p>
      <a href="${params.acceptUrl}" class="btn">Accepter l'invitation →</a>
      <p style="color:#6b7280;font-size:13px;margin-top:16px">
        Si vous n'attendiez pas cette invitation, ignorez cet email.
      </p>
    `),
  };
}

export function renderPaymentReceivedEmail(params: {
  clinicName: string;
  amount: string;
  invoiceNumber: string;
  paymentDate: string;
  method: string;
}) {
  return {
    subject: `✅ Paiement reçu — ${params.amount}`,
    html: baseLayout(`
      <p>Bonjour <strong>${params.clinicName}</strong>,</p>
      <p>Nous avons bien reçu votre paiement. Merci&nbsp;!</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Montant</span><span class="info-value">${params.amount}</span></div>
        <div class="info-row"><span class="info-label">Facture</span><span class="info-value">${params.invoiceNumber}</span></div>
        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${params.paymentDate}</span></div>
        <div class="info-row"><span class="info-label">Mode</span><span class="info-value">${params.method}</span></div>
      </div>
      <p style="color:#6b7280;font-size:13px">Conservez cet email comme reçu de paiement.</p>
    `),
  };
}
