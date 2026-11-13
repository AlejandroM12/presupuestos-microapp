import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("genera hashes argon2id distintos para la misma contraseña", async () => {
    const [a, b] = await Promise.all([
      hashPassword("mi-clave-segura"),
      hashPassword("mi-clave-segura"),
    ]);
    expect(a).toMatch(/^\$argon2id\$/);
    expect(a).not.toBe(b);
  });

  it("verifica la contraseña correcta y rechaza la incorrecta", async () => {
    const hash = await hashPassword("mi-clave-segura");
    expect(await verifyPassword(hash, "mi-clave-segura")).toBe(true);
    expect(await verifyPassword(hash, "otra-clave")).toBe(false);
  });

  it("devuelve false ante un hash corrupto en lugar de lanzar", async () => {
    expect(await verifyPassword("no-es-un-hash", "x")).toBe(false);
  });
});
