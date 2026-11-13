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
