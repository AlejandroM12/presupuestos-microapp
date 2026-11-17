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
    a: "Veinte descargas por mes, cinco diseños premium más Minimalista, colores personalizables y PDFs sin marca AtajoLab. Se paga una sola vez y queda asociado a tu cuenta. No incluye historial en la nube, clientes ni dashboard.",
  },
  {
    q: "¿Cuántos PDF puedo descargar con Pro?",
    a: "Las descargas de Pro están sujetas a uso razonable: hasta 60 PDF por hora y 3.000 por mes. A partir de 500 descargas mensuales registramos la actividad de forma preventiva, sin bloquearte por alcanzar ese número.",
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
  {
    q: "¿Puedo solicitar una plantilla adaptada a mi profesión?",
    a: "Sí. Podemos desarrollar una plantilla personalizada con los campos, estilos y secciones que necesite tu actividad.",
  },
  {
    q: "¿Necesito contratar Pro para utilizar una plantilla personalizada?",
    a: "No. Las plantillas personalizadas pueden contratarse independientemente del plan que tengas. Los límites de descarga dependen de tu plan.",
  },
  {
    q: "¿Cuánto cuesta una plantilla personalizada?",
    a: "El precio depende del diseño y de las funcionalidades que necesites. Contactanos para evaluar tu solicitud y preparar un presupuesto.",
  },
  {
    q: "¿La plantilla estará disponible para otros usuarios?",
    a: "Las plantillas privadas se asignan exclusivamente a las cuentas autorizadas.",
  },
  {
    q: "¿Tengo que pagar todos los meses por mi plantilla personalizada?",
    a: "No. El diseño personalizado se contrata mediante un pago único, según las condiciones acordadas. Las funcionalidades adicionales de los planes mantienen sus propias condiciones.",
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
