import { describe, expect, it } from "vitest";
import { defaultQuote } from "./defaults";
import { quoteSchema } from "./schema";
import { buildWhatsappMessage, buildWhatsappUrl, normalizePhoneForWhatsapp } from "./whatsapp";

function quote() {
  const q = defaultQuote(new Date(2026, 0, 15));
  q.title = "Instalación eléctrica";
  q.description = "Cableado completo";
  q.issuer.businessName = "Electro Sur";
  q.issuer.professionalName = "Marcos Gómez";
  q.customer.name = "Laura";
  q.items[0] = { ...q.items[0], description: "x", unitPrice: "10" };
  return quoteSchema.parse(q);
}

describe("buildWhatsappMessage", () => {
  it("incluye profesional, cliente, número, descripción, total, moneda y validez", () => {
    const msg = buildWhatsappMessage({ quote: quote(), total: "1234.5", currency: "ARS" });
    expect(msg).toContain("Laura");
    expect(msg).toContain("N.º 0001");
    expect(msg).toContain("Instalación eléctrica");
    expect(msg).toContain("Cableado completo");
    expect(msg).toContain("$ 1.234,50 (ARS)");
    expect(msg).toContain("30/01/2026");
    expect(msg).toContain("Marcos Gómez");
  });

  it("usa US$ para dólares", () => {
    const msg = buildWhatsappMessage({ quote: quote(), total: "100", currency: "USD" });
    expect(msg).toContain("US$ 100,00 (USD)");
  });
});

describe("whatsapp url", () => {
  it("normaliza teléfonos argentinos", () => {
    expect(normalizePhoneForWhatsapp("+54 9 11 5555-1234")).toBe("5491155551234");
    expect(normalizePhoneForWhatsapp("011 15 5555-1234")).toBe("541155551234");
    expect(normalizePhoneForWhatsapp("123")).toBeNull();
  });

  it("codifica el mensaje y usa wa.me", () => {
    const url = buildWhatsappUrl("Hola & chau", "+54 9 11 5555-1234");
    expect(url).toBe("https://wa.me/5491155551234?text=Hola%20%26%20chau");
  });

  it("sin teléfono abre el selector de contactos", () => {
    expect(buildWhatsappUrl("Hola")).toBe("https://wa.me/?text=Hola");
  });
});
