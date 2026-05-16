import { format } from "date-fns";
import { fr } from "date-fns/locale";

export type TemplateKey =
  | "confirmTemplate"
  | "reminder24hTemplate"
  | "reminder2hTemplate"
  | "followUpTemplate"
  | "noShowRecoveryTemplate"
  | "recallTemplate";

export interface TemplateVariables {
  patient_name: string;
  clinic_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_day: string;
  doctor_name: string;
  service_name: string;
  clinic_address: string;
  clinic_phone: string;
  clinic_whatsapp?: string;
}

// ── DEFAULT TEMPLATES (French) ───────────────────────────────────────────────

export const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  confirmTemplate: `Bonjour {patient_name} 👋

Nous avons bien enregistré votre rendez-vous chez *{clinic_name}*.

📅 *{appointment_day} {appointment_date}*
🕐 *{appointment_time}*
👨‍⚕️ {doctor_name}
🏥 {service_name}

Pouvez-vous confirmer votre présence ?
Répondez *OUI* pour confirmer ou *NON* pour annuler.

📍 {clinic_address}
📞 {clinic_phone}

Merci ! 😊`,

  reminder24hTemplate: `🔔 *Rappel — Rendez-vous demain*

Bonjour {patient_name},

Votre rendez-vous est *demain* :
📅 {appointment_date} à {appointment_time}
👨‍⚕️ {doctor_name}
📍 {clinic_name}

À demain ! 😊`,

  reminder2hTemplate: `⏰ *Rendez-vous dans 2 heures*

Bonjour {patient_name},

Votre rendez-vous est dans *2 heures* :
🕐 {appointment_time}
📍 {clinic_name}
📍 {clinic_address}

À tout à l'heure ! 👋`,

  followUpTemplate: `Merci pour votre visite ! 🙏

Bonjour {patient_name},

Nous espérons que votre consultation avec *{doctor_name}* s'est bien passée.

N'hésitez pas à nous recontacter pour tout question ou pour prendre un nouveau rendez-vous.

📞 {clinic_phone}
— L'équipe {clinic_name}`,

  noShowRecoveryTemplate: `Bonjour {patient_name} 😕

Nous avons remarqué que vous n'avez pas pu vous présenter à votre rendez-vous d'aujourd'hui.

Nous comprenons que des imprévus peuvent arriver !
Souhaitez-vous reprendre un rendez-vous ?

📞 {clinic_phone}
— {clinic_name}`,

  recallTemplate: `Bonjour {patient_name} 👋

Cela fait un moment que nous ne vous avons pas vu chez *{clinic_name}*.

Votre santé nous importe ! N'hésitez pas à prendre rendez-vous.

📞 {clinic_phone}
📍 {clinic_address}

À bientôt ! 😊`,
};

// ── TEMPLATE RENDERER ────────────────────────────────────────────────────────

export function renderTemplate(template: string, vars: Partial<TemplateVariables>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined && value !== null) {
      result = result.replaceAll(`{${key}}`, value);
    }
  }
  return result;
}

export function buildTemplateVariables(params: {
  patientName: string;
  clinicName: string;
  appointmentDate: Date;
  doctorName?: string | null;
  serviceName?: string | null;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
}): TemplateVariables {
  return {
    patient_name: params.patientName,
    clinic_name: params.clinicName,
    appointment_date: format(params.appointmentDate, "dd/MM/yyyy"),
    appointment_time: format(params.appointmentDate, "HH:mm"),
    appointment_day: format(params.appointmentDate, "EEEE", { locale: fr }),
    doctor_name: params.doctorName ?? "le praticien",
    service_name: params.serviceName ?? "votre consultation",
    clinic_address: params.clinicAddress ?? "",
    clinic_phone: params.clinicPhone ?? "",
  };
}

// ── PREVIEW EXAMPLE DATA ─────────────────────────────────────────────────────

export const PREVIEW_VARS: TemplateVariables = {
  patient_name: "Mohammed Benali",
  clinic_name: "Clinique Al Shifa",
  appointment_date: "15/06/2026",
  appointment_time: "10:30",
  appointment_day: "lundi",
  doctor_name: "Dr. Sarah Mansour",
  service_name: "Consultation générale",
  clinic_address: "12 Rue Didouche Mourad, Alger",
  clinic_phone: "+213 555 123 456",
};
