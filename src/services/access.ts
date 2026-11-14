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

export class DownloadLimitError extends Error {
  constructor(readonly kind: "monthly" | "burst" = "monthly") {
    super(
      kind === "burst"
        ? "Demasiadas descargas en poco tiempo"
        : "Límite mensual de descargas alcanzado",
    );
  }
}

/**
 * Reserva una descarga de forma atómica: bajo un lock por usuario cuenta las del mes y
 * registra la nueva solo si no se superó el tope. Evita que solicitudes simultáneas
 * excedan el límite. Si luego falla la generación del PDF, se libera con releaseDownload.
 */
export async function reserveDownload(
  userId: string,
  templateId: string,
  cap: number,
  now: Date = new Date(),
  burstPerHour?: number,
): Promise<string> {
  const key = periodKey(now);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
    const used = await tx.downloadUsage.count({ where: { userId, periodKey: key } });
    if (used >= cap) throw new DownloadLimitError("monthly");
    if (burstPerHour !== undefined) {
      const recent = await tx.downloadUsage.count({
        where: { userId, createdAt: { gt: new Date(now.getTime() - 3_600_000) } },
      });
      if (recent >= burstPerHour) throw new DownloadLimitError("burst");
    }
    const row = await tx.downloadUsage.create({
      data: { userId, templateId, periodKey: key },
      select: { id: true },
    });
    return row.id;
  });
}

export async function releaseDownload(id: string): Promise<void> {
  await db.downloadUsage.deleteMany({ where: { id } });
}
