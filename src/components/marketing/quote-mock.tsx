/** Ejemplo visual estático de un presupuesto (datos ficticios, solo ilustrativos). */
const rows = [
  { d: "Tablero eléctrico trifásico", q: "1", u: "$ 184.000" },
  { d: "Cableado y canalización", q: "42 m", u: "$ 3.150" },
  { d: "Mano de obra", q: "12 h", u: "$ 9.800" },
];

export function QuoteMock() {
  return (
    <div
      className="relative w-full max-w-[440px] rounded-md border border-border bg-white p-6 text-[11px] leading-snug text-slate-700 shadow-[0_30px_60px_-20px_rgb(20_33_61/0.35)] sm:p-8"
      role="img"
      aria-label="Ejemplo de presupuesto profesional con conceptos y total"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-base font-semibold text-ink">Electro Sur</p>
          <p className="mt-0.5 text-slate-500">Instalaciones eléctricas</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
            Presupuesto
          </p>
          <p className="font-mono text-slate-500">N.º 0042</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-y border-slate-200 py-3">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-slate-400">Para</p>
          <p className="font-medium text-slate-800">Laura Benítez</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider text-slate-400">Válido hasta</p>
          <p className="font-medium text-slate-800">30 días</p>
        </div>
      </div>
      <table className="mt-4 w-full">
        <thead>
          <tr className="text-left text-[9px] uppercase tracking-wider text-slate-400">
            <th className="pb-2 font-medium">Concepto</th>
            <th className="pb-2 text-right font-medium">Cant.</th>
            <th className="pb-2 text-right font-medium">Unitario</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.d} className="border-t border-slate-100">
              <td className="py-2 pr-2 text-slate-800">{r.d}</td>
              <td className="py-2 text-right font-mono">{r.q}</td>
              <td className="py-2 text-right font-mono">{r.u}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-end justify-between rounded bg-ink px-4 py-3 text-white">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/70">Total ARS</span>
        <span className="font-display text-xl font-semibold">$ 433.800</span>
      </div>
      <p className="mt-3 text-[9px] text-slate-400">Presupuesto comercial. No es una factura.</p>
    </div>
  );
}
