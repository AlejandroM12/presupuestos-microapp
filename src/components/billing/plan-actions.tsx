"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  monthlyLabel: string;
  yearlyLabel: string;
  /** Planes que se pueden contratar ahora (se ocultan los ya vigentes). */
  canMonthly: boolean;
  canYearly: boolean;
  canCancel: boolean;
  /** Fecha legible hasta la que se mantiene el acceso al cancelar. */
  accessUntil: string | null;
}

export function PlanActions({
  monthlyLabel,
  yearlyLabel,
  canMonthly,
  canYearly,
  canCancel,
  accessUntil,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function subscribe(plan: "MONTHLY" | "YEARLY") {
    setBusy(plan);
    setError("");
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;
      if (response.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data?.error ?? "No pudimos iniciar el pago. Intentá de nuevo.");
    } catch {
      setError("No hay conexión. Revisá tu internet e intentá otra vez.");
    }
    setBusy(null);
  }

  async function cancel() {
    setBusy("cancel");
    setError("");
    try {
      const response = await fetch("/api/billing/subscription", { method: "DELETE" });
      if (response.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No pudimos cancelar la suscripción. Intentá de nuevo.");
      }
    } catch {
      setError("No hay conexión. Revisá tu internet e intentá otra vez.");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {canMonthly && (
          <Button
            type="button"
            size="lg"
            className="h-11"
            disabled={busy !== null}
            onClick={() => subscribe("MONTHLY")}
          >
            {busy === "MONTHLY" && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Suscribirme · {monthlyLabel}/mes
          </Button>
        )}
        {canYearly && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11"
            disabled={busy !== null}
            onClick={() => subscribe("YEARLY")}
          >
            {busy === "YEARLY" && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Plan anual · {yearlyLabel}/año
          </Button>
        )}
      </div>

      {canCancel &&
        (confirming ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <p className="text-ink">
              Si cancelás, no vamos a renovar tu plan.
              {accessUntil ? ` Conservás Pro hasta el ${accessUntil}.` : ""} Tus presupuestos quedan
              en modo lectura al finalizar.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="lg"
                disabled={busy !== null}
                onClick={cancel}
              >
                {busy === "cancel" && <Loader2 className="animate-spin" data-icon="inline-start" />}
                Sí, cancelar suscripción
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setConfirming(false)}>
                Volver
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="ghost" size="lg" onClick={() => setConfirming(true)}>
            Cancelar suscripción
          </Button>
        ))}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
