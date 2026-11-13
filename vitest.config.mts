import { defineConfig } from "vitest/config";
import path from "node:path";

try {
  process.loadEnvFile();
} catch {
  /* sin archivo .env */
}

const testDb = process.env.TEST_DATABASE_URL;

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    passWithNoTests: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globalSetup: testDb ? ["./vitest.global-setup.ts"] : [],
    // Las pruebas de integración nunca tocan la base de desarrollo.
    env: testDb ? { DATABASE_URL: testDb } : {},
    fileParallelism: false,
    coverage: { provider: "v8", include: ["src/domain/**", "src/services/**"] },
  },
});
