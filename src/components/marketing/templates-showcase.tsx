import { Lock } from "lucide-react";
import { TEMPLATES } from "@/domain/templates";
import { TemplateThumb } from "./template-thumb";

export function TemplatesShowcase() {
  return (
    <section id="plantillas" className="border-y border-border bg-white/60">
      <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Seis diseños, seis personalidades
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          No son el mismo documento con otro color: cada plantilla tiene su propia composición. Una
          es gratuita y cinco forman parte del Pack Premium.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-6">
          {TEMPLATES.map((t) => (
            <figure key={t.id}>
              <TemplateThumb template={t} />
              <figcaption className="mt-3">
                <p className="flex items-center gap-1.5 font-display font-semibold text-ink">
                  {t.name}
                  {t.tier === "premium" ? (
                    <Lock className="size-3 text-muted-foreground" aria-label="Premium" />
                  ) : (
                    <span className="rounded bg-brand/15 px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink">
                      Gratis
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{t.description}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
