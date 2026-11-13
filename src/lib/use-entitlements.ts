"use client";

import { useEffect, useState } from "react";
import { ANONYMOUS, computeEntitlements, type Entitlements } from "@/domain/entitlements";

const FALLBACK = computeEntitlements(ANONYMOUS);

/** Permisos informativos para la interfaz; el servidor los vuelve a validar en cada acción. */
export function useEntitlements(): Entitlements {
  const [value, setValue] = useState<Entitlements>(FALLBACK);
  useEffect(() => {
    let active = true;
    fetch("/api/me/entitlements", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Entitlements>) : null))
      .then((data) => {
        if (active && data) setValue(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return value;
}
