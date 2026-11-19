import { FREE_TEMPLATE_ID } from "@/domain/templates";
import type { QuoteDraft } from "./schema";
import type { QuoteItemInput } from "./types";

export function newId(): string {
  return globalThis.crypto.randomUUID();
}

export function todayIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function emptyItem(): QuoteItemInput {
  return {
    id: newId(),
    description: "",
    quantity: "1",
    unit: "Unidad",
    unitPrice: "0",
    discountPercent: "0",
  };
}

export function defaultQuote(date: Date = new Date()): QuoteDraft {
  return {
    number: "0001",
    date: todayIso(date),
    validityDays: 15,
    title: "",
    description: "",
    currency: "ARS",
    notes: "",
    terms: "",
    deliveryTime: "",
    paymentTerms: "",
    issuer: {
      businessName: "",
      professionalName: "",
      logo: "",
      email: "",
      phone: "",
      whatsapp: "",
      address: "",
      taxId: "",
      website: "",
    },
    customer: { name: "", company: "", email: "", phone: "", address: "", taxId: "" },
    items: [emptyItem()],
    globalDiscount: { type: "percent", value: "0" },
    surcharge: { type: "percent", value: "0" },
    taxes: [],
    templateId: FREE_TEMPLATE_ID,
    accentColor: "",
    customFieldValues: {},
  };
}

/** Fecha de vencimiento (ISO) a partir de la fecha del presupuesto y su validez. */
export function validUntil(dateIso: string, validityDays: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + validityDays));
  return date.toISOString().slice(0, 10);
}
