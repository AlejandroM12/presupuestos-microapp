import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { computeEntitlements } from "@/domain/entitlements";
import { setMailer, type EmailMessage } from "@/integrations/email/mailer";
import { setGateway } from "@/integrations/mercadopago";
import type { GatewayPayment } from "@/integrations/mercadopago/gateway";
import { FakeGateway } from "@/integrations/mercadopago/test-helpers";
import { PRICING } from "@/lib/config/plans";
import { db } from "@/server/db";
import { deleteTestUsers } from "@/test/cleanup";
import { loadAccessContext } from "./access";
import {
  AlreadyOwnedError,
  handleWebhookNotification,
  PaymentsDisabledError,
  startPackCheckout,
  SuspiciousPaymentError,
} from "./billing";

const enabled = !!process.env.TEST_DATABASE_URL;
const DOMAIN = "@billing-test.example";

describe.skipIf(!enabled)("compra del Pack Premium (PostgreSQL + Mercado Pago simulado)", () => {
  const gateway = new FakeGateway();
  const sent: EmailMessage[] = [];
  let alice: { id: string; email: string };
  let bob: { id: string; email: string };

  const remotePayment = (
    over: Partial<GatewayPayment> & { externalReference: string },
  ): GatewayPayment => ({
    id: "1001",
    status: "approved",
    amount: PRICING.premiumPack,
    currency: "ARS",
    payerEmail: null,
    subscriptionId: null,
    ...over,
  });

  async function checkout(user: { id: string; email: string }) {
    const { url } = await startPackCheckout(user);
    const reference = url.split("/").pop()!;
    return reference;
  }

  const notify = (dataId: string, requestId = `req-${dataId}-${Math.random()}`) =>
    handleWebhookNotification({
      requestId,
      type: "payment",
      dataId,
      body: { data: { id: dataId } },
    });

  beforeAll(async () => {
    const mk = async (n: string) => {
      const email = `${n}${DOMAIN}`;
      const u = await db.user.create({ data: { email, passwordHash: "x" }, select: { id: true } });
      return { id: u.id, email };
    };
    alice = await mk("alice");
    bob = await mk("bob");
  });

  beforeEach(() => {
    gateway.payments.clear();
    gateway.preferences.length = 0;
    gateway.failCreate = false;
    sent.length = 0;
    setGateway(gateway);
    setMailer({ send: async (m) => void sent.push(m) });
  });

  afterEach(async () => {
    await db.webhookEvent.deleteMany({ where: { provider: "mercadopago" } });
    await db.templatePurchase.deleteMany({ where: { userId: { in: [alice.id, bob.id] } } });
    await db.payment.deleteMany({ where: { userId: { in: [alice.id, bob.id] } } });
  });

  afterAll(async () => {
    setGateway(undefined);
    setMailer(null);
    await deleteTestUsers(DOMAIN);
  });

  it("crea la preferencia con el precio del servidor y registra el pago pendiente", async () => {
    const reference = await checkout(alice);
    expect(gateway.preferences).toHaveLength(1);
    expect(gateway.preferences[0]).toMatchObject({
      externalReference: reference,
      amount: PRICING.premiumPack,
      payerEmail: alice.email,
    });
    const row = await db.payment.findUniqueOrThrow({ where: { externalReference: reference } });
    expect(row).toMatchObject({ userId: alice.id, kind: "PREMIUM_PACK", status: "PENDING" });
    expect(row.amount.toFixed(2)).toBe(PRICING.premiumPack.toFixed(2));
  });

  it("no activa la licencia mientras el pago no esté aprobado", async () => {
    const reference = await checkout(alice);
    gateway.payments.set(
      "1001",
      remotePayment({ externalReference: reference, status: "pending" }),
    );
    await notify("1001");
    expect((await loadAccessContext(alice.id)).ownsPremiumPack).toBe(false);
    expect(
      (await db.payment.findUniqueOrThrow({ where: { externalReference: reference } })).status,
    ).toBe("PENDING");
  });

  it("un pago aprobado activa el pack, habilita los diseños y envía la confirmación", async () => {
    const reference = await checkout(alice);
    gateway.payments.set("1001", remotePayment({ externalReference: reference }));

    expect(await notify("1001")).toBe("processed");

    const ctx = await loadAccessContext(alice.id);
    expect(ctx.ownsPremiumPack).toBe(true);
    expect(computeEntitlements(ctx).templates).toHaveLength(6);
    expect(computeEntitlements(ctx).allowCustomColor).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(alice.email);
    expect((await loadAccessContext(bob.id)).ownsPremiumPack).toBe(false);
  });

  it("es idempotente: reentregas y notificaciones repetidas no duplican nada", async () => {
    const reference = await checkout(alice);
    gateway.payments.set("1001", remotePayment({ externalReference: reference }));

    expect(await notify("1001", "same-request")).toBe("processed");
    expect(await notify("1001", "same-request")).toBe("duplicate");
    expect(await notify("1001", "another-request")).toBe("processed");

    expect(await db.templatePurchase.count({ where: { userId: alice.id } })).toBe(1);
    expect(sent).toHaveLength(1); // un solo correo de confirmación
    const events = await db.webhookEvent.findMany();
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.status === "PROCESSED")).toBe(true);
  });

  it("rechaza un pago aprobado con un importe distinto al esperado", async () => {
    const reference = await checkout(alice);
    gateway.payments.set("1001", remotePayment({ externalReference: reference, amount: 1 }));

    await expect(notify("1001")).rejects.toBeInstanceOf(SuspiciousPaymentError);

    expect((await loadAccessContext(alice.id)).ownsPremiumPack).toBe(false);
    const event = await db.webhookEvent.findFirstOrThrow();
    expect(event.status).toBe("FAILED");
  });

  it("un pago ajeno o con referencia desconocida no otorga nada", async () => {
    gateway.payments.set(
      "2002",
      remotePayment({ id: "2002", externalReference: "pack_inexistente" }),
    );
    expect(await notify("2002")).toBe("ignored");
    gateway.payments.set("3003", remotePayment({ id: "3003", externalReference: "" }));
    expect(await notify("3003")).toBe("ignored");
    expect(await notify("9999")).toBe("ignored"); // el proveedor no lo conoce
    expect(await db.templatePurchase.count()).toBe(0);
  });

  it("no permite reutilizar el mismo pago del proveedor para otra compra", async () => {
    const refA = await checkout(alice);
    const refB = await checkout(bob);
    gateway.payments.set("1001", remotePayment({ externalReference: refA }));
    await notify("1001");
    gateway.payments.set("1001", remotePayment({ externalReference: refB }));
    await expect(notify("1001")).rejects.toBeInstanceOf(SuspiciousPaymentError);
    expect((await loadAccessContext(bob.id)).ownsPremiumPack).toBe(false);
  });

  it("un pago rechazado queda registrado sin activar la licencia", async () => {
    const reference = await checkout(alice);
    gateway.payments.set(
      "1001",
      remotePayment({ externalReference: reference, status: "rejected" }),
    );
    await notify("1001");
    expect(
      (await db.payment.findUniqueOrThrow({ where: { externalReference: reference } })).status,
    ).toBe("REJECTED");
    expect((await loadAccessContext(alice.id)).ownsPremiumPack).toBe(false);
  });

  it("un reembolso revoca la licencia", async () => {
    const reference = await checkout(alice);
    gateway.payments.set("1001", remotePayment({ externalReference: reference }));
    await notify("1001");
    expect((await loadAccessContext(alice.id)).ownsPremiumPack).toBe(true);

    gateway.payments.set(
      "1001",
      remotePayment({ externalReference: reference, status: "refunded" }),
    );
    await notify("1001");
    expect((await loadAccessContext(alice.id)).ownsPremiumPack).toBe(false);
  });

  it("no vende el pack dos veces", async () => {
    const reference = await checkout(alice);
    gateway.payments.set("1001", remotePayment({ externalReference: reference }));
    await notify("1001");
    await expect(startPackCheckout(alice)).rejects.toBeInstanceOf(AlreadyOwnedError);
  });

  it("si el proveedor falla al crear la preferencia no deja pagos huérfanos", async () => {
    gateway.failCreate = true;
    await expect(startPackCheckout(alice)).rejects.toThrow();
    expect(await db.payment.count({ where: { userId: alice.id } })).toBe(0);
  });

  it("sin credenciales de Mercado Pago el checkout queda deshabilitado", async () => {
    setGateway(null);
    await expect(startPackCheckout(alice)).rejects.toBeInstanceOf(PaymentsDisabledError);
  });

  it("los fallos de procesamiento permiten reintentar la misma entrega", async () => {
    const reference = await checkout(alice);
    gateway.payments.set("1001", remotePayment({ externalReference: reference, amount: 1 }));
    await expect(notify("1001", "retry-me")).rejects.toThrow();
    gateway.payments.set("1001", remotePayment({ externalReference: reference }));
    expect(await notify("1001", "retry-me")).toBe("processed");
    const event = await db.webhookEvent.findFirstOrThrow({
      where: { eventKey: "retry-me:payment:1001" },
    });
    expect(event).toMatchObject({ status: "PROCESSED", attempts: 2 });
    expect((await loadAccessContext(alice.id)).ownsPremiumPack).toBe(true);
  });
});
