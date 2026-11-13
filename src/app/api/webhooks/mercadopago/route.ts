import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/integrations/mercadopago";
import { handleWebhookNotification, PaymentsDisabledError } from "@/services/billing";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 100_000;

/**
 * Notificaciones de Mercado Pago. Solo se procesa lo que trae una firma válida; el estado
 * real del pago siempre se consulta a la API del proveedor (no se confía en el cuerpo).
 * Responde 5xx ante fallos transitorios para que Mercado Pago reintente: el procesamiento
 * es idempotente.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES)
    return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: { type?: string; topic?: string; data?: { id?: string | number } } = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const dataId =
    url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);
  const type =
    url.searchParams.get("type") ?? body.type ?? url.searchParams.get("topic") ?? body.topic;
  const requestId = request.headers.get("x-request-id");

  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    console.error("webhook_secret_missing");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const valid = verifyWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: requestId,
    dataId: url.searchParams.get("data.id"),
  });
  if (!valid) {
    console.warn("webhook_invalid_signature", { requestId });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  if (!dataId || !type || !requestId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const result = await handleWebhookNotification({
      requestId,
      type,
      dataId: String(dataId),
      body,
    });
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof PaymentsDisabledError) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    console.error("webhook_processing_failed", {
      requestId,
      type,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
