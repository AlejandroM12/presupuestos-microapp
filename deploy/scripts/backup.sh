#!/usr/bin/env bash
# Backup lógico de PostgreSQL (formato custom, comprimido) con verificación, retención,
# copia externa opcional y alerta ante fallos.
#
# Variables (en .env):
#   BACKUP_DIR              destino local (def. ./backups)
#   BACKUP_RETENTION_DAYS   días de retención local (def. 14)
#   PG_DOCKER_NETWORK       red Docker desde la que se alcanza la base (opcional)
#   OFFSITE_RCLONE_REMOTE   destino externo en formato rclone, p. ej. "hetzner:bucket/presupuestos"
#   RCLONE_CONFIG_FILE      ruta a un rclone.conf (permisos 600) con ese remoto
#   ALERT_WEBHOOK_URL       alerta ante fallos (ver lib-alert.sh)
# Programar con cron: 15 3 * * * cd /opt/atajolab/apps/presupuestos && ./scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ./scripts/lib-alert.sh
set -a
# shellcheck disable=SC1091
. ./.env
set +a
: "${DATABASE_URL:?DATABASE_URL no definida}"

trap 'alert "FALLÓ el backup (línea $LINENO). Revisar el log del cron."' ERR

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
FILE="$BACKUP_DIR/presupuestos-$(date -u +%Y%m%dT%H%M%SZ).dump"

NET_ARGS=()
[ -n "${PG_DOCKER_NETWORK:-}" ] && NET_ARGS=(--network "$PG_DOCKER_NETWORK")
# La URL de Prisma puede traer ?schema=...; pg_dump no lo admite.
PG_URL="${DATABASE_URL%%\?*}"

docker run --rm "${NET_ARGS[@]}" postgres:17-alpine pg_dump -Fc --no-owner "$PG_URL" > "$FILE"
[ -s "$FILE" ] || { echo "Backup vacío" >&2; rm -f "$FILE"; alert "backup vacío"; exit 1; }
chmod 600 "$FILE"

# Verificación: el archivo debe ser legible por pg_restore y contener las tablas esperadas.
ABS_DIR="$(cd "$(dirname "$FILE")" && pwd)"
TABLES=$(docker run --rm -v "$ABS_DIR:/b:ro" postgres:17-alpine pg_restore --list "/b/$(basename "$FILE")" | grep -c " TABLE " || true)
if [ "$TABLES" -lt 10 ]; then
  echo "Verificación fallida: solo $TABLES tablas en el backup" >&2
  alert "backup corrupto o incompleto ($TABLES tablas)"
  exit 1
fi
echo ">> Backup verificado: $FILE ($(du -h "$FILE" | cut -f1), $TABLES tablas)"

# Copia externa (obligatoria en producción: un backup solo en el mismo VPS no alcanza).
if [ -n "${OFFSITE_RCLONE_REMOTE:-}" ]; then
  : "${RCLONE_CONFIG_FILE:?RCLONE_CONFIG_FILE requerido con OFFSITE_RCLONE_REMOTE}"
  docker run --rm \
    -v "$(cd "$(dirname "$RCLONE_CONFIG_FILE")" && pwd)/$(basename "$RCLONE_CONFIG_FILE"):/config/rclone/rclone.conf:ro" \
    -v "$ABS_DIR:/b:ro" rclone/rclone:1.68 copyto "/b/$(basename "$FILE")" \
    "$OFFSITE_RCLONE_REMOTE/$(basename "$FILE")"
  echo ">> Copia externa subida a $OFFSITE_RCLONE_REMOTE"
else
  echo ">> ADVERTENCIA: OFFSITE_RCLONE_REMOTE no configurado; el backup solo existe en este servidor." >&2
fi

find "$BACKUP_DIR" -name 'presupuestos-*.dump' -mtime "+$RETENTION" -delete
date -u +%s > "$BACKUP_DIR/.last_success"
