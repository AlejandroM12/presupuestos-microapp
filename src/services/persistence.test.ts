import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ANONYMOUS, computeEntitlements } from "@/domain/entitlements";
import { defaultQuote } from "@/domain/quote/defaults";
import type { QuoteDraft } from "@/domain/quote/schema";
import { db } from "@/server/db";
import { loadAccessContext, recordDownload } from "./access";
import { getBusinessProfile, saveBusinessProfile } from "./business-profile";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "./customers";
import {
  createQuote,
  deleteQuote,
  duplicateQuote,
  getQuote,
  listQuotes,
  NotFoundError,
  nextQuoteNumber,
  quoteStats,
  setQuoteStatus,
  updateQuote,
} from "./quotes";

const enabled = !!process.env.TEST_DATABASE_URL;
const DOMAIN = "@persist-test.example";

function sample(over: Partial<QuoteDraft> = {}): QuoteDraft {
  const q = defaultQuote(new Date(2026, 4, 10));
  q.title = "Instalación eléctrica";
  q.number = "0007";
  q.issuer = { ...q.issuer, businessName: "Electro Sur", email: "info@electrosur.com" };
  q.customer = { ...q.customer, name: "Laura Benítez", company: "La Espiga" };
  q.items = [
    {
      id: "a",
      description: "Tablero",
      quantity: "2,5",
      unit: "Unidad",
      unitPrice: "1234.5678",
      discountPercent: "10",
    },
    {
      id: "b",
      description: "Mano de obra",
      quantity: "8",
      unit: "Hora",
      unitPrice: "9800",
      discountPercent: "0",
    },
  ];
  q.taxes = [{ id: "iva", label: "IVA", type: "percent", value: "21" }];
  q.templateId = "minimalista";
  return { ...q, ...over };
}

describe.skipIf(!enabled)("persistencia de presupuestos (PostgreSQL)", () => {
  let alice: string;
  let bob: string;

  beforeAll(async () => {
    const mk = (n: string) =>
      db.user.create({ data: { email: `${n}${DOMAIN}`, passwordHash: "x" }, select: { id: true } });
    alice = (await mk("alice")).id;
    bob = (await mk("bob")).id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  });

  it("guarda importes con precisión decimal y recupera el borrador sin pérdida", async () => {
    const { id } = await createQuote(alice, sample());
    const row = await db.quote.findUniqueOrThrow({ where: { id } });
    // 2,5 x 1234,5678 = 3086,4195 -> 3086,42; -10 % = 308,64 => 2777,78; + 78400,00 de mano de obra
    expect(row.subtotal.toFixed(2)).toBe("81177.78");
    expect(row.taxTotal.toFixed(2)).toBe("17047.33");
    expect(row.total.toFixed(2)).toBe("98225.11");

    const { draft } = await getQuote(alice, id);
    expect(draft.items[0]).toMatchObject({
      quantity: "2.5",
      unitPrice: "1234.5678",
      discountPercent: "10",
    });
    expect(draft.items[1]).toMatchObject({
      quantity: "8",
      unitPrice: "9800",
      discountPercent: "0",
    });
    expect(draft.taxes).toEqual([{ id: "iva", label: "IVA", type: "percent", value: "21" }]);
    expect(draft.date).toBe("2026-05-10");
  });

  it("conserva los snapshots aunque el cliente cambie o se elimine", async () => {
    const customer = await createCustomer(alice, { name: "Laura Benítez", company: "La Espiga" });
    const { id } = await createQuote(alice, sample(), { customerId: customer.id });

    await updateCustomer(alice, customer.id, { name: "Laura Gómez", company: "Otra empresa" });
    let { draft } = await getQuote(alice, id);
    expect(draft.customer.name).toBe("Laura Benítez");

    await deleteCustomer(alice, customer.id);
    const after = await getQuote(alice, id);
    expect(after.customerId).toBeNull();
    draft = after.draft;
    expect(draft.customer.company).toBe("La Espiga");
  });

  it("no permite leer, editar, borrar ni cambiar el estado de presupuestos ajenos", async () => {
    const { id } = await createQuote(alice, sample({ title: "Privado de Alice" }));

    await expect(getQuote(bob, id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(updateQuote(bob, id, sample({ title: "Hackeado" }))).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(deleteQuote(bob, id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setQuoteStatus(bob, id, "ACCEPTED")).rejects.toBeInstanceOf(NotFoundError);
    await expect(duplicateQuote(bob, id)).rejects.toBeInstanceOf(NotFoundError);

    const intact = await getQuote(alice, id);
    expect(intact.draft.title).toBe("Privado de Alice");
    expect(intact.status).toBe("DRAFT");
    expect((await listQuotes(bob)).items.find((q) => q.id === id)).toBeUndefined();
  });

  it("no permite vincular un cliente de otro usuario", async () => {
    const bobsCustomer = await createCustomer(bob, { name: "Cliente de Bob" });
    await expect(
      createQuote(alice, sample(), { customerId: bobsCustomer.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(getCustomer(alice, bobsCustomer.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteCustomer(alice, bobsCustomer.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await listCustomers(alice, "Cliente de Bob")).toHaveLength(0);
  });

  it("actualiza un presupuesto reemplazando sus conceptos", async () => {
    const { id } = await createQuote(alice, sample());
    const edited = sample({ title: "Editado" });
    edited.items = [edited.items[1]];
    await updateQuote(alice, id, edited);
    const { draft } = await getQuote(alice, id);
    expect(draft.title).toBe("Editado");
    expect(draft.items).toHaveLength(1);
    expect(await db.quoteItem.count({ where: { quoteId: id } })).toBe(1);
  });

  it("rechaza datos inválidos sin tocar la base", async () => {
    const bad = sample();
    bad.items[0].quantity = "0";
    await expect(createQuote(alice, bad)).rejects.toThrow();
  });

  it("duplica como borrador con número nuevo y fecha de hoy", async () => {
    const { id } = await createQuote(bob, sample({ number: "0010" }));
    await setQuoteStatus(bob, id, "ACCEPTED");
    const copy = await duplicateQuote(bob, id, new Date("2026-08-01T12:00:00Z"));
    const original = await getQuote(bob, id);
    const duplicated = await getQuote(bob, copy.id);
    expect(duplicated.status).toBe("DRAFT");
    expect(duplicated.draft.date).toBe("2026-08-01");
    expect(duplicated.draft.number).not.toBe(original.draft.number);
    expect(duplicated.draft.items.map((i) => i.description)).toEqual(
      original.draft.items.map((i) => i.description),
    );
    expect(duplicated.draft.items[0].id).not.toBe(original.draft.items[0].id);
  });

  it("calcula el siguiente número correlativo por usuario", async () => {
    const carol = (await db.user.create({ data: { email: `carol${DOMAIN}`, passwordHash: "x" } }))
      .id;
    expect(await nextQuoteNumber(carol)).toBe("0001");
    await createQuote(carol, sample({ number: "0042" }));
    await createQuote(carol, sample({ number: "ABC-1" }));
    expect(await nextQuoteNumber(carol)).toBe("0043");
  });

  it("lista con búsqueda, filtro por estado y paginación", async () => {
    const dave = (await db.user.create({ data: { email: `dave${DOMAIN}`, passwordHash: "x" } })).id;
    const a = await createQuote(dave, sample({ title: "Cocina nueva", number: "1" }));
    await createQuote(dave, sample({ title: "Baño completo", number: "2" }));
    await createQuote(dave, sample({ title: "Pintura", number: "3" }));
    await setQuoteStatus(dave, a.id, "SENT");

    expect((await listQuotes(dave)).total).toBe(3);
    expect((await listQuotes(dave, { search: "cocina" })).items.map((q) => q.title)).toEqual([
      "Cocina nueva",
    ]);
    expect((await listQuotes(dave, { search: "benítez" })).total).toBe(3);
    expect((await listQuotes(dave, { status: "SENT" })).total).toBe(1);
    const page = await listQuotes(dave, { pageSize: 2, page: 2 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(3);
  });

  it("calcula estadísticas sin mezclar monedas", async () => {
    const erin = (await db.user.create({ data: { email: `erin${DOMAIN}`, passwordHash: "x" } })).id;
    const ars = sample();
    ars.items = [{ ...ars.items[1], unitPrice: "1000", quantity: "1" }];
    ars.taxes = [];
    const usd = { ...ars, currency: "USD" as const };
    const q1 = await createQuote(erin, ars);
    const q2 = await createQuote(erin, ars);
    await createQuote(erin, usd);
    await setQuoteStatus(erin, q1.id, "ACCEPTED");
    await setQuoteStatus(erin, q2.id, "REJECTED");

    expect(await quoteStats(erin)).toEqual({
      total: 3,
      pending: 1,
      accepted: 1,
      rejected: 1,
      amountByCurrency: { ARS: "2000.00", USD: "1000.00" },
    });
  });

  it("guarda y actualiza el perfil del negocio por usuario", async () => {
    expect(await getBusinessProfile(alice)).toBeNull();
    await saveBusinessProfile(alice, { businessName: "Electro Sur", accentColor: "#0f766e" });
    await saveBusinessProfile(alice, { businessName: "Electro Sur SRL", accentColor: "#0f766e" });
    expect((await getBusinessProfile(alice))?.businessName).toBe("Electro Sur SRL");
    expect(await getBusinessProfile(bob)).toBeNull();
    await expect(
      saveBusinessProfile(alice, { businessName: "", accentColor: "rojo" }),
    ).rejects.toThrow();
  });
});

describe.skipIf(!enabled)("contexto de acceso (PostgreSQL)", () => {
  let userId: string;
  const now = new Date("2026-06-15T12:00:00Z");

  beforeAll(async () => {
    userId = (await db.user.create({ data: { email: `acc${DOMAIN}`, passwordHash: "x" } })).id;
  });
  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  });

  it("un usuario nuevo está en el plan gratuito", async () => {
    const ctx = await loadAccessContext(userId, now);
    expect(ctx).toEqual({
      authenticated: true,
      ownsPremiumPack: false,
      proActive: false,
      downloadsThisMonth: 0,
    });
    expect(computeEntitlements(ctx).templates).toEqual(["minimalista"]);
    expect(computeEntitlements(ANONYMOUS).authenticated).toBe(false);
  });

  it("cuenta solo las descargas del mes en curso", async () => {
    await recordDownload(userId, "minimalista", new Date("2026-05-31T23:00:00Z"));
    await recordDownload(userId, "minimalista", now);
    await recordDownload(userId, "minimalista", now);
    expect((await loadAccessContext(userId, now)).downloadsThisMonth).toBe(2);
    expect(computeEntitlements(await loadAccessContext(userId, now)).downloadsRemaining).toBe(1);
  });

  it("reconoce la compra del pack y la suscripción vigente (incluso cancelada)", async () => {
    const payment = await db.payment.create({
      data: {
        userId,
        kind: "PREMIUM_PACK",
        externalReference: `ref-${userId}`,
        amount: "9900",
        status: "APPROVED",
      },
    });
    await db.templatePurchase.create({
      data: { userId, product: "premium_pack", paymentId: payment.id },
    });
    expect((await loadAccessContext(userId, now)).ownsPremiumPack).toBe(true);

    const sub = await db.subscription.create({
      data: {
        userId,
        plan: "MONTHLY",
        status: "CANCELLED",
        currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
      },
    });
    expect((await loadAccessContext(userId, now)).proActive).toBe(true);
    await db.subscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: new Date("2026-06-01T00:00:00Z") },
    });
    expect((await loadAccessContext(userId, now)).proActive).toBe(false);
  });
});
