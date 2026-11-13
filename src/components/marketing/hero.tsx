import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/config/site";
import { QuoteMock } from "./quote-mock";

const points = [
  "Sin registrarte para armarlo",
  "PDF A4 listo para enviar",
  "Cálculo automático de totales",
  "Compartí por WhatsApp",
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
      <div>
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" /> Un producto del ecosistema AtajoLab
        </p>
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Presupuestos que se ven profesionales, en dos minutos.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">{siteConfig.tagline}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/crear" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
            Crear presupuesto gratis <ArrowRight data-icon="inline-end" />
          </Link>
          <a
            href="#plantillas"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 px-5 text-base",
            )}
          >
            Ver plantillas
          </a>
        </div>
        <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {points.map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="size-4 text-brand" /> {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative flex justify-center lg:justify-end">
        <div
          className="absolute -right-6 top-10 hidden h-72 w-72 rounded-full bg-brand/15 blur-3xl lg:block"
          aria-hidden
        />
        <div className="relative lg:rotate-[1.5deg]">
          <QuoteMock />
        </div>
      </div>
    </section>
  );
}
