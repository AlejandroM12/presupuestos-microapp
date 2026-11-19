/**
 * Fuente única de verdad de planes, precios y límites.
 * Los importes están en pesos argentinos (ARS), enteros, sin centavos.
 * Para cambiar un precio basta editar este archivo (o la variable de entorno indicada).
 */

function priceFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export const PRICING = {
  currency: "ARS",
  premiumPack: priceFromEnv("PRICE_PREMIUM_PACK_ARS", 9900),
  proMonthly: priceFromEnv("PRICE_PRO_MONTHLY_ARS", 5900),
  proYearly: priceFromEnv("PRICE_PRO_YEARLY_ARS", 59000),
} as const;

export const LIMITS = {
  freeMonthlyDownloads: 3,
  /** Descargas finales mensuales incluidas en el Pack Premium (pago único). */
  premiumPackMonthlyDownloads: 20,
  /**
   * Política de uso razonable de Pro. Superar el umbral de revisión NO bloquea: solo se registra
   * para revisar el caso. El tope técnico y el límite por hora existen contra abuso y
   * automatización; están publicados en /legal/uso-razonable.
   */
  proReviewThresholdMonthly: 500,
  proHardCeilingMonthly: 3000,
  proBurstPerHour: 60,
} as const;

export type PlanId = "free" | "premium_pack" | "pro";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  features: string[];
  excludes?: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Gratis",
    tagline: "Para empezar sin compromiso",
    features: [
      "Editor y vista previa sin registrarte",
      `${LIMITS.freeMonthlyDownloads} descargas por mes con tu cuenta`,
      "Diseño Minimalista",
      "Logo y datos de tu negocio",
      "Cálculo automático de totales",
      "PDF A4 y envío por WhatsApp",
      "Borrador guardado en tu navegador",
    ],
    excludes: ["El PDF incluye una marca discreta de AtajoLab"],
  },
  premium_pack: {
    id: "premium_pack",
    name: "Pack Premium",
    tagline: "Pago único, tuyo para siempre",
    features: [
      `${LIMITS.premiumPackMonthlyDownloads} descargas por mes`,
      "5 diseños premium: Ejecutivo, Moderno, Creativo, Técnico y Comercial",
      "Incluye el diseño Minimalista",
      "Acceso permanente a los diseños adquiridos",
      "PDF sin marca AtajoLab",
      "Colores personalizables",
    ],
    excludes: ["No incluye historial en la nube, clientes ni dashboard (eso es Pro)"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Para quienes presupuestan todas las semanas",
    features: [
      "Todos los diseños comerciales incluidos",
      "Historial de presupuestos en la nube",
      "Gestión de clientes",
      "Dashboard con métricas",
      "Duplicar, editar y gestionar estados",
      "PDF sin marca AtajoLab",
      `Descargas con uso razonable: hasta ${LIMITS.proBurstPerHour}/hora y ${LIMITS.proHardCeilingMonthly}/mes`,
      `Revisión preventiva desde ${LIMITS.proReviewThresholdMonthly} descargas/mes (sin bloqueo)`,
    ],
  },
};
