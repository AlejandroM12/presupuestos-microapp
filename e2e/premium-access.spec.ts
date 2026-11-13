import { expect, test } from "@playwright/test";

const quote = (templateId: string) => ({
  number: "0001",
  date: "2026-05-10",
  validityDays: 15,
  title: "Trabajo",
  description: "",
  currency: "ARS",
  notes: "",
  terms: "",
  deliveryTime: "",
  paymentTerms: "",
  issuer: { businessName: "Electro Sur", logo: "" },
  customer: { name: "Laura" },
  items: [
    {
      id: "a",
      description: "Tablero",
      quantity: "1",
      unit: "Unidad",
      unitPrice: "1000",
      discountPercent: "0",
    },
  ],
  globalDiscount: { type: "percent", value: "0" },
  surcharge: { type: "percent", value: "0" },
  taxes: [],
  templateId,
  accentColor: "#ff0000",
});

test.describe("permisos de diseños premium", () => {
  test("el PDF final exige cuenta, también para el diseño gratuito", async ({ request }) => {
    const res = await request.post("/api/quotes/pdf", { data: quote("minimalista") });
    expect(res.status()).toBe(401);
    expect((await res.json()).code).toBe("login_required");
  });

  test("el servidor rechaza el PDF final premium sin licencia", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/registro?next=/dashboard");
    await page
      .getByLabel("Email")
      .fill(`prem-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.example`);
    await page.getByLabel("Contraseña").fill("clave-e2e-segura-1");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await page.waitForURL((url) => url.pathname === "/dashboard");
    const res = await page.request.post("/api/quotes/pdf", { data: quote("ejecutivo") });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe("template_locked");
    // la vista previa sí está disponible y no consume descargas
    expect(
      (await page.request.post("/api/quotes/pdf?preview=1", { data: quote("ejecutivo") })).status(),
    ).toBe(200);
  });

  test("el servidor entrega la vista previa premium con marca de agua", async ({ request }) => {
    const res = await request.post("/api/quotes/pdf?preview=1", { data: quote("moderno") });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toContain("inline");
  });

  test("el servidor rechaza diseños inexistentes y datos inválidos", async ({ request }) => {
    expect((await request.post("/api/quotes/pdf", { data: quote("inventado") })).status()).toBe(
      400,
    );
    expect((await request.post("/api/quotes/pdf", { data: { foo: 1 } })).status()).toBe(422);
  });

  test("las entitlements anónimas solo incluyen el diseño gratuito", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    const body = await res.json();
    expect(body.templates).toEqual(["minimalista"]);
    expect(body.allowCustomColor).toBe(false);
  });

  test("la interfaz bloquea la descarga de un diseño premium", async ({ page, isMobile }) => {
    await page.goto("/crear");
    await page.getByRole("radio", { name: "Ejecutivo (premium)" }).click();
    await expect(page.getByText("es un diseño premium")).toBeVisible();
    await expect(page.getByLabel("Color de acento")).toBeDisabled();
    if (isMobile) await page.getByRole("tab", { name: "Vista previa" }).click();
    await expect(page.getByRole("button", { name: "Crear cuenta para descargar" })).toBeDisabled();
  });
});
