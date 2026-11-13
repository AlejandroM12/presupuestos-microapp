import { expect, test, type Browser, type Page } from "@playwright/test";
import { Client } from "pg";

const PASSWORD = "clave-e2e-segura-1";
const unique = (tag: string) =>
  `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.example`;

const quote = (title: string) => ({
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
  customer: { name: "Laura" },
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

async function db<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function newUser(
  browser: Browser,
  opts: { pro: boolean },
): Promise<Page & { email: string }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = unique("p");
  await page.goto("/registro?next=/dashboard");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL((url) => url.pathname === "/dashboard");
  if (opts.pro) {
    await db(async (c) => {
      const { rows } = await c.query("SELECT id FROM users WHERE email = $1", [email]);
      await c.query(
        `INSERT INTO subscriptions (id, "userId", plan, status, "currentPeriodEnd", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'MONTHLY', 'ACTIVE', now() + interval '20 days', now())`,
        [rows[0].id],
      );
    });
  }
  return Object.assign(page, { email });
}

test.describe("API de presupuestos guardados", () => {
  test.skip(!process.env.TEST_DATABASE_URL, "requiere TEST_DATABASE_URL");

  test("exige sesión y plan Pro para guardar", async ({ browser, request }) => {
    expect((await request.post("/api/quotes", { data: { quote: quote("x") } })).status()).toBe(401);

    const free = await newUser(browser, { pro: false });
    const res = await free.request.post("/api/quotes", { data: { quote: quote("x") } });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe("pro_required");
  });

  test("un usuario Pro guarda, lee y edita; otro usuario no puede acceder", async ({ browser }) => {
    const alice = await newUser(browser, { pro: true });
    const bob = await newUser(browser, { pro: true });

    const created = await alice.request.post("/api/quotes", {
      data: { quote: quote("Privado de Alice") },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id } = await created.json();

    const read = await alice.request.get(`/api/quotes/${id}`);
    expect(read.status()).toBe(200);
    expect((await read.json()).draft.title).toBe("Privado de Alice");

    // Acceso horizontal: Bob (con Pro) no puede leer, editar ni borrar lo de Alice.
    expect((await bob.request.get(`/api/quotes/${id}`)).status()).toBe(404);
    expect(
      (await bob.request.put(`/api/quotes/${id}`, { data: { quote: quote("Hackeado") } })).status(),
    ).toBe(404);
    expect((await bob.request.delete(`/api/quotes/${id}`)).status()).toBe(404);

    const edit = await alice.request.put(`/api/quotes/${id}`, {
      data: { quote: quote("Editado") },
    });
    expect(edit.status()).toBe(200);
    expect((await (await alice.request.get(`/api/quotes/${id}`)).json()).draft.title).toBe(
      "Editado",
    );
  });

  test("tras vencer Pro los presupuestos quedan en modo lectura", async ({ browser }) => {
    const user = await newUser(browser, { pro: true });
    const { id } = await (
      await user.request.post("/api/quotes", { data: { quote: quote("Histórico") } })
    ).json();

    await db((c) =>
      c.query(
        `UPDATE subscriptions SET "currentPeriodEnd" = now() - interval '1 day'
         WHERE "userId" = (SELECT id FROM users WHERE email = $1)`,
        [user.email],
      ),
    );

    expect((await user.request.get(`/api/quotes/${id}`)).status()).toBe(200);
    expect(
      (await user.request.put(`/api/quotes/${id}`, { data: { quote: quote("Nuevo") } })).status(),
    ).toBe(403);
    expect((await user.request.delete(`/api/quotes/${id}`)).status()).toBe(403);
    expect(
      (await user.request.post("/api/quotes", { data: { quote: quote("Otro") } })).status(),
    ).toBe(403);
  });

  test("valida los datos y los identificadores", async ({ browser }) => {
    const user = await newUser(browser, { pro: true });
    expect((await user.request.get("/api/quotes/no-es-un-uuid")).status()).toBe(404);
    expect((await user.request.post("/api/quotes", { data: { quote: { foo: 1 } } })).status()).toBe(
      422,
    );
    expect(
      (
        await user.request.post("/api/quotes", {
          data: "no json",
          headers: { "content-type": "text/plain" },
        })
      ).status(),
    ).toBe(422);
  });

  test("el perfil del negocio es propio de cada usuario", async ({ browser }) => {
    const a = await newUser(browser, { pro: false });
    const b = await newUser(browser, { pro: false });
    const put = await a.request.put("/api/profile", { data: { businessName: "Taller A" } });
    expect(put.status()).toBe(200);
    expect((await (await a.request.get("/api/profile")).json()).profile.businessName).toBe(
      "Taller A",
    );
    expect((await (await b.request.get("/api/profile")).json()).profile).toBeNull();
  });
});
