import { expect, test } from "@playwright/test";

test.describe("editor de presupuestos", () => {
  test("la landing es pública y lleva al editor", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("presupuestos");
    await page.getByRole("link", { name: "Crear mi presupuesto gratis" }).first().click();
    await expect(page).toHaveURL(/\/crear$/);
  });

  test("calcula totales y conserva el borrador al recargar", async ({ page, isMobile }) => {
    await page.goto("/crear");
    await expect(page.getByRole("form", { name: "Editor de presupuesto" })).toBeVisible();

    await page.getByLabel("Nombre comercial").fill("Electro Sur");
    await page.getByLabel("Nombre", { exact: true }).fill("Laura Benítez");
    await page.getByLabel("Título").fill("Instalación eléctrica");
    await page.getByLabel("Descripción", { exact: true }).fill("Tablero principal");
    await page.getByLabel("Cantidad").fill("2");
    await page.getByLabel("Precio unitario").fill("1500,50");

    if (isMobile) await page.getByRole("tab", { name: "Vista previa" }).click();
    const preview = page.getByRole("article", { name: "Vista previa del presupuesto" });
    await expect(preview).toContainText("Total ARS");
    await expect(preview).toContainText("$ 3.001,00");

    // espera al autoguardado
    await expect(page.getByRole("status").filter({ hasText: "guardado" }).first()).toBeVisible({
      timeout: 15000,
    });
    await page.reload();
    await expect(page.getByText("Recuperamos el borrador")).toBeVisible();
    await expect(page.getByLabel("Nombre comercial")).toHaveValue("Electro Sur");
  });

  test("agrega, duplica y elimina conceptos", async ({ page }) => {
    await page.goto("/crear");
    await page.getByRole("button", { name: "Agregar concepto" }).click();
    await expect(page.getByLabel("Cantidad")).toHaveCount(2);
    await page.getByRole("button", { name: "Duplicar concepto 1" }).click();
    await expect(page.getByLabel("Cantidad")).toHaveCount(3);
    await page.getByRole("button", { name: "Eliminar concepto 3" }).click();
    await expect(page.getByLabel("Cantidad")).toHaveCount(2);
  });

  test("muestra errores de validación al compartir un presupuesto incompleto", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/crear");
    if (isMobile) await page.getByRole("tab", { name: "Vista previa" }).click();
    await page.getByRole("button", { name: "WhatsApp" }).click();
    await expect(page.getByText("Completá los campos obligatorios")).toBeVisible();
  });

  test("limpiar el borrador restablece el formulario", async ({ page, isMobile }) => {
    await page.goto("/crear");
    await page.getByLabel("Nombre comercial").fill("Temporal");
    if (isMobile) await page.getByRole("tab", { name: "Vista previa" }).click();
    await page.getByRole("button", { name: "Limpiar borrador" }).click();
    await page.getByRole("button", { name: "Sí, borrar todo" }).click();
    if (isMobile) await page.getByRole("tab", { name: "Editar" }).click();
    await expect(page.getByLabel("Nombre comercial")).toHaveValue("");
  });
});
