# Despliegue

> **Estado**: la configuración está lista y verificada en local (imagen, migraciones, backup/restauración). **No se desplegó** en el VPS ni se tocó la infraestructura compartida. Antes del primer despliegue hay que inspeccionar el servidor real (ver "Verificaciones previas").

## Esquema

```
Cloudflare (DNS) → Caddy existente (HTTPS) → presupuestos-app:3000  (sin puertos publicados)
                                           ↘ PostgreSQL (instancia existente con base y usuario dedicados, o servicio `db` incluido)
```

Las imágenes se construyen en GitHub Actions (`.github/workflows/docker.yml`) y se publican en `ghcr.io/alejandrom12/presupuestos-microapp` (app) y `…-migrate` (migraciones). El VPS solo hace `pull`: no compila.

## Verificaciones previas (requieren autorización)

1. Confirmar cómo corre Caddy (contenedor o servicio) y el nombre de la red Docker que comparte con las apps. Definir `PROXY_NETWORK`.
2. Confirmar si hay un PostgreSQL reutilizable. Si lo hay: crear **una base y un usuario nuevos** (no compartir esquemas ni credenciales con Agendia/Adhera). Si no, usar el perfil `own-db` del compose.
3. Verificar RAM/CPU libres (el contenedor está limitado a 640 MB).
4. Crear el registro DNS `presupuestos` en Cloudflare (CNAME/A hacia el VPS) **solo cuando se vaya a publicar**.

## Primer despliegue

```bash
# En el servidor, usuario deploy
mkdir -p /opt/presupuestos && cd /opt/presupuestos
# copiar deploy/ (docker-compose.yml, scripts/, .env.production.example)
cp .env.production.example .env && chmod 600 .env   # completar valores
docker login ghcr.io                                # token con permiso read:packages
./scripts/deploy.sh <tag>                           # tag = sha corto o vX.Y.Z
```

`deploy.sh`: backup → pull → migraciones → `up -d` → espera el healthcheck. Si no queda saludable, vuelve al tag anterior.

Agregar al Caddyfile existente el bloque de `deploy/Caddyfile.snippet` y recargar Caddy (`caddy reload`, sin reiniciar el resto de los sitios).

## Variables de entorno

Ver `deploy/.env.production.example`. Obligatorias: `DATABASE_URL`, `APP_URL`, `AUTH_SECRET`. Sin `MERCADOPAGO_*` los pagos quedan deshabilitados; sin `RESEND_*` no se envían correos. `CRON_SECRET` protege `POST /api/cron/billing`.

## Tarea programada de facturación

Cada hora (cron del servidor):

```bash
curl -fsS -X POST https://presupuestos.atajolab.dev/api/cron/billing -H "Authorization: Bearer $CRON_SECRET"
```

Vence suscripciones cuyo período terminó y concilia con Mercado Pago ante webhooks perdidos.

## Rollback

`./scripts/rollback.sh [tag]`. Las migraciones son aditivas y **no se revierten solas**: si un release cambió el esquema, restaurar el backup previo (`docs/backups.md`) solo si el código anterior es incompatible.

## Logs

`docker logs presupuestos-app` (json-file, 10 MB × 5). Los logs no incluyen datos sensibles: solo códigos de evento y mensajes de error genéricos.
