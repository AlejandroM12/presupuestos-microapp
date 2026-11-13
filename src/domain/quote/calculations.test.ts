import { describe, expect, it } from "vitest";
import { calculateLine, calculateTotals } from "./calculations";
import type { CalculationInput, QuoteItemInput } from "./types";

const item = (over: Partial<QuoteItemInput> = {}): QuoteItemInput => ({
  id: "i",
  description: "x",
  quantity: "1",
  unit: "Unidad",
  unitPrice: "0",
  discountPercent: "0",
  ...over,
});

const base = (over: Partial<CalculationInput> = {}): CalculationInput => ({
  items: [],
  globalDiscount: { type: "percent", value: "0" },
  surcharge: { type: "percent", value: "0" },
  taxes: [],
  ...over,
});

describe("calculateLine", () => {
  it("multiplica cantidad por precio", () => {
    expect(calculateLine(item({ quantity: "3", unitPrice: "1500" })).amount).toBe("4500.00");
  });

  it("evita errores de punto flotante (0.1 x 3)", () => {
    expect(calculateLine(item({ quantity: "3", unitPrice: "0.1" })).amount).toBe("0.30");
    expect(calculateLine(item({ quantity: "1.1", unitPrice: "1.1" })).amount).toBe("1.21");
  });

  it("acepta coma decimal", () => {
    expect(calculateLine(item({ quantity: "2,5", unitPrice: "10,10" })).amount).toBe("25.25");
  });

  it("aplica el descuento del concepto", () => {
    const l = calculateLine(item({ quantity: "2", unitPrice: "500", discountPercent: "10" }));
    expect(l).toMatchObject({ gross: "1000.00", discount: "100.00", amount: "900.00" });
  });

  it("redondea half-up a 2 decimales", () => {
    expect(calculateLine(item({ quantity: "1", unitPrice: "0.125" })).amount).toBe("0.13");
    expect(calculateLine(item({ quantity: "1", unitPrice: "0.124" })).amount).toBe("0.12");
  });

  it("trata entradas inválidas como cero y limita el descuento a 0-100", () => {
    expect(calculateLine(item({ quantity: "abc", unitPrice: "10" })).amount).toBe("0.00");
    expect(calculateLine(item({ unitPrice: "100", discountPercent: "150" })).amount).toBe("0.00");
    expect(calculateLine(item({ unitPrice: "100", discountPercent: "-5" })).amount).toBe("100.00");
  });
});

describe("calculateTotals", () => {
  it("suma el subtotal de varios conceptos", () => {
    const t = calculateTotals(
      base({ items: [item({ unitPrice: "100.10" }), item({ id: "j", unitPrice: "200.20" })] }),
    );
    expect(t.subtotal).toBe("300.30");
    expect(t.total).toBe("300.30");
  });

  it("sin conceptos el total es cero", () => {
    expect(calculateTotals(base()).total).toBe("0.00");
  });

  it("aplica descuento global porcentual", () => {
    const t = calculateTotals(
      base({
        items: [item({ unitPrice: "1000" })],
        globalDiscount: { type: "percent", value: "15" },
      }),
    );
    expect(t.globalDiscount).toBe("150.00");
    expect(t.total).toBe("850.00");
  });

  it("aplica descuento global fijo sin superar el subtotal", () => {
    const t = calculateTotals(
      base({
        items: [item({ unitPrice: "100" })],
        globalDiscount: { type: "fixed", value: "500" },
      }),
    );
    expect(t.globalDiscount).toBe("100.00");
    expect(t.total).toBe("0.00");
  });

  it("aplica el recargo sobre el subtotal con descuento", () => {
    const t = calculateTotals(
      base({
        items: [item({ unitPrice: "1000" })],
        globalDiscount: { type: "percent", value: "10" },
        surcharge: { type: "percent", value: "10" },
      }),
    );
    expect(t.surcharge).toBe("90.00");
    expect(t.taxableBase).toBe("990.00");
  });

  it("calcula impuestos manuales sobre la base imponible", () => {
    const t = calculateTotals(
      base({
        items: [item({ unitPrice: "1000" })],
        taxes: [
          { id: "iva", label: "IVA", type: "percent", value: "21" },
          { id: "otro", label: "Tasa", type: "fixed", value: "15.50" },
        ],
      }),
    );
    expect(t.taxes.map((x) => x.amount)).toEqual(["210.00", "15.50"]);
    expect(t.taxTotal).toBe("225.50");
    expect(t.total).toBe("1225.50");
  });

  it("el total coincide con la suma de sus partes redondeadas", () => {
    const t = calculateTotals(
      base({
        items: [item({ quantity: "3", unitPrice: "33.33" }), item({ id: "j", unitPrice: "0.01" })],
        taxes: [{ id: "iva", label: "IVA", type: "percent", value: "21" }],
        surcharge: { type: "percent", value: "3.5" },
      }),
    );
    expect(t.subtotal).toBe("100.00");
    expect(t.surcharge).toBe("3.50");
    expect(t.taxes[0].amount).toBe("21.74");
    expect(t.total).toBe("125.24");
  });

  it("maneja importes grandes sin perder precisión", () => {
    const t = calculateTotals(
      base({ items: [item({ quantity: "1000000", unitPrice: "999999999.99" })] }),
    );
    expect(t.total).toBe("999999999990000.00");
  });
});
