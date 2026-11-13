import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "clave-e2e-segura-1";
const unique = (tag: string) =>
  `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.example`;

const quote = {
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
  issuer: { businessName: "Electro Sur" },
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
  templateId: "minimalista",
  accentColor: "",
};

async function fillQuote(page: Page, isMobile: boolean) {
  await page.getByLabel("Nombre comercial").fill("Electro Sur");
  await page.getByLabel("Nombre", { exact: true }).fill("Laura Benítez");
  await page.getByLabel("Título").fill("Instalación eléctrica");
  await page.getByLabel("Descripción", { exact: true }).fill("Tablero principal");
  await page.getByLabel("Precio unitario").fill("1000");
  if (isMobile) await page.getByRole("tab", { name: "Vista previa" }).click();
}

test.describe("plan gratuito", () => {
  test("sin cuenta se puede armar pero la descarga lleva al registro y conserva el borrador", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/crear");
    await fillQuote(page, isMobile);
    await expect(page.getByTestId("download-usage")).toContainText("necesitás una cuenta gratuita");

    await page.getByRole("button", { name: "Crear cuenta para descargar" }).click();
    await expect(page).toHaveURL(/\/registro\?next=%2Fcrear$/);

    await page.getByLabel("Email").fill(unique("draft"));
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/crear$/);

    await expect(page.getByText("Retomamos el borrador")).toBeVisible();
    await expect(page.getByLabel("Nombre comercial")).toHaveValue("Electro Sur");
  });

  test("con cuenta descarga hasta 3 PDF por mes y luego se bloquea", async ({ page, isMobile }) => {
    await page.goto("/registro?next=/crear");
    await page.getByLabel("Email").fill(unique("limit"));
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await page.waitForURL((url) => url.pathname === "/crear");

    await fillQuote(page, isMobile);
    await expect(page.getByTestId("download-usage")).toContainText("Te quedan 3 de 3 descargas");

    const download = page.getByRole("button", { name: "Descargar PDF" });
    for (const remaining of [2, 1, 0]) {
      const waiting = page.waitForEvent("download");
      await download.click();
      expect((await waiting).suggestedFilename()).toMatch(/\.pdf$/);
      if (remaining > 0) {
        await expect(page.getByTestId("download-usage")).toContainText(
          `Te quedan ${remaining} de 3 descargas`,
        );
      }
    }
    await expect(page.getByTestId("download-usage")).toContainText("Usaste tus 3 descargas");
    await expect(download).toBeDisabled();

    // El límite se aplica en el servidor aunque se ignore la interfaz.
    const blocked = await page.request.post("/api/quotes/pdf", { data: quote });
    expect(blocked.status()).toBe(429);
    expect((await blocked.json()).code).toBe("download_limit_reached");

    // La vista previa no cuenta como descarga.
    const preview = await page.request.post("/api/quotes/pdf?preview=1", { data: quote });
    expect(preview.status()).toBe(200);
  });

  test("las descargas simultáneas no superan el límite", async ({ page }) => {
    await page.goto("/registro?next=/crear");
    await page.getByLabel("Email").fill(unique("race"));
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await page.waitForURL((url) => url.pathname === "/crear");

    const responses = await Promise.all(
      Array.from({ length: 6 }, () => page.request.post("/api/quotes/pdf", { data: quote })),
    );
    const statuses = responses.map((r) => r.status()).sort();
    expect(statuses.filter((s) => s === 200)).toHaveLength(3);
    expect(statuses.filter((s) => s === 429)).toHaveLength(3);
  });
});
