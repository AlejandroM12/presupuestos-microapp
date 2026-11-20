import { randomUUID } from "node:crypto";
import { addPeriod } from "@/domain/subscription";
import { Prisma, type SubscriptionPlan } from "@/generated/prisma/client";
import { getMailer, type EmailMessage } from "@/integrations/email/mailer";
import {
  paymentFailedEmail,
  proActivatedEmail,
  proCancelledEmail,
} from "@/integrations/email/templates";
import {
  mapPaymentStatus,
  type GatewayPayment,
  type GatewaySubscription,
} from "@/integrations/mercadopago/gateway";
import { PRICING } from "@/lib/config/plans";
import { db } from "@/server/db";
import { NotFoundError } from "./quotes";
import {
  assertPurchaseAllowed,
  requireGateway,
  returnUrls,
  SuspiciousPaymentError,
} from "./billing-common";

export class AlreadySubscribedError extends Error {
  constructor() {
    super("Ya tenés este plan activo");
  }
}

export const PLAN_PRICE: Record<SubscriptionPlan, number> = {
  MONTHLY: PRICING.proMonthly,
  YEARLY: PRICING.proYearly,
};

const PLAN_MONTHS: Record<SubscriptionPlan, number> = { MONTHLY: 1, YEARLY: 12 };
const PLAN_LABEL: Record<SubscriptionPlan, string> = { MONTHLY: "mensual", YEARLY: "anual" };

async function sendMail(message: EmailMessage) {
  await getMailer()
    .send(message)
    .catch((e) =>
      console.error("subscription_email_failed", e instanceof Error ? e.message : "unknown"),
    );
}

const isLive = (s: { status: string; currentPeriodEnd: Date | null }, now: Date) =>
  s.status !== "PENDING" &&
  s.status !== "EXPIRED" &&
  s.currentPeriodEnd !== null &&
  s.currentPeriodEnd > now;

/** Inicia la suscripción Pro. El importe y el período los define el servidor según el plan. */
export async function startSubscriptionCheckout(
  user: { id: string; email: string },
  plan: SubscriptionPlan,
  now: Date = new Date(),
): Promise<{ url: string }> {
  assertPurchaseAllowed(user.email);
  const gateway = requireGateway();

  const live = await db.subscription.findMany({
    where: { userId: user.id, status: { in: ["ACTIVE", "PAST_DUE"] } },
  });
  if (live.some((s) => s.plan === plan && isLive(s, now))) throw new AlreadySubscribedError();

  // Los intentos sin completar quedan obsoletos: no se acumulan.
  await db.subscription.updateMany({
    where: { userId: user.id, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  const externalReference = `sub_${randomUUID()}`;
  const created = await db.subscription.create({
    data: { userId: user.id, plan, externalReference, status: "PENDING" },
    select: { id: true },
  });
  try {
    const session = await gateway.createSubscription({
      externalReference,
      reason: `AtajoLab Presupuestos · Plan Pro ${PLAN_LABEL[plan]}`,
      amount: PLAN_PRICE[plan],
      frequency: { every: PLAN_MONTHS[plan], unit: "months" },
      payerEmail: user.email,
      backUrl: returnUrls("pro").success,
    });
    await db.subscription.update({
      where: { id: created.id },
      data: { providerSubscriptionId: session.id },
    });
    return { url: session.checkoutUrl };
  } catch (error) {
    await db.subscription.deleteMany({ where: { id: created.id } });
    throw error;
  }
}

export type SubscriptionOutcome =
  "ignored" | "recorded" | "activated" | "renewed" | "cancelled" | "failed";

/** Aplica el estado de la suscripción (preapproval) informado por el proveedor. */
export async function applyRemoteSubscription(
  remote: GatewaySubscription,
): Promise<SubscriptionOutcome> {
  if (!remote.externalReference) return "ignored";
  const sub = await db.subscription.findUnique({
    where: { externalReference: remote.externalReference },
    include: { user: { select: { email: true } } },
  });
  if (!sub) return "ignored";

  if (remote.amount !== null && !new Prisma.Decimal(remote.amount).equals(PLAN_PRICE[sub.plan])) {
    throw new SuspiciousPaymentError("El importe de la suscripción no coincide con el plan");
  }

  if (remote.status === "cancelled" || remote.status === "paused") {
    if (sub.status === "CANCELLED" || sub.status === "EXPIRED") return "recorded";
    await db.subscription.update({
      where: { id: sub.id },
      data: {
        status: "CANCELLED",
        canceledAt: sub.canceledAt ?? new Date(),
        providerSubscriptionId: remote.id,
      },
    });
    if (sub.user && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()) {
      await sendMail(proCancelledEmail(sub.user.email, sub.currentPeriodEnd));
    }
    return "cancelled";
  }

  if (remote.status === "authorized") {
    // Autorizada: el acceso se otorga recién cuando se aprueba el primer cobro.
    await db.subscription.update({
      where: { id: sub.id },
      data: {
        providerSubscriptionId: remote.id,
        ...(sub.status === "PENDING" ? { status: "ACTIVE" } : {}),
      },
    });
    return "recorded";
  }
  return "recorded";
}

const subscriptionInclude = { user: { select: { email: true } } } as const;

/** Resuelve la suscripción local por external_reference o por preapproval_id del proveedor. */
async function findSubscriptionForRemotePayment(remote: GatewayPayment) {
  if (remote.externalReference) {
    const byRef = await db.subscription.findUnique({
      where: { externalReference: remote.externalReference },
      include: subscriptionInclude,
    });
    if (byRef) return byRef;
  }
  if (remote.subscriptionId) {
    return db.subscription.findFirst({
      where: { providerSubscriptionId: remote.subscriptionId },
      include: subscriptionInclude,
    });
  }
  return null;
}

/** Aplica un cobro de suscripción (primer pago o renovación). Idempotente por pago. */
export async function applyRemoteSubscriptionPayment(
  remote: GatewayPayment,
  options: { onlyForUserId?: string } = {},
  now: Date = new Date(),
): Promise<"ignored" | "recorded" | "activated" | "renewed" | "failed"> {
  const sub = await findSubscriptionForRemotePayment(remote);
  if (!sub) return "ignored";
  if (options.onlyForUserId && sub.userId !== options.onlyForUserId) return "ignored";

  const status = mapPaymentStatus(remote.status);
  const expected = PLAN_PRICE[sub.plan];
  if (
    status === "APPROVED" &&
    (!new Prisma.Decimal(remote.amount).equals(expected) || remote.currency !== "ARS")
  ) {
    throw new SuspiciousPaymentError("El importe del cobro no coincide con el plan");
  }

  const reference = `${sub.externalReference}:${remote.id}`;
  const result: { outcome: "recorded" | "activated" | "renewed" | "failed"; newEnd: Date | null } =
    {
      outcome: "recorded",
      newEnd: null,
    };

  try {
    await db.$transaction(async (tx) => {
      await tx.payment.createMany({
        data: {
          userId: sub.userId,
          kind: "SUBSCRIPTION",
          externalReference: reference,
          providerPaymentId: remote.id,
          amount: expected,
          currency: "ARS",
          status: "PENDING",
          subscriptionId: sub.id,
        },
        skipDuplicates: true,
      });
      const payment = await tx.payment.findUniqueOrThrow({
        where: { externalReference: reference },
      });

      // La transición a APPROVED ocurre una sola vez aunque lleguen notificaciones simultáneas.
      const transitioned =
        status === "APPROVED"
          ? (
              await tx.payment.updateMany({
                where: { id: payment.id, status: { not: "APPROVED" } },
                data: { status, providerStatus: remote.status },
              })
            ).count === 1
          : false;
      if (status !== "APPROVED") {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status, providerStatus: remote.status },
        });
      }

      if (transitioned) {
        // Si cambió de plan, el tiempo ya pagado de otras suscripciones se conserva.
        const others = await tx.subscription.findMany({
          where: {
            userId: sub.userId,
            id: { not: sub.id },
            status: { in: ["ACTIVE", "PAST_DUE"] },
          },
        });
        const base = [now, sub.currentPeriodEnd, ...others.map((o) => o.currentPeriodEnd)]
          .filter((d): d is Date => d !== null)
          .reduce((a, b) => (b > a ? b : a));
        result.newEnd = addPeriod(base, sub.plan);
        result.outcome = sub.currentPeriodEnd === null ? "activated" : "renewed";
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: "ACTIVE", currentPeriodEnd: result.newEnd, canceledAt: null },
        });
        if (others.length > 0) {
          await tx.subscription.updateMany({
            where: { id: { in: others.map((o) => o.id) } },
            data: { status: "CANCELLED", canceledAt: now },
          });
        }
      } else if (status === "REJECTED" && sub.status === "ACTIVE" && sub.currentPeriodEnd) {
        await tx.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
        result.outcome = "failed";
      } else if (status === "REFUNDED" && payment.status === "APPROVED") {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: "CANCELLED", canceledAt: now, currentPeriodEnd: now },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new SuspiciousPaymentError("Identificador de pago ya asociado a otra compra");
    }
    throw error;
  }

  if (!sub.user) {
    // Cuenta eliminada: se concilia el estado pero no se envían correos.
  } else if (result.outcome === "activated" && result.newEnd) {
    await sendMail(proActivatedEmail(sub.user.email, sub.plan, result.newEnd));
  } else if (result.outcome === "failed") {
    await sendMail(paymentFailedEmail(sub.user.email, sub.currentPeriodEnd));
  }
  return result.outcome;
}

/** Cancela la suscripción vigente: no se renueva y el acceso sigue hasta el fin del período pagado. */
export async function cancelUserSubscription(
  userId: string,
  now: Date = new Date(),
): Promise<Date | null> {
  const sub = await db.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    orderBy: { currentPeriodEnd: "desc" },
    include: { user: { select: { email: true } } },
  });
  if (!sub) throw new NotFoundError("Suscripción");

  if (sub.providerSubscriptionId) {
    await requireGateway().cancelSubscription(sub.providerSubscriptionId);
  }
  await db.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED", canceledAt: now },
  });
  if (sub.user && sub.currentPeriodEnd && sub.currentPeriodEnd > now) {
    await sendMail(proCancelledEmail(sub.user.email, sub.currentPeriodEnd));
  }
  return sub.currentPeriodEnd;
}

/** Suscripción más relevante del usuario para mostrar en "Mi plan". */
export async function currentSubscription(userId: string) {
  return db.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "PAST_DUE", "CANCELLED", "PENDING"] } },
    orderBy: [{ currentPeriodEnd: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
}

export async function paymentHistory(userId: string, take = 20) {
  return db.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/** Marca como vencidas las suscripciones cuyo período pagado terminó y los intentos abandonados. */
export async function expireStaleSubscriptions(now: Date = new Date()): Promise<number> {
  const periodEnded = await db.subscription.updateMany({
    where: {
      status: { in: ["ACTIVE", "PAST_DUE", "CANCELLED"] },
      currentPeriodEnd: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
  const abandoned = await db.subscription.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    },
    data: { status: "EXPIRED" },
  });
  return periodEnded.count + abandoned.count;
}

/**
 * Conciliación con el proveedor: ante webhooks perdidos, vuelve a consultar el estado de las
 * suscripciones vigentes o pendientes y lo aplica.
 */
export async function reconcileSubscriptions(
  limit = 50,
): Promise<{ checked: number; failed: number }> {
  const gateway = requireGateway();
  const subs = await db.subscription.findMany({
    where: {
      status: { in: ["PENDING", "ACTIVE", "PAST_DUE"] },
      providerSubscriptionId: { not: null },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });
  let failed = 0;
  for (const sub of subs) {
    try {
      const remote = await gateway.getSubscription(sub.providerSubscriptionId!);
      if (remote) await applyRemoteSubscription(remote);
    } catch (error) {
      failed += 1;
      console.error("reconcile_failed", error instanceof Error ? error.message : "unknown");
    }
  }
  return { checked: subs.length, failed };
}

/** Para la página de retorno: verifica con el proveedor una suscripción propia del usuario. */
export async function reconcileUserSubscription(userId: string, providerSubscriptionId: string) {
  const remote = await requireGateway().getSubscription(providerSubscriptionId);
  if (!remote?.externalReference) return;
  const own = await db.subscription.findFirst({
    where: { userId, externalReference: remote.externalReference },
    select: { id: true },
  });
  if (own) await applyRemoteSubscription(remote);
}
