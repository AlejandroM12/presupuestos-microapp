import { commercialEmail, commercialWhatsappE164 } from "@/lib/config/commercial-contact";

export const CUSTOM_TEMPLATE_WHATSAPP_INTRO =
  "Hola, me interesa solicitar una plantilla personalizada para AtajoLab Presupuestos. Mi profesión o actividad es:";

export function customTemplateInquiryMessage(profession?: string): string {
  const activity = profession?.trim() ? ` ${profession.trim()}` : "";
  return `${CUSTOM_TEMPLATE_WHATSAPP_INTRO}${activity}`;
}

/** Enlace wa.me al WhatsApp comercial, o null si el número no está configurado. */
export function commercialWhatsappUrl(message: string): string | null {
  const to = commercialWhatsappE164();
  if (!to) return null;
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

export function commercialMailtoUrl(subject: string, body: string): string {
  const email = commercialEmail();
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function customTemplateRequestLinks(profession?: string): {
  whatsapp: string | null;
  mailto: string;
  message: string;
} {
  const message = customTemplateInquiryMessage(profession);
  return {
    whatsapp: commercialWhatsappUrl(message),
    mailto: commercialMailtoUrl(
      profession
        ? `Plantilla personalizada · ${profession}`
        : "Solicitud de plantilla personalizada",
      message,
    ),
    message,
  };
}
