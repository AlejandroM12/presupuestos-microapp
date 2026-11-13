#!/usr/bin/env bash
# Restaura un backup en la base indicada por DATABASE_URL. DESTRUCTIVO: reemplaza los datos.
# Probar primero en una base vacía de pruebas. Uso: ./scripts/restore.sh <archivo.dump>
set -euo pipefail
cd "$(dirname "$0")/.."
FILE="${1:?Uso: restore.sh <archivo.dump>}"
[ -f "$FILE" ] || { echo "No existe $FILE" >&2; exit 1; }
set -a
# shellcheck disable=SC1091
. ./.env
set +a
: "${DATABASE_URL:?DATABASE_URL no definida}"
PG_URL="${DATABASE_URL%%\?*}"

echo "Se va a REEMPLAZAR el contenido de: ${PG_URL##*@}"
read -r -p "Escribí RESTAURAR para continuar: " answer
[ "$answer" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

NET_ARGS=()
[ -n "${PG_DOCKER_NETWORK:-}" ] && NET_ARGS=(--network "$PG_DOCKER_NETWORK")

docker compose stop app 2>/dev/null || true
docker run --rm -i "${NET_ARGS[@]}" postgres:17-alpine pg_restore --clean --if-exists --no-owner -d "$PG_URL" < "$FILE"
echo ">> Restauración completa. Levantá la app con ./scripts/deploy.sh <tag>."
