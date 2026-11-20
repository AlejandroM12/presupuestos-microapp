"use client";

import { useCallback, useEffect, useState } from "react";
import { ANONYMOUS, computeEntitlements, type Entitlements } from "@/domain/entitlements";

const FALLBACK: Loaded = { ...computeEntitlements(ANONYMOUS), purchasesOpen: false };

type Loaded = Entitlements & { purchasesOpen: boolean };

async function fetchEntitlements(): Promise<Loaded | null> {
  try {
    const response = await fetch("/api/me/entitlements", { cache: "no-store" });
    return response.ok ? ((await response.json()) as Loaded) : null;
  } catch {
    return null;
  }
}

/** Permisos informativos para la interfaz; el servidor los vuelve a validar en cada acción. */
export function useEntitlements(): {
  entitlements: Entitlements;
  purchasesOpen: boolean;
  refresh: () => Promise<void>;
} {
  const [value, setValue] = useState<Loaded>(FALLBACK);

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

  const { purchasesOpen, ...entitlements } = value;
  return { entitlements, purchasesOpen, refresh };
}
