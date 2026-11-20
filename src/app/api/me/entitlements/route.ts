import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeEntitlements } from "@/domain/entitlements";
import { canPurchase } from "@/lib/config/sales";
import { getAccessContext } from "@/server/access";

export const runtime = "nodejs";

/** Permisos de la persona actual, calculados en el servidor. El cliente solo los muestra. */
export async function GET() {
  const entitlements = computeEntitlements(await getAccessContext());
  // Si las compras están cerradas, la interfaz no ofrece comprar (el servidor igual las rechaza).
  const session = await auth();
  const purchasesOpen = canPurchase(session?.user?.email ?? "");
  return NextResponse.json(
    { ...entitlements, purchasesOpen },
    { headers: { "Cache-Control": "no-store" } },
  );
}
