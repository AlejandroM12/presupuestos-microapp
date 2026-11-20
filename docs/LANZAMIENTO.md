# Lanzamiento comercial

Estado al 2026-11-20. Los precios no cambian: Pack Premium $9.900 ARS (pago único), Pro $5.900/mes o $59.000/año.

## Estado

| Pieza | Estado |
| --- | --- |
| Credenciales de Mercado Pago de **producción** (cuenta MLA/Argentina) | Cargadas; verificadas (Checkout Pro, Suscripciones y Pagos responden) sin generar cargos |
| Webhook `POST /api/webhooks/mercadopago` | Verificado: 401 sin firma / firma inválida / firma vencida; firma válida procesada; evento repetido = `duplicate`; tipos desconocidos ignorados. Falta ver un evento **real** de Mercado Pago |
| **Compuerta comercial** (`SALES_ENABLED`) | **Cerrada.** Con credenciales cargadas, cualquier compra devuelve 403 `sales_closed` en el servidor. Verificado en producción |
| Compra real controlada | Preparada (ver abajo); falta indicar la cuenta autorizada |
| Textos legales | Datos confirmados cargados; borrador hasta resolver los requisitos fiscales y legales (`docs/REQUISITOS_LEGALES_FISCALES.md`) |
| Ventas públicas | **No abiertas** |

## Cómo funciona la compuerta

- `SALES_ENABLED=true` abre las ventas al público. Cualquier otro valor (o ausencia) las cierra.
- `SALES_ALLOWLIST=cuenta@dominio.com` permite comprar **solo** a esas cuentas con las ventas cerradas.
- Webhooks, reembolsos, conciliación horaria y cancelaciones siguen funcionando siempre.
- Se cambia en el VPS con `./scripts/set-secret.sh --recreate SALES_ALLOWLIST` (o `SALES_ENABLED`); no requiere desplegar código.

## Compra real controlada (Pack Premium, $9.900)

Valida el flujo completo con dinero real y una cuenta tuya.

1. **Cuenta de la app y cuenta pagadora**: la cuenta que compra debe estar registrada en producción y su email conviene que **coincida con el email de la cuenta de Mercado Pago pagadora** (que debe ser distinta de la recaudadora; la suscripción se asocia al `payer_email`). Autorizarla con `./scripts/set-secret.sh --recreate SALES_ALLOWLIST` (o pasarme el email y lo hago yo).
2. Iniciar sesión con esa cuenta → **Mi plan** → "Comprar · $9.900" → Checkout Pro.
3. **Pagar desde una cuenta o medio de pago distinto de la cuenta vendedora**: Mercado Pago no permite que el vendedor se pague a sí mismo.
4. Verificar: la página de retorno informa el estado; el Pack aparece activo recién cuando llega el webhook (no por volver a la URL de éxito); llega el correo de confirmación (Resend).
   Estado en el servidor sin exponer datos: `./scripts/billing-status.sh`. Detalle: `SELECT status, amount FROM payments;` y `SELECT status FROM webhook_events ORDER BY "receivedAt" DESC LIMIT 5;` (deben mostrar `APPROVED` y `PROCESSED`).
5. **Reembolso** desde el panel de Mercado Pago (Actividad → el pago → Devolver dinero) y verificar que el Pack se revoca (`REFUNDED`). Es la validación de la reversión de beneficios. Mercado Pago puede retener su comisión en reembolsos: consultar sus condiciones.
6. Opcional: repetir con **Pro mensual** ($5.900): la autorización se hace en Mercado Pago; la primera cuota se cobra con una demora (hasta ~1 hora según la documentación) y recién entonces se activa Pro. Probar luego "Cancelar suscripción" y verificar que el acceso se mantiene hasta fin de período.

Punto a confirmar con el primer cobro recurrente real: que la renovación se vincule a la suscripción (el código procesa `subscription_authorized_payment` y concilia cada hora con `/api/cron/billing`). Registrar el resultado en `docs/mercadopago.md`.

## Apertura de ventas al público

Cuando la compra controlada salió bien **y** los textos legales no tienen datos pendientes:

1. Completar `src/content/legal-data.ts` (lista en la sección siguiente) → commit → CI → despliegue. Al no quedar marcadores, `/legal/*` pasa a mostrarse como final, se indexa y entra al sitemap.
2. Revisar los textos con el contador/asesor.
3. En el VPS: `./scripts/set-secret.sh --recreate SALES_ENABLED` con el valor `true`.
4. Vigilar durante los primeros días: `docker logs presupuestos-app | grep webhook`, la tabla `webhook_events` (sin `FAILED`) y las alertas de ntfy/UptimeRobot.

Para volver a cerrar las ventas: `SALES_ENABLED=false` (misma herramienta). Los compradores existentes conservan lo adquirido.

## Datos legales

Cargados con los datos confirmados el 2026-11-20 (titular, correo de soporte, jurisdicción, política de reembolsos, aviso de precios, Pack permanente, retención de 10 años): ver `docs/REQUISITOS_LEGALES_FISCALES.md`. **Siguen pendientes** y se muestran como `[COMPLETAR]` (los textos permanecen en borrador): domicilio legal, CUIT, condición frente a ARCA, tratamiento de IVA y situación frente a la AAIP. No bloquean la compra controlada, sí la apertura pública de ventas.

## Qué NO se hizo (a propósito)

- No se habilitaron ventas públicas ni se generó ningún cobro (hay 0 pagos y 0 suscripciones en la base).
- La verificación de credenciales creó una única preferencia de Checkout Pro de prueba que **vence en 15 minutos y no se cobra**.
