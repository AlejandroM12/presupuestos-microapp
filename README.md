# AtajoLab Presupuestos

Microapp de AtajoLab para crear presupuestos profesionales, descargarlos en PDF y compartirlos con clientes.

## Desarrollo

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Scripts: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Estructura

- `src/app`: rutas y presentación (Next.js App Router).
- `src/domain`: lógica de negocio pura (presupuestos, cálculos, planes).
- `src/services`: casos de uso que coordinan dominio y persistencia.
- `src/integrations`: adaptadores externos (Mercado Pago, Resend).
- `src/server`: acceso a datos, autenticación, autorización.
- `prisma`: esquema y migraciones.
