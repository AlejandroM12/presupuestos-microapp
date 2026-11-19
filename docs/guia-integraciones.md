# Guía de integraciones pendientes

Pasos exactos para completar cada configuración. **Ningún valor secreto se pega en el chat, en Git ni en comandos**: se cargan en el servidor con el script de entrada oculta:

```bash
ssh -i ~/.ssh/atajolab_prod deploy@167.233.65.236
cd /opt/atajolab/apps/presupuestos
./scripts/set-secret.sh --recreate MERCADOPAGO_ACCESS_TOKEN MERCADOPAGO_WEBHOOK_SECRET
```

El script pide cada valor sin mostrarlo, reescribe `.env` (permisos 600), acepta solo variables de una lista permitida y recrea únicamente `presupuestos-app`. No toca Agendia.

Estado y evidencia de cada punto: `docs/PRODUCTION_CHECKLIST.md`. Los cobros reales **siguen deshabilitados** hasta completar todo esto y que lo autorices.

---

## 1. Mercado Pago (sandbox)

Tiempo: ~30 min. Necesitás una cuenta de Mercado Pago de Argentina.

1. Entrá a <https://www.mercadopago.com.ar/developers> → **Tus integraciones** → **Crear aplicación**. Nombre: "AtajoLab Presupuestos" (aplicación **independiente** de Agendia). Producto: Checkout Pro y Suscripciones.
2. En la aplicación → **Credenciales de prueba**: copiá el **Access Token de prueba** (`TEST-…`). No uses las credenciales de producción todavía.
3. **Cuentas de prueba** (en el panel de desarrolladores): creá una cuenta *vendedor* y una *comprador* de prueba. Las tarjetas de prueba y los usuarios de prueba están en la documentación oficial de Mercado Pago ("Cuentas de prueba" / "Tarjetas de prueba").
4. **Webhooks** → Configurar notificaciones:
   - URL (modo de prueba): `https://presupuestos.atajolab.dev/api/webhooks/mercadopago`
   - Eventos: **Pagos**, **Planes y suscripciones** (`subscription_preapproval`) y **Pagos de suscripciones** (`subscription_authorized_payment`).
   - Al guardar, Mercado Pago muestra la **Clave secreta** del webhook: copiala.
5. En el VPS: `./scripts/set-secret.sh --recreate MERCADOPAGO_ACCESS_TOKEN MERCADOPAGO_WEBHOOK_SECRET`.
6. Verificá (los pagos se habilitan solo con el token presente):
   - Ingresá con una cuenta común de la app, andá a *Plantillas* → "Comprar Pack" y pagá con la cuenta **comprador de prueba**. Esperado: tras el pago aparece el Pack activo y llega el aviso (si Resend ya está configurado).
   - Revisá `docker logs presupuestos-app | grep webhook` (solo códigos de evento, sin datos sensibles).
   - Repetí con *Mi plan* → Pro mensual. Confirmá alta, primer cobro aprobado y cancelación.
7. **Punto crítico a confirmar**: en el cobro recurrente, qué campo trae la referencia que vincula el cobro a la suscripción (`external_reference` o `preapproval_id`). El código ya procesa `subscription_authorized_payment`; si en sandbox la renovación no se vincula, hay que ajustar `src/services/subscriptions.ts`. Anotá el resultado en `docs/mercadopago.md`.
8. Cuando todo funcione, y solo con tu autorización expresa, se cambia a credenciales de producción (otro token y otro secreto) y se prueba con un pago real de bajo importe.

**Qué dejo hecho yo**: la integración, el validador de firma, la idempotencia y la conciliación horaria (`/api/cron/billing`). **Qué falta de tu parte**: pasos 1 a 6 (credenciales, cuentas de prueba y pagos de prueba).

## 2. Resend (correos)

Tiempo: ~20 min + propagación DNS.

1. Cuenta en <https://resend.com> (si Agendia ya usa una, podés reutilizarla; creá una **API key distinta** para Presupuestos con permiso "Sending access" restringida al dominio).
2. **Domains** → Add Domain → `atajolab.dev` (si ya está verificado por Agendia, no hace falta repetirlo).
3. En **Cloudflare → DNS** agregá los registros que Resend muestra (SPF `TXT`, DKIM `TXT` `resend._domainkey`, y el `MX`/`TXT` de la ruta de retorno si los pide). Todos en **"Solo DNS"** (nube gris), nunca proxied. Sumá también `_dmarc` `TXT` `v=DMARC1; p=none; rua=mailto:<tu email>` si no existe.
4. Esperá a que Resend marque el dominio como **Verified**.
5. En el VPS: `./scripts/set-secret.sh --recreate RESEND_API_KEY EMAIL_FROM` con `EMAIL_FROM` = `AtajoLab Presupuestos <presupuestos@atajolab.dev>`.
6. Prueba controlada: registrá una cuenta con **tu propio email** y usá "Olvidé mi contraseña". Debe llegar el correo con enlace válido 1 hora. No enviar a terceros.
7. Verificá SPF/DKIM/DMARC en el encabezado del mensaje recibido (Gmail → "Mostrar original").

## 3. Backup externo

Recomendado: **Cloudflare R2** (ya usás Cloudflare; el plan gratuito alcanza: 10 GB). Alternativas sin costo: Google Drive vía rclone. No se contrata nada nuevo de pago.

1. Cloudflare → **R2** → crear bucket `atajolab-backups` (R2 pide un medio de pago registrado aunque no se cobre dentro del plan gratuito).
2. R2 → **Manage API tokens** → token con permiso *Object Read & Write* limitado a ese bucket. Guardá Access Key ID, Secret y el endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
3. En el VPS, creá `/opt/atajolab/apps/presupuestos/rclone.conf` (permisos 600) con:
   ```
   [r2]
   type = s3
   provider = Cloudflare
   access_key_id = …
   secret_access_key = …
   endpoint = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   ```
   (editalo con `nano` en el servidor; no lo pegues en ningún chat ni repositorio).
4. `./scripts/set-secret.sh OFFSITE_RCLONE_REMOTE RCLONE_CONFIG_FILE` con `r2:atajolab-backups/presupuestos` y `/opt/atajolab/apps/presupuestos/rclone.conf`. Opcional: `OFFSITE_RETENTION_DAYS` (por defecto 60) en `.env`.
5. Ejecutá `./scripts/backup.sh`: debe terminar con "Copia externa subida". Verificá en el panel de R2 que el `.dump` existe.
6. **Prueba de restauración** (en una base aislada, nunca sobre producción): `docs/backups.md`.

## 4. Alertas

1. Elegí un canal: **ntfy** (gratis, sin cuenta) o un webhook de Discord/Slack.
2. ntfy: instalá la app (iOS/Android), suscribite a un tema difícil de adivinar, por ejemplo `atajolab-presupuestos-<12 caracteres aleatorios>`. El nombre del tema funciona como contraseña.
3. `./scripts/set-secret.sh ALERT_WEBHOOK_URL` con `https://ntfy.sh/<tema>`. Para Discord/Slack: además `ALERT_WEBHOOK_FORMAT=json`.
4. Probá: `curl -d "prueba" https://ntfy.sh/<tema>` desde tu máquina; luego provocá una alerta real parando temporalmente el chequeo (por ejemplo, ejecutar `./scripts/monitor.sh` con `HEALTH_URL` apuntando a una URL inexistente).

## 5. Monitoreo externo

El script del VPS no detecta una caída total del servidor. Agregá un chequeo externo gratuito:

1. <https://uptimerobot.com> (plan gratuito, intervalo de 5 min) → Add Monitor → **HTTP(s)**: `https://presupuestos.atajolab.dev/api/health`, con palabra clave `"status":"ok"`.
2. Contacto de alerta: tu email (y opcionalmente el mismo webhook de ntfy).
3. Opcional: lo mismo para `https://presupuestos.atajolab.dev/` (landing).

## 6. Información legal

Los textos `/legal/*` (`src/content/legal.ts`) son **borradores** con campos `[COMPLETAR]`. Necesito de tu parte:

| Dato | Dónde se usa |
| --- | --- |
| Razón social o nombre del titular, CUIT y domicilio legal | Términos, privacidad |
| Email de contacto y soporte | Todos |
| Situación frente al IVA (precios con/sin impuestos) | Términos |
| Jurisdicción aplicable | Términos |
| Política de reembolsos (períodos de Pro ya iniciados) | Suscripción |
| Plazo de aviso ante cambios de precio | Suscripción |
| Alcance de "permanente" del Pack | Pack Premium |
| Plazos de retención: registros financieros, backups y logs | Retención |
| Inscripción de la base de datos ante la AAIP (si corresponde) | Privacidad |

Pasos: revisá los borradores con tu contador/abogado, completá los campos en `src/content/legal.ts` (o pasame los datos y lo hago), y recién entonces se quita `noindex` y se agregan al sitemap. Sin esto **no se debe abrir la venta**.

## Orden recomendado

1. Resend (necesario para recuperar contraseñas y avisos de compra).
2. Alertas + monitoreo externo (10 minutos).
3. Backup externo.
4. Mercado Pago sandbox.
5. Datos legales.
6. Autorizar cobros reales.
