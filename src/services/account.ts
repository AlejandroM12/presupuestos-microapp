import { z } from "zod";
import { passwordSchema } from "@/domain/auth";
import { getMailer } from "@/integrations/email/mailer";
import { passwordChangedEmail } from "@/integrations/email/templates";
import { getGateway } from "@/integrations/mercadopago";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { getQuote, NotFoundError } from "./quotes";

export class WrongPasswordError extends Error {
  constructor() {
    super("La contraseña actual no es correcta");
  }
}

export const nameSchema = z.string().trim().max(120, "Nombre demasiado largo");

export async function updateName(userId: string, name: unknown) {
  const parsed = nameSchema.parse(name);
  await db.user.update({ where: { id: userId }, data: { name: parsed || null } });
}

async function verifyCurrent(userId: string, password: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
    throw new WrongPasswordError();
  }
}

/** Cambia la contraseña e invalida todas las sesiones abiertas (incluida la actual). */
export async function changePassword(userId: string, current: string, next: unknown) {
  const parsed = passwordSchema.parse(next);
  await verifyCurrent(userId, current);
  await db.user
    .update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(parsed), sessionVersion: { increment: 1 } },
      select: { email: true },
    })
    .then((u) =>
      getMailer()
        .send(passwordChangedEmail(u.email))
        .catch((e) =>
          console.error(
            "password_changed_email_failed",
            e instanceof Error ? e.message : "unknown",
          ),
        ),
    );
}

/**
 * Elimina la cuenta y todos sus datos. Antes intenta cancelar las suscripciones en Mercado Pago
 * para que no se sigan cobrando renovaciones.
 */
export async function deleteAccount(userId: string, password: string) {
  await verifyCurrent(userId, password);

  const gateway = getGateway();
  if (gateway) {
    const subs = await db.subscription.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "PAST_DUE"] },
        providerSubscriptionId: { not: null },
      },
      select: { providerSubscriptionId: true },
    });
    for (const sub of subs) {
      await gateway.cancelSubscription(sub.providerSubscriptionId!).catch((e) => {
        console.error("account_delete_cancel_failed", e instanceof Error ? e.message : "unknown");
      });
    }
  }

  await db.$transaction([
    db.templatePurchase.deleteMany({ where: { userId } }),
    db.payment.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);
}

/** Exportación de los datos de la persona en formato JSON (sin secretos ni hashes). */
export async function exportUserData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) throw new NotFoundError("Cuenta");

  const [profile, customers, quotes, payments, subscriptions, purchases, downloads] =
    await Promise.all([
      db.businessProfile.findUnique({ where: { userId } }),
      db.customer.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      db.quote.findMany({ where: { userId }, select: { id: true }, orderBy: { createdAt: "asc" } }),
      db.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { kind: true, amount: true, currency: true, status: true, createdAt: true },
      }),
      db.subscription.findMany({
        where: { userId },
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
          canceledAt: true,
          createdAt: true,
        },
      }),
      db.templatePurchase.findMany({
        where: { userId },
        select: { product: true, grantedAt: true },
      }),
      db.downloadUsage.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { periodKey: true, templateId: true, createdAt: true },
      }),
    ]);

  const fullQuotes = [];
  for (const { id } of quotes) {
    const q = await getQuote(userId, id);
    fullQuotes.push({ id, status: q.status, ...q.draft });
  }

  return {
    exportedAt: new Date().toISOString(),
    user,
    businessProfile: profile,
    customers,
    quotes: fullQuotes,
    payments,
    subscriptions,
    purchases,
    downloads,
  };
}
