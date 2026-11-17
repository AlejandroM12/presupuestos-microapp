import {
  Camera,
  Hammer,
  MessageCircle,
  Store,
  UserRound,
  Wrench,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { customTemplateRequestLinks } from "@/domain/commercial-whatsapp";
import { hasCommercialWhatsapp } from "@/lib/config/commercial-contact";
import { cn } from "@/lib/utils";

const PROFESSIONS = [
  {
    id: "construccion",
    icon: Hammer,
    title: "Construcción y albañilería",
    fields: ["Materiales", "Mano de obra", "m²", "Etapas", "Anticipos", "Plazos"],
    accent: "#b45309",
    mockTitle: "Obra · Refacción cocina",
    mockRows: [
      { d: "Demolición y retiro", q: "1 glo" },
      { d: "Revestimiento cerámico", q: "18 m²" },
      { d: "Mano de obra", q: "5 días" },
    ],
  },
  {
    id: "taller",
    icon: Wrench,
    title: "Talleres mecánicos",
    fields: ["Patente", "Marca/modelo", "Km", "Repuestos", "Diagnóstico", "Garantía"],
    accent: "#0f766e",
    mockTitle: "Service · AB 123 CD",
    mockRows: [
      { d: "Diagnóstico computarizado", q: "1 u" },
      { d: "Kit de frenos delantero", q: "1 kit" },
      { d: "Mano de obra", q: "3 h" },
    ],
  },
  {
    id: "tecnicos",
    icon: Zap,
    title: "Técnicos e instaladores",
    fields: ["Equipos", "Diagnóstico", "Materiales", "Instalación", "Garantías", "Condiciones"],
    accent: "#1d4ed8",
    mockTitle: "Instalación A/A split",
    mockRows: [
      { d: "Equipo 3000 frigorías", q: "1 u" },
      { d: "Instalación y prueba", q: "1 glo" },
      { d: "Cañería adicional", q: "4 m" },
    ],
  },
  {
    id: "eventos",
    icon: Camera,
    title: "Fotógrafos y eventos",
    fields: ["Fecha", "Paquetes", "Horas", "Entregables", "Reserva", "Condiciones"],
    accent: "#be185d",
    mockTitle: "Cobertura · Casamiento",
    mockRows: [
      { d: "Cobertura 8 horas", q: "1 paq" },
      { d: "Álbum digital", q: "1 u" },
      { d: "Sesión preboda", q: "2 h" },
    ],
  },
  {
    id: "independientes",
    icon: UserRound,
    title: "Profesionales independientes",
    fields: ["Alcance", "Entregables", "Honorarios", "Plazos", "Etapas"],
    accent: "#4338ca",
    mockTitle: "Proyecto · Consultoría",
    mockRows: [
      { d: "Diagnóstico inicial", q: "1 etap" },
      { d: "Informe y plan", q: "1 u" },
      { d: "Acompañamiento", q: "4 sem" },
    ],
  },
  {
    id: "comercios",
    icon: Store,
    title: "Comercios y servicios",
    fields: ["Productos", "Servicios", "Condiciones", "Campos del negocio"],
    accent: "#b91c1c",
    mockTitle: "Pedido · Equipamiento",
    mockRows: [
      { d: "Kit inicial", q: "2 u" },
      { d: "Capacitación", q: "1 ses" },
      { d: "Soporte 30 días", q: "1 glo" },
    ],
  },
] as const;

function ProfessionMock({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: readonly { d: string; q: string }[];
  accent: string;
}) {
  return (
    <div
      className="rounded-md border border-border/80 bg-white p-3 text-[10px] leading-snug text-slate-700 shadow-sm"
      aria-hidden
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-xs font-semibold text-ink">{title}</p>
        <span
          className="rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: accent }}
        >
          A medida
        </span>
      </div>
      <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
        {rows.map((r) => (
          <li key={r.d} className="flex justify-between gap-2">
            <span>{r.d}</span>
            <span className="font-mono text-slate-500">{r.q}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CustomTemplates() {
  const whatsappReady = hasCommercialWhatsapp();
  const generic = customTemplateRequestLinks();

  return (
    <section
      id="plantillas-personalizadas"
      className="border-t border-border bg-[linear-gradient(180deg,rgb(255_255_255/0.35),rgb(248_246_241)_40%,rgb(248_246_241))]"
    >
      <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Servicio independiente de los planes
        </p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Tu profesión, tu propio diseño.
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          ¿Necesitás un presupuesto adaptado específicamente a tu actividad? Creamos una plantilla
          personalizada con la identidad de tu negocio, los campos que necesitás y una estructura
          pensada para tu profesión. Trabajamos con vos para entender el rubro y entregar un diseño
          listo para usar: no tenés que armar la plantilla vos.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {whatsappReady && generic.whatsapp ? (
            <>
              <a
                href={generic.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}
              >
                Solicitar mi plantilla personalizada
                <MessageCircle data-icon="inline-end" />
              </a>
              <a
                href={generic.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 px-5 text-base",
                )}
              >
                Consultar por WhatsApp
              </a>
            </>
          ) : (
            <a
              href={generic.mailto}
              className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}
            >
              Solicitar mi plantilla personalizada
            </a>
          )}
          <p className="text-sm text-muted-foreground sm:ml-2">
            Diseño a medida · Pago único · Adaptado a tu negocio
          </p>
        </div>
        {!whatsappReady && (
          <p className="mt-3 max-w-2xl text-xs text-muted-foreground">
            Por ahora la solicitud se abre por correo. Cuando configuremos el WhatsApp comercial
            (`ATAJOLAB_WHATSAPP_E164`), este mismo CTA usará un enlace directo a la conversación.
          </p>
        )}

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PROFESSIONS.map((p) => {
            const links = customTemplateRequestLinks(p.title);
            const href = whatsappReady && links.whatsapp ? links.whatsapp : links.mailto;
            const Icon = p.icon;
            return (
              <article
                key={p.id}
                className="flex flex-col rounded-xl border border-border bg-white/90 p-5 shadow-[0_18px_40px_-28px_rgb(20_33_61/0.45)]"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: p.accent }}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">{p.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ejemplo de campos que podemos incorporar. Cotizamos cada pedido según
                      alcance.
                    </p>
                  </div>
                </div>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {p.fields.map((f) => (
                    <li
                      key={f}
                      className="rounded-md border border-border bg-[rgb(248_246_241)] px-2 py-1 text-[11px] text-ink"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <ProfessionMock title={p.mockTitle} rows={p.mockRows} accent={p.accent} />
                </div>
                <a
                  href={href}
                  {...(whatsappReady
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="mt-4 text-sm font-medium text-brand hover:underline"
                >
                  Consultar para {p.title.toLowerCase()}
                </a>
              </article>
            );
          })}
        </div>

        <p className="mt-10 max-w-3xl text-sm text-muted-foreground">
          Estos rubros son ejemplos. Podemos adaptar una plantilla a casi cualquier actividad:
          oficios, estudios, comercios y prestadores de servicios. El precio se define según el
          diseño y las funcionalidades que necesites; no hay un valor fijo publicado.
        </p>
      </div>
    </section>
  );
}
