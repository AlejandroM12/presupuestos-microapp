import { getGateway } from "@/integrations/mercadopago";
import type { PaymentGateway } from "@/integrations/mercadopago/gateway";
import { siteConfig } from "@/lib/config/site";

export class PaymentsDisabledError extends Error {
  constructor() {
    super("Los pagos no están configurados");
  }
}
export class AlreadyOwnedError extends Error {
  constructor() {
    super("Ya tenés el Pack Premium");
  }
}
/** El pago informado no coincide con lo esperado (importe, moneda o identificador repetido). */
export class SuspiciousPaymentError extends Error {}

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
