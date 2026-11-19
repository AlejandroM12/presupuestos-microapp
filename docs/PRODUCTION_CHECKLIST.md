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
| Plantillas privadas (modelo, versionado, asignaciones, campos, PDF) | Probado localmente · **Verificado en producción** (smoke 2026-11-19) | Vitest con PostgreSQL, PDF con campos y multipágina, revisión visual; en producción: alta, activación, asignación, PDF 200 a la cuenta asignada, 403 a otra, 422 con campo obligatorio faltante |
| Administración (`/admin`, roles, auditoría, vista previa PDF) | Probado localmente · **Verificado en producción** (smoke 2026-11-19) | E2E `private-templates.spec.ts` (desktop y mobile); en producción: 404 a anónimo y usuario común, vista previa PDF solo admin, revocación inmediata (403), auditoría registrada |
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

## Despliegue de la versión con plantillas privadas (2026-11-19)

- Imagen `latest` construida por GitHub Actions (CI y Docker en verde sobre `ed01247`). Backup verificado antes de migrar y migración `20261117223748_custom_templates_and_admin` aplicada (6 migraciones en total).
- Solo se recreó `presupuestos-app`; `presupuestos-db` y los contenedores de Agendia no se tocaron (Agendia responde 200).
- Rollback preparado: la imagen anterior quedó etiquetada localmente como `rollback-20261119` (`TAG=rollback-20261119 docker compose up -d app`). La migración es aditiva (tablas y columnas nuevas), compatible con la versión anterior.
- Smoke real con cuentas descartables, limpiadas al terminar: 14 verificaciones correctas.
- No hay ninguna cuenta ADMIN ni plantilla creada en producción: el primer administrador se otorga manualmente (ver `docs/custom-templates.md`).
- `ATAJOLAB_WHATSAPP_E164` **no está definido** en producción: los botones de la landing usan el correo como alternativa hasta que se configure el número comercial.

## Modalidad actual

**Validación controlada.** La app está pública en HTTPS con pagos y correos deshabilitados. No hay mocks de compra en producción. No abrir lanzamiento comercial hasta Mercado Pago sandbox, Resend, backups externos, alertas y textos legales.

## Acciones necesarias de tu parte

1. **Mercado Pago**: app independiente; credenciales de **prueba**; webhook `https://presupuestos.atajolab.dev/api/webhooks/mercadopago`; temas `payment`, `subscription_preapproval`, `subscription_authorized_payment`. Guardar token y secreto en `/opt/atajolab/apps/presupuestos/.env` (600) y recrear el contenedor app.
2. **Resend**: API key independiente; remitente `presupuestos@atajolab.dev`.
3. **Backups externos**: destino (p. ej. Cloudflare R2) + `rclone.conf` + `OFFSITE_RCLONE_REMOTE` (aislado de Agendia).
4. **Alertas**: `ALERT_WEBHOOK_URL` (ntfy/Slack/Discord) + monitor externo de `/api/health`.
5. **Legal**: completar titular, CUIT, domicilio, plazos; revisión con asesor.
6. **Autorizar cobros reales** solo después de sandbox y de lo anterior.
