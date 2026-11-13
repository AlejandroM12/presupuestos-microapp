export function formatArs(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formatea un importe decimal (string con punto) con el estilo es-AR. No convierte monedas. */
export function formatMoney(amount: string, currency: "ARS" | "USD"): string {
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount as unknown as number);
  return `${currency === "USD" ? "US$" : "$"} ${formatted}`;
}

export function formatDateAr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
