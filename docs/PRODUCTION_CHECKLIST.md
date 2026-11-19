# Checklist de producción

Estado real de cada punto, con evidencia. Estados: **Implementado**, **Probado localmente**, **Probado en sandbox**, **Desplegado**, **Verificado en producción**, **Bloqueado por credenciales**, **Pendiente de aprobación**.

Última actualización: 2026-11-19 (plantillas privadas y administración; modalidad de validación controlada).

## Aplicación

| Ítem | Estado | Evidencia / nota |
| --- | --- | --- |
| Editor, motor de cálculo, 6 diseños PDF | **Verificado en producción** (smoke) + Probado localmente | Smoke desktop/mobile en `presupuestos.atajolab.dev`; Vitest de estrés 50 conceptos |
| Autenticación (registro, login, reset) | **Verificado en producción** (registro/sesión/borrado) · reset email pendiente | Smoke creó y eliminó cuentas `@smoke.example`. Correo de reset **no** probado con Resend |
| Persistencia, clientes, dashboard | Probado localmente · smoke dashboard en prod | E2E + smoke `/dashboard` |
| Plan gratuito (3 descargas/mes, marca) | Probado localmente | Reserva atómica; smoke descargó 1 PDF final autenticado |
| Política Pro "uso razonable" | Probado localmente | Ver `docs/plans.md` |
| Retención al eliminar cuenta | Probado localmente | Ver `docs/retention.md` |
| Páginas legales | Implementado (borrador) | `/legal/*` con `[COMPLETAR]`. **Bloquea lanzamiento comercial** |
| Encabezados de seguridad / CSP | **Verificado en producción** | CSP, HSTS, nosniff, COOP en respuestas HTTPS |
| Pack Premium: 20 descargas/mes | Probado localmente | `LIMITS.premiumPackMonthlyDownloads`; tests de entitlements; textos y legales alineados |
| Plantillas personalizadas: sección comercial + WhatsApp | Probado localmente | Landing + FAQ; enlace `wa.me` solo si `ATAJOLAB_WHATSAPP_E164` está definido (si no, correo) |
| Plantillas privadas (modelo, versionado, asignaciones, campos, PDF) | Probado localmente | Vitest con PostgreSQL (`custom-templates.test.ts`), PDF con campos y multipágina; revisión visual |
| Administración (`/admin`, roles, auditoría, vista previa PDF) | Probado localmente | E2E `private-templates.spec.ts` (desktop y mobile): 404 a no admin, rol revocado surte efecto al instante, aislamiento entre cuentas |
| Rate limiting | Implementado | Una réplica. Ver `docs/security-audit.md` |
| Auditoría de seguridad (código) | Completada localmente | `docs/security-audit.md` |

## Integraciones

| Ítem | Estado | Qué falta |
| --- | --- | --- |
| Mercado Pago: pago único | Probado localmente · **Bloqueado por credenciales** | App MP independiente + token de prueba + webhook |
| Mercado Pago: suscripciones | Probado localmente · **Bloqueado por credenciales** | Incluye `subscription_authorized_payment` |
| Webhook firmado + idempotencia | Probado localmente | Recepción real en el VPS pendiente de credenciales |
| Cobros reales | **Pendiente de aprobación** | Deshabilitados a propósito (`MERCADOPAGO_*` vacío en prod) |
| Resend (correos) | Probado localmente · **Bloqueado por credenciales** | API key independiente + `presupuestos@atajolab.dev` |

## Infraestructura

| Ítem | Estado | Evidencia / nota |
| --- | --- | --- |
| CI (lint, tipos, tests, build, E2E) | Verificado en GitHub Actions | Último push en verde |
| Imágenes Docker en GHCR | **Desplegado** | Pull autenticado en el VPS; tag `latest` |
| Migraciones | **Desplegado** | 5 migraciones aplicadas en `presupuestos-db` |
| Acceso SSH / Docker | Verificado | `deploy` ∈ grupo `docker` |
| Caddy | **Desplegado** | `sites/presupuestos.caddy`; validate + reload sin reiniciar Agendia |
| PostgreSQL | **Desplegado** | Contenedor `presupuestos-db` (perfil `own-db`), red interna, sin puertos públicos |
| Despliegue de la app | **Desplegado** / healthy | `presupuestos-app` Up (healthy), red `agendia-edge` |
| DNS `presupuestos.atajolab.dev` | **Verificado en producción** | `A` → `167.233.65.236` |
| HTTPS / certificado | **Verificado en producción** | Let's Encrypt, CN=`presupuestos.atajolab.dev` |
| Healthcheck público | **Verificado en producción** | `GET /api/health` → `{"status":"ok"}` |
| Agendia tras el cambio | **Verificado en producción** | `https://agendia.atajolab.dev/api/health` → 200 |
| Backups locales | **Desplegado** | Primer dump verificado (32 tablas); cron diario 03:15 |
| Backups externos | **Bloqueado por credenciales** | Sin `OFFSITE_RCLONE_REMOTE` / rclone |
| Monitoreo | **Desplegado** (sin alertas externas) | cron cada 5 min; falta `ALERT_WEBHOOK_URL` |
| Cron de conciliación | **Desplegado** | Horario `POST /api/cron/billing` con `CRON_SECRET` |
| Rollback | Implementado | Script listo; no ejercitado aún en un fallo real |
| Despliegue automático desde CI | No activado | A propósito |

## Plantillas privadas: estado de despliegue

Ver el estado vigente en la sección "Despliegue de esta versión" del informe de la sesión y en `docs/custom-templates.md` (procedimiento para crear y asignar). Ninguna cuenta es ADMIN por defecto: el primer administrador se otorga manualmente con un `UPDATE` controlado.

## Modalidad actual

**Validación controlada.** La app está pública en HTTPS con pagos y correos deshabilitados. No hay mocks de compra en producción. No abrir lanzamiento comercial hasta Mercado Pago sandbox, Resend, backups externos, alertas y textos legales.

## Acciones necesarias de tu parte

1. **Mercado Pago**: app independiente; credenciales de **prueba**; webhook `https://presupuestos.atajolab.dev/api/webhooks/mercadopago`; temas `payment`, `subscription_preapproval`, `subscription_authorized_payment`. Guardar token y secreto en `/opt/atajolab/apps/presupuestos/.env` (600) y recrear el contenedor app.
2. **Resend**: API key independiente; remitente `presupuestos@atajolab.dev`.
3. **Backups externos**: destino (p. ej. Cloudflare R2) + `rclone.conf` + `OFFSITE_RCLONE_REMOTE` (aislado de Agendia).
4. **Alertas**: `ALERT_WEBHOOK_URL` (ntfy/Slack/Discord) + monitor externo de `/api/health`.
5. **Legal**: completar titular, CUIT, domicilio, plazos; revisión con asesor.
6. **Autorizar cobros reales** solo después de sandbox y de lo anterior.
