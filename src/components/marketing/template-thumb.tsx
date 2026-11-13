import type { TemplateMeta } from "@/domain/templates";

/** Miniatura esquemática de cada diseño. Cada una usa una composición distinta. */
function Lines({ n, className = "" }: { n: number; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="h-[3px] rounded-full bg-slate-200"
          style={{ width: `${100 - ((i * 13) % 35)}%` }}
        />
      ))}
    </div>
  );
}

const shell =
  "relative aspect-[1/1.414] w-full overflow-hidden rounded-sm border border-border bg-white p-3 shadow-sm";

export function TemplateThumb({ template }: { template: TemplateMeta }) {
  const c = template.accent;
  switch (template.id) {
    case "ejecutivo":
      return (
        <div className={shell} aria-hidden>
          <div className="-mx-3 -mt-3 mb-3 h-10" style={{ background: c }} />
          <Lines n={3} />
          <div className="my-3 h-px bg-slate-300" />
          <Lines n={7} />
          <div className="ml-auto mt-3 h-4 w-1/3" style={{ background: c }} />
        </div>
      );
    case "moderno":
      return (
        <div className={`${shell} flex gap-2`} aria-hidden>
          <div className="-my-3 -ml-3 w-1/4" style={{ background: c }} />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-1/2 rounded-sm" style={{ background: c, opacity: 0.8 }} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-3 rounded-sm bg-slate-100" />
            ))}
            <div className="ml-auto h-4 w-1/2 rounded-sm" style={{ background: c }} />
          </div>
        </div>
      );
    case "creativo":
      return (
        <div className={shell} aria-hidden>
          <div className="absolute -right-6 -top-6 size-20 rounded-full" style={{ background: c }} />
          <div
            className="absolute -bottom-8 -left-6 size-24 rotate-12"
            style={{ background: c, opacity: 0.25 }}
          />
          <div className="relative mt-8 space-y-2">
            <div className="h-4 w-2/3 rounded-sm" style={{ background: c }} />
            <Lines n={6} />
          </div>
        </div>
      );
    case "tecnico":
      return (
        <div className={shell} aria-hidden>
          <div className="mb-2 flex justify-between border-b-2 pb-1" style={{ borderColor: c }}>
            <div className="h-2 w-1/3 bg-slate-300" />
            <div className="h-2 w-1/5" style={{ background: c }} />
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="grid grid-cols-[2fr_1fr_1fr] gap-1 border-b border-slate-200 py-[3px]"
            >
              <div className="h-[3px] bg-slate-200" />
              <div className="h-[3px] bg-slate-200" />
              <div className="h-[3px] bg-slate-300" />
            </div>
          ))}
        </div>
      );
    case "comercial":
      return (
        <div className={shell} aria-hidden>
          <div className="mb-3 rounded-sm px-2 py-3 text-center" style={{ background: c }}>
            <div className="mx-auto h-3 w-1/2 rounded-sm bg-white/90" />
          </div>
          <Lines n={5} />
          <div className="mt-3 space-y-1 rounded-sm border-2 p-2" style={{ borderColor: c }}>
            <Lines n={2} />
          </div>
        </div>
      );
    default:
      return (
        <div className={shell} aria-hidden>
          <div className="mb-3 h-2 w-1/3 bg-slate-800" />
          <Lines n={9} />
          <div className="ml-auto mt-4 h-3 w-1/4 bg-slate-800" />
        </div>
      );
  }
}
