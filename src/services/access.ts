import type { AccessContext } from "@/domain/entitlements";
import { isSubscriptionActive, periodKey } from "@/domain/subscription";
import { db } from "@/server/db";

export const PREMIUM_PACK = "premium_pack";

/** Calcula el estado de acceso real de un usuario a partir de compras, suscripciones y uso. */
export async function loadAccessContext(
  userId: string,
  now: Date = new Date(),
): Promise<AccessContext> {
  const [purchase, subscriptions, downloads] = await Promise.all([
    db.templatePurchase.findUnique({
      where: { userId_product: { userId, product: PREMIUM_PACK } },
      select: { id: true },
    }),
    db.subscription.findMany({
      where: { userId, status: { in: ["ACTIVE", "PAST_DUE", "CANCELLED"] } },
      select: { status: true, currentPeriodEnd: true },
    }),
    db.downloadUsage.count({ where: { userId, periodKey: periodKey(now) } }),
  ]);

  return {
    authenticated: true,
    ownsPremiumPack: purchase !== null,
    proActive: subscriptions.some((s) => isSubscriptionActive(s, now)),
    downloadsThisMonth: downloads,
  };
}

/** Registra una descarga final. El contador mensual se calcula contando estas filas. */
export async function recordDownload(userId: string, templateId: string, now: Date = new Date()) {
  await db.downloadUsage.create({ data: { userId, templateId, periodKey: periodKey(now) } });
}
