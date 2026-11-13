import Link from "next/link";
import { Lock } from "lucide-react";
import type { QuoteStatus } from "@/generated/prisma/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-border bg-white p-5 sm:p-6", className)}>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-white/60 px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Aviso para funciones que requieren Pro vigente. */
export function ProNotice({ text }: { text: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm">
      <Lock className="size-4 shrink-0 text-brand" aria-hidden />
      <p className="min-w-0 flex-1 text-ink">{text}</p>
      <Link href="/dashboard/plan" className={buttonVariants({ size: "lg" })}>
        Ver plan Pro
      </Link>
    </div>
  );
}

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
};

const STATUS_STYLE: Record<QuoteStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-50 text-blue-800",
  ACCEPTED: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-red-50 text-red-800",
};

export function StatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
