const steps = [
  {
    n: "01",
    title: "Cargá tus datos",
    text: "Tu negocio, tu cliente y los conceptos con cantidad y precio. Se guarda un borrador en tu navegador.",
  },
  {
    n: "02",
    title: "Elegí el diseño",
    text: "Mirá la vista previa en vivo y probá plantillas hasta que quede como querés.",
  },
  {
    n: "03",
    title: "Descargá y compartí",
    text: "Bajá el PDF o enviá el resumen por WhatsApp. Para descargar necesitás una cuenta gratuita.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Cómo funciona
      </h2>
      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="border-t-2 border-ink pt-5">
            <span className="font-mono text-sm text-brand">{s.n}</span>
            <h3 className="mt-2 font-display text-xl font-semibold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
