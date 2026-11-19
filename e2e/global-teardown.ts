import { Client } from "pg";

/** Elimina las cuentas creadas por los E2E (siempre con el dominio e2e.example). */
export default async function globalTeardown() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const owned = `"userId" IN (SELECT id FROM users WHERE email LIKE '%@e2e.example')`;
    await client.query(`DELETE FROM template_purchases WHERE ${owned}`);
    await client.query(`DELETE FROM payments WHERE ${owned}`);
    await client.query(`DELETE FROM subscriptions WHERE ${owned}`);
    const e2eUsers = `(SELECT id FROM users WHERE email LIKE '%@e2e.example')`;
    await client.query(
      `DELETE FROM custom_template_assignments WHERE "userId" IN ${e2eUsers} OR "assignedById" IN ${e2eUsers}`,
    );
    await client.query(`DELETE FROM admin_audit_logs WHERE "actorId" IN ${e2eUsers}`);
    await client.query(`DELETE FROM custom_templates WHERE name LIKE '%E2E'`);
    await client.query(`DELETE FROM users WHERE email LIKE '%@e2e.example'`);
  } finally {
    await client.end();
  }
}
