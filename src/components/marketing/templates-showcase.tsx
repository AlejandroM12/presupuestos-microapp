import Link from "next/link";
import { TEMPLATES } from "@/domain/templates";
import { salesOpen } from "@/lib/config/sales";

/** Comparación visual de los seis diseños con el mismo presupuesto real (datos ficticios). */
export function TemplatesShowcase() {
  const open = salesOpen();
  return (
    <section id="plantillas" className="border-y border-border bg-white/60">
      <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 lg:py-20">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Seis diseños, seis personalidades
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          El mismo presupuesto en cada diseño: no es un cambio de color, cada plantilla tiene su
          propia composición.{" "}
          {open
            ? "Una es gratuita y cinco forman parte del Pack Premium."
            : "Minimalista es gratuito; los otros cinco diseños llegan próximamente."}
        </p>
        <ul className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-6 lg:gap-x-4">
          {TEMPLATES.map((t) => (
            <li key={t.id} className="w-[58%] shrink-0 snap-center sm:w-auto">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática ya optimizada (WebP) */}
              <img
                src={`/ejemplos/diseno-${t.id}.webp`}
                alt={`Presupuesto de ejemplo con el diseño ${t.name}`}
                width={654}
                height={926}
                loading="lazy"
                decoding="async"
                className="h-auto w-full rounded-md border border-border bg-white shadow-sm"
              />
              <p className="mt-3 flex items-center gap-1.5 font-display font-semibold text-ink">
                {t.name}
                <span
                  className={
                    t.tier === "free"
                      ? "rounded bg-brand/15 px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink"
                      : "rounded bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground"
                  }
                >
                  {t.tier === "free" ? "Gratis" : open ? "Pack Premium" : "Próximamente"}
                </span>
              </p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{t.description}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm">
          <Link
            href="/crear"
            data-track="cta_start"
            data-track-location="plantillas"
            className="font-medium text-brand-strong underline underline-offset-4"
          >
            Probalo con tus propios datos, gratis →
          </Link>
        </p>
      </div>
    </section>
  );
}
