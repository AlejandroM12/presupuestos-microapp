import { describe, expect, it } from "vitest";
import { parseCustomTemplateConfig } from "@/domain/custom-template/config";
import { defaultQuote } from "@/domain/quote/defaults";
import { quoteSchema, type Quote } from "@/domain/quote/schema";
import { extractPdfPages } from "./pdf-text";
import { renderQuotePdf } from "./render";

const config = parseCustomTemplateConfig({
  style: {
    accentColor: "#b91c1c",
    fontFamily: "serif",
    headerTitle: "Orden de trabajo",
    headerSubtitle: "Taller Rojas · Mecánica integral",
    footerText: "Garantía de 90 días sobre mano de obra.",
  },
  sections: [{ id: "vehiculo", title: "Datos del vehículo", position: 0 }],
  fields: [
    { id: "patente", label: "Patente", type: "text", sectionId: "vehiculo", position: 0 },
    { id: "km", label: "Kilometraje", type: "number", sectionId: "vehiculo", position: 1 },
    { id: "ingreso", label: "Fecha de ingreso", type: "date", sectionId: "vehiculo", position: 2 },
    { id: "seguro", label: "Cobertura de seguro", type: "checkbox", position: 3 },
    { id: "interno", label: "Nota interna", type: "text", showInPdf: false, position: 4 },
  ],
});

function quote(itemCount: number, values: Quote["customFieldValues"]): Quote {
  const q = defaultQuote(new Date(2026, 4, 10));
  q.title = "Service completo";
  q.issuer = { ...q.issuer, businessName: "Taller Rojas" };
  q.customer = { ...q.customer, name: "Juan Pérez" };
  q.items = Array.from({ length: itemCount }, (_, i) => ({
    id: `i${i}`,
    description: `Tarea ${i + 1}`,
    quantity: "1",
    unit: "Unidad",
    unitPrice: "1000",
    discountPercent: "0",
  }));
  return { ...quoteSchema.parse(q), customFieldValues: values };
}

const render = (q: Quote, over = {}) =>
  renderQuotePdf(q, {
    templateId: "11111111-1111-4111-8111-111111111111",
    showBrand: false,
    allowCustomColor: true,
    custom: { name: "Taller Rojas", ...config },
    ...over,
  });

describe("plantilla privada", () => {
  it("dibuja encabezado, campos personalizados por sección y pie propios, sin marca", async () => {
    const pdf = await render(
      quote(3, {
        patente: "AB123CD",
        km: 85000,
        ingreso: "2026-05-02",
        seguro: true,
        interno: "secreto",
      }),
    );
    const text = (await extractPdfPages(pdf)).join(" ");
    const compact = text.replace(/\s/g, "").toUpperCase();
    expect(compact).toContain("ORDENDETRABAJO");
    expect(text).toContain("Taller Rojas · Mecánica integral");
    expect(compact).toContain("DATOSDELVEHÍCULO");
    expect(text).toContain("AB123CD");
    expect(text).toContain("85000");
    expect(text).toContain("02/05/2026");
    expect(text).toContain("Cobertura de seguro");
    expect(text).toContain("Garantía de 90 días");
    expect(text).not.toContain("secreto");
    expect(text).not.toContain("Creado con AtajoLab");
  });

  it("omite los campos vacíos y pagina con muchos conceptos", async () => {
    const pdf = await render(quote(80, { patente: "AB123CD" }));
    const pages = await extractPdfPages(pdf);
    expect(pages.length).toBeGreaterThan(1);
    const text = pages.join(" ");
    expect(text).not.toContain("Kilometraje");
    pages.forEach((p, i) => expect(p).toContain(`Página ${i + 1} de ${pages.length}`));
  });
});
