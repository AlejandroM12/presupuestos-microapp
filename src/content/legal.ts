import { LIMITS, PRICING } from "@/lib/config/plans";
import { formatArs } from "@/lib/format";

/**
 * Borradores de textos legales. NO son asesoramiento legal: deben ser revisados y completados
 * por el titular y su asesor antes de publicarse como definitivos. Los campos [COMPLETAR: …]
 * requieren datos que no se pueden inventar (titular, CUIT, domicilio, etc.).
 */
export interface LegalSection {
  heading: string;
  body: string[];
}
export interface LegalPage {
  slug: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}

const HOLDER = "[COMPLETAR: razón social o nombre del titular, CUIT y domicilio legal]";
const CONTACT = "[COMPLETAR: email de contacto y soporte]";

export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: "terminos",
    title: "Términos y condiciones",
    summary: "Reglas generales de uso de AtajoLab Presupuestos.",
    sections: [
      {
        heading: "1. Quién presta el servicio",
        body: [
          `AtajoLab Presupuestos es un servicio digital provisto por ${HOLDER}. Contacto: ${CONTACT}.`,
          "Al crear una cuenta o usar el servicio aceptás estos términos.",
        ],
      },
      {
        heading: "2. Qué es (y qué no es)",
        body: [
          "Es una herramienta para crear presupuestos comerciales y exportarlos en PDF.",
          "Los documentos generados son presupuestos: no son facturas ni comprobantes fiscales y no tienen validez ante ARCA. La responsabilidad sobre el contenido, los importes y los impuestos informados es de quien los emite.",
        ],
      },
      {
        heading: "3. Cuenta",
        body: [
          "Sos responsable de la confidencialidad de tu contraseña y de la actividad de tu cuenta. Debés proporcionar información veraz.",
          "Podemos suspender cuentas que incumplan estos términos o hagan un uso abusivo del servicio.",
        ],
      },
      {
        heading: "4. Planes y precios",
        body: [
          `Gratis: ${LIMITS.freeMonthlyDownloads} descargas de PDF por mes, un diseño y marca de AtajoLab.`,
          `Pack Premium: pago único de ${formatArs(PRICING.premiumPack)} (ver condiciones del pack).`,
          `Pro: ${formatArs(PRICING.proMonthly)} por mes o ${formatArs(PRICING.proYearly)} por año (ver condiciones de suscripción). Precios en pesos argentinos [COMPLETAR: indicar si incluyen IVA u otros impuestos según la situación fiscal del titular].`,
          "Los pagos se procesan a través de Mercado Pago; no almacenamos datos de tarjetas.",
        ],
      },
      {
        heading: "5. Contenido del usuario",
        body: [
          "Los datos, logos y textos que cargues son tuyos. Nos otorgás únicamente el permiso necesario para procesarlos y generar tus documentos.",
          "No debés cargar contenido ilegal o que infrinja derechos de terceros.",
        ],
      },
      {
        heading: "6. Disponibilidad y responsabilidad",
        body: [
          "Hacemos esfuerzos razonables para mantener el servicio disponible, sin garantizar disponibilidad ininterrumpida.",
          "[COMPLETAR: limitación de responsabilidad, a definir con asesoramiento legal, respetando la normativa de defensa del consumidor aplicable.]",
        ],
      },
      {
        heading: "7. Derecho de arrepentimiento",
        body: [
          `Si sos consumidor, podés ejercer el derecho de revocación dentro de los 10 días corridos de la contratación, conforme a la normativa argentina de defensa del consumidor [COMPLETAR: confirmar alcance con asesor legal para servicios digitales]. Se gestiona escribiendo a ${CONTACT}.`,
        ],
      },
      {
        heading: "8. Ley aplicable",
        body: [
          "Estos términos se rigen por las leyes de la República Argentina. [COMPLETAR: jurisdicción].",
        ],
      },
    ],
  },
  {
    slug: "privacidad",
    title: "Política de privacidad",
    summary: "Qué datos tratamos y para qué.",
    sections: [
      {
        heading: "1. Responsable",
        body: [`El responsable del tratamiento es ${HOLDER}. Contacto: ${CONTACT}.`],
      },
      {
        heading: "2. Datos que tratamos",
        body: [
          "Cuenta: email, nombre y contraseña (almacenada con hash, nunca en texto plano).",
          "Contenido: datos de tu negocio, clientes y presupuestos que guardes en tu cuenta (solo en el plan Pro; sin Pro el borrador permanece en tu navegador).",
          "Pagos: referencias, estados e importes de Mercado Pago. No recibimos ni guardamos datos de tarjetas.",
          "Uso: cantidad de descargas mensuales y registros técnicos de seguridad.",
        ],
      },
      {
        heading: "3. Finalidades",
        body: [
          "Prestar el servicio, aplicar los límites de cada plan, procesar pagos, enviar correos transaccionales (recuperación de contraseña, confirmaciones de compra y suscripción), prevenir abuso y cumplir obligaciones legales.",
          "No vendemos tus datos ni los usamos para publicidad de terceros.",
        ],
      },
      {
        heading: "4. Proveedores",
        body: [
          "Mercado Pago (pagos), Resend (correo transaccional), Hetzner (alojamiento) y Cloudflare (DNS). [COMPLETAR: verificar ubicación de servidores y transferencias internacionales de datos].",
        ],
      },
      {
        heading: "5. Tus derechos",
        body: [
          "Podés acceder, rectificar y suprimir tus datos (Ley 25.326). Desde Configuración podés exportar tus datos y eliminar tu cuenta. La Agencia de Acceso a la Información Pública es el órgano de control.",
          "[COMPLETAR: inscripción de la base de datos, si corresponde.]",
        ],
      },
      {
        heading: "6. Conservación",
        body: ["Ver la política de retención de datos."],
      },
      {
        heading: "7. Cookies",
        body: [
          "Usamos una cookie de sesión necesaria para mantenerte conectado. No usamos cookies publicitarias.",
        ],
      },
    ],
  },
  {
    slug: "suscripcion",
    title: "Condiciones de suscripción y cancelación (Pro)",
    summary: "Cómo funciona la suscripción Pro, la renovación y la cancelación.",
    sections: [
      {
        heading: "1. Planes",
        body: [
          `Pro mensual: ${formatArs(PRICING.proMonthly)} cada mes. Pro anual: ${formatArs(PRICING.proYearly)} cada año.`,
          "La suscripción se renueva automáticamente al final de cada período mediante Mercado Pago hasta que la canceles.",
        ],
      },
      {
        heading: "2. Activación",
        body: [
          "Pro se activa cuando Mercado Pago confirma el primer cobro aprobado, no al volver desde la página de pago.",
        ],
      },
      {
        heading: "3. Cancelación",
        body: [
          "Podés cancelar cuando quieras desde Dashboard > Mi plan. La cancelación detiene las próximas renovaciones; conservás Pro hasta el final del período ya pagado.",
          "Al finalizar: tu cuenta, tus compras únicas (Pack Premium) y tus presupuestos guardados se conservan; los presupuestos quedan en modo lectura y se pierden las funciones Pro (historial en la nube, clientes, dashboard, descargas ampliadas).",
        ],
      },
      {
        heading: "4. Cobro rechazado",
        body: [
          "Si una renovación es rechazada, te avisamos por correo y mantenés el acceso hasta el fin del período ya pagado. Si no se regulariza, la suscripción vence.",
        ],
      },
      {
        heading: "5. Reembolsos",
        body: [
          "[COMPLETAR: política de reembolsos para períodos ya iniciados, a definir con el titular y su asesor.] El derecho de arrepentimiento se detalla en los términos y condiciones.",
        ],
      },
      {
        heading: "6. Cambios de precio",
        body: [
          "Te avisaremos con anticipación razonable [COMPLETAR: plazo] antes de cualquier cambio de precio; podrás cancelar antes de que se aplique.",
        ],
      },
    ],
  },
  {
    slug: "pack-premium",
    title: "Condiciones del Pack Premium",
    summary: "Qué incluye el pago único y cómo funciona.",
    sections: [
      {
        heading: "1. Qué incluye",
        body: [
          `Pago único de ${formatArs(PRICING.premiumPack)}: cinco diseños premium, personalización de colores y PDFs sin marca de AtajoLab.`,
          `No incluye descargas ilimitadas: se mantiene el límite de ${LIMITS.freeMonthlyDownloads} descargas mensuales. Tampoco incluye historial en la nube ni dashboard (Pro).`,
        ],
      },
      {
        heading: "2. Activación",
        body: [
          "Se activa cuando Mercado Pago confirma el pago aprobado. Queda asociado de forma permanente a tu cuenta mientras la cuenta exista.",
        ],
      },
      {
        heading: "3. Reembolsos y contracargos",
        body: [
          "Si el pago es reembolsado o revertido, los diseños premium se desactivan. Ver también el derecho de arrepentimiento en los términos.",
        ],
      },
      {
        heading: "4. Alcance",
        body: [
          "[COMPLETAR: alcance temporal de «permanente» (vida útil del servicio), a definir por el titular.]",
        ],
      },
    ],
  },
  {
    slug: "uso-razonable",
    title: "Política de uso razonable",
    summary: "Qué significa «ilimitado» en el plan Pro.",
    sections: [
      {
        heading: "1. Principio",
        body: [
          "Pro permite descargar PDF sin un número mensual anunciado, pensado para el uso normal de un profesional o negocio. Esta política evita el abuso y la automatización masiva.",
        ],
      },
      {
        heading: "2. Mecanismos",
        body: [
          `Revisión: si superás ${LIMITS.proReviewThresholdMonthly} descargas en un mes lo registramos para revisar el caso; no se bloquea nada por esto.`,
          `Límite por hora: hasta ${LIMITS.proBurstPerHour} PDF finales por hora. Si lo superás, esperá unos minutos.`,
          `Tope técnico: ${LIMITS.proHardCeilingMonthly} descargas por mes. Si necesitás más volumen, escribinos y lo resolvemos.`,
        ],
      },
      {
        heading: "3. Usos no permitidos",
        body: [
          "Reventa del servicio, uso mediante scripts o bots, compartir una cuenta entre múltiples negocios no relacionados o cualquier uso que degrade el servicio para terceros.",
        ],
      },
    ],
  },
  {
    slug: "retencion",
    title: "Política de retención de datos",
    summary: "Cuánto tiempo conservamos cada tipo de dato.",
    sections: [
      {
        heading: "1. Datos personales",
        body: [
          "Al eliminar tu cuenta borramos tu perfil, clientes, presupuestos guardados, sesiones, tokens y registros de uso. Los borradores locales están solo en tu navegador.",
          "Los backups pueden conservar copias hasta [COMPLETAR: días de retención de backups] antes de eliminarse por rotación.",
        ],
      },
      {
        heading: "2. Registros financieros",
        body: [
          "Los registros de pagos y suscripciones (importes, fechas, estados y referencias de Mercado Pago) se conservan anonimizados, sin vínculo con tu cuenta, para conciliación y obligaciones contables.",
          "[COMPLETAR: plazo de conservación, a confirmar con el contador; como referencia, la normativa comercial argentina suele exigir conservar documentación contable por 10 años.]",
        ],
      },
      {
        heading: "3. Registros técnicos",
        body: [
          "Los logs de seguridad y operación se conservan por períodos acotados [COMPLETAR: días] y no incluyen el contenido de tus presupuestos.",
        ],
      },
    ],
  },
];

export function getLegalPage(slug: string): LegalPage | undefined {
  return LEGAL_PAGES.find((p) => p.slug === slug);
}
