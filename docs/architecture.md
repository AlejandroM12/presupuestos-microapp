# Arquitectura

Monolito modular en Next.js (App Router) con PostgreSQL y Prisma. Sin microservicios ni colas externas.

```
src/
  app/            Rutas, páginas, server actions y route handlers (presentación)
  components/     UI (marketing, editor, dashboard, billing, ui/)
  domain/         Lógica de negocio pura y probada: cálculo, esquemas Zod, permisos, suscripciones
  services/       Casos de uso con persistencia: presupuestos, clientes, cuenta, billing, PDF
  integrations/   Adaptadores externos: Mercado Pago, Resend
  server/         Infra del servidor: db, autorización, rate limiting, helpers de API
  lib/            Utilidades y configuración (planes y precios en lib/config/plans.ts)
prisma/schema/    Esquema por archivos (auth, quotes, billing) y migraciones versionadas
assets/fonts/     Tipografías (OFL) para los PDF
deploy/           Compose de producción, Caddy, scripts de despliegue/backup
```

## Decisiones clave

- **Dinero**: `decimal.js` con redondeo half-up a 2 decimales por línea y por componente; importes en base como `Decimal`. Ver `domain/quote/calculations.ts`.
- **Permisos en el servidor**: `domain/entitlements.ts` es una función pura (`AccessContext` → permisos) y `services/access.ts` arma el contexto desde la base (compras, suscripciones, descargas). El cliente solo muestra lo que informa `/api/me/entitlements`; cada acción se revalida.
- **Límite de descargas**: `reserveDownload` toma un lock por usuario (`pg_advisory_xact_lock`), cuenta y registra en una transacción; si falla el PDF, se libera.
- **Snapshots**: cada presupuesto guarda los datos de emisor y cliente al momento de guardar; el vínculo al cliente es opcional (`SetNull`).
- **Pagos**: interfaz `PaymentGateway` con implementación sobre el SDK oficial. El estado de un pago **siempre se consulta a la API del proveedor** (webhook y página de retorno); el cuerpo del webhook nunca se usa como verdad. Idempotencia por `WebhookEvent(provider, eventKey)` y por transiciones condicionales en la base.
- **Sesiones**: Auth.js con JWT (el proveedor Credentials no admite sesiones en base). `sessionVersion` en `User` permite invalidar sesiones al cambiar la contraseña; se verifica en cada lectura de sesión.
- **Modo lectura**: sin Pro vigente, los presupuestos guardados se pueden ver y descargar pero no editar (`requireProWrite`).
- **PDF**: `@react-pdf/renderer` en Node (documentos reales, no capturas). Cada plantilla es un componente con composición propia sobre un modelo ya formateado (`services/pdf/model.ts`).
- **Seguridad HTTP**: CSP, HSTS (producción), X-Frame-Options, etc. en `next.config.ts`.

## Rate limiting

Limitador en memoria de ventana fija (`server/rate-limit.ts`): válido para una sola réplica. Si se escala a varias instancias, moverlo a un almacén compartido. Los umbrales de registro, login por IP y PDF se pueden ajustar con `RATE_LIMIT_*` (ver `.env.example`).

## Facturación fiscal

No implementada. La arquitectura admite una futura integración independiente con ARCA (nuevo servicio en `services/` y adaptador en `integrations/`), sin tocar los presupuestos comerciales.
