import { siteConfig } from "@/lib/config/site";
import type { EmailMessage } from "./mailer";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface LayoutInput {
  preheader: string;
  title: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footnote?: string;
}

/** Plantilla HTML responsive basada en tablas y estilos en línea (compatible con clientes de correo). */
function layout({ preheader, title, paragraphs, cta, footnote }: LayoutInput): string {
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151">${escapeHtml(p)}</p>`,
    )
    .join("");
  const button = cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0"><tr><td style="background:#14213d;border-radius:8px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(cta.label)}</a></td></tr></table><p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#6b7280">Si el botón no funciona, copiá este enlace en tu navegador:<br><span style="word-break:break-all">${escapeHtml(cta.url)}</span></p>`
    : "";
  return `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb"><tr><td style="padding:28px 28px 8px"><p style="margin:0;font-size:14px;font-weight:700;color:#14213d">Atajo<span style="color:#e8590c">Lab</span> Presupuestos</p></td></tr><tr><td style="padding:8px 28px 28px"><h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;color:#14213d">${escapeHtml(title)}</h1>${body}${button}${footnote ? `<p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280">${escapeHtml(footnote)}</p>` : ""}</td></tr></table><p style="margin:16px 0 0;font-size:12px;color:#9ca3af">${escapeHtml(siteConfig.name)} · ${escapeHtml(siteConfig.url.replace(/^https?:\/\//, ""))}</p></td></tr></table></body></html>`;
}

function toText({ title, paragraphs, cta, footnote }: LayoutInput): string {
  return [
    title,
    "",
    ...paragraphs,
    ...(cta ? ["", `${cta.label}: ${cta.url}`] : []),
    ...(footnote ? ["", footnote] : []),
  ].join("\n");
}

export function passwordResetEmail(to: string, url: string): EmailMessage {
  const content: LayoutInput = {
    preheader: "Creá una nueva contraseña para tu cuenta.",
    title: "Recuperá tu contraseña",
    paragraphs: [
      "Recibimos un pedido para restablecer la contraseña de tu cuenta de AtajoLab Presupuestos.",
      "El enlace vence en 1 hora y solo puede usarse una vez.",
    ],
    cta: { label: "Crear nueva contraseña", url },
    footnote:
      "Si no pediste este cambio, ignorá este mensaje: tu contraseña actual sigue siendo válida.",
  };
  return { to, subject: "Recuperá tu contraseña", html: layout(content), text: toText(content) };
}

export function packPurchasedEmail(to: string): EmailMessage {
  const content: LayoutInput = {
    preheader: "Tu Pack Premium ya está activo.",
    title: "¡Listo! Tu Pack Premium está activo",
    paragraphs: [
      "Recibimos tu pago y activamos los 5 diseños premium en tu cuenta: Ejecutivo, Moderno, Creativo, Técnico y Comercial.",
      "Además, tus PDF ya no llevan la marca de AtajoLab y podés personalizar los colores. El acceso es permanente.",
    ],
    cta: { label: "Crear un presupuesto", url: `${siteConfig.url}/crear` },
    footnote: "Guardá este correo como comprobante de tu compra.",
  };
  return {
    to,
    subject: "Tu Pack Premium está activo",
    html: layout(content),
    text: toText(content),
  };
}

const dateAr = (d: Date) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);

export function proActivatedEmail(
  to: string,
  plan: "MONTHLY" | "YEARLY",
  until: Date,
): EmailMessage {
  const content: LayoutInput = {
    preheader: "Tu plan Pro ya está activo.",
    title: "¡Bienvenido a Pro!",
    paragraphs: [
      `Activamos tu plan Pro ${plan === "YEARLY" ? "anual" : "mensual"}. Ya tenés descargas ilimitadas, todos los diseños, historial en la nube, clientes y dashboard.`,
      `Tu acceso está vigente hasta el ${dateAr(until)} y se renueva automáticamente mientras no canceles.`,
    ],
    cta: { label: "Ir a mi cuenta", url: `${siteConfig.url}/dashboard` },
    footnote:
      "Podés cancelar cuando quieras desde Mi plan. Conservás el acceso hasta el fin del período pagado.",
  };
  return { to, subject: "Tu plan Pro está activo", html: layout(content), text: toText(content) };
}

export function proCancelledEmail(to: string, until: Date): EmailMessage {
  const content: LayoutInput = {
    preheader: "Cancelaste tu plan Pro.",
    title: "Cancelaste tu plan Pro",
    paragraphs: [
      `No vamos a renovar tu suscripción. Conservás el acceso a Pro hasta el ${dateAr(until)}.`,
      "Después de esa fecha tu cuenta sigue activa: tus presupuestos quedan disponibles en modo lectura y conservás las compras únicas, como el Pack Premium.",
    ],
    cta: { label: "Ver mi plan", url: `${siteConfig.url}/dashboard/plan` },
  };
  return { to, subject: "Cancelaste tu plan Pro", html: layout(content), text: toText(content) };
}

export function paymentFailedEmail(to: string, until: Date | null): EmailMessage {
  const content: LayoutInput = {
    preheader: "No pudimos cobrar la renovación de tu plan Pro.",
    title: "No pudimos cobrar tu renovación",
    paragraphs: [
      "Mercado Pago rechazó el cobro de tu plan Pro. Mercado Pago volverá a intentarlo; también podés actualizar tu medio de pago desde tu cuenta de Mercado Pago.",
      until
        ? `Mientras tanto conservás el acceso hasta el ${dateAr(until)}.`
        : "Si el cobro no se concreta, el plan no se activará.",
    ],
    cta: { label: "Ver mi plan", url: `${siteConfig.url}/dashboard/plan` },
  };
  return {
    to,
    subject: "No pudimos cobrar tu plan Pro",
    html: layout(content),
    text: toText(content),
  };
}
