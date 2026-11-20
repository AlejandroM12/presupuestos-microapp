import type { Metadata } from "next";
import { Check } from "lucide-react";
import { BuyPackButton } from "@/components/billing/buy-pack-button";
import { PlanActions } from "@/components/billing/plan-actions";
import { Card, PageHeader } from "@/components/dashboard/ui";
import { isSubscriptionActive } from "@/domain/subscription";
import { paymentsEnabled } from "@/integrations/mercadopago";
import { canPurchase } from "@/lib/config/sales";
import { PLANS, PRICING } from "@/lib/config/plans";
import { formatArs } from "@/lib/format";
import { requireUserWithEntitlements } from "@/server/pro";
import { currentSubscription, paymentHistory } from "@/services/subscriptions";

export const metadata: Metadata = { title: "Mi plan", robots: { index: false } };

const dateLong = (d: Date) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);

const PAYMENT_STATUS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string }>;
}) {
  const { user, entitlements } = await requireUserWithEntitlements("/dashboard/plan");
  const { need } = await searchParams;
  const [sub, payments] = await Promise.all([
    currentSubscription(user.id),
    paymentHistory(user.id),
  ]);

  const active = sub ? isSubscriptionActive(sub) : false;
  const planName = entitlements.proActive
    ? `Pro ${sub?.plan === "YEARLY" ? "anual" : "mensual"}`
    : entitlements.ownsPremiumPack
      ? "Pack Premium"
      : "Gratis";

  let state: string;
  if (sub && active && sub.status === "CANCELLED") {
    state = `Cancelado: conservás el acceso hasta el ${dateLong(sub.currentPeriodEnd!)}.`;
  } else if (sub && active && sub.status === "PAST_DUE") {
    state = `Pago pendiente: conservás el acceso hasta el ${dateLong(sub.currentPeriodEnd!)}.`;
  } else if (sub && active) {
    state = `Activo. Se renueva automáticamente el ${dateLong(sub.currentPeriodEnd!)}.`;
  } else if (sub?.status === "PENDING" || (sub?.status === "ACTIVE" && !sub.currentPeriodEnd)) {
    state = "Esperando la confirmación del primer pago.";
  } else if (sub) {
    state = "Tu suscripción Pro finalizó. Tus presupuestos quedan en modo lectura.";
  } else {
    state = "Sin suscripción.";
  }

  const proPlan = sub && active ? sub.plan : null;
  const canCancel = !!sub && active && (sub.status === "ACTIVE" || sub.status === "PAST_DUE");

  return (
    <>
      <PageHeader title="Mi plan" description="Tu plan actual, renovación y compras." />
      {need === "pro" && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-border bg-white px-4 py-3 text-sm text-ink"
        >
          Esa función requiere el plan Pro vigente.
        </p>
      )}
      {paymentsEnabled() && !canPurchase(user.email) && (
        <p
          role="status"
          data-testid="sales-closed"
          className="mb-6 rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground"
        >
          Las compras todavía no están abiertas. Podés seguir usando el plan gratuito y te
          avisaremos cuando estén disponibles.
        </p>
      )}
      {!paymentsEnabled() && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground"
        >
          Los pagos todavía no están habilitados en este entorno: los botones de compra no van a
          iniciar un cobro.
        </p>
      )}

      <Card>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Plan actual
        </p>
        <p className="mt-1 font-display text-3xl font-semibold text-ink" data-testid="plan-name">
          {planName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground" data-testid="plan-state">
          {state}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Descargas este mes</dt>
            <dd className="font-medium text-ink">
              {entitlements.downloadLimit === null
                ? `Uso razonable (${entitlements.downloadCap - entitlements.downloadsRemaining} de ${entitlements.downloadCap} técnicos)`
                : `${entitlements.downloadLimit - entitlements.downloadsRemaining} de ${entitlements.downloadLimit}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Diseños disponibles</dt>
            <dd className="font-medium text-ink">{entitlements.templates.length} de 6</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Pack Premium</dt>
            <dd className="font-medium text-ink">
              {entitlements.ownsPremiumPack ? "Adquirido" : "No adquirido"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold text-ink">Plan Pro</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{PLANS.pro.tagline}</p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {PLANS.pro.features.map((f) => (
            <li key={f} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-brand" /> {f}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <PlanActions
            monthlyLabel={formatArs(PRICING.proMonthly)}
            yearlyLabel={formatArs(PRICING.proYearly)}
            canMonthly={proPlan !== "MONTHLY"}
            canYearly={proPlan !== "YEARLY"}
            canCancel={canCancel}
            accessUntil={sub?.currentPeriodEnd ? dateLong(sub.currentPeriodEnd) : null}
          />
          {proPlan && (
            <p className="mt-3 text-xs text-muted-foreground">
              Si cambiás de plan conservás el tiempo que ya pagaste y se cancela la renovación del
              plan anterior.
            </p>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold text-ink">Pack Premium</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {PLANS.premium_pack.tagline} · {formatArs(PRICING.premiumPack)}
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {PLANS.premium_pack.features.map((f) => (
            <li key={f} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-brand" /> {f}
            </li>
          ))}
        </ul>
        <div className="mt-5">
          {entitlements.ownsPremiumPack ? (
            <p className="text-sm font-medium text-ink">Ya tenés el Pack Premium. Es permanente.</p>
          ) : (
            <BuyPackButton
              authenticated
              returnTo="/dashboard/plan"
              label={`Comprar · ${formatArs(PRICING.premiumPack)}`}
            />
          )}
        </div>
      </Card>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-ink">Historial de pagos</h2>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="text-ink">
                {p.kind === "PREMIUM_PACK" ? "Pack Premium" : "Suscripción Pro"} ·{" "}
                <span className="text-muted-foreground">{dateLong(p.createdAt)}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-mono">{formatArs(Number(p.amount))}</span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {PAYMENT_STATUS[p.status] ?? p.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
