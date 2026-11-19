# AtajoLab Presupuestos

Microapp de [AtajoLab](https://atajolab.dev) para crear presupuestos profesionales, descargarlos en PDF y compartirlos con clientes. Dominio objetivo: `https://presupuestos.atajolab.dev`.

## Qué incluye

- Landing comercial pública, SEO, Open Graph, sitemap y robots.
- Editor `/crear` sin registro: emisor, cliente, conceptos (agregar, duplicar, reordenar, eliminar), descuentos, recargos e impuestos manuales, ARS/USD, vista previa y borrador local.
- Motor de cálculo con precisión decimal (`decimal.js`) y pruebas.
- PDF A4 real con seis diseños distintos (1 gratuito + 5 premium), paginación y vista previa con marca de agua.
- Compartir por WhatsApp (enlace con texto; el PDF se adjunta manualmente) y compartir el PDF con el menú nativo del dispositivo.
- Cuentas (Auth.js, argon2id), recuperación de contraseña, sesiones invalidables.
- Plan gratuito con límite mensual aplicado en el servidor, Pack Premium (pago único) y Pro (mensual/anual) con Mercado Pago.
- Dashboard: inicio, presupuestos, clientes, mi negocio, plantillas, mi plan, configuración (exportación y eliminación de cuenta).
- Emails transaccionales con Resend.
- Docker, healthcheck, scripts de despliegue/rollback/backup, CI en GitHub Actions.

Detalle de planes y permisos: [`docs/plans.md`](docs/plans.md).

## Estado

| Área | Estado |
| --- | --- |
| Aplicación, tests, build | Implementado y probado |
| Mercado Pago (Checkout Pro, suscripciones, webhooks) | Implementado y probado **con un doble del proveedor** (incluye `subscription_authorized_payment`). No validado en sandbox ni con cobros reales |
| Resend | Implementado y probado con el SDK simulado. Sin credenciales no se envía nada |
| Infraestructura (Docker, compose, scripts) | **Desplegado** en validación controlada: `https://presupuestos.atajolab.dev` (HTTPS, health OK). Pagos/Resend deshabilitados. Ver [checklist](docs/PRODUCTION_CHECKLIST.md) |
| Facturación electrónica (ARCA) | No implementada: los PDF son presupuestos comerciales sin validez fiscal |

## Desarrollo rápido

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL de desarrollo (puerto 54329)
cp .env.example .env                             # completar DATABASE_URL y AUTH_SECRET
pnpm exec prisma migrate deploy
pnpm dev
```

Guía completa: [`docs/development.md`](docs/development.md).

## Scripts

| Comando | Acción |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Desarrollo, build y servidor |
| `pnpm lint` / `pnpm typecheck` | Calidad estática |
| `pnpm test` | Vitest (unidad e integración; las de base requieren `TEST_DATABASE_URL`) |
| `pnpm test:e2e` | Playwright (usar `E2E_PROD=1` tras `pnpm build` para correr contra producción) |

## Documentación

- [Arquitectura](docs/architecture.md)
- [Desarrollo local](docs/development.md)
- [Despliegue](docs/deploy.md)
- [Mercado Pago](docs/mercadopago.md)
- [Resend](docs/resend.md)
- [Backups y restauración](docs/backups.md)
- [Planes y permisos](docs/plans.md)
- [Plantillas personalizadas y administración](docs/custom-templates.md)
- [Monitoreo](docs/monitoring.md)
- [Retención de datos](docs/retention.md)
- [Checklist de producción (estado real)](docs/PRODUCTION_CHECKLIST.md)
