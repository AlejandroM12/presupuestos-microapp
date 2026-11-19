import { quoteSchema } from "@/domain/quote/schema";
import { clientIp, RateLimiter } from "@/server/rate-limit";
import { issueQuotePdf, pdfError } from "@/server/pdf-response";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1_000_000;
const limiter = new RateLimiter(Number(process.env.RATE_LIMIT_PDF_PER_MINUTE) || 20, 60_000);
// Las vistas previas (con marca de agua, sin cupo) tienen su propio límite para que la
// actualización automática del editor no consuma el de descargas ni lo evada.
const previewLimiter = new RateLimiter(
  Number(process.env.RATE_LIMIT_PREVIEW_PER_MINUTE) || 40,
  60_000,
);

export async function POST(request: Request) {
  const isPreview = new URL(request.url).searchParams.get("preview") === "1";
  const rate = (isPreview ? previewLimiter : limiter).check(clientIp(request.headers));
  if (!rate.allowed) {
    return pdfError(429, "Demasiados intentos. Probá de nuevo en unos segundos.", {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return pdfError(413, "El presupuesto es demasiado grande.");

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return pdfError(400, "Solicitud inválida.");
  }
  if (raw.length > MAX_BODY_BYTES) return pdfError(413, "El presupuesto es demasiado grande.");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return pdfError(400, "El cuerpo debe ser JSON válido.");
  }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return pdfError(422, "El presupuesto tiene datos inválidos o incompletos.");
  const quote = parsed.data;

  return issueQuotePdf(quote, isPreview);
}
