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
});
