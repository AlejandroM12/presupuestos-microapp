import { defineConfig } from "prisma/config";

try {
  // Prisma 7 no carga .env por su cuenta; en producción las variables vienen del entorno.
  process.loadEnvFile();
} catch {
  /* sin archivo .env */
}

export default defineConfig({
  schema: "prisma/schema",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
