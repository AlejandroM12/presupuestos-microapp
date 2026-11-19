/**
 * Plantillas privadas de DEMOSTRACIÓN (datos ficticios). Sirven para validar el flujo comercial
 * de extremo a extremo y generar PDFs de muestra; no son productos del catálogo ni se publican.
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
}

export const DEMO_TEMPLATES: DemoTemplate[] = [
  {
    key: "taller-mecanico",
    name: "Demo · Taller mecánico",
    businessName: "Taller Mecánico Demo",
    customerName: "Juan Pérez (ficticio)",
    title: "Service completo y frenos",
    fill: { Patente: "AB123CD", "Marca y modelo": "Fiat Cronos 1.3", Kilometraje: "84500" },
    values: {
      patente: "AB123CD",
      marca_modelo: "Fiat Cronos 1.3",
      km: 84500,
      ingreso: "2026-11-18",
      diagnostico:
        "Pastillas de freno delanteras al límite. Pérdida leve de aceite en tapa de válvulas.",
      garantia: "90 días",
    },
    config: {
      style: {
        accentColor: "#0f766e",
        fontFamily: "sans",
        headerTitle: "Orden de trabajo",
        headerSubtitle: "Mecánica integral · Demo",
        footerText:
          "Garantía sobre mano de obra según lo indicado. Los repuestos tienen garantía del fabricante.",
        showLogo: true,
      },
      sections: [
        { id: "vehiculo", title: "Datos del vehículo", position: 0 },
        { id: "diagnostico", title: "Diagnóstico y garantía", position: 1 },
      ],
      fields: [
        {
          id: "patente",
          label: "Patente",
          type: "text",
          required: true,
          sectionId: "vehiculo",
          position: 0,
        },
        {
          id: "marca_modelo",
          label: "Marca y modelo",
          type: "text",
          required: true,
          sectionId: "vehiculo",
          position: 1,
        },
        {
          id: "km",
          label: "Kilometraje",
          type: "number",
          required: true,
          min: 0,
          sectionId: "vehiculo",
          position: 2,
        },
        {
          id: "ingreso",
          label: "Fecha de ingreso",
          type: "date",
          sectionId: "vehiculo",
          position: 3,
        },
        {
          id: "diagnostico",
          label: "Diagnóstico",
          type: "textarea",
          sectionId: "diagnostico",
          position: 4,
        },
        {
          id: "garantia",
          label: "Garantía de mano de obra",
          type: "select",
          options: ["30 días", "90 días", "6 meses"],
          defaultValue: "90 días",
          sectionId: "diagnostico",
          position: 5,
        },
      ],
    },
  },
  {
    key: "construccion",
    name: "Demo · Construcción y albañilería",
    businessName: "Construcciones Demo",
    customerName: "Marta Gómez (ficticia)",
    title: "Refacción de cocina y baño",
    fill: { "Dirección de la obra": "Av. Ejemplo 1234, Formosa" },
    values: {
      direccion_obra: "Av. Ejemplo 1234, Formosa",
      etapa: "Terminaciones",
      superficie: 38,
      anticipo: 450000,
      plazo_dias: 30,
      materiales_incluidos: true,
    },
    config: {
      style: {
        accentColor: "#b45309",
        fontFamily: "serif",
        headerTitle: "Presupuesto de obra",
        headerSubtitle: "Construcción y refacciones · Demo",
        footerText:
          "Los precios de materiales pueden variar si la obra se aprueba pasados los 15 días.",
        showLogo: true,
      },
      sections: [
        { id: "obra", title: "Datos de la obra", position: 0 },
        { id: "condiciones", title: "Condiciones", position: 1 },
      ],
      fields: [
        {
          id: "direccion_obra",
          label: "Dirección de la obra",
          type: "text",
          required: true,
          sectionId: "obra",
          position: 0,
        },
        {
          id: "etapa",
          label: "Etapa",
          type: "select",
          options: ["Demolición", "Estructura", "Terminaciones"],
          sectionId: "obra",
          position: 1,
        },
        {
          id: "superficie",
          label: "Superficie (m²)",
          type: "number",
          min: 0,
          sectionId: "obra",
          position: 2,
        },
        { id: "anticipo", label: "Anticipo", type: "money", sectionId: "condiciones", position: 3 },
        {
          id: "plazo_dias",
          label: "Plazo estimado (días)",
          type: "number",
          defaultValue: 30,
          sectionId: "condiciones",
          position: 4,
        },
        {
          id: "materiales_incluidos",
          label: "Materiales incluidos",
          type: "checkbox",
          sectionId: "condiciones",
          position: 5,
        },
      ],
    },
  },
  {
    key: "servicios-tecnicos",
    name: "Demo · Servicios técnicos",
    businessName: "Servicio Técnico Demo",
    customerName: "Lucía Fernández (ficticia)",
    title: "Reparación de aire acondicionado",
    fill: { Equipo: "Split frío/calor 3000 frigorías" },
    values: {
      equipo: "Split frío/calor 3000 frigorías",
      nro_serie: "SN-DEMO-0001",
      en_garantia: false,
      visita: "2026-11-20",
      sintoma: "No enfría y pierde agua por la unidad interior.",
    },
    config: {
      style: {
        accentColor: "#1d4ed8",
        fontFamily: "sans",
        headerTitle: "Orden de servicio técnico",
        headerSubtitle: "Instalación y reparación · Demo",
        footerText: "Servicio con garantía de 60 días sobre la reparación realizada.",
        showLogo: true,
      },
      sections: [
        { id: "equipo", title: "Equipo", position: 0 },
        { id: "servicio", title: "Servicio", position: 1 },
      ],
      fields: [
        {
          id: "equipo",
          label: "Equipo",
          type: "text",
          required: true,
          sectionId: "equipo",
          position: 0,
        },
        { id: "nro_serie", label: "N.º de serie", type: "text", sectionId: "equipo", position: 1 },
        {
          id: "en_garantia",
          label: "En garantía",
          type: "checkbox",
          sectionId: "equipo",
          position: 2,
        },
        {
          id: "visita",
          label: "Fecha de visita",
          type: "date",
          sectionId: "servicio",
          position: 3,
        },
        {
          id: "sintoma",
          label: "Síntoma reportado",
          type: "textarea",
          sectionId: "servicio",
          position: 4,
        },
      ],
    },
  },
];
