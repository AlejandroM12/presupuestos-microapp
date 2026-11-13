import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/config/plans";
import {
  ANONYMOUS,
  computeEntitlements,
  decidePdfRender,
  type AccessContext,
} from "./entitlements";

const user = (over: Partial<AccessContext> = {}): AccessContext => ({
  authenticated: true,
  ownsPremiumPack: false,
  proActive: false,
  downloadsThisMonth: 0,
  ...over,
});

describe("computeEntitlements", () => {
  it("plan gratis: solo Minimalista y límite mensual", () => {
    const e = computeEntitlements(user());
    expect(e.templates).toEqual(["minimalista"]);
    expect(e.downloadLimit).toBe(LIMITS.freeMonthlyDownloads);
    expect(e.downloadsRemaining).toBe(LIMITS.freeMonthlyDownloads);
    expect(e.allowCustomColor).toBe(false);
    expect(e.cloudFeatures).toBe(false);
  });

  it("pack premium: 5 diseños y color propio, pero mantiene el límite gratuito", () => {
    const e = computeEntitlements(user({ ownsPremiumPack: true, downloadsThisMonth: 1 }));
    expect(e.templates).toHaveLength(6);
    expect(e.allowCustomColor).toBe(true);
    expect(e.downloadLimit).toBe(LIMITS.freeMonthlyDownloads);
    expect(e.downloadsRemaining).toBe(LIMITS.freeMonthlyDownloads - 1);
    expect(e.cloudFeatures).toBe(false);
  });

  it("pro: todos los diseños, sin límite visible y con funciones de nube", () => {
    const e = computeEntitlements(user({ proActive: true, downloadsThisMonth: 40 }));
    expect(e.templates).toHaveLength(6);
    expect(e.downloadLimit).toBeNull();
    expect(e.cloudFeatures).toBe(true);
  });

  it("nunca devuelve descargas restantes negativas", () => {
    expect(computeEntitlements(user({ downloadsThisMonth: 99 })).downloadsRemaining).toBe(0);
  });
});

describe("decidePdfRender", () => {
  it("anónimo no puede descargar el PDF final (sin la excepción transitoria)", () => {
    expect(decidePdfRender(ANONYMOUS, { templateId: "minimalista", preview: false })).toEqual({
      allowed: false,
      reason: "login_required",
    });
  });

  it("la marca AtajoLab solo va en el diseño gratuito", () => {
    const free = decidePdfRender(user(), { templateId: "minimalista", preview: false });
    expect(free).toMatchObject({ allowed: true, showBrand: true, preview: false });
    const premium = decidePdfRender(user({ ownsPremiumPack: true }), {
      templateId: "ejecutivo",
      preview: false,
    });
    expect(premium).toMatchObject({ allowed: true, showBrand: false, allowCustomColor: true });
  });

  it("bloquea el PDF final de un diseño premium sin licencia", () => {
    expect(decidePdfRender(user(), { templateId: "moderno", preview: false })).toEqual({
      allowed: false,
      reason: "template_locked",
    });
  });

  it("permite la vista previa premium con marca de agua a cualquiera", () => {
    for (const ctx of [ANONYMOUS, user()]) {
      expect(decidePdfRender(ctx, { templateId: "creativo", preview: true })).toMatchObject({
        allowed: true,
        preview: true,
      });
    }
  });

  it("aplica el límite mensual a gratis y pack, pero no a Pro", () => {
    const over = { downloadsThisMonth: LIMITS.freeMonthlyDownloads };
    expect(decidePdfRender(user(over), { templateId: "minimalista", preview: false })).toEqual({
      allowed: false,
      reason: "download_limit_reached",
    });
    expect(
      decidePdfRender(user({ ...over, ownsPremiumPack: true }), {
        templateId: "tecnico",
        preview: false,
      }),
    ).toEqual({ allowed: false, reason: "download_limit_reached" });
    expect(
      decidePdfRender(user({ ...over, proActive: true }), {
        templateId: "tecnico",
        preview: false,
      }),
    ).toMatchObject({ allowed: true });
  });

  it("la vista previa no consume el límite", () => {
    const ctx = user({ downloadsThisMonth: LIMITS.freeMonthlyDownloads });
    expect(decidePdfRender(ctx, { templateId: "minimalista", preview: true })).toMatchObject({
      allowed: true,
    });
  });

  it("rechaza plantillas desconocidas", () => {
    expect(decidePdfRender(user(), { templateId: "hack", preview: false })).toEqual({
      allowed: false,
      reason: "unknown_template",
    });
  });
});
