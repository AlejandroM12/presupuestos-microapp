import { describe, expect, it } from "vitest";
import { formatCount, formatQuantity, formatUnit } from "./units";

describe("formatQuantity", () => {
  it("pluraliza las unidades conocidas según la cantidad", () => {
    expect(formatQuantity("1", "Unidad")).toBe("1 unidad");
    expect(formatQuantity("2", "Unidad")).toBe("2 unidades");
    expect(formatQuantity("12", "bolsa")).toBe("12 bolsas");
    expect(formatQuantity("1", "Servicio")).toBe("1 servicio");
    expect(formatQuantity("12", "jornal")).toBe("12 jornales");
    expect(formatQuantity("3,5", "Hora")).toBe("3,5 horas");
    expect(formatQuantity("1", "Día")).toBe("1 día");
  });

  it("abrevia las unidades de medida y no las pluraliza", () => {
    expect(formatQuantity("3", "Metro")).toBe("3 m");
    expect(formatQuantity("38", "Metro cuadrado")).toBe("38 m²");
    expect(formatQuantity("38", "m2")).toBe("38 m²");
    expect(formatQuantity("0.8", "Kilogramo")).toBe("0,8 kg");
    expect(formatQuantity("1", "gl")).toBe("1 gl");
    expect(formatQuantity("80450", "km")).toBe("80.450 km");
  });

  it("respeta las unidades personalizadas tal como se escribieron", () => {
    expect(formatQuantity("2", "Pack x6")).toBe("2 Pack x6");
    expect(formatQuantity("3", "Tanda de pintura")).toBe("3 Tanda de pintura");
    expect(formatUnit("  Rollo mayorista ", 5)).toBe("Rollo mayorista");
  });

  it("formatea los decimales con coma y el separador de miles solo desde 10.000", () => {
    expect(formatCount(2021)).toBe("2021");
    expect(formatCount(1500)).toBe("1500");
    expect(formatCount(12000)).toBe("12.000");
    expect(formatCount(2.5)).toBe("2,5");
  });

  it("no rompe con cantidades no numéricas", () => {
    expect(formatQuantity("varios", "Unidad")).toBe("varios Unidad");
  });
});
