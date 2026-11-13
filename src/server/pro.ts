import { computeEntitlements, type Entitlements } from "@/domain/entitlements";
import { requireProUser, requireUser, type CurrentUser } from "@/server/auth/session";
import { loadAccessContext } from "@/services/access";

export async function loadEntitlements(userId: string): Promise<Entitlements> {
  return computeEntitlements(await loadAccessContext(userId));
}

/** Usuario con Pro vigente (para server actions de escritura); si no, redirige a Mi plan. */
export function requirePro(next = "/dashboard"): Promise<CurrentUser> {
  return requireProUser(async (id) => (await loadEntitlements(id)).cloudFeatures, next);
}

export async function requireUserWithEntitlements(next = "/dashboard") {
  const user = await requireUser(next);
  return { user, entitlements: await loadEntitlements(user.id) };
}
