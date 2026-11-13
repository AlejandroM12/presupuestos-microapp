# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
RUN corepack enable
WORKDIR /app

# --- Dependencias (capa cacheable) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS build
COPY . .
# La URL solo se necesita para generar el cliente; no se conecta durante el build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec prisma generate && pnpm build

# --- Migraciones (job de una sola ejecución) ---
FROM deps AS migrate
COPY prisma ./prisma
COPY prisma.config.ts ./
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# --- Runtime mínimo ---
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/assets ./assets
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
