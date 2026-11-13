import Decimal from "decimal.js";

/** Config aislada: no alteramos el Decimal global de otros consumidores. */
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dec = InstanceType<typeof D>;

const DECIMAL_RE = /^-?\d+([.,]\d+)?$/;

export function isDecimalString(value: string): boolean {
  return DECIMAL_RE.test(value.trim());
}

/** Acepta "12.5" o "12,5". Devuelve null si el texto no es un decimal válido. */
export function parseDecimal(value: string | number | null | undefined): Dec | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!DECIMAL_RE.test(text)) return null;
  return new D(text.replace(",", "."));
}

export function toMoneyString(value: Dec): string {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}
