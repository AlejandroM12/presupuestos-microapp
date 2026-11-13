# Resend (correos)

> **Estado**: implementado y probado con el SDK simulado. Sin `RESEND_API_KEY` y `EMAIL_FROM` no se envía nada (en desarrollo se imprime el contenido en consola; en producción solo se registra `email_not_configured`).

## Configuración

1. Crear cuenta en [Resend](https://resend.com) y verificar el dominio `atajolab.dev` (registros SPF/DKIM en Cloudflare).
2. Variables: `RESEND_API_KEY` y `EMAIL_FROM` (por ejemplo `AtajoLab Presupuestos <presupuestos@atajolab.dev>`).

## Correos implementados

| Evento | Plantilla |
| --- | --- |
| Recuperación de contraseña (enlace de 1 hora, un solo uso) | `passwordResetEmail` |
| Cambio de contraseña | `passwordChangedEmail` |
| Compra del Pack Premium | `packPurchasedEmail` |
| Activación de Pro | `proActivatedEmail` |
| Cancelación de Pro | `proCancelledEmail` |
| Cobro de renovación rechazado | `paymentFailedEmail` |

Las plantillas HTML son responsive (tablas y estilos en línea) y tienen versión de texto. Están en `src/integrations/email/templates.ts`. Los tests nunca envían correos reales: usan `setMailer()` o el SDK simulado.

No se implementó verificación de email al registrarse.
