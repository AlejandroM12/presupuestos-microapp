import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { TEMPLATES } from "@/domain/templates";
import { DEMO_LABEL, demoDocument } from "./demo-fixtures";
import { renderQuotePdf } from "./render";

/**
 * Utilidad de desarrollo (no es una prueba): genera los PDF reales con los que se arman las
 * imágenes de la landing y el material de marketing. Se activa con PDF_MARKETING_DIR=<carpeta>.
 * Todos los documentos llevan datos ficticios y la leyenda de demostración.
 */
describe.runIf(process.env.PDF_MARKETING_DIR)("PDF de muestra para marketing", () => {
  it("genera los documentos reales de la landing", async () => {
    const dir = process.env.PDF_MARKETING_DIR!;
    mkdirSync(dir, { recursive: true });

    const render = async (
      file: string,
      key: Parameters<typeof demoDocument>[0],
      templateId: string,
    ) => {
      const doc = demoDocument(key);
      const meta = TEMPLATES.find((t) => t.id === templateId)!;
      doc.quote.templateId = templateId;
      doc.quote.notes = `${DEMO_LABEL}. ${doc.quote.notes}`;
      writeFileSync(
        path.join(dir, file),
        await renderQuotePdf(doc.quote, {
          templateId,
          showBrand: meta.tier === "free",
          allowCustomColor: false,
        }),
      );
    };

    // Comparación de los seis diseños con el mismo presupuesto
    for (const t of TEMPLATES) await render(`diseno-${t.id}.pdf`, "servicios-tecnicos", t.id);
    // Ejemplos por rubro con diseños del catálogo
    await render("rubro-talleres.pdf", "taller-mecanico", "tecnico");
    await render("rubro-construccion.pdf", "construccion", "ejecutivo");
    await render("rubro-tecnicos.pdf", "servicios-tecnicos", "moderno");
    // Imagen principal: el diseño gratuito
    await render("hero-minimalista.pdf", "servicios-tecnicos", "minimalista");
  }, 120_000);
});
