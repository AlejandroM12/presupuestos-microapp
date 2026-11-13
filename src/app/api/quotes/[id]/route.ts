import { NextResponse } from "next/server";
import { z } from "zod";
import { isUuid, readJson, toErrorResponse } from "@/server/api";
import { requireApiUser, requireProWrite } from "@/server/guards";
import { deleteQuote, getQuote, NotFoundError, updateQuote } from "@/services/quotes";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function idFrom(ctx: Ctx): Promise<string> {
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new NotFoundError("Presupuesto");
  return id;
}

/** Lectura permitida a cualquier usuario autenticado (modo lectura tras cancelar Pro). */
export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireApiUser();
    return NextResponse.json(await getQuote(user.id, await idFrom(ctx)));
  } catch (error) {
    return toErrorResponse(error);
  }
}

const updateSchema = z.object({
  quote: z.unknown(),
  customerId: z.string().nullable().optional(),
});

export async function PUT(request: Request, ctx: Ctx) {
  try {
    const user = await requireProWrite();
    const id = await idFrom(ctx);
    const body = updateSchema.parse(await readJson(request));
    if (body.customerId && !isUuid(body.customerId)) throw new z.ZodError([]);
    await updateQuote(user.id, id, body.quote, {
      ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireProWrite();
    await deleteQuote(user.id, await idFrom(ctx));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
