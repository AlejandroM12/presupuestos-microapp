// Enlaces de destino con UTM para cada canal y destino. Fuente única: se usa para generar
// marketing/textos/enlaces-utm.md y en las pruebas E2E que verifican que todos funcionan.
// El documento se genera con: node marketing/build/gen-utm-doc.mjs
export const BASE = "https://presupuestos.atajolab.dev";

/** Destinos reales (todos existen y responden 200). */
export const DESTINATIONS = [
  {
    key: "landing",
    path: "/",
    uso: "Landing principal (público general, emprendedores, independientes)",
  },
  { key: "talleres", path: "/para/talleres", uso: "Talleres mecánicos" },
  { key: "construccion", path: "/para/construccion", uso: "Construcción y albañilería" },
  { key: "tecnicos", path: "/para/tecnicos", uso: "Técnicos, instaladores y servicios" },
  {
    key: "editor",
    path: "/crear",
    uso: "Directo al editor (campañas de retargeting o de prueba inmediata)",
  },
];

/** Canales con sus parámetros UTM (en minúsculas, sin espacios). */
export const CHANNELS = [
  { key: "instagram-ads", source: "instagram", medium: "paid_social", nombre: "Instagram Ads" },
  { key: "facebook-ads", source: "facebook", medium: "paid_social", nombre: "Facebook Ads" },
  { key: "tiktok-ads", source: "tiktok", medium: "paid_social", nombre: "TikTok Ads" },
  {
    key: "instagram-organico",
    source: "instagram",
    medium: "organic_social",
    nombre: "Instagram orgánico (bio e historias)",
  },
  {
    key: "tiktok-organico",
    source: "tiktok",
    medium: "organic_social",
    nombre: "TikTok orgánico (bio)",
  },
  {
    key: "whatsapp",
    source: "whatsapp",
    medium: "message",
    nombre: "WhatsApp (estados y mensajes)",
  },
  {
    key: "atajolab",
    source: "atajolab",
    medium: "referral",
    nombre: "AtajoLab institucional (atajolab.dev)",
  },
];

export const CAMPAIGN = "lanzamiento_01";

/** Construye un enlace. `content` identifica la creatividad (p. ej. "minutos_v1"). */
export function link(destination, channel, content) {
  const d = DESTINATIONS.find((x) => x.key === destination);
  const c = CHANNELS.find((x) => x.key === channel);
  const q = new URLSearchParams({
    utm_source: c.source,
    utm_medium: c.medium,
    utm_campaign: CAMPAIGN,
  });
  if (content) q.set("utm_content", content);
  return `${BASE}${d.path}?${q.toString()}`;
}

export const LINKS = DESTINATIONS.flatMap((d) =>
  CHANNELS.map((c) => ({ destination: d.key, channel: c.key, url: link(d.key, c.key) })),
);
