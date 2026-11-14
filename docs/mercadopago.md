# Mercado Pago

> **Estado**: implementado y probado con un doble del proveedor (`FakeGateway`) y con el validador de firmas oficial. **No se verificó con credenciales ni cobros reales.** No habilitar cobros reales hasta completar la lista de verificación de abajo.

## Qué cubre

- **Pack Premium**: Checkout Pro (preferencia de pago). Precio e identificador de referencia definidos por el servidor.
- **Pro mensual/anual**: suscripciones (preapproval) con frecuencia 1 o 12 meses.
- **Webhook** `POST /api/webhooks/mercadopago`: valida `x-signature` (HMAC, tolerancia de 5 minutos), persiste el evento (`WebhookEvent`), consulta el estado real a la API y aplica el resultado de forma idempotente. Responde 5xx ante fallos para que Mercado Pago reintente.
- **Página de retorno** `/pago/resultado`: no activa nada por sí sola; si trae `payment_id`/`preapproval_id` verifica contra la API (solo recursos del usuario logueado).
- **Conciliación**: `POST /api/cron/billing` (ver `docs/deploy.md`).

## Configuración

1. Crear una aplicación en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers) (Argentina).
2. Variables: `MERCADOPAGO_ACCESS_TOKEN` (usar primero las credenciales de **prueba**) y `MERCADOPAGO_WEBHOOK_SECRET` (clave secreta de la sección Webhooks).
3. En Webhooks, URL `https://presupuestos.atajolab.dev/api/webhooks/mercadopago` y eventos: **Pagos** y **Planes y suscripciones** (`subscription_preapproval`).
4. `APP_URL` debe ser `https` y público: Mercado Pago rechaza `auto_return` y `notification_url` con URLs locales (la app los omite si `APP_URL` no es https).

## Cómo se tratan los pagos

- El importe esperado se compara con el informado por el proveedor; si difiere, **no se activa** y el evento queda `FAILED`.
- Un mismo `payment_id` no puede asociarse a dos compras.
- Reembolso/contracargo: el Pack se revoca; en suscripciones se corta el acceso.
- Pro se otorga recién con el primer cobro **aprobado**; cada renovación extiende desde el fin del período vigente. Cobro rechazado → `PAST_DUE` (se conserva lo ya pagado). Cancelar mantiene el acceso hasta el fin del período.
- Cambio de plan: el tiempo pagado se conserva y se cancela la renovación del plan anterior.
- Nunca se guardan datos de tarjetas.

## Lista de verificación antes de cobrar de verdad

- [ ] Completar un pago de prueba del Pack con un usuario de prueba y confirmar activación y email.
- [ ] Completar alta, renovación (simulada) y cancelación de una suscripción de prueba.
- [ ] Confirmar que llegan los webhooks firmados al VPS (ver logs `webhook_*`).
- [ ] Verificar el campo que informa Mercado Pago como referencia en los cobros recurrentes (la lógica asume que repite el `external_reference` de la suscripción) y ajustar `services/subscriptions.ts` si difiere.
- [ ] Cambiar a credenciales de producción y repetir con un pago real de bajo importe.

## Hallazgos de la documentación oficial (sin validar en sandbox)

Revisado el 2026-11-13 en la documentación de Mercado Pago (suscripciones sin plan asociado, `authorized_payments`):

- Las cuotas de una suscripción son recursos `authorized_payments` con `preapproval_id`, `external_reference`, `debit_date`, `retry_attempt` y un objeto `payment` anidado.
- Hay un tema de webhook propio, `subscription_authorized_payment`, además de `subscription_preapproval` y `payments`. **Hoy la app solo procesa `payment` y `subscription_preapproval`**; los eventos de `subscription_authorized_payment` se persisten pero no se procesan. Los cobros recurrentes se vinculan hoy por `external_reference`/`metadata.preapproval_id` del pago: **supuesto sin confirmar**. Si en sandbox el pago de la renovación no trae esa referencia, hay que consultar `authorized_payments/{id}` y vincular por `preapproval_id`.
- Reintentos del proveedor: una cuota rechazada entra en `recycling` con hasta 4 reintentos; tras 3 rechazos la suscripción se cancela y se notifica. La app trata el rechazo como `PAST_DUE` y mantiene el acceso hasta el fin del período ya pagado; la cancelación final llega por `subscription_preapproval`.
- Al alta, Mercado Pago valida la tarjeta con un cargo pequeño y la primera cuota se cobra aproximadamente una hora después: Pro **no** se activa de inmediato en el alta, solo con el primer cobro aprobado.

Antes de cobrar: habilitar también el tema `subscription_authorized_payment` en el panel y confirmar en sandbox el cuerpo real de cada notificación.
