import { db } from "@/server/db";

/**
 * Borra usuarios de prueba junto con sus pagos y suscripciones. En producción esos registros se
 * conservan anonimizados al eliminar una cuenta; en los tests se limpian explícitamente.
 */
export async function deleteTestUsers(emailSuffix: string) {
  const where = { user: { email: { endsWith: emailSuffix } } };
  await db.templatePurchase.deleteMany({ where });
  await db.payment.deleteMany({ where });
  await db.subscription.deleteMany({ where });
  await db.user.deleteMany({ where: { email: { endsWith: emailSuffix } } });
}
