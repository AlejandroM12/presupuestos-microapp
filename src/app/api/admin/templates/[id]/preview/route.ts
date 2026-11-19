import { parseCustomTemplateConfig } from "@/domain/custom-template/config";
import { isUuid, readJson, toErrorResponse } from "@/server/api";
import { renderTemplatePreview } from "@/server/admin-preview";
import { requireAdminApi } from "@/server/auth/admin";
import { RateLimiter } from "@/server/rate-limit";
import { CustomTemplateError, getCustomTemplateAdmin } from "@/services/custom-templates";

export const runtime = "nodejs";

const limiter = new RateLimiter(60, 60_000);

function pdfResponse(pdf: Buffer) {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="vista-previa.pdf"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function handle(
  ctx: { params: Promise<{ id: string }> },
  readDraft?: () => Promise<unknown>,
) {
  try {
    const admin = await requireAdminApi();
    if (!limiter.check(admin.id).allowed) {
      return Response.json({ error: "Demasiadas solicitudes." }, { status: 429 });
    }
    const { id } = await ctx.params;
    if (!isUuid(id)) return Response.json({ error: "No encontrado" }, { status: 404 });
    const template = await getCustomTemplateAdmin(id);
    // El cuerpo se lee recién después de verificar el rol de administrador.
    const draftConfig = readDraft ? await readDraft() : undefined;
    const config = parseCustomTemplateConfig(
      draftConfig ?? {
        style: template.style,
        fields: template.fields,
        sections: template.sections,
      },
    );
    return pdfResponse(await renderTemplatePreview(id, template.name, config));
  } catch (error) {
    if (error instanceof CustomTemplateError) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return toErrorResponse(error);
  }
}

/** Vista previa de la configuración guardada (también en borrador). Solo ADMIN. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(ctx);
}

/** Vista previa de una configuración sin guardar (el formulario de administración). Solo ADMIN. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(
    ctx,
    async () => ((await readJson(request, 200_000)) as { config?: unknown }).config ?? {},
  );
}
