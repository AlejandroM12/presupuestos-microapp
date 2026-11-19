import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { defaultQuote } from "@/domain/quote/defaults";
import type { QuoteDraft } from "@/domain/quote/schema";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { deleteTestUsers } from "@/test/cleanup";
import {
  changePassword,
  AdminAccountError,
  deleteAccount,
  exportUserData,
  updateName,
  WrongPasswordError,
} from "./account";
import { createCustomer } from "./customers";
import { createQuote } from "./quotes";

const enabled = !!process.env.TEST_DATABASE_URL;
const DOMAIN = "@account-test.example";

function sample(): QuoteDraft {
  const q = defaultQuote(new Date(2026, 4, 10));
  q.title = "Trabajo";
  q.issuer.businessName = "Electro Sur";
  q.customer.name = "Laura";
  q.items[0] = { ...q.items[0], description: "Tablero", unitPrice: "1000" };
  return q;
}

describe.skipIf(!enabled)("cuenta del usuario (PostgreSQL)", () => {
  let userId: string;
  let otherId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("clave-actual-1");
    userId = (await db.user.create({ data: { email: `me${DOMAIN}`, passwordHash } })).id;
    otherId = (await db.user.create({ data: { email: `other${DOMAIN}`, passwordHash: "x" } })).id;
  });

  afterAll(async () => {
    await deleteTestUsers(DOMAIN);
    await db.payment.deleteMany({
      where: { externalReference: { startsWith: "ref-" }, userId: null },
    });
  });

  it("actualiza el nombre", async () => {
    await updateName(userId, "  Laura  ");
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).name).toBe("Laura");
    await updateName(userId, "");
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).name).toBeNull();
  });

  it("cambiar la contraseña exige la actual e invalida las sesiones", async () => {
    await expect(changePassword(userId, "equivocada", "nueva-clave-2")).rejects.toBeInstanceOf(
      WrongPasswordError,
    );
    await expect(changePassword(userId, "clave-actual-1", "123")).rejects.toThrow();
    const before = await db.user.findUniqueOrThrow({ where: { id: userId } });

    await changePassword(userId, "clave-actual-1", "nueva-clave-2");

    const after = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(await verifyPassword(after.passwordHash!, "nueva-clave-2")).toBe(true);
    expect(await verifyPassword(after.passwordHash!, "clave-actual-1")).toBe(false);
  });

  it("exporta los datos propios sin incluir secretos ni datos ajenos", async () => {
    await createCustomer(userId, { name: "Cliente propio" });
    await createQuote(userId, sample());
    await createQuote(otherId, { ...sample(), title: "De otro usuario" });

    const data = await exportUserData(userId);
    const json = JSON.stringify(data);

    expect(data.user.email).toBe(`me${DOMAIN}`);
    expect(data.customers.map((c) => c.name)).toEqual(["Cliente propio"]);
    expect(data.quotes).toHaveLength(1);
    expect(data.quotes[0].title).toBe("Trabajo");
    expect(json).not.toContain("passwordHash");
    expect(json).not.toContain("argon2");
    expect(json).not.toContain("De otro usuario");
  });

  it("eliminar la cuenta exige la contraseña, borra los datos personales y conserva los pagos anonimizados", async () => {
    const victim = await db.user.create({
      data: { email: `victim${DOMAIN}`, passwordHash: await hashPassword("borrame-ya-1") },
    });
    await createQuote(victim.id, sample());
    await createCustomer(victim.id, { name: "C" });
    const payment = await db.payment.create({
      data: {
        userId: victim.id,
        kind: "PREMIUM_PACK",
        externalReference: `ref-${victim.id}`,
        amount: "9900",
        status: "APPROVED",
      },
    });
    await db.templatePurchase.create({
      data: { userId: victim.id, product: "premium_pack", paymentId: payment.id },
    });
    await db.downloadUsage.create({
      data: { userId: victim.id, periodKey: "2026-06", templateId: "minimalista" },
    });

    await expect(deleteAccount(victim.id, "incorrecta")).rejects.toBeInstanceOf(WrongPasswordError);
    expect(await db.user.count({ where: { id: victim.id } })).toBe(1);

    await deleteAccount(victim.id, "borrame-ya-1");

    expect(await db.user.count({ where: { id: victim.id } })).toBe(0);
    for (const count of [
      db.quote.count({ where: { userId: victim.id } }),
      db.customer.count({ where: { userId: victim.id } }),
      db.templatePurchase.count({ where: { userId: victim.id } }),
      db.downloadUsage.count({ where: { userId: victim.id } }),
    ]) {
      expect(await count).toBe(0);
    }
    // el registro financiero se conserva, sin vínculo con la persona
    const kept = await db.payment.findUniqueOrThrow({
      where: { externalReference: `ref-${victim.id}` },
    });
    expect(kept.userId).toBeNull();
    expect(kept.status).toBe("APPROVED");
    expect(String(kept.amount)).toBe("9900");
    // los datos de otros usuarios no se tocan
    expect(await db.user.count({ where: { id: otherId } })).toBe(1);
  });

  it("una cuenta con rol de administrador no puede eliminarse", async () => {
    const admin = await db.user.create({
      data: {
        email: `adm${DOMAIN}`,
        passwordHash: await hashPassword("admin-clave-1"),
        role: "ADMIN",
      },
    });
    await expect(deleteAccount(admin.id, "admin-clave-1")).rejects.toBeInstanceOf(
      AdminAccountError,
    );
    expect(await db.user.count({ where: { id: admin.id } })).toBe(1);
  });
});
