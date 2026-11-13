import { execSync } from "node:child_process";

/** Aplica las migraciones a la base de pruebas antes de ejecutar los tests de integración. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: url },
  });
}
