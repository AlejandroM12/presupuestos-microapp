"use client";

import {
  hasAttribution,
  parseAttribution,
  sanitizeParams,
  toGa4,
  toMeta,
  toTikTok,
  type AnalyticsEvent,
  type Attribution,
  type EventParams,
} from "./events";

/**
 * Medición en el navegador. Reglas:
 * - Sin identificadores configurados no se carga ningún script de terceros.
 * - Con identificadores, los píxeles se cargan SOLO tras el consentimiento explícito
 *   (y nunca si el navegador envía Global Privacy Control).
 * - Los parámetros pasan por una lista blanca (`sanitizeParams`): sin datos personales,
 *   contenidos de presupuestos ni información de pago.
 */
export interface AnalyticsConfig {
  meta?: string;
  tiktok?: string;
  ga4?: string;
}

type Consent = "granted" | "denied";

const CONSENT_KEY = "ph_consent";
const ATTR_KEY = "ph_attr";
const ATTR_TTL_MS = 30 * 24 * 3600 * 1000;

let config: AnalyticsConfig = {};
let consent: Consent | null = null;
let loaded = false;
const listeners = new Set<() => void>();

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    ttq?: { page: () => void; track: (e: string, p?: object) => void };
    TiktokAnalyticsObject?: string;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    __phEvents?: { event: string; params: Record<string, unknown>; sent: boolean }[];
  }
}

const safeStorage = {
  get(kind: "local" | "session", key: string): string | null {
    try {
      return (kind === "local" ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(kind: "local" | "session", key: string, value: string) {
    try {
      (kind === "local" ? localStorage : sessionStorage).setItem(key, value);
    } catch {
      /* almacenamiento bloqueado: se sigue sin persistir */
    }
  },
  remove(kind: "local" | "session", key: string) {
    try {
      (kind === "local" ? localStorage : sessionStorage).removeItem(key);
    } catch {
      /* noop */
    }
  },
};

export const hasTrackers = () => Boolean(config.meta || config.tiktok || config.ga4);
export const getConsent = () => consent;
export function onChange(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
const notify = () => listeners.forEach((fn) => fn());

// ---------------------------------------------------------------------------
// Atribución
// ---------------------------------------------------------------------------

/** Guarda los UTM de la URL: en la pestaña siempre; 30 días solo con consentimiento. */
export function captureAttribution(search = window.location.search) {
  const fresh = parseAttribution(search);
  if (!hasAttribution(fresh)) return;
  safeStorage.set("session", ATTR_KEY, JSON.stringify(fresh));
  if (consent === "granted") {
    safeStorage.set("local", ATTR_KEY, JSON.stringify({ ...fresh, ts: Date.now() }));
  }
}

export function currentAttribution(): Attribution {
  const read = (kind: "local" | "session"): Attribution | null => {
    try {
      const raw = safeStorage.get(kind, ATTR_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.ts === "number" && Date.now() - parsed.ts > ATTR_TTL_MS) return null;
      const utm = Object.entries(parsed).filter(([k]) => k.startsWith("utm_"));
      return parseAttribution(new URLSearchParams(utm.map(([k, v]) => [k, String(v)])).toString());
    } catch {
      return null;
    }
  };
  return read("session") ?? (consent === "granted" ? read("local") : null) ?? {};
}

// ---------------------------------------------------------------------------
// Carga de píxeles (solo con consentimiento)
// ---------------------------------------------------------------------------

function addScript(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function loadTrackers() {
  if (loaded || consent !== "granted") return;
  loaded = true;
  if (config.meta) {
    const fbq = function (...args: unknown[]) {
      (fbq as unknown as { queue: unknown[] }).queue.push(args);
    } as unknown as ((...a: unknown[]) => void) & { queue: unknown[]; loaded: boolean };
    fbq.queue = [];
    fbq.loaded = true;
    window.fbq = fbq;
    window._fbq = fbq;
    addScript("https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", config.meta);
    window.fbq("track", "PageView");
  }
  if (config.tiktok) {
    // Cargador oficial de TikTok Pixel (cola de métodos hasta que llega el script).
    const w = window as unknown as Record<string, unknown>;
    w.TiktokAnalyticsObject = "ttq";
    const ttq = ((w.ttq as Record<string, unknown>[]) ?? []) as unknown as Record<string, unknown> &
      unknown[];
    w.ttq = ttq;
    const methods = [
      "page",
      "track",
      "identify",
      "instances",
      "debug",
      "on",
      "off",
      "once",
      "ready",
      "alias",
      "group",
      "enableCookie",
      "disableCookie",
    ];
    for (const m of methods) {
      ttq[m] = (...args: unknown[]) => void ttq.push([m, ...args]);
    }
    ttq.load = (id: string) => {
      addScript(
        `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`,
      );
    };
    (ttq.load as (id: string) => void)(config.tiktok);
    (ttq.page as () => void)();
  }
  if (config.ga4) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function (...args: unknown[]) {
      window.dataLayer!.push(args);
    };
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4)}`);
    window.gtag("js", new Date());
    window.gtag("config", config.ga4, { anonymize_ip: true, send_page_view: false });
  }
}

export function setConsent(value: Consent) {
  consent = value;
  safeStorage.set("local", CONSENT_KEY, value);
  if (value === "granted") {
    loadTrackers();
    captureAttribution();
  } else {
    safeStorage.remove("local", ATTR_KEY);
  }
  notify();
}

/** Reabre la elección de cookies (enlace del pie). */
export function resetConsent() {
  consent = null;
  safeStorage.remove("local", CONSENT_KEY);
  notify();
}

export function init(cfg: AnalyticsConfig) {
  config = cfg;
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  const stored = safeStorage.get("local", CONSENT_KEY);
  consent = gpc ? "denied" : stored === "granted" || stored === "denied" ? stored : null;
  captureAttribution();
  if (consent === "granted") loadTrackers();
  notify();
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

function dispatch(event: AnalyticsEvent, p: Record<string, string | number | boolean>) {
  if (config.meta && window.fbq) {
    const m = toMeta(event, p);
    window.fbq(m.custom ? "trackCustom" : "track", m.name, m.params ?? {});
  }
  if (config.tiktok && window.ttq) {
    const t = toTikTok(event, p);
    window.ttq.track(t.name, t.params ?? {});
  }
  if (config.ga4 && window.gtag) {
    const g = toGa4(event, p);
    window.gtag("event", g.name, g.params ?? {});
  }
}

export function track(event: AnalyticsEvent, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  const merged = sanitizeParams({
    ...currentAttribution(),
    page: window.location.pathname,
    ...params,
  });
  const sent = consent === "granted" && hasTrackers();
  if (safeStorage.get("local", "ph_debug") === "1") {
    (window.__phEvents ??= []).push({ event, params: merged, sent });
  }
  if (sent) dispatch(event, merged);
}

/** Evento que solo corresponde la primera vez en este navegador (p. ej. primer PDF). */
export function isFirst(key: string): boolean {
  const flag = `ph_first_${key}`;
  if (safeStorage.get("local", flag)) return false;
  safeStorage.set("local", flag, "1");
  return true;
}

/** Evento único por clave (deduplica compras repetidas al recargar la página de resultado). */
export function trackOnce(key: string, event: AnalyticsEvent, params: EventParams = {}) {
  const flag = `ph_once_${key}`;
  if (safeStorage.get("local", flag)) return;
  safeStorage.set("local", flag, "1");
  track(event, params);
}

export function pageView() {
  if (consent !== "granted" || !loaded) return;
  window.fbq?.("track", "PageView");
  window.ttq?.page();
  if (config.ga4) window.gtag?.("event", "page_view", { page_path: window.location.pathname });
}
