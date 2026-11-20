import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { TrackEvent } from "@/components/analytics/track-event";
import { Logo } from "@/components/marketing/logo";
import { PRICING } from "@/lib/config/plans";
import { PaymentStatusPoller } from "@/components/billing/payment-status-poller";
import { buttonVariants } from "@/components/ui/button";
import { getGateway } from "@/integrations/mercadopago";
import { requireUser } from "@/server/auth/session";
import { isSubscriptionActive } from "@/domain/subscription";
import { latestPackPayment, processPaymentNotification } from "@/services/billing";
import { currentSubscription, reconcileUserSubscription } from "@/services/subscriptions";

export const metadata: Metadata = { title: "Resultado del pago", robots: { index: false } };

type Params = {
  kind?: string;
  payment_id?: string;
  collection_id?: string;
  preapproval_id?: string;
};

/**
 * El regreso desde Mercado Pago NO activa nada por sí mismo: si trae un identificador de
 * pago, se verifica contra la API del proveedor (igual que el webhook) y solo entonces
 * cambia el estado. Lo que se muestra surge siempre de nuestros registros.
 */
export default async function ResultPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser("/dashboard");
  const params = await searchParams;
  const paymentId = params.payment_id ?? params.collection_id;

  const isPro = params.kind === "pro";
  if (getGateway()) {
    try {
      if (isPro && params.preapproval_id && /^[\w-]{1,64}$/.test(params.preapproval_id)) {
        await reconcileUserSubscription(user.id, params.preapproval_id);
      }
      if (paymentId && /^\d{1,20}$/.test(paymentId)) {
        await processPaymentNotification(paymentId, { onlyForUserId: user.id });
      }
    } catch (error) {
      console.error("return_reconcile_failed", error instanceof Error ? error.message : "unknown");
    }
  }

  let status: "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED" | "PENDING" | null;
  // Datos de la compra confirmada para la medición (solo identificador opaco, plan e importe).
  let conversion: { id: string; plan: string; value: number } | null = null;
  if (isPro) {
    const sub = await currentSubscription(user.id);
    status = sub && isSubscriptionActive(sub) ? "APPROVED" : sub ? "PENDING" : null;
    if (sub) {
      conversion = {
        id: sub.id,
        plan: sub.plan === "YEARLY" ? "pro_yearly" : "pro_monthly",
        value: sub.plan === "YEARLY" ? PRICING.proYearly : PRICING.proMonthly,
      };
    }
  } else {
    const pack = await latestPackPayment(user.id);
    status = pack?.status ?? null;
    if (pack) conversion = { id: pack.id, plan: "pack", value: PRICING.premiumPack };
  }
  const product = isPro ? "plan Pro" : "Pack Premium";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center">
          {status === "APPROVED" ? (
            <>
              {/* La compra se informa SOLO cuando nuestros registros la confirman (no por visitar la URL de éxito). */}
              {conversion && (
                <TrackEvent
                  name="purchase"
                  once={`purchase_${conversion.id}`}
                  params={{
                    plan: conversion.plan,
                    value: conversion.value,
                    currency: "ARS",
                    transaction_id: conversion.id,
                  }}
                />
              )}
              <CheckCircle2 className="mx-auto size-10 text-brand" aria-hidden />
              <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
                ¡{isPro ? "Plan Pro activado" : "Pack Premium activado"}!
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isPro
                  ? "Ya tenés todos los diseños, historial en la nube, dashboard y descargas con uso razonable."
                  : "Ya podés usar los 5 diseños premium y descargar sin la marca de AtajoLab."}
              </p>
              <Link
                href="/crear"
                className={buttonVariants({ size: "lg", className: "mt-6 h-11" })}
              >
                Crear un presupuesto
              </Link>
            </>
          ) : status === "REJECTED" || status === "CANCELLED" ? (
            <>
              <XCircle className="mx-auto size-10 text-destructive" aria-hidden />
              <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
                No se pudo completar el pago
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                No se realizó ningún cargo. Podés intentarlo de nuevo con otro medio de pago.
              </p>
              <Link
                href="/crear"
                className={buttonVariants({ size: "lg", className: "mt-6 h-11" })}
              >
                Volver al editor
              </Link>
            </>
          ) : (
            <>
              <Clock className="mx-auto size-10 text-muted-foreground" aria-hidden />
              <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
                Estamos confirmando tu pago
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Puede demorar unos minutos. No hace falta que hagas nada: activamos tu {product}{" "}
                apenas Mercado Pago lo confirme.
              </p>
              <PaymentStatusPoller />
              <Link
                href="/crear"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "mt-6 h-11",
                })}
              >
                Volver al editor
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
