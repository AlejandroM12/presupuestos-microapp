# Monitoreo

Liviano, sin stack de observabilidad: un script de cron (`deploy/scripts/monitor.sh`) y alertas por webhook.

## Qué chequea (cada 5 minutos)

| Chequeo | Condición de alerta |
| --- | --- |
| `GET /api/health` | no responde 2xx en 10 s |
| Contenedor `presupuestos-app` | no está `running`, o su `RestartCount` aumentó |
| Disco `/` | uso ≥ `DISK_ALERT_PERCENT` (85 %) |
| Backups | sin `.last_success` o último exitoso hace más de `BACKUP_MAX_AGE_HOURS` (30 h) |

Alerta solo en el cambio a estado fallido y avisa cuando se recupera (no repite cada 5 minutos). Los fallos del propio backup alertan en el momento (`backup.sh`).

## Alertas

`ALERT_WEBHOOK_URL` acepta cualquier destino que reciba un POST: [ntfy](https://ntfy.sh) (texto plano, por defecto) o Slack/Discord (`ALERT_WEBHOOK_FORMAT=json`, campo `text`). Los mensajes no contienen secretos ni datos personales. Si no se define, la alerta solo se imprime en el log del cron.

## Qué NO cubre todavía

- **Webhooks de pagos fallidos**: la app registra `webhook_failed`/`webhook_*` en logs y deja el evento en `WebhookEvent` con estado `FAILED`; no hay alerta automática. Consulta útil:
  `SELECT count(*) FROM webhook_events WHERE status = 'FAILED' AND "receivedAt" > now() - interval '1 day';`
- **Errores de aplicación**: solo logs (`docker logs presupuestos-app`). No hay agregación de errores (Sentry u otro).
- **Monitoreo externo de disponibilidad**: este script corre en el mismo VPS y no detecta una caída total del servidor. Recomendado: un chequeo externo gratuito (por ejemplo UptimeRobot o Better Stack) sobre `https://presupuestos.atajolab.dev/api/health`.
- Uso de CPU/RAM: el contenedor tiene `mem_limit` de 640 MB; no hay alerta por consumo.

## Estado

Validado en local con una URL caída: una sola alerta al fallar, estado persistente y sin repetición. **No ejecutado en el VPS.**
