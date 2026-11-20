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
  /** Nombre comercial bajo el que se ofrece el servicio. */
  tradeName: string;
  /** CUIT del titular (no se declara hasta tenerlo). */
  taxId: string;
  /** Condición frente a ARCA (monotributo, responsable inscripto…): no se declara hasta verificarla. */
  taxStatus: string;
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
  holderName: "Axel Alejandro Morel",
  tradeName: "AtajoLab",
  // Pendientes (no se inventan ni se declaran sin verificar): ver docs/REQUISITOS_LEGALES_FISCALES.md
  taxId: "",
  taxStatus: "",
  address: "",
  // Correo oficial de AtajoLab (el que publica el sitio institucional atajolab.dev).
  supportEmail: "atajolab.tools@gmail.com",
  priceTaxNote: "",
  jurisdiction:
    "los tribunales ordinarios de la ciudad de Formosa, Argentina, sin perjuicio del derecho del consumidor a optar por el juez del lugar de cumplimiento de la obligación o de su domicilio, conforme al artículo 36 de la Ley 24.240",
  liabilityClause:
    "El servicio se brinda con esfuerzos razonables de disponibilidad y exactitud. Los cálculos y el contenido de cada presupuesto deben ser revisados por quien lo emite, que es el único responsable de lo que ofrece a sus clientes. No respondemos por la disponibilidad ininterrumpida del servicio ni por los acuerdos entre quienes emiten un presupuesto y sus clientes. Esta cláusula no excluye ni limita las responsabilidades que la ley pone a nuestro cargo ni los derechos que la legislación de defensa del consumidor reconoce a los consumidores.",
  // No se declara inscripción ni exención ante la AAIP sin haberlo verificado.
  dataRegistration: "",
  refundPolicy:
    "Si sos consumidor, podés revocar la contratación dentro de los 10 días corridos desde que se concretó o desde que el servicio quedó disponible, lo que ocurra último, y te reintegramos el importe abonado por el mismo medio de pago. Fuera de ese plazo no se reembolsan períodos ya iniciados, salvo error de cobro, cobro duplicado o falla grave del servicio imputable a nosotros; podés cancelar la renovación en cualquier momento y mantenés el acceso hasta el fin del período pagado.",
  priceChangeNotice: "30 días corridos",
  packScope:
    "El Pack Premium es permanente: no tiene renovación ni vencimiento programado y se mantiene mientras el servicio esté disponible. Si el servicio se discontinuara, te avisaremos con al menos 30 días de anticipación.",
  financialRetention: "10 años (sujeto a validación de las obligaciones aplicables)",
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
