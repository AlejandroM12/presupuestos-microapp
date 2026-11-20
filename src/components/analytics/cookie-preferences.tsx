"use client";

import { useEffect, useState } from "react";
import { hasTrackers, onChange, resetConsent } from "@/lib/analytics/client";

/** Enlace del pie para volver a elegir. Solo aparece si hay herramientas de medición configuradas. */
export function CookiePreferences() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(hasTrackers());
    update();
    return onChange(update);
  }, []);

  if (!visible) return null;
  return (
    <button type="button" onClick={resetConsent} className="hover:text-foreground">
      Preferencias de cookies
    </button>
  );
}
