import { describe, expect, it } from "vitest";
import { canPurchase, salesAllowlist, salesOpen } from "./sales";

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

describe("compuerta comercial", () => {
  it("está cerrada por defecto", () => {
    expect(salesOpen(env({}))).toBe(false);
    expect(canPurchase("cliente@example.com", env({}))).toBe(false);
  });

  it("solo se abre con SALES_ENABLED=true exacto", () => {
    expect(salesOpen(env({ SALES_ENABLED: "true" }))).toBe(true);
    expect(salesOpen(env({ SALES_ENABLED: " TRUE " }))).toBe(true);
    for (const v of ["1", "yes", "false", "", "verdadero"]) {
      expect(salesOpen(env({ SALES_ENABLED: v }))).toBe(false);
    }
  });

  it("con las ventas cerradas solo compran las cuentas autorizadas (sin distinguir mayúsculas)", () => {
    const e = env({ SALES_ALLOWLIST: " Duenio@Example.com , otra@example.com ,basura" });
    expect(salesAllowlist(e)).toEqual(["duenio@example.com", "otra@example.com"]);
    expect(canPurchase("DUENIO@example.com", e)).toBe(true);
    expect(canPurchase("tercero@example.com", e)).toBe(false);
  });

  it("abierto, cualquier cuenta puede comprar", () => {
    expect(canPurchase("cualquiera@example.com", env({ SALES_ENABLED: "true" }))).toBe(true);
  });
});
