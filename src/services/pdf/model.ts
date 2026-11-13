import { calculateTotals } from "@/domain/quote/calculations";
import { validUntil } from "@/domain/quote/defaults";
import type { Quote } from "@/domain/quote/schema";
import type { Currency, QuoteTotals } from "@/domain/quote/types";
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
}

export function resolveTemplate(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function buildPdfModel(quote: Quote, options: PdfRenderOptions): PdfModel {
  const template = resolveTemplate(options.templateId);
  const totals = calculateTotals(quote);
  const currency = quote.currency;
  const money = (value: string) => formatMoney(value, currency);
  const accent =
    options.allowCustomColor && quote.accentColor ? quote.accentColor : template.accent;

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
