#!/usr/bin/env bash
# Backup lógico de PostgreSQL (formato custom, comprimido) con retención.
# Variables: BACKUP_DIR (def. ./backups), BACKUP_RETENTION_DAYS (def. 14),
#            PG_DOCKER_NETWORK (red Docker desde la que se alcanza la base; opcional).
# Programar con cron, por ejemplo: 15 3 * * * cd /opt/presupuestos && ./scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
. ./.env
set +a
: "${DATABASE_URL:?DATABASE_URL no definida}"

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
[ -s "$FILE" ] || { echo "Backup vacío" >&2; rm -f "$FILE"; exit 1; }
chmod 600 "$FILE"
echo ">> Backup creado: $FILE ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -name 'presupuestos-*.dump' -mtime "+$RETENTION" -delete
