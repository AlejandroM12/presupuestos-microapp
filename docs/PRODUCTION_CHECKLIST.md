# Checklist de producción

Estado real de cada punto, con evidencia. Estados: **Implementado**, **Probado localmente**, **Probado en sandbox**, **Desplegado**, **Verificado en producción**, **Bloqueado por credenciales**, **Pendiente de aprobación**.

Última actualización: 2026-11-20 (integraciones externas completadas; ventas cerradas hasta cumplir los requisitos legales).

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
| Rotación de `CRON_SECRET` | **Verificado en producción** | Secreto nuevo generado en el servidor; el anterior → 401; sin secreto → 401; el cron horario de las 21:00 UTC corrió con el nuevo (HTTP 200); el crontab ya no contiene secretos (`cron-billing.sh`). Test `route.test.ts` |
| Contacto comercial por WhatsApp | **Verificado en producción** | `ATAJOLAB_WHATSAPP_E164` configurado con el número comercial oficial que figura en `atajolab-shop` (`src/data/site.ts`); la landing (ahora renderizada por solicitud) emite enlaces `wa.me`. E2E desktop y mobile con un número de prueba |
| Vista previa fiel del PDF (plantillas privadas) | **Verificado en producción** (smoke) | PDF real rasterizado con pdf.js, debounce 900 ms, no consume cupo, límite propio, 403 sin asignación |
| Administración por formulario | **Verificado en producción** (smoke) | E2E `template-admin-form.spec.ts` (campos, secciones, orden, validación, versionado v1/v2); vista previa de configuración sin guardar |
| Flujo comercial completo con 3 plantillas demo | Probado localmente | `demo-templates.spec.ts`; PDFs en `examples/demo-pdfs/` (no versionados); no se crean en producción |
| Paginación de PDF (seis diseños + plantillas privadas) | Probado localmente · **Verificado en producción** (smoke) | `pagination.test.ts`: 1/5/10/35/100 conceptos; un encabezado por página, sin páginas huérfanas, encabezado compacto de continuación; revisión visual de todas las páginas de las muestras |
| Estructura declarativa de plantillas privadas | Probado localmente · **Verificado en producción** (smoke) | Variantes de encabezado, tabla y totales, columnas, fichas, aprobación, anticipo/saldo; compatibilidad con configuraciones previas |
| Compuerta comercial (`SALES_ENABLED` / `SALES_ALLOWLIST`) | **Verificado en producción** | Con credenciales reales cargadas, `POST /api/billing/pack` y `/subscription` devuelven 403 `sales_closed`; 0 pagos y 0 suscripciones creados. Tests `sales-gate.test.ts` |
| Mercado Pago producción: credenciales y APIs | **Verificado en producción** (sin cargos) | Ver `docs/mercadopago.md` |
| Mercado Pago producción: checkout hasta la instancia de pago | **Verificado en producción** (2026-11-20) | El titular llegó al checkout desde *Mi plan*; el servidor registra una suscripción Pro mensual creada en Mercado Pago (`PENDING`). Pack: reportado por el titular, sin registro en el servidor (0 pagos) |
| Mercado Pago producción: pago real, webhook real, activación, reembolso y suscripción | **Pendiente** (bloqueado por falta de un comprador) | Cuenta autorizada por `SALES_ALLOWLIST`; ventas públicas cerradas. Ver `docs/LANZAMIENTO.md` |
| Resend | **Verificado** (por el titular) | Correo recibido |
| ntfy / UptimeRobot | **Verificado** (por el titular) | Notificaciones recibidas; monitor activo cada 5 min sobre `/api/health` |
| Backups | Locales automáticos (decisión del titular: sin copia externa) | R2 descartado; los backups quedan solo en el VPS |
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

## Despliegue de estabilización (2026-11-19)

- Imagen `latest` de `8131492` (CI y Docker en verde); backup verificado antes (`presupuestos-20261119T213056Z.dump`); sin migraciones nuevas (6 aplicadas).
- Solo se recreó `presupuestos-app`. Agendia responde 200 y sus contenedores no se tocaron.
- Rollback: imagen anterior etiquetada `rollback-20261119b` en el VPS (`TAG=rollback-20261119b docker compose up -d app`).
- Smoke real en producción (16 verificaciones) con cuentas descartables y plantilla de prueba, **eliminadas al terminar** (0 usuarios `@smoke.example`, 0 plantillas).

## Despliegue de la auditoría visual (2026-11-19)

- Imagen `latest` de `8013604` (CI y Docker en verde); backup verificado `presupuestos-20261119T225516Z.dump`; sin migraciones nuevas.
- Rollback: imagen anterior etiquetada `rollback-20261119c`.
- La auditoría de dependencias bloqueó la CI por una vulnerabilidad alta en `effect` (dependencia transitiva de Prisma): se fijó la versión parcheada 3.x con un `override` de pnpm.
- Smoke de producción con las opciones nuevas: 16 verificaciones correctas; cuentas y plantilla de prueba eliminadas. Agendia responde 200.

## Despliegue del pulido final de documentos (2026-11-19)

- Imagen `latest` de `8b254d3` (CI y Docker en verde); backup verificado `presupuestos-20261119T233505Z.dump`; sin migraciones nuevas. Rollback: imagen anterior etiquetada `rollback-20261119d`.
- Incluye densidad estándar/compacta, Moderno a ancho completo desde la segunda página, normalización de cantidades y unidades, títulos de sección no redundantes y tipo de documento en las páginas de continuación.
- Smoke de producción (16 verificaciones, con densidad compacta), cuentas y plantilla de prueba eliminadas. Agendia responde 200.
- Pruebas omitidas documentadas en `docs/development.md`: 3 generadores de muestras de Vitest (se activan con variables de entorno) y 3 flujos de demostración en mobile de Playwright (cubiertos en desktop; mobile se prueba en otros specs).

## Modalidad actual

**Validación controlada.** La app está pública en HTTPS con pagos y correos deshabilitados. No hay mocks de compra en producción. No abrir lanzamiento comercial hasta Mercado Pago sandbox, Resend, backups externos, alertas y textos legales.

## Acciones necesarias de tu parte

Pasos detallados de cada una en `docs/guia-integraciones.md`. Las credenciales se cargan con `./scripts/set-secret.sh` (entrada oculta), no por chat.


1. **Mercado Pago**: app independiente; credenciales de **prueba**; webhook `https://presupuestos.atajolab.dev/api/webhooks/mercadopago`; temas `payment`, `subscription_preapproval`, `subscription_authorized_payment`. Guardar token y secreto en `/opt/atajolab/apps/presupuestos/.env` (600) y recrear el contenedor app.
2. **Resend**: API key independiente; remitente `presupuestos@atajolab.dev`.
3. **Backups externos**: destino (p. ej. Cloudflare R2) + `rclone.conf` + `OFFSITE_RCLONE_REMOTE` (aislado de Agendia).
4. **Alertas**: `ALERT_WEBHOOK_URL` (ntfy/Slack/Discord) + monitor externo de `/api/health`.
5. **Legal**: completar titular, CUIT, domicilio, plazos; revisión con asesor.
6. **Autorizar cobros reales** solo después de sandbox y de lo anterior.
