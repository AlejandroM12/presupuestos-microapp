import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="rounded-2xl bg-ink px-6 py-14 text-center text-white sm:px-12">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Tu próximo presupuesto puede estar listo antes de tomar el mate.
        </h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/crear"
            data-track="cta_start"
            data-track-location="final"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 bg-brand px-5 text-base text-white hover:bg-brand/90",
            )}
          >
            Crear mi presupuesto gratis <ArrowRight data-icon="inline-end" />
          </Link>
          <a
            href="#ejemplos"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 border-white/25 bg-transparent px-5 text-base text-white hover:bg-white/10 hover:text-white",
            )}
          >
            Ver ejemplos
          </a>
        </div>
      </div>
    </section>
  );
}
