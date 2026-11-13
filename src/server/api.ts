import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { ForbiddenError } from "@/server/guards";
import { NotFoundError } from "@/services/quotes";

const uuid = z.uuid();

export function isUuid(value: string): boolean {
  return uuid.safeParse(value).success;
}

/** Traduce los errores de dominio a respuestas HTTP seguras (sin filtrar detalles internos). */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.code === "login_required" ? 401 : 403 },
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message, code: "not_found" }, { status: 404 });
  }
  if (error instanceof ZodError) {
    // Mensajes de validación propios (en español) por campo, para mostrarlos en el formulario.
    const fields: Record<string, string> = {};
    for (const issue of error.issues) fields[issue.path.join(".") || "form"] ??= issue.message;
    return NextResponse.json(
      { error: "Los datos enviados no son válidos.", code: "invalid_data", fields },
      { status: 422 },
    );
  }
  console.error("api_error", error instanceof Error ? error.message : "unknown");
  return NextResponse.json(
    { error: "Ocurrió un error inesperado.", code: "internal" },
    { status: 500 },
  );
}

export async function readJson(request: Request, maxBytes = 1_000_000): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new z.ZodError([]);
  const text = await request.text();
  if (text.length > maxBytes) throw new z.ZodError([]);
  try {
    return JSON.parse(text);
  } catch {
    throw new z.ZodError([]);
  }
}
