# Retención y eliminación de datos

> Borrador técnico sujeto a revisión legal y contable. El texto público está en `/legal/retencion` (`src/content/legal.ts`).

## Al eliminar una cuenta (`deleteAccount`)

| Dato | Qué ocurre |
| --- | --- |
| Usuario, perfil de negocio, clientes, presupuestos, sesiones, tokens de reset, uso de descargas | Se **eliminan** (cascade). |
| Compra del Pack (`TemplatePurchase`) | Se elimina (es el beneficio, no el registro contable). |
| Pagos (`Payment`) | Se **conservan anonimizados**: `userId = NULL`. Quedan importe, moneda, estado, fechas y referencias del proveedor. |
| Suscripciones (`Subscription`) | Se **conservan anonimizadas** (`userId = NULL`) y se marcan canceladas. Antes se cancelan en Mercado Pago. |
| Eventos de webhook (`WebhookEvent`) | No están vinculados a la persona; se conservan para auditoría. |

Si luego llega un webhook de un pago/suscripción de una cuenta eliminada (por ejemplo un reembolso), el estado se concilia pero no se otorgan beneficios ni se envían correos.

## Pendiente de definir por el titular

- Plazo de conservación de registros financieros (referencia habitual en Argentina: 10 años para documentación contable; confirmar con el contador).
- Retención de backups (hoy `BACKUP_RETENTION_DAYS`, 14 por defecto): los backups pueden contener datos ya eliminados hasta que rotan. Se debe declarar ese plazo en la política pública.
- Retención de logs.
- No se guarda email ni nombre en los registros de pago, por lo que la anonimización no requiere un paso adicional.
