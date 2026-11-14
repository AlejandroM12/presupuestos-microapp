import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setMailer, type EmailMessage } from "@/integrations/email/mailer";
import { verifyPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { deleteTestUsers } from "@/test/cleanup";
import {
  EmailTakenError,
  hashToken,
  InvalidResetTokenError,
  isResetTokenValid,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "./auth";

const enabled = !!process.env.TEST_DATABASE_URL;
const DOMAIN = "@auth-test.example";

const sent: EmailMessage[] = [];
const email = (n: string) => `${n}${DOMAIN}`;

function tokenFromEmail(message: EmailMessage): string {
  const match = /\/recuperar\/([A-Za-z0-9_-]+)/.exec(message.text);
  if (!match) throw new Error("el correo no contiene el enlace");
  return match[1];
}

describe.skipIf(!enabled)("servicios de autenticación (PostgreSQL)", () => {
  beforeEach(() => {
    sent.length = 0;
    setMailer({ send: async (m) => void sent.push(m) });
  });

  afterEach(async () => {
    setMailer(null);
    await deleteTestUsers(DOMAIN);
  });

  it("registra usuarios con contraseña hasheada", async () => {
    const user = await registerUser({
      name: "Laura",
      email: email("a"),
      password: "clave-segura-1",
    });
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
    expect(row.passwordHash).not.toContain("clave-segura-1");
    expect(await verifyPassword(row.passwordHash!, "clave-segura-1")).toBe(true);
  });

  it("rechaza emails duplicados", async () => {
    await registerUser({ name: "", email: email("dup"), password: "clave-segura-1" });
    await expect(
      registerUser({ name: "", email: email("dup"), password: "otra-clave-2" }),
    ).rejects.toBeInstanceOf(EmailTakenError);
  });

  it("envía el enlace de recuperación y guarda solo el hash del token", async () => {
    await registerUser({ name: "", email: email("r"), password: "clave-segura-1" });
    await requestPasswordReset(email("r"));
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(email("r"));
    const token = tokenFromEmail(sent[0]);
    const rows = await db.passwordResetToken.findMany();
    expect(rows.some((r) => r.tokenHash === hashToken(token))).toBe(true);
    expect(rows.some((r) => r.tokenHash === token)).toBe(false);
    expect(await isResetTokenValid(token)).toBe(true);
  });

  it("no envía nada ni falla si el email no existe", async () => {
    await expect(requestPasswordReset(email("nadie"))).resolves.toBeUndefined();
    expect(sent).toHaveLength(0);
  });

  it("un nuevo pedido invalida el enlace anterior", async () => {
    await registerUser({ name: "", email: email("two"), password: "clave-segura-1" });
    await requestPasswordReset(email("two"));
    await requestPasswordReset(email("two"));
    expect(await isResetTokenValid(tokenFromEmail(sent[0]))).toBe(false);
    expect(await isResetTokenValid(tokenFromEmail(sent[1]))).toBe(true);
  });

  it("cambia la contraseña, invalida sesiones y consume el token", async () => {
    const user = await registerUser({ name: "", email: email("c"), password: "clave-segura-1" });
    await requestPasswordReset(email("c"));
    const token = tokenFromEmail(sent[0]);

    await resetPassword(token, "nueva-clave-2");

    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword(row.passwordHash!, "nueva-clave-2")).toBe(true);
    expect(await verifyPassword(row.passwordHash!, "clave-segura-1")).toBe(false);
    expect(row.sessionVersion).toBe(1);
    await expect(resetPassword(token, "otra-mas-3")).rejects.toBeInstanceOf(InvalidResetTokenError);
  });

  it("rechaza tokens vencidos e inexistentes", async () => {
    await registerUser({ name: "", email: email("exp"), password: "clave-segura-1" });
    await requestPasswordReset(email("exp"));
    const token = tokenFromEmail(sent[0]);
    await db.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await isResetTokenValid(token)).toBe(false);
    await expect(resetPassword(token, "nueva-clave-2")).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
    await expect(resetPassword("x".repeat(43), "nueva-clave-2")).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it("con dos solicitudes simultáneas solo una consume el token", async () => {
    await registerUser({ name: "", email: email("race"), password: "clave-segura-1" });
    await requestPasswordReset(email("race"));
    const token = tokenFromEmail(sent[0]);
    const results = await Promise.allSettled([
      resetPassword(token, "nueva-clave-2"),
      resetPassword(token, "nueva-clave-3"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});
