import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import type { PaymentGateway } from "./gateway";
import { MercadoPagoSdkGateway } from "./sdk-gateway";

let override: PaymentGateway | null | undefined;
let cached: PaymentGateway | null | undefined;

/** Para pruebas: inyecta un doble del proveedor (undefined restablece el comportamiento normal). */
export function setGateway(gateway: PaymentGateway | null | undefined): void {
  override = gateway;
}

/** Devuelve el proveedor configurado, o null si faltan las credenciales (pagos deshabilitados). */
export function getGateway(): PaymentGateway | null {
  if (override !== undefined) return override;
  if (cached !== undefined) return cached;
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  cached = token ? new MercadoPagoSdkGateway(token) : null;
  return cached;
}

export function paymentsEnabled(): boolean {
  return getGateway() !== null;
}

export interface WebhookHeaders {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}

/** Verifica que la notificación provenga de Mercado Pago (HMAC con tolerancia de 5 minutos). */
export function verifyWebhookSignature(
  headers: WebhookHeaders,
  secret: string | undefined = process.env.MERCADOPAGO_WEBHOOK_SECRET,
  now?: () => number,
): boolean {
  if (!secret) return false;
  try {
    WebhookSignatureValidator.validate({
      xSignature: headers.xSignature,
      xRequestId: headers.xRequestId,
      dataId: headers.dataId,
      secret,
      toleranceSeconds: 300,
      ...(now ? { now } : {}),
    });
    return true;
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) return false;
    throw error;
  }
}
