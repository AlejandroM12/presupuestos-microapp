import { getGateway } from "@/integrations/mercadopago";
import type { PaymentGateway } from "@/integrations/mercadopago/gateway";
import { canPurchase } from "@/lib/config/sales";
import { siteConfig } from "@/lib/config/site";

export class PaymentsDisabledError extends Error {
  constructor() {
    super("Los pagos no están configurados");
  }
}
/** Las compras todavía no están abiertas para esta cuenta (compuerta comercial). */
export class SalesClosedError extends Error {
  constructor() {
    super("Las compras todavía no están abiertas");
  }
}
export class AlreadyOwnedError extends Error {
  constructor() {
    super("Ya tenés el Pack Premium");
  }
}
/** El pago informado no coincide con lo esperado (importe, moneda o identificador repetido). */
export class SuspiciousPaymentError extends Error {}

/** Primer control de toda compra: se evalúa antes de tocar el proveedor o la base de datos. */
export function assertPurchaseAllowed(email: string): void {
  if (!canPurchase(email)) throw new SalesClosedError();
}

export function requireGateway(): PaymentGateway {
  const gateway = getGateway();
  if (!gateway) throw new PaymentsDisabledError();
  return gateway;
}

export function returnUrls(kind: string) {
  const base = `${siteConfig.url}/pago/resultado?kind=${kind}`;
  return {
    success: `${base}&status=success`,
    pending: `${base}&status=pending`,
    failure: `${base}&status=failure`,
  };
}

export const notificationUrl = () =>
  siteConfig.url.startsWith("https://") ? `${siteConfig.url}/api/webhooks/mercadopago` : null;
