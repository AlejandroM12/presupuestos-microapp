import { computeEntitlements } from "@/domain/entitlements";
import { getCurrentUser, type CurrentUser } from "@/server/auth/session";
import { loadAccessContext } from "@/services/access";

export class ForbiddenError extends Error {
  constructor(
    public readonly code: "login_required" | "pro_required",
    message: string,
  ) {
    super(message);
  }
}

/** Usuario autenticado o error. Úsese en handlers de API (en páginas, usar requireUser). */
export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("login_required", "Iniciá sesión para continuar.");
  return user;
}

/**
 * Las funciones de nube (guardar, editar, clientes) requieren Pro vigente.
 * Tras cancelar o vencer el plan, los datos siguen disponibles en modo lectura.
 */
export async function requireProWrite(): Promise<CurrentUser> {
  const user = await requireApiUser();
  const ent = computeEntitlements(await loadAccessContext(user.id));
  if (!ent.cloudFeatures) {
    throw new ForbiddenError("pro_required", "Esta función requiere el plan Pro vigente.");
  }
  return user;
}
