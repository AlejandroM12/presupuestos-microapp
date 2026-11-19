import { NextResponse } from "next/server";
import { parseCustomTemplateConfig } from "@/domain/custom-template/config";
import { ForbiddenError, requireApiUser } from "@/server/guards";
import { toErrorResponse } from "@/server/api";
import { listAssignedCustomTemplates } from "@/services/custom-templates";

export const runtime = "nodejs";

/**
 * Plantillas privadas asignadas a la cuenta actual (solo las propias, solo activas).
 * Devuelve datos de presentación y definición de campos; nunca información de otras cuentas.
 */
export async function GET() {
  try {
    const user = await requireApiUser();
    const rows = await listAssignedCustomTemplates(user.id);
    const templates = rows.map((t) => {
      const config = parseCustomTemplateConfig({
        style: t.style,
        fields: t.fields,
        sections: t.sections,
      });
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        version: t.version,
        accent: config.style.accentColor ?? "#1f2937",
        fields: config.fields,
        sections: config.sections,
      };
    });
    return NextResponse.json({ templates }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Sin sesión: lista vacía (el editor es público), no un error.
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ templates: [] }, { headers: { "Cache-Control": "no-store" } });
    }
    return toErrorResponse(error);
  }
}
