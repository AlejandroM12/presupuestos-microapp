import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getMailer } from "@/integrations/email/mailer";
import { packPurchasedEmail } from "@/integrations/email/templates";
import {
  mapPaymentStatus,
  type GatewayAuthorizedPayment,
  type GatewayPayment,
} from "@/integrations/mercadopago/gateway";
import { PRICING } from "@/lib/config/plans";
import { db } from "@/server/db";
import { PREMIUM_PACK } from "./access";
import {
  AlreadyOwnedError,
  notificationUrl,
  PaymentsDisabledError,
  assertPurchaseAllowed,
  SalesClosedError,
  requireGateway,
  returnUrls,
  SuspiciousPaymentError,
} from "./billing-common";
import { applyRemoteSubscription, applyRemoteSubscriptionPayment } from "./subscriptions";

export { AlreadyOwnedError, PaymentsDisabledError, SalesClosedError, SuspiciousPaymentError };

/**
 * Inicia la compra del Pack Premium. El importe sale siempre de la configuración del servidor
 * y la referencia externa se genera acá: el cliente no controla ninguno de los dos.
 */
export async function startPackCheckout(user: {
  id: string;
  email: string;
}): Promise<{ url: string }> {
  assertPurchaseAllowed(user.email);
  const gateway = requireGateway();
  const owned = await db.templatePurchase.findUnique({
    where: { userId_product: { userId: user.id, product: PREMIUM_PACK } },
    select: { id: true },
  });
  if (owned) throw new AlreadyOwnedError();

  const externalReference = `pack_${randomUUID()}`;
  const payment = await db.payment.create({
    data: {
      userId: user.id,
      kind: "PREMIUM_PACK",
      externalReference,
      amount: PRICING.premiumPack,
      currency: "ARS",
      status: "PENDING",
    },
    select: { id: true },
  });
  try {
    const session = await gateway.createPreference({
      externalReference,
      title: "AtajoLab Presupuestos · Pack Premium",
      amount: PRICING.premiumPack,
      payerEmail: user.email,
      backUrls: returnUrls("pack"),
      notificationUrl: notificationUrl(),
    });
    return { url: session.checkoutUrl };
  } catch (error) {
    await db.payment.deleteMany({ where: { id: payment.id } });
    throw error;
  }
}

export type ProcessOutcome =
  "ignored" | "recorded" | "granted" | "revoked" | "activated" | "renewed" | "failed";

/**
 * Aplica el estado real de un pago de Mercado Pago a nuestros registros.
 * Es idempotente: se puede ejecutar varias veces (reintentos, notificaciones repetidas,
 * regreso del usuario) con el mismo resultado final.
 */
export async function applyRemotePayment(
  remote: GatewayPayment,
  options: { onlyForUserId?: string } = {},
): Promise<ProcessOutcome> {
  // Cobros de suscripción: por nuestra referencia (`sub_…`) o por preapproval_id del proveedor.
  if (remote.subscriptionId || remote.externalReference?.startsWith("sub_")) {
    return applyRemoteSubscriptionPayment(remote, options);
  }
  if (!remote.externalReference) return "ignored";
  const row = await db.payment.findUnique({
    where: { externalReference: remote.externalReference },
  });
  if (!row) return "ignored";
  if (options.onlyForUserId && row.userId !== options.onlyForUserId) return "ignored";
  if (row.kind !== "PREMIUM_PACK") return "ignored";

  const status = mapPaymentStatus(remote.status);

  if (
    status === "APPROVED" &&
    (!new Prisma.Decimal(remote.amount).equals(row.amount) || remote.currency !== row.currency)
  ) {
    throw new SuspiciousPaymentError("El importe o la moneda del pago no coinciden");
  }

  let granted = false;
  let revoked = false;
  try {
    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: row.id },
        data: { providerPaymentId: remote.id, status, providerStatus: remote.status },
      });
      if (status === "APPROVED" && row.userId) {
        const created = await tx.templatePurchase.createMany({
          data: { userId: row.userId, product: PREMIUM_PACK, paymentId: row.id },
          skipDuplicates: true,
        });
        granted = created.count > 0;
      } else if (status === "REFUNDED") {
        const removed = await tx.templatePurchase.deleteMany({ where: { paymentId: row.id } });
        revoked = removed.count > 0;
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new SuspiciousPaymentError("Identificador de pago ya asociado a otra compra");
    }
    throw error;
  }

  if (granted && row.userId) {
    const user = await db.user.findUnique({ where: { id: row.userId }, select: { email: true } });
    if (user) {
      await getMailer()
        .send(packPurchasedEmail(user.email))
        .catch((e) =>
          console.error("pack_email_failed", e instanceof Error ? e.message : "unknown"),
        );
    }
    return "granted";
  }
  return revoked ? "revoked" : "recorded";
}

/** Consulta el pago al proveedor (fuente de verdad) y lo aplica. */
export async function processPaymentNotification(
  paymentId: string,
  options: { onlyForUserId?: string } = {},
): Promise<ProcessOutcome> {
  const remote = await requireGateway().getPayment(paymentId);
  if (!remote) return "ignored";
  return applyRemotePayment(remote, options);
}

/**
 * Convierte una cuota (`authorized_payments`) en el cobro que aplica la lógica de Pro.
 * Sin `payment.id` la cuota aún no se debitó: se ignora hasta una notificación posterior.
 * Vincula por `preapproval_id` y/o `external_reference` (documentación oficial MP).
 */
export function gatewayPaymentFromAuthorized(
  invoice: GatewayAuthorizedPayment,
): GatewayPayment | null {
  if (!invoice.payment) return null;
  return {
    id: invoice.payment.id,
    status: invoice.payment.status,
    externalReference: invoice.externalReference,
    amount: invoice.amount,
    currency: invoice.currency,
    payerEmail: null,
    subscriptionId: invoice.preapprovalId,
  };
}

/** Procesa el tema `subscription_authorized_payment`: consulta la cuota y aplica el cobro. */
export async function processAuthorizedPaymentNotification(
  authorizedPaymentId: string,
  options: { onlyForUserId?: string } = {},
): Promise<ProcessOutcome> {
  const invoice = await requireGateway().getAuthorizedPayment(authorizedPaymentId);
  if (!invoice) return "ignored";
  const remote = gatewayPaymentFromAuthorized(invoice);
  if (!remote) return "ignored";
  return applyRemoteSubscriptionPayment(remote, options);
}

export interface WebhookInput {
  requestId: string;
  type: string;
  dataId: string;
  body: unknown;
}

export type WebhookResult = "processed" | "duplicate" | "ignored";

/**
 * Registra y procesa una notificación ya autenticada. Los reintentos de una entrega que
 * terminó bien se responden como duplicados; los que fallaron se vuelven a procesar.
 */
export async function handleWebhookNotification(input: WebhookInput): Promise<WebhookResult> {
  const eventKey = `${input.requestId}:${input.type}:${input.dataId}`;
  let event;
  try {
    event = await db.webhookEvent.create({
      data: {
        provider: "mercadopago",
        eventKey,
        type: input.type,
        payload: (input.body ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
      throw error;
    const existing = await db.webhookEvent.findUniqueOrThrow({
      where: { provider_eventKey: { provider: "mercadopago", eventKey } },
    });
    if (existing.status === "PROCESSED" || existing.status === "IGNORED") return "duplicate";
    event = existing;
  }

  await db.webhookEvent.update({ where: { id: event.id }, data: { attempts: { increment: 1 } } });
  try {
    let result: WebhookResult = "ignored";
    if (input.type === "payment") {
      const outcome = await processPaymentNotification(input.dataId);
      result = outcome === "ignored" ? "ignored" : "processed";
    } else if (input.type === "subscription_preapproval") {
      const remote = await requireGateway().getSubscription(input.dataId);
      if (remote) {
        const outcome = await applyRemoteSubscription(remote);
        result = outcome === "ignored" ? "ignored" : "processed";
      }
    } else if (input.type === "subscription_authorized_payment") {
      const outcome = await processAuthorizedPaymentNotification(input.dataId);
      result = outcome === "ignored" ? "ignored" : "processed";
    }
    await db.webhookEvent.update({
      where: { id: event.id },
      data: {
        status: result === "processed" ? "PROCESSED" : "IGNORED",
        processedAt: new Date(),
        error: null,
      },
    });
    return result;
  } catch (error) {
    await db.webhookEvent.update({
      where: { id: event.id },
      data: {
        status: "FAILED",
        error: (error instanceof Error ? error.message : "unknown").slice(0, 300),
      },
    });
    throw error;
  }
}

export async function latestPackPayment(userId: string) {
  return db.payment.findFirst({
    where: { userId, kind: "PREMIUM_PACK" },
    orderBy: { createdAt: "desc" },
  });
}
