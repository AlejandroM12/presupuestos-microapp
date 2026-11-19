import { z } from "zod";

/** Tipos de campo permitidos. No hay HTML/JS arbitrario ni ejecución de código. */
export const CUSTOM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
  "money",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

/** Variantes estructurales permitidas: son datos, no código ni HTML. */
export const HEADER_VARIANTS = ["classic", "banner", "boxed"] as const;
export const TABLE_STYLES = ["tinted", "lines", "zebra", "grid"] as const;
export const TOTALS_STYLES = ["bar", "box", "plain"] as const;
export const FIELD_ROLES = ["advance"] as const;

const fieldId = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Identificador inválido");

export const customFieldSchema = z.object({
  id: fieldId,
  label: z.string().trim().min(1).max(120),
  type: z.enum(CUSTOM_FIELD_TYPES),
  placeholder: z.string().max(200).optional().default(""),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  required: z.boolean().default(false),
  position: z.number().int().min(0).max(999).default(0),
  options: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  showInPdf: z.boolean().default(true),
  sectionId: z.string().trim().max(64).optional(),
  /** Muestra el valor como ficha destacada bajo el encabezado (máximo 4 por documento). */
  highlight: z.boolean().optional().default(false),
  /** Sufijo de unidad que se imprime junto al valor (p. ej. "km", "m²"). */
  unit: z.string().trim().max(12).optional(),
  /** "advance": el importe se muestra como anticipo y se calcula el saldo pendiente. */
  role: z.enum(FIELD_ROLES).optional(),
});

export const customSectionSchema = z.object({
  id: fieldId,
  title: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  position: z.number().int().min(0).max(999).default(0),
  collapsible: z.boolean().default(false),
  /** Distribución de los campos de la sección; si falta se usa la del estilo. */
  columns: z.union([z.literal(1), z.literal(2)]).optional(),
});

export const customStyleSchema = z.object({
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  fontFamily: z.enum(["sans", "serif", "mono"]).optional().default("sans"),
  headerTitle: z.string().max(120).optional().default(""),
  headerSubtitle: z.string().max(200).optional().default(""),
  footerText: z.string().max(300).optional().default(""),
  showLogo: z.boolean().optional().default(true),
  headerVariant: z.enum(HEADER_VARIANTS).optional().default("classic"),
  tableStyle: z.enum(TABLE_STYLES).optional().default("tinted"),
  totalsStyle: z.enum(TOTALS_STYLES).optional().default("bar"),
  sectionColumns: z
    .union([z.literal(1), z.literal(2)])
    .optional()
    .default(1),
  /** Muestra observaciones y condiciones comerciales del presupuesto. */
  showTerms: z.boolean().optional().default(true),
  /** Bloque de aprobación del cliente (firma, aclaración, fecha). */
  approval: z.boolean().optional().default(false),
  approvalText: z.string().max(200).optional().default(""),
});

export const customTemplateConfigSchema = z
  .object({
    style: customStyleSchema.default(() => customStyleSchema.parse({})),
    fields: z.array(customFieldSchema).max(80).default([]),
    sections: z.array(customSectionSchema).max(30).default([]),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.fields.filter((f) => f.highlight).length > 4) {
      ctx.addIssue({ code: "custom", path: ["fields"], message: "Máximo 4 fichas destacadas" });
    }
    const advance = cfg.fields.filter((f) => f.role === "advance");
    if (advance.length > 1 || advance.some((f) => f.type !== "money")) {
      ctx.addIssue({
        code: "custom",
        path: ["fields"],
        message: "Solo un campo de importe puede ser el anticipo",
      });
    }
  });

export type CustomFieldConfig = z.infer<typeof customFieldSchema>;
export type CustomSectionConfig = z.infer<typeof customSectionSchema>;
export type CustomStyleConfig = z.infer<typeof customStyleSchema>;
export type CustomTemplateConfig = z.infer<typeof customTemplateConfigSchema>;

export function parseCustomTemplateConfig(input: unknown): CustomTemplateConfig {
  return customTemplateConfigSchema.parse(input);
}

/** Valida valores de usuario contra la definición de campos (sin ejecutar código). */
export function validateCustomFieldValues(
  fields: CustomFieldConfig[],
  values: Record<string, unknown>,
):
  | { ok: true; values: Record<string, string | number | boolean | null> }
  | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const out: Record<string, string | number | boolean | null> = {};

  for (const field of fields) {
    const raw = values[field.id];
    const empty =
      raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "");

    if (empty) {
      if (field.required) errors[field.id] = "Campo obligatorio";
      else out[field.id] = null;
      continue;
    }

    switch (field.type) {
      case "checkbox":
        out[field.id] = Boolean(raw);
        break;
      case "number":
      case "money": {
        const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
        if (!Number.isFinite(n)) {
          errors[field.id] = "Número inválido";
          break;
        }
        if (field.min !== undefined && n < field.min) errors[field.id] = `Mínimo ${field.min}`;
        else if (field.max !== undefined && n > field.max) errors[field.id] = `Máximo ${field.max}`;
        else out[field.id] = n;
        break;
      }
      case "select": {
        const s = String(raw);
        if (field.options && field.options.length > 0 && !field.options.includes(s)) {
          errors[field.id] = "Opción inválida";
        } else out[field.id] = s;
        break;
      }
      case "date": {
        const s = String(raw);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) errors[field.id] = "Fecha inválida";
        else out[field.id] = s;
        break;
      }
      default: {
        const s = String(raw).slice(0, field.type === "textarea" ? 4000 : 500);
        out[field.id] = s;
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, values: out };
}
