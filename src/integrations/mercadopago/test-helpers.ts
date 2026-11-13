import { createHmac } from "node:crypto";
import type {
  CheckoutSession,
  CreatePreferenceInput,
  CreateSubscriptionInput,
  GatewayPayment,
  GatewaySubscription,
  PaymentGateway,
} from "./gateway";

/** Firma una notificación como lo hace Mercado Pago (solo para pruebas). */
export function signWebhook(opts: {
  secret: string;
  dataId: string;
  requestId: string;
  ts?: number;
}) {
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const manifest = `id:${opts.dataId};request-id:${opts.requestId};ts:${ts};`;
  const hash = createHmac("sha256", opts.secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

/** Doble del proveedor de pagos: permite simular cualquier respuesta sin red ni credenciales. */
export class FakeGateway implements PaymentGateway {
  preferences: CreatePreferenceInput[] = [];
  subscriptions: CreateSubscriptionInput[] = [];
  payments = new Map<string, GatewayPayment>();
  remoteSubscriptions = new Map<string, GatewaySubscription>();
  cancelled: string[] = [];
  failCreate = false;

  async createPreference(input: CreatePreferenceInput): Promise<CheckoutSession> {
    if (this.failCreate) throw new Error("falla simulada");
    this.preferences.push(input);
    return {
      id: `pref-${this.preferences.length}`,
      checkoutUrl: `https://mp.test/checkout/${input.externalReference}`,
    };
  }

  async getPayment(id: string) {
    return this.payments.get(id) ?? null;
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<CheckoutSession> {
    if (this.failCreate) throw new Error("falla simulada");
    this.subscriptions.push(input);
    const id = `sub-${this.subscriptions.length}-${input.externalReference}`;
    return { id, checkoutUrl: `https://mp.test/subscribe/${id}` };
  }

  async getSubscription(id: string) {
    return this.remoteSubscriptions.get(id) ?? null;
  }

  async cancelSubscription(id: string) {
    this.cancelled.push(id);
    const current = this.remoteSubscriptions.get(id);
    if (current) this.remoteSubscriptions.set(id, { ...current, status: "cancelled" });
  }
}
