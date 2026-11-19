import { notFound } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/server/auth/session";
import { ForbiddenError } from "@/server/guards";
import { db } from "@/server/db";
import { NotFoundError } from "@/services/quotes";

/**
 * El rol se consulta en la base en cada solicitud: no se guarda en el token de sesión, así
 * revocar el rol surte efecto de inmediato y no hay forma de autoasignarlo desde el cliente.
 */
async function loadAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const row = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
  return row?.role === "ADMIN" ? user : null;
}

/** Páginas y acciones: quien no es administrador recibe 404 (no se revela que /admin existe). */
export async function requireAdminUser(): Promise<CurrentUser> {
  const admin = await loadAdmin();
  if (!admin) notFound();
  return admin;
}

/** Handlers de API: 401 sin sesión; 404 si no es administrador (no se revela la ruta). */
export async function requireAdminApi(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("login_required", "Iniciá sesión para continuar.");
  const admin = await loadAdmin();
  if (!admin) throw new NotFoundError("Recurso");
  return admin;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const row = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  return row?.role === "ADMIN";
}
