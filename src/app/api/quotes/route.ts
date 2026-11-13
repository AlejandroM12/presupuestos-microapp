import { NextResponse } from "next/server";
import { z } from "zod";
import { isUuid, readJson, toErrorResponse } from "@/server/api";
import { requireProWrite } from "@/server/guards";
import { createQuote } from "@/services/quotes";

export const runtime = "nodejs";

const bodySchema = z.object({
  quote: z.unknown(),
  customerId: z.string().nullable().optional(),
});

/** Guarda un presupuesto nuevo en la nube (requiere Pro vigente). */
export async function POST(request: Request) {
  try {
    const user = await requireProWrite();
    const body = bodySchema.parse(await readJson(request));
    const customerId = body.customerId ?? null;
    if (customerId && !isUuid(customerId)) throw new z.ZodError([]);
    const { id } = await createQuote(user.id, body.quote, { customerId });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
