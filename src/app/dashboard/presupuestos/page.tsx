import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { QuoteRowActions } from "@/components/dashboard/quote-actions";
import { StatusSelect } from "@/components/dashboard/status-select";
import {
  EmptyState,
  PageHeader,
  ProNotice,
  StatusBadge,
  STATUS_LABEL,
} from "@/components/dashboard/ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import type { QuoteStatus } from "@/generated/prisma/client";
import { formatDateAr, formatMoney } from "@/lib/format";
import { requireUserWithEntitlements } from "@/server/pro";
import { listQuotes, QUOTE_STATUSES } from "@/services/quotes";

export const metadata: Metadata = { title: "Presupuestos", robots: { index: false } };

type Search = { q?: string; estado?: string; page?: string; cliente?: string };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { user, entitlements } = await requireUserWithEntitlements("/dashboard/presupuestos");
  const sp = await searchParams;
  const status = (QUOTE_STATUSES as readonly string[]).includes(sp.estado ?? "")
    ? (sp.estado as QuoteStatus)
    : undefined;
  const page = Math.max(Number.parseInt(sp.page ?? "1", 10) || 1, 1);
  const customerId = /^[0-9a-f-]{36}$/i.test(sp.cliente ?? "") ? sp.cliente : undefined;
  const result = await listQuotes(user.id, {
    search: sp.q,
    status,
    page,
    customerId,
    pageSize: 15,
  });
  const canWrite = entitlements.cloudFeatures;
  const pages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const filtered = !!(sp.q || status || customerId);

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (status) params.set("estado", status);
    if (customerId) params.set("cliente", customerId);
    params.set("page", String(n));
    return `/dashboard/presupuestos?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Presupuestos"
        description="Buscá, filtrá y gestioná tus presupuestos guardados."
        actions={
          <Link href="/crear" className={buttonVariants({ size: "lg" })}>
            <Plus data-icon="inline-start" /> Nuevo
          </Link>
        }
      />
      {!canWrite && (
        <ProNotice text="Modo lectura: podés ver y descargar tus presupuestos. Para editar, duplicar, cambiar estados o crear nuevos en la nube necesitás el plan Pro vigente." />
      )}

      <form method="get" className="mb-5 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-52 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar por título, número o cliente"
            className="pl-9"
            aria-label="Buscar"
          />
        </div>
        <Select
          name="estado"
          defaultValue={status ?? ""}
          aria-label="Filtrar por estado"
          className="w-44"
        >
          <option value="">Todos los estados</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        {customerId && <input type="hidden" name="cliente" value={customerId} />}
        <Button type="submit" variant="outline" size="lg" className="h-10">
          Filtrar
        </Button>
        {filtered && (
          <Link
            href="/dashboard/presupuestos"
            className={buttonVariants({ variant: "ghost", size: "lg", className: "h-10" })}
          >
            Limpiar
          </Link>
        )}
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          title={
            filtered
              ? "No encontramos presupuestos con esos filtros"
              : "Todavía no guardaste presupuestos"
          }
          text={
            filtered
              ? "Probá con otra búsqueda o limpiá los filtros."
              : "Armá uno en el editor y guardalo en la nube para verlo acá."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <ul className="divide-y divide-border">
            {result.items.map((q) => (
              <li
                key={q.id}
                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    N.º {q.number} · {q.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {q.customerName || "Sin cliente"} · {formatDateAr(q.issueDate)} ·{" "}
                    <span className="font-mono text-ink">{formatMoney(q.total, q.currency)}</span>
                  </p>
                  <div className="mt-2">
                    {canWrite ? (
                      <StatusSelect id={q.id} status={q.status} />
                    ) : (
                      <StatusBadge status={q.status} />
                    )}
                  </div>
                </div>
                <QuoteRowActions id={q.id} canWrite={canWrite} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Paginación">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link
              href={pageHref(page + 1)}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
