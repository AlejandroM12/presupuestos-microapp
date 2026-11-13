"use client";

import { useCallback, useEffect, useState } from "react";
import { ANONYMOUS, computeEntitlements, type Entitlements } from "@/domain/entitlements";

const FALLBACK = computeEntitlements(ANONYMOUS);

async function fetchEntitlements(): Promise<Entitlements | null> {
  try {
    const response = await fetch("/api/me/entitlements", { cache: "no-store" });
    return response.ok ? ((await response.json()) as Entitlements) : null;
  } catch {
    return null;
  }
}

/** Permisos informativos para la interfaz; el servidor los vuelve a validar en cada acción. */
export function useEntitlements(): { entitlements: Entitlements; refresh: () => Promise<void> } {
  const [value, setValue] = useState<Entitlements>(FALLBACK);

  const refresh = useCallback(async () => {
    const data = await fetchEntitlements();
    if (data) setValue(data);
  }, []);

  useEffect(() => {
    let active = true;
    fetchEntitlements().then((data) => {
      if (active && data) setValue(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return { entitlements: value, refresh };
}
