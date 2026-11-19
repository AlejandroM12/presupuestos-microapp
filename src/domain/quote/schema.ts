import { z } from "zod";
import { D, isDecimalString, parseDecimal } from "./decimal";
import { CURRENCIES } from "./types";

export const MAX_ITEMS = 200;

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);
const optionalText = (max: number) => text(max).default("");
const optionalEmail = z.union([z.literal(""), z.email("Email inválido").max(254)]).default("");
const optionalUrl = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(200)
      .refine((v) => /^(https?:\/\/)?[^\s/$.?#][^\s]*\.[^\s]{2,}$/i.test(v), "Sitio web inválido"),
  ])
  .default("");
const phone = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(30)
      .regex(/^[+\d][\d\s()\-.]{5,}$/, "Teléfono inválido"),
  ])
  .default("");
/** CUIT (11 dígitos, con o sin guiones) o DNI (7-8 dígitos). */
const taxId = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .refine((v) => /^(\d{2}-?\d{8}-?\d|\d{7,8})$/.test(v), "CUIT/DNI inválido"),
  ])
  .default("");

const decimalString = (label: string) =>
  z.string().trim().refine(isDecimalString, `${label} debe ser un número`);

export const quoteItemSchema = z.object({
  id: z.string().min(1).max(64),
  description: text(500).min(1, "Describí el concepto"),
  quantity: decimalString("La cantidad").refine(
    (v) => (parseDecimal(v) ?? new D(0)).greaterThan(0),
    "La cantidad debe ser mayor a 0",
  ),
  unit: text(40).min(1, "Indicá la unidad"),
  unitPrice: decimalString("El precio").refine(
    (v) => (parseDecimal(v) ?? new D(-1)).greaterThanOrEqualTo(0),
    "El precio no puede ser negativo",
  ),
  discountPercent: decimalString("El descuento").refine((v) => {
    const n = parseDecimal(v);
    return n !== null && n.greaterThanOrEqualTo(0) && n.lessThanOrEqualTo(100);
  }, "El descuento debe estar entre 0 y 100"),
});

const nonNegativeDecimal = (label: string) =>
  decimalString(label).refine(
    (v) => (parseDecimal(v) ?? new D(-1)).greaterThanOrEqualTo(0),
    `${label} no puede ser negativo`,
  );

export const adjustmentSchema = z
  .object({ type: z.enum(["percent", "fixed"]), value: nonNegativeDecimal("El valor") })
  .refine((a) => a.type === "fixed" || (parseDecimal(a.value) ?? new D(0)).lessThanOrEqualTo(100), {
    message: "Un porcentaje no puede superar 100",
    path: ["value"],
  });

export const taxSchema = z
  .object({
    id: z.string().min(1).max(64),
    label: text(60).min(1, "Nombre del impuesto"),
    type: z.enum(["percent", "fixed"]),
    value: nonNegativeDecimal("El valor"),
  })
  .refine((a) => a.type === "fixed" || (parseDecimal(a.value) ?? new D(0)).lessThanOrEqualTo(100), {
    message: "Un porcentaje no puede superar 100",
    path: ["value"],
  });

export const issuerSchema = z.object({
  businessName: text(120).min(1, "Ingresá el nombre comercial"),
  professionalName: optionalText(120),
  /** Logo como data URL (ya validado y redimensionado en el cliente). */
  logo: z
    .string()
    .max(400_000, "El logo es demasiado pesado")
    .refine(
      (v) => v === "" || /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v),
      "Logo inválido",
    )
    .default(""),
  email: optionalEmail,
  phone,
  whatsapp: phone,
  address: optionalText(200),
  taxId,
  website: optionalUrl,
});

export const customerSchema = z.object({
  name: text(120).min(1, "Ingresá el nombre del cliente"),
  company: optionalText(120),
  email: optionalEmail,
  phone,
  address: optionalText(200),
  taxId,
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const quoteSchema = z.object({
  number: text(30).min(1, "Ingresá el número"),
  date: isoDate,
  validityDays: z
    .number("Ingresá los días")
    .int()
    .min(1, "Mínimo 1 día")
    .max(365, "Máximo 365 días"),
  title: text(160).min(1, "Ingresá un título"),
  description: optionalText(2000),
  currency: z.enum(CURRENCIES),
  notes: optionalText(2000),
  terms: optionalText(3000),
  deliveryTime: optionalText(200),
  paymentTerms: optionalText(500),
  issuer: issuerSchema,
  customer: customerSchema,
  items: z.array(quoteItemSchema).min(1, "Agregá al menos un concepto").max(MAX_ITEMS),
  globalDiscount: adjustmentSchema,
  surcharge: adjustmentSchema,
  taxes: z.array(taxSchema).max(10),
  templateId: z.string().min(1).max(40),
  accentColor: z
    .union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")])
    .default(""),
  /** Valores de los campos de una plantilla privada (id de campo → valor). */
  customFieldValues: z
    .record(z.string().max(64), z.union([z.string().max(4000), z.number(), z.boolean(), z.null()]))
    .refine((v) => Object.keys(v).length <= 80, "Demasiados campos")
    .default({}),
});

export type QuoteDraft = z.input<typeof quoteSchema>;
export type Quote = z.output<typeof quoteSchema>;
