"use client";

import type { UseFormSetValue } from "react-hook-form";
import { Input, Select, Textarea } from "@/components/ui/fields";
import type { QuoteDraft } from "@/domain/quote/schema";
import type { PrivateTemplateMeta } from "@/lib/use-private-templates";

type Values = NonNullable<QuoteDraft["customFieldValues"]>;

interface Props {
  template: PrivateTemplateMeta;
  values: Values;
  setValue: UseFormSetValue<QuoteDraft>;
  disabled?: boolean;
}

/** Campos definidos por la plantilla privada elegida; se guardan en `customFieldValues`. */
export function CustomFieldsSection({ template, values, setValue, disabled }: Props) {
  const sections = [...template.sections].sort((a, b) => a.position - b.position);
  const fields = [...template.fields].sort((a, b) => a.position - b.position);
  if (fields.length === 0) return null;

  const groups = [
    ...sections.map((s) => ({ key: s.id, title: s.title, description: s.description })),
    { key: "", title: sections.length > 0 ? "Otros datos" : "", description: "" },
  ]
    .map((g) => ({
      ...g,
      fields: fields.filter((f) =>
        g.key ? f.sectionId === g.key : !sections.some((s) => s.id === f.sectionId),
      ),
    }))
    .filter((g) => g.fields.length > 0);

  const set = (id: string, value: string | number | boolean | null) =>
    setValue("customFieldValues", { ...values, [id]: value }, { shouldDirty: true });

  return (
    <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Datos de {template.name}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Campos propios de tu plantilla. Se incluyen en el PDF.
      </p>
      {groups.map((g) => (
        <div key={g.key || "otros"} className="mt-5">
          {g.title && <h3 className="text-sm font-semibold text-ink">{g.title}</h3>}
          {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {g.fields.map((f) => {
              const id = `cf-${f.id}`;
              const raw = values[f.id];
              const text = raw === null || raw === undefined ? "" : String(raw);
              if (f.type === "checkbox") {
                return (
                  <label key={f.id} className="flex items-center gap-2 text-sm">
                    <input
                      id={id}
                      type="checkbox"
                      checked={raw === true}
                      disabled={disabled}
                      onChange={(e) => set(f.id, e.target.checked)}
                    />
                    {f.label}
                  </label>
                );
              }
              const numeric = f.type === "number" || f.type === "money";
              return (
                <div
                  key={f.id}
                  className={f.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
                >
                  <label htmlFor={id} className="block text-xs font-medium text-ink">
                    {f.label}
                    {f.required && <span aria-hidden> *</span>}
                  </label>
                  {f.type === "textarea" ? (
                    <Textarea
                      id={id}
                      value={text}
                      placeholder={f.placeholder}
                      disabled={disabled}
                      required={f.required}
                      onChange={(e) => set(f.id, e.target.value)}
                    />
                  ) : f.type === "select" ? (
                    <Select
                      id={id}
                      value={text}
                      disabled={disabled}
                      required={f.required}
                      onChange={(e) => set(f.id, e.target.value || null)}
                    >
                      <option value="">Seleccionar…</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={id}
                      type={numeric ? "number" : f.type === "date" ? "date" : "text"}
                      step={f.type === "money" ? "0.01" : undefined}
                      inputMode={numeric ? "decimal" : undefined}
                      value={text}
                      placeholder={f.placeholder}
                      disabled={disabled}
                      required={f.required}
                      min={f.min}
                      max={f.max}
                      onChange={(e) => {
                        const v = e.target.value;
                        set(f.id, numeric ? (v === "" ? null : Number(v)) : v);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
