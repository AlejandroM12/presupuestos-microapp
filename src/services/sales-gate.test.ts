import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setGateway } from "@/integrations/mercadopago";
import { FakeGateway } from "@/integrations/mercadopago/test-helpers";
import { db } from "@/server/db";
import { deleteTestUsers } from "@/test/cleanup";
import { SalesClosedError, startPackCheckout } from "./billing";
import { startSubscriptionCheckout } from "./subscriptions";

const enabled = !!process.env.TEST_DATABASE_URL;
const DOMAIN = "@sales-gate-test.example";

describe.skipIf(!enabled)("compuerta comercial en el servidor", () => {
  const gateway = new FakeGateway();
  const original = { open: process.env.SALES_ENABLED, list: process.env.SALES_ALLOWLIST };
  let owner: { id: string; email: string };
  let stranger: { id: string; email: string };

  beforeAll(async () => {
    const mk = async (n: string) => {
      const email = `${n}${DOMAIN}`;
      const u = await db.user.create({ data: { email, passwordHash: "x" }, select: { id: true } });
      return { id: u.id, email };
    };
    owner = await mk("owner");
    stranger = await mk("stranger");
    setGateway(gateway);
  });

  afterEach(async () => {
    delete process.env.SALES_ENABLED;
    delete process.env.SALES_ALLOWLIST;
    gateway.preferences.length = 0;
    await db.payment.deleteMany({ where: { userId: { in: [owner.id, stranger.id] } } });
    await db.subscription.deleteMany({ where: { userId: { in: [owner.id, stranger.id] } } });
  });

  afterAll(async () => {
    setGateway(undefined);
    if (original.open !== undefined) process.env.SALES_ENABLED = original.open;
    if (original.list !== undefined) process.env.SALES_ALLOWLIST = original.list;
    await deleteTestUsers(DOMAIN);
  });

  it("con las ventas cerradas nadie puede iniciar un cobro, aunque haya credenciales", async () => {
    await expect(startPackCheckout(owner)).rejects.toBeInstanceOf(SalesClosedError);
    await expect(startSubscriptionCheckout(owner, "MONTHLY")).rejects.toBeInstanceOf(
      SalesClosedError,
    );
    // No se toca el proveedor ni se crean registros de pago
    expect(gateway.preferences).toHaveLength(0);
    expect(await db.payment.count({ where: { userId: owner.id } })).toBe(0);
    expect(await db.subscription.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("la lista de cuentas autorizadas permite la compra real controlada solo a esas cuentas", async () => {
    process.env.SALES_ALLOWLIST = owner.email.toUpperCase();
    await expect(startPackCheckout(stranger)).rejects.toBeInstanceOf(SalesClosedError);
    const { url } = await startPackCheckout(owner);
    expect(url).toContain("pack_");
    expect(gateway.preferences).toHaveLength(1);
  });

  it("con SALES_ENABLED=true cualquier cuenta puede comprar", async () => {
    process.env.SALES_ENABLED = "true";
    await expect(startPackCheckout(stranger)).resolves.toHaveProperty("url");
  });

  it("los importes siguen saliendo de la configuración y no cambian con la compuerta", async () => {
    process.env.SALES_ENABLED = "true";
    await startPackCheckout(owner);
    expect(Number(gateway.preferences[0].amount)).toBe(9900);
  });
});
