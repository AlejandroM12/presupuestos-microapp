import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getMailer } from "@/integrations/email/mailer";
import { passwordChangedEmail, passwordResetEmail } from "@/integrations/email/templates";
import { siteConfig } from "@/lib/config/site";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export class EmailTakenError extends Error {}
export class InvalidResetTokenError extends Error {}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.user.create({
      data: { email: input.email, name: input.name || null, passwordHash },
      select: { id: true, email: true, name: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new EmailTakenError();
    }
    throw err;
  }
}

/**
 * Crea un token de recuperación y envía el correo. Si el email no existe no hace nada:
 * quien llama debe responder siempre lo mismo para no revelar qué cuentas existen.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    }),
  ]);

  const url = `${siteConfig.url}/recuperar/${token}`;
  await getMailer().send(passwordResetEmail(user.email, url));
}

/** Indica si un token es utilizable, sin consumirlo. */
export async function isResetTokenValid(token: string): Promise<boolean> {
  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { usedAt: true, expiresAt: true },
  });
  return !!row && !row.usedAt && row.expiresAt > new Date();
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt <= new Date()) throw new InvalidResetTokenError();

  const passwordHash = await hashPassword(newPassword);
  await db.$transaction(async (tx) => {
    // El updateMany condicional evita que dos solicitudes simultáneas consuman el mismo token.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new InvalidResetTokenError();
    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId, usedAt: null } });
  });

  const user = await db.user.findUnique({ where: { id: row.userId }, select: { email: true } });
  if (user) {
    await getMailer()
      .send(passwordChangedEmail(user.email))
      .catch((e) =>
        console.error("password_changed_email_failed", e instanceof Error ? e.message : "unknown"),
      );
  }
}
