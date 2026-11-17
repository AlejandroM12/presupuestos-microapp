import { expect, test, type Page } from "@playwright/test";

const unique = (tag: string) =>
  `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.example`;
const PASSWORD = "clave-e2e-segura-1";

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function register(
  page: Page,
  email: string,
  next?: string,
  opts: { waitForLeave?: boolean } = {},
) {
  const waitForLeave = opts.waitForLeave ?? true;
  await page.goto(`/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Nombre (opcional)").fill("Laura E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  // Sin esperar, asserts de URL/contenido compiten con el redirect post-registro.
  // En errores (email duplicado) hay que desactivar waitForLeave.
  if (waitForLeave) {
    await page.waitForURL((url) => !url.pathname.startsWith("/registro"), { timeout: 15_000 });
  }
}

test.describe("cuentas de usuario", () => {
  test("las rutas protegidas redirigen al login conservando el destino", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/ingresar\?next=%2Fdashboard$/);
    await expect(page.getByRole("heading", { name: "Ingresá a tu cuenta" })).toBeVisible();
  });

  test("registro, sesión activa y cierre de sesión", async ({ page }) => {
    await register(page, unique("reg"), "/dashboard");
    await page.waitForURL((url) => url.pathname === "/dashboard");
    await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();

    await signOut(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test("login con credenciales correctas e incorrectas", async ({ page }) => {
    const email = unique("login");
    await register(page, email, "/dashboard");
    await signOut(page);

    await page.goto("/ingresar");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill("clave-equivocada-9");
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible();

    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page).toHaveURL(/\/crear$/);
  });

  test("no permite registrar dos veces el mismo email", async ({ page }) => {
    const email = unique("dup");
    await register(page, email, "/dashboard");
    await signOut(page);
    await register(page, email, undefined, { waitForLeave: false });
    await expect(page.getByText("Ya existe una cuenta con ese email")).toBeVisible();
  });

  test("valida los datos del registro en el servidor", async ({ page }) => {
    await page.goto("/registro");
    await page.getByLabel("Email").fill("no-es-un-email");
    await page.getByLabel("Contraseña").fill("123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Ingresá un email válido")).toBeVisible();
    await expect(page.getByText("Usá al menos 8 caracteres")).toBeVisible();
  });

  test("ignora destinos externos en el parámetro next", async ({ page }) => {
    await register(page, unique("next"), "https://evil.example/robar");
    await expect(page).toHaveURL(/\/crear\/?$/);
    expect(page.url()).not.toContain("evil.example");
  });

  test("la recuperación responde igual exista o no la cuenta", async ({ page }) => {
    await page.goto("/recuperar");
    await page.getByLabel("Email").fill(unique("noexiste"));
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByRole("status")).toContainText("Si existe una cuenta con ese email");
  });

  test("un token de recuperación inválido muestra un aviso", async ({ page }) => {
    await page.goto(`/recuperar/${"x".repeat(43)}`);
    await expect(page.getByRole("heading", { name: "Enlace no válido" })).toBeVisible();
  });

  test("el editor muestra el estado de la sesión", async ({ page, isMobile }) => {
    void isMobile;
    await register(page, unique("ed"));
    await expect(page).toHaveURL(/\/crear$/);
    await expect(page.getByRole("link", { name: "Mi cuenta" })).toBeVisible();
  });
});
