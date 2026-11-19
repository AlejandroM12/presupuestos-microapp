import { describe, expect, it } from "vitest";
import { defaultQuote } from "@/domain/quote/defaults";
import { TEMPLATES } from "@/domain/templates";
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
const PREMIUM_IDS = TEMPLATES.filter((t) => t.tier === "premium").map((t) => t.id);

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

describe.each(TEMPLATES.map((t) => t.id))("plantilla %s", (templateId) => {
  const opts = { ...options, templateId, showBrand: templateId === "minimalista" };

  it("genera un PDF de una página con los datos principales", async () => {
    const pdf = await renderQuotePdf(sampleQuote(), opts);
    expect(pageCount(pdf)).toBe(1);
    const text = (await extractPdfPages(pdf)).join(" ");
    expect(text).toContain("Electro Sur");
    expect(text).toContain("Laura Benítez");
    expect(text).toContain("8.813,52");
    expect(text).toContain("Página 1 de 1");
    expect(text).toContain("no constituye una factura");
  });

  it("pagina sin cortar conceptos y numera todas las páginas", async () => {
    const pages = await extractPdfPages(await renderQuotePdf(sampleQuote(60), opts));
    expect(pages.length).toBeGreaterThan(1);
    pages.forEach((text, i) => expect(text).toContain(`Página ${i + 1} de ${pages.length}`));
    const all = pages.join(" ");
    for (const n of [1, 30, 60]) expect(all).toContain(`Concepto número ${n} `);
    // el bloque de totales no se parte ni se repite entre páginas
    expect(pages.filter((p) => /subtotal/i.test(p))).toHaveLength(1);
    // no dejar encabezado de tabla huérfano (sin filas ni totales) en páginas de cierre
    for (const text of pages) {
      if (/descripci[oó]n/i.test(text) && /importe/i.test(text)) {
        expect(/Concepto número|Subtotal|TOTAL/i.test(text)).toBe(true);
      }
    }
  });

  it("agrega marca de agua solo en la vista previa", async () => {
    const preview = (
      await extractPdfPages(await renderQuotePdf(sampleQuote(), { ...opts, preview: true }))
    ).join(" ");
    const final = (await extractPdfPages(await renderQuotePdf(sampleQuote(), opts))).join(" ");
    expect(preview).toContain("VISTA PREVIA");
    expect(final).not.toContain("VISTA PREVIA");
  });
});

describe("marca AtajoLab por diseño", () => {
  it("los diseños premium no la incluyen", async () => {
    for (const id of PREMIUM_IDS) {
      const text = (
        await extractPdfPages(
          await renderQuotePdf(sampleQuote(), { ...options, templateId: id, showBrand: false }),
        )
      ).join(" ");
      expect(text).not.toContain("AtajoLab");
    }
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
    const logo =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const longTerms =
      "Condiciones comerciales extensas para validar paginación: ".repeat(12) +
      "Los precios no incluyen materiales extraordinarios ni demoliciones. " +
      "La validez del presupuesto es la indicada en el encabezado. " +
      "Cualquier modificación de alcance se cotizará por separado.";
    for (const t of TEMPLATES.filter((t) => hasTemplateComponent(t.id))) {
      for (const n of [3, 40]) {
        const pdf = await renderQuotePdf(sampleQuote(n), {
          templateId: t.id,
          showBrand: t.tier === "free",
          allowCustomColor: false,
        });
        writeFileSync(`${process.env.PDF_DUMP_DIR}/${t.id}-${n}.pdf`, pdf);
      }
      const stress = sampleQuote(50, {
        currency: "USD",
        terms: longTerms,
        notes:
          "Nota larga con descuentos e impuestos aplicados en los conceptos y en el pie. ".repeat(
            4,
          ),
        surcharge: { type: "percent", value: "5" },
      });
      stress.issuer.logo = logo;
      stress.items = stress.items.map((item, i) => ({
        ...item,
        description:
          `${item.description}. Detalle adicional muy extenso del alcance del ítem ${i + 1}: ` +
          "incluye mano de obra, coordinación en obra y limpieza parcial del sector intervenido.",
        discountPercent: i % 4 === 0 ? "15" : item.discountPercent,
      }));
      const pdf = await renderQuotePdf(stress, {
        templateId: t.id,
        showBrand: t.tier === "free",
        allowCustomColor: false,
      });
      writeFileSync(`${process.env.PDF_DUMP_DIR}/${t.id}-stress50.pdf`, pdf);
    }
  }, 60_000);
});

describe("estrés de paginación (50 conceptos, textos largos, USD)", () => {
  it.each(TEMPLATES.map((t) => t.id))(
    "plantilla %s no pierde conceptos ni duplica totales",
    async (templateId) => {
      const q = sampleQuote(50, {
        currency: "USD",
        terms: "Condición comercial muy larga. ".repeat(40),
        notes: "Observación extendida. ".repeat(20),
        surcharge: { type: "fixed", value: "100" },
      });
      q.issuer.logo =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      q.items = q.items.map((item, i) => ({
        ...item,
        description: `${item.description}. Alcance detallado del concepto ${i + 1} con texto adicional para forzar saltos de línea en el PDF.`,
      }));
      const pages = await extractPdfPages(
        await renderQuotePdf(q, {
          templateId,
          showBrand: templateId === "minimalista",
          allowCustomColor: false,
        }),
      );
      expect(pages.length).toBeGreaterThan(1);
      const all = pages.join(" ");
      for (const n of [1, 25, 50]) expect(all).toContain(`Concepto número ${n}`);
      expect(pages.filter((p) => /subtotal/i.test(p))).toHaveLength(1);
      expect(all).toMatch(/USD|U\$S|US\$/);
      pages.forEach((text, i) => expect(text).toContain(`Página ${i + 1} de ${pages.length}`));
    },
  );
});
