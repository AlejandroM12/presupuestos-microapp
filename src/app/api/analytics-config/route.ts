import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const META = /^\d{8,20}$/;
const TIKTOK = /^[A-Z0-9]{10,30}$/;
const GA4 = /^G-[A-Z0-9]{6,14}$/;

/**
 * Identificadores públicos de medición (se leen del entorno en tiempo de ejecución, así no hace
 * falta recompilar la imagen para configurarlos). Un valor con formato inválido se ignora.
 * Sin identificadores, el cliente no carga ningún script de terceros ni muestra el aviso de cookies.
 */
export async function GET() {
  const meta = process.env.META_PIXEL_ID?.trim();
  const tiktok = process.env.TIKTOK_PIXEL_ID?.trim();
  const ga4 = process.env.GA4_MEASUREMENT_ID?.trim();
  return NextResponse.json(
    {
      ...(meta && META.test(meta) ? { meta } : {}),
      ...(tiktok && TIKTOK.test(tiktok) ? { tiktok } : {}),
      ...(ga4 && GA4.test(ga4) ? { ga4 } : {}),
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
