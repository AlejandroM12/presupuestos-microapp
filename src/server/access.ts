import { auth } from "@/auth";
import { ANONYMOUS, type AccessContext } from "@/domain/entitlements";

/**
 * Resuelve el contexto de acceso de la persona que hace la solicitud.
 * Los permisos siempre se calculan en el servidor: nunca se confía en datos del cliente.
 */
export async function getAccessContext(): Promise<AccessContext> {
  const session = await auth();
  if (!session?.user?.id) return ANONYMOUS;
  return { ...ANONYMOUS, authenticated: true };
}
