import { describe, expect, it } from "vitest";
import { parseCustomTemplateConfig, validateCustomFieldValues } from "./config";

describe("custom template config", () => {
  it("acepta una configuración declarativa válida", () => {
    const cfg = parseCustomTemplateConfig({
      style: { accentColor: "#0f766e", footerText: "Garantía 90 días" },
      sections: [{ id: "vehiculo", title: "Vehículo", position: 0 }],
      fields: [
        {
          id: "patente",
          label: "Patente",
          type: "text",
          required: true,
          sectionId: "vehiculo",
          position: 0,
        },
        {
          id: "km",
          label: "Kilometraje",
          type: "number",
          min: 0,
          position: 1,
        },
      ],
    });
    expect(cfg.fields).toHaveLength(2);
    expect(cfg.style.accentColor).toBe("#0f766e");
  });

  it("rechaza identificadores inseguros", () => {
    expect(() =>
      parseCustomTemplateConfig({
        fields: [{ id: "Patente!", label: "X", type: "text" }],
      }),
    ).toThrow();
  });

  it("valida valores obligatorios y tipos", () => {
    const fields = parseCustomTemplateConfig({
      fields: [
        { id: "patente", label: "Patente", type: "text", required: true },
        { id: "km", label: "Km", type: "number", min: 0 },
        { id: "tipo", label: "Tipo", type: "select", options: ["Service", "Reparación"] },
      ],
    }).fields;

    expect(validateCustomFieldValues(fields, {})).toMatchObject({
      ok: false,
      errors: { patente: "Campo obligatorio" },
    });

    const ok = validateCustomFieldValues(fields, {
      patente: "AB123CD",
      km: "12000",
      tipo: "Service",
    });
    expect(ok).toEqual({
      ok: true,
      values: { patente: "AB123CD", km: 12000, tipo: "Service" },
    });
  });

  it("las opciones estructurales nuevas son opcionales y tienen valores por defecto", () => {
    const cfg = parseCustomTemplateConfig({ fields: [{ id: "a", label: "A", type: "text" }] });
    expect(cfg.style).toMatchObject({
      headerVariant: "classic",
      tableStyle: "tinted",
      totalsStyle: "bar",
      sectionColumns: 1,
      showTerms: true,
      approval: false,
    });
    expect(cfg.fields[0]).toMatchObject({ highlight: false });
  });

  it("acepta variantes válidas y rechaza valores desconocidos", () => {
    expect(
      parseCustomTemplateConfig({
        style: {
          headerVariant: "banner",
          tableStyle: "grid",
          totalsStyle: "box",
          sectionColumns: 2,
        },
        sections: [{ id: "s", title: "S", columns: 2 }],
      }).style.headerVariant,
    ).toBe("banner");
    expect(() => parseCustomTemplateConfig({ style: { headerVariant: "<script>" } })).toThrow();
    expect(() => parseCustomTemplateConfig({ style: { tableStyle: "fancy" } })).toThrow();
    expect(() => parseCustomTemplateConfig({ style: { sectionColumns: 3 } })).toThrow();
  });

  it("limita las fichas destacadas a 4 y el anticipo a un único importe", () => {
    const f = (id: string) => ({ id, label: id, type: "text", highlight: true });
    expect(() => parseCustomTemplateConfig({ fields: ["a", "b", "c", "d", "e"].map(f) })).toThrow(
      /fichas/,
    );
    expect(() =>
      parseCustomTemplateConfig({
        fields: [{ id: "x", label: "X", type: "text", role: "advance" }],
      }),
    ).toThrow(/anticipo/);
    expect(() =>
      parseCustomTemplateConfig({
        fields: [
          { id: "x", label: "X", type: "money", role: "advance" },
          { id: "y", label: "Y", type: "money", role: "advance" },
        ],
      }),
    ).toThrow(/anticipo/);
    expect(
      parseCustomTemplateConfig({
        fields: [{ id: "x", label: "X", type: "money", role: "advance" }],
      }).fields[0].role,
    ).toBe("advance");
  });
});
