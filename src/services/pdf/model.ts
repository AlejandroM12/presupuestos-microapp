import { calculateTotals } from "@/domain/quote/calculations";
import { D } from "@/domain/quote/decimal";
import { formatCount, formatQuantity } from "@/domain/quote/units";
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

export interface CustomFieldRow {
  label: string;
  value: string;
  /** Ocupa todo el ancho aunque la sección tenga dos columnas (textos largos). */
  wide: boolean;
}

export interface CustomFieldBlock {
  title: string;
  /** Columnas efectivas de la sección (1 o 2). */
  columns: 1 | 2;
  rows: CustomFieldRow[];
}

export interface CustomHighlight {
  label: string;
  value: string;
}

export interface CustomAdvance {
  label: string;
  amount: string;
  balance: string;
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
  custom?: {
    name: string;
    style: CustomStyleConfig;
    blocks: CustomFieldBlock[];
    highlights: CustomHighlight[];
    advance?: CustomAdvance;
  };
}

function formatFieldValue(
  f: CustomFieldConfig,
  v: string | number | boolean | null | undefined,
  money: (v: string) => string,
): string | null {
  if (v === undefined || v === null || v === "") return null;
  switch (f.type) {
    case "checkbox":
      return v ? "Sí" : null;
    case "money":
      return money(String(v));
    case "number": {
      const n = Number(v);
      const text = Number.isFinite(n) ? formatCount(n) : String(v);
      return f.unit ? `${text} ${f.unit}` : text;
    }
    case "date":
      return formatDateAr(String(v));
    default:
      return f.unit ? `${String(v)} ${f.unit}` : String(v);
  }
}

/** Resultado de aplicar la configuración de una plantilla privada a los valores de un presupuesto. */
export function buildCustomView(
  config: CustomRenderConfig,
  values: Quote["customFieldValues"],
  money: (v: string) => string,
  total: string,
): NonNullable<PdfModel["custom"]> {
  const sections = [...config.sections].sort((a, b) => a.position - b.position);
  const fields = [...config.fields]
    .filter((f) => f.showInPdf)
    .sort((a, b) => a.position - b.position);

  // Anticipo: el importe del campo con rol "advance" y el saldo pendiente calculado con decimales.
  let advance: CustomAdvance | undefined;
  const advField = fields.find((f) => f.role === "advance");
  const advRaw = advField ? values[advField.id] : undefined;
  if (advField && advRaw !== undefined && advRaw !== null && advRaw !== "") {
    const amount = new D(String(advRaw).replace(",", "."));
    const balance = D.max(new D(total).minus(amount), 0);
    advance = {
      label: advField.label,
      amount: money(amount.toFixed(2)),
      balance: money(balance.toFixed(2)),
    };
  }

  const highlights: CustomHighlight[] = [];
  const rowsOf = (list: CustomFieldConfig[]): CustomFieldRow[] =>
    list.flatMap((f) => {
      if (f.role === "advance") return [];
      const value = formatFieldValue(f, values[f.id], money);
      if (value === null) return [];
      if (f.highlight && highlights.length < 4) {
        highlights.push({ label: f.label, value });
        return [];
      }
      return [{ label: f.label, value, wide: f.type === "textarea" }];
    });

  const inSection = (id: string) => fields.filter((f) => f.sectionId === id);
  const loose = fields.filter((f) => !sections.some((s) => s.id === f.sectionId));
  const blocks: CustomFieldBlock[] = [];
  // Las fichas se reúnen primero para respetar el orden aunque estén en secciones distintas.
  const bySection = sections.map((s) => ({ s, rows: rowsOf(inSection(s.id)) }));
  const looseRows = rowsOf(loose);
  const norm = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  for (const { s, rows } of bySection) {
    if (rows.length > 0) {
      // Una sección con un único campo del mismo nombre no repite el título.
      const redundant = rows.length === 1 && norm(rows[0].label) === norm(s.title);
      blocks.push({
        title: redundant ? "" : s.title,
        columns: s.columns ?? config.style.sectionColumns,
        rows,
      });
    }
  }
  if (looseRows.length > 0) {
    blocks.push({ title: "", columns: config.style.sectionColumns, rows: looseRows });
  }
  return { name: config.name, style: config.style, blocks, highlights, advance };
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
    quantity: formatQuantity(item.quantity, item.unit),
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
      ? buildCustomView(options.custom, quote.customFieldValues, money, totals.total)
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
