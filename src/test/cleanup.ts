import { db } from "@/server/db";

/**
 * Borra usuarios de prueba junto con sus pagos y suscripciones. En producción esos registros se
 * conservan anonimizados al eliminar una cuenta; en los tests se limpian explícitamente.
 * También elimina asignaciones, auditoría administrativa y las plantillas privadas de prueba
 * (slug con prefijo `test-`), que deben borrarse antes que los administradores que las crearon.
 */
export async function deleteTestUsers(emailSuffix: string) {
  const where = { user: { email: { endsWith: emailSuffix } } };
  const users = { email: { endsWith: emailSuffix } };
  await db.customTemplateAssignment.deleteMany({
    where: { OR: [{ user: users }, { assignedBy: users }] },
  });
  await db.adminAuditLog.deleteMany({ where: { actor: users } });
  await db.customTemplate.deleteMany({ where: { slug: { startsWith: "test-" } } });
  await db.templatePurchase.deleteMany({ where });
  await db.payment.deleteMany({ where });
  await db.subscription.deleteMany({ where });
  await db.user.deleteMany({ where: users });
}
