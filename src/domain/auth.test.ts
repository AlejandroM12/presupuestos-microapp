import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
  safeNext,
} from "./auth";

describe("registerSchema", () => {
  it("normaliza el email a minúsculas y sin espacios", () => {
    const r = registerSchema.parse({ email: "  Laura@Example.COM ", password: "una-clave-larga" });
    expect(r.email).toBe("laura@example.com");
    expect(r.name).toBe("");
  });

  it("rechaza emails inválidos y contraseñas débiles", () => {
    const r = registerSchema.safeParse({ email: "nope", password: "123" });
    expect(r.success).toBe(false);
    const errors = fieldErrors(r.error!);
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
  });
});

describe("passwordSchema", () => {
  it("exige al menos 8 caracteres", () => {
    expect(passwordSchema.safeParse("corta").success).toBe(false);
    expect(passwordSchema.safeParse("suficiente1").success).toBe(true);
  });

  it("rechaza contraseñas comunes sin importar mayúsculas", () => {
    expect(passwordSchema.safeParse("Password1").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });

  it("rechaza contraseñas de solo espacios y las muy largas", () => {
    expect(passwordSchema.safeParse("        ").success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});

describe("loginSchema / resetPasswordSchema", () => {
  it("login solo exige que haya contraseña", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("el reseteo exige token y una contraseña válida", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "corto", password: "buena-clave-1" }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: "t".repeat(43), password: "buena-clave-1" }).success,
    ).toBe(true);
  });
});

describe("safeNext", () => {
  it("acepta rutas internas con query", () => {
    expect(safeNext("/dashboard/plan?x=1")).toBe("/dashboard/plan?x=1");
  });

  it("descarta destinos externos o ambiguos", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "dashboard",
      "/ok\n/evil",
    ]) {
      expect(safeNext(bad)).toBe("/crear");
    }
  });

  it("usa el valor por defecto cuando falta", () => {
    expect(safeNext(null)).toBe("/crear");
    expect(safeNext(undefined, "/dashboard")).toBe("/dashboard");
  });
});
