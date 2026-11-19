import { MercadoPagoConfig, MPNotFoundError, Payment, PreApproval, Preference } from "mercadopago";
import type {
  CheckoutSession,
  CreatePreferenceInput,
  CreateSubscriptionInput,
  GatewayAuthorizedPayment,
  GatewayPayment,
  GatewaySubscription,
  PaymentGateway,
} from "./gateway";

const API_BASE = "https://api.mercadopago.com";

function isNotFound(error: unknown): boolean {
  return error instanceof MPNotFoundError || (error as { status?: number })?.status === 404;
}

/** Implementación sobre el SDK oficial de Mercado Pago (Checkout Pro y Suscripciones). */
export class MercadoPagoSdkGateway implements PaymentGateway {
  private readonly accessToken: string;
  private readonly preference: Preference;
  private readonly payment: Payment;
  private readonly preApproval: PreApproval;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    const config = new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } });
    this.preference = new Preference(config);
    this.payment = new Payment(config);
    this.preApproval = new PreApproval(config);
  }

  async createPreference(input: CreatePreferenceInput): Promise<CheckoutSession> {
    const secure = input.backUrls.success.startsWith("https://");
    const response = await this.preference.create({
      body: {
        items: [
          {
            id: "premium_pack",
            title: input.title,
            quantity: 1,
            unit_price: input.amount,
            currency_id: "ARS",
          },
        ],
        payer: { email: input.payerEmail },
        external_reference: input.externalReference,
        back_urls: input.backUrls,
        // Mercado Pago solo admite auto_return y notificaciones con URLs públicas https.
        ...(secure ? { auto_return: "approved" } : {}),
        ...(input.notificationUrl && secure ? { notification_url: input.notificationUrl } : {}),
        statement_descriptor: "ATAJOLAB",
      },
      requestOptions: { idempotencyKey: input.externalReference },
    });
    if (!response.id || !response.init_point) throw new Error("Respuesta inválida de Mercado Pago");
    return { id: response.id, checkoutUrl: response.init_point };
  }

  async getPayment(paymentId: string): Promise<GatewayPayment | null> {
    try {
      const p = await this.payment.get({ id: paymentId });
      if (!p.id) return null;
      return {
        id: String(p.id),
        status: p.status ?? "pending",
        externalReference: p.external_reference ?? null,
        amount: Number(p.transaction_amount ?? 0),
        currency: p.currency_id ?? "ARS",
        payerEmail: p.payer?.email ?? null,
        subscriptionId:
          (p as { metadata?: { preapproval_id?: string } }).metadata?.preapproval_id ?? null,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<CheckoutSession> {
    const response = await this.preApproval.create({
      body: {
        reason: input.reason,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        back_url: input.backUrl,
        status: "pending",
        auto_recurring: {
          frequency: input.frequency.every,
          frequency_type: input.frequency.unit,
          transaction_amount: input.amount,
          currency_id: "ARS",
        },
      },
      requestOptions: { idempotencyKey: input.externalReference },
    });
    if (!response.id || !response.init_point) throw new Error("Respuesta inválida de Mercado Pago");
    return { id: response.id, checkoutUrl: response.init_point };
  }

  async getSubscription(subscriptionId: string): Promise<GatewaySubscription | null> {
    try {
      const s = await this.preApproval.get({ id: subscriptionId });
      if (!s.id) return null;
      return {
        id: s.id,
        status: s.status ?? "pending",
        externalReference: s.external_reference ?? null,
        amount: s.auto_recurring?.transaction_amount ?? null,
        currency: s.auto_recurring?.currency_id ?? null,
        payerEmail: (s as { payer_email?: string }).payer_email ?? null,
        nextPaymentDate: s.next_payment_date ? new Date(s.next_payment_date) : null,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  /**
   * El SDK Node no expone aún el cliente de authorized_payments; se consulta la API REST
   * documentada (GET /authorized_payments/{id}) con el mismo access token.
   */
  async getAuthorizedPayment(
    authorizedPaymentId: string,
  ): Promise<GatewayAuthorizedPayment | null> {
    const response = await fetch(
      `${API_BASE}/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Mercado Pago authorized_payments: HTTP ${response.status}`);
    }
    const body = (await response.json()) as {
      id?: number | string;
      preapproval_id?: string;
      external_reference?: string | number | null;
      transaction_amount?: string | number;
      currency_id?: string;
      status?: string;
      payment?: { id?: number | string; status?: string } | null;
    };
    if (body.id === undefined || body.id === null) return null;
    const nested = body.payment;
    return {
      id: String(body.id),
      preapprovalId: body.preapproval_id ?? null,
      externalReference:
        body.external_reference === undefined || body.external_reference === null
          ? null
          : String(body.external_reference),
      amount: Number(body.transaction_amount ?? 0),
      currency: body.currency_id ?? "ARS",
      status: body.status ?? "scheduled",
      payment:
        nested?.id !== undefined && nested.id !== null
          ? { id: String(nested.id), status: nested.status ?? "pending" }
          : null,
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.preApproval.update({ id: subscriptionId, body: { status: "cancelled" } });
  }
}
