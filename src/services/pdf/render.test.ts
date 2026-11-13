import { describe, expect, it } from "vitest";
import { defaultQuote } from "@/domain/quote/defaults";
import { quoteSchema, type Quote } from "@/domain/quote/schema";
import { buildPdfModel, pdfFileName } from "./model";
import { extractPdfPages } from "./pdf-text";
import { renderQuotePdf } from "./render";

function sampleQuote(itemCount = 3, over: Partial<Quote> = {}): Quote {
  const q = defaultQuote(new Date(2026, 4, 10));
  q.title = "Instalación eléctrica completa";
  q.description = "Cableado, tablero y puesta a tierra del local comercial.";
  q.issuer = {
    ...q.issuer,
    businessName: "Electro Sur",
    professionalName: "Marcos Gómez",
    email: "marcos@electrosur.com",
    phone: "+54 11 4444-5555",
    taxId: "20-12345678-9",
  };
  q.customer = { ...q.customer, name: "Laura Benítez", company: "Panadería La Espiga" };
  q.notes = "Los materiales se facturan por separado.";
  q.terms = "El presupuesto no incluye trabajos de albañilería.";
  q.paymentTerms = "50% al aprobar, 50% al finalizar";
  q.items = Array.from({ length: itemCount }, (_, i) => ({
    id: `i${i}`,
    description: `Concepto número ${i + 1} con una descripción razonablemente larga para probar el ajuste de línea`,
    quantity: String(i + 1),
    unit: "Unidad",
    unitPrice: "1234.56",
    discountPercent: i % 3 === 0 ? "10" : "0",
  }));
  q.taxes = [{ id: "iva", label: "IVA", type: "percent", value: "21" }];
  return { ...quoteSchema.parse(q), ...over };
}

const options = { templateId: "minimalista", showBrand: true, allowCustomColor: false };

function pageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

describe("renderQuotePdf", () => {
  it("genera un PDF real de una página", async () => {
    const pdf = await renderQuotePdf(sampleQuote(), options);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5_000);
    expect(pageCount(pdf)).toBe(1);
  });

  it("pagina cuando hay muchos conceptos", async () => {
    const pdf = await renderQuotePdf(sampleQuote(90), options);
    expect(pageCount(pdf)).toBeGreaterThan(1);
  });

  it("numera las páginas y muestra el aviso legal en todas", async () => {
    const pdf = await renderQuotePdf(sampleQuote(90), options);
    const pages = await extractPdfPages(pdf);
    pages.forEach((text, i) => {
      expect(text).toContain(`Página ${i + 1} de ${pages.length}`);
      expect(text).toContain("no constituye una factura");
    });
  });

  it("muestra la marca AtajoLab solo cuando corresponde", async () => {
    const withBrand = (await extractPdfPages(await renderQuotePdf(sampleQuote(), options))).join(
      " ",
    );
    const noBrand = (
      await extractPdfPages(await renderQuotePdf(sampleQuote(), { ...options, showBrand: false }))
    ).join(" ");
    expect(withBrand).toContain("AtajoLab");
    expect(noBrand).not.toContain("AtajoLab");
  });

  it("incluye datos, conceptos y totales", async () => {
    const text = (await extractPdfPages(await renderQuotePdf(sampleQuote(), options))).join(" ");
    expect(text).toContain("Electro Sur");
    expect(text).toContain("Laura Benítez");
    expect(text).toContain("Concepto número 2");
    expect(text).toContain("$ 8.813,52");
    expect(text).toContain("N.º 0001");
  });

  it("incluye el logo cuando existe", async () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const q = sampleQuote();
    q.issuer.logo = png;
    const pdf = await renderQuotePdf(q, options);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("buildPdfModel", () => {
  it("formatea importes y fechas en es-AR", () => {
    const m = buildPdfModel(sampleQuote(1), options);
    expect(m.issueDate).toBe("10/05/2026");
    expect(m.validUntilDate).toBe("25/05/2026");
    expect(m.rows[0].unitPrice).toBe("$ 1.234,56");
    expect(m.rows[0].discount).toBe("10%");
    expect(m.totals.total).toBe("1344.43");
  });

  it("solo respeta el color personalizado si está permitido", () => {
    const q = sampleQuote(1, { accentColor: "#ff0000" });
    expect(buildPdfModel(q, options).accent).toBe("#1f2937");
    expect(buildPdfModel(q, { ...options, allowCustomColor: true }).accent).toBe("#ff0000");
  });

  it("usa la plantilla gratuita si el id no existe", () => {
    expect(
      buildPdfModel(sampleQuote(1), { ...options, templateId: "inexistente" }).template.id,
    ).toBe("minimalista");
  });
});

describe("pdfFileName", () => {
  it("genera un nombre de archivo seguro", () => {
    expect(pdfFileName({ number: "0042", customer: { name: "Laura Benítez/../x" } as never })).toBe(
      "Presupuesto-0042-Laura-Benitez-x.pdf",
    );
  });
});

// Utilidad de desarrollo: PDF_DUMP_DIR=<carpeta> pnpm test pdf escribe un PDF por plantilla.
describe.runIf(process.env.PDF_DUMP_DIR)("volcado de PDFs de muestra", () => {
  it("escribe los PDFs", async () => {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const { TEMPLATES } = await import("@/domain/templates");
    const { hasTemplateComponent } = await import("./render");
    mkdirSync(process.env.PDF_DUMP_DIR!, { recursive: true });
    for (const t of TEMPLATES.filter((t) => hasTemplateComponent(t.id))) {
      for (const n of [3, 40]) {
        const pdf = await renderQuotePdf(sampleQuote(n), {
          templateId: t.id,
          showBrand: t.tier === "free",
          allowCustomColor: false,
        });
        writeFileSync(`${process.env.PDF_DUMP_DIR}/${t.id}-${n}.pdf`, pdf);
      }
    }
  });
});
