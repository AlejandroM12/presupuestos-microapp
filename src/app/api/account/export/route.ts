import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/api";
import { requireApiUser } from "@/server/guards";
import { RateLimiter } from "@/server/rate-limit";
import { exportUserData } from "@/services/account";

export const runtime = "nodejs";

const limiter = new RateLimiter(5, 60_000);

/** Descarga todos los datos de la cuenta propia en JSON. */
export async function GET() {
  try {
    const user = await requireApiUser();
    if (!limiter.check(user.id).allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos.", code: "rate_limited" },
        { status: 429 },
      );
    }
    const data = await exportUserData(user.id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="atajolab-presupuestos-mis-datos.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
