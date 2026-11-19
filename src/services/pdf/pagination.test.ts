import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultQuote } from "@/domain/quote/defaults";
import { quoteSchema, type Quote } from "@/domain/quote/schema";
import { TEMPLATES } from "@/domain/templates";
import {
  DEMO_TEMPLATES,
  DEMO_TEMPLATE_ID,
  demoDocument,
  demoLogo,
  type LogoKind,
} from "./demo-fixtures";
import { calculateTotals } from "@/domain/quote/calculations";
import { buildPdfModel } from "./model";
import { extractPdfPages } from "./pdf-text";
import { renderQuotePdf } from "./render";

const compact = (t: string) => t.replace(/\s+/g, "").toUpperCase();
const HEAD = "DESCRIPCIÓN";
const COUNTS = [1, 5, 10, 35, 100];

function catalogQuote(n: number, over: Partial<Quote> = {}): Quote {
  const q = defaultQuote(new Date(2026, 10, 19));
  q.title = "Presupuesto de prueba de paginación";
  q.issuer = { ...q.issuer, businessName: "Estudio Ejemplo", email: "hola@ejemplo.example" };
  q.customer = { ...q.customer, name: "Cliente Ejemplo" };
  q.notes = "Observaciones de prueba.";
  q.terms = "Condiciones de prueba.";
  q.taxes = [{ id: "iva", label: "IVA", type: "percent", value: "21" }];
  q.items = Array.from({ length: n }, (_, i) => ({
    id: `i${i}`,
    description: `Concepto número ${i + 1} con un texto de longitud razonable`,
    quantity: "1",
    unit: "Unidad",
    unitPrice: "1000",
    discountPercent: "0",
  }));
  return { ...quoteSchema.parse(q), ...over };
}

/** Invariantes de paginación que no dependen de la plantilla. */
async function checkPagination(pdf: Buffer, rowMarker: string, expectHeaders: boolean) {
  const pages = await extractPdfPages(pdf);
  const n = pages.length;
  pages.forEach((text, i) => {
    // Numeración y aviso legal en todas las páginas
    expect(text, `página ${i + 1}`).toContain(`Página ${i + 1} de ${n}`);
    expect(text).toContain("no constituye una factura");
    if (!expectHeaders) return;
    const heads = compact(text).split(HEAD).length - 1;
    const rows = (text.match(new RegExp(rowMarker, "g")) ?? []).length;
    // Exactamente un encabezado de tabla por página con filas, nunca huérfano ni repetido
    if (rows > 0) expect(heads, `página ${i + 1} con ${rows} filas`).toBe(1);
    else expect(heads, `página ${i + 1} sin filas no debe tener encabezado de tabla`).toBe(0);
  });
  // Los totales aparecen una sola vez y en la última página
  const totalPages = pages
    .map((t, i) => (compact(t).includes("SUBTOTAL") ? i : -1))
    .filter((i) => i >= 0);
  expect(totalPages).toEqual([n - 1]);
  return pages;
}

describe("paginación según la altura real del contenido", () => {
  for (const t of TEMPLATES) {
    for (const n of COUNTS) {
      it(`${t.id}: ${n} conceptos`, async () => {
        const pdf = await renderQuotePdf(catalogQuote(n), {
          templateId: t.id,
          showBrand: t.tier === "free",
          allowCustomColor: false,
        });
        const pages = await checkPagination(pdf, "Concepto número", t.id !== "creativo");
        // Todos los conceptos se imprimen, una vez, en orden
        const all = pages.join(" ");
        const found = [...all.matchAll(/Concepto número (\d+)/g)].map((m) => Number(m[1]));
        expect(found).toEqual(Array.from({ length: n }, (_, i) => i + 1));
        if (n === 1) expect(pages).toHaveLength(1);
        if (n >= 35) {
          // Las páginas de continuación identifican el documento sin repetir el encabezado completo
          expect(pages.length).toBeGreaterThan(1);
          expect(pages[1]).toContain("Estudio Ejemplo");
          expect(pages[1]).toContain("Presupuesto N.º 0001");
          expect(pages[1]).toContain("Cliente: Cliente Ejemplo");
          expect(pages[0]).not.toContain("Cliente: Cliente Ejemplo");
        }
      }, 60_000);
    }
  }

  for (const d of DEMO_TEMPLATES) {
    for (const n of COUNTS) {
      it(`plantilla privada ${d.key}: ${n} conceptos`, async () => {
        const doc = demoDocument(d.key, n);
        const pdf = await renderQuotePdf(doc.quote, {
          templateId: DEMO_TEMPLATE_ID,
          showBrand: false,
          allowCustomColor: true,
          custom: doc.config,
        });
        const pages = await extractPdfPages(pdf);
        const all = pages.join(" ");
        expect(all.match(/\(ítem \d+\)/g)?.length).toBe(n);
        for (let i = 0; i < pages.length; i++) {
          const rows = (pages[i].match(/\(ítem \d+\)/g) ?? []).length;
          const heads = compact(pages[i]).split(HEAD).length - 1;
          expect(heads, `página ${i + 1}`).toBe(rows > 0 ? 1 : 0);
          expect(pages[i]).toContain(`Página ${i + 1} de ${pages.length}`);
        }
        expect(compact(pages[pages.length - 1])).toContain("SUBTOTAL");
      }, 60_000);
    }
  }

  it("un cierre muy extenso fluye sin quedar cortado ni perder texto", async () => {
    const long = "Condición comercial detallada que se repite para forzar un cierre muy extenso. ";
    const pdf = await renderQuotePdf(
      catalogQuote(30, { terms: long.repeat(30), notes: long.repeat(15) }),
      { templateId: "minimalista", showBrand: true, allowCustomColor: false },
    );
    const pages = await extractPdfPages(pdf);
    const text = pages.join(" ");
    expect((text.match(/Condición comercial detallada/g) ?? []).length).toBe(45);
    expect(pages.some((t) => compact(t).includes("TOTALARS"))).toBe(true);
  }, 60_000);
});

describe("plantillas privadas: estructura declarativa", () => {
  const render = (
    key: (typeof DEMO_TEMPLATES)[number]["key"],
    tweak?: (c: Record<string, unknown>) => void,
  ) => {
    const doc = demoDocument(key);
    if (tweak) {
      const style = doc.config.style as unknown as Record<string, unknown>;
      tweak(style);
    }
    return renderQuotePdf(doc.quote, {
      templateId: DEMO_TEMPLATE_ID,
      showBrand: false,
      allowCustomColor: true,
      custom: doc.config,
    });
  };

  it("el taller muestra fichas, kilometraje en km y bloque de autorización", async () => {
    const text = compact((await extractPdfPages(await render("taller-mecanico"))).join(" "));
    expect(text).toContain("80.450KM");
    expect(text).toContain("AB123CD");
    expect(text).toContain("AUTORIZACIÓNDELCLIENTE");
    expect(text).toContain("FIRMA");
  });

  it("la construcción calcula el anticipo y el saldo pendiente sobre el total", async () => {
    const doc = demoDocument("construccion");
    const pdf = await renderQuotePdf(doc.quote, {
      templateId: DEMO_TEMPLATE_ID,
      showBrand: false,
      allowCustomColor: true,
      custom: doc.config,
    });
    const text = (await extractPdfPages(pdf)).join(" ");
    const money = (s: string) =>
      Number(s.replace(/\./g, "").replace(",", ".").replace("$", "").trim());
    const total = money(/Total ARS \$ ([\d.,]+)/.exec(text)![1]);
    const advance = money(/Anticipo \$ ([\d.,]+)/.exec(text)![1]);
    const balance = money(/Saldo pendiente \$ ([\d.,]+)/.exec(text)![1]);
    expect(advance).toBeCloseTo(total * 0.4, 1);
    expect(advance + balance).toBeCloseTo(total, 1);
    // La forma de pago menciona el mismo anticipo que el cuadro de totales
    expect(text).toContain(
      `40% de anticipo al aprobar ($ ${/Anticipo \$ ([\d.,]+)/.exec(text)![1]})`,
    );
  });

  it("un campo personalizado muy extenso fluye entre páginas sin perder texto", async () => {
    const doc = demoDocument("taller-mecanico", 14);
    doc.quote.customFieldValues = {
      ...doc.quote.customFieldValues,
      diagnostico: "Diagnóstico extenso. ".repeat(120),
    };
    const pdf = await renderQuotePdf(doc.quote, {
      templateId: DEMO_TEMPLATE_ID,
      showBrand: false,
      allowCustomColor: true,
      custom: doc.config,
    });
    const pages = await extractPdfPages(pdf);
    expect(pages.join(" ").match(/Diagnóstico extenso\./g)).toHaveLength(120);
    pages.forEach((t, i) => expect(t).toContain(`Página ${i + 1} de ${pages.length}`));
  }, 60_000);

  it("sin la configuración nueva se mantiene el diseño original (compatibilidad)", async () => {
    const { parseCustomTemplateConfig } = await import("@/domain/custom-template/config");
    const legacy = parseCustomTemplateConfig({
      style: { accentColor: "#b91c1c", headerTitle: "Orden de trabajo" },
      fields: [{ id: "serie", label: "N.º de serie", type: "text" }],
    });
    expect(legacy.style).toMatchObject({
      headerVariant: "classic",
      tableStyle: "tinted",
      totalsStyle: "bar",
      sectionColumns: 1,
      showTerms: true,
      approval: false,
    });
  });

  it("cada variante de encabezado, tabla y totales genera un PDF válido", async () => {
    for (const headerVariant of ["classic", "banner", "boxed"]) {
      for (const tableStyle of ["tinted", "lines", "zebra", "grid"]) {
        for (const totalsStyle of ["bar", "box", "plain"]) {
          const pdf = await render("servicios-tecnicos", (s) =>
            Object.assign(s, { headerVariant, tableStyle, totalsStyle }),
          );
          const pages = await extractPdfPages(pdf);
          expect(pages.length).toBeGreaterThanOrEqual(1);
          expect(compact(pages[0])).toContain("DESCRIPCIÓN");
        }
      }
    }
  }, 120_000);
});

describe("pulido de documentos", () => {
  const opts = (doc: ReturnType<typeof demoDocument>) => ({
    templateId: DEMO_TEMPLATE_ID,
    showBrand: false,
    allowCustomColor: true,
    custom: doc.config,
  });
  const textOf = async (doc: ReturnType<typeof demoDocument>) =>
    (await extractPdfPages(await renderQuotePdf(doc.quote, opts(doc)))).join(" ");

  it("las páginas de continuación mantienen el tipo de documento configurado", async () => {
    const doc = demoDocument("taller-mecanico", 35);
    const pages = await extractPdfPages(await renderQuotePdf(doc.quote, opts(doc)));
    expect(pages[1]).toContain("Orden de trabajo N.º 0048");
    expect(pages[1]).not.toContain("Presupuesto N.º 0048");
    // Las plantillas del catálogo siguen diciendo "Presupuesto"
    const cat = await extractPdfPages(
      await renderQuotePdf(catalogQuote(35), {
        templateId: "minimalista",
        showBrand: true,
        allowCustomColor: false,
      }),
    );
    expect(cat[1]).toContain("Presupuesto N.º 0001");
  }, 60_000);

  it("normaliza cantidades y unidades y respeta las personalizadas", async () => {
    const taller = await textOf(demoDocument("taller-mecanico"));
    expect(taller).toContain("2 unidades");
    expect(taller).toContain("1 juego");
    expect(taller).toContain("3,5 h");
    expect(taller).toContain("80.450 km");
    const obra = await textOf(demoDocument("construccion"));
    expect(obra).toContain("12 bolsas");
    expect(obra).toContain("38 m²");
    expect(obra).toContain("12 jornales");
    const doc = demoDocument("servicios-tecnicos");
    doc.quote.items[0] = { ...doc.quote.items[0], quantity: "3", unit: "Tanda de pintura" };
    expect(await textOf(doc)).toContain("3 Tanda de pintura");
  }, 60_000);

  it("no repite el título de una sección con un único campo del mismo nombre", async () => {
    const doc = demoDocument("taller-mecanico");
    const model = buildPdfModel(doc.quote, { ...opts(doc), preview: false });
    const titles = model.custom!.blocks.map((b) => b.title);
    expect(titles).toContain("Datos del vehículo");
    expect(titles).not.toContain("Diagnóstico");
    expect(model.custom!.blocks.some((b) => b.rows.some((r) => r.label === "Diagnóstico"))).toBe(
      true,
    );
    // Con más de un campo, el título se conserva
    const servicio = buildPdfModel(demoDocument("servicios-tecnicos").quote, {
      ...opts(demoDocument("servicios-tecnicos")),
    });
    expect(servicio.custom!.blocks.map((b) => b.title)).toContain("Servicio");
  });

  it("la densidad compacta usa menos espacio sin forzar una sola página", async () => {
    const standard = demoDocument("construccion", 35);
    const compact = demoDocument("construccion", { itemCount: 35, compact: true });
    expect(standard.config.style.density).toBe("standard");
    expect(compact.config.style.density).toBe("compact");
    const pagesStd = (await extractPdfPages(await renderQuotePdf(standard.quote, opts(standard))))
      .length;
    const pagesCmp = (await extractPdfPages(await renderQuotePdf(compact.quote, opts(compact))))
      .length;
    expect(pagesCmp).toBeLessThanOrEqual(pagesStd);
    const big = demoDocument("construccion", { itemCount: 100, compact: true });
    expect(
      (await extractPdfPages(await renderQuotePdf(big.quote, opts(big)))).length,
    ).toBeGreaterThan(1);
  }, 60_000);

  it("los documentos de demostración se identifican como tales en cada página", async () => {
    const doc = demoDocument("servicios-tecnicos", 35);
    const pages = await extractPdfPages(await renderQuotePdf(doc.quote, opts(doc)));
    pages.forEach((p) => expect(p).toContain("MUESTRA DE DEMOSTRACIÓN"));
  }, 60_000);

  it("las demostraciones en USD usan precios propios en dólares, sin conversión", async () => {
    for (const d of DEMO_TEMPLATES) {
      const ars = demoDocument(d.key);
      const usd = demoDocument(d.key, { currency: "USD" });
      expect(usd.quote.currency).toBe("USD");
      const arsTotal = Number(calculateTotals(ars.quote).total);
      const usdTotal = Number(calculateTotals(usd.quote).total);
      // En dólares los importes son del orden de decenas/cientos/miles, no los de pesos
      expect(usdTotal).toBeGreaterThan(50);
      expect(usdTotal).toBeLessThan(10_000);
      // La relación implícita con los pesos es la de un tipo de cambio plausible (1.000–1.800)
      expect(arsTotal / usdTotal).toBeGreaterThan(1000);
      expect(arsTotal / usdTotal).toBeLessThan(1800);
      for (const it of usd.quote.items) expect(Number(it.unitPrice)).toBeLessThan(2000);
    }
    const text = await textOf(demoDocument("construccion", { currency: "USD" }));
    expect(text).toContain("US$");
    expect(text).not.toContain("185.000");
  }, 60_000);
});

// Utilidad de desarrollo: PDF_SAMPLES_DIR=<carpeta> genera las muestras comerciales (DEMO-*) y,
// por separado, los casos extremos para revisarlos a ojo. No se versionan.
describe.runIf(process.env.PDF_SAMPLES_DIR)(
  "volcado de muestras comerciales y casos extremos",
  () => {
    it("escribe los PDF", async () => {
      const dir = process.env.PDF_SAMPLES_DIR!;
      const edge = path.join(dir, "casos-extremos");
      mkdirSync(edge, { recursive: true });
      type Doc = ReturnType<typeof demoDocument>;
      const render = (doc: Doc) =>
        renderQuotePdf(doc.quote, {
          templateId: DEMO_TEMPLATE_ID,
          showBrand: false,
          allowCustomColor: true,
          custom: doc.config,
        });
      const write = async (file: string, doc: Doc) => writeFileSync(file, await render(doc));

      // Muestras comerciales (para difusión): identificadas como DEMO; estándar, compacta y USD.
      for (const d of DEMO_TEMPLATES) {
        await write(path.join(dir, `DEMO-${d.key}.pdf`), demoDocument(d.key));
        await write(
          path.join(dir, `DEMO-${d.key}-compacto.pdf`),
          demoDocument(d.key, { compact: true }),
        );
        await write(
          path.join(dir, `DEMO-${d.key}-usd.pdf`),
          demoDocument(d.key, { currency: "USD" }),
        );
        await write(path.join(dir, `DEMO-${d.key}-multipagina.pdf`), demoDocument(d.key, 35));
        for (const n of [1, 5, 10, 100]) {
          await write(path.join(edge, `${d.key}-${n}-conceptos.pdf`), demoDocument(d.key, n));
        }
        await write(
          path.join(edge, `${d.key}-35-conceptos-compacto.pdf`),
          demoDocument(d.key, { compact: true, itemCount: 35 }),
        );
      }

      const extreme = async (
        name: string,
        tweak: (doc: Doc) => void,
        key: (typeof DEMO_TEMPLATES)[number]["key"] = "taller-mecanico",
        options: Parameters<typeof demoDocument>[1] = 14,
      ) => {
        const doc = demoDocument(key, options);
        tweak(doc);
        await write(path.join(edge, `${name}.pdf`), doc);
      };
      await extreme("nombres-y-textos-largos", (d) => {
        d.quote.issuer.businessName =
          "Servicios Integrales de Mantenimiento Industrial y Comercial del Noreste Argentino S. R. L.";
        d.quote.customer.name = "María de los Ángeles Fernández de la Vega y Rodríguez Echeverría";
        d.quote.customer.company =
          "Cooperativa de Provisión, Servicios Públicos y Consumo Limitada";
        d.quote.title =
          "Mantenimiento preventivo y correctivo integral de instalaciones eléctricas, sanitarias y de climatización";
        d.quote.items = d.quote.items.map((it, i) => ({
          ...it,
          description: `${it.description}. ${"Descripción extensa del alcance del trabajo con materiales, mano de obra y condiciones particulares. ".repeat(3)}${i}`,
        }));
      });
      await extreme("campos-personalizados-extensos", (d) => {
        d.quote.customFieldValues = {
          ...d.quote.customFieldValues,
          diagnostico: "Diagnóstico extenso. ".repeat(120),
          marca_modelo:
            "Modelo con denominación comercial muy larga que debería ajustarse sin cortar ni superponer el resto del contenido de la ficha",
        };
      });
      await extreme("campos-opcionales-vacios", (d) => {
        d.quote.customFieldValues = { patente: "AB123CD", km: 1000 };
        d.quote.notes = "";
        d.quote.terms = "";
        d.quote.paymentTerms = "";
        d.quote.deliveryTime = "";
      });
      await extreme("sin-condiciones-comerciales", (d) => {
        Object.assign(d.config.style, { showTerms: false, approval: false });
      });
      // USD realista (precios propios en dólares, sin conversión) con descuento, recargo e impuestos.
      await extreme(
        "usd-con-descuento-e-impuestos",
        (d) => {
          d.quote.globalDiscount = { type: "percent", value: "8" };
          d.quote.surcharge = { type: "fixed", value: "25" };
          d.quote.taxes = [
            { id: "iva", label: "IVA 21%", type: "percent", value: "21" },
            { id: "iibb", label: "Percepción IIBB 3%", type: "percent", value: "3" },
          ];
        },
        "taller-mecanico",
        { currency: "USD" },
      );
      for (const kind of ["ancho", "alto", "engranaje"] as LogoKind[]) {
        await extreme(
          `logo-${kind}`,
          (d) => {
            d.quote.issuer.logo = demoLogo(kind);
          },
          "servicios-tecnicos",
          { currency: "USD" },
        );
      }
      // Plantillas del catálogo con la identidad ficticia y 35 conceptos
      for (const t of TEMPLATES) {
        const doc = demoDocument("taller-mecanico", 35);
        doc.quote.templateId = t.id;
        writeFileSync(
          path.join(edge, `catalogo-${t.id}-35.pdf`),
          await renderQuotePdf(doc.quote, {
            templateId: t.id,
            showBrand: t.tier === "free",
            allowCustomColor: false,
          }),
        );
      }
    }, 300_000);
  },
);
