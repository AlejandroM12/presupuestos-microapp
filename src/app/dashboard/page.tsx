import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, EmptyState, PageHeader, ProNotice, StatusBadge } from "@/components/dashboard/ui";
import { buttonVariants } from "@/components/ui/button";
import { formatDateAr, formatMoney } from "@/lib/format";
import { requireUserWithEntitlements } from "@/server/pro";
import { quoteStats, recentQuotes } from "@/services/quotes";

export const metadata: Metadata = { title: "Inicio", robots: { index: false } };

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default async function DashboardHome() {
  const { user, entitlements } = await requireUserWithEntitlements("/dashboard");
  const [stats, recent] = await Promise.all([quoteStats(user.id), recentQuotes(user.id, 6)]);
  const amounts = Object.entries(stats.amountByCurrency);

  return (
    <>
      <PageHeader
        title="Inicio"
        description="Un resumen de tus presupuestos."
        actions={
          <Link href="/crear" className={buttonVariants({ size: "lg" })}>
            <Plus data-icon="inline-start" /> Nuevo presupuesto
          </Link>
        }
      />

      {!entitlements.cloudFeatures && (
        <ProNotice
          text={
            stats.total > 0
              ? "Tu plan Pro no está vigente: tus presupuestos guardados están en modo lectura."
              : "Con Pro guardás tus presupuestos en la nube, gestionás clientes y seguís su estado."
          }
        />
      )}

      {stats.total === 0 ? (
        <EmptyState
          title="Todavía no hay presupuestos guardados"
          text="Cuando guardes presupuestos con el plan Pro, acá vas a ver cuántos hay, cuáles están pendientes y el importe total presupuestado."
          action={
            <Link href="/crear" className={buttonVariants({ size: "lg" })}>
              Crear un presupuesto
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Presupuestos" value={stats.total} />
            <Stat label="Pendientes" value={stats.pending} hint="Borrador o enviado" />
            <Stat label="Aceptados" value={stats.accepted} />
            <Stat label="Rechazados" value={stats.rejected} />
          </div>

          <Card className="mt-6">
            <h2 className="font-display text-lg font-semibold text-ink">Importe presupuestado</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Suma de todos tus presupuestos, por moneda (no se convierten).
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {amounts.map(([currency, total]) => (
                <div key={currency}>
                  <dt className="text-xs font-medium text-muted-foreground">{currency}</dt>
                  <dd className="font-display text-2xl font-semibold text-ink">
                    {formatMoney(total, currency as "ARS" | "USD")}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Actividad reciente</h2>
              <Link
                href="/dashboard/presupuestos"
                className="text-sm font-medium text-ink underline underline-offset-4"
              >
                Ver todos
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {recent.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      N.º {q.number} · {q.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {q.customerName || "Sin cliente"} · {formatDateAr(q.issueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={q.status} />
                    <span className="font-mono text-sm text-ink">
                      {formatMoney(q.total, q.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
