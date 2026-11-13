import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/api";
import { requireApiUser } from "@/server/guards";
import { RateLimiter } from "@/server/rate-limit";
import { AlreadyOwnedError, PaymentsDisabledError, startPackCheckout } from "@/services/billing";

export const runtime = "nodejs";

const limiter = new RateLimiter(6, 60_000);

/** Crea la preferencia de pago del Pack Premium y devuelve la URL de Checkout Pro. */
export async function POST() {
  try {
    const user = await requireApiUser();
    if (!limiter.check(user.id).allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá un momento.", code: "rate_limited" },
        { status: 429 },
      );
    }
    const { url } = await startPackCheckout(user);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof PaymentsDisabledError) {
      return NextResponse.json(
        { error: "Los pagos todavía no están habilitados.", code: "payments_disabled" },
        { status: 503 },
      );
    }
    if (error instanceof AlreadyOwnedError) {
      return NextResponse.json(
        { error: "Ya tenés el Pack Premium.", code: "already_owned" },
        { status: 409 },
      );
    }
    return toErrorResponse(error);
  }
}
