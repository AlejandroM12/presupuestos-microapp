import { validUntil } from "@/domain/quote/defaults";
import { formatQuantity } from "@/domain/quote/units";
import type { QuoteDraft } from "@/domain/quote/schema";
import type { QuoteTotals } from "@/domain/quote/types";
import { formatDateAr, formatMoney } from "@/lib/format";

interface Props {
  quote: QuoteDraft;
  totals: QuoteTotals;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 ${strong ? "font-semibold text-slate-900" : ""}`}>
      <dt>{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

/** Vista previa en pantalla del presupuesto (aproximación del PDF). */
export function QuotePreview({ quote, totals }: Props) {
  const c = quote.currency;
  const money = (v: string) => formatMoney(v, c);
  const accent = quote.accentColor || undefined;
  const hasValidDate = /^\d{4}-\d{2}-\d{2}$/.test(quote.date) && quote.validityDays > 0;

  return (
    <article
      aria-label="Vista previa del presupuesto"
      className="mx-auto w-full max-w-[640px] rounded-md border border-border bg-white p-6 text-xs leading-relaxed text-slate-600 shadow-[0_20px_50px_-24px_rgb(20_33_61/0.35)] sm:p-9"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {quote.issuer.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quote.issuer.logo}
              alt="Logo"
              className="mb-2 max-h-14 w-auto max-w-40 object-contain"
            />
          ) : null}
          <p className="font-display text-lg font-semibold text-slate-900">
            {quote.issuer.businessName || "Nombre comercial"}
          </p>
          {quote.issuer.professionalName && <p>{quote.issuer.professionalName}</p>}
          <p className="mt-1 text-slate-500">
            {[quote.issuer.email, quote.issuer.phone, quote.issuer.website]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {quote.issuer.address && <p className="text-slate-500">{quote.issuer.address}</p>}
          {quote.issuer.taxId && <p className="text-slate-500">CUIT/DNI {quote.issuer.taxId}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: accent ?? "var(--brand)" }}
          >
            Presupuesto
          </p>
          <p className="font-mono text-slate-900">N.º {quote.number || "—"}</p>
          <p className="mt-1 text-slate-500">{hasValidDate ? formatDateAr(quote.date) : ""}</p>
          {hasValidDate && (
            <p className="text-slate-500">
              Válido hasta {formatDateAr(validUntil(quote.date, quote.validityDays))}
            </p>
          )}
        </div>
      </header>

      <section className="mt-6 grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Cliente</p>
          <p className="font-medium text-slate-900">
            {quote.customer.name || "Nombre del cliente"}
          </p>
          {quote.customer.company && <p>{quote.customer.company}</p>}
          <p className="text-slate-500">
            {[quote.customer.email, quote.customer.phone].filter(Boolean).join(" · ")}
          </p>
          {quote.customer.address && <p className="text-slate-500">{quote.customer.address}</p>}
          {quote.customer.taxId && (
            <p className="text-slate-500">CUIT/DNI {quote.customer.taxId}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Trabajo</p>
          <p className="font-medium text-slate-900">{quote.title || "Título del presupuesto"}</p>
          {quote.description && <p className="whitespace-pre-line">{quote.description}</p>}
        </div>
      </section>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="pb-2 font-medium">Descripción</th>
              <th className="pb-2 text-right font-medium">Cant.</th>
              <th className="pb-2 text-right font-medium">Precio</th>
              <th className="pb-2 text-right font-medium">Dto.</th>
              <th className="pb-2 text-right font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={item.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3 text-slate-800">
                  {item.description || <span className="text-slate-300">Concepto</span>}
                </td>
                <td className="py-2 text-right font-mono whitespace-nowrap">
                  {formatQuantity(item.quantity, item.unit)}
                </td>
                <td className="py-2 text-right font-mono">
                  {money(String(item.unitPrice || "0").replace(",", "."))}
                </td>
                <td className="py-2 text-right font-mono">
                  {Number(item.discountPercent) > 0 ? `${item.discountPercent}%` : "—"}
                </td>
                <td className="py-2 text-right font-mono text-slate-900">
                  {money(totals.lines[i]?.amount ?? "0.00")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-4 w-full max-w-xs space-y-1">
        <Row label="Subtotal" value={money(totals.subtotal)} />
        {Number(totals.globalDiscount) > 0 && (
          <Row label="Descuento" value={`- ${money(totals.globalDiscount)}`} />
        )}
        {Number(totals.surcharge) > 0 && <Row label="Recargo" value={money(totals.surcharge)} />}
        {totals.taxes.map((t) => (
          <Row key={t.id} label={t.label} value={money(t.amount)} />
        ))}
        <div className="mt-2 border-t-2 pt-2" style={{ borderColor: accent ?? "var(--ink)" }}>
          <Row label={`Total ${c}`} value={money(totals.total)} strong />
        </div>
      </dl>

      {(quote.deliveryTime || quote.paymentTerms || quote.notes || quote.terms) && (
        <section className="mt-6 space-y-3 border-t border-slate-200 pt-4">
          {quote.deliveryTime && (
            <p>
              <span className="font-medium text-slate-800">Plazo estimado: </span>
              {quote.deliveryTime}
            </p>
          )}
          {quote.paymentTerms && (
            <p>
              <span className="font-medium text-slate-800">Forma de pago: </span>
              {quote.paymentTerms}
            </p>
          )}
          {quote.notes && (
            <p className="whitespace-pre-line">
              <span className="font-medium text-slate-800">Observaciones: </span>
              {quote.notes}
            </p>
          )}
          {quote.terms && (
            <p className="whitespace-pre-line">
              <span className="font-medium text-slate-800">Condiciones: </span>
              {quote.terms}
            </p>
          )}
        </section>
      )}
      <footer className="mt-6 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
        Presupuesto comercial. Este documento no constituye una factura ni tiene validez fiscal.
      </footer>
    </article>
  );
}
