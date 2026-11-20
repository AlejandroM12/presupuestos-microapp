/**
 * Páginas de destino por rubro para campañas. Cada una muestra un presupuesto real generado por la
 * aplicación (datos ficticios) y contenido propio del rubro: no son copias de la landing.
 */
export interface Segment {
  slug: "talleres" | "construccion" | "tecnicos";
  /** Nombre corto del rubro. */
  name: string;
  /** Texto para el mensaje de WhatsApp de plantilla a medida. */
  activity: string;
  title: string;
  h1: string;
  description: string;
  /** Archivos en /public/ejemplos (sin extensión). */
  image: string;
  pdf: string;
  design: string;
  alt: string;
  /** Qué se ve en el ejemplo (todo lo que hace el editor hoy). */
  example: string[];
  pains: { title: string; text: string }[];
  /** Conceptos típicos para dar una idea de cómo se carga el trabajo del rubro. */
  concepts: string[];
}

export const SEGMENTS: Segment[] = [
  {
    slug: "talleres",
    name: "Talleres mecánicos",
    activity: "Taller mecánico",
    title: "Presupuestos para talleres mecánicos",
    h1: "Presupuestos para talleres mecánicos, claros y listos en minutos",
    description:
      "Armá el presupuesto de un service o una reparación con repuestos, mano de obra y total calculado. Descargalo en PDF con tu logo y compartilo por WhatsApp.",
    image: "rubro-talleres",
    pdf: "ejemplo-talleres",
    design: "Minimalista",
    alt: "Presupuesto de service y frenos para un auto, en formato PDF con el diseño Minimalista",
    example: [
      "Repuestos y mano de obra como conceptos separados, con cantidad y unidad (unidad, juego, horas).",
      "Descuento por ítem y IVA aplicados en el total, sin errores de cálculo.",
      "Forma de pago, plazo de entrega y condiciones al pie del documento.",
      "Tu logo y los datos del taller en el encabezado.",
    ],
    pains: [
      {
        title: "Un presupuesto claro evita discusiones",
        text: "El cliente ve qué repuestos y cuántas horas de trabajo componen el total, antes de aprobar.",
      },
      {
        title: "Menos tiempo en el mostrador",
        text: "Cargás el trabajo una vez y descargás el PDF para mandarlo por WhatsApp mientras el auto sigue en el elevador.",
      },
      {
        title: "Se ve profesional",
        text: "Un documento ordenado, con tus datos y condiciones, transmite confianza antes de cobrar.",
      },
    ],
    concepts: [
      "Aceite y filtros",
      "Pastillas y discos de freno",
      "Diagnóstico con scanner",
      "Mano de obra por hora",
    ],
  },
  {
    slug: "construccion",
    name: "Construcción y albañilería",
    activity: "Construcción y albañilería",
    title: "Presupuestos para obras y albañilería",
    h1: "Presupuestos de obra prolijos: materiales, mano de obra y total claro",
    description:
      "Cotizá una obra o refacción con materiales por m², bolsas y jornales, descuentos e impuestos. Descargá el PDF con tu logo y compartilo con tu cliente.",
    image: "rubro-construccion",
    pdf: "ejemplo-construccion",
    design: "Minimalista",
    alt: "Presupuesto de refacción de cocina y baño en PDF con el diseño Minimalista",
    example: [
      "Cantidades con unidades de obra (m², gl, bolsa, jornal) escritas como las usás vos.",
      "Materiales y mano de obra en renglones separados, con precio unitario y subtotal.",
      "IVA y descuentos aplicados sobre el total.",
      "Plazo de ejecución, forma de pago y condiciones comerciales al pie.",
    ],
    pains: [
      {
        title: "Cotizar sin olvidarte nada",
        text: "Cada concepto con su cantidad y unidad: demolición, materiales, colocación, pintura, jornales.",
      },
      {
        title: "Presupuestos que se ven serios",
        text: "Una propuesta ordenada ayuda a que el cliente apruebe y a que no haya dudas sobre el alcance.",
      },
      {
        title: "Listo desde la obra",
        text: "Funciona desde el celular: cargás, descargás el PDF y lo mandás por WhatsApp.",
      },
    ],
    concepts: [
      "Demolición y retiro",
      "Materiales por m² o bolsa",
      "Colocación y mano de obra",
      "Jornales de oficial y ayudante",
    ],
  },
  {
    slug: "tecnicos",
    name: "Técnicos y servicios",
    activity: "Técnico o servicio",
    title: "Presupuestos para técnicos e instaladores",
    h1: "Presupuestos para técnicos y servicios: visita, repuestos y mano de obra",
    description:
      "Presupuestá instalaciones y reparaciones (aire acondicionado, electricidad, plomería y más) con materiales y horas de trabajo. PDF con tu logo, listo para enviar.",
    image: "rubro-tecnicos",
    pdf: "ejemplo-tecnicos",
    design: "Minimalista",
    alt: "Presupuesto de reparación de aire acondicionado en PDF con el diseño Minimalista",
    example: [
      "Visita, repuestos y mano de obra por hora en renglones claros.",
      "Cantidades fraccionadas (0,8 kg de gas, 2,5 horas) con la unidad correcta.",
      "Validez del presupuesto y forma de pago visibles para el cliente.",
      "Datos de contacto y WhatsApp en el documento.",
    ],
    pains: [
      {
        title: "Del diagnóstico al presupuesto en el momento",
        text: "Presupuestá en la misma visita y dejá al cliente con un documento claro en su teléfono.",
      },
      {
        title: "Cada trabajo, bien detallado",
        text: "Cantidades, unidades y precios por renglón: el cliente entiende qué paga.",
      },
      {
        title: "Una imagen más profesional que un mensaje suelto",
        text: "Pasá de un audio o un texto a un PDF ordenado con tu marca.",
      },
    ],
    concepts: [
      "Visita y diagnóstico",
      "Repuestos y materiales",
      "Mano de obra por hora",
      "Instalación y puesta en marcha",
    ],
  },
];

export const getSegment = (slug: string) => SEGMENTS.find((s) => s.slug === slug);
