import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { SEGMENTS } from "@/content/segments";

/** Presupuestos reales generados por la aplicación (datos ficticios), por rubro. */
export function Examples() {
  return (
    <section id="ejemplos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 lg:py-20">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Así se ven presupuestos reales
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Documentos generados con la propia aplicación para distintos rubros. Los datos son
        ficticios; el formato, el cálculo y el PDF son los que vas a obtener.
      </p>
      <ul className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0">
        {SEGMENTS.map((s) => (
          <li
            key={s.slug}
            className="w-[74%] shrink-0 snap-center rounded-xl border border-border bg-white p-4 sm:w-auto"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática ya optimizada (WebP) */}
            <img
              src={`/ejemplos/${s.image}.webp`}
              alt={s.alt}
              width={654}
              height={926}
              loading="lazy"
              decoding="async"
              className="h-auto w-full rounded-md border border-border"
            />
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">{s.name}</h3>
            <p className="text-xs text-muted-foreground">Diseño {s.design}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a
                href={`/ejemplos/${s.pdf}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 font-medium text-ink underline underline-offset-4"
              >
                <FileText className="size-4" aria-hidden /> Ver PDF
              </a>
              <Link
                href={`/para/${s.slug}`}
                className="inline-flex min-h-10 items-center gap-1 font-medium text-brand-strong"
              >
                Para {s.name.toLowerCase()} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
