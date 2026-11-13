import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { Quote } from "@/domain/quote/schema";
import { registerPdfFonts } from "./fonts";
import { buildPdfModel, type PdfModel, type PdfRenderOptions } from "./model";
import { MinimalistaDocument } from "./templates/minimalista";

type TemplateComponent = (props: { m: PdfModel }) => ReactElement;

/** Registro de plantillas: cada id del catálogo se asocia a su composición. */
const TEMPLATE_COMPONENTS: Record<string, TemplateComponent> = {
  minimalista: MinimalistaDocument,
};

export function hasTemplateComponent(id: string): boolean {
  return id in TEMPLATE_COMPONENTS;
}

export async function renderQuotePdf(quote: Quote, options: PdfRenderOptions): Promise<Buffer> {
  registerPdfFonts();
  const model = buildPdfModel(quote, options);
  const Template = TEMPLATE_COMPONENTS[model.template.id] ?? MinimalistaDocument;
  return renderToBuffer(<Template m={model} />);
}
