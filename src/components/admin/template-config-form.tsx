"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import {
  CUSTOM_FIELD_TYPES,
  customTemplateConfigSchema,
  type CustomFieldType,
} from "@/domain/custom-template/config";
import { rasterizePdf } from "@/lib/pdf-raster";

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto corto",
  textarea: "Texto largo",
  number: "Número",
  date: "Fecha",
  select: "Lista de opciones",
  checkbox: "Casilla (sí/no)",
  money: "Importe",
};

const HEADER_LABELS = {
  classic: "Clásico (logo y datos a la izquierda)",
  banner: "Banda de color a todo el ancho",
  boxed: "Ficha del documento a la derecha",
} as const;
const TABLE_LABELS = {
  tinted: "Encabezado con fondo suave",
  lines: "Líneas simples",
  zebra: "Encabezado de color y filas alternadas",
  grid: "Cuadrícula",
} as const;
const TOTALS_LABELS = {
  bar: "Barra de color",
  box: "Recuadro",
  plain: "Línea simple",
} as const;

const FONT_LABELS = {
  sans: "Moderna (Inter)",
  serif: "Clásica con serif (Lora)",
  mono: "Técnica monoespaciada (JetBrains Mono)",
} as const;

interface FieldDraft {
  id: string;
  /** Los campos que ya existían conservan su id: cambiarlo rompería los presupuestos guardados. */
  locked: boolean;
  label: string;
  type: CustomFieldType;
  placeholder: string;
  defaultValue: string;
  required: boolean;
  showInPdf: boolean;
  sectionId: string;
  options: string;
  highlight: boolean;
  unit: string;
  /** Solo importes: se muestra como anticipo y se calcula el saldo pendiente. */
  advance: boolean;
}
interface SectionDraft {
  id: string;
  locked: boolean;
  title: string;
  description: string;
  /** "" = usa la distribución del estilo. */
  columns: "" | "1" | "2";
}
interface StyleDraft {
  accentColor: string;
  fontFamily: keyof typeof FONT_LABELS;
  headerTitle: string;
  headerSubtitle: string;
  footerText: string;
  showLogo: boolean;
  headerVariant: keyof typeof HEADER_LABELS;
  tableStyle: keyof typeof TABLE_LABELS;
  totalsStyle: keyof typeof TOTALS_LABELS;
  density: "standard" | "compact";
  sectionColumns: "1" | "2";
  showTerms: boolean;
  approval: boolean;
  approvalText: string;
}
interface Draft {
  style: StyleDraft;
  sections: SectionDraft[];
  fields: FieldDraft[];
}

type RawConfig = {
  style?: Partial<Omit<StyleDraft, "sectionColumns">> & { sectionColumns?: 1 | 2 };
  sections?: {
    id: string;
    title: string;
    description?: string;
    position?: number;
    columns?: 1 | 2;
  }[];
  fields?: {
    id: string;
    label: string;
    type: CustomFieldType;
    placeholder?: string;
    defaultValue?: string | number | boolean;
    required?: boolean;
    showInPdf?: boolean;
    sectionId?: string;
    options?: string[];
    position?: number;
    highlight?: boolean;
    unit?: string;
    role?: "advance";
  }[];
};

function slugId(text: string, taken: Set<string>): string {
  const base =
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "campo";
  let id = /^[a-z]/.test(base) ? base : `c_${base}`;
  for (let i = 2; taken.has(id); i++) id = `${base}_${i}`.replace(/^(\d)/, "c_$1");
  return id;
}

function fromConfig(raw: RawConfig): Draft {
  const byPos = <T extends { position?: number }>(list: T[]) =>
    [...list].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return {
    style: {
      accentColor: raw.style?.accentColor ?? "#1f2937",
      fontFamily: raw.style?.fontFamily ?? "sans",
      headerTitle: raw.style?.headerTitle ?? "",
      headerSubtitle: raw.style?.headerSubtitle ?? "",
      footerText: raw.style?.footerText ?? "",
      showLogo: raw.style?.showLogo ?? true,
      headerVariant: raw.style?.headerVariant ?? "classic",
      tableStyle: raw.style?.tableStyle ?? "tinted",
      totalsStyle: raw.style?.totalsStyle ?? "bar",
      density: raw.style?.density ?? "standard",
      sectionColumns: String(raw.style?.sectionColumns ?? 1) as "1" | "2",
      showTerms: raw.style?.showTerms ?? true,
      approval: raw.style?.approval ?? false,
      approvalText: raw.style?.approvalText ?? "",
    },
    sections: byPos(raw.sections ?? []).map((s) => ({
      id: s.id,
      locked: true,
      title: s.title,
      description: s.description ?? "",
      columns: s.columns ? (String(s.columns) as "1" | "2") : "",
    })),
    fields: byPos(raw.fields ?? []).map((f) => ({
      id: f.id,
      locked: true,
      label: f.label,
      type: f.type,
      placeholder: f.placeholder ?? "",
      defaultValue: f.defaultValue === undefined ? "" : String(f.defaultValue),
      required: f.required ?? false,
      showInPdf: f.showInPdf ?? true,
      sectionId: f.sectionId ?? "",
      options: (f.options ?? []).join("\n"),
      highlight: f.highlight ?? false,
      unit: f.unit ?? "",
      advance: f.role === "advance",
    })),
  };
}

function toConfig(d: Draft) {
  return {
    style: {
      ...d.style,
      accentColor: d.style.accentColor || undefined,
      sectionColumns: Number(d.style.sectionColumns),
    },
    sections: d.sections.map((s, i) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      columns: s.columns ? Number(s.columns) : undefined,
      position: i,
    })),
    fields: d.fields.map((f, i) => {
      let defaultValue: string | number | boolean | undefined;
      if (f.defaultValue !== "") {
        if (f.type === "number" || f.type === "money") defaultValue = Number(f.defaultValue);
        else if (f.type === "checkbox") defaultValue = f.defaultValue === "true";
        else defaultValue = f.defaultValue;
      }
      return {
        id: f.id,
        label: f.label,
        type: f.type,
        placeholder: f.placeholder,
        defaultValue,
        required: f.required,
        showInPdf: f.showInPdf,
        sectionId: f.sectionId || undefined,
        options:
          f.type === "select"
            ? f.options
                .split("\n")
                .map((o) => o.trim())
                .filter(Boolean)
            : undefined,
        position: i,
        highlight: f.highlight,
        unit: f.unit || undefined,
        role: f.advance && f.type === "money" ? ("advance" as const) : undefined,
      };
    }),
  };
}

/** Errores legibles antes de guardar (el servidor vuelve a validar todo con el mismo esquema). */
function validate(d: Draft): string[] {
  const errors: string[] = [];
  const parsed = customTemplateConfigSchema.safeParse(toConfig(d));
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [kind, index, prop] = issue.path;
      const where =
        kind === "fields"
          ? `Campo ${Number(index) + 1}${d.fields[Number(index)]?.label ? ` («${d.fields[Number(index)].label}»)` : ""}`
          : kind === "sections"
            ? `Sección ${Number(index) + 1}`
            : "Estilo";
      errors.push(`${where}${prop ? ` · ${String(prop)}` : ""}: ${issue.message}`);
    }
  }
  const dup = d.fields.map((f) => f.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (dup.length) errors.push(`Identificadores repetidos: ${[...new Set(dup)].join(", ")}`);
  d.fields.forEach((f, i) => {
    if (f.type === "select" && !f.options.trim()) {
      errors.push(`Campo ${i + 1} («${f.label}»): agregá al menos una opción`);
    }
    if (
      (f.type === "number" || f.type === "money") &&
      f.defaultValue !== "" &&
      !Number.isFinite(Number(f.defaultValue))
    ) {
      errors.push(`Campo ${i + 1} («${f.label}»): el valor predeterminado debe ser un número`);
    }
  });
  return [...new Set(errors)];
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

interface Props {
  templateId: string;
  action: (form: FormData) => void | Promise<void>;
  name: string;
  description: string;
  config: unknown;
  disabled?: boolean;
}

export function TemplateConfigForm({
  templateId,
  action,
  name,
  description,
  config,
  disabled,
}: Props) {
  const [draft, setDraft] = useState<Draft>(() => fromConfig(config as RawConfig));
  const [advanced, setAdvanced] = useState(false);
  const [json, setJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [preview, setPreview] = useState<{ pages: string[]; busy: boolean; error: string }>({
    pages: [],
    busy: false,
    error: "",
  });

  const errors = useMemo(() => validate(draft), [draft]);
  const serialized = useMemo(() => JSON.stringify(toConfig(draft)), [draft]);

  const setStyle = (patch: Partial<StyleDraft>) =>
    setDraft((d) => ({ ...d, style: { ...d.style, ...patch } }));
  const setField = (i: number, patch: Partial<FieldDraft>) =>
    setDraft((d) => ({
      ...d,
      fields: d.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)),
    }));
  const setSection = (i: number, patch: Partial<SectionDraft>) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));

  function addField() {
    setDraft((d) => {
      const id = slugId("campo", new Set(d.fields.map((f) => f.id)));
      return {
        ...d,
        fields: [
          ...d.fields,
          {
            id,
            locked: false,
            label: "Nuevo campo",
            type: "text",
            placeholder: "",
            defaultValue: "",
            required: false,
            showInPdf: true,
            sectionId: "",
            options: "",
            highlight: false,
            unit: "",
            advance: false,
          },
        ],
      };
    });
  }
  function relabel(i: number, label: string) {
    setDraft((d) => {
      const f = d.fields[i];
      const taken = new Set(d.fields.filter((_, j) => j !== i).map((x) => x.id));
      const id = f.locked ? f.id : slugId(label, taken);
      return { ...d, fields: d.fields.map((x, j) => (j === i ? { ...x, label, id } : x)) };
    });
  }
  function addSection() {
    setDraft((d) => {
      const id = slugId("seccion", new Set(d.sections.map((s) => s.id)));
      return {
        ...d,
        sections: [
          ...d.sections,
          { id, locked: false, title: "Nueva sección", description: "", columns: "" },
        ],
      };
    });
  }
  function removeSection(i: number) {
    setDraft((d) => {
      const gone = d.sections[i].id;
      return {
        ...d,
        sections: d.sections.filter((_, j) => j !== i),
        fields: d.fields.map((f) => (f.sectionId === gone ? { ...f, sectionId: "" } : f)),
      };
    });
  }

  function openAdvanced() {
    setJson(JSON.stringify(toConfig(draft), null, 2));
    setJsonError("");
    setAdvanced(true);
  }
  function closeAdvanced() {
    try {
      setDraft(fromConfig(JSON.parse(json) as RawConfig));
      setJsonError("");
      setAdvanced(false);
    } catch {
      setJsonError("El JSON no es válido: corregilo antes de volver al formulario.");
    }
  }

  async function refreshPreview() {
    setPreview((p) => ({ ...p, busy: true, error: "" }));
    try {
      const body = advanced ? JSON.parse(json) : toConfig(draft);
      const response = await fetch(`/api/admin/templates/${templateId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: body }),
      });
      if (!response.ok) throw new Error("preview");
      const pages = await rasterizePdf(await (await response.blob()).arrayBuffer(), 640);
      setPreview((p) => {
        p.pages.forEach((u) => URL.revokeObjectURL(u));
        return { pages, busy: false, error: "" };
      });
    } catch {
      setPreview((p) => ({
        ...p,
        busy: false,
        error: "No se pudo generar la vista previa. Revisá la configuración.",
      }));
    }
  }

  const blocked = disabled || (advanced ? !!jsonError : errors.length > 0);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={templateId} />
      <input type="hidden" name="config" value={advanced ? json : serialized} />
      <Field label="Nombre" htmlFor="name">
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <Field label="Descripción" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={description} />
      </Field>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">
          {advanced ? "Modo avanzado (JSON)" : "Configuración"}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={advanced ? closeAdvanced : openAdvanced}
        >
          {advanced ? "Volver al formulario" : "Modo avanzado (JSON)"}
        </Button>
      </div>

      {advanced ? (
        <Field
          label="Estilo, campos y secciones (JSON)"
          htmlFor="config-json"
          error={jsonError}
          hint="Para configuraciones específicas (por ejemplo mínimos y máximos de un campo). El servidor valida el resultado con las mismas reglas."
        >
          <Textarea
            id="config-json"
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              try {
                JSON.parse(e.target.value);
                setJsonError("");
              } catch {
                setJsonError("El JSON no es válido.");
              }
            }}
            spellCheck={false}
            className="min-h-72 font-mono text-xs"
          />
        </Field>
      ) : (
        <>
          <fieldset className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
            <legend className="px-1 text-xs font-semibold text-ink">Estilo</legend>
            <Field label="Color de acento" htmlFor="accent">
              <div className="flex items-center gap-2">
                <input
                  id="accent"
                  type="color"
                  value={
                    /^#[0-9a-f]{6}$/i.test(draft.style.accentColor)
                      ? draft.style.accentColor
                      : "#1f2937"
                  }
                  onChange={(e) => setStyle({ accentColor: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded border border-input bg-white p-1"
                />
                <Input
                  aria-label="Color en formato hexadecimal"
                  value={draft.style.accentColor}
                  onChange={(e) => setStyle({ accentColor: e.target.value })}
                  className="w-32 font-mono"
                  maxLength={7}
                />
              </div>
            </Field>
            <Field label="Tipografía" htmlFor="font">
              <Select
                id="font"
                value={draft.style.fontFamily}
                onChange={(e) =>
                  setStyle({ fontFamily: e.target.value as StyleDraft["fontFamily"] })
                }
              >
                {Object.entries(FONT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Título del documento" htmlFor="htitle" hint="Por defecto: Presupuesto">
              <Input
                id="htitle"
                value={draft.style.headerTitle}
                maxLength={120}
                onChange={(e) => setStyle({ headerTitle: e.target.value })}
              />
            </Field>
            <Field label="Subtítulo del encabezado" htmlFor="hsub">
              <Input
                id="hsub"
                value={draft.style.headerSubtitle}
                maxLength={200}
                onChange={(e) => setStyle({ headerSubtitle: e.target.value })}
              />
            </Field>
            <Field label="Texto del pie" htmlFor="foot" className="sm:col-span-2">
              <Input
                id="foot"
                value={draft.style.footerText}
                maxLength={300}
                onChange={(e) => setStyle({ footerText: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.style.showLogo}
                onChange={(e) => setStyle({ showLogo: e.target.checked })}
              />
              Mostrar el logo del negocio
            </label>
            <Field label="Encabezado" htmlFor="hvariant">
              <Select
                id="hvariant"
                value={draft.style.headerVariant}
                onChange={(e) =>
                  setStyle({ headerVariant: e.target.value as StyleDraft["headerVariant"] })
                }
              >
                {Object.entries(HEADER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tabla de conceptos" htmlFor="tstyle">
              <Select
                id="tstyle"
                value={draft.style.tableStyle}
                onChange={(e) =>
                  setStyle({ tableStyle: e.target.value as StyleDraft["tableStyle"] })
                }
              >
                {Object.entries(TABLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Totales" htmlFor="totstyle">
              <Select
                id="totstyle"
                value={draft.style.totalsStyle}
                onChange={(e) =>
                  setStyle({ totalsStyle: e.target.value as StyleDraft["totalsStyle"] })
                }
              >
                {Object.entries(TOTALS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Densidad" htmlFor="density">
              <Select
                id="density"
                value={draft.style.density}
                onChange={(e) => setStyle({ density: e.target.value as StyleDraft["density"] })}
              >
                <option value="standard">Estándar</option>
                <option value="compact">Compacta (menos espacio entre bloques)</option>
              </Select>
            </Field>
            <Field label="Columnas de los campos" htmlFor="scols">
              <Select
                id="scols"
                value={draft.style.sectionColumns}
                onChange={(e) => setStyle({ sectionColumns: e.target.value as "1" | "2" })}
              >
                <option value="1">Una columna</option>
                <option value="2">Dos columnas</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.style.showTerms}
                onChange={(e) => setStyle({ showTerms: e.target.checked })}
              />
              Mostrar observaciones y condiciones comerciales
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.style.approval}
                onChange={(e) => setStyle({ approval: e.target.checked })}
              />
              Incluir bloque de aprobación (firma, aclaración y fecha)
            </label>
            {draft.style.approval && (
              <Field
                label="Título del bloque de aprobación"
                htmlFor="apptext"
                className="sm:col-span-2"
              >
                <Input
                  id="apptext"
                  value={draft.style.approvalText}
                  maxLength={200}
                  placeholder="Aprobación del cliente"
                  onChange={(e) => setStyle({ approvalText: e.target.value })}
                />
              </Field>
            )}
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-xs font-semibold text-ink">Secciones</legend>
            {draft.sections.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Sin secciones: los campos se muestran juntos. Las secciones agrupan campos con un
                título.
              </p>
            )}
            {draft.sections.map((s, i) => (
              <div key={s.id} className="flex flex-wrap items-end gap-2 rounded-md bg-muted/40 p-3">
                <Field
                  label={`Sección ${i + 1}`}
                  htmlFor={`sec-${s.id}`}
                  className="min-w-48 flex-1"
                >
                  <Input
                    id={`sec-${s.id}`}
                    value={s.title}
                    maxLength={120}
                    onChange={(e) => setSection(i, { title: e.target.value })}
                  />
                </Field>
                <Field label="Columnas" htmlFor={`col-${s.id}`}>
                  <Select
                    id={`col-${s.id}`}
                    value={s.columns}
                    onChange={(e) => setSection(i, { columns: e.target.value as "" | "1" | "2" })}
                  >
                    <option value="">Como el estilo</option>
                    <option value="1">Una</option>
                    <option value="2">Dos</option>
                  </Select>
                </Field>
                <RowButtons
                  label={`sección ${i + 1}`}
                  onUp={() => setDraft((d) => ({ ...d, sections: move(d.sections, i, i - 1) }))}
                  onDown={() => setDraft((d) => ({ ...d, sections: move(d.sections, i, i + 1) }))}
                  onRemove={() => removeSection(i)}
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="lg" onClick={addSection}>
              <Plus data-icon="inline-start" /> Agregar sección
            </Button>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-xs font-semibold text-ink">Campos personalizados</legend>
            {draft.fields.length === 0 && (
              <p className="text-xs text-muted-foreground">Todavía no hay campos.</p>
            )}
            {draft.fields.map((f, i) => (
              <div key={f.id} className="space-y-3 rounded-md bg-muted/40 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Etiqueta" htmlFor={`lbl-${i}`}>
                    <Input
                      id={`lbl-${i}`}
                      value={f.label}
                      maxLength={120}
                      onChange={(e) => relabel(i, e.target.value)}
                    />
                  </Field>
                  <Field label="Tipo" htmlFor={`typ-${i}`}>
                    <Select
                      id={`typ-${i}`}
                      value={f.type}
                      onChange={(e) =>
                        setField(i, { type: e.target.value as CustomFieldType, defaultValue: "" })
                      }
                    >
                      {CUSTOM_FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {f.type === "checkbox" ? (
                    <Field label="Valor predeterminado" htmlFor={`def-${i}`}>
                      <Select
                        id={`def-${i}`}
                        value={f.defaultValue}
                        onChange={(e) => setField(i, { defaultValue: e.target.value })}
                      >
                        <option value="">Sin marcar</option>
                        <option value="true">Marcada</option>
                      </Select>
                    </Field>
                  ) : (
                    <Field label="Valor predeterminado" htmlFor={`def-${i}`}>
                      <Input
                        id={`def-${i}`}
                        value={f.defaultValue}
                        inputMode={
                          f.type === "number" || f.type === "money" ? "decimal" : undefined
                        }
                        onChange={(e) => setField(i, { defaultValue: e.target.value })}
                      />
                    </Field>
                  )}
                  <Field label="Texto de ayuda (placeholder)" htmlFor={`ph-${i}`}>
                    <Input
                      id={`ph-${i}`}
                      value={f.placeholder}
                      maxLength={200}
                      onChange={(e) => setField(i, { placeholder: e.target.value })}
                    />
                  </Field>
                  {draft.sections.length > 0 && (
                    <Field label="Sección" htmlFor={`sc-${i}`}>
                      <Select
                        id={`sc-${i}`}
                        value={f.sectionId}
                        onChange={(e) => setField(i, { sectionId: e.target.value })}
                      >
                        <option value="">Sin sección</option>
                        {draft.sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  {f.type === "select" && (
                    <Field
                      label="Opciones (una por línea)"
                      htmlFor={`opt-${i}`}
                      className="sm:col-span-2"
                    >
                      <Textarea
                        id={`opt-${i}`}
                        value={f.options}
                        onChange={(e) => setField(i, { options: e.target.value })}
                      />
                    </Field>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) => setField(i, { required: e.target.checked })}
                      />
                      Obligatorio
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={f.showInPdf}
                        onChange={(e) => setField(i, { showInPdf: e.target.checked })}
                      />
                      Mostrar en el PDF
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={f.highlight}
                        onChange={(e) => setField(i, { highlight: e.target.checked })}
                      />
                      Ficha destacada
                    </label>
                    {f.type === "money" && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={f.advance}
                          onChange={(e) => setField(i, { advance: e.target.checked })}
                        />
                        Es el anticipo (calcula el saldo)
                      </label>
                    )}
                    {(f.type === "number" || f.type === "text") && (
                      <label className="flex items-center gap-2">
                        Unidad
                        <Input
                          aria-label={`Unidad del campo ${i + 1}`}
                          value={f.unit}
                          maxLength={12}
                          placeholder="km, m²…"
                          className="h-8 w-24"
                          onChange={(e) => setField(i, { unit: e.target.value })}
                        />
                      </label>
                    )}
                    <span className="text-xs text-muted-foreground">id: {f.id}</span>
                  </div>
                  <RowButtons
                    label={`campo ${i + 1}`}
                    onUp={() => setDraft((d) => ({ ...d, fields: move(d.fields, i, i - 1) }))}
                    onDown={() => setDraft((d) => ({ ...d, fields: move(d.fields, i, i + 1) }))}
                    onRemove={() =>
                      setDraft((d) => ({ ...d, fields: d.fields.filter((_, j) => j !== i) }))
                    }
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="lg" onClick={addField}>
              <Plus data-icon="inline-start" /> Agregar campo
            </Button>
          </fieldset>

          {errors.length > 0 && (
            <ul
              role="alert"
              className="list-disc space-y-1 rounded-md bg-red-50 p-3 pl-6 text-xs text-destructive"
            >
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={blocked}>
          Guardar cambios
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={preview.busy || blocked}
          onClick={refreshPreview}
        >
          {preview.busy ? "Generando…" : "Vista previa de esta configuración"}
        </Button>
      </div>
      {preview.error && (
        <p role="status" className="text-xs text-destructive">
          {preview.error}
        </p>
      )}
      {preview.pages.length > 0 && (
        <div className="space-y-3" data-testid="admin-preview">
          {preview.pages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- imagen generada en el cliente (blob)
            <img
              key={src}
              src={src}
              alt={`Página ${i + 1} de la vista previa`}
              className="w-full max-w-[640px] rounded-md border border-border bg-white"
            />
          ))}
        </div>
      )}
    </form>
  );
}

function RowButtons({
  label,
  onUp,
  onDown,
  onRemove,
}: {
  label: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="outline"
        size="lg"
        aria-label={`Subir ${label}`}
        onClick={onUp}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        aria-label={`Bajar ${label}`}
        onClick={onDown}
      >
        <ArrowDown />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        aria-label={`Eliminar ${label}`}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
