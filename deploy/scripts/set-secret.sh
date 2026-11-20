#!/usr/bin/env bash
# Carga o reemplaza una variable del .env del servidor pidiendo el valor en modo oculto:
# el valor no se imprime, no queda en el historial del shell ni pasa por argumentos.
#
# Uso:  ./scripts/set-secret.sh MERCADOPAGO_ACCESS_TOKEN
#       ./scripts/set-secret.sh --recreate RESEND_API_KEY EMAIL_FROM   (varias; recrea la app al final)
# Solo acepta las variables de la lista permitida.
set -euo pipefail
cd "$(dirname "$0")/.."

ALLOWED="MERCADOPAGO_ACCESS_TOKEN MERCADOPAGO_WEBHOOK_SECRET RESEND_API_KEY EMAIL_FROM ATAJOLAB_WHATSAPP_E164 ALERT_WEBHOOK_URL ALERT_WEBHOOK_FORMAT SALES_ENABLED SALES_ALLOWLIST META_PIXEL_ID TIKTOK_PIXEL_ID GA4_MEASUREMENT_ID OFFSITE_RCLONE_REMOTE RCLONE_CONFIG_FILE OFFSITE_RETENTION_DAYS CRON_SECRET"
RECREATE=0
[ "${1:-}" = "--recreate" ] && { RECREATE=1; shift; }
[ "$#" -ge 1 ] || { echo "Uso: $0 [--recreate] VARIABLE [VARIABLE...]" >&2; exit 1; }
[ -f .env ] || { echo "Falta .env en $(pwd)" >&2; exit 1; }

for KEY in "$@"; do
  case " $ALLOWED " in *" $KEY "*) ;; *) echo "Variable no permitida: $KEY" >&2; exit 1 ;; esac
  printf 'Valor de %s (no se muestra): ' "$KEY" >&2
  IFS= read -r -s VALUE
  echo >&2
  [ -n "$VALUE" ] || { echo "Valor vacío: se omite $KEY" >&2; continue; }
  case "$VALUE" in *$'\n'*|*'|'*) echo "El valor no puede contener saltos de línea ni '|'" >&2; exit 1 ;; esac
  umask 077
  TMP="$(mktemp .env.XXXXXX)"
  # Se reescribe el archivo sin la línea anterior y se agrega la nueva (comillas dobles si hay espacios).
  grep -v "^${KEY}=" .env > "$TMP" || true
  case "$VALUE" in *' '*|*'<'*) printf '%s="%s"\n' "$KEY" "$VALUE" >> "$TMP" ;; *) printf '%s=%s\n' "$KEY" "$VALUE" >> "$TMP" ;; esac
  chmod 600 "$TMP"
  mv "$TMP" .env
  echo "OK: $KEY actualizado (${#VALUE} caracteres)" >&2
done

if [ "$RECREATE" = "1" ]; then
  export COMPOSE_PROFILES="${COMPOSE_PROFILES:-own-db}"
  docker compose up -d --force-recreate app >/dev/null 2>&1
  for _ in $(seq 1 30); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' presupuestos-app)" = healthy ] && { echo "App recreada y saludable." >&2; exit 0; }
    sleep 3
  done
  echo "La app no quedó saludable; revisar: docker logs --tail 50 presupuestos-app" >&2
  exit 1
fi
echo "Recordatorio: recrear la app para aplicar el cambio (o usar --recreate)." >&2
