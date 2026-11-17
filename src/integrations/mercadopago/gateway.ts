import type { PaymentStatus } from "@/generated/prisma/client";

/** Estados de un pago tal como los informa Mercado Pago (subconjunto relevante). */
export type ProviderPaymentStatus =
  | "approved"
  | "pending"
  | "in_process"
  | "in_mediation"
  | "authorized"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back"
  | string;

export interface GatewayPayment {
  id: string;
  status: ProviderPaymentStatus;
  externalReference: string | null;
  amount: number;
  currency: string;
  payerEmail: string | null;
  /** Identificador de la suscripción (preapproval) si el pago es una renovación. */
  subscriptionId: string | null;
}

/**
 * Cuota/factura de una suscripción (`authorized_payments`).
 * Documentación: GET /authorized_payments/{id}.
 * El cobro real vive en `payment` (puede faltar si la cuota aún no se debitó).
 */
export interface GatewayAuthorizedPayment {
  id: string;
  /** Identificador de la suscripción (preapproval) en Mercado Pago. */
  preapprovalId: string | null;
  externalReference: string | null;
  amount: number;
  currency: string;
  /** Estado de la cuota: scheduled, processed, recycling, cancelled, etc. */
  status: string;
  payment: { id: string; status: ProviderPaymentStatus } | null;
}

export interface CheckoutSession {
  id: string;
  /** URL a la que se redirige a la persona para pagar. */
  checkoutUrl: string;
}

export interface CreatePreferenceInput {
  externalReference: string;
  title: string;
  /** Importe entero en ARS (nunca proviene del cliente). */
  amount: number;
  payerEmail: string;
  backUrls: { success: string; pending: string; failure: string };
  notificationUrl: string | null;
}

export type SubscriptionStatusFromProvider =
  "pending" | "authorized" | "paused" | "cancelled" | string;

export interface GatewaySubscription {
  id: string;
  status: SubscriptionStatusFromProvider;
  externalReference: string | null;
  amount: number | null;
  currency: string | null;
  payerEmail: string | null;
  /** Próxima fecha de cobro informada por el proveedor. */
  nextPaymentDate: Date | null;
}

export interface CreateSubscriptionInput {
  externalReference: string;
  reason: string;
  amount: number;
  frequency: { every: number; unit: "months" };
  payerEmail: string;
  backUrl: string;
}

/** Contrato mínimo con el proveedor de pagos. Permite probar la lógica con un doble. */
export interface PaymentGateway {
  createPreference(input: CreatePreferenceInput): Promise<CheckoutSession>;
  getPayment(paymentId: string): Promise<GatewayPayment | null>;
  createSubscription(input: CreateSubscriptionInput): Promise<CheckoutSession>;
  getSubscription(subscriptionId: string): Promise<GatewaySubscription | null>;
  /** Cuota recurrente notificada por el tema `subscription_authorized_payment`. */
  getAuthorizedPayment(authorizedPaymentId: string): Promise<GatewayAuthorizedPayment | null>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}

/** Traduce el estado del proveedor al estado interno. Los desconocidos se tratan como pendientes. */
export function mapPaymentStatus(status: ProviderPaymentStatus): PaymentStatus {
  switch (status) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    default:
      return "PENDING";
  }
}
