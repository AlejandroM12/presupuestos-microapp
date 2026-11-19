import { parseCustomTemplateConfig } from "@/domain/custom-template/config";
import { defaultQuote } from "@/domain/quote/defaults";
import { quoteSchema } from "@/domain/quote/schema";
import { isUuid, toErrorResponse } from "@/server/api";
import { requireAdminApi } from "@/server/auth/admin";
import { CustomTemplateError, getCustomTemplateAdmin } from "@/services/custom-templates";
import { renderQuotePdf } from "@/services/pdf/render";

export const runtime = "nodejs";

/** Vista previa con datos de ejemplo de la configuración actual (también en borrador). Solo ADMIN. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await ctx.params;
    if (!isUuid(id)) return Response.json({ error: "No encontrado" }, { status: 404 });
    const template = await getCustomTemplateAdmin(id);
    const config = parseCustomTemplateConfig({
      style: template.style,
      fields: template.fields,
      sections: template.sections,
    });

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
    const sample: Record<string, string | number | boolean> = {};
    for (const f of config.fields) {
      sample[f.id] =
        f.type === "number" || f.type === "money"
          ? 1000
          : f.type === "checkbox"
            ? true
            : f.type === "date"
              ? new Date().toISOString().slice(0, 10)
              : f.type === "select"
                ? (f.options?.[0] ?? "Opción")
                : `Ejemplo: ${f.label}`;
    }
    const quote = quoteSchema.parse({ ...q, templateId: id, customFieldValues: sample });
    const pdf = await renderQuotePdf(quote, {
      templateId: id,
      showBrand: false,
      allowCustomColor: true,
      preview: true,
      custom: { name: template.name, ...config },
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="vista-previa.pdf"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof CustomTemplateError) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return toErrorResponse(error);
  }
}
