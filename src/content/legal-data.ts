/**
 * ÚNICO lugar donde se cargan los datos del titular y las decisiones legales/comerciales que
 * completan los textos de `/legal/*`. Cada campo vacío deja un marcador [COMPLETAR: …] visible en
 * la página; cuando no queda ninguno, el texto se muestra como final: sin aviso de borrador,
 * indexable y dentro del sitemap.
 *
 * No inventar datos: completar solo con información real y validada con el contador/asesor.
 * Estos textos no constituyen asesoramiento legal.
 */
export interface LegalData {
  /** Razón social o nombre y apellido del titular. */
  holderName: string;
  /** CUIT del titular. */
  taxId: string;
  /** Domicilio legal completo. */
  address: string;
  /** Email de contacto y soporte. */
  supportEmail: string;
  /** Tratamiento de impuestos en los precios, p. ej. "IVA incluido" o "sin IVA (monotributista)". */
  priceTaxNote: string;
  /** Jurisdicción, p. ej. "los tribunales ordinarios de la ciudad de Formosa". */
  jurisdiction: string;
  /** Cláusula de limitación de responsabilidad (redactada o validada por el asesor). */
  liabilityClause: string;
  /** Inscripción del registro de datos ante la AAIP, o aclaración de que no corresponde. */
  dataRegistration: string;
  /** Política de reembolsos para períodos de Pro ya iniciados. */
  refundPolicy: string;
  /** Plazo de aviso de cambios de precio, p. ej. "30 días corridos". */
  priceChangeNotice: string;
  /** Alcance de "permanente" del Pack Premium, p. ej. "mientras el servicio esté disponible". */
  packScope: string;
  /** Plazo de conservación de registros financieros, p. ej. "10 años". */
  financialRetention: string;
}

export const LEGAL_DATA: LegalData = {
  holderName: "",
  taxId: "",
  address: "",
  supportEmail: "",
  priceTaxNote: "",
  jurisdiction: "",
  liabilityClause: "",
  dataRegistration: "",
  refundPolicy: "",
  priceChangeNotice: "",
  packScope: "",
  financialRetention: "",
};

/** Hechos técnicos verificados del servicio (no requieren datos del titular). */
export const SERVICE_FACTS = {
  /** Hetzner (Alemania, Falkenstein): ubicación del servidor según su dirección IP. */
  serverLocation: "Falkenstein (Alemania)",
  /** `BACKUP_RETENTION_DAYS` por defecto en producción. */
  backupRetentionDays: 14,
} as const;

export const placeholder = (hint: string) => `[COMPLETAR: ${hint}]`;

/** Valor cargado o marcador visible si falta. */
export function filled(value: string, hint: string): string {
  return value.trim() ? value.trim() : placeholder(hint);
}
