import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("./legal-data");
});

describe("textos legales", () => {
  it("los datos confirmados figuran y los pendientes quedan visibles sin declararse", async () => {
    const legal = await import("./legal");
    const pending = legal.pendingLegalFields().join(" | ");
    // Pendientes: no se inventan ni se declaran sin verificar
    for (const hint of ["CUIT", "condición frente a ARCA", "domicilio legal", "IVA", "AAIP"]) {
      expect(pending).toContain(hint);
    }
    expect(legal.pendingLegalFields()).toHaveLength(5);
    const text = JSON.stringify(legal.LEGAL_PAGES);
    // Confirmados
    expect(text).toContain("Axel Alejandro Morel, que opera bajo el nombre comercial AtajoLab");
    expect(text).toContain("atajolab.tools@gmail.com");
    expect(text).toContain("ciudad de Formosa");
    expect(text).toContain("Ley 24.240");
    expect(text).toContain("30 días corridos");
    expect(text).toContain("10 años");
    expect(text).toContain("no tiene renovación ni vencimiento programado");
    expect(text).toContain("Falkenstein (Alemania)");
    // No se afirma inscripción ni exención ante la AAIP
    expect(text).not.toMatch(/inscript[oa] ante la AAIP|exent[oa]/i);
    // Mientras haya pendientes, las páginas afectadas siguen como borrador
    expect(legal.LEGAL_PAGES.some((p) => !legal.isLegalPageComplete(p))).toBe(true);
  });

  it("al completar los datos del titular desaparecen los marcadores y las páginas quedan completas", async () => {
    vi.doMock("./legal-data", async (orig) => {
      const real = await orig<typeof import("./legal-data")>();
      const full = Object.fromEntries(
        Object.keys(real.LEGAL_DATA).map((k) => [k, `valor-${k}`]),
      ) as unknown as typeof real.LEGAL_DATA;
      return { ...real, LEGAL_DATA: { ...full, taxId: "20-00000000-0" } };
    });
    const legal = await import("./legal");
    expect(legal.pendingLegalFields()).toEqual([]);
    expect(legal.LEGAL_PAGES.every((p) => legal.isLegalPageComplete(p))).toBe(true);
    const text = JSON.stringify(legal.LEGAL_PAGES);
    expect(text).toContain(
      "valor-holderName, que opera bajo el nombre comercial valor-tradeName, CUIT 20-00000000-0, condición frente a ARCA: valor-taxStatus, con domicilio legal en valor-address",
    );
    expect(text).toContain("valor-jurisdiction");
    expect(text).not.toContain("COMPLETAR");
  });

  it("los precios de los textos coinciden con la configuración", async () => {
    const { LEGAL_PAGES } = await import("./legal");
    const { PRICING } = await import("@/lib/config/plans");
    const { formatArs } = await import("@/lib/format");
    const text = JSON.stringify(LEGAL_PAGES);
    for (const price of [PRICING.premiumPack, PRICING.proMonthly, PRICING.proYearly]) {
      expect(text).toContain(formatArs(price));
    }
  });
});
