"use client";

import { Loader2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

interface Props {
  authenticated: boolean;
  /** Ruta a la que volver tras iniciar sesión (solo se usa si no hay sesión). */
  returnTo?: string;
  label?: string;
}

/**
 * Inicia el pago del Pack Premium. El importe y la referencia los define el servidor;
 * acá solo se redirige a la URL de Checkout Pro que devuelve.
 */
export function BuyPackButton({
  authenticated,
  returnTo = "/crear",
  label = "Comprar Pack Premium",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!authenticated) {
    return (
      <Link
        href={`/registro?next=${encodeURIComponent(returnTo)}`}
        className={buttonVariants({ size: "lg" })}
      >
        <ShoppingBag data-icon="inline-start" /> {label}
      </Link>
    );
  }

  async function buy() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/pack", { method: "POST" });
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
    setBusy(false);
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" size="lg" disabled={busy} onClick={buy}>
        {busy ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <ShoppingBag data-icon="inline-start" />
        )}
        {label}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
