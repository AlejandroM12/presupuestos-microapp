import { describe, expect, it } from "vitest";
import { defaultQuote, validUntil } from "./defaults";
import { quoteSchema, type QuoteDraft } from "./schema";

function valid(): QuoteDraft {
  const q = defaultQuote(new Date(2026, 0, 15));
  q.title = "Instalación eléctrica";
  q.issuer.businessName = "Electro Sur";
  q.customer.name = "Laura";
  q.items[0] = { ...q.items[0], description: "Tablero", unitPrice: "1000" };
  return q;
}

describe("quoteSchema", () => {
  it("acepta un presupuesto completo", () => {
    expect(quoteSchema.safeParse(valid()).success).toBe(true);
  });

  it("exige emisor, cliente, título y conceptos", () => {
    const q = valid();
    q.issuer.businessName = "";
    q.customer.name = "";
    q.title = "";
    q.items = [];
    const r = quoteSchema.safeParse(q);
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining(["issuer.businessName", "customer.name", "title", "items"]),
    );
  });

  it("rechaza cantidades en cero, precios negativos y descuentos fuera de rango", () => {
    const q = valid();
    q.items[0] = { ...q.items[0], quantity: "0", unitPrice: "-1", discountPercent: "101" };
    const r = quoteSchema.safeParse(q);
    expect(r.success).toBe(false);
    expect(r.error!.issues.length).toBeGreaterThanOrEqual(3);
  });

  it("rechaza texto no numérico en importes", () => {
    const q = valid();
    q.items[0] = { ...q.items[0], unitPrice: "mil" };
    expect(quoteSchema.safeParse(q).success).toBe(false);
  });

  it("valida emails, CUIT y monedas", () => {
    const q = valid();
    q.customer.email = "no-es-email";
    q.issuer.taxId = "123";
    expect(quoteSchema.safeParse(q).success).toBe(false);
    const ok = valid();
    ok.issuer.taxId = "20-12345678-9";
    ok.customer.email = "laura@example.com";
    expect(quoteSchema.safeParse(ok).success).toBe(true);
    const bad = { ...valid(), currency: "EUR" as never };
    expect(quoteSchema.safeParse(bad).success).toBe(false);
  });

  it("limita porcentajes de ajustes a 100", () => {
    const q = valid();
    q.globalDiscount = { type: "percent", value: "120" };
    expect(quoteSchema.safeParse(q).success).toBe(false);
    q.globalDiscount = { type: "fixed", value: "120" };
    expect(quoteSchema.safeParse(q).success).toBe(true);
  });

  it("limita la cantidad de conceptos", () => {
    const q = valid();
    q.items = Array.from({ length: 201 }, (_, i) => ({ ...q.items[0], id: `i${i}` }));
    expect(quoteSchema.safeParse(q).success).toBe(false);
  });
});

describe("validUntil", () => {
  it("suma días a la fecha, cruzando meses", () => {
    expect(validUntil("2026-01-15", 30)).toBe("2026-02-14");
    expect(validUntil("2026-12-20", 15)).toBe("2027-01-04");
  });
});
