import {
  Calculator,
  FileDown,
  LayoutTemplate,
  MessageCircle,
  Smartphone,
  Zap,
} from "lucide-react";

const items = [
  {
    icon: Zap,
    title: "Rápido de verdad",
    text: "Cargás conceptos, cantidades y precios; el total se calcula solo. Un caso simple te lleva menos de dos minutos.",
  },
  {
    icon: Calculator,
    title: "Cuentas sin errores",
    text: "Descuentos, recargos e impuestos con precisión decimal. Sin diferencias de centavos.",
  },
  {
    icon: FileDown,
    title: "PDF real",
    text: "Documentos A4 con texto seleccionable, tablas legibles y paginación correcta.",
  },
  {
    icon: LayoutTemplate,
    title: "Diseños propios",
    text: "Seis plantillas distintas entre sí, con tu logo y tus colores.",
  },
  {
    icon: MessageCircle,
    title: "Listo para WhatsApp",
    text: "Armamos el mensaje para tu cliente con el total y la validez.",
  },
  {
    icon: Smartphone,
    title: "Pensado para el celular",
    text: "Presupuestá desde la obra o el local, sin instalar nada.",
  },
];

export function Benefits() {
  return (
    <section className="border-y border-border bg-white/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Menos tiempo armando presupuestos, más tiempo trabajando.
        </h2>
        <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon className="size-6 text-brand" strokeWidth={1.8} />
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
