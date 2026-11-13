"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select, TextAreaField, TextField } from "@/components/ui/fields";
import { LogoError, processLogoFile } from "@/lib/logo-image";

export interface BusinessValues {
  businessName: string;
  professionalName: string;
  logo: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  taxId: string;
  website: string;
  accentColor: string;
  defaultCurrency: "ARS" | "USD";
  defaultValidityDays: number;
  defaultPaymentTerms: string;
  defaultTerms: string;
}

export function BusinessForm({ initial }: { initial: BusinessValues }) {
  const [values, setValues] = useState<BusinessValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof BusinessValues>(key: K, value: BusinessValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const bind = (key: keyof BusinessValues) => ({
    value: String(values[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(key, e.target.value as never),
  });

  async function onLogo(file: File | undefined) {
    if (!file) return;
    try {
      set("logo", await processLogoFile(file));
      setErrors((e) => ({ ...e, logo: "" }));
    } catch (err) {
      setErrors((e) => ({
        ...e,
        logo: err instanceof LogoError ? err.message : "No pudimos cargar el logo.",
      }));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    setErrors({});
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          defaultValidityDays: Number(values.defaultValidityDays),
        }),
      });
      if (response.ok) {
        setStatus({ kind: "ok", text: "Cambios guardados." });
      } else {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          fields?: Record<string, string>;
        } | null;
        setErrors(data?.fields ?? {});
        setStatus({ kind: "error", text: data?.error ?? "No pudimos guardar los cambios." });
      }
    } catch {
      setStatus({ kind: "error", text: "No hay conexión. Revisá tu internet e intentá otra vez." });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Datos del negocio</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-ink">Logo</span>
            <div className="flex items-center gap-4">
              <div className="grid size-16 place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
                {values.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={values.logo}
                    alt="Logo actual"
                    className="max-h-full max-w-full object-contain"
                  />
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
                  aria-label="Subir logo"
                  onChange={(e) => onLogo(e.target.files?.[0])}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => fileRef.current?.click()}
                  >
                    {values.logo ? "Cambiar logo" : "Subir logo"}
                  </Button>
                  {values.logo && (
                    <Button type="button" variant="ghost" size="lg" onClick={() => set("logo", "")}>
                      <X data-icon="inline-start" /> Quitar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG o WebP de hasta 2 MB.</p>
                {(errors.logo ?? "") && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.logo}
                  </p>
                )}
              </div>
            </div>
          </div>
          <TextField
            id="b-name"
            label="Nombre comercial"
            error={errors.businessName}
            {...bind("businessName")}
          />
          <TextField
            id="b-prof"
            label="Nombre del profesional"
            error={errors.professionalName}
            {...bind("professionalName")}
          />
          <TextField
            id="b-email"
            type="email"
            label="Email"
            error={errors.email}
            {...bind("email")}
          />
          <TextField
            id="b-phone"
            type="tel"
            label="Teléfono"
            error={errors.phone}
            {...bind("phone")}
          />
          <TextField
            id="b-wa"
            type="tel"
            label="WhatsApp"
            error={errors.whatsapp}
            {...bind("whatsapp")}
          />
          <TextField id="b-tax" label="CUIT (opcional)" error={errors.taxId} {...bind("taxId")} />
          <TextField
            id="b-addr"
            label="Dirección (opcional)"
            error={errors.address}
            {...bind("address")}
          />
          <TextField
            id="b-web"
            label="Sitio web (opcional)"
            error={errors.website}
            {...bind("website")}
          />
          <Field
            label="Color de acento (se usa en diseños premium)"
            htmlFor="b-accent"
            error={errors.accentColor}
          >
            <div className="flex items-center gap-2">
              <input
                id="b-accent"
                type="color"
                value={values.accentColor || "#14213d"}
                onChange={(e) => set("accentColor", e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-input bg-white p-1"
              />
              {values.accentColor && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => set("accentColor", "")}
                >
                  Restablecer
                </Button>
              )}
            </div>
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Configuración comercial</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Se precarga en cada presupuesto nuevo que armes con tu cuenta.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Moneda por defecto" htmlFor="b-cur" error={errors.defaultCurrency}>
            <Select id="b-cur" {...bind("defaultCurrency")}>
              <option value="ARS">ARS · Peso argentino</option>
              <option value="USD">USD · Dólar estadounidense</option>
            </Select>
          </Field>
          <TextField
            id="b-days"
            type="number"
            min={1}
            max={365}
            inputMode="numeric"
            label="Validez por defecto (días)"
            error={errors.defaultValidityDays}
            {...bind("defaultValidityDays")}
          />
          <TextField
            id="b-pay"
            label="Forma de pago habitual"
            wrapperClassName="sm:col-span-2"
            error={errors.defaultPaymentTerms}
            {...bind("defaultPaymentTerms")}
          />
          <TextAreaField
            id="b-terms"
            label="Condiciones comerciales habituales"
            wrapperClassName="sm:col-span-2"
            error={errors.defaultTerms}
            {...bind("defaultTerms")}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" className="h-10" disabled={busy}>
          {busy && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar cambios
        </Button>
        {status && (
          <p
            role={status.kind === "ok" ? "status" : "alert"}
            className={status.kind === "ok" ? "text-sm text-ink" : "text-sm text-destructive"}
          >
            {status.text}
          </p>
        )}
      </div>
    </form>
  );
}
