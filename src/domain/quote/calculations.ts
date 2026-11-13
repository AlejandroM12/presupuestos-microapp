import { D, parseDecimal, toMoneyString, type Dec } from "./decimal";
import type {
  AdjustmentInput,
  CalculationInput,
  LineResult,
  QuoteItemInput,
  QuoteTotals,
  TaxResult,
} from "./types";

const ZERO = new D(0);
const HUNDRED = new D(100);

function num(value: string): Dec {
  return parseDecimal(value) ?? ZERO;
}

function round2(value: Dec): Dec {
  return value.toDecimalPlaces(2, D.ROUND_HALF_UP);
}

function clamp(value: Dec, min: Dec, max: Dec): Dec {
  return D.min(D.max(value, min), max);
}

/** Importe de un concepto: cantidad x precio, menos descuento, redondeado a 2 decimales. */
export function calculateLine(item: QuoteItemInput): LineResult {
  const gross = round2(num(item.quantity).times(num(item.unitPrice)));
  const pct = clamp(num(item.discountPercent), ZERO, HUNDRED);
  const discount = round2(gross.times(pct).dividedBy(HUNDRED));
  return {
    id: item.id,
    gross: toMoneyString(gross),
    discount: toMoneyString(discount),
    amount: toMoneyString(gross.minus(discount)),
  };
}

function adjustmentAmount(adj: AdjustmentInput, base: Dec): Dec {
  const value = D.max(num(adj.value), ZERO);
  if (adj.type === "percent") return round2(base.times(value).dividedBy(HUNDRED));
  return round2(value);
}

/**
 * Orden de cálculo:
 * 1. Subtotal = suma de importes de línea.
 * 2. Descuento global sobre el subtotal (nunca mayor al subtotal).
 * 3. Recargo global sobre el subtotal con descuento.
 * 4. Impuestos manuales sobre la base imponible (subtotal - descuento + recargo).
 * 5. Total = base imponible + impuestos.
 */
export function calculateTotals(input: CalculationInput): QuoteTotals {
  const lines = input.items.map(calculateLine);
  const subtotal = lines.reduce((acc, l) => acc.plus(l.amount), ZERO);

  const discount = D.min(adjustmentAmount(input.globalDiscount, subtotal), subtotal);
  const afterDiscount = subtotal.minus(discount);
  const surcharge = adjustmentAmount(input.surcharge, afterDiscount);
  const taxableBase = afterDiscount.plus(surcharge);

  const taxes: TaxResult[] = input.taxes.map((t) => ({
    id: t.id,
    label: t.label,
    amount: toMoneyString(adjustmentAmount(t, taxableBase)),
  }));
  const taxTotal = taxes.reduce((acc, t) => acc.plus(t.amount), ZERO);

  return {
    lines,
    subtotal: toMoneyString(subtotal),
    globalDiscount: toMoneyString(discount),
    surcharge: toMoneyString(surcharge),
    taxableBase: toMoneyString(taxableBase),
    taxes,
    taxTotal: toMoneyString(taxTotal),
    total: toMoneyString(taxableBase.plus(taxTotal)),
  };
}
