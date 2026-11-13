import { defaultQuote } from "@/domain/quote/defaults";
import type { QuoteDraft } from "@/domain/quote/schema";

const KEY = "atajolab-presupuestos:draft:v1";

export interface StoredDraft {
  savedAt: string;
  quote: QuoteDraft;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Mezcla un borrador guardado con los valores por defecto para tolerar versiones viejas. */
export function mergeWithDefaults(stored: unknown): QuoteDraft {
  const base = defaultQuote();
  if (!isObject(stored)) return base;
  const s = stored as Partial<QuoteDraft>;
  return {
    ...base,
    ...s,
    issuer: { ...base.issuer, ...(isObject(s.issuer) ? s.issuer : {}) },
    customer: { ...base.customer, ...(isObject(s.customer) ? s.customer : {}) },
    globalDiscount: {
      ...base.globalDiscount,
      ...(isObject(s.globalDiscount) ? s.globalDiscount : {}),
    },
    surcharge: { ...base.surcharge, ...(isObject(s.surcharge) ? s.surcharge : {}) },
    items: Array.isArray(s.items) && s.items.length > 0 ? s.items : base.items,
    taxes: Array.isArray(s.taxes) ? s.taxes : [],
  };
}

export function loadDraft(): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || !isObject(parsed.quote)) return null;
    return {
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
      quote: mergeWithDefaults(parsed.quote),
    };
  } catch {
    return null;
  }
}

export function saveDraft(quote: QuoteDraft): boolean {
  try {
    const payload: StoredDraft = { savedAt: new Date().toISOString(), quote };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}
