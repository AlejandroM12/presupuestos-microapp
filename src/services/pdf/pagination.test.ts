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

// Utilidad de desarrollo: PDF_SAMPLES_DIR=<carpeta> genera ejemplos comerciales y casos extremos
// para revisarlos a ojo. No se versionan.
describe.runIf(process.env.PDF_SAMPLES_DIR)(
  "volcado de muestras comerciales y casos extremos",
  () => {
    it("escribe los PDF", async () => {
      const dir = process.env.PDF_SAMPLES_DIR!;
      mkdirSync(path.join(dir, "casos-extremos"), { recursive: true });
      const opts = (doc: ReturnType<typeof demoDocument>) => ({
        templateId: DEMO_TEMPLATE_ID,
        showBrand: false,
        allowCustomColor: true,
        custom: doc.config,
      });
      for (const d of DEMO_TEMPLATES) {
        const doc = demoDocument(d.key);
        writeFileSync(path.join(dir, `${d.key}.pdf`), await renderQuotePdf(doc.quote, opts(doc)));
        const big = demoDocument(d.key, 35);
        writeFileSync(
          path.join(dir, `${d.key}-multipagina.pdf`),
          await renderQuotePdf(big.quote, opts(big)),
        );
        for (const n of [1, 5, 10, 100]) {
          const x = demoDocument(d.key, n);
          writeFileSync(
            path.join(dir, "casos-extremos", `${d.key}-${n}-conceptos.pdf`),
            await renderQuotePdf(x.quote, opts(x)),
          );
        }
      }

      const extreme = async (
        name: string,
        tweak: (doc: ReturnType<typeof demoDocument>) => void,
        key: (typeof DEMO_TEMPLATES)[number]["key"] = "taller-mecanico",
      ) => {
        const doc = demoDocument(key, 14);
        tweak(doc);
        writeFileSync(
          path.join(dir, "casos-extremos", `${name}.pdf`),
          await renderQuotePdf(doc.quote, opts(doc)),
        );
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
        (d.config.style as unknown as Record<string, unknown>).showTerms = false;
        (d.config.style as unknown as Record<string, unknown>).approval = false;
      });
      await extreme("usd-con-descuento-e-impuestos", (d) => {
        d.quote.currency = "USD";
        d.quote.globalDiscount = { type: "percent", value: "8" };
        d.quote.surcharge = { type: "fixed", value: "25" };
        d.quote.taxes = [
          { id: "iva", label: "IVA 21%", type: "percent", value: "21" },
          { id: "iibb", label: "Percepción IIBB 3%", type: "percent", value: "3" },
        ];
      });
      for (const kind of ["ancho", "alto", "engranaje"] as LogoKind[]) {
        await extreme(
          `logo-${kind}`,
          (d) => {
            d.quote.issuer.logo = demoLogo(kind);
          },
          "servicios-tecnicos",
        );
      }
      // Plantillas del catálogo con la identidad ficticia y 35 conceptos
      for (const t of TEMPLATES) {
        const doc = demoDocument("taller-mecanico", 35);
        doc.quote.templateId = t.id;
        writeFileSync(
          path.join(dir, "casos-extremos", `catalogo-${t.id}-35.pdf`),
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
