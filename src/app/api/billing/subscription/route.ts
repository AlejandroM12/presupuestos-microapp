import { NextResponse } from "next/server";
import { z } from "zod";
import { toErrorResponse, readJson } from "@/server/api";
import { requireApiUser } from "@/server/guards";
import { RateLimiter } from "@/server/rate-limit";
import { PaymentsDisabledError } from "@/services/billing-common";
import {
  AlreadySubscribedError,
  cancelUserSubscription,
  startSubscriptionCheckout,
} from "@/services/subscriptions";

export const runtime = "nodejs";

const limiter = new RateLimiter(6, 60_000);
const bodySchema = z.object({ plan: z.enum(["MONTHLY", "YEARLY"]) });

/** Crea la suscripción Pro y devuelve la URL de Mercado Pago para autorizar el cobro recurrente. */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    if (!limiter.check(user.id).allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá un momento.", code: "rate_limited" },
        { status: 429 },
      );
    }
    const { plan } = bodySchema.parse(await readJson(request, 1_000));
    const { url } = await startSubscriptionCheckout(user, plan);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof PaymentsDisabledError) {
      return NextResponse.json(
        { error: "Los pagos todavía no están habilitados.", code: "payments_disabled" },
        { status: 503 },
      );
    }
    if (error instanceof AlreadySubscribedError) {
      return NextResponse.json(
        { error: "Ya tenés este plan activo.", code: "already_subscribed" },
        { status: 409 },
      );
    }
    return toErrorResponse(error);
  }
}

/** Cancela la renovación: el acceso Pro se mantiene hasta el fin del período pagado. */
export async function DELETE() {
  try {
    const user = await requireApiUser();
    const until = await cancelUserSubscription(user.id);
    return NextResponse.json({ ok: true, accessUntil: until });
  } catch (error) {
    if (error instanceof PaymentsDisabledError) {
      return NextResponse.json(
        { error: "Los pagos todavía no están habilitados.", code: "payments_disabled" },
        { status: 503 },
      );
    }
    return toErrorResponse(error);
  }
}
