# Desarrollo local

Requisitos: Node 24, pnpm 11, Docker (para PostgreSQL local).

## Puesta en marcha

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env
```

Completar en `.env`:

- `DATABASE_URL="postgresql://presupuestos:presupuestos_dev@127.0.0.1:54329/presupuestos?schema=public"`
- `AUTH_SECRET` (generar con `openssl rand -base64 32`)
- `APP_URL="http://localhost:3000"`

```bash
pnpm exec prisma migrate deploy
pnpm dev
```

Sin credenciales de Mercado Pago y Resend la app funciona: los pagos quedan deshabilitados y los correos se imprimen en consola (solo fuera de producción).

## Base de datos

- Esquema en `prisma/schema/*.prisma`. Crear una migración: `pnpm exec prisma migrate dev --name <nombre>`.
- Aplicar migraciones existentes: `pnpm exec prisma migrate deploy`.
- Regenerar el cliente: `pnpm exec prisma generate` (se genera en `src/generated`, ignorado por Git).

## Pruebas

Las pruebas de integración usan una base separada. Crearla una vez:

```bash
docker exec presupuestos-dev-db psql -U presupuestos -d postgres -c "CREATE DATABASE presupuestos_test"
```

y definir `TEST_DATABASE_URL` en `.env` apuntando a ella (ver `.env.example`). Vitest aplica las migraciones y nunca usa la base de desarrollo. Sin `TEST_DATABASE_URL`, esas pruebas se omiten.

```bash
pnpm test                  # unidad + integración
pnpm build && E2E_PROD=1 pnpm test:e2e
```

Playwright levanta el servidor con la base de pruebas y secretos de prueba (ver `playwright.config.ts`) y limpia las cuentas `@e2e.example` al terminar.

## Utilidades

- Volcar PDFs de muestra: `PDF_DUMP_DIR=<carpeta> pnpm test pdf` y rasterizarlos con `node scripts/pdf-to-png.mjs <carpeta>`.
- Los precios se configuran en `src/lib/config/plans.ts` (o `PRICE_*_ARS`).
