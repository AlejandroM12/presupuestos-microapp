"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recarga la página cada pocos segundos mientras el pago sigue pendiente (máx. ~2 minutos). */
export function PaymentStatusPoller() {
  const router = useRouter();
  useEffect(() => {
    let runs = 0;
    const id = setInterval(() => {
      runs += 1;
      if (runs > 24) {
        clearInterval(id);
        return;
      }
      router.refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [router]);
  return (
    <p className="mt-4 text-xs text-muted-foreground" role="status">
      Actualizando automáticamente…
    </p>
  );
}
