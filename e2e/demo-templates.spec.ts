import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Client } from "pg";
import { DEMO_TEMPLATES, type DemoTemplate } from "./fixtures/demo-templates";

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
const OUT_DIR = path.resolve("examples", "e2e-pdfs");
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

function apiQuote(demo: DemoTemplate, templateId: string, itemCount = 6) {
  return {
    number: "0001",
    date: "2026-11-19",
    validityDays: 15,
    title: demo.title,
    description: "",
    currency: "ARS",
    notes: "Datos ficticios de demostración.",
    terms: "",
    deliveryTime: "",
    paymentTerms: "50% al aprobar, 50% al finalizar",
    issuer: { businessName: demo.businessName },
    customer: { name: demo.customerName },
    items: Array.from({ length: itemCount }, (_, i) => {
      const it = demo.items[i % demo.items.length];
      return {
        id: `i${i}`,
        description:
          itemCount > demo.items.length ? `${it.description} (ítem ${i + 1})` : it.description,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent ?? "0",
      };
    }),
    globalDiscount: { type: "percent", value: "0" },
    surcharge: { type: "percent", value: "0" },
    taxes: [{ id: "iva", label: "IVA", type: "percent", value: "21" }],
    templateId,
    accentColor: "",
    customFieldValues: demo.values,
  };
}

async function adminCreatesAndAssigns(admin: Page, demo: DemoTemplate, clientEmail: string) {
  await admin.goto("/admin/plantillas");
  await admin.getByLabel("Nombre").first().fill(demo.name);
  await act(admin, "Crear borrador");
  await admin.waitForURL(/\/admin\/plantillas\/[0-9a-f-]{36}/);
  const id = admin.url().match(/plantillas\/([0-9a-f-]{36})/)![1];

  // Configuración en modo avanzado y vista previa antes de activar
  await admin.waitForLoadState("networkidle");
  await admin.getByRole("button", { name: "Modo avanzado (JSON)" }).click();
  await admin.getByLabel("Estilo, campos y secciones (JSON)").fill(JSON.stringify(demo.config));
  await admin.getByRole("button", { name: "Vista previa de esta configuración" }).click();
  await expect(admin.getByTestId("admin-preview").locator("img").first()).toBeVisible({
    timeout: 30_000,
  });
  await act(admin, "Guardar cambios");
  await expect(admin.getByText("Listo.")).toBeVisible();

  await admin.waitForLoadState("networkidle");
  await act(admin, "Activar");
  // La vista nueva (estado ACTIVE) es la señal de que el redireccionamiento ya se aplicó.
  await expect(admin.getByRole("button", { name: "Publicar nueva versión" })).toBeVisible();
  await admin.waitForLoadState("networkidle");
  await admin.getByLabel("Email de la cuenta").fill(clientEmail);
  await act(admin, "Asignar");
  await expect(admin.getByText(clientEmail)).toBeVisible();
  return id;
}

test.describe.configure({ mode: "serial" });

test.describe("plantillas de demostración (flujo comercial completo)", () => {
  test.beforeAll(() => mkdirSync(OUT_DIR, { recursive: true }));

  for (const demo of DEMO_TEMPLATES) {
    test(`${demo.name}: del alta en administración al PDF del cliente`, async ({
      browser,
      isMobile,
    }) => {
      test.setTimeout(120_000);
      test.skip(isMobile, "El flujo completo se valida en desktop; mobile se cubre en otro test");
      const { page: admin, email: adminEmail } = await newUser(browser, "demo-admin");
      await db((c) => c.query(`UPDATE users SET role='ADMIN' WHERE email=$1`, [adminEmail]));

      const { page: client, email } = await newUser(browser, "demo-client", "/crear");
      const templateId = await adminCreatesAndAssigns(admin, demo, email);

      // Cliente: selecciona la plantilla, completa y ve la vista previa fiel
      await client.reload();
      await client.getByLabel("Nombre comercial").fill(demo.businessName);
      await client.getByLabel("Nombre", { exact: true }).fill(demo.customerName);
      await client.getByLabel("Título").fill(demo.title);
      await client.getByLabel("Descripción", { exact: true }).fill(demo.items[0].description);
      await client.getByLabel("Precio unitario").fill(demo.items[0].unitPrice);
      await client.getByRole("radio", { name: demo.name }).click();
      for (const [label, value] of Object.entries(demo.fill)) {
        await client.getByLabel(label, { exact: false }).first().fill(value);
      }
      await expect(client.getByTestId("pdf-preview")).toContainText("Vista previa fiel", {
        timeout: 30_000,
      });
      await expect(client.getByTestId("pdf-preview").locator("img").first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(client.getByTestId("download-usage")).toContainText("Te quedan 3 de 3");

      // Descarga real por la interfaz (consume 1 del cupo gratuito)
      const waiting = client.waitForEvent("download");
      await client.getByRole("button", { name: "Descargar PDF" }).click();
      const download = await waiting;
      await download.saveAs(path.join(OUT_DIR, `${demo.key}.pdf`));
      await expect(client.getByTestId("download-usage")).toContainText("Te quedan 2 de 3");

      // Presupuesto multipágina (muestra) y verificación del límite del plan por API
      const many = await client.request.post("/api/quotes/pdf", {
        data: apiQuote(demo, templateId, 35),
      });
      expect(many.status()).toBe(200);
      const { writeFileSync } = await import("node:fs");
      writeFileSync(path.join(OUT_DIR, `${demo.key}-multipagina.pdf`), await many.body());

      const third = await client.request.post("/api/quotes/pdf", {
        data: apiQuote(demo, templateId),
      });
      expect(third.status()).toBe(200);
      const fourth = await client.request.post("/api/quotes/pdf", {
        data: apiQuote(demo, templateId),
      });
      expect(fourth.status()).toBe(429);
      expect((await fourth.json()).code).toBe("download_limit_reached");

      // Las vistas previas no consumen cupo ni evaden el límite (siguen con marca de agua)
      const preview = await client.request.post("/api/quotes/pdf?preview=1", {
        data: apiQuote(demo, templateId),
      });
      expect(preview.status()).toBe(200);
      const usage = await db(
        async (c) =>
          (
            await c.query(
              `SELECT count(*)::int AS n FROM download_usage d JOIN users u ON u.id=d."userId" WHERE u.email=$1`,
              [email],
            )
          ).rows[0].n,
      );
      expect(usage).toBe(3);
    });
  }
});
