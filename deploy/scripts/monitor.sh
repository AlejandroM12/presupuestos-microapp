#!/usr/bin/env bash
# Monitoreo liviano para cron (cada 5 minutos). Alerta solo ante cambios a estado fallido
# (y avisa la recuperación) para no inundar el canal.
#
# Chequea: /api/health, contenedor (running + reinicios), espacio en disco, antigüedad del último
# backup y webhooks de pagos fallidos (vía /api/cron/billing no; ver docs/monitoring.md).
# Variables (en .env): APP_URL, ALERT_WEBHOOK_URL, CONTAINER_NAME (def. presupuestos-app-1),
#   DISK_ALERT_PERCENT (def. 85), BACKUP_MAX_AGE_HOURS (def. 30), HEALTH_URL (def. APP_URL/api/health)
# Programar: */5 * * * * cd /opt/atajolab/apps/presupuestos && ./scripts/monitor.sh
set -uo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ./scripts/lib-alert.sh
set -a
# shellcheck disable=SC1091
. ./.env
set +a

STATE_FILE="${MONITOR_STATE_FILE:-/tmp/presupuestos-monitor.state}"
CONTAINER="${CONTAINER_NAME:-presupuestos-app-1}"
HEALTH="${HEALTH_URL:-${APP_URL:-http://localhost:3000}/api/health}"
DISK_MAX="${DISK_ALERT_PERCENT:-85}"
BACKUP_MAX_H="${BACKUP_MAX_AGE_HOURS:-30}"

problems=()

if ! curl -fsS -m 10 -o /dev/null "$HEALTH"; then
  problems+=("healthcheck falla: $HEALTH")
fi

status=$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo missing)
if [ "$status" != "running" ]; then
  problems+=("contenedor $CONTAINER en estado '$status'")
else
  restarts=$(docker inspect -f '{{.RestartCount}}' "$CONTAINER" 2>/dev/null || echo 0)
  prev=$(grep '^restarts=' "$STATE_FILE" 2>/dev/null | cut -d= -f2 || true)
  if [ -n "${prev:-}" ] && [ "$restarts" -gt "$prev" ]; then
    problems+=("el contenedor se reinició ($prev -> $restarts)")
  fi
fi

used=$(df --output=pcent / | tail -1 | tr -dc '0-9')
[ "${used:-0}" -ge "$DISK_MAX" ] && problems+=("disco al ${used}%")

LAST="${BACKUP_DIR:-./backups}/.last_success"
if [ -f "$LAST" ]; then
  age_h=$(( ($(date -u +%s) - $(cat "$LAST")) / 3600 ))
  [ "$age_h" -gt "$BACKUP_MAX_H" ] && problems+=("último backup exitoso hace ${age_h}h")
else
  problems+=("sin registro de backups exitosos")
fi

prev_state=$(grep '^state=' "$STATE_FILE" 2>/dev/null | cut -d= -f2 || true)
if [ "${#problems[@]}" -gt 0 ]; then
  new_state=fail
  summary=$(printf '%s; ' "${problems[@]}")
  [ "${prev_state:-ok}" != "fail" ] && alert "PROBLEMA: $summary"
else
  new_state=ok
  [ "${prev_state:-ok}" = "fail" ] && alert "RECUPERADO: todos los chequeos OK"
fi
printf 'state=%s\nrestarts=%s\n' "$new_state" "${restarts:-0}" > "$STATE_FILE"
[ "$new_state" = "ok" ]
