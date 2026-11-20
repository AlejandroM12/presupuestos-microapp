# Mercado Pago

> **Estado (2026-11-20)**: credenciales de **producción** cargadas y verificadas contra la API (Checkout Pro, Suscripciones y Pagos responden; cuenta de Argentina), sin cargos. Webhook verificado de punta a punta con notificaciones firmadas de prueba. **Las ventas están cerradas** por la compuerta `SALES_ENABLED` (ver `docs/LANZAMIENTO.md`). Falta validar un cobro y un reembolso **reales** (compra controlada).

## Qué cubre

- **Pack Premium**: Checkout Pro (preferencia de pago). Precio e identificador de referencia definidos por el servidor.
- **Pro mensual/anual**: suscripciones (preapproval) con frecuencia 1 o 12 meses.
- **Webhook** `POST /api/webhooks/mercadopago`: valida `x-signature` (HMAC, tolerancia de 5 minutos), persiste el evento (`WebhookEvent`), consulta el estado real a la API y aplica el resultado de forma idempotente. Responde 5xx ante fallos para que Mercado Pago reintente.
- **Página de retorno** `/pago/resultado`: no activa nada por sí sola; si trae `payment_id`/`preapproval_id` verifica contra la API (solo recursos del usuario logueado).
- **Conciliación**: `POST /api/cron/billing` (ver `docs/deploy.md`).

## Configuración

1. Crear una aplicación en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers) (Argentina).
2. Variables: `MERCADOPAGO_ACCESS_TOKEN` (usar primero las credenciales de **prueba**) y `MERCADOPAGO_WEBHOOK_SECRET` (clave secreta de la sección Webhooks).
3. En Webhooks, URL `https://presupuestos.atajolab.dev/api/webhooks/mercadopago` y eventos: **Pagos** (`payment`), **Planes y suscripciones** (`subscription_preapproval`) y **cobros recurrentes** (`subscription_authorized_payment`).
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
- [ ] Verificar en sandbox que el cuerpo real de `authorized_payments` trae `preapproval_id` y, cuando corresponda, `payment.id`/`payment.status` (la app ya consulta ese recurso; no confía en el body del webhook).
- [ ] Cambiar a credenciales de producción y repetir con un pago real de bajo importe.

## Cobros recurrentes (`subscription_authorized_payment`)

Implementado según la documentación oficial (revisada 2026-11-17):

1. El webhook se autentica y se registra (idempotencia por `requestId:type:dataId`).
2. Se consulta `GET /authorized_payments/{id}` (el SDK Node no expone este cliente; se usa la API REST documentada con el mismo access token).
3. Si la cuota aún no tiene `payment` anidado (p. ej. `scheduled` sin débito), el evento se ignora hasta una notificación posterior.
4. Con cobro anidado, se aplica la misma lógica de Pro que un pago: vínculo por `preapproval_id` y/o `external_reference`, validación de importe/moneda, activación/renovación, `PAST_DUE` ante rechazo, idempotencia por `providerPaymentId`.
5. Los temas `payment` y `subscription_preapproval` siguen activos (alta, cancelación, reembolsos vía pago).

## Hallazgos de la documentación oficial (parcialmente sin validar en sandbox)

Revisado en la documentación de Mercado Pago (suscripciones, `authorized_payments`):

- Las cuotas son recursos `authorized_payments` con `preapproval_id`, `external_reference`, `debit_date`, `retry_attempt` y un objeto `payment` anidado.
- La app procesa `payment`, `subscription_preapproval` y `subscription_authorized_payment`.
- Reintentos del proveedor: una cuota rechazada entra en `recycling` con hasta 4 reintentos; tras 3 rechazos la suscripción se cancela y se notifica. La app trata el rechazo como `PAST_DUE` y mantiene el acceso hasta el fin del período ya pagado; la cancelación final llega por `subscription_preapproval`.
- Al alta, Mercado Pago valida la tarjeta con un cargo pequeño y la primera cuota se cobra aproximadamente una hora después: Pro **no** se activa de inmediato en el alta, solo con el primer cobro aprobado.

**Pendiente de sandbox**: confirmar con credenciales de prueba el payload real y el orden de notificaciones. Los cobros productivos siguen deshabilitados hasta completar la lista de verificación.

## Verificación de producción (2026-11-20)

- Token `APP_USR` (producción), sitio MLA. `GET /users/me`, `/v1/payment_methods`, `/preapproval/search` y `/v1/payments/search` responden 200; `POST /preapproval` con datos inválidos responde 400 (la API de suscripciones es accesible); `POST /checkout/preferences` devuelve 201 con checkout en `www.mercadopago.com.ar` (preferencia de prueba con vencimiento a los 15 minutos, no cobra).
- Webhook (desde el contenedor, con el secreto real sin imprimirlo): sin firma, firma inválida o vencida → 401; firma válida con pago inexistente → `ignored` (consulta real a la API); tipo desconocido → `ignored`; mismo evento repetido → `duplicate`. Por HTTPS público sin firma → 401.
- La cuenta de Mercado Pago ya tenía movimientos previos (`/v1/payments/search` informa pagos anteriores): los pagos cuyo `external_reference` no pertenece a la app se ignoran, por lo que no se mezclan.
- Eventos habilitados en el panel: Pagos y Planes y suscripciones (incluye `subscription_preapproval` y los pagos de suscripciones). Se puede usar "Simular notificación" del panel para ver un evento real firmado en `webhook_events`.
- Las preferencias envían su propia `notification_url`; las suscripciones usan la URL configurada en el panel.
