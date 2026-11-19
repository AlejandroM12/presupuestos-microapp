"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomFieldConfig, CustomSectionConfig } from "@/domain/custom-template/config";

export interface PrivateTemplateMeta {
  id: string;
  name: string;
  description: string;
  version: number;
  accent: string;
  fields: CustomFieldConfig[];
  sections: CustomSectionConfig[];
}

async function fetchTemplates(): Promise<PrivateTemplateMeta[]> {
  try {
    const response = await fetch("/api/me/templates", { cache: "no-store" });
    if (!response.ok) return [];
    return ((await response.json()) as { templates: PrivateTemplateMeta[] }).templates;
  } catch {
    return [];
  }
}

/** Plantillas privadas de la cuenta (informativo; el servidor revalida cada uso). */
export function usePrivateTemplates(enabled: boolean) {
  const [templates, setTemplates] = useState<PrivateTemplateMeta[]>([]);
  const refresh = useCallback(async () => setTemplates(await fetchTemplates()), []);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin sesión no hay plantillas privadas
      setTemplates([]);
      return;
    }
    fetchTemplates().then((list) => {
      if (active) setTemplates(list);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { templates, refresh };
}
