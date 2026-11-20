"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getConsent,
  hasTrackers,
  init,
  onChange,
  pageView,
  setConsent,
  track,
} from "@/lib/analytics/client";
import type { AnalyticsEvent } from "@/lib/analytics/events";

const SIGNUP_COOKIE = "ph_signup";

function useConsentState() {
  return useSyncExternalStore(
    (cb) => onChange(cb),
    () => `${getConsent() ?? "none"}|${hasTrackers()}`,
    () => "none|false",
  );
}

/**
 * Inicializa la medición: lee la configuración pública, aplica el consentimiento, registra los
 * clics marcados con `data-track` y dispara el registro completado. Si no hay identificadores
 * configurados no muestra nada ni carga scripts de terceros.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const state = useConsentState();

  useEffect(() => {
    let active = true;
    fetch("/api/analytics-config", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((cfg) => {
        if (!active) return;
        init(cfg);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Clics en elementos marcados: <a data-track="cta_start" data-track-location="hero">
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.("[data-track]") as HTMLElement | null;
      if (!el) return;
      track(el.dataset.track as AnalyticsEvent, { location: el.dataset.trackLocation });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Cambios de ruta y registro completado (cookie efímera que deja la acción de registro).
  useEffect(() => {
    if (!ready) return;
    pageView();
    if (document.cookie.split("; ").some((c) => c.startsWith(`${SIGNUP_COOKIE}=`))) {
      document.cookie = `${SIGNUP_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
      track("sign_up");
    }
  }, [pathname, ready]);

  const [consent, trackers] = state.split("|");
  if (!ready || trackers !== "true" || consent !== "none") return null;

  return (
    <div
      role="dialog"
      aria-label="Preferencias de cookies"
      data-testid="consent-banner"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border border-border bg-white p-4 shadow-lg"
    >
      <p className="text-sm text-ink">
        Usamos cookies de medición (Meta, TikTok y Google) para saber qué anuncios funcionan. Solo
        se activan si las aceptás.{" "}
        <Link href="/legal/privacidad" className="underline">
          Más información
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="h-10 flex-1 rounded-lg bg-ink px-4 text-sm font-medium text-white"
        >
          Aceptar
        </button>
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="h-10 flex-1 rounded-lg border border-border bg-white px-4 text-sm font-medium text-ink"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
