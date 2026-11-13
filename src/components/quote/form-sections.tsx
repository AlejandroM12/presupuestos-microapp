"use client";

import { useRef, useState } from "react";
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { ArrowDown, ArrowUp, Copy, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, TextAreaField, TextField } from "@/components/ui/fields";
import { emptyItem, newId } from "@/domain/quote/defaults";
import type { QuoteDraft } from "@/domain/quote/schema";
import { MAX_ITEMS } from "@/domain/quote/schema";
import { SUGGESTED_UNITS, type QuoteTotals } from "@/domain/quote/types";
import { formatMoney } from "@/lib/format";
import { LogoError, processLogoFile } from "@/lib/logo-image";

export interface SectionProps {
  register: UseFormRegister<QuoteDraft>;
  errors: FieldErrors<QuoteDraft>;
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function IssuerSection({
  register,
  errors,
  watch,
  setValue,
}: SectionProps & { watch: UseFormWatch<QuoteDraft>; setValue: UseFormSetValue<QuoteDraft> }) {
  const e = errors.issuer;
  const logo = watch("issuer.logo");
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState("");

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setLogoError("");
    try {
      const dataUrl = await processLogoFile(file);
      setValue("issuer.logo", dataUrl, { shouldDirty: true });
    } catch (err) {
      setLogoError(err instanceof LogoError ? err.message : "No pudimos cargar el logo.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Section
      title="Tu negocio"
      description="Estos datos aparecen en el encabezado del presupuesto."
    >
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-ink">Logo</span>
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Logo cargado" className="max-h-full max-w-full object-contain" />
            ) : (
              <ImagePlus className="size-5 text-muted-foreground" aria-hidden />
            )}
          </div>
          <div className="space-y-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              id="logo-file"
              onChange={(ev) => onLogo(ev.target.files?.[0])}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => fileRef.current?.click()}
              >
                {logo ? "Cambiar logo" : "Subir logo"}
              </Button>
              {logo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => setValue("issuer.logo", "", { shouldDirty: true })}
                >
                  <X data-icon="inline-start" /> Quitar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG o WebP de hasta 2 MB.</p>
            {logoError && (
              <p role="alert" className="text-xs text-destructive">
                {logoError}
              </p>
            )}
          </div>
        </div>
      </div>
      <TextField
        id="issuer-business"
        label="Nombre comercial"
        autoComplete="organization"
        error={e?.businessName?.message}
        {...register("issuer.businessName")}
      />
      <TextField
        id="issuer-professional"
        label="Nombre del profesional"
        autoComplete="name"
        error={e?.professionalName?.message}
        {...register("issuer.professionalName")}
      />
      <TextField
        id="issuer-email"
        type="email"
        inputMode="email"
        label="Email"
        autoComplete="email"
        error={e?.email?.message}
        {...register("issuer.email")}
      />
      <TextField
        id="issuer-phone"
        type="tel"
        label="Teléfono"
        autoComplete="tel"
        error={e?.phone?.message}
        {...register("issuer.phone")}
      />
      <TextField
        id="issuer-whatsapp"
        type="tel"
        label="WhatsApp"
        placeholder="+54 9 11 5555-1234"
        error={e?.whatsapp?.message}
        {...register("issuer.whatsapp")}
      />
      <TextField
        id="issuer-taxid"
        label="CUIT (opcional)"
        error={e?.taxId?.message}
        {...register("issuer.taxId")}
      />
      <TextField
        id="issuer-address"
        label="Dirección (opcional)"
        error={e?.address?.message}
        {...register("issuer.address")}
      />
      <TextField
        id="issuer-website"
        label="Sitio web (opcional)"
        inputMode="url"
        error={e?.website?.message}
        {...register("issuer.website")}
      />
    </Section>
  );
}

export function CustomerSection({ register, errors }: SectionProps) {
  const e = errors.customer;
  return (
    <Section title="Cliente">
      <TextField
        id="customer-name"
        label="Nombre"
        error={e?.name?.message}
        {...register("customer.name")}
      />
      <TextField
        id="customer-company"
        label="Empresa (opcional)"
        error={e?.company?.message}
        {...register("customer.company")}
      />
      <TextField
        id="customer-email"
        type="email"
        inputMode="email"
        label="Email"
        error={e?.email?.message}
        {...register("customer.email")}
      />
      <TextField
        id="customer-phone"
        type="tel"
        label="Teléfono"
        error={e?.phone?.message}
        {...register("customer.phone")}
      />
      <TextField
        id="customer-address"
        label="Dirección (opcional)"
        error={e?.address?.message}
        {...register("customer.address")}
      />
      <TextField
        id="customer-taxid"
        label="CUIT/DNI (opcional)"
        error={e?.taxId?.message}
        {...register("customer.taxId")}
      />
    </Section>
  );
}

export function DetailsSection({ register, errors }: SectionProps) {
  return (
    <Section title="Datos del presupuesto">
      <TextField
        id="q-title"
        label="Título"
        wrapperClassName="sm:col-span-2"
        placeholder="Ej.: Instalación eléctrica del local"
        error={errors.title?.message}
        {...register("title")}
      />
      <TextAreaField
        id="q-description"
        label="Descripción general"
        wrapperClassName="sm:col-span-2"
        error={errors.description?.message}
        {...register("description")}
      />
      <TextField
        id="q-number"
        label="Número"
        error={errors.number?.message}
        {...register("number")}
      />
      <TextField
        id="q-date"
        type="date"
        label="Fecha"
        error={errors.date?.message}
        {...register("date")}
      />
      <TextField
        id="q-validity"
        type="number"
        min={1}
        max={365}
        inputMode="numeric"
        label="Validez (días)"
        error={errors.validityDays?.message}
        {...register("validityDays", { valueAsNumber: true })}
      />
      <Field label="Moneda" htmlFor="q-currency" error={errors.currency?.message}>
        <Select id="q-currency" {...register("currency")}>
          <option value="ARS">ARS · Peso argentino</option>
          <option value="USD">USD · Dólar estadounidense</option>
        </Select>
      </Field>
      <TextField
        id="q-delivery"
        label="Plazo de entrega o ejecución"
        wrapperClassName="sm:col-span-2"
        error={errors.deliveryTime?.message}
        {...register("deliveryTime")}
      />
      <TextField
        id="q-payment"
        label="Forma de pago"
        wrapperClassName="sm:col-span-2"
        placeholder="Ej.: 50% al aprobar, 50% al finalizar"
        error={errors.paymentTerms?.message}
        {...register("paymentTerms")}
      />
      <TextAreaField
        id="q-notes"
        label="Observaciones"
        wrapperClassName="sm:col-span-2"
        error={errors.notes?.message}
        {...register("notes")}
      />
      <TextAreaField
        id="q-terms"
        label="Condiciones comerciales"
        wrapperClassName="sm:col-span-2"
        error={errors.terms?.message}
        {...register("terms")}
      />
    </Section>
  );
}

export function ItemsSection({
  control,
  register,
  errors,
  totals,
  currency,
}: SectionProps & { control: Control<QuoteDraft>; totals: QuoteTotals; currency: "ARS" | "USD" }) {
  const { fields, append, remove, move, insert } = useFieldArray({ control, name: "items" });
  const itemsError = errors.items?.root?.message ?? errors.items?.message;

  return (
    <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Conceptos</h2>
      <datalist id="unit-options">
        {SUGGESTED_UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <ul className="mt-5 space-y-4">
        {fields.map((field, index) => {
          const ie = errors.items?.[index];
          return (
            <li key={field.id} className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Subir concepto ${index + 1}`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Bajar concepto ${index + 1}`}
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Duplicar concepto ${index + 1}`}
                    disabled={fields.length >= MAX_ITEMS}
                    onClick={() => {
                      const { id: _id, ...rest } = field;
                      void _id;
                      insert(index + 1, { ...rest, id: newId() });
                    }}
                  >
                    <Copy />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar concepto ${index + 1}`}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-6">
                <TextField
                  id={`item-${index}-desc`}
                  label="Descripción"
                  wrapperClassName="sm:col-span-6"
                  error={ie?.description?.message}
                  {...register(`items.${index}.description`)}
                />
                <TextField
                  id={`item-${index}-qty`}
                  label="Cantidad"
                  inputMode="decimal"
                  wrapperClassName="sm:col-span-2"
                  error={ie?.quantity?.message}
                  {...register(`items.${index}.quantity`)}
                />
                <TextField
                  id={`item-${index}-unit`}
                  label="Unidad"
                  list="unit-options"
                  wrapperClassName="sm:col-span-2"
                  error={ie?.unit?.message}
                  {...register(`items.${index}.unit`)}
                />
                <TextField
                  id={`item-${index}-price`}
                  label="Precio unitario"
                  inputMode="decimal"
                  wrapperClassName="sm:col-span-2"
                  error={ie?.unitPrice?.message}
                  {...register(`items.${index}.unitPrice`)}
                />
                <TextField
                  id={`item-${index}-disc`}
                  label="Descuento %"
                  inputMode="decimal"
                  wrapperClassName="sm:col-span-2"
                  error={ie?.discountPercent?.message}
                  {...register(`items.${index}.discountPercent`)}
                />
                <div className="flex items-end justify-end sm:col-span-4">
                  <p className="text-sm text-muted-foreground">
                    Importe:{" "}
                    <span className="font-mono font-semibold text-ink">
                      {formatMoney(totals.lines[index]?.amount ?? "0.00", currency)}
                    </span>
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {itemsError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {itemsError}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="mt-4"
        disabled={fields.length >= MAX_ITEMS}
        onClick={() => append(emptyItem())}
      >
        <Plus data-icon="inline-start" /> Agregar concepto
      </Button>
    </section>
  );
}

export function AdjustmentsSection({
  control,
  register,
  errors,
}: SectionProps & { control: Control<QuoteDraft> }) {
  const { fields, append, remove } = useFieldArray({ control, name: "taxes" });
  return (
    <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink">
        Descuentos, recargos e impuestos
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Los impuestos son manuales: ingresás el porcentaje o monto que corresponda.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {(["globalDiscount", "surcharge"] as const).map((key) => (
          <div key={key} className="grid grid-cols-[1fr_7rem] items-end gap-2">
            <TextField
              id={`${key}-value`}
              label={key === "globalDiscount" ? "Descuento global" : "Recargo global"}
              inputMode="decimal"
              error={errors[key]?.value?.message}
              {...register(`${key}.value`)}
            />
            <Select aria-label="Tipo" {...register(`${key}.type`)}>
              <option value="percent">%</option>
              <option value="fixed">Monto</option>
            </Select>
          </div>
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {fields.map((field, i) => (
          <li key={field.id} className="grid grid-cols-[1fr_6rem_6rem_auto] items-end gap-2">
            <TextField
              id={`tax-${i}-label`}
              label="Impuesto"
              placeholder="IVA"
              error={errors.taxes?.[i]?.label?.message}
              {...register(`taxes.${i}.label`)}
            />
            <TextField
              id={`tax-${i}-value`}
              label="Valor"
              inputMode="decimal"
              error={errors.taxes?.[i]?.value?.message}
              {...register(`taxes.${i}.value`)}
            />
            <Select aria-label="Tipo de impuesto" {...register(`taxes.${i}.type`)}>
              <option value="percent">%</option>
              <option value="fixed">Monto</option>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={`Quitar impuesto ${i + 1}`}
              onClick={() => remove(i)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="mt-4"
        disabled={fields.length >= 10}
        onClick={() => append({ id: newId(), label: "IVA", type: "percent", value: "21" })}
      >
        <Plus data-icon="inline-start" /> Agregar impuesto
      </Button>
    </section>
  );
}
