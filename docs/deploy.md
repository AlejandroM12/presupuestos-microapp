# Despliegue

> **Estado**: la configuración está lista. En el VPS (2026-11-17) el usuario `deploy` **ya tiene** grupo `docker`; Agendia corre healthy. Directorio `/opt/atajolab/apps/presupuestos` y `.env` (600) preparados. **Aún no se levantaron** contenedores de Presupuestos: falta `docker login` a GHCR (`read:packages`), DNS y autorización para el sitio Caddy.

## Esquema

```
Cloudflare (DNS) → Caddy existente (HTTPS) → presupuestos-app:3000  (sin puertos publicados)
                                           ↘ PostgreSQL (instancia existente con base y usuario dedicados, o servicio `db` incluido)
```

Las imágenes se construyen en GitHub Actions (`.github/workflows/docker.yml`) y se publican en `ghcr.io/alejandrom12/presupuestos-microapp` (app) y `…-migrate` (migraciones). El VPS solo hace `pull`: no compila.

## Inspección del VPS (hecha en modo solo lectura)

Acceso: `ssh -i ~/.ssh/atajolab_prod deploy@167.233.65.236`. Hallazgos verificados:

- Ubuntu, 4 GB de RAM (~2,9 GB disponibles), disco 38 GB con 30 GB libres.
- Puertos públicos: solo 22, 80 y 443.
- `/opt/atajolab/{apps,backups,proxy}`; `apps/agendia` es la única app instalada. `proxy/` y `backups/` están vacíos.
- **Caddy no es un servicio del host: corre dentro del compose de Agendia** (red Docker `agendia-edge`), y su Caddyfile hace `import sites/*.caddy` desde `/opt/atajolab/apps/agendia/deploy/sites/`.
- Agendia tiene su propio PostgreSQL y un servicio de backup/offsite propios: **no se reutilizan**; Presupuestos usa su propio contenedor `db` (perfil `own-db`).
- `deploy` pertenece al grupo `docker` (desbloqueado tras el despliegue de Agendia).
- El DNS de `presupuestos.atajolab.dev` no existe todavía.
- GHCR: no hay `~/.docker/config.json` en el VPS → hace falta `docker login ghcr.io` con un token `read:packages`.

## Decisiones de despliegue

- Directorio: `/opt/atajolab/apps/presupuestos` (junto a Agendia).
- Red: `PROXY_NETWORK=agendia-edge` (la app se une a la red de Caddy; no publica puertos).
- Base: servicio `db` incluido (`COMPOSE_PROFILES=own-db`), volumen propio, sin puertos publicados. Para backups, `PG_DOCKER_NETWORK=presupuestos_internal`.
- Caddy: copiar `deploy/Caddyfile.snippet` a `/opt/atajolab/apps/agendia/deploy/sites/presupuestos.caddy` y recargar Caddy **sin reiniciarlo**. Es una modificación de una carpeta de Agendia: requiere autorización.
- Cloudflare: crear un registro `A presupuestos → 167.233.65.236` (o el mismo tipo que use `atajolab.dev`). Si el proxy naranja está activo, usar SSL "Full (strict)". Crear el registro recién cuando la app esté levantada.

## Qué hace falta para ejecutar el primer despliegue

1. Agregar `deploy` al grupo `docker` (`sudo usermod -aG docker deploy`, requiere sudo; implica darle control equivalente a root sobre el host) **o** que otra persona con acceso ejecute los comandos de abajo.
2. Un token de GitHub con `read:packages` para `docker login ghcr.io` (el paquete es privado).
3. Completar `.env` en el servidor (ver más abajo) generando `AUTH_SECRET`, `CRON_SECRET` y `POSTGRES_PASSWORD` con `openssl rand -base64 32`.

## Primer despliegue

```bash
# En el servidor, usuario deploy
mkdir -p /opt/atajolab/apps/presupuestos && cd /opt/atajolab/apps/presupuestos
# copiar deploy/ (docker-compose.yml, scripts/, .env.production.example)
cp .env.production.example .env && chmod 600 .env   # completar valores
export COMPOSE_PROFILES=own-db
docker login ghcr.io                                # token con permiso read:packages
./scripts/deploy.sh <tag>                           # tag = sha corto o vX.Y.Z
```

`deploy.sh`: backup → pull → migraciones → `up -d` → espera el healthcheck. Si no queda saludable, vuelve al tag anterior.

Después: Caddy (ver arriba), DNS, y las tareas programadas (cron del usuario `deploy`):

```
0 * * * *   curl -fsS -X POST https://presupuestos.atajolab.dev/api/cron/billing -H "Authorization: Bearer $CRON_SECRET"
15 3 * * *  cd /opt/atajolab/apps/presupuestos && ./scripts/backup.sh >> backup.log 2>&1
*/5 * * * * cd /opt/atajolab/apps/presupuestos && ./scripts/monitor.sh >> monitor.log 2>&1
```

## Variables de entorno

Ver `deploy/.env.production.example`. Obligatorias: `DATABASE_URL`, `APP_URL`, `AUTH_SECRET`. Sin `MERCADOPAGO_*` los pagos quedan deshabilitados; sin `RESEND_*` no se envían correos. `CRON_SECRET` protege `POST /api/cron/billing`.

## Tarea programada de facturación

El cron horario de arriba vence suscripciones cuyo período terminó y concilia con Mercado Pago ante webhooks perdidos.

## Rollback

`./scripts/rollback.sh [tag]`. Las migraciones son aditivas y **no se revierten solas**: si un release cambió el esquema, restaurar el backup previo (`docs/backups.md`) solo si el código anterior es incompatible.

## Logs

`docker logs presupuestos-app` (json-file, 10 MB × 5). Los logs no incluyen datos sensibles: solo códigos de evento y mensajes de error genéricos.
