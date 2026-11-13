import {
  Brush,
  Camera,
  Code2,
  Droplets,
  Hammer,
  HardHat,
  Printer,
  Store,
  Wrench,
  Zap,
} from "lucide-react";

const people = [
  { icon: Zap, label: "Electricistas" },
  { icon: Droplets, label: "Plomeros" },
  { icon: Wrench, label: "Técnicos" },
  { icon: Hammer, label: "Albañiles" },
  { icon: HardHat, label: "Constructores" },
  { icon: Brush, label: "Diseñadores" },
  { icon: Code2, label: "Programadores" },
  { icon: Camera, label: "Fotógrafos" },
  { icon: Printer, label: "Imprentas" },
  { icon: Store, label: "Comercios" },
];

export function Audience() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Para cualquiera que cotice un trabajo
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Unidades, monedas y condiciones editables: se adapta a tu rubro, no al revés.
      </p>
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {people.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-ink"
          >
            <Icon className="size-4.5 text-brand" strokeWidth={1.8} /> {label}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        …y profesionales independientes y prestadores de servicios en general.
      </p>
    </section>
  );
}
