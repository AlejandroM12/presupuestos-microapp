import { DEMO_TEMPLATES as DATA } from "../../src/services/pdf/demo-data";

/**
 * Plantillas privadas de DEMOSTRACIÓN (datos ficticios) para validar el flujo comercial de
 * extremo a extremo. La definición vive en `src/services/pdf/demo-data.ts` y se comparte con las
 * muestras comerciales. No son productos del catálogo ni se crean en producción.
 */
export interface DemoTemplate {
  key: string;
  name: string;
  config: unknown;
  /** Etiquetas de los campos obligatorios y el valor ficticio con el que se completan. */
  fill: Record<string, string>;
  /** Valores (por id de campo) para pedir el PDF por API. */
  values: Record<string, string | number | boolean>;
  businessName: string;
  customerName: string;
  title: string;
  items: {
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    discountPercent?: string;
  }[];
}

export const DEMO_TEMPLATES: DemoTemplate[] = DATA.map((d) => ({
  key: d.key,
  name: d.name,
  config: d.config,
  fill: d.fill,
  values: d.values,
  businessName: d.issuer.businessName,
  customerName: d.customer.name,
  title: d.title,
  items: d.items,
}));
