import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("./legal-data");
});

describe("textos legales", () => {
  it("con los datos vacíos todas las páginas con campos pendientes quedan marcadas como borrador", async () => {
    const legal = await import("./legal");
    expect(legal.pendingLegalFields().length).toBeGreaterThanOrEqual(10);
    expect(legal.LEGAL_PAGES.some((p) => !legal.isLegalPageComplete(p))).toBe(true);
    // Los hechos técnicos verificados no quedan como pendientes
    expect(legal.pendingLegalFields().join(" ")).not.toContain("retención de backups");
    expect(JSON.stringify(legal.LEGAL_PAGES)).toContain("Falkenstein (Alemania)");
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
    expect(text).toContain("valor-holderName (CUIT 20-00000000-0)");
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
