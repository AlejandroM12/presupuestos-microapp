import { formatDateAr, formatMoney } from "@/lib/format";
import { validUntil } from "./defaults";
import type { Quote } from "./schema";
import type { Currency } from "./types";

interface MessageInput {
  quote: Pick<
    Quote,
    "number" | "title" | "description" | "date" | "validityDays" | "customer" | "issuer"
  >;
  total: string;
  currency: Currency;
}

export function buildWhatsappMessage({ quote, total, currency }: MessageInput): string {
  const sender = quote.issuer.professionalName || quote.issuer.businessName;
  const lines = [
    `Hola ${quote.customer.name}, te comparto el presupuesto N.º ${quote.number}.`,
    "",
    quote.title,
  ];
  if (quote.description) lines.push(quote.description.slice(0, 300));
  lines.push(
    "",
    `Total: ${formatMoney(total, currency)} (${currency})`,
    `Válido hasta el ${formatDateAr(validUntil(quote.date, quote.validityDays))}`,
    "",
    `Saludos, ${sender}`,
  );
  return lines.join("\n");
}

/** Deja solo dígitos; si el número es argentino sin prefijo de país, antepone 54. */
export function normalizePhoneForWhatsapp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("54")) return digits;
  const local = digits.replace(/^0+/, "").replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  return local.length >= 10 ? `54${local}` : null;
}

/**
 * Enlace click-to-chat de WhatsApp. El texto va precargado; el archivo PDF NO se adjunta
 * automáticamente: la persona debe adjuntarlo manualmente.
 */
export function buildWhatsappUrl(message: string, customerPhone?: string): string {
  const to = customerPhone ? normalizePhoneForWhatsapp(customerPhone) : null;
  const base = to ? `https://wa.me/${to}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}
