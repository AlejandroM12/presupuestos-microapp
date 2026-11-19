import { expect, test, type Browser, type Page } from "@playwright/test";
import { Client } from "pg";

/** Ejecuta una acción de administración y espera la respuesta real del servidor (no un cartel previo). */
async function act(page: Page, name: string) {
  const button = page.getByRole("button", { name });
  const done = page.waitForResponse(
    (r) => r.request().method() === "POST" && !r.url().includes("/preview"),
  );
  await button.click();
  await done;
  await page.waitForLoadState("networkidle");
}

const PASSWORD = "clave-e2e-segura-1";
const unique = (tag: string) =>
  `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.example`;

async function db<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function newUser(browser: Browser, tag: string, next = "/dashboard") {
  const page = await (await browser.newContext()).newPage();
  const email = unique(tag);
  await page.goto(`/registro?next=${next}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL((url) => url.pathname === next);
  return { page, email };
}

const save = async (page: Page) => {
  await act(page, "Guardar cambios");
  await expect(page.getByText("Listo.")).toBeVisible();
  await page.waitForLoadState("networkidle");
};

const quoteBody = (templateId: string) => ({
  number: "1",
  date: "2026-11-19",
  validityDays: 15,
  title: "x",
  description: "",
  currency: "ARS",
  notes: "",
  terms: "",
  deliveryTime: "",
  paymentTerms: "",
  issuer: { businessName: "x" },
  customer: { name: "x" },
  items: [
    {
      id: "a",
      description: "x",
      quantity: "1",
      unit: "Unidad",
      unitPrice: "1",
      discountPercent: "0",
    },
  ],
  globalDiscount: { type: "percent", value: "0" },
  surcharge: { type: "percent", value: "0" },
  taxes: [],
  templateId,
  accentColor: "",
  customFieldValues: {},
});

test("configuración por formulario: campos, secciones, orden, validación y versionado", async ({
  browser,
  isMobile,
}) => {
  test.setTimeout(120_000);
  const { page: admin, email: adminEmail } = await newUser(browser, "form-admin");
  await db((c) => c.query(`UPDATE users SET role='ADMIN' WHERE email=$1`, [adminEmail]));
  const { page: client, email: clientEmail } = await newUser(browser, "form-client", "/crear");

  await admin.goto("/admin/plantillas");
  await admin.getByLabel("Nombre").first().fill("Formulario E2E");
  await act(admin, "Crear borrador");
  await admin.waitForURL(/\/admin\/plantillas\/[0-9a-f-]{36}/);
  const templateId = admin.url().match(/plantillas\/([0-9a-f-]{36})/)![1];
  await admin.waitForLoadState("networkidle");

  // Estilo
  await admin.getByLabel("Título del documento").fill("Orden de prueba");
  await admin.getByLabel("Color en formato hexadecimal").fill("#0f766e");
  await admin.getByLabel("Tipografía").selectOption("serif");
  await admin.getByLabel("Encabezado", { exact: true }).selectOption("banner");
  await admin.getByLabel("Tabla de conceptos").selectOption("zebra");
  await admin.getByLabel("Totales", { exact: true }).selectOption("box");
  await admin.getByLabel("Columnas de los campos").selectOption("2");
  await admin.getByLabel("Incluir bloque de aprobación").check();
  await admin.getByLabel("Densidad").selectOption("compact");

  // Sección y campos
  await admin.getByRole("button", { name: "Agregar sección" }).click();
  await admin.getByLabel("Sección 1", { exact: true }).fill("Datos del equipo");
  await admin.getByRole("button", { name: "Agregar campo" }).click();
  await admin.getByLabel("Etiqueta", { exact: true }).first().fill("Patente");
  await admin.getByLabel("Valor predeterminado").first().fill("ZZ000ZZ");
  await admin.getByLabel("Obligatorio").first().check();
  await admin.getByLabel("Ficha destacada").first().check();
  await admin
    .getByLabel("Sección", { exact: true })
    .first()
    .selectOption({ label: "Datos del equipo" });

  await admin.getByRole("button", { name: "Agregar campo" }).click();
  await admin.getByLabel("Etiqueta", { exact: true }).nth(1).fill("Prioridad");
  await admin.getByLabel("Tipo", { exact: true }).nth(1).selectOption("select");

  // Validación: una lista sin opciones no se puede guardar
  await expect(
    admin.getByRole("alert").filter({ hasText: "agregá al menos una opción" }),
  ).toBeVisible();
  await expect(admin.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  await admin.getByLabel("Opciones (una por línea)").fill("Normal\nUrgente");
  await expect(admin.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();

  // Orden: subir el segundo campo lo deja primero
  await admin.getByRole("button", { name: "Subir campo 2" }).click();
  await expect(admin.getByLabel("Etiqueta", { exact: true }).first()).toHaveValue("Prioridad");

  // Vista previa de la configuración sin guardar
  await admin.getByRole("button", { name: "Vista previa de esta configuración" }).click();
  await expect(admin.getByTestId("admin-preview").locator("img").first()).toBeVisible({
    timeout: 30_000,
  });

  await save(admin);
  // Persistencia: tras recargar siguen los campos, en el orden elegido
  await admin.reload();
  await expect(admin.getByLabel("Etiqueta", { exact: true }).first()).toHaveValue("Prioridad");
  await expect(admin.getByLabel("Etiqueta", { exact: true }).nth(1)).toHaveValue("Patente");
  const stored = await db(async (c) =>
    JSON.stringify(
      (await c.query(`SELECT fields FROM custom_templates WHERE id=$1`, [templateId])).rows[0]
        .fields,
    ),
  );
  expect(stored).toContain('"id":"patente"');
  const style = await db(async (c) =>
    JSON.stringify(
      (await c.query(`SELECT style FROM custom_templates WHERE id=$1`, [templateId])).rows[0].style,
    ),
  );
  expect(style).toContain('"headerVariant":"banner"');
  expect(style).toContain('"tableStyle":"zebra"');
  expect(style).toContain('"totalsStyle":"box"');
  expect(style).toContain('"approval":true');
  expect(style).toContain('"density":"compact"');
  expect(stored).toContain('"highlight":true');

  // Eliminar un campo
  await admin.getByRole("button", { name: "Eliminar campo 1" }).click();
  await expect(admin.getByLabel("Etiqueta", { exact: true })).toHaveCount(1);
  await save(admin);

  // Activar (v1), asignar y editar → publicar v2 conserva la v1
  await act(admin, "Activar");
  // La vista nueva (estado ACTIVE) es la señal de que el redireccionamiento ya se aplicó.
  await expect(admin.getByRole("button", { name: "Publicar nueva versión" })).toBeVisible();
  await admin.waitForLoadState("networkidle");
  await admin.getByLabel("Email de la cuenta").fill(clientEmail);
  await act(admin, "Asignar");
  await expect(admin.getByText(clientEmail)).toBeVisible();
  await admin.waitForLoadState("networkidle");
  await admin.getByLabel("Título del documento").fill("Orden v2");
  await save(admin);
  await act(admin, "Publicar nueva versión");
  await expect(admin.getByText("Listo.")).toBeVisible();
  const versions = await db(
    async (c) =>
      (
        await c.query(
          `SELECT version, style->>'headerTitle' AS t FROM custom_template_versions WHERE "templateId"=$1 ORDER BY version`,
          [templateId],
        )
      ).rows,
  );
  expect(versions).toEqual([
    { version: 1, t: "Orden de prueba" },
    { version: 2, t: "Orden v2" },
  ]);

  // Cliente: ve el campo y la vista previa fiel (también en mobile)
  await client.reload();
  await client.getByLabel("Nombre comercial").fill("Negocio E2E");
  await client.getByLabel("Nombre", { exact: true }).fill("Cliente E2E");
  await client.getByLabel("Título").fill("Trabajo");
  await client.getByLabel("Descripción", { exact: true }).fill("Concepto");
  await client.getByLabel("Precio unitario").fill("1000");
  await client.getByRole("radio", { name: "Formulario E2E" }).click();
  await expect(client.getByLabel(/Patente/)).toHaveValue("ZZ000ZZ");
  if (isMobile) await client.getByRole("tab", { name: "Vista previa" }).click();
  await expect(client.getByTestId("pdf-preview")).toContainText("Vista previa fiel", {
    timeout: 30_000,
  });
  await expect(client.getByTestId("pdf-preview").locator("img").first()).toBeVisible({
    timeout: 30_000,
  });
  const overflow = await client.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("la vista previa de una plantilla privada exige asignación y la API de administración rol", async ({
  browser,
}) => {
  const { page: admin, email: adminEmail } = await newUser(browser, "pv-admin");
  await db((c) => c.query(`UPDATE users SET role='ADMIN' WHERE email=$1`, [adminEmail]));
  const { page: other } = await newUser(browser, "pv-other");
  await admin.goto("/admin/plantillas");
  await admin.getByLabel("Nombre").first().fill("Privada PV E2E");
  await act(admin, "Crear borrador");
  await admin.waitForURL(/\/admin\/plantillas\/[0-9a-f-]{36}/);
  const id = admin.url().match(/plantillas\/([0-9a-f-]{36})/)![1];
  await admin.waitForLoadState("networkidle");
  await act(admin, "Activar");
  // La vista nueva (estado ACTIVE) es la señal de que el redireccionamiento ya se aplicó.
  await expect(admin.getByRole("button", { name: "Publicar nueva versión" })).toBeVisible();

  expect(
    (await other.request.post("/api/quotes/pdf?preview=1", { data: quoteBody(id) })).status(),
  ).toBe(403);
  expect(
    (
      await other.request.post(`/api/admin/templates/${id}/preview`, { data: { config: {} } })
    ).status(),
  ).toBe(404);
  expect(
    (
      await admin.request.post(`/api/admin/templates/${id}/preview`, { data: { config: {} } })
    ).status(),
  ).toBe(200);
  // Configuración inválida: error controlado, no 500
  expect(
    (
      await admin.request.post(`/api/admin/templates/${id}/preview`, {
        data: { config: { fields: [{ id: "X", label: "x", type: "script" }] } },
      })
    ).status(),
  ).toBe(422);
});
