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

type UserPage = Page & { email: string; userId: string };

async function newUser(browser: Browser, tag: string): Promise<UserPage> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = unique(tag);
  await page.goto("/registro?next=/dashboard");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL((url) => url.pathname === "/dashboard");
  const userId = await db(
    async (c) => (await c.query("SELECT id FROM users WHERE email = $1", [email])).rows[0].id,
  );
  return Object.assign(page, { email, userId });
}

const makeAdmin = (userId: string) =>
  db((c) => c.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [userId]));

const quote = (templateId: string, values: Record<string, unknown> = {}) => ({
  number: "0001",
  date: "2026-05-10",
  validityDays: 15,
  title: "Reparación",
  description: "",
  currency: "ARS",
  notes: "",
  terms: "",
  deliveryTime: "",
  paymentTerms: "",
  issuer: { businessName: "Taller Rojas" },
  customer: { name: "Cliente" },
  items: [
    {
      id: "a",
      description: "Mano de obra",
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
  accentColor: "",
  customFieldValues: values,
});

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test.describe("plantillas privadas", () => {
  test("usuarios comunes y anónimos no ven la administración", async ({ browser, page }) => {
    // Anónimo: 404 en la página y 401 en la API.
    expect((await page.goto("/admin/plantillas"))?.status()).toBe(404);
    const anon = await page.request.get(
      "/api/admin/templates/00000000-0000-4000-8000-000000000000/preview",
    );
    expect(anon.status()).toBe(401);

    const user = await newUser(browser, "plain");
    expect((await user.goto("/admin/plantillas"))?.status()).toBe(404);
    expect((await user.goto("/admin/auditoria"))?.status()).toBe(404);
    const api = await user.request.get(
      "/api/admin/templates/00000000-0000-4000-8000-000000000000/preview",
    );
    expect(api.status()).toBe(404);
    // El rol no se puede obtener por el cliente: los campos extra de la sesión se ignoran.
    expect((await user.goto("/dashboard"))?.status()).toBe(200);
    await expect(user.getByRole("link", { name: "Administración" })).toHaveCount(0);
  });

  test("un administrador crea, activa y asigna; solo la cuenta asignada lo usa", async ({
    browser,
  }) => {
    const admin = await newUser(browser, "admin");
    await makeAdmin(admin.userId);
    const alice = await newUser(browser, "alice");
    const bob = await newUser(browser, "bob");

    // Crear plantilla
    await admin.goto("/admin/plantillas");
    await admin.getByLabel("Nombre").first().fill("Taller Rojas E2E");
    await act(admin, "Crear borrador");
    await admin.waitForURL(/\/admin\/plantillas\/[0-9a-f-]{36}/);
    const templateId = admin.url().match(/plantillas\/([0-9a-f-]{36})/)![1];

    // Configuración con un campo obligatorio y activación
    const config = JSON.stringify({
      style: {
        accentColor: "#b91c1c",
        headerTitle: "Orden de trabajo",
        footerText: "Garantía 90 días",
      },
      sections: [{ id: "equipo", title: "Equipo", position: 0 }],
      fields: [
        { id: "serie", label: "N.º de serie", type: "text", sectionId: "equipo", required: true },
      ],
    });
    await admin.waitForLoadState("networkidle");
    await admin.getByRole("button", { name: "Modo avanzado (JSON)" }).click();
    await admin.getByLabel("Estilo, campos y secciones (JSON)").fill(config);
    await act(admin, "Guardar cambios");
    await expect(admin.getByText("Listo.")).toBeVisible();

    // JSON inválido: el formulario avisa y no deja guardar
    await admin.waitForLoadState("networkidle");
    await admin.getByRole("button", { name: "Modo avanzado (JSON)" }).click();
    await admin.getByLabel("Estilo, campos y secciones (JSON)").fill("{ no es json");
    await expect(admin.getByText("El JSON no es válido.")).toBeVisible();
    await expect(admin.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

    await admin.goto(`/admin/plantillas/${templateId}`);
    await act(admin, "Activar");
    // La vista nueva (estado ACTIVE) es la señal de que el redireccionamiento ya se aplicó.
    await expect(admin.getByRole("button", { name: "Publicar nueva versión" })).toBeVisible();

    // La vista previa PDF del administrador funciona; la de otros usuarios no
    const preview = await admin.request.get(`/api/admin/templates/${templateId}/preview`);
    expect(preview.status()).toBe(200);
    expect(preview.headers()["content-type"]).toBe("application/pdf");
    expect((await alice.request.get(`/api/admin/templates/${templateId}/preview`)).status()).toBe(
      404,
    );

    // Asignar a Alice
    await admin.getByLabel("Email de la cuenta").fill(alice.email);
    await act(admin, "Asignar");
    await expect(admin.getByText(alice.email)).toBeVisible();

    // Alice la ve y puede generar el PDF (sin marca); Bob no
    const aliceList = await (await alice.request.get("/api/me/templates")).json();
    expect(aliceList.templates.map((t: { id: string }) => t.id)).toEqual([templateId]);
    const bobList = await (await bob.request.get("/api/me/templates")).json();
    expect(bobList.templates).toEqual([]);

    const ok = await alice.request.post("/api/quotes/pdf", {
      data: quote(templateId, { serie: "SN-77" }),
    });
    expect(ok.status()).toBe(200);
    expect(ok.headers()["content-type"]).toBe("application/pdf");

    const missing = await alice.request.post("/api/quotes/pdf", { data: quote(templateId, {}) });
    expect(missing.status()).toBe(422);
    expect((await missing.json()).code).toBe("invalid_custom_fields");

    const denied = await bob.request.post("/api/quotes/pdf", {
      data: quote(templateId, { serie: "x" }),
    });
    expect(denied.status()).toBe(403);
    // Vista previa tampoco: no se filtra la plantilla a otras cuentas
    const deniedPreview = await bob.request.post("/api/quotes/pdf?preview=1", {
      data: quote(templateId, { serie: "x" }),
    });
    expect(deniedPreview.status()).toBe(403);

    // Alice la ve en su galería
    await alice.goto("/dashboard/plantillas");
    await expect(alice.getByRole("heading", { name: "Mis plantillas" })).toBeVisible();
    await bob.goto("/dashboard/plantillas");
    await expect(bob.getByRole("heading", { name: "Mis plantillas" })).toHaveCount(0);

    // Revocar quita el acceso al instante
    await admin.goto(`/admin/plantillas/${templateId}`);
    await admin.getByLabel("Motivo de la revocación").fill("Fin de contrato");
    await act(admin, "Revocar");
    await expect(admin.getByText("Sin asignaciones vigentes.")).toBeVisible();
    const afterRevoke = await alice.request.post("/api/quotes/pdf", {
      data: quote(templateId, { serie: "SN-77" }),
    });
    expect(afterRevoke.status()).toBe(403);

    // Auditoría visible solo para el administrador
    await admin.goto("/admin/auditoria");
    await expect(admin.getByText("ASSIGNMENT_REVOKE").first()).toBeVisible();
  });

  test("un administrador al que se le quita el rol pierde el acceso de inmediato", async ({
    browser,
  }) => {
    const admin = await newUser(browser, "demoted");
    await makeAdmin(admin.userId);
    expect((await admin.goto("/admin/plantillas"))?.status()).toBe(200);
    await db((c) => c.query(`UPDATE users SET role = 'USER' WHERE id = $1`, [admin.userId]));
    expect((await admin.goto("/admin/plantillas"))?.status()).toBe(404);
  });

  test("las acciones administrativas no se pueden invocar sin rol", async ({ browser }) => {
    const user = await newUser(browser, "sneaky");
    const res = await user.request.post("/admin/plantillas", {
      form: { name: "Intrusa" },
      headers: { "Next-Action": "00" },
    });
    expect([404, 400, 405]).toContain(res.status());
    const count = await db(
      async (c) =>
        (await c.query(`SELECT count(*)::int AS n FROM custom_templates WHERE name = 'Intrusa'`))
          .rows[0].n,
    );
    expect(count).toBe(0);
  });
});
