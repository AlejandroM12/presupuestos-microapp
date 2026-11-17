import { LIMITS } from "@/lib/config/plans";
import { FREE_TEMPLATE_ID, TEMPLATES } from "./templates";

/** Estado de acceso de una persona, siempre calculado en el servidor. */
export interface AccessContext {
  authenticated: boolean;
  /** Compró el Pack Premium (licencia permanente). */
  ownsPremiumPack: boolean;
  /** Suscripción Pro vigente (incluye el período ya pagado tras cancelar). */
  proActive: boolean;
  /** Descargas finales realizadas en el mes calendario en curso. */
  downloadsThisMonth: number;
}

export const ANONYMOUS: AccessContext = {
  authenticated: false,
  ownsPremiumPack: false,
  proActive: false,
  downloadsThisMonth: 0,
};

export interface Entitlements {
  authenticated: boolean;
  proActive: boolean;
  ownsPremiumPack: boolean;
  /** Plantillas con las que se puede generar el PDF final. */
  templates: string[];
  /** Descargas finales restantes este mes (Pro: hasta el tope técnico de uso razonable). */
  downloadsRemaining: number;
  /**
   * Límite visible para la persona.
   * Free/Pack: cupo mensual anunciado. Pro: null (se comunica la política de uso razonable).
   */
  downloadLimit: number | null;
  /** Tope técnico mensual que aplica el servidor (en Pro, la política de uso razonable). */
  downloadCap: number;
  allowCustomColor: boolean;
  /** Historial en la nube, clientes y dashboard. */
  cloudFeatures: boolean;
}

/** Cupo mensual anunciado según el plan (Pro no anuncia cupo; usa tope técnico). */
export function monthlyDownloadLimit(ctx: AccessContext): number {
  if (ctx.proActive) return LIMITS.proHardCeilingMonthly;
  if (ctx.ownsPremiumPack) return LIMITS.premiumPackMonthlyDownloads;
  return LIMITS.freeMonthlyDownloads;
}

export function computeEntitlements(ctx: AccessContext): Entitlements {
  const premiumTemplates = TEMPLATES.filter((t) => t.tier === "premium").map((t) => t.id);
  const premiumUnlocked = ctx.proActive || ctx.ownsPremiumPack;
  const pro = ctx.proActive;
  const cap = monthlyDownloadLimit(ctx);

  return {
    authenticated: ctx.authenticated,
    proActive: ctx.proActive,
    ownsPremiumPack: ctx.ownsPremiumPack,
    templates: premiumUnlocked ? [FREE_TEMPLATE_ID, ...premiumTemplates] : [FREE_TEMPLATE_ID],
    downloadsRemaining: Math.max(0, cap - ctx.downloadsThisMonth),
    downloadLimit: pro ? null : cap,
    downloadCap: cap,
    allowCustomColor: premiumUnlocked,
    cloudFeatures: ctx.proActive,
  };
}

export type DenialReason =
  "unknown_template" | "login_required" | "template_locked" | "download_limit_reached";

export type RenderDecision =
  | { allowed: true; showBrand: boolean; allowCustomColor: boolean; preview: boolean }
  | { allowed: false; reason: DenialReason };

export interface DecideOptions {
  templateId: string;
  /** true = vista previa con marca de agua (no cuenta como descarga). */
  preview: boolean;
}

/**
 * Decide si se puede emitir un PDF y con qué restricciones.
 * La marca AtajoLab solo aparece en el diseño gratuito.
 */
export function decidePdfRender(ctx: AccessContext, opts: DecideOptions): RenderDecision {
  const template = TEMPLATES.find((t) => t.id === opts.templateId);
  if (!template) return { allowed: false, reason: "unknown_template" };

  const ent = computeEntitlements(ctx);
  const showBrand = template.tier === "free";

  if (opts.preview) {
    // Cualquier visitante puede ver cómo queda un diseño, siempre con marca de agua.
    return { allowed: true, showBrand, allowCustomColor: ent.allowCustomColor, preview: true };
  }

  if (!ctx.authenticated) {
    return { allowed: false, reason: "login_required" };
  }
  if (!ent.templates.includes(template.id)) return { allowed: false, reason: "template_locked" };
  if (ctx.authenticated && ent.downloadsRemaining <= 0) {
    return { allowed: false, reason: "download_limit_reached" };
  }
  return { allowed: true, showBrand, allowCustomColor: ent.allowCustomColor, preview: false };
}

export const FAIR_USE_MESSAGE =
  "Alcanzaste el tope técnico de uso razonable de este mes. Escribinos si necesitás más volumen.";

export const BURST_MESSAGE =
  "Generaste muchos PDF en la última hora. Esperá unos minutos e intentá de nuevo.";

export const DENIAL_MESSAGES: Record<DenialReason, string> = {
  unknown_template: "El diseño elegido no existe.",
  login_required: "Creá una cuenta gratuita o iniciá sesión para descargar el PDF.",
  template_locked:
    "Este diseño es parte del Pack Premium. Podés ver la vista previa antes de comprarlo.",
  download_limit_reached:
    "Alcanzaste el límite de descargas de este mes. Revisá tu plan o esperá al próximo período.",
};

export const DENIAL_STATUS: Record<DenialReason, number> = {
  unknown_template: 400,
  login_required: 401,
  template_locked: 403,
  download_limit_reached: 429,
};
