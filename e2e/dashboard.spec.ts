import { expect, test, type Browser, type Page } from "@playwright/test";
import { Client } from "pg";

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

type UserPage = Page & { email: string };

async function newUser(
  browser: Browser,
  opts: { pro?: boolean; password?: string } = {},
): Promise<UserPage> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = unique("d");
  await page.goto("/registro?next=/dashboard");
  await page.getByLabel("Nombre (opcional)").fill("Laura Dash");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(opts.password ?? PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL((url) => url.pathname === "/dashboard");
  if (opts.pro) {
    await db(async (c) => {
      const { rows } = await c.query("SELECT id FROM users WHERE email = $1", [email]);
      await c.query(
        `INSERT INTO subscriptions (id, "userId", plan, status, "externalReference", "currentPeriodEnd", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'MONTHLY', 'ACTIVE', 'sub_e2e_' || gen_random_uuid()::text, now() + interval '20 days', now())`,
        [rows[0].id],
      );
    });
  }
  return Object.assign(page, { email });
}

const quoteBody = (title: string, customerName = "Cliente Demo") => ({
  number: "0001",
  date: "2026-05-10",
  validityDays: 15,
  title,
  description: "",
  currency: "ARS",
  notes: "",
  terms: "",
  deliveryTime: "",
  paymentTerms: "",
  issuer: { businessName: "Electro Sur" },
  customer: { name: customerName },
  items: [
    {
      id: "a",
      description: "Tablero",
      quantity: "2",
      unit: "Unidad",
      unitPrice: "1500",
      discountPercent: "0",
    },
  ],
  globalDiscount: { type: "percent", value: "0" },
  surcharge: { type: "percent", value: "0" },
  taxes: [],
  templateId: "minimalista",
  accentColor: "",
});

test.describe("dashboard", () => {
  test.skip(!process.env.TEST_DATABASE_URL, "requiere TEST_DATABASE_URL");
  // Flujos largos con varios registros (argon2) y recargas: se les da más margen.
  test.setTimeout(90_000);

  test("sin sesión todas las secciones redirigen al login", async ({ page }) => {
    for (const path of [
      "/dashboard",
      "/dashboard/presupuestos",
      "/dashboard/clientes",
      "/dashboard/negocio",
      "/dashboard/plantillas",
      "/dashboard/plan",
      "/dashboard/configuracion",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/ingresar\?next=/);
    }
  });

  test("el inicio no inventa datos: muestra un estado vacío y luego métricas reales", async ({
    browser,
  }) => {
    const page = await newUser(browser, { pro: true });
    await expect(page.getByText("Todavía no hay presupuestos guardados")).toBeVisible();

    await page.request.post("/api/quotes", { data: { quote: quoteBody("Cocina") } });
    const aceptado = await (
      await page.request.post("/api/quotes", { data: { quote: quoteBody("Baño") } })
    ).json();
    await page.request.post("/api/quotes", { data: { quote: quoteBody("Pintura") } });
    await db((c) => c.query(`UPDATE quotes SET status = 'ACCEPTED' WHERE id = $1`, [aceptado.id]));

    await page.goto("/dashboard");
    await expect(page.getByText("Pendientes").locator("..")).toContainText("2");
    await expect(page.getByText("Aceptados").locator("..")).toContainText("1");
    await expect(page.getByText("Actividad reciente")).toBeVisible();
    // 3 presupuestos x (2 x 1500)
    await expect(page.getByText("$ 9.000,00")).toBeVisible();
  });

  test("Pro guarda desde el editor y gestiona sus presupuestos", async ({ browser, isMobile }) => {
    const page = await newUser(browser, { pro: true });
    await page.goto("/crear");
    await page.getByLabel("Nombre comercial").fill("Electro Sur");
    await page.getByLabel("Nombre", { exact: true }).fill("Laura Benítez");
    await page.getByLabel("Título").fill("Instalación completa");
    await page.getByLabel("Descripción", { exact: true }).fill("Tablero");
    await page.getByLabel("Precio unitario").fill("2500");
    if (isMobile) await page.getByRole("tab", { name: "Vista previa" }).click();
    await page.getByRole("button", { name: "Guardar en la nube" }).click();
    await page.waitForURL((url) => url.searchParams.has("id"));

    await page.goto("/dashboard/presupuestos");
    await expect(page.getByText("Instalación completa")).toBeVisible();

    // búsqueda y filtros
    await page.getByLabel("Buscar", { exact: true }).fill("inexistente");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page.getByText("No encontramos presupuestos con esos filtros")).toBeVisible();
    await page.getByRole("link", { name: "Limpiar" }).click();
    await page.waitForLoadState("networkidle");

    // cambio de estado
    await page.getByLabel("Estado del presupuesto").selectOption("ACCEPTED");
    await expect
      .poll(async () =>
        db(
          async (c) =>
            (await c.query(`SELECT status FROM quotes WHERE title = 'Instalación completa'`))
              .rows[0]?.status,
        ),
      )
      .toBe("ACCEPTED");

    // duplicar abre la copia en el editor
    await page.getByRole("button", { name: "Duplicar presupuesto" }).click();
    await page.waitForURL((url) => url.pathname === "/crear" && url.searchParams.has("id"));
    await expect(page.getByLabel("Título")).toHaveValue("Instalación completa");

    // eliminar (con confirmación)
    await page.goto("/dashboard/presupuestos");
    await expect(page.getByText(/N\.º 0001/)).toHaveCount(1); // original: número 0001; la copia tiene otro
    await page.getByRole("button", { name: "Eliminar presupuesto" }).first().click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByRole("button", { name: "Eliminar presupuesto" })).toHaveCount(1);
  });

  test("sin Pro vigente el dashboard queda en modo lectura", async ({ browser }) => {
    const page = await newUser(browser, { pro: true });
    const { id } = await (
      await page.request.post("/api/quotes", { data: { quote: quoteBody("Histórico") } })
    ).json();
    await db((c) =>
      c.query(
        `UPDATE subscriptions SET "currentPeriodEnd" = now() - interval '1 day'
         WHERE "userId" = (SELECT id FROM users WHERE email = $1)`,
        [page.email],
      ),
    );

    await page.goto("/dashboard/presupuestos");
    await expect(page.getByText("Modo lectura")).toBeVisible();
    await expect(page.getByText("Histórico")).toBeVisible();
    await expect(page.getByRole("button", { name: "Duplicar presupuesto" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Eliminar presupuesto" })).toHaveCount(0);
    await expect(page.getByLabel("Estado del presupuesto")).toHaveCount(0);

    await page.goto(`/crear?id=${id}`);
    await expect(page.getByText(/Modo lectura/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Guardar/ })).toHaveCount(0);

    // las páginas de escritura redirigen a Mi plan
    await page.goto("/dashboard/clientes/nuevo");
    await expect(page).toHaveURL(/\/dashboard\/plan\?need=pro/);
  });

  test("un usuario no puede ver ni descargar presupuestos de otro", async ({ browser }) => {
    const alice = await newUser(browser, { pro: true });
    const bob = await newUser(browser, { pro: true });
    const { id } = await (
      await alice.request.post("/api/quotes", { data: { quote: quoteBody("Secreto de Alice") } })
    ).json();

    await bob.goto(`/crear?id=${id}`);
    await expect(bob.getByText("No encontramos ese presupuesto en tu cuenta")).toBeVisible();
    await expect(bob.getByText("Secreto de Alice")).toHaveCount(0);
    expect((await bob.request.get(`/api/quotes/${id}/pdf`)).status()).toBe(404);
    await bob.goto("/dashboard/presupuestos");
    await expect(bob.getByText("Secreto de Alice")).toHaveCount(0);

    // el dueño sí puede descargar su PDF
    const own = await alice.request.get(`/api/quotes/${id}/pdf`);
    expect(own.status()).toBe(200);
    expect(own.headers()["content-type"]).toBe("application/pdf");
  });

  test("gestión de clientes: crear, buscar, editar y eliminar", async ({ browser }) => {
    const page = await newUser(browser, { pro: true });
    await page.goto("/dashboard/clientes");
    await expect(page.getByText("Todavía no cargaste clientes")).toBeVisible();

    await page.getByRole("link", { name: "Nuevo cliente" }).click();
    await page.getByLabel("Nombre", { exact: true }).fill("Panadería La Espiga");
    await page.getByLabel("Email").fill("espiga@example.com");
    await page.getByRole("button", { name: "Crear cliente" }).click();
    await expect(page.getByRole("heading", { name: "Panadería La Espiga" })).toBeVisible();
    await expect(page.getByText("Sin presupuestos asociados")).toBeVisible();

    await page.getByLabel("Teléfono").fill("+54 11 5555-1234");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Cambios guardados" })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/dashboard/clientes?q=espiga");
    await expect(page.getByText("Panadería La Espiga")).toBeVisible();
    await page.goto("/dashboard/clientes?q=zzz");
    await expect(page.getByText("No encontramos clientes con esa búsqueda")).toBeVisible();

    await page.goto("/dashboard/clientes");
    await page.getByRole("link", { name: /Panadería La Espiga/ }).click();
    await page.getByRole("button", { name: "Eliminar cliente" }).click();
    await page.getByRole("button", { name: "Sí, eliminar" }).click();
    await expect(page.getByText("Todavía no cargaste clientes")).toBeVisible();
  });

  test("Mi negocio guarda el perfil y precarga el editor", async ({ browser }) => {
    const page = await newUser(browser);
    await page.goto("/dashboard/negocio");
    await page.getByLabel("Nombre comercial").fill("Taller Rojas");
    await page.getByLabel("WhatsApp").fill("+54 9 11 5555-9999");
    await page.getByLabel("Validez por defecto (días)").fill("45");
    await page.getByLabel("Forma de pago habitual").fill("Contado");
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/profile") && r.request().method() === "PUT" && r.ok(),
        { timeout: 15_000 },
      ),
      page.getByRole("button", { name: "Guardar cambios" }).click(),
    ]);
    await expect(page.getByRole("status").filter({ hasText: "Cambios guardados" })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/crear");
    await expect(page.getByLabel("Nombre comercial")).toHaveValue("Taller Rojas");
    await expect(page.getByLabel("Validez (días)")).toHaveValue("45");
    await expect(page.getByLabel("Forma de pago")).toHaveValue("Contado");
  });

  test("Mi negocio muestra los errores de validación del servidor", async ({ browser }) => {
    const page = await newUser(browser);
    await page.goto("/dashboard/negocio");
    await page.getByLabel("Email", { exact: true }).fill("no-es-email");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Ingresá el nombre comercial")).toBeVisible();
    await expect(page.getByText("Email inválido")).toBeVisible();
  });

  test("Plantillas y Mi plan reflejan el estado real de la cuenta", async ({ browser }) => {
    const free = await newUser(browser);
    await free.goto("/dashboard/plantillas");
    await expect(free.getByText("Bloqueada")).toHaveCount(5);
    await expect(free.getByText("Incluida")).toHaveCount(1);
    await free.goto("/dashboard/plan");
    await expect(free.getByTestId("plan-name")).toHaveText("Gratis");
    await expect(free.getByText("0 de 3")).toBeVisible();

    const pro = await newUser(browser, { pro: true });
    await pro.goto("/dashboard/plan");
    await expect(pro.getByTestId("plan-name")).toHaveText("Pro mensual");
    await expect(pro.getByTestId("plan-state")).toContainText("Se renueva automáticamente");
    await pro.goto("/dashboard/plantillas");
    await expect(pro.getByText("Bloqueada")).toHaveCount(0);
  });

  test("cancelar sin proveedor de pagos informa el problema y no cambia nada", async ({
    browser,
  }) => {
    const page = await newUser(browser, { pro: true });
    await page.goto("/dashboard/plan");
    await page.getByRole("button", { name: "Cancelar suscripción" }).click();
    await page.getByRole("button", { name: "Sí, cancelar suscripción" }).click();
    // En E2E no hay credenciales de Mercado Pago: la suscripción sin id de proveedor se cancela localmente.
    await expect(page.getByTestId("plan-state")).toContainText("Cancelado");
  });

  test("configuración: nombre, contraseña, exportación y eliminación de cuenta", async ({
    browser,
  }) => {
    const page = await newUser(browser, { pro: true });
    await page.request.post("/api/quotes", { data: { quote: quoteBody("Para exportar") } });

    await page.goto("/dashboard/configuracion");
    await page.getByLabel("Nombre", { exact: true }).fill("Laura Renombrada");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Datos actualizados" })).toBeVisible();

    // exportación
    const exported = await page.request.get("/api/account/export");
    expect(exported.status()).toBe(200);
    const json = await exported.text();
    expect(json).toContain("Para exportar");
    expect(json).toContain(page.email);
    expect(json).not.toContain("passwordHash");

    // cambio de contraseña: cierra la sesión y la nueva funciona
    await page.getByLabel("Contraseña actual").fill("equivocada-1");
    await page.getByLabel("Nueva contraseña", { exact: true }).fill("otra-clave-segura-2");
    await page.getByLabel("Repetí la nueva contraseña").fill("otra-clave-segura-2");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("La contraseña actual no es correcta.")).toBeVisible();

    await page.getByLabel("Contraseña actual").fill(PASSWORD);
    await page.getByLabel("Nueva contraseña", { exact: true }).fill("otra-clave-segura-2");
    await page.getByLabel("Repetí la nueva contraseña").fill("otra-clave-segura-2");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page).toHaveURL(/\/ingresar\?reset=1/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/ingresar/);
    await page.getByLabel("Email").fill(page.email);
    await page.getByLabel("Contraseña").fill("otra-clave-segura-2");
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/ingresar"));

    // eliminación de cuenta
    await page.goto("/dashboard/configuracion");
    await page.getByLabel(/Escribí tu email/).fill("otro@example.com");
    await page.getByLabel("Contraseña", { exact: true }).last().fill("otra-clave-segura-2");
    await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
    await expect(page.getByText("Escribí tu email exactamente para confirmar.")).toBeVisible();

    // tras un envío fallido React limpia los campos: se vuelven a completar
    await page.getByLabel(/Escribí tu email/).fill(page.email);
    await page.getByLabel("Contraseña", { exact: true }).last().fill("otra-clave-segura-2");
    await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    const remaining = await db((c) =>
      c.query(`SELECT count(*)::int AS n FROM users WHERE email = $1`, [page.email]),
    );
    expect(remaining.rows[0].n).toBe(0);
  });
});
