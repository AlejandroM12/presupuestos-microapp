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
  /** Descargas finales restantes este mes; null = sin límite (Pro). */
  downloadsRemaining: number | null;
  downloadLimit: number | null;
  allowCustomColor: boolean;
  /** Historial en la nube, clientes y dashboard. */
  cloudFeatures: boolean;
}

export function computeEntitlements(ctx: AccessContext): Entitlements {
  const premiumTemplates = TEMPLATES.filter((t) => t.tier === "premium").map((t) => t.id);
  const premiumUnlocked = ctx.proActive || ctx.ownsPremiumPack;
  const unlimited = ctx.proActive;
  const limit = LIMITS.freeMonthlyDownloads;
  const cap = unlimited ? LIMITS.proFairUseMonthlyDownloads : limit;

  return {
    authenticated: ctx.authenticated,
    proActive: ctx.proActive,
    ownsPremiumPack: ctx.ownsPremiumPack,
    templates: premiumUnlocked ? [FREE_TEMPLATE_ID, ...premiumTemplates] : [FREE_TEMPLATE_ID],
    downloadsRemaining: Math.max(0, cap - ctx.downloadsThisMonth),
    downloadLimit: unlimited ? null : limit,
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
  /**
   * Transitorio: mientras no exista la cuenta de usuario, el diseño gratuito puede
   * descargarse sin sesión. Se desactiva al activar autenticación y límites.
   */
  allowAnonymousFreeDownload?: boolean;
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

  if (!ctx.authenticated && !opts.allowAnonymousFreeDownload) {
    return { allowed: false, reason: "login_required" };
  }
  if (!ent.templates.includes(template.id)) return { allowed: false, reason: "template_locked" };
  if (ctx.authenticated && ent.downloadsRemaining !== null && ent.downloadsRemaining <= 0) {
    return { allowed: false, reason: "download_limit_reached" };
  }
  return { allowed: true, showBrand, allowCustomColor: ent.allowCustomColor, preview: false };
}

export const DENIAL_MESSAGES: Record<DenialReason, string> = {
  unknown_template: "El diseño elegido no existe.",
  login_required: "Creá una cuenta gratuita o iniciá sesión para descargar el PDF.",
  template_locked:
    "Este diseño es parte del Pack Premium. Podés ver la vista previa antes de comprarlo.",
  download_limit_reached:
    "Alcanzaste el límite de descargas gratuitas de este mes. Pasate a Pro para descargar sin límite.",
};

export const DENIAL_STATUS: Record<DenialReason, number> = {
  unknown_template: 400,
  login_required: 401,
  template_locked: 403,
  download_limit_reached: 429,
};
