import { redirect } from "next/navigation";
import { auth } from "@/auth";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name ?? null };
}

/** Exige sesión en páginas y acciones del servidor; si falta, redirige al login. */
export async function requireUser(next = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  return user;
}

/** Para páginas y acciones de escritura de Pro: sin plan vigente se redirige a "Mi plan". */
export async function requireProUser(
  load: (userId: string) => Promise<boolean>,
  next = "/dashboard",
): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!(await load(user.id))) redirect("/dashboard/plan?need=pro");
  return user;
}
