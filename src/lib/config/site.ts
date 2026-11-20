export const siteConfig = {
  name: "AtajoLab Presupuestos",
  shortName: "Presupuestos",
  parent: "AtajoLab",
  parentUrl: "https://atajolab.dev",
  catalogUrl: "https://atajolab.dev/es/microapps/",
  url: process.env.APP_URL ?? "https://presupuestos.atajolab.dev",
  locale: "es-AR",
  tagline:
    "Creá presupuestos profesionales en minutos. Personalizalos con tu logo, descargalos en PDF y compartilos con tus clientes. Empezá gratis.",
} as const;
