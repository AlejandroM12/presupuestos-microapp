import { NextResponse } from "next/server";
import { DENIAL_MESSAGES, DENIAL_STATUS, decidePdfRender } from "@/domain/entitlements";
import { quoteSchema } from "@/domain/quote/schema";
import { getAccessContext } from "@/server/access";
import { clientIp, RateLimiter } from "@/server/rate-limit";
import { pdfFileName } from "@/services/pdf/model";
import { renderQuotePdf } from "@/services/pdf/render";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1_000_000;
const limiter = new RateLimiter(20, 60_000);

function error(status: number, message: string, headers?: HeadersInit, code?: string) {
  return NextResponse.json({ error: message, code }, { status, headers });
}

export async function POST(request: Request) {
  const rate = limiter.check(clientIp(request.headers));
  if (!rate.allowed) {
    return error(429, "Demasiados intentos. Probá de nuevo en unos segundos.", {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return error(413, "El presupuesto es demasiado grande.");

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return error(400, "Solicitud inválida.");
  }
  if (raw.length > MAX_BODY_BYTES) return error(413, "El presupuesto es demasiado grande.");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error(400, "El cuerpo debe ser JSON válido.");
  }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return error(422, "El presupuesto tiene datos inválidos o incompletos.");
  const quote = parsed.data;

  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const access = await getAccessContext();
  const decision = decidePdfRender(access, {
    templateId: quote.templateId,
    preview,
    // Transitorio hasta activar cuentas y límites (ver Feature de autenticación).
    allowAnonymousFreeDownload: true,
  });
  if (!decision.allowed) {
    return error(
      DENIAL_STATUS[decision.reason],
      DENIAL_MESSAGES[decision.reason],
      undefined,
      decision.reason,
    );
  }

  try {
    const pdf = await renderQuotePdf(quote, {
      templateId: quote.templateId,
      showBrand: decision.showBrand,
      allowCustomColor: decision.allowCustomColor,
      preview: decision.preview,
    });
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${decision.preview ? "inline" : "attachment"}; filename="${pdfFileName(quote)}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("pdf_render_failed", err instanceof Error ? err.message : "unknown");
    return error(500, "No pudimos generar el PDF. Intentá nuevamente.");
  }
}
