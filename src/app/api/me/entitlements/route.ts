import { NextResponse } from "next/server";
import { computeEntitlements } from "@/domain/entitlements";
import { getAccessContext } from "@/server/access";

export const runtime = "nodejs";

/** Permisos de la persona actual, calculados en el servidor. El cliente solo los muestra. */
export async function GET() {
  const entitlements = computeEntitlements(await getAccessContext());
  return NextResponse.json(entitlements, { headers: { "Cache-Control": "no-store" } });
}
