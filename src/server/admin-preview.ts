import type { CustomTemplateConfig } from "@/domain/custom-template/config";
import { defaultQuote } from "@/domain/quote/defaults";
import { quoteSchema } from "@/domain/quote/schema";
import { renderQuotePdf } from "@/services/pdf/render";

/** Datos de ejemplo para cada tipo de campo, para ver cómo queda el PDF de una plantilla. */
function sampleValues(config: CustomTemplateConfig) {
  const sample: Record<string, string | number | boolean> = {};
  for (const f of config.fields) {
    sample[f.id] =
      f.defaultValue !== undefined
        ? f.defaultValue
        : f.type === "number" || f.type === "money"
          ? 1000
          : f.type === "checkbox"
            ? true
            : f.type === "date"
              ? new Date().toISOString().slice(0, 10)
              : f.type === "select"
                ? (f.options?.[0] ?? "Opción")
                : `Ejemplo: ${f.label}`;
  }
  return sample;
}

/** Vista previa PDF (con marca de agua) de una configuración, con presupuesto de ejemplo. */
export async function renderTemplatePreview(
  templateId: string,
  name: string,
  config: CustomTemplateConfig,
): Promise<Buffer> {
  const q = defaultQuote(new Date());
  q.title = "Presupuesto de ejemplo";
  q.issuer = { ...q.issuer, businessName: "Negocio de ejemplo", email: "contacto@ejemplo.com" };
  q.customer = { ...q.customer, name: "Cliente de ejemplo" };
  q.items = [1, 2, 3].map((n) => ({
    id: `i${n}`,
    description: `Concepto de ejemplo ${n}`,
    quantity: String(n),
    unit: "Unidad",
    unitPrice: "12500",
    discountPercent: "0",
  }));
  const quote = quoteSchema.parse({
    ...q,
    templateId,
    customFieldValues: sampleValues(config),
  });
  return renderQuotePdf(quote, {
    templateId,
    showBrand: false,
    allowCustomColor: true,
    preview: true,
    custom: { name, ...config },
  });
}
