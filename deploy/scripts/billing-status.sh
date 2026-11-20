#!/usr/bin/env bash
# Estado de cobros (solo lectura): pagos, suscripciones y eventos de webhook recientes.
# No muestra emails, tokens ni secretos. Útil durante la compra real controlada.
# Uso: ./scripts/billing-status.sh
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
. ./.env
set +a
psql_q() { docker exec presupuestos-db psql -U "${POSTGRES_USER:-presupuestos}" -d "${POSTGRES_DB:-presupuestos}" -P pager=off -c "$1"; }
echo "== Compuerta comercial =="
echo "SALES_ENABLED=${SALES_ENABLED:-<sin definir>}  SALES_ALLOWLIST: $([ -n "${SALES_ALLOWLIST:-}" ] && echo "$(echo "$SALES_ALLOWLIST" | tr ',' '\n' | wc -l) cuenta(s)" || echo "vacía")"
echo "== Pagos (últimos 10) =="
psql_q 'select kind, status, "providerStatus", amount, currency, "createdAt"::timestamp(0) from payments order by "createdAt" desc limit 10;'
echo "== Compras del Pack =="
psql_q 'select count(*) as packs_activos from template_purchases;'
echo "== Suscripciones =="
psql_q 'select plan, status, "currentPeriodEnd"::timestamp(0), "canceledAt"::timestamp(0) from subscriptions order by "createdAt" desc limit 10;'
echo "== Webhooks (últimos 10) =="
psql_q 'select type, status, attempts, left(coalesce(error, '"''"'), 60) as error, "receivedAt"::timestamp(0) from webhook_events order by "receivedAt" desc limit 10;'
