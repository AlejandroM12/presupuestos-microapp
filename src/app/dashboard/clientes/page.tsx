import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { EmptyState, PageHeader, ProNotice } from "@/components/dashboard/ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { requireUserWithEntitlements } from "@/server/pro";
import { listCustomers } from "@/services/customers";

export const metadata: Metadata = { title: "Clientes", robots: { index: false } };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user, entitlements } = await requireUserWithEntitlements("/dashboard/clientes");
  const { q } = await searchParams;
  const customers = await listCustomers(user.id, q);
  const canWrite = entitlements.cloudFeatures;

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Tu agenda de clientes, con sus presupuestos asociados."
        actions={
          canWrite ? (
            <Link href="/dashboard/clientes/nuevo" className={buttonVariants({ size: "lg" })}>
              <Plus data-icon="inline-start" /> Nuevo cliente
            </Link>
          ) : undefined
        }
      />
      {!canWrite && (
        <ProNotice text="La gestión de clientes es parte del plan Pro. Mientras tanto podés consultar los que ya cargaste." />
      )}

      <form method="get" role="search" className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre, empresa o email"
            className="pl-9"
            aria-label="Buscar clientes"
          />
        </div>
        <Button type="submit" variant="outline" size="lg" className="h-10">
          Buscar
        </Button>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title={q ? "No encontramos clientes con esa búsqueda" : "Todavía no cargaste clientes"}
          text={
            q
              ? "Probá con otro nombre o email."
              : "Guardá a tus clientes para reutilizar sus datos y ver todos sus presupuestos juntos."
          }
          action={
            canWrite && !q ? (
              <Link href="/dashboard/clientes/nuevo" className={buttonVariants({ size: "lg" })}>
                Crear el primero
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/clientes/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.company, c.email, c.phone].filter(Boolean).join(" · ") ||
                      "Sin datos de contacto"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {c._count.quotes} {c._count.quotes === 1 ? "presupuesto" : "presupuestos"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
