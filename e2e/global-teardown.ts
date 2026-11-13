import { Client } from "pg";

/** Elimina las cuentas creadas por los E2E (siempre con el dominio e2e.example). */
export default async function globalTeardown() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`DELETE FROM users WHERE email LIKE '%@e2e.example'`);
  } finally {
    await client.end();
  }
}
