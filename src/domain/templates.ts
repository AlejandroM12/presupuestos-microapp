export type TemplateTier = "free" | "premium";

export interface TemplateMeta {
  id: string;
  name: string;
  tier: TemplateTier;
  description: string;
  /** Color de acento por defecto (hex). */
  accent: string;
}

export const TEMPLATES: readonly TemplateMeta[] = [
  {
    id: "minimalista",
    name: "Minimalista",
    tier: "free",
    description: "Limpio y sobrio. Mucho aire, tipografía clara y totales a la vista.",
    accent: "#1f2937",
  },
  {
    id: "ejecutivo",
    name: "Ejecutivo",
    tier: "premium",
    description: "Encabezado sólido y tipografía con serif para propuestas formales.",
    accent: "#14213d",
  },
  {
    id: "moderno",
    name: "Moderno",
    tier: "premium",
    description: "Barra lateral de color y tabla en bloques para un aspecto actual.",
    accent: "#0f766e",
  },
  {
    id: "creativo",
    name: "Creativo",
    tier: "premium",
    description: "Composición asimétrica con grandes formas de color para estudios y diseño.",
    accent: "#e8590c",
  },
  {
    id: "tecnico",
    name: "Técnico",
    tier: "premium",
    description: "Grilla precisa y datos en monoespaciada, pensada para obra y oficios.",
    accent: "#1d4ed8",
  },
  {
    id: "comercial",
    name: "Comercial",
    tier: "premium",
    description: "Total destacado y condiciones al frente para cerrar ventas.",
    accent: "#b91c1c",
  },
] as const;

export const FREE_TEMPLATE_ID = "minimalista";
