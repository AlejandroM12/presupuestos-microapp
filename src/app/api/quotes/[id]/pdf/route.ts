import { quoteSchema } from "@/domain/quote/schema";
import { isUuid, toErrorResponse } from "@/server/api";
import { requireApiUser } from "@/server/guards";
import { issueQuotePdf, pdfError } from "@/server/pdf-response";
import { RateLimiter } from "@/server/rate-limit";
import { getQuote, NotFoundError } from "@/services/quotes";

export const runtime = "nodejs";

const previewLimiter = new RateLimiter(
  Number(process.env.RATE_LIMIT_PREVIEW_PER_MINUTE) || 40,
  60_000,
);

const limiter = new RateLimiter(Number(process.env.RATE_LIMIT_PDF_PER_MINUTE) || 20, 60_000);

/**
 * PDF de un presupuesto guardado. Solo el propietario puede pedirlo; las reglas de
 * diseño, marca y límite mensual son las mismas que para el editor.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const isPreview = new URL(request.url).searchParams.get("preview") === "1";
    if (!(isPreview ? previewLimiter : limiter).check(user.id).allowed) {
      return pdfError(429, "Demasiados intentos. Probá de nuevo en unos segundos.");
    }
    const { id } = await ctx.params;
    if (!isUuid(id)) throw new NotFoundError("Presupuesto");
    const { draft, customTemplateVersionId } = await getQuote(user.id, id);
    const parsed = quoteSchema.safeParse(draft);
    if (!parsed.success)
      return pdfError(422, "El presupuesto guardado está incompleto. Editalo y volvé a intentar.");
    const preview = new URL(request.url).searchParams.get("preview") === "1";
    return issueQuotePdf(parsed.data, preview, { customTemplateVersionId });
  } catch (error) {
    return toErrorResponse(error);
  }
}
