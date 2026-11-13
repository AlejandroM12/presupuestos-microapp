import { ChevronDown } from "lucide-react";

export const FAQ_ITEMS = [
  {
    q: "¿Necesito una cuenta para armar un presupuesto?",
    a: "No. Podés usar el editor y ver la vista previa sin registrarte; tu borrador queda guardado en tu navegador. Para descargar el PDF necesitás una cuenta gratuita.",
  },
  {
    q: "¿Cuántos PDF puedo descargar gratis?",
    a: "Tres por mes con tu cuenta, usando el diseño Minimalista. Ese PDF incluye una marca discreta de AtajoLab.",
  },
  {
    q: "¿Qué incluye el Pack Premium?",
    a: "Cinco diseños adicionales, personalización de colores y PDFs sin marca. Se paga una sola vez y queda asociado a tu cuenta. No incluye descargas ilimitadas ni historial en la nube.",
  },
  {
    q: "¿Qué pasa si cancelo Pro?",
    a: "Conservás tu cuenta, tus compras únicas y tus presupuestos guardados en modo lectura. Las funciones exclusivas de Pro se desactivan cuando termina el período que ya pagaste.",
  },
  {
    q: "¿Los presupuestos son facturas?",
    a: "No. Son presupuestos comerciales y no tienen validez fiscal. AtajoLab Presupuestos no emite comprobantes A, B o C.",
  },
  {
    q: "¿Cómo se paga?",
    a: "Con Mercado Pago, en pesos argentinos. Nunca guardamos datos de tu tarjeta.",
  },
  {
    q: "¿Puedo usar dólares?",
    a: "Sí, podés presupuestar en ARS o USD. No convertimos monedas automáticamente: cargás los importes en la moneda que elijas.",
  },
  {
    q: "¿Cómo envío el presupuesto a mi cliente?",
    a: "Descargás el PDF y lo compartís desde tu dispositivo. También armamos un mensaje listo para WhatsApp; el archivo lo adjuntás vos.",
  },
];

export function Faq() {
  return (
    <section id="preguntas" className="border-t border-border bg-white/60">
      <div className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Preguntas frecuentes
        </h2>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
