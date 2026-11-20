"use client";

import { useEffect } from "react";
import { isFirst, track, trackOnce } from "@/lib/analytics/client";
import type { AnalyticsEvent, EventParams } from "@/lib/analytics/events";

/** Dispara un evento al montarse (una vez por montaje). `once` deduplica entre cargas. */
export function TrackEvent({
  name,
  params,
  once,
  first,
}: {
  name: AnalyticsEvent;
  params?: EventParams;
  /** Clave de deduplicación persistente (p. ej. el id de la compra). */
  once?: string;
  /** Marca el evento como primera vez en este navegador. */
  first?: string;
}) {
  useEffect(() => {
    const extra = first ? { first: isFirst(first) } : {};
    if (once) trackOnce(once, name, { ...params, ...extra });
    else track(name, { ...params, ...extra });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- un evento por montaje
  }, []);
  return null;
}
