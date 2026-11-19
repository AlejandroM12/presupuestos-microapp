/**
 * Datos de DEMOSTRACIÓN (ficticios) para mostrar el producto y validar el flujo comercial.
 * Negocios, personas y teléfonos son inventados; no corresponden a ninguna marca real.
 * No son productos del catálogo ni se publican.
 */
export interface DemoItem {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discountPercent?: string;
}

export interface DemoTemplateData {
  key: "taller-mecanico" | "construccion" | "servicios-tecnicos";
  /** Nombre de la plantilla privada en administración. */
  name: string;
  logo: "engranaje" | "casa" | "copo";
  config: Record<string, unknown>;
  issuer: {
    businessName: string;
    professionalName: string;
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    taxId: string;
    website: string;
  };
  customer: { name: string; company: string; email: string; phone: string; address: string };
  title: string;
  description: string;
  items: DemoItem[];
  taxes: { id: string; label: string; type: "percent"; value: string }[];
  notes: string;
  terms: string;
  deliveryTime: string;
  /** Si hay {anticipo}, se reemplaza por el importe calculado (ver demo-fixtures). */
  paymentTerms: string;
  /** Porcentaje del total que se cobra como anticipo (solo construcción). */
  advancePercent?: number;
  values: Record<string, string | number | boolean>;
  /** Etiqueta → valor para completar a mano los campos obligatorios en el editor. */
  fill: Record<string, string>;
}

export const DEMO_TEMPLATES: DemoTemplateData[] = [
  {
    key: "taller-mecanico",
    name: "Demo · Taller mecánico",
    logo: "engranaje",
    config: {
      style: {
        accentColor: "#0e7490",
        fontFamily: "sans",
        headerTitle: "Orden de trabajo",
        headerSubtitle: "Mecánica ligera y frenos",
        footerText:
          "Garantía de 90 días o 3.000 km sobre la mano de obra. Los repuestos tienen la garantía del fabricante.",
        showLogo: true,
        headerVariant: "boxed",
        tableStyle: "grid",
        totalsStyle: "box",
        sectionColumns: 2,
        showTerms: true,
        approval: true,
        approvalText: "Autorización del cliente para realizar los trabajos detallados",
      },
      sections: [
        { id: "vehiculo", title: "Datos del vehículo", position: 0, columns: 2 },
        { id: "diagnostico", title: "Diagnóstico", position: 1, columns: 1 },
      ],
      fields: [
        {
          id: "patente",
          label: "Patente",
          type: "text",
          required: true,
          highlight: true,
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
          id: "anio",
          label: "Año",
          type: "number",
          min: 1950,
          max: 2100,
          sectionId: "vehiculo",
          position: 2,
        },
        {
          id: "km",
          label: "Kilometraje",
          type: "number",
          required: true,
          min: 0,
          unit: "km",
          highlight: true,
          sectionId: "vehiculo",
          position: 3,
        },
        {
          id: "ingreso",
          label: "Fecha de ingreso",
          type: "date",
          sectionId: "vehiculo",
          position: 4,
        },
        {
          id: "diagnostico",
          label: "Diagnóstico",
          type: "textarea",
          sectionId: "diagnostico",
          position: 5,
        },
        {
          id: "garantia",
          label: "Garantía de mano de obra",
          type: "select",
          options: ["30 días", "90 días", "6 meses"],
          defaultValue: "90 días",
          highlight: true,
          sectionId: "diagnostico",
          position: 6,
        },
      ],
    },
    issuer: {
      businessName: "Taller Rumbo Sur",
      professionalName: "Aldo Benítez, mecánico",
      email: "turnos@rumbosur.example",
      phone: "0370 4 000-101",
      whatsapp: "+54 9 370 400-0101",
      address: "Av. Ejemplo 1500, Formosa",
      taxId: "20-00000000-1",
      website: "",
    },
    customer: {
      name: "Marcelo Quiroga",
      company: "",
      email: "marcelo@correo.example",
      phone: "+54 9 370 400-0202",
      address: "",
    },
    title: "Service de 80.000 km y cambio de frenos delanteros",
    description:
      "Mantenimiento programado con reemplazo de pastillas y discos delanteros. Incluye prueba de ruta.",
    items: [
      {
        description: "Aceite sintético 5W-30 (4 L)",
        quantity: "1",
        unit: "Unidad",
        unitPrice: "58900",
      },
      { description: "Filtro de aceite", quantity: "1", unit: "Unidad", unitPrice: "12400" },
      { description: "Filtro de aire", quantity: "1", unit: "Unidad", unitPrice: "15800" },
      { description: "Filtro de combustible", quantity: "1", unit: "Unidad", unitPrice: "21300" },
      {
        description: "Kit de pastillas de freno delanteras",
        quantity: "1",
        unit: "Juego",
        unitPrice: "64500",
      },
      {
        description: "Disco de freno ventilado delantero",
        quantity: "2",
        unit: "Unidad",
        unitPrice: "48700",
        discountPercent: "5",
      },
      {
        description: "Líquido de frenos DOT 4 (500 ml)",
        quantity: "1",
        unit: "Unidad",
        unitPrice: "9800",
      },
      {
        description: "Diagnóstico con scanner y lectura de fallas",
        quantity: "1",
        unit: "Servicio",
        unitPrice: "18000",
      },
      {
        description: "Mano de obra mecánica (service y frenos)",
        quantity: "3.5",
        unit: "h",
        unitPrice: "28000",
      },
    ],
    taxes: [{ id: "iva", label: "IVA 21%", type: "percent", value: "21" }],
    notes:
      "Los repuestos reemplazados quedan a disposición del cliente. Si durante el trabajo se detectan fallas adicionales, se informará antes de intervenir.",
    terms:
      "Garantía de 90 días o 3.000 km (lo que ocurra primero) sobre la mano de obra. Los repuestos tienen la garantía del fabricante. Precios sujetos a variación de los proveedores pasados los 7 días.",
    deliveryTime: "Entrega en el día si se aprueba antes de las 10:00",
    paymentTerms: "Seña de repuestos al aprobar; saldo al retirar el vehículo",
    values: {
      patente: "AB123CD",
      marca_modelo: "Fiat Cronos 1.3 Drive",
      anio: 2021,
      km: 80450,
      ingreso: "2026-11-18",
      diagnostico:
        "Pastillas de freno delanteras al límite de desgaste y discos con surcos; pérdida leve de aceite en tapa de válvulas (a controlar en el próximo service). Resto del tren delantero sin juego.",
      garantia: "90 días",
    },
    fill: { Patente: "AB123CD", "Marca y modelo": "Fiat Cronos 1.3 Drive", Kilometraje: "80450" },
  },
  {
    key: "construccion",
    name: "Demo · Construcción y albañilería",
    logo: "casa",
    config: {
      style: {
        accentColor: "#b45309",
        fontFamily: "serif",
        headerTitle: "Presupuesto de obra",
        headerSubtitle: "Refacciones y obra nueva",
        footerText:
          "Los precios de materiales pueden variar si la obra se aprueba pasados los 15 días.",
        showLogo: true,
        headerVariant: "banner",
        tableStyle: "lines",
        totalsStyle: "plain",
        sectionColumns: 2,
        showTerms: true,
        approval: true,
        approvalText: "Conformidad del propietario",
      },
      sections: [
        { id: "obra", title: "Datos de la obra", position: 0, columns: 2 },
        { id: "condiciones", title: "Condiciones de ejecución", position: 1, columns: 2 },
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
          options: ["Demolición", "Estructura", "Instalaciones", "Terminaciones"],
          sectionId: "obra",
          position: 1,
        },
        {
          id: "superficie",
          label: "Superficie",
          type: "number",
          min: 0,
          unit: "m²",
          highlight: true,
          sectionId: "obra",
          position: 2,
        },
        {
          id: "plazo_dias",
          label: "Plazo de ejecución",
          type: "number",
          min: 1,
          unit: "días hábiles",
          defaultValue: 30,
          highlight: true,
          sectionId: "condiciones",
          position: 3,
        },
        {
          id: "anticipo",
          label: "Anticipo",
          type: "money",
          role: "advance",
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
        {
          id: "observaciones_obra",
          label: "Alcance y observaciones",
          type: "textarea",
          sectionId: "condiciones",
          position: 6,
        },
      ],
    },
    issuer: {
      businessName: "Constructora Horizonte",
      professionalName: "Ing. Rosa Almada, matrícula ficticia 0000",
      email: "obras@horizonte.example",
      phone: "0370 4 000-303",
      whatsapp: "+54 9 370 400-0303",
      address: "Calle Ejemplo 420, Formosa",
      taxId: "30-00000000-2",
      website: "",
    },
    customer: {
      name: "Marta Gómez",
      company: "",
      email: "marta@correo.example",
      phone: "+54 9 370 400-0404",
      address: "San Martín 850, Formosa",
    },
    title: "Refacción integral de cocina y baño",
    description:
      "Demolición de revestimientos, renovación de instalación sanitaria, revoque, colocación de porcelanato y pintura.",
    items: [
      {
        description: "Demolición de revestimientos existentes y retiro de escombros",
        quantity: "38",
        unit: "m²",
        unitPrice: "4200",
      },
      {
        description: "Reparación de muros y revoque fino",
        quantity: "22",
        unit: "m²",
        unitPrice: "6700",
      },
      {
        description: "Cañerías de agua y desagüe (provisión e instalación)",
        quantity: "1",
        unit: "gl",
        unitPrice: "185000",
      },
      {
        description: "Porcelanato 60×60 cm (incluye 8% de desperdicio)",
        quantity: "41",
        unit: "m²",
        unitPrice: "14900",
      },
      {
        description: "Adhesivo cementicio y pastina",
        quantity: "12",
        unit: "bolsa",
        unitPrice: "8300",
      },
      {
        description: "Colocación de porcelanato (mano de obra)",
        quantity: "38",
        unit: "m²",
        unitPrice: "9800",
      },
      {
        description: "Mesada de granito con bacha (provisión y colocación)",
        quantity: "1",
        unit: "u",
        unitPrice: "412000",
      },
      {
        description: "Pintura látex interior, dos manos",
        quantity: "64",
        unit: "m²",
        unitPrice: "3900",
      },
      {
        description: "Jornales de oficial y ayudante",
        quantity: "12",
        unit: "jornal",
        unitPrice: "78000",
      },
    ],
    taxes: [{ id: "iva", label: "IVA 10,5%", type: "percent", value: "10.5" }],
    notes:
      "El precio incluye la limpieza final de obra. No incluye artefactos sanitarios ni grifería, que provee el propietario.",
    terms:
      "Cualquier trabajo adicional se cotiza por separado y requiere aprobación escrita. El plazo se cuenta desde el acopio de materiales y puede extenderse por lluvias prolongadas.",
    deliveryTime: "Inicio dentro de los 10 días hábiles de la aprobación",
    paymentTerms:
      "40% de anticipo al aprobar ({anticipo}), 40% a mitad de obra y 20% contra entrega",
    advancePercent: 40,
    values: {
      direccion_obra: "San Martín 850, Formosa",
      etapa: "Instalaciones",
      superficie: 38,
      plazo_dias: 45,
      materiales_incluidos: true,
      observaciones_obra:
        "Se trabaja con la vivienda habitada: el acceso a cocina y baño se coordina por etapas para mantener un sector funcional.",
    },
    fill: { "Dirección de la obra": "San Martín 850, Formosa" },
  },
  {
    key: "servicios-tecnicos",
    name: "Demo · Servicios técnicos",
    logo: "copo",
    config: {
      style: {
        accentColor: "#1d4ed8",
        fontFamily: "sans",
        headerTitle: "Orden de servicio técnico",
        headerSubtitle: "Instalación, mantenimiento y reparación",
        footerText: "Servicio con garantía de 60 días sobre la reparación realizada.",
        showLogo: true,
        headerVariant: "classic",
        tableStyle: "zebra",
        totalsStyle: "bar",
        sectionColumns: 2,
        showTerms: true,
        approval: false,
      },
      sections: [
        { id: "equipo", title: "Equipo", position: 0, columns: 2 },
        { id: "servicio", title: "Servicio", position: 1, columns: 1 },
      ],
      fields: [
        {
          id: "equipo",
          label: "Equipo",
          type: "text",
          required: true,
          highlight: true,
          sectionId: "equipo",
          position: 0,
        },
        {
          id: "marca_modelo",
          label: "Marca y modelo",
          type: "text",
          sectionId: "equipo",
          position: 1,
        },
        { id: "nro_serie", label: "N.º de serie", type: "text", sectionId: "equipo", position: 2 },
        {
          id: "en_garantia",
          label: "En garantía de fábrica",
          type: "checkbox",
          sectionId: "equipo",
          position: 3,
        },
        {
          id: "visita",
          label: "Fecha de visita",
          type: "date",
          highlight: true,
          sectionId: "servicio",
          position: 4,
        },
        {
          id: "sintoma",
          label: "Síntoma reportado",
          type: "textarea",
          sectionId: "servicio",
          position: 5,
        },
        {
          id: "diagnostico",
          label: "Diagnóstico",
          type: "textarea",
          sectionId: "servicio",
          position: 6,
        },
        {
          id: "trabajo",
          label: "Trabajo propuesto",
          type: "textarea",
          sectionId: "servicio",
          position: 7,
        },
        {
          id: "garantia",
          label: "Garantía de la reparación",
          type: "select",
          options: ["30 días", "60 días", "90 días"],
          defaultValue: "60 días",
          highlight: true,
          sectionId: "servicio",
          position: 8,
        },
      ],
    },
    issuer: {
      businessName: "Clima Hogar Servicio Técnico",
      professionalName: "Lucas Ferreyra, técnico refrigerista",
      email: "servicio@climahogar.example",
      phone: "0370 4 000-505",
      whatsapp: "+54 9 370 400-0505",
      address: "Belgrano 233, Formosa",
      taxId: "20-00000000-3",
      website: "",
    },
    customer: {
      name: "Lucía Fernández",
      company: "",
      email: "lucia@correo.example",
      phone: "+54 9 370 400-0606",
      address: "Mitre 97, Formosa",
    },
    title: "Reparación y puesta a punto de aire acondicionado split",
    description: "Equipo que no enfría y pierde agua por la unidad interior.",
    items: [
      {
        description: "Diagnóstico y visita técnica",
        quantity: "1",
        unit: "Servicio",
        unitPrice: "14500",
      },
      {
        description: "Carga de gas refrigerante R410A",
        quantity: "0.8",
        unit: "kg",
        unitPrice: "38000",
      },
      {
        description: "Capacitor de arranque (provisión y reemplazo)",
        quantity: "1",
        unit: "Unidad",
        unitPrice: "21800",
      },
      {
        description: "Limpieza profunda de unidad interior y exterior",
        quantity: "1",
        unit: "Servicio",
        unitPrice: "32000",
      },
      {
        description: "Cañería de cobre adicional con aislación",
        quantity: "3",
        unit: "m",
        unitPrice: "9500",
      },
      { description: "Mano de obra técnica", quantity: "2.5", unit: "h", unitPrice: "16000" },
    ],
    taxes: [],
    notes:
      "Si el diagnóstico revela una falla distinta de la indicada, se avisa antes de continuar. Los repuestos reemplazados se entregan al cliente.",
    terms:
      "Garantía de 60 días sobre la reparación realizada. No cubre fallas por suministro eléctrico inadecuado ni intervención de terceros.",
    deliveryTime: "Visita dentro de las 48 h de la aprobación",
    paymentTerms: "Pago al finalizar el servicio (efectivo o transferencia)",
    values: {
      equipo: "Split frío/calor 3000 frigorías",
      marca_modelo: "Marca de ejemplo · modelo S-3000",
      nro_serie: "SN-DEMO-000417",
      en_garantia: false,
      visita: "2026-11-20",
      sintoma: "No enfría y pierde agua por la unidad interior desde hace una semana.",
      diagnostico:
        "Carga de gas por debajo de lo especificado, capacitor de arranque con pérdida y desagüe de condensado obstruido.",
      trabajo:
        "Limpieza completa, desobstrucción del desagüe, reemplazo del capacitor y recarga de gas con prueba de presión.",
      garantia: "60 días",
    },
    fill: { Equipo: "Split frío/calor 3000 frigorías" },
  },
];
