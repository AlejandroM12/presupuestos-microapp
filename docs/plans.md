# Planes y permisos

Precios y límites centralizados en `src/lib/config/plans.ts` (los precios se pueden sobrescribir con `PRICE_PREMIUM_PACK_ARS`, `PRICE_PRO_MONTHLY_ARS`, `PRICE_PRO_YEARLY_ARS`). Los permisos se calculan en el servidor (`src/domain/entitlements.ts`).

| | Sin cuenta | Gratis | Pack Premium | Pro |
| --- | --- | --- | --- | --- |
| Precio | — | $0 | $9.900 ARS único | $5.900/mes o $59.000/año |
| Editor y vista previa | Sí | Sí | Sí | Sí |
| Descargar PDF final | No (requiere cuenta) | 3 por mes | 3 por mes | Sin límite anunciado (uso razonable: 500/mes) |
| Diseño Minimalista | Vista previa | Sí (con marca AtajoLab) | Sí | Sí |
| 5 diseños premium | Vista previa con marca de agua | Vista previa | Sí, permanente, sin marca | Sí, sin marca |
| Colores personalizados | No | No | Sí | Sí |
| Historial en la nube, clientes, estados, duplicar, dashboard | No | No | No | Sí |

Notas:

- El límite mensual se cuenta por usuario y mes calendario (UTC) en la tabla `DownloadUsage`, con reserva atómica. La vista previa no cuenta.
- La marca de AtajoLab aparece únicamente en el diseño gratuito.
- Al cancelar Pro: la cuenta, las compras únicas y los presupuestos guardados (en modo lectura) se conservan; las funciones de Pro se pierden al finalizar el período pagado.
- Al vencer un cobro de Pro, el acceso continúa hasta el fin del período ya pagado.
- Los PDF son presupuestos comerciales: no son facturas ni tienen validez fiscal.
