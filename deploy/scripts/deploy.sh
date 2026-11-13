#!/usr/bin/env bash
# Despliega un tag de la imagen: migra la base, levanta la app y verifica el healthcheck.
# Si el healthcheck falla, vuelve automáticamente al tag anterior.
# Uso: ./scripts/deploy.sh <tag>
set -euo pipefail

cd "$(dirname "$0")/.."
TAG="${1:?Uso: deploy.sh <tag>}"
STATE_DIR=".deploy"
mkdir -p "$STATE_DIR"

[ -f .env ] || { echo "Falta .env (ver .env.production.example)" >&2; exit 1; }

PREVIOUS="$(cat "$STATE_DIR/current" 2>/dev/null || true)"
echo ">> Desplegando tag: $TAG (anterior: ${PREVIOUS:-ninguno})"

# Backup previo a cualquier cambio de esquema.
if [ -x ./scripts/backup.sh ]; then
  ./scripts/backup.sh || { echo "!! El backup falló: se aborta el despliegue" >&2; exit 1; }
fi

export TAG
docker compose pull app
docker compose --profile migrate pull migrate
echo ">> Aplicando migraciones"
docker compose --profile migrate run --rm migrate

echo ">> Levantando la aplicación"
docker compose up -d app

echo ">> Esperando healthcheck"
for _ in $(seq 1 30); do
  status="$(docker inspect --format '{{.State.Health.Status}}' presupuestos-app 2>/dev/null || echo starting)"
  if [ "$status" = "healthy" ]; then
    echo ">> OK"
    echo "$TAG" > "$STATE_DIR/current"
    [ -n "$PREVIOUS" ] && echo "$PREVIOUS" > "$STATE_DIR/previous"
    exit 0
  fi
  sleep 5
done

echo "!! La app no quedó saludable (logs abajo)" >&2
docker logs --tail 50 presupuestos-app >&2 || true
if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$TAG" ]; then
  echo "!! Volviendo a $PREVIOUS" >&2
  export TAG="$PREVIOUS"
  docker compose up -d app
fi
exit 1
