import { calculateTotals } from "@/domain/quote/calculations";
import { validUntil } from "@/domain/quote/defaults";
import type { Quote } from "@/domain/quote/schema";
import type { Currency, QuoteTotals } from "@/domain/quote/types";
import type {
  CustomFieldConfig,
  CustomSectionConfig,
  CustomStyleConfig,
} from "@/domain/custom-template/config";
import { TEMPLATES, type TemplateMeta } from "@/domain/templates";
import { formatDateAr, formatMoney } from "@/lib/format";

export interface PdfRenderOptions {
  templateId: string;
  /** Muestra la marca AtajoLab en el pie (solo diseño gratuito). */
  showBrand: boolean;
  /** Permite usar el color personalizado del presupuesto. */
  allowCustomColor: boolean;
  /** Vista previa: agrega marca de agua y no es el documento final. */
  preview?: boolean;
  /** Configuración de una plantilla privada ya resuelta en el servidor (versión publicada). */
  custom?: CustomRenderConfig;
}

/** Datos declarativos de una plantilla privada: nunca HTML ni código. */
export interface CustomRenderConfig {
  name: string;
  style: CustomStyleConfig;
  fields: CustomFieldConfig[];
  sections: CustomSectionConfig[];
}

export interface CustomFieldBlock {
  title: string;
  rows: { label: string; value: string }[];
}

export interface PdfItemRow {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discount: string;
  amount: string;
}

/** Datos ya formateados y listos para dibujar; las plantillas no calculan nada. */
export interface PdfModel {
  quote: Quote;
  template: TemplateMeta;
  currency: Currency;
  accent: string;
  showBrand: boolean;
  preview: boolean;
  issueDate: string;
  validUntilDate: string;
  rows: PdfItemRow[];
  totals: QuoteTotals;
  money: (value: string) => string;
  hasDiscount: boolean;
  hasSurcharge: boolean;
  /** Presente solo al renderizar una plantilla privada. */
  custom?: { name: string; style: CustomStyleConfig; blocks: CustomFieldBlock[] };
}

/** Formatea los valores de campos personalizados que deben verse en el PDF, agrupados por sección. */
export function buildCustomBlocks(
  config: CustomRenderConfig,
  values: Quote["customFieldValues"],
  money: (v: string) => string,
): CustomFieldBlock[] {
  const sections = [...config.sections].sort((a, b) => a.position - b.position);
  const visible = [...config.fields]
    .filter((f) => f.showInPdf)
    .sort((a, b) => a.position - b.position);

  const format = (f: CustomFieldConfig): string | null => {
    const v = values[f.id];
    if (v === undefined || v === null || v === "") return null;
    switch (f.type) {
      case "checkbox":
        return v ? "Sí" : null;
      case "money":
        return money(String(v));
      case "date":
        return formatDateAr(String(v));
      default:
        return String(v);
    }
  };

  const groups: { id: string | undefined; title: string }[] = [
    ...sections.map((s) => ({ id: s.id, title: s.title })),
    { id: undefined, title: "" },
  ];
  const blocks: CustomFieldBlock[] = [];
  for (const g of groups) {
    const rows = visible
      .filter((f) =>
        g.id === undefined ? !sections.some((s) => s.id === f.sectionId) : f.sectionId === g.id,
      )
      .map((f) => ({ label: f.label, value: format(f) }))
      .filter((r): r is { label: string; value: string } => r.value !== null);
    if (rows.length > 0) blocks.push({ title: g.title, rows });
  }
  return blocks;
}

export function resolveTemplate(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function buildPdfModel(quote: Quote, options: PdfRenderOptions): PdfModel {
  const base = resolveTemplate(options.templateId);
  const template = options.custom
    ? { ...base, id: options.templateId, name: options.custom.name, tier: "premium" as const }
    : base;
  const totals = calculateTotals(quote);
  const currency = quote.currency;
  const money = (value: string) => formatMoney(value, currency);
  const defaultAccent = options.custom?.style.accentColor ?? template.accent;
  const accent = options.allowCustomColor && quote.accentColor ? quote.accentColor : defaultAccent;

  const rows: PdfItemRow[] = quote.items.map((item, i) => ({
    description: item.description,
    quantity: `${item.quantity.replace(".", ",")} ${item.unit}`,
    unit: item.unit,
    unitPrice: money(item.unitPrice.replace(",", ".")),
    discount: Number(item.discountPercent.replace(",", ".")) > 0 ? `${item.discountPercent}%` : "—",
    amount: money(totals.lines[i].amount),
  }));

  return {
    quote,
    template,
    currency,
    accent,
    showBrand: options.showBrand,
    preview: options.preview ?? false,
    issueDate: formatDateAr(quote.date),
    validUntilDate: formatDateAr(validUntil(quote.date, quote.validityDays)),
    rows,
    totals,
    money,
    hasDiscount: Number(totals.globalDiscount) > 0,
    hasSurcharge: Number(totals.surcharge) > 0,
    custom: options.custom
      ? {
          name: options.custom.name,
          style: options.custom.style,
          blocks: buildCustomBlocks(options.custom, quote.customFieldValues, money),
        }
      : undefined,
  };
}

export function pdfFileName(quote: Pick<Quote, "number" | "customer">): string {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const parts = ["Presupuesto", clean(quote.number), clean(quote.customer.name)].filter(Boolean);
  return `${parts.join("-").slice(0, 80)}.pdf`;
}
