import type { Metadata } from "next";
import Link from "next/link";
import { Check, Eye, Lock } from "lucide-react";
import { BuyPackButton } from "@/components/billing/buy-pack-button";
import { PageHeader } from "@/components/dashboard/ui";
import { TemplateThumb } from "@/components/marketing/template-thumb";
import { buttonVariants } from "@/components/ui/button";
import { TEMPLATES } from "@/domain/templates";
import { PRICING } from "@/lib/config/plans";
import { formatArs } from "@/lib/format";
import { requireUserWithEntitlements } from "@/server/pro";
import { listAssignedCustomTemplates } from "@/services/custom-templates";

export const metadata: Metadata = { title: "Plantillas", robots: { index: false } };

export default async function TemplatesPage() {
  const { user, entitlements } = await requireUserWithEntitlements("/dashboard/plantillas");
  const privateTemplates = await listAssignedCustomTemplates(user.id);
  const lockedCount = TEMPLATES.filter((t) => !entitlements.templates.includes(t.id)).length;

  return (
    <>
      <PageHeader
        title="Plantillas"
        description="Los diseños disponibles para tus PDF. Podés previsualizar cualquiera con tus datos."
        actions={
          lockedCount > 0 ? (
            <BuyPackButton
              authenticated
              returnTo="/dashboard/plantillas"
              label={`Comprar Pack · ${formatArs(PRICING.premiumPack)}`}
            />
          ) : undefined
        }
      />
      {privateTemplates.length > 0 && (
        <section aria-labelledby="mis-plantillas" className="mb-8">
          <h2 id="mis-plantillas" className="font-display text-lg font-semibold text-ink">
            Mis plantillas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Diseños privados asignados a tu cuenta. Se conservan aunque cambies o canceles tu plan.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {privateTemplates.map((t) => (
              <li key={t.id} className="rounded-xl border border-border bg-white p-4">
                <p className="font-display font-semibold text-ink">{t.name}</p>
                {t.description && (
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{t.description}</p>
                )}
                <Link
                  href={`/crear?template=${t.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}
                >
                  Usar en un presupuesto
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3">
        {TEMPLATES.map((t) => {
          const unlocked = entitlements.templates.includes(t.id);
          return (
            <figure key={t.id} className="rounded-xl border border-border bg-white p-4">
              <TemplateThumb template={t} />
              <figcaption className="mt-3">
                <p className="flex items-center gap-1.5 font-display font-semibold text-ink">
                  {t.name}
                  {unlocked ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-sans text-[10px] font-medium text-emerald-800">
                      <Check className="size-3" aria-hidden />{" "}
                      {t.tier === "free" ? "Incluida" : "Disponible"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
                      <Lock className="size-3" aria-hidden /> Bloqueada
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{t.description}</p>
                <Link
                  href={`/crear?template=${t.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}
                >
                  <Eye data-icon="inline-start" />{" "}
                  {unlocked ? "Usar en un presupuesto" : "Ver vista previa"}
                </Link>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </>
  );
}
