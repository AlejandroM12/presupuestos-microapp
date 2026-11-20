/**
 * Eventos de conversión y reglas de privacidad. Este módulo es puro (sin DOM ni red) para poder
 * probarlo: define qué eventos existen, qué parámetros pueden enviarse a las plataformas
 * publicitarias y cómo se traduce cada uno a Meta, TikTok y Google Analytics.
 *
 * Privacidad: solo se envían parámetros de una lista blanca. Nunca contenido de presupuestos,
 * datos de clientes, emails ni información de pago.
 */
export const ANALYTICS_EVENTS = [
  "landing_view",
  "cta_start",
  "editor_start",
  "sign_up",
  "quote_first_valid",
  "pdf_download",
  "plans_view",
  "checkout_start",
  "purchase",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export type ParamValue = string | number | boolean;
export type EventParams = Record<string, ParamValue | undefined>;

/** Únicos parámetros que pueden salir hacia plataformas de terceros. */
const ALLOWED_PARAMS = new Set([
  "location", // dónde se hizo clic (hero, header, precios…)
  "page", // ruta (sin parámetros de consulta)
  "plan", // pack | pro_monthly | pro_yearly
  "value",
  "currency",
  "content_name",
  "first", // primera vez en este navegador
  "transaction_id", // identificador interno opaco, solo para deduplicar
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

const MAX_STRING = 80;

export function sanitizeParams(params: EventParams = {}): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_PARAMS.has(key) || value === undefined) continue;
    if (typeof value === "string") {
      // Un email o un texto largo en un parámetro permitido se descarta en lugar de enviarse.
      if (value.length > MAX_STRING || value.includes("@")) continue;
      out[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Atribución (UTM)
// ---------------------------------------------------------------------------

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;
export type Attribution = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const UTM_VALUE = /^[A-Za-z0-9_\-.+ ]{1,60}$/;

/** Extrae UTM válidos de una consulta; ignora valores raros (no se confía en la URL). */
export function parseAttribution(search: string): Attribution {
  const params = new URLSearchParams(search);
  const out: Attribution = {};
  for (const key of UTM_KEYS) {
    const raw = params.get(key)?.trim();
    if (raw && UTM_VALUE.test(raw)) out[key] = raw.toLowerCase();
  }
  return out;
}

export const hasAttribution = (a: Attribution) => Object.keys(a).length > 0;

// ---------------------------------------------------------------------------
// Traducción a cada plataforma
// ---------------------------------------------------------------------------

export interface PlatformCall {
  name: string;
  params?: Record<string, ParamValue>;
  /** Evento personalizado (no estándar) en Meta. */
  custom?: boolean;
}

const pick = (p: Record<string, ParamValue>, ...keys: string[]) =>
  Object.fromEntries(keys.filter((k) => k in p).map((k) => [k, p[k]]));

export function toMeta(event: AnalyticsEvent, p: Record<string, ParamValue>): PlatformCall {
  switch (event) {
    case "landing_view":
      return { name: "ViewContent", params: { content_name: "landing", ...pick(p, "page") } };
    case "cta_start":
      return { name: "StartFree", custom: true, params: pick(p, "location") };
    case "editor_start":
      return { name: "EditorStart", custom: true };
    case "sign_up":
      return { name: "CompleteRegistration" };
    case "quote_first_valid":
      return { name: "QuoteCreated", custom: true };
    case "pdf_download":
      // La primera descarga es la activación del producto: evento estándar optimizable.
      return p.first
        ? { name: "Lead", params: { content_name: "primer_pdf" } }
        : { name: "PdfDownload", custom: true };
    case "plans_view":
      return { name: "ViewContent", params: { content_name: "planes" } };
    case "checkout_start":
      return { name: "InitiateCheckout", params: pick(p, "value", "currency", "content_name") };
    case "purchase":
      return { name: "Purchase", params: pick(p, "value", "currency", "content_name") };
  }
}

export function toTikTok(event: AnalyticsEvent, p: Record<string, ParamValue>): PlatformCall {
  switch (event) {
    case "landing_view":
      return { name: "ViewContent", params: { content_name: "landing" } };
    case "cta_start":
      return { name: "ClickButton", params: pick(p, "location") };
    case "editor_start":
      return { name: "ViewContent", params: { content_name: "editor" } };
    case "sign_up":
      return { name: "CompleteRegistration" };
    case "quote_first_valid":
      return { name: "SubmitForm", params: { content_name: "primer_presupuesto" } };
    case "pdf_download":
      return { name: "Download", params: pick(p, "first") };
    case "plans_view":
      return { name: "ViewContent", params: { content_name: "planes" } };
    case "checkout_start":
      return { name: "InitiateCheckout", params: pick(p, "value", "currency", "content_name") };
    case "purchase":
      return { name: "CompletePayment", params: pick(p, "value", "currency", "content_name") };
  }
}

export function toGa4(event: AnalyticsEvent, p: Record<string, ParamValue>): PlatformCall {
  const base = pick(
    p,
    "location",
    "page",
    "plan",
    "first",
    "utm_source",
    "utm_medium",
    "utm_campaign",
  );
  switch (event) {
    case "sign_up":
      return { name: "sign_up", params: { method: "email" } };
    case "checkout_start":
      return { name: "begin_checkout", params: pick(p, "value", "currency", "plan") };
    case "purchase":
      return { name: "purchase", params: pick(p, "value", "currency", "transaction_id", "plan") };
    default:
      return { name: event, params: base };
  }
}
