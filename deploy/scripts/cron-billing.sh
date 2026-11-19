#!/usr/bin/env bash
# Dispara la conciliación de facturación. Lee CRON_SECRET del .env sin imprimirlo ni dejarlo en
# el crontab ni en la lista de procesos (el encabezado se pasa por stdin a curl).
# Programar: 0 * * * * cd /opt/atajolab/apps/presupuestos && ./scripts/cron-billing.sh >> backups/cron-billing.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

SECRET="$(grep -E '^CRON_SECRET=' .env | head -n1 | cut -d= -f2- | tr -d '"'"'"'\r')"
[ -n "$SECRET" ] || { echo "$(date -u +%FT%TZ) CRON_SECRET no definido" >&2; exit 1; }
APP="$(grep -E '^APP_URL=' .env | head -n1 | cut -d= -f2- | tr -d '"'"'"'\r')"
URL="${APP:-http://localhost:3000}/api/cron/billing"

code="$(printf 'Authorization: Bearer %s\n' "$SECRET" |
  curl -sS -m 60 -o /dev/null -w '%{http_code}' -X POST -H @- "$URL")"
echo "$(date -u +%FT%TZ) billing-cron http=$code"
[ "$code" = "200" ]
