import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LIMITS } from "@/lib/config/plans";
import { cn } from "@/lib/utils";

const points = [
  "Sin registrarte para armarlo",
  `${LIMITS.freeMonthlyDownloads} PDF gratis por mes`,
  "Sin tarjeta de crédito",
  "Para cualquier rubro",
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-20 lg:pt-16">
      <div>
        <p className="mb-4 hidden items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
          <span className="size-1.5 rounded-full bg-brand" /> Un producto del ecosistema AtajoLab
        </p>
        <h1 className="font-display text-[2.4rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Creá presupuestos profesionales en minutos.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Personalizalos con tu logo, descargalos en PDF y compartilos con tus clientes.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/crear"
            data-track="cta_start"
            data-track-location="hero"
            className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base")}
          >
            Crear mi presupuesto gratis <ArrowRight data-icon="inline-end" />
          </Link>
          <a
            href="#ejemplos"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 px-6 text-base",
            )}
          >
            Ver ejemplos
          </a>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px] text-muted-foreground sm:text-sm">
          {points.map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-brand" /> {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Documento real generado por la aplicación (datos ficticios). En el celular se muestra
          recortado para que el producto aparezca en la primera pantalla. */}
      <figure className="relative mx-auto w-full max-w-sm lg:max-w-md">
        <div className="relative max-h-72 overflow-hidden rounded-xl border border-border bg-white shadow-xl sm:max-h-[26rem] lg:max-h-none lg:rotate-[1.5deg]">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática ya optimizada (WebP) */}
          <img
            src="/ejemplos/hero-minimalista.webp"
            alt="Presupuesto de reparación de aire acondicionado en PDF, con tabla de conceptos, totales y condiciones"
            width={892}
            height={1262}
            fetchPriority="high"
            decoding="async"
            className="h-auto w-full"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent lg:hidden"
            aria-hidden
          />
        </div>
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          PDF real generado con la app · datos ficticios
        </figcaption>
      </figure>
    </section>
  );
}
