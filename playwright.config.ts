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
    command:
      process.env.CI || process.env.E2E_PROD
        ? `pnpm exec next start -p ${port}`
        : `pnpm exec next dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    // Los E2E usan siempre la base de pruebas, nunca la de desarrollo.
    env: {
      ...(process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL } : {}),
      APP_URL: `http://localhost:${port}`,
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-not-for-production-use-0123456789",
      AUTH_TRUST_HOST: "true",
      RATE_LIMIT_REGISTER_PER_HOUR: "1000",
      RATE_LIMIT_PDF_PER_MINUTE: "1000",
    },
    timeout: 120_000,
  },
});
