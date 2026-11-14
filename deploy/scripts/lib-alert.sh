#!/usr/bin/env bash
# Utilidad compartida: envía una alerta a ALERT_WEBHOOK_URL (opcional).
# Compatible con ntfy (texto plano) y con webhooks que aceptan JSON {"text": "..."}.
# ALERT_WEBHOOK_FORMAT=text|json (def. text). Nunca incluir secretos en el mensaje.
alert() {
  local message="[presupuestos] $1"
  echo "ALERTA: $message" >&2
  [ -n "${ALERT_WEBHOOK_URL:-}" ] || return 0
  if [ "${ALERT_WEBHOOK_FORMAT:-text}" = "json" ]; then
    curl -fsS -m 10 -H 'Content-Type: application/json' \
      -d "{\"text\": \"${message//\"/\\\"}\"}" "$ALERT_WEBHOOK_URL" >/dev/null || true
  else
    curl -fsS -m 10 -d "$message" "$ALERT_WEBHOOK_URL" >/dev/null || true
  fi
}
