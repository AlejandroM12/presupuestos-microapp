import { NextResponse } from "next/server";
import { quoteSchema } from "@/domain/quote/schema";
import { FREE_TEMPLATE_ID } from "@/domain/templates";
import { pdfFileName } from "@/services/pdf/model";
import { renderQuotePdf } from "@/services/pdf/render";
import { clientIp, RateLimiter } from "@/server/rate-limit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1_000_000;
const limiter = new RateLimiter(20, 60_000);

function error(status: number, message: string, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
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

  try {
    // Hasta que existan cuentas y licencias, solo se emite el diseño gratuito con marca.
    const pdf = await renderQuotePdf(quote, {
      templateId: FREE_TEMPLATE_ID,
      showBrand: true,
      allowCustomColor: false,
    });
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFileName(quote)}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("pdf_render_failed", err instanceof Error ? err.message : "unknown");
    return error(500, "No pudimos generar el PDF. Intentá nuevamente.");
  }
}
