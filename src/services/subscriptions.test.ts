import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { computeEntitlements } from "@/domain/entitlements";
import { setMailer, type EmailMessage } from "@/integrations/email/mailer";
import { setGateway } from "@/integrations/mercadopago";
import type { GatewayPayment, GatewaySubscription } from "@/integrations/mercadopago/gateway";
import { FakeGateway } from "@/integrations/mercadopago/test-helpers";
import { PRICING } from "@/lib/config/plans";
import { db } from "@/server/db";
import { deleteTestUsers } from "@/test/cleanup";
import { loadAccessContext } from "./access";
import { handleWebhookNotification, SuspiciousPaymentError } from "./billing";
import { NotFoundError } from "./quotes";
import {
  AlreadySubscribedError,
  applyRemoteSubscription,
  applyRemoteSubscriptionPayment,
  cancelUserSubscription,
  expireStaleSubscriptions,
  reconcileSubscriptions,
  startSubscriptionCheckout,
} from "./subscriptions";

// Estas pruebas ejercitan el flujo de cobro con las ventas abiertas; la compuerta se prueba aparte.
process.env.SALES_ENABLED = "true";

const enabled = !!process.env.TEST_DATABASE_URL;
const DOMAIN = "@subs-test.example";
const T0 = new Date("2026-06-10T12:00:00Z");

describe.skipIf(!enabled)("suscripciones Pro (PostgreSQL + Mercado Pago simulado)", () => {
  const gateway = new FakeGateway();
  const sent: EmailMessage[] = [];
  let user: { id: string; email: string };
  let other: { id: string; email: string };

  const payment = (
    reference: string,
    id: string,
    over: Partial<GatewayPayment> = {},
  ): GatewayPayment => ({
    id,
    status: "approved",
    externalReference: reference,
    amount: PRICING.proMonthly,
    currency: "ARS",
    payerEmail: null,
    subscriptionId: null,
    ...over,
  });

  const remoteSub = (
    sub: { externalReference: string; providerSubscriptionId: string | null },
    status: string,
    amount: number | null = PRICING.proMonthly,
  ): GatewaySubscription => ({
    id: sub.providerSubscriptionId!,
    status,
    externalReference: sub.externalReference,
    amount,
    currency: "ARS",
    payerEmail: null,
    nextPaymentDate: null,
  });

  async function checkout(plan: "MONTHLY" | "YEARLY", u = user) {
    await startSubscriptionCheckout(u, plan, T0);
    return db.subscription.findFirstOrThrow({
      where: { userId: u.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
  }

  beforeAll(async () => {
    const mk = async (n: string) => {
      const email = `${n}${DOMAIN}`;
      return { id: (await db.user.create({ data: { email, passwordHash: "x" } })).id, email };
    };
    user = await mk("sub");
    other = await mk("other");
  });

  beforeEach(() => {
    gateway.subscriptions.length = 0;
    gateway.remoteSubscriptions.clear();
    gateway.payments.clear();
    gateway.authorizedPayments.clear();
    gateway.cancelled.length = 0;
    gateway.failCreate = false;
    sent.length = 0;
    setGateway(gateway);
    setMailer({ send: async (m) => void sent.push(m) });
  });

  afterEach(async () => {
    await db.webhookEvent.deleteMany();
    await db.payment.deleteMany({ where: { userId: { in: [user.id, other.id] } } });
    await db.subscription.deleteMany({ where: { userId: { in: [user.id, other.id] } } });
  });

  afterAll(async () => {
    setGateway(undefined);
    setMailer(null);
    await deleteTestUsers(DOMAIN);
  });

  it("crea la suscripción mensual y anual con el precio y la frecuencia del servidor", async () => {
    await startSubscriptionCheckout(user, "MONTHLY", T0);
    expect(gateway.subscriptions[0]).toMatchObject({
      amount: PRICING.proMonthly,
      frequency: { every: 1, unit: "months" },
      payerEmail: user.email,
    });
    await startSubscriptionCheckout(user, "YEARLY", T0);
    expect(gateway.subscriptions[1]).toMatchObject({
      amount: PRICING.proYearly,
      frequency: { every: 12, unit: "months" },
    });
    const pending = await db.subscription.findMany({
      where: { userId: user.id, status: "PENDING" },
    });
    expect(pending).toHaveLength(1); // el intento anterior quedó obsoleto
    expect(pending[0].providerSubscriptionId).toMatch(/^sub-/);
  });

  it("autorizar la suscripción no da acceso hasta que se aprueba el primer cobro", async () => {
    const sub = await checkout("MONTHLY");
    await applyRemoteSubscription(remoteSub(sub, "authorized"));
    expect((await loadAccessContext(user.id, T0)).proActive).toBe(false);
    expect((await db.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe(
      "ACTIVE",
    );
  });

  it("el primer cobro aprobado activa Pro, otorga acceso y avisa por email una sola vez", async () => {
    const sub = await checkout("MONTHLY");
    const ref = sub.externalReference;

    expect(await applyRemoteSubscriptionPayment(payment(ref, "9001"), {}, T0)).toBe("activated");
    // notificaciones repetidas del mismo cobro no extienden el período
    expect(await applyRemoteSubscriptionPayment(payment(ref, "9001"), {}, T0)).toBe("recorded");
    expect(await applyRemoteSubscriptionPayment(payment(ref, "9001"), {}, T0)).toBe("recorded");

    const row = await db.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(row.status).toBe("ACTIVE");
    expect(row.currentPeriodEnd?.toISOString()).toBe("2026-07-10T12:00:00.000Z");
    const ctx = await loadAccessContext(user.id, T0);
    expect(ctx.proActive).toBe(true);
    expect(computeEntitlements(ctx).cloudFeatures).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("Pro");
    expect(await db.payment.count({ where: { subscriptionId: sub.id } })).toBe(1);
  });

  it("las renovaciones extienden desde el fin del período vigente", async () => {
    const sub = await checkout("MONTHLY");
    await applyRemoteSubscriptionPayment(payment(sub.externalReference, "1"), {}, T0);
    const renewAt = new Date("2026-07-09T12:00:00Z"); // un día antes del vencimiento
    expect(
      await applyRemoteSubscriptionPayment(payment(sub.externalReference, "2"), {}, renewAt),
    ).toBe("renewed");
    const row = await db.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(row.currentPeriodEnd?.toISOString()).toBe("2026-08-10T12:00:00.000Z");
    expect(sent).toHaveLength(1); // no se reenvía el aviso de activación
  });

  it("el plan anual otorga un año de acceso", async () => {
    const sub = await checkout("YEARLY");
    await applyRemoteSubscriptionPayment(
      payment(sub.externalReference, "5", { amount: PRICING.proYearly }),
      {},
      T0,
    );
    const row = await db.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(row.currentPeriodEnd?.toISOString()).toBe("2027-06-10T12:00:00.000Z");
  });

  it("rechaza cobros aprobados con un importe distinto al del plan", async () => {
    const sub = await checkout("MONTHLY");
    await expect(
      applyRemoteSubscriptionPayment(payment(sub.externalReference, "7", { amount: 100 }), {}, T0),
    ).rejects.toBeInstanceOf(SuspiciousPaymentError);
    expect((await loadAccessContext(user.id, T0)).proActive).toBe(false);
  });

  it("un cobro rechazado en una renovación marca pago vencido sin cortar el acceso ya pagado", async () => {
    const sub = await checkout("MONTHLY");
    await applyRemoteSubscriptionPayment(payment(sub.externalReference, "1"), {}, T0);
    sent.length = 0;

    const mid = new Date("2026-06-20T00:00:00Z");
    const rejected = (id: string) =>
      applyRemoteSubscriptionPayment(
        payment(sub.externalReference, id, { status: "rejected" }),
        {},
        mid,
      );

    expect(await rejected("2")).toBe("failed");
    // un segundo rechazo con la suscripción ya en PAST_DUE no repite el aviso
    expect(await rejected("3")).toBe("recorded");

    const row = await db.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(row.status).toBe("PAST_DUE");
    expect((await loadAccessContext(user.id, mid)).proActive).toBe(true);
    expect((await loadAccessContext(user.id, new Date("2026-07-10T13:00:00Z"))).proActive).toBe(
      false,
    );
    expect(sent.filter((m) => m.subject.includes("No pudimos cobrar"))).toHaveLength(1);
  });

  it("al cancelar se conserva el acceso hasta el fin del período y luego vence", async () => {
    const sub = await checkout("MONTHLY");
    await applyRemoteSubscriptionPayment(payment(sub.externalReference, "1"), {}, T0);
    gateway.remoteSubscriptions.set(sub.providerSubscriptionId!, remoteSub(sub, "authorized"));
    sent.length = 0;

    const until = await cancelUserSubscription(user.id, T0);

    expect(until?.toISOString()).toBe("2026-07-10T12:00:00.000Z");
    expect(gateway.cancelled).toEqual([sub.providerSubscriptionId]);
    const row = await db.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(row.status).toBe("CANCELLED");
    expect(row.canceledAt).not.toBeNull();
    expect((await loadAccessContext(user.id, new Date("2026-07-01T00:00:00Z"))).proActive).toBe(
      true,
    );
    expect((await loadAccessContext(user.id, new Date("2026-07-11T00:00:00Z"))).proActive).toBe(
      false,
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("modo lectura");

    expect(await expireStaleSubscriptions(new Date("2026-07-11T00:00:00Z"))).toBe(1);
    expect((await db.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe(
      "EXPIRED",
    );
  });

  it("cancelar sin suscripción vigente falla y no toca a otros usuarios", async () => {
    await expect(cancelUserSubscription(user.id, T0)).rejects.toBeInstanceOf(NotFoundError);
    const sub = await checkout("MONTHLY", other);
    await applyRemoteSubscriptionPayment(payment(sub.externalReference, "1"), {}, T0);
    await expect(cancelUserSubscription(user.id, T0)).rejects.toBeInstanceOf(NotFoundError);
    expect((await loadAccessContext(other.id, T0)).proActive).toBe(true);
  });

  it("no permite contratar de nuevo el mismo plan vigente, pero sí cambiar de plan conservando el tiempo pagado", async () => {
    const monthly = await checkout("MONTHLY");
    await applyRemoteSubscriptionPayment(payment(monthly.externalReference, "1"), {}, T0);
    // el plan vigente se ve activo a la fecha real, así que simulamos "hoy" con una suscripción vigente
    await db.subscription.update({
      where: { id: monthly.id },
      data: { currentPeriodEnd: new Date(Date.now() + 10 * 24 * 3600 * 1000) },
    });
    await expect(startSubscriptionCheckout(user, "MONTHLY")).rejects.toBeInstanceOf(
      AlreadySubscribedError,
    );

    const leftover = (await db.subscription.findUniqueOrThrow({ where: { id: monthly.id } }))
      .currentPeriodEnd!;
    await startSubscriptionCheckout(user, "YEARLY");
    const yearly = await db.subscription.findFirstOrThrow({
      where: { userId: user.id, status: "PENDING" },
    });
    await applyRemoteSubscriptionPayment(
      payment(yearly.externalReference, "2", { amount: PRICING.proYearly }),
      {},
      new Date(),
    );

    const after = await db.subscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    const oldRow = after.find((s) => s.id === monthly.id)!;
    const newRow = after.find((s) => s.id === yearly.id)!;
    expect(oldRow.status).toBe("CANCELLED");
    expect(newRow.status).toBe("ACTIVE");
    expect(newRow.currentPeriodEnd!.getUTCFullYear()).toBe(leftover.getUTCFullYear() + 1);
    expect(newRow.currentPeriodEnd!.getUTCMonth()).toBe(leftover.getUTCMonth());
  });

  it("un reembolso corta el acceso", async () => {
    const sub = await checkout("MONTHLY");
    await applyRemoteSubscriptionPayment(payment(sub.externalReference, "1"), {}, T0);
    await applyRemoteSubscriptionPayment(
      payment(sub.externalReference, "1", { status: "refunded" }),
      {},
      new Date("2026-06-12T00:00:00Z"),
    );
    expect((await loadAccessContext(user.id, new Date("2026-06-12T00:00:01Z"))).proActive).toBe(
      false,
    );
  });

  it("un cobro de otro usuario o sin suscripción conocida se ignora", async () => {
    const sub = await checkout("MONTHLY", other);
    expect(
      await applyRemoteSubscriptionPayment(
        payment(sub.externalReference, "1"),
        { onlyForUserId: user.id },
        T0,
      ),
    ).toBe("ignored");
    expect(await applyRemoteSubscriptionPayment(payment("sub_desconocida", "2"), {}, T0)).toBe(
      "ignored",
    );
    expect(await applyRemoteSubscriptionPayment(payment("", "3"), {}, T0)).toBe("ignored");
  });

  it("procesa los webhooks de preapproval y de pago de forma idempotente", async () => {
    const sub = await checkout("MONTHLY");
    gateway.remoteSubscriptions.set(sub.providerSubscriptionId!, remoteSub(sub, "authorized"));
    gateway.payments.set("8001", payment(sub.externalReference, "8001"));

    const run = (type: string, dataId: string, requestId: string) =>
      handleWebhookNotification({ requestId, type, dataId, body: {} });

    expect(await run("subscription_preapproval", sub.providerSubscriptionId!, "r1")).toBe(
      "processed",
    );
    expect(await run("payment", "8001", "r2")).toBe("processed");
    expect(await run("payment", "8001", "r2")).toBe("duplicate");
    expect(await run("payment", "8001", "r3")).toBe("processed");
    // Cuota sin cobro anidado: se ignora hasta que Mercado Pago notifique el débito.
    gateway.authorizedPayments.set("abc", {
      id: "abc",
      preapprovalId: sub.providerSubscriptionId,
      externalReference: sub.externalReference,
      amount: PRICING.proMonthly,
      currency: "ARS",
      status: "scheduled",
      payment: null,
    });
    expect(await run("subscription_authorized_payment", "abc", "r4")).toBe("ignored");

    const row = await db.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(row.status).toBe("ACTIVE");
    expect(row.currentPeriodEnd).not.toBeNull();
    expect(await db.payment.count({ where: { subscriptionId: sub.id } })).toBe(1);
    expect(sent.filter((m) => m.subject.includes("activo"))).toHaveLength(1);
  });

  it("activa Pro desde subscription_authorized_payment vinculando por preapproval_id", async () => {
    const sub = await checkout("MONTHLY");
    // Sin external_reference en la cuota: el vínculo seguro es preapproval_id.
    gateway.authorizedPayments.set("inv-1", {
      id: "inv-1",
      preapprovalId: sub.providerSubscriptionId,
      externalReference: null,
      amount: PRICING.proMonthly,
      currency: "ARS",
      status: "processed",
      payment: { id: "pay-ap-1", status: "approved" },
    });

    expect(
      await handleWebhookNotification({
        requestId: "ap-1",
        type: "subscription_authorized_payment",
        dataId: "inv-1",
        body: {},
      }),
    ).toBe("processed");
    expect(
      await handleWebhookNotification({
        requestId: "ap-1",
        type: "subscription_authorized_payment",
        dataId: "inv-1",
        body: {},
      }),
    ).toBe("duplicate");

    const row = await db.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(row.status).toBe("ACTIVE");
    expect(row.currentPeriodEnd).not.toBeNull();
    expect(await db.payment.count({ where: { subscriptionId: sub.id, status: "APPROVED" } })).toBe(
      1,
    );
    expect((await loadAccessContext(user.id, T0)).proActive).toBe(true);
  });

  it("marca PAST_DUE ante cobro rechazado en authorized_payment y rechaza importes distintos", async () => {
    const sub = await checkout("MONTHLY");
    await applyRemoteSubscriptionPayment(payment(sub.externalReference, "first"), {}, T0);

    gateway.authorizedPayments.set("inv-rej", {
      id: "inv-rej",
      preapprovalId: sub.providerSubscriptionId,
      externalReference: sub.externalReference,
      amount: PRICING.proMonthly,
      currency: "ARS",
      status: "recycling",
      payment: { id: "pay-rej", status: "rejected" },
    });
    expect(
      await handleWebhookNotification({
        requestId: "ap-rej",
        type: "subscription_authorized_payment",
        dataId: "inv-rej",
        body: {},
      }),
    ).toBe("processed");
    expect((await db.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe(
      "PAST_DUE",
    );

    gateway.authorizedPayments.set("inv-bad", {
      id: "inv-bad",
      preapprovalId: sub.providerSubscriptionId,
      externalReference: sub.externalReference,
      amount: PRICING.proMonthly + 100,
      currency: "ARS",
      status: "processed",
      payment: { id: "pay-bad", status: "approved" },
    });
    await expect(
      handleWebhookNotification({
        requestId: "ap-bad",
        type: "subscription_authorized_payment",
        dataId: "inv-bad",
        body: {},
      }),
    ).rejects.toBeInstanceOf(SuspiciousPaymentError);
  });

  it("si el proveedor cancela la suscripción, el acceso sigue hasta el fin del período", async () => {
    const sub = await checkout("MONTHLY");
    await applyRemoteSubscriptionPayment(payment(sub.externalReference, "1"), {}, new Date());
    gateway.remoteSubscriptions.set(sub.providerSubscriptionId!, remoteSub(sub, "cancelled"));

    await handleWebhookNotification({
      requestId: "rc",
      type: "subscription_preapproval",
      dataId: sub.providerSubscriptionId!,
      body: {},
    });
    const row = await db.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(row.status).toBe("CANCELLED");
    expect((await loadAccessContext(user.id)).proActive).toBe(true);
  });

  it("concilia suscripciones cuando se perdió un webhook", async () => {
    const sub = await checkout("MONTHLY");
    await applyRemoteSubscriptionPayment(payment(sub.externalReference, "1"), {}, new Date());
    gateway.remoteSubscriptions.set(sub.providerSubscriptionId!, remoteSub(sub, "cancelled"));

    const result = await reconcileSubscriptions();
    expect(result.failed).toBe(0);
    expect(result.checked).toBeGreaterThanOrEqual(1);
    expect((await db.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe(
      "CANCELLED",
    );
  });

  it("si el proveedor falla al crear la suscripción no deja registros huérfanos", async () => {
    gateway.failCreate = true;
    await expect(startSubscriptionCheckout(user, "MONTHLY", T0)).rejects.toThrow();
    expect(await db.subscription.count({ where: { userId: user.id } })).toBe(0);
  });

  it("rechaza una suscripción informada con un importe distinto al del plan", async () => {
    const sub = await checkout("MONTHLY");
    await expect(applyRemoteSubscription(remoteSub(sub, "authorized", 1))).rejects.toBeInstanceOf(
      SuspiciousPaymentError,
    );
  });
});
