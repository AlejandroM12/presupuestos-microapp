import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState, PageHeader, ProNotice, StatusBadge } from "@/components/dashboard/ui";
import { CustomerForm } from "@/components/dashboard/customer-form";
import { DeleteCustomerButton } from "@/components/dashboard/delete-customer";
import { formatDateAr, formatMoney } from "@/lib/format";
import { isUuid } from "@/server/api";
import { requireUserWithEntitlements } from "@/server/pro";
import { getCustomer } from "@/services/customers";
import { listQuotes, NotFoundError } from "@/services/quotes";

export const metadata: Metadata = { title: "Cliente", robots: { index: false } };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { user, entitlements } = await requireUserWithEntitlements(`/dashboard/clientes/${id}`);

  let customer;
  try {
    customer = await getCustomer(user.id, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const quotes = await listQuotes(user.id, { customerId: id, pageSize: 50 });
  const canWrite = entitlements.cloudFeatures;

  return (
    <>
      <PageHeader
        title={customer.name}
        description={customer.company || undefined}
        actions={
          <Link
            href="/dashboard/clientes"
            className="text-sm font-medium text-ink underline underline-offset-4"
          >
            Volver a clientes
          </Link>
        }
      />
      {!canWrite && (
        <ProNotice text="Para editar o eliminar clientes necesitás el plan Pro vigente." />
      )}

      <Card>
        <CustomerForm customer={customer} disabled={!canWrite} />
        {canWrite && (
          <div className="mt-6 border-t border-border pt-5">
            <DeleteCustomerButton id={customer.id} />
          </div>
        )}
      </Card>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-ink">
        Presupuestos de este cliente
      </h2>
      {quotes.items.length === 0 ? (
        <EmptyState
          title="Sin presupuestos asociados"
          text="Cuando guardes un presupuesto vinculado a este cliente va a aparecer acá."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
          {quotes.items.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  N.º {q.number} · {q.title}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateAr(q.issueDate)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={q.status} />
                <span className="font-mono text-sm">{formatMoney(q.total, q.currency)}</span>
                <Link
                  href={`/crear?id=${q.id}`}
                  className="text-sm font-medium text-ink underline underline-offset-4"
                >
                  Abrir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
