import { ANONYMOUS, type AccessContext } from "@/domain/entitlements";

/**
 * Resuelve el contexto de acceso de la persona que hace la solicitud.
 * Los permisos siempre se calculan en el servidor: nunca se confía en datos del cliente.
 * Sin sesión válida, la persona es anónima.
 */
export async function getAccessContext(request: Request): Promise<AccessContext> {
  void request;
  return ANONYMOUS;
}
