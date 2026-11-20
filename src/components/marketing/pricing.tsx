import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PLANS, PRICING } from "@/lib/config/plans";
import { formatArs } from "@/lib/format";
import { salesOpen } from "@/lib/config/sales";
import { cn } from "@/lib/utils";

export function Pricing() {
  const open = salesOpen();
  const cards = [
    {
      plan: PLANS.free,
      price: formatArs(0),
      note: "para siempre",
      cta: "Crear presupuesto gratis",
      href: "/crear",
      highlight: false,
    },
    {
      plan: PLANS.premium_pack,
      price: formatArs(PRICING.premiumPack),
      note: "pago único",
      cta: "Ver Pack Premium",
      href: "/ingresar?next=/dashboard/plantillas",
      highlight: false,
    },
    {
      plan: PLANS.pro,
      price: formatArs(PRICING.proMonthly),
      note: `por mes · o ${formatArs(PRICING.proYearly)} por año`,
      cta: "Elegir Pro",
      href: "/ingresar?next=/dashboard/plan",
      highlight: true,
    },
  ];
  return (
    <section id="precios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Precios claros
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {open
          ? "Empezá gratis. Pagás solo si necesitás más diseños o más volumen."
          : "Empezá gratis. Más diseños y más volumen llegan próximamente."}
      </p>
      <div className={cn("mt-8 grid gap-6", open ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        {(open ? cards : cards.slice(0, 1)).map(({ plan, price, note, cta, href, highlight }) => {
          const muted = highlight ? "text-white/70" : "text-muted-foreground";
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-xl border p-7",
                highlight ? "border-ink bg-ink text-white" : "border-border bg-white",
              )}
            >
              <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
              <p className={cn("mt-1 text-sm", muted)}>{plan.tagline}</p>
              <p className="mt-6 font-display text-4xl font-semibold tracking-tight">{price}</p>
              <p className={cn("mt-1 text-sm", muted)}>{note}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" /> {f}
                  </li>
                ))}
              </ul>
              {plan.excludes?.map((e) => (
                <p key={e} className={cn("mt-4 text-xs", muted)}>
                  {e}
                </p>
              ))}
              <Link
                href={href}
                data-track={href === "/crear" ? "cta_start" : undefined}
                data-track-location={href === "/crear" ? "precios" : undefined}
                className={cn(
                  buttonVariants({ variant: highlight ? "secondary" : "default", size: "lg" }),
                  "mt-7 h-10 w-full",
                  highlight && "bg-brand text-white hover:bg-brand/90",
                )}
              >
                {cta}
              </Link>
            </div>
          );
        })}
        {!open && (
          <div className="flex flex-col justify-center rounded-xl border border-dashed border-border bg-white/60 p-7">
            <h3 className="font-display text-xl font-semibold text-ink">Próximamente</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos preparando más diseños y un plan para quienes presupuestan todos los días.
              Mientras tanto, el uso gratuito sigue disponible.
            </p>
          </div>
        )}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        {open ? "Precios en pesos argentinos. Pagos a través de Mercado Pago. " : ""}Los documentos
        generados son presupuestos comerciales, no comprobantes fiscales.
      </p>
    </section>
  );
}
