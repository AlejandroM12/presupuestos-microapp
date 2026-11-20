/**
 * Compuerta comercial: aunque haya credenciales de cobro cargadas, las compras solo se permiten
 * cuando se abren de forma explícita. Es una decisión del servidor (no de la interfaz).
 *
 * - `SALES_ENABLED=true`: ventas abiertas al público.
 * - `SALES_ALLOWLIST=a@x.com,b@y.com`: con las ventas cerradas, solo esas cuentas pueden comprar
 *   (compra real controlada de validación).
 * - Cualquier otro caso: cerrado. Los webhooks, reembolsos y cancelaciones siguen funcionando.
 */
export function salesOpen(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SALES_ENABLED?.trim().toLowerCase() === "true";
}

export function salesAllowlist(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.SALES_ALLOWLIST ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function canPurchase(email: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return salesOpen(env) || salesAllowlist(env).includes(email.trim().toLowerCase());
}
