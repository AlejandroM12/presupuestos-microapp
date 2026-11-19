import { TEMPLATES } from "@/domain/templates";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCatalogTemplateId(templateId: string): boolean {
  return TEMPLATES.some((t) => t.id === templateId);
}

export function looksLikeCustomTemplateId(templateId: string): boolean {
  return UUID_RE.test(templateId);
}

/**
 * ¿El usuario puede usar esta plantilla privada?
 * No revela existencia a terceros: quien no tenga asignación queda denegado.
 */
export function canUsePrivateTemplate(templateId: string, assignedIds: readonly string[]): boolean {
  return assignedIds.includes(templateId);
}
