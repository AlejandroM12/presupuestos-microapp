import { expect, test } from "@playwright/test";
import { signWebhook } from "../src/integrations/mercadopago/test-helpers";

const SECRET = "e2e-webhook-secret";
const payload = { type: "payment", data: { id: "123456" } };

test.describe("pagos (sin credenciales de Mercado Pago)", () => {
  test("el webhook rechaza notificaciones sin firma o con firma inválida", async ({ request }) => {
    const unsigned = await request.post("/api/webhooks/mercadopago?data.id=123456&type=payment", {
      data: payload,
    });
    expect(unsigned.status()).toBe(401);

    const forged = await request.post("/api/webhooks/mercadopago?data.id=123456&type=payment", {
      data: payload,
      headers: {
        "x-request-id": "req-1",
        "x-signature": signWebhook({
          secret: "otro-secreto",
          dataId: "123456",
          requestId: "req-1",
        }),
      },
    });
    expect(forged.status()).toBe(401);
  });

  test("el webhook rechaza una firma vieja (repetición)", async ({ request }) => {
    const old = await request.post("/api/webhooks/mercadopago?data.id=123456&type=payment", {
      data: payload,
      headers: {
        "x-request-id": "req-old",
        "x-signature": signWebhook({
          secret: SECRET,
          dataId: "123456",
          requestId: "req-old",
          ts: Math.floor(Date.now() / 1000) - 3600,
        }),
      },
    });
    expect(old.status()).toBe(401);
  });

  test("con firma válida pero sin proveedor configurado responde 503 para que reintente", async ({
    request,
  }) => {
    const res = await request.post("/api/webhooks/mercadopago?data.id=123456&type=payment", {
      data: payload,
      headers: {
        "x-request-id": `req-${Date.now()}`,
        "x-signature": "",
      },
    });
    expect([401, 503]).toContain(res.status());

    const requestId = `req-${Date.now()}`;
    const signed = await request.post("/api/webhooks/mercadopago?data.id=123456&type=payment", {
      data: payload,
      headers: {
        "x-request-id": requestId,
        "x-signature": signWebhook({ secret: SECRET, dataId: "123456", requestId }),
      },
    });
    expect(signed.status()).toBe(503);
  });

  test("el checkout exige sesión y avisa si los pagos no están habilitados", async ({
    browser,
    request,
  }) => {
    expect((await request.post("/api/billing/pack")).status()).toBe(401);

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/registro?next=/dashboard");
    await page
      .getByLabel("Email")
      .fill(`pay-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.example`);
    await page.getByLabel("Contraseña").fill("clave-e2e-segura-1");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await page.waitForURL((url) => url.pathname === "/dashboard");

    const res = await page.request.post("/api/billing/pack");
    expect(res.status()).toBe(503);
    expect((await res.json()).code).toBe("payments_disabled");
  });

  test("la página de resultado exige sesión y no activa nada por volver", async ({ page }) => {
    await page.goto("/pago/resultado?kind=pack&status=success&payment_id=1");
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test("el botón de compra en el editor lleva al registro si no hay sesión", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/crear");
    await page.getByRole("radio", { name: "Moderno (premium)" }).click();
    const buy = page.getByRole("link", { name: "Comprar Pack Premium" });
    await expect(buy).toBeVisible();
    await expect(buy).toHaveAttribute("href", /\/registro\?next=%2Fcrear/);
    void isMobile;
  });
});
