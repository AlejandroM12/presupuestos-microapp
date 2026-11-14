# Checklist de producción

Estado real de cada punto, con evidencia. Estados: **Implementado**, **Probado localmente**, **Probado en sandbox**, **Desplegado**, **Verificado en producción**, **Bloqueado por credenciales**, **Pendiente de aprobación**.

Última actualización: 2026-11-13.

## Aplicación

| Ítem | Estado | Evidencia / nota |
| --- | --- | --- |
| Editor, motor de cálculo, 6 diseños PDF | Probado localmente | Vitest + Playwright (desktop y mobile) contra el build de producción |
| Autenticación (registro, login, reset) | Probado localmente | E2E; correo de reset **no** probado con proveedor real |
| Persistencia, clientes, dashboard | Probado localmente | Integración con PostgreSQL real + E2E |
| Plan gratuito (3 descargas/mes, marca) | Probado localmente | Reserva atómica con lock; test de concurrencia |
| Política Pro "uso razonable" | Probado localmente | Sin corte a 500: umbral de revisión, 60/hora, tope 3.000 (`docs/plans.md`) |
| Retención al eliminar cuenta | Probado localmente | Pagos y suscripciones se conservan anonimizados (`docs/retention.md`) |
| Páginas legales | Implementado (borrador) | `/legal/*`, `noindex`, campos `[COMPLETAR]` pendientes del titular. Sin revisión legal |
| Encabezados de seguridad / CSP | Probado localmente | E2E de seguridad. CSP usa `unsafe-inline` |
| Rate limiting | Implementado | En memoria: válido para **una** réplica (la prevista). Los límites de descargas Pro sí están en la base |

## Integraciones

| Ítem | Estado | Qué falta |
| --- | --- | --- |
| Mercado Pago: pago único (Checkout Pro) | Probado localmente (doble del proveedor + validador de firma oficial) · **Bloqueado por credenciales** | `MERCADOPAGO_ACCESS_TOKEN` de prueba y `MERCADOPAGO_WEBHOOK_SECRET`; usuarios de prueba |
| Mercado Pago: suscripciones | Probado localmente · **Bloqueado por credenciales** | Idem; verificar qué referencia informa MP en cobros recurrentes (supuesto sin validar) |
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
| Docker en el VPS | **Bloqueado** | `deploy` no está en el grupo `docker` y `sudo` requiere contraseña |
| Caddy | Inspeccionado (config) | Corre dentro del compose de Agendia, red `agendia-edge`, `import sites/*.caddy`. Agregar sitio = tocar carpeta de Agendia → **Pendiente de aprobación** |
| PostgreSQL | Decidido | Contenedor propio (`own-db`); no se comparte el de Agendia |
| Despliegue de la app | **No desplegado** | |
| DNS `presupuestos.atajolab.dev` | **No existe** (verificado con nslookup) | Crear `A` → `167.233.65.236` en Cloudflare |
| HTTPS / certificado | No verificable | Depende de DNS + Caddy |
| Backups (script, verificación, alerta) | Probado localmente | Backup verificado, fallo con alerta, subida con rclone a destino local |
| Prueba de restauración en base aislada | Probado localmente | 16 tablas y 5 migraciones restauradas |
| Backups externos al VPS | **Bloqueado por credenciales** | Definir destino (Storage Box / Object Storage / S3) y `rclone.conf` |
| Backups programados en el VPS | No configurado | cron del usuario `deploy` (ver `docs/deploy.md`) |
| Monitoreo (`monitor.sh`) | Probado localmente | Sin ejecutar en el VPS; falta `ALERT_WEBHOOK_URL` y un monitor externo |
| Rollback | Implementado | `rollback.sh` nunca ejecutado contra un servidor real |
| Despliegue automático desde CI | No activado | A propósito, hasta validar primer despliegue y rollback |

## Acciones necesarias de tu parte

1. **Acceso Docker en el VPS**: `sudo usermod -aG docker deploy` (o ejecutar vos los comandos de `docs/deploy.md`).
2. **GHCR**: token con `read:packages` para `docker login ghcr.io` en el VPS.
3. **Autorizar** agregar `deploy/sites/presupuestos.caddy` en la carpeta de Agendia y recargar Caddy (sin reiniciar).
4. **Cloudflare**: registro `A presupuestos → 167.233.65.236`.
5. **Mercado Pago**: credenciales de prueba, secreto de webhook y URL de notificación.
6. **Resend**: API key y dominio verificado.
7. **Backups**: destino externo y credenciales.
8. **Alertas**: URL de ntfy/Slack/Discord; y un monitor externo de disponibilidad.
9. **Legal**: completar titular, CUIT, domicilio, plazos y revisar los borradores con un asesor.
