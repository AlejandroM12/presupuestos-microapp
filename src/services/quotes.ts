import { calculateTotals } from "@/domain/quote/calculations";
import { D } from "@/domain/quote/decimal";
import { defaultQuote } from "@/domain/quote/defaults";
import {
  customerSchema,
  issuerSchema,
  quoteSchema,
  type Quote,
  type QuoteDraft,
} from "@/domain/quote/schema";
import type { AdjustmentType, TaxInput } from "@/domain/quote/types";
import { Prisma, type QuoteStatus } from "@/generated/prisma/client";
import { looksLikeCustomTemplateId } from "@/domain/custom-template/access";
import { db } from "@/server/db";
import { resolveCustomTemplateVersionId } from "./custom-templates";

export class NotFoundError extends Error {
  constructor(what = "Recurso") {
    super(`${what} no encontrado`);
  }
}

export const QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"] as const;

const kindOut = (t: AdjustmentType) =>
  (t === "percent" ? "PERCENT" : "FIXED") as "PERCENT" | "FIXED";
const kindIn = (k: "PERCENT" | "FIXED"): AdjustmentType => (k === "PERCENT" ? "percent" : "fixed");

/** Normaliza un decimal ("2,5" o "2.50") al formato que acepta la base. */
function dbDecimal(value: string): string {
  return new D(value.replace(",", ".")).toString();
}

/** Muestra un decimal de la base sin ceros sobrantes ("2.5000" -> "2.5"). */
export function trimDecimal(value: { toString(): string } | string): string {
  const d = new D(value.toString());
  return d.isInteger() ? d.toFixed(0) : d.toFixed().replace(/0+$/, "");
}

function ownedQuoteInclude() {
  return { items: { orderBy: { position: "asc" as const } } };
}

function buildData(quote: Quote) {
  const totals = calculateTotals(quote);
  return {
    number: quote.number,
    title: quote.title,
    description: quote.description,
    currency: quote.currency,
    issueDate: new Date(`${quote.date}T00:00:00.000Z`),
    validityDays: quote.validityDays,
    notes: quote.notes,
    terms: quote.terms,
    deliveryTime: quote.deliveryTime,
    paymentTerms: quote.paymentTerms,
    templateId: quote.templateId,
    accentColor: quote.accentColor,
    customFieldValues: quote.customFieldValues as Prisma.InputJsonObject,
    discountKind: kindOut(quote.globalDiscount.type),
    discountValue: dbDecimal(quote.globalDiscount.value),
    surchargeKind: kindOut(quote.surcharge.type),
    surchargeValue: dbDecimal(quote.surcharge.value),
    taxes: quote.taxes as unknown as Prisma.InputJsonValue,
    issuerSnapshot: quote.issuer as unknown as Prisma.InputJsonValue,
    customerSnapshot: quote.customer as unknown as Prisma.InputJsonValue,
    subtotal: totals.subtotal,
    discountTotal: totals.globalDiscount,
    surchargeTotal: totals.surcharge,
    taxTotal: totals.taxTotal,
    total: totals.total,
    items: quote.items.map((item, position) => ({
      position,
      description: item.description,
      quantity: dbDecimal(item.quantity),
      unit: item.unit,
      unitPrice: dbDecimal(item.unitPrice),
      discountPercent: dbDecimal(item.discountPercent),
      amount: totals.lines[position].amount,
    })),
  };
}

type QuoteRow = Prisma.QuoteGetPayload<{ include: ReturnType<typeof ownedQuoteInclude> }>;

/** Reconstruye el borrador editable a partir de lo guardado (usando los snapshots). */
export function rowToDraft(row: QuoteRow): QuoteDraft {
  const issuer = issuerSchema.safeParse(row.issuerSnapshot);
  const customer = customerSchema.safeParse(row.customerSnapshot);
  const empty = defaultQuote();
  return {
    number: row.number,
    date: row.issueDate.toISOString().slice(0, 10),
    validityDays: row.validityDays,
    title: row.title,
    description: row.description,
    currency: row.currency,
    notes: row.notes,
    terms: row.terms,
    deliveryTime: row.deliveryTime,
    paymentTerms: row.paymentTerms,
    issuer: issuer.success ? issuer.data : empty.issuer,
    customer: customer.success ? customer.data : empty.customer,
    items: row.items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: trimDecimal(i.quantity),
      unit: i.unit,
      unitPrice: trimDecimal(i.unitPrice),
      discountPercent: trimDecimal(i.discountPercent),
    })),
    globalDiscount: { type: kindIn(row.discountKind), value: trimDecimal(row.discountValue) },
    surcharge: { type: kindIn(row.surchargeKind), value: trimDecimal(row.surchargeValue) },
    taxes: Array.isArray(row.taxes) ? (row.taxes as unknown as TaxInput[]) : [],
    templateId: row.templateId,
    accentColor: row.accentColor,
    customFieldValues: (row.customFieldValues ?? {}) as Record<
      string,
      string | number | boolean | null
    >,
  };
}

export interface QuoteSummary {
  id: string;
  number: string;
  title: string;
  status: QuoteStatus;
  currency: "ARS" | "USD";
  total: string;
  customerName: string;
  customerId: string | null;
  issueDate: string;
  updatedAt: Date;
}

function toSummary(row: {
  id: string;
  number: string;
  title: string;
  status: QuoteStatus;
  currency: "ARS" | "USD";
  total: { toFixed(n: number): string };
  customerId: string | null;
  customerSnapshot: unknown;
  issueDate: Date;
  updatedAt: Date;
}): QuoteSummary {
  const name = (row.customerSnapshot as { name?: string } | null)?.name ?? "";
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    status: row.status,
    currency: row.currency,
    total: row.total.toFixed(2),
    customerName: name,
    customerId: row.customerId,
    issueDate: row.issueDate.toISOString().slice(0, 10),
    updatedAt: row.updatedAt,
  };
}

async function assertCustomerOwned(userId: string, customerId: string | null | undefined) {
  if (!customerId) return;
  const found = await db.customer.findFirst({
    where: { id: customerId, userId },
    select: { id: true },
  });
  if (!found) throw new NotFoundError("Cliente");
}

/**
 * Si el diseño es una plantilla privada, exige una asignación vigente de esta cuenta y devuelve
 * la versión publicada que quedará asociada al presupuesto. Para diseños del catálogo devuelve null.
 */
async function assertPrivateTemplateUsable(
  userId: string,
  templateId: string,
): Promise<string | null> {
  if (!looksLikeCustomTemplateId(templateId)) return null;
  const assignment = await db.customTemplateAssignment.findFirst({
    where: { userId, templateId, revokedAt: null, template: { status: "ACTIVE" } },
    select: { id: true },
  });
  if (!assignment) throw new NotFoundError("Plantilla");
  return resolveCustomTemplateVersionId(templateId);
}

export async function createQuote(
  userId: string,
  input: unknown,
  options: { customerId?: string | null } = {},
): Promise<{ id: string }> {
  const quote = quoteSchema.parse(input);
  await assertCustomerOwned(userId, options.customerId);
  const customTemplateVersionId = await assertPrivateTemplateUsable(userId, quote.templateId);
  const { items, ...data } = buildData(quote);
  const created = await db.quote.create({
    data: {
      ...data,
      customTemplateVersionId,
      userId,
      customerId: options.customerId ?? null,
      items: { create: items },
    },
    select: { id: true },
  });
  return created;
}

export async function getQuote(userId: string, id: string) {
  const row = await db.quote.findFirst({ where: { id, userId }, include: ownedQuoteInclude() });
  if (!row) throw new NotFoundError("Presupuesto");
  return {
    id: row.id,
    status: row.status,
    customerId: row.customerId,
    customTemplateVersionId: row.customTemplateVersionId,
    draft: rowToDraft(row),
  };
}

export async function updateQuote(
  userId: string,
  id: string,
  input: unknown,
  options: { customerId?: string | null } = {},
): Promise<void> {
  const quote = quoteSchema.parse(input);
  await assertCustomerOwned(userId, options.customerId);
  const customTemplateVersionId = await assertPrivateTemplateUsable(userId, quote.templateId);
  const { items, ...data } = buildData(quote);
  await db.$transaction(async (tx) => {
    const owned = await tx.quote.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) throw new NotFoundError("Presupuesto");
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    await tx.quote.update({
      where: { id },
      data: {
        ...data,
        customTemplateVersionId,
        ...(options.customerId !== undefined ? { customerId: options.customerId } : {}),
        items: { create: items },
      },
    });
  });
}

export async function deleteQuote(userId: string, id: string): Promise<void> {
  const result = await db.quote.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new NotFoundError("Presupuesto");
}

export async function setQuoteStatus(
  userId: string,
  id: string,
  status: QuoteStatus,
): Promise<void> {
  if (!QUOTE_STATUSES.includes(status)) throw new Error("Estado inválido");
  const result = await db.quote.updateMany({ where: { id, userId }, data: { status } });
  if (result.count === 0) throw new NotFoundError("Presupuesto");
}

/** Copia un presupuesto con estado borrador, fecha de hoy y número nuevo sugerido. */
export async function duplicateQuote(userId: string, id: string, today: Date = new Date()) {
  const original = await getQuote(userId, id);
  const copy = {
    ...original.draft,
    number: await nextQuoteNumber(userId),
    date: today.toISOString().slice(0, 10),
    items: original.draft.items.map((i) => ({ ...i, id: crypto.randomUUID() })),
  };
  return createQuote(userId, copy, { customerId: original.customerId });
}

/** Siguiente número correlativo: el mayor numérico existente + 1, con el mismo relleno de ceros. */
export async function nextQuoteNumber(userId: string): Promise<string> {
  const rows = await db.quote.findMany({ where: { userId }, select: { number: true } });
  let max = 0;
  let width = 4;
  for (const { number } of rows) {
    if (/^\d+$/.test(number)) {
      max = Math.max(max, Number(number));
      width = Math.max(width, number.length);
    }
  }
  return String(max + 1).padStart(width, "0");
}

export interface ListQuotesParams {
  search?: string;
  status?: QuoteStatus;
  customerId?: string;
  page?: number;
  pageSize?: number;
}

export async function listQuotes(userId: string, params: ListQuotesParams = {}) {
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
  const page = Math.max(params.page ?? 1, 1);
  const term = params.search?.trim();
  const where: Prisma.QuoteWhereInput = {
    userId,
    ...(params.status ? { status: params.status } : {}),
    ...(params.customerId ? { customerId: params.customerId } : {}),
    ...(term
      ? {
          OR: [
            { title: { contains: term, mode: "insensitive" } },
            { number: { contains: term, mode: "insensitive" } },
            { customerSnapshot: { path: ["name"], string_contains: term, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.quote.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.quote.count({ where }),
  ]);
  return { items: rows.map(toSummary), total, page, pageSize };
}

export interface QuoteStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  /** Importe total presupuestado por moneda (nunca se suman monedas distintas). */
  amountByCurrency: Record<string, string>;
}

export async function quoteStats(userId: string): Promise<QuoteStats> {
  const [byStatus, byCurrency] = await Promise.all([
    db.quote.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
    db.quote.groupBy({ by: ["currency"], where: { userId }, _sum: { total: true } }),
  ]);
  const count = (s: QuoteStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
  return {
    total: byStatus.reduce((acc, r) => acc + r._count._all, 0),
    pending: count("DRAFT") + count("SENT"),
    accepted: count("ACCEPTED"),
    rejected: count("REJECTED"),
    amountByCurrency: Object.fromEntries(
      byCurrency.map((r) => [r.currency, (r._sum.total ?? new Prisma.Decimal(0)).toFixed(2)]),
    ),
  };
}

export async function recentQuotes(userId: string, take = 5): Promise<QuoteSummary[]> {
  const rows = await db.quote.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take });
  return rows.map(toSummary);
}
