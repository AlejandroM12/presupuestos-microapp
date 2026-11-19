import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  computeEntitlements,
  DENIAL_MESSAGES,
  DENIAL_STATUS,
  decidePdfRender,
  BURST_MESSAGE,
  FAIR_USE_MESSAGE,
} from "@/domain/entitlements";
import type { Quote } from "@/domain/quote/schema";
import { LIMITS } from "@/lib/config/plans";
import { looksLikeCustomTemplateId } from "@/domain/custom-template/access";
import { validateCustomFieldValues } from "@/domain/custom-template/config";
import { CustomTemplateError, loadCustomRenderConfig } from "@/services/custom-templates";
import { getAccessContext } from "@/server/access";
import { DownloadLimitError, releaseDownload, reserveDownload } from "@/services/access";
import { pdfFileName } from "@/services/pdf/model";
import { renderQuotePdf } from "@/services/pdf/render";

export function pdfError(status: number, message: string, headers?: HeadersInit, code?: string) {
  return NextResponse.json({ error: message, code }, { status, headers });
}

/**
 * Emite el PDF de un presupuesto ya validado aplicando permisos, límites y marca de agua.
 * Las descargas finales se reservan de forma atómica antes de generar y se liberan si falla.
 */
export async function issueQuotePdf(
  quote: Quote,
  preview: boolean,
  options: { customTemplateVersionId?: string | null } = {},
): Promise<Response> {
  const access = await getAccessContext();
  const decision = decidePdfRender(access, { templateId: quote.templateId, preview });
  if (!decision.allowed) {
    const message =
      decision.reason === "download_limit_reached" && access.proActive
        ? FAIR_USE_MESSAGE
        : DENIAL_MESSAGES[decision.reason];
    return pdfError(DENIAL_STATUS[decision.reason], message, undefined, decision.reason);
  }

  // Plantilla privada: se resuelve (y se valida) en el servidor con la sesión de quien pide el PDF.
  let custom: Awaited<ReturnType<typeof loadCustomRenderConfig>> | undefined;
  if (looksLikeCustomTemplateId(quote.templateId)) {
    const userId = (await auth())?.user?.id;
    if (!userId) return pdfError(401, DENIAL_MESSAGES.login_required, undefined, "login_required");
    try {
      custom = await loadCustomRenderConfig(
        userId,
        quote.templateId,
        options.customTemplateVersionId,
      );
    } catch (err) {
      if (err instanceof CustomTemplateError) {
        return pdfError(403, DENIAL_MESSAGES.template_locked, undefined, "template_locked");
      }
      throw err;
    }
    const checked = validateCustomFieldValues(custom.fields, quote.customFieldValues);
    if (!checked.ok) {
      return NextResponse.json(
        {
          error: "Revisá los campos de la plantilla.",
          code: "invalid_custom_fields",
          fields: checked.errors,
        },
        { status: 422 },
      );
    }
    quote = { ...quote, customFieldValues: checked.values };
  }

  // Descarga final: se reserva de forma atómica antes de generar y se libera si falla.
  let reservation: string | null = null;
  if (!decision.preview) {
    const userId = (await auth())?.user?.id;
    if (!userId) return pdfError(401, DENIAL_MESSAGES.login_required, undefined, "login_required");
    try {
      reservation = await reserveDownload(
        userId,
        quote.templateId,
        computeEntitlements(access).downloadCap,
        new Date(),
        access.proActive ? LIMITS.proBurstPerHour : undefined,
      );
    } catch (err) {
      if (err instanceof DownloadLimitError) {
        const message =
          err.kind === "burst"
            ? BURST_MESSAGE
            : access.proActive
              ? FAIR_USE_MESSAGE
              : DENIAL_MESSAGES.download_limit_reached;
        return pdfError(429, message, undefined, "download_limit_reached");
      }
      console.error("download_reserve_failed", err instanceof Error ? err.message : "unknown");
      return pdfError(500, "No pudimos preparar la descarga. Intentá nuevamente.");
    }
  }

  if (access.proActive && access.downloadsThisMonth + 1 === LIMITS.proReviewThresholdMonthly) {
    console.warn(
      "pro_review_threshold_reached",
      JSON.stringify({ userId: (await auth())?.user?.id }),
    );
  }

  try {
    const pdf = await renderQuotePdf(quote, {
      templateId: quote.templateId,
      showBrand: custom ? custom.showBrand : decision.showBrand,
      custom: custom && {
        name: custom.name,
        style: custom.style,
        fields: custom.fields,
        sections: custom.sections,
      },
      allowCustomColor: decision.allowCustomColor,
      preview: decision.preview,
    });
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${decision.preview ? "inline" : "attachment"}; filename="${pdfFileName(quote)}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (reservation) await releaseDownload(reservation).catch(() => {});
    console.error("pdf_render_failed", err instanceof Error ? err.message : "unknown");
    return pdfError(500, "No pudimos generar el PDF. Intentá nuevamente.");
  }
}
