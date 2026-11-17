import { describe, expect, it } from "vitest";
import { LIMITS, PRICING } from "@/lib/config/plans";
import {
  ANONYMOUS,
  computeEntitlements,
  decidePdfRender,
  monthlyDownloadLimit,
  type AccessContext,
} from "./entitlements";

const user = (over: Partial<AccessContext> = {}): AccessContext => ({
  authenticated: true,
  ownsPremiumPack: false,
  proActive: false,
  downloadsThisMonth: 0,
  ...over,
});

describe("precios congelados", () => {
  it("mantiene los importes comerciales actuales en ARS", () => {
    expect(PRICING.premiumPack).toBe(9900);
    expect(PRICING.proMonthly).toBe(5900);
    expect(PRICING.proYearly).toBe(59000);
  });
});

describe("computeEntitlements", () => {
  it("plan gratis: solo Minimalista y 3 descargas mensuales", () => {
    const e = computeEntitlements(user());
    expect(e.templates).toEqual(["minimalista"]);
    expect(e.downloadLimit).toBe(LIMITS.freeMonthlyDownloads);
    expect(e.downloadCap).toBe(LIMITS.freeMonthlyDownloads);
    expect(e.downloadsRemaining).toBe(LIMITS.freeMonthlyDownloads);
    expect(e.allowCustomColor).toBe(false);
    expect(e.cloudFeatures).toBe(false);
  });

  it("pack premium: 6 diseños, color propio y 20 descargas mensuales", () => {
    const e = computeEntitlements(user({ ownsPremiumPack: true, downloadsThisMonth: 1 }));
    expect(e.templates).toHaveLength(6);
    expect(e.allowCustomColor).toBe(true);
    expect(e.downloadLimit).toBe(LIMITS.premiumPackMonthlyDownloads);
    expect(e.downloadCap).toBe(LIMITS.premiumPackMonthlyDownloads);
    expect(e.downloadsRemaining).toBe(LIMITS.premiumPackMonthlyDownloads - 1);
    expect(e.cloudFeatures).toBe(false);
  });

  it("pro: todos los diseños, sin cupo anunciado y con tope técnico", () => {
    const e = computeEntitlements(user({ proActive: true, downloadsThisMonth: 40 }));
    expect(e.templates).toHaveLength(6);
    expect(e.downloadLimit).toBeNull();
    expect(e.downloadCap).toBe(LIMITS.proHardCeilingMonthly);
    expect(e.cloudFeatures).toBe(true);
  });

  it("Pro + Pack usa el cupo técnico de Pro (no el del pack)", () => {
    expect(
      monthlyDownloadLimit(user({ ownsPremiumPack: true, proActive: true })),
    ).toBe(LIMITS.proHardCeilingMonthly);
  });

  it("Pro sigue pudiendo descargar al superar el umbral de revisión", () => {
    const ctx = user({
      proActive: true,
      downloadsThisMonth: LIMITS.proReviewThresholdMonthly + 50,
    });
    expect(decidePdfRender(ctx, { templateId: "minimalista", preview: false }).allowed).toBe(true);
  });

  it("Pro no se corta en el umbral de revisión, solo en el tope técnico", () => {
    const e = computeEntitlements(
      user({ proActive: true, downloadsThisMonth: LIMITS.proHardCeilingMonthly }),
    );
    expect(e.downloadsRemaining).toBe(0);
    expect(
      decidePdfRender(user({ proActive: true, downloadsThisMonth: LIMITS.proHardCeilingMonthly }), {
        templateId: "minimalista",
        preview: false,
      }),
    ).toEqual({ allowed: false, reason: "download_limit_reached" });
  });

  it("nunca devuelve descargas restantes negativas", () => {
    expect(computeEntitlements(user({ downloadsThisMonth: 99 })).downloadsRemaining).toBe(0);
  });
});

describe("decidePdfRender", () => {
  it("anónimo no puede descargar el PDF final", () => {
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

  it("aplica el límite mensual distinto a gratis, pack y Pro", () => {
    expect(
      decidePdfRender(user({ downloadsThisMonth: LIMITS.freeMonthlyDownloads }), {
        templateId: "minimalista",
        preview: false,
      }),
    ).toEqual({ allowed: false, reason: "download_limit_reached" });

    expect(
      decidePdfRender(
        user({ ownsPremiumPack: true, downloadsThisMonth: LIMITS.freeMonthlyDownloads }),
        { templateId: "tecnico", preview: false },
      ),
    ).toMatchObject({ allowed: true });

    expect(
      decidePdfRender(
        user({
          ownsPremiumPack: true,
          downloadsThisMonth: LIMITS.premiumPackMonthlyDownloads,
        }),
        { templateId: "tecnico", preview: false },
      ),
    ).toEqual({ allowed: false, reason: "download_limit_reached" });

    expect(
      decidePdfRender(
        user({ proActive: true, downloadsThisMonth: LIMITS.premiumPackMonthlyDownloads }),
        { templateId: "tecnico", preview: false },
      ),
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
