import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { PaymentStatusPoller } from "@/components/billing/payment-status-poller";
import { buttonVariants } from "@/components/ui/button";
import { getGateway } from "@/integrations/mercadopago";
import { requireUser } from "@/server/auth/session";
import { latestPackPayment, processPaymentNotification } from "@/services/billing";

export const metadata: Metadata = { title: "Resultado del pago", robots: { index: false } };

type Params = { kind?: string; payment_id?: string; collection_id?: string };

/**
 * El regreso desde Mercado Pago NO activa nada por sí mismo: si trae un identificador de
 * pago, se verifica contra la API del proveedor (igual que el webhook) y solo entonces
 * cambia el estado. Lo que se muestra surge siempre de nuestros registros.
 */
export default async function ResultPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser("/dashboard");
  const params = await searchParams;
  const paymentId = params.payment_id ?? params.collection_id;

  if (paymentId && /^\d{1,20}$/.test(paymentId) && getGateway()) {
    try {
      await processPaymentNotification(paymentId, { onlyForUserId: user.id });
    } catch (error) {
      console.error("return_reconcile_failed", error instanceof Error ? error.message : "unknown");
    }
  }

  const payment = await latestPackPayment(user.id);
  const status = payment?.status ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center">
          {status === "APPROVED" ? (
            <>
              <CheckCircle2 className="mx-auto size-10 text-brand" aria-hidden />
              <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
                ¡Pack Premium activado!
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Ya podés usar los 5 diseños premium y descargar sin la marca de AtajoLab.
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
                Puede demorar unos minutos. No hace falta que hagas nada: activamos el Pack apenas
                Mercado Pago lo confirme.
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
