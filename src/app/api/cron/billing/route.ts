import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { paymentsEnabled } from "@/integrations/mercadopago";
import { expireStaleSubscriptions, reconcileSubscriptions } from "@/services/subscriptions";

export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Tarea periódica de facturación (programar cada hora): vence suscripciones cuyo período
 * terminó y concilia con Mercado Pago por si se perdió algún webhook.
 */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const expired = await expireStaleSubscriptions();
  const reconciled = paymentsEnabled() ? await reconcileSubscriptions() : null;
  return NextResponse.json({ expired, reconciled });
}
