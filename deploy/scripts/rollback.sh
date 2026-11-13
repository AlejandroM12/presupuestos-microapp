#!/usr/bin/env bash
# Vuelve al tag desplegado anteriormente (o al indicado). Las migraciones no se revierten
# automáticamente (son aditivas); ver docs/deploy.md antes de un rollback tras un cambio de esquema.
# Uso: ./scripts/rollback.sh [tag]
set -euo pipefail
cd "$(dirname "$0")/.."
TAG="${1:-$(cat .deploy/previous 2>/dev/null || true)}"
[ -n "$TAG" ] || { echo "No hay tag anterior registrado; indicá uno." >&2; exit 1; }
echo ">> Rollback a $TAG"
export TAG
docker compose pull app
docker compose up -d app
for _ in $(seq 1 30); do
  if [ "$(docker inspect --format '{{.State.Health.Status}}' presupuestos-app 2>/dev/null)" = "healthy" ]; then
    echo ">> OK"
    echo "$TAG" > .deploy/current
    exit 0
  fi
  sleep 5
done
echo "!! No quedó saludable" >&2
exit 1
