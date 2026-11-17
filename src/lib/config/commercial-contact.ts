/**
 * Contacto comercial de AtajoLab (ventas / plantillas a medida).
 * El número de WhatsApp NO se inventa: solo se usa si está en el entorno.
 */

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** E.164 sin `+` (ej. 54911…). Vacío si no está configurado. */
export function commercialWhatsappE164(): string | null {
  const raw = process.env.ATAJOLAB_WHATSAPP_E164?.trim() ?? "";
  if (!raw) return null;
  const digits = digitsOnly(raw);
  return digits.length >= 10 ? digits : null;
}

export function commercialEmail(): string {
  const raw = process.env.ATAJOLAB_COMMERCIAL_EMAIL?.trim();
  return raw && raw.includes("@") ? raw : "atajolab.tools@gmail.com";
}

export function hasCommercialWhatsapp(): boolean {
  return commercialWhatsappE164() !== null;
}
