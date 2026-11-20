import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, FileText, MessageCircle } from "lucide-react";
import { TrackEvent } from "@/components/analytics/track-event";
import { FinalCta } from "@/components/marketing/final-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getSegment, SEGMENTS } from "@/content/segments";
import { customTemplateRequestLinks } from "@/domain/commercial-whatsapp";
import { hasCommercialWhatsapp } from "@/lib/config/commercial-contact";
import { LIMITS } from "@/lib/config/plans";
import { cn } from "@/lib/utils";

// El contacto comercial (WhatsApp) depende del entorno: se evalúa en cada solicitud.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SEGMENTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const segment = getSegment((await params).slug);
  if (!segment) return {};
  const image = `/og/para-${segment.slug}.png`;
  return {
    title: segment.title,
    description: segment.description,
    alternates: { canonical: `/para/${segment.slug}` },
    openGraph: {
      type: "website",
      locale: "es_AR",
      title: segment.title,
      description: segment.description,
      url: `/para/${segment.slug}`,
      images: [{ url: image, width: 1200, height: 630, alt: segment.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: segment.title,
      description: segment.description,
      images: [image],
    },
  };
}

export default async function SegmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const segment = getSegment((await params).slug);
  if (!segment) notFound();
  const custom = customTemplateRequestLinks(segment.activity);
  const customHref = hasCommercialWhatsapp() && custom.whatsapp ? custom.whatsapp : custom.mailto;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <TrackEvent name="landing_view" params={{ content_name: `para_${segment.slug}` }} />
        <section className="mx-auto grid max-w-6xl items-start gap-8 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pt-16">
          <div>
            <p className="mb-4 text-sm font-medium text-brand-strong">{segment.name}</p>
            <h1 className="font-display text-[2.1rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
              {segment.h1}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">{segment.description}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/crear"
                data-track="cta_start"
                data-track-location={`para_${segment.slug}`}
                className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base")}
              >
                Crear mi presupuesto gratis <ArrowRight data-icon="inline-end" />
              </Link>
              <a
                href={`/ejemplos/${segment.pdf}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 px-6 text-base",
                )}
              >
                <FileText data-icon="inline-start" /> Ver PDF de ejemplo
              </a>
            </div>
            <ul className="mt-6 grid gap-2 text-sm text-muted-foreground">
              {[
                "Armalo sin registrarte",
                `${LIMITS.freeMonthlyDownloads} PDF gratis por mes con tu cuenta`,
                "Funciona desde el celular",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-brand" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <figure className="mx-auto w-full max-w-sm lg:max-w-md">
            <div className="max-h-80 overflow-hidden rounded-xl border border-border bg-white shadow-xl sm:max-h-[28rem] lg:max-h-none">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática ya optimizada (WebP) */}
              <img
                src={`/ejemplos/${segment.image}.webp`}
                alt={segment.alt}
                width={654}
                height={926}
                fetchPriority="high"
                decoding="async"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              Ejemplo real generado con la app (diseño {segment.design}) · datos ficticios
            </figcaption>
          </figure>
        </section>

        <section className="border-y border-border bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Qué ves en este ejemplo
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {segment.example.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm text-ink">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted-foreground">
              Conceptos típicos del rubro: {segment.concepts.join(" · ")}.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {segment.pains.map((p) => (
              <div key={p.title} className="rounded-xl border border-border bg-white p-5">
                <h3 className="font-display text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <div className="rounded-xl border border-border bg-white p-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              ¿Necesitás campos propios de tu rubro?
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Además del editor, desarrollamos plantillas a medida con los campos y secciones que
              usa tu actividad, a cotizar según el trabajo. Escribinos y te contamos.
            </p>
            <a
              href={customHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-4 h-11")}
            >
              <MessageCircle data-icon="inline-start" /> Consultar plantilla a medida
            </a>
          </div>
        </section>

        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
