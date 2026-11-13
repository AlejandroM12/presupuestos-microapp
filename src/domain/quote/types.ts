export const CURRENCIES = ["ARS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const SUGGESTED_UNITS = [
  "Unidad",
  "Hora",
  "Día",
  "Metro",
  "Metro cuadrado",
  "Kilogramo",
  "Servicio",
  "Trabajo",
] as const;

export type AdjustmentType = "percent" | "fixed";

export interface QuoteItemInput {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  /** Porcentaje de descuento del concepto (0 a 100). */
  discountPercent: string;
}

export interface AdjustmentInput {
  type: AdjustmentType;
  value: string;
}

export interface TaxInput {
  id: string;
  label: string;
  type: AdjustmentType;
  value: string;
}

export interface CalculationInput {
  items: QuoteItemInput[];
  globalDiscount: AdjustmentInput;
  surcharge: AdjustmentInput;
  taxes: TaxInput[];
}

/** Todos los importes se devuelven como strings con 2 decimales. */
export interface LineResult {
  id: string;
  gross: string;
  discount: string;
  amount: string;
}

export interface TaxResult {
  id: string;
  label: string;
  amount: string;
}

export interface QuoteTotals {
  lines: LineResult[];
  subtotal: string;
  globalDiscount: string;
  surcharge: string;
  taxableBase: string;
  taxes: TaxResult[];
  taxTotal: string;
  total: string;
}
