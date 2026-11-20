import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile();
} catch {
  /* sin archivo .env */
}

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  globalTeardown: "./e2e/global-teardown.ts",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Con `output: "standalone"`, `next start` no sirve: hay que correr el server.js generado.
    command:
      process.env.CI || process.env.E2E_PROD
        ? `node scripts/prepare-standalone.mjs && node .next/standalone/server.js`
        : `pnpm exec next dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    // Los E2E usan siempre la base de pruebas, nunca la de desarrollo.
    env: {
      ...(process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL } : {}),
      APP_URL: `http://localhost:${port}`,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-not-for-production-use-0123456789",
      AUTH_TRUST_HOST: "true",
      RATE_LIMIT_REGISTER_PER_HOUR: "1000",
      RATE_LIMIT_PDF_PER_MINUTE: "1000",
      RATE_LIMIT_PREVIEW_PER_MINUTE: "1000",
      // Número de PRUEBA para los CTA de la landing (no es el número comercial).
      ATAJOLAB_WHATSAPP_E164: "5491100000000",
      MERCADOPAGO_WEBHOOK_SECRET: "e2e-webhook-secret",
      MERCADOPAGO_ACCESS_TOKEN: "",
      // Las pruebas ejercitan los flujos de compra con las ventas abiertas (la compuerta se prueba en Vitest).
      SALES_ENABLED: "true",
      RATE_LIMIT_LOGIN_PER_IP: "10000",
      CRON_SECRET: "e2e-cron-secret",
    },
    timeout: 120_000,
  },
});
