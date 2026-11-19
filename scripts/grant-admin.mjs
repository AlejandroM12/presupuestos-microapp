/**
 * Asigna el rol ADMIN a un usuario existente por email.
 * Uso (local o en el contenedor migrate/app con DATABASE_URL):
 *   node scripts/grant-admin.mjs usuario@ejemplo.com
 *
 * No crea usuarios ni contraseñas. No hay admin por defecto.
 */
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Uso: node scripts/grant-admin.mjs <email>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No existe un usuario con email ${email}`);
    process.exit(1);
  }
  if (user.role === "ADMIN") {
    console.log(`Ya es ADMIN: ${email} (${user.id})`);
    process.exit(0);
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await prisma.adminAuditLog.create({
    data: {
      actorId: user.id,
      action: "ADMIN_ROLE_GRANT",
      targetType: "user",
      targetId: user.id,
      metadata: { via: "grant-admin.mjs", email },
    },
  });
  console.log(`ADMIN otorgado a ${email} (${user.id})`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
