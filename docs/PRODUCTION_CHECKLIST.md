# Checklist de producción

Estado real de cada punto, con evidencia. Estados: **Implementado**, **Probado localmente**, **Probado en sandbox**, **Desplegado**, **Verificado en producción**, **Bloqueado por credenciales**, **Pendiente de aprobación**.

Última actualización: 2026-11-17.

## Aplicación

| Ítem | Estado | Evidencia / nota |
| --- | --- | --- |
| Editor, motor de cálculo, 6 diseños PDF | Probado localmente | Vitest (incl. estrés 50 conceptos, textos largos, USD, logos) + Playwright; corregidos encabezados de tabla huérfanos en páginas de cierre |
| Autenticación (registro, login, reset) | Probado localmente | E2E; correo de reset **no** probado con proveedor real |
| Persistencia, clientes, dashboard | Probado localmente | Integración con PostgreSQL real + E2E |
| Plan gratuito (3 descargas/mes, marca) | Probado localmente | Reserva atómica con lock; test de concurrencia |
| Política Pro "uso razonable" | Probado localmente | Sin corte a 500: umbral de revisión, 60/hora, tope 3.000 (`docs/plans.md`) |
| Retención al eliminar cuenta | Probado localmente | Pagos y suscripciones se conservan anonimizados (`docs/retention.md`) |
| Páginas legales | Implementado (borrador) | `/legal/*`, `noindex`, campos `[COMPLETAR]` pendientes del titular. Sin revisión legal |
| Encabezados de seguridad / CSP | Probado localmente | E2E de seguridad. CSP usa `unsafe-inline`. Detalle: `docs/security-audit.md` |
| Rate limiting | Implementado | En memoria: válido para **una** réplica (la prevista). Los límites de descargas Pro sí están en la base |
| Auditoría de seguridad (código) | Completada localmente | Ver `docs/security-audit.md`. Sin pentest del VPS |

## Integraciones

| Ítem | Estado | Qué falta |
| --- | --- | --- |
| Mercado Pago: pago único (Checkout Pro) | Probado localmente (doble del proveedor + validador de firma oficial) · **Bloqueado por credenciales** | `MERCADOPAGO_ACCESS_TOKEN` de prueba y `MERCADOPAGO_WEBHOOK_SECRET`; usuarios de prueba |
| Mercado Pago: suscripciones | Probado localmente · **Bloqueado por credenciales** | Incluye `subscription_authorized_payment` (GET `/authorized_payments/{id}`, vínculo por `preapproval_id`). Pendiente sandbox |
| Webhook firmado + idempotencia | Probado localmente | Verificar recepción real en el VPS |
| Cobros reales | **Pendiente de aprobación** | No habilitar hasta completar la lista de `docs/mercadopago.md` |
| Resend (correos) | Probado localmente (SDK simulado) · **Bloqueado por credenciales** | `RESEND_API_KEY`, dominio `atajolab.dev` verificado (SPF/DKIM), `EMAIL_FROM` |

Escenarios de Mercado Pago validados **solo con el doble**: pago aprobado, rechazado, reembolso, duplicado, monto distinto, evento fuera de orden, alta/renovación/cancelación de suscripción. **Ninguno** se validó contra la API real.

## Infraestructura

| Ítem | Estado | Evidencia / nota |
| --- | --- | --- |
| CI (lint, tipos, tests, build, E2E, PostgreSQL) | Verificado en GitHub Actions | Ejecuciones anteriores en verde; los jobs nuevos (secretos, compose) se verifican en el push que los introduce |
| Imágenes Docker en GHCR | Verificado en GitHub Actions | `ghcr.io/alejandrom12/presupuestos-microapp[-migrate]` |
| Imagen: arranque, health, argon2, PDF | Probado localmente | |
| Migraciones sobre base vacía | Probado localmente | 5 migraciones aplicadas |
| Acceso SSH al VPS | Verificado | `~/.ssh/atajolab_prod`, usuario `deploy`; inspección solo lectura |
| Docker en el VPS | **Desbloqueado** | `deploy` ∈ grupo `docker` (verificado 2026-11-17). Agendia desplegado y healthy |
| Caddy | Inspeccionado (config) | Corre dentro del compose de Agendia, red `agendia-edge`, `import sites/*.caddy`. Agregar sitio = tocar carpeta de Agendia → **Pendiente de aprobación** |
| PostgreSQL | Decidido | Contenedor propio (`own-db`); no se comparte el de Agendia |
| Despliegue de la app | **Preparado, no levantado** | Dir `/opt/atajolab/apps/presupuestos` + `.env` (600) con secretos. Falta `docker login` GHCR + DNS + Caddy |
| DNS `presupuestos.atajolab.dev` | **No existe** (verificado) | Crear `A` → `167.233.65.236` en Cloudflare (DNS only) |
| HTTPS / certificado | No verificable | Depende de DNS + Caddy |
| Backups (script, verificación, alerta) | Probado localmente | Backup verificado, fallo con alerta, subida con rclone a destino local |
| Prueba de restauración en base aislada | Probado localmente | 16 tablas y 5 migraciones restauradas |
| Backups externos al VPS | **Bloqueado por credenciales** | Definir destino (Storage Box / Object Storage / S3) y `rclone.conf` |
| Backups programados en el VPS | No configurado | cron del usuario `deploy` (ver `docs/deploy.md`) |
| Monitoreo (`monitor.sh`) | Probado localmente | Sin ejecutar en el VPS; falta `ALERT_WEBHOOK_URL` y un monitor externo |
| Rollback | Implementado | `rollback.sh` nunca ejecutado contra un servidor real |
| Despliegue automático desde CI | No activado | A propósito, hasta validar primer despliegue y rollback |

## Acciones necesarias de tu parte

1. **GHCR** (bloquea el pull): en GitHub → Settings → Developer settings → Personal access tokens (classic) o fine-grained con `read:packages` sobre `AlejandroM12/presupuestos-microapp`. En el VPS, **sin dejar el token en el historial**:
   ```bash
   read -s GHCR_TOKEN; echo
   printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u AlejandroM12 --password-stdin
   unset GHCR_TOKEN
   ```
2. **Autorizar** copiar `deploy/Caddyfile.snippet` → `/opt/atajolab/apps/agendia/deploy/sites/presupuestos.caddy` y recargar Caddy (`docker exec agendia-caddy-1 caddy reload --config /etc/caddy/Caddyfile`) sin reiniciar Agendia.
3. **Cloudflare**: registro `A`, nombre `presupuestos`, IPv4 `167.233.65.236`, Proxy **DNS only** al inicio.
4. **Mercado Pago**: app independiente (no reutilizar Agendia). Credenciales de **prueba**, webhook a `https://presupuestos.atajolab.dev/api/webhooks/mercadopago`, temas: `payment`, `subscription_preapproval`, `subscription_authorized_payment`.
5. **Resend**: API key **independiente**; remitente `presupuestos@atajolab.dev` (Agendia ya tiene `RESEND_API_KEY` y dominio; no compartir la misma key).
6. **Backups externos**: Agendia define `OFFSITE_REMOTE` pero no hay `rclone.conf` en el home de `deploy` ni contenedor offsite activo. Definir destino (p. ej. R2) y `rclone` para Presupuestos **sin** mezclar con Agendia.
7. **Alertas**: URL de ntfy/Slack/Discord; monitor externo de `https://presupuestos.atajolab.dev/api/health`.
8. **Legal**: completar titular, CUIT, domicilio, plazos; sin eso no hay lanzamiento comercial.
