"use client";

import { Eye, Lock } from "lucide-react";
import type { UseFormSetValue } from "react-hook-form";
import { BuyPackButton } from "@/components/billing/buy-pack-button";
import { TemplateThumb } from "@/components/marketing/template-thumb";
import { Button } from "@/components/ui/button";
import type { Entitlements } from "@/domain/entitlements";
import type { QuoteDraft } from "@/domain/quote/schema";
import { TEMPLATES } from "@/domain/templates";
import { cn } from "@/lib/utils";

interface Props {
  templateId: string;
  accentColor: string;
  entitlements: Entitlements;
  setValue: UseFormSetValue<QuoteDraft>;
  onPreview: () => void;
  previewBusy: boolean;
}

export function DesignSection({
  templateId,
  accentColor,
  entitlements,
  setValue,
  onPreview,
  previewBusy,
}: Props) {
  const selected = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const locked = !entitlements.templates.includes(selected.id);
  const colorValue = /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : selected.accent;

  return (
    <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Diseño del PDF</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Elegí cómo se ve el documento final. Los diseños con candado son parte del Pack Premium.
      </p>

      <div
        role="radiogroup"
        aria-label="Diseño del PDF"
        className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6"
      >
        {TEMPLATES.map((t) => {
          const isLocked = !entitlements.templates.includes(t.id);
          const active = t.id === templateId;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${t.name}${isLocked ? " (premium)" : ""}`}
              onClick={() => setValue("templateId", t.id, { shouldDirty: true })}
              className={cn(
                "group relative rounded-lg p-1.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
                active ? "bg-ink/5 ring-2 ring-ink" : "hover:bg-muted",
              )}
            >
              <TemplateThumb template={t} />
              <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-ink">
                {t.name}
                {isLocked && <Lock className="size-3 text-muted-foreground" aria-hidden />}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{selected.description}</p>

      {locked && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <Lock className="size-4 text-brand" aria-hidden />
          <p className="min-w-0 flex-1 text-ink">
            <strong>{selected.name}</strong> es un diseño premium. Podés ver cómo queda tu
            presupuesto antes de comprarlo.
          </p>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={previewBusy}
            onClick={onPreview}
          >
            <Eye data-icon="inline-start" /> Ver vista previa
          </Button>
          <BuyPackButton authenticated={entitlements.authenticated} returnTo="/crear" />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label htmlFor="accent-color" className="text-xs font-medium text-ink">
          Color de acento
        </label>
        <input
          id="accent-color"
          type="color"
          value={colorValue}
          disabled={!entitlements.allowCustomColor}
          onChange={(e) => setValue("accentColor", e.target.value, { shouldDirty: true })}
          className="h-9 w-12 cursor-pointer rounded border border-input bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {entitlements.allowCustomColor ? (
          accentColor && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setValue("accentColor", "", { shouldDirty: true })}
            >
              Restablecer
            </Button>
          )
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden /> La personalización de colores es parte del Pack
            Premium.
          </span>
        )}
      </div>
    </section>
  );
}
