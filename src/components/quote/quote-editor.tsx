"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Cloud, Download, Eraser, Eye, Loader2, MessageCircle, Pencil, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/fields";
import { Logo } from "@/components/marketing/logo";
import { calculateTotals } from "@/domain/quote/calculations";
import { defaultQuote } from "@/domain/quote/defaults";
import { applyProfile, type ProfileDefaults } from "@/domain/quote/profile";
import { TEMPLATES } from "@/domain/templates";
import { quoteSchema, type Quote, type QuoteDraft } from "@/domain/quote/schema";
import { buildWhatsappMessage, buildWhatsappUrl } from "@/domain/quote/whatsapp";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";
import {
  canShareFilesNatively,
  PdfRequestError,
  requestQuotePdf,
  saveBlob,
  sharePdfNatively,
} from "@/lib/pdf-client";
import { LIMITS } from "@/lib/config/plans";
import { useEntitlements } from "@/lib/use-entitlements";
import { cn } from "@/lib/utils";
import {
  AdjustmentsSection,
  CustomerSection,
  DetailsSection,
  IssuerSection,
  ItemsSection,
} from "./form-sections";
import { DesignSection } from "./design-section";
import { QuotePreview } from "./quote-preview";

type Loaded = { quote: QuoteDraft; restored: boolean; savedAt: string };

export interface SavedCustomer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
}

export interface EditorCloud {
  /** Presupuesto guardado que se está editando (null si es uno nuevo). */
  quoteId: string | null;
  draft: QuoteDraft | null;
  customerId: string | null;
  profile: ProfileDefaults | null;
  customers: SavedCustomer[];
  /** Diseño elegido desde la galería (?template=). */
  templateId: string | null;
  /** Se pidió un presupuesto por id pero no existe o no es del usuario. */
  notFound: boolean;
}

export function QuoteEditor({ cloud }: { cloud?: EditorCloud }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Se inicializa una sola vez: un refresco del servidor no debe pisar lo que se está editando.
    if (initialized.current) return;
    initialized.current = true;
    let next: Loaded;
    if (cloud?.draft) {
      // Se edita un presupuesto guardado: no se mezcla con el borrador local.
      next = { quote: cloud.draft, restored: false, savedAt: "" };
    } else {
      const stored = loadDraft();
      let quote = stored ? stored.quote : defaultQuote();
      // Sesión iniciada: se precargan los datos del negocio en un presupuesto sin emisor.
      if (cloud?.profile && !quote.issuer.businessName) quote = applyProfile(quote, cloud.profile);
      next = { quote, restored: !!stored, savedAt: stored?.savedAt ?? "" };
    }
    if (cloud?.templateId && TEMPLATES.some((t) => t.id === cloud.templateId)) {
      next = { ...next, quote: { ...next.quote, templateId: cloud.templateId } };
    }
    setLoaded(next);
  }, [cloud]);

  if (!loaded) {
    return (
      <div
        className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground"
        role="status"
      >
        Cargando editor…
      </div>
    );
  }
  return <EditorForm initial={loaded.quote} restored={loaded.restored} cloud={cloud} />;
}

function EditorForm({
  initial,
  restored,
  cloud,
}: {
  initial: QuoteDraft;
  restored: boolean;
  cloud?: EditorCloud;
}) {
  const form = useForm<QuoteDraft, unknown, Quote>({
    resolver: zodResolver(quoteSchema),
    defaultValues: initial,
    mode: "onTouched",
  });
  const { register, control, formState, watch, setValue, reset } = form;
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [savedLabel, setSavedLabel] = useState(restored ? "Borrador recuperado" : "");
  const [confirmClear, setConfirmClear] = useState(false);
  const [shareError, setShareError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [nativeShare, setNativeShare] = useState(false);
  const { entitlements, refresh: refreshEntitlements } = useEntitlements();
  const router = useRouter();
  const quoteId = cloud?.quoteId ?? null;
  const [customerId, setCustomerId] = useState<string | null>(cloud?.customerId ?? null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudMessage, setCloudMessage] = useState("");
  const readOnly = !!quoteId && !entitlements.cloudFeatures;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de APIs del navegador
    setNativeShare(canShareFilesNatively());
  }, []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const values = useWatch({ control }) as QuoteDraft;
  const totals = useMemo(
    () =>
      calculateTotals({
        items: values.items ?? [],
        globalDiscount: values.globalDiscount ?? { type: "percent", value: "0" },
        surcharge: values.surcharge ?? { type: "percent", value: "0" },
        taxes: values.taxes ?? [],
      }),
    [values.items, values.globalDiscount, values.surcharge, values.taxes],
  );
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (quoteId) return; // los presupuestos de la nube no pisan el borrador local
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const ok = saveDraft(values);
      setSavedLabel(
        ok ? "Borrador guardado en este dispositivo" : "No se pudo guardar el borrador",
      );
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [values, quoteId]);

  const designLocked = !entitlements.templates.includes(values.templateId);
  const currency = values.currency === "USD" ? "USD" : "ARS";

  /** Valida el formulario; si es inválido muestra el aviso y vuelve a la pestaña de edición. */
  async function validQuote(action: string): Promise<Quote | null> {
    setShareError("");
    const valid = await form.trigger();
    const parsed = quoteSchema.safeParse(form.getValues());
    if (!valid || !parsed.success) {
      setShareError(`Completá los campos obligatorios para ${action}.`);
      setTab("edit");
      return null;
    }
    return parsed.data;
  }

  async function downloadPdf(share: boolean) {
    const q = await validQuote(share ? "compartir el PDF" : "descargar el PDF");
    if (!q) return;
    if (!entitlements.authenticated) {
      // El borrador ya está guardado en el navegador y se recupera al volver.
      saveDraft(form.getValues() as QuoteDraft);
      router.push("/registro?next=%2Fcrear");
      return;
    }
    setPdfBusy(true);
    try {
      const { blob, fileName } = await requestQuotePdf(q);
      if (share) {
        const message = buildWhatsappMessage({
          quote: q,
          total: totals.total,
          currency: q.currency,
        });
        if (await sharePdfNatively(blob, fileName, message)) {
          void refreshEntitlements();
          return;
        }
      }
      saveBlob(blob, fileName);
      void refreshEntitlements();
    } catch (err) {
      setShareError(err instanceof PdfRequestError ? err.message : "No pudimos generar el PDF.");
      setTab("edit");
    } finally {
      setPdfBusy(false);
    }
  }

  async function saveToCloud() {
    const q = await validQuote("guardar el presupuesto");
    if (!q) return;
    setCloudBusy(true);
    setCloudMessage("");
    try {
      const response = await fetch(quoteId ? `/api/quotes/${quoteId}` : "/api/quotes", {
        method: quoteId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote: q, customerId }),
      });
      const data = (await response.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;
      if (!response.ok) {
        setShareError(data?.error ?? "No pudimos guardar el presupuesto.");
        setTab("edit");
      } else if (!quoteId && data?.id) {
        clearDraft(); // ya vive en la nube: se descarta el borrador local
        router.replace(`/crear?id=${data.id}`);
      } else {
        setCloudMessage("Guardado en tu cuenta.");
      }
    } catch {
      setShareError("No hay conexión. Revisá tu internet e intentá otra vez.");
    }
    setCloudBusy(false);
  }

  function pickCustomer(id: string) {
    const c = cloud?.customers.find((x) => x.id === id);
    if (!c) {
      setCustomerId(null);
      return;
    }
    setCustomerId(c.id);
    for (const key of ["name", "company", "email", "phone", "address", "taxId"] as const) {
      setValue(`customer.${key}`, c[key], { shouldDirty: true, shouldValidate: true });
    }
  }

  /** Vista previa del PDF con marca de agua; se abre en una pestaña para que funcione en el celular. */
  async function previewDesign() {
    const q = await validQuote("ver la vista previa");
    if (!q) return;
    const tab = window.open("", "_blank");
    setPdfBusy(true);
    try {
      const { blob } = await requestQuotePdf(q, { preview: true });
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      setShareError(
        err instanceof PdfRequestError ? err.message : "No pudimos generar la vista previa.",
      );
      setTab("edit");
    } finally {
      setPdfBusy(false);
    }
  }

  async function shareWhatsapp() {
    const q = await validQuote("compartir el presupuesto");
    if (!q) return;
    const message = buildWhatsappMessage({ quote: q, total: totals.total, currency: q.currency });
    window.open(buildWhatsappUrl(message, q.customer.phone), "_blank", "noopener,noreferrer");
  }

  function clear() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    clearDraft();
    reset(defaultQuote());
    setSavedLabel("");
    setConfirmClear(false);
    setShareError("");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <p className="sr-only text-xs text-muted-foreground sm:not-sr-only" role="status">
              {savedLabel}
            </p>
            <Link
              href={entitlements.authenticated ? "/dashboard" : "/ingresar?next=/crear"}
              className={buttonVariants({ variant: "ghost", size: "lg" })}
            >
              {entitlements.authenticated ? "Mi cuenta" : "Ingresar"}
            </Link>
          </div>
        </div>
        <div
          className="mx-auto flex max-w-7xl gap-1 px-4 pb-2 sm:px-6 lg:hidden"
          role="tablist"
          aria-label="Vista"
        >
          {(
            [
              ["edit", "Editar", Pencil],
              ["preview", "Vista previa", Eye],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                tab === id ? "bg-ink text-white" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <form
          noValidate
          onSubmit={(e) => e.preventDefault()}
          className={cn("space-y-5", tab === "preview" && "hidden lg:block lg:space-y-5")}
          aria-label="Editor de presupuesto"
        >
          {shareError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {shareError}
            </p>
          )}
          {cloud?.notFound && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              No encontramos ese presupuesto en tu cuenta. Podés armar uno nuevo acá.
            </p>
          )}
          {readOnly && (
            <p
              role="status"
              className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-ink"
            >
              Modo lectura: tu plan Pro no está vigente, así que no podés guardar cambios en este
              presupuesto. Igual podés descargarlo.{" "}
              <Link href="/dashboard/plan" className="font-medium underline underline-offset-4">
                Ver plan Pro
              </Link>
            </p>
          )}
          {restored && (
            <p className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
              {entitlements.authenticated
                ? "Retomamos el borrador que dejaste en este dispositivo. Podés seguir editándolo o limpiarlo para empezar de cero."
                : "Recuperamos el borrador que tenías guardado en este dispositivo."}
            </p>
          )}
          <IssuerSection
            register={register}
            errors={formState.errors}
            watch={watch}
            setValue={setValue}
          />
          {entitlements.cloudFeatures && (cloud?.customers.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <label htmlFor="saved-customer" className="block text-xs font-medium text-ink">
                Usar un cliente guardado
              </label>
              <Select
                id="saved-customer"
                className="mt-1.5"
                value={customerId ?? ""}
                onChange={(e) => pickCustomer(e.target.value)}
              >
                <option value="">Escribir los datos a mano</option>
                {cloud?.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` · ${c.company}` : ""}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <CustomerSection register={register} errors={formState.errors} />
          <DetailsSection register={register} errors={formState.errors} />
          <ItemsSection
            control={control}
            register={register}
            errors={formState.errors}
            totals={totals}
            currency={currency}
          />
          <AdjustmentsSection control={control} register={register} errors={formState.errors} />
          <DesignSection
            templateId={values.templateId}
            accentColor={values.accentColor ?? ""}
            entitlements={entitlements}
            setValue={setValue}
            onPreview={previewDesign}
            previewBusy={pdfBusy}
          />
        </form>

        <aside
          className={cn("lg:sticky lg:top-20 lg:self-start", tab === "edit" && "hidden lg:block")}
        >
          <QuotePreview
            quote={{
              ...values,
              accentColor: entitlements.allowCustomColor ? values.accentColor : "",
            }}
            totals={totals}
          />
          <div className="mx-auto mt-5 max-w-[640px] space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="lg"
                className="h-10 px-4"
                disabled={
                  pdfBusy ||
                  designLocked ||
                  (entitlements.authenticated && entitlements.downloadsRemaining === 0)
                }
                onClick={() => downloadPdf(false)}
              >
                {pdfBusy ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Download data-icon="inline-start" />
                )}
                {entitlements.authenticated ? "Descargar PDF" : "Crear cuenta para descargar"}
              </Button>
              {nativeShare && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-10 px-4"
                  disabled={pdfBusy || designLocked}
                  onClick={() => downloadPdf(true)}
                >
                  <Share2 data-icon="inline-start" /> Compartir PDF
                </Button>
              )}
              {entitlements.cloudFeatures ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-10 px-4"
                  disabled={cloudBusy || readOnly}
                  onClick={saveToCloud}
                >
                  {cloudBusy ? (
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <Cloud data-icon="inline-start" />
                  )}
                  {quoteId ? "Guardar cambios" : "Guardar en la nube"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-10 px-4"
                onClick={shareWhatsapp}
              >
                <MessageCircle data-icon="inline-start" /> WhatsApp
              </Button>
              {quoteId ? null : confirmClear ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    className="h-10"
                    onClick={clear}
                  >
                    Sí, borrar todo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="h-10"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-10"
                  onClick={() => setConfirmClear(true)}
                >
                  <Eraser data-icon="inline-start" /> Limpiar borrador
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground" role="status" data-testid="download-usage">
              {!entitlements.authenticated
                ? `Podés armar y previsualizar sin cuenta. Para descargar el PDF necesitás una cuenta gratuita (${LIMITS.freeMonthlyDownloads} descargas por mes).`
                : entitlements.downloadLimit === null
                  ? "Plan Pro: descargas sin límite (uso razonable)."
                  : entitlements.downloadsRemaining > 0
                    ? `Te quedan ${entitlements.downloadsRemaining} de ${entitlements.downloadLimit} descargas este mes.`
                    : `Usaste tus ${entitlements.downloadLimit} descargas de este mes.`}
              {entitlements.authenticated && entitlements.downloadsRemaining === 0 && (
                <>
                  {" "}
                  <Link
                    href="/#precios"
                    className="font-medium text-ink underline underline-offset-4"
                  >
                    Ver planes
                  </Link>
                </>
              )}
            </p>
            {cloudMessage && (
              <p role="status" className="text-sm text-ink">
                {cloudMessage}
              </p>
            )}
            {entitlements.authenticated && !entitlements.cloudFeatures && (
              <p className="text-xs text-muted-foreground">
                Con el plan Pro guardás tus presupuestos en la nube, gestionás clientes y seguís su
                estado.{" "}
                <Link
                  href="/dashboard/plan"
                  className="font-medium text-ink underline underline-offset-4"
                >
                  Ver plan Pro
                </Link>
              </p>
            )}
            {designLocked && (
              <p className="text-xs text-ink">
                El diseño elegido es premium: para descargarlo necesitás el Pack Premium. Podés ver
                la vista previa en la sección &quot;Diseño del PDF&quot;.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              WhatsApp abre un mensaje con el resumen. El PDF no se adjunta solo: descargalo y
              adjuntalo en la conversación.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
