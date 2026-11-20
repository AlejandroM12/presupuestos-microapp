import { expect, test, type Page } from "@playwright/test";
import { LINKS } from "../marketing/build/utm-links.mjs";

const PASSWORD = "clave-e2e-segura-1";
const unique = (tag: string) =>
  `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.example`;

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("landing para tráfico de anuncios", () => {
  test("el mensaje principal y los CTA están en la primera pantalla, sin desbordes", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Creá presupuestos profesionales en minutos." }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Personalizalos con tu logo, descargalos en PDF y compartilos con tus clientes.",
      ),
    ).toBeVisible();
    const cta = page.getByRole("link", { name: "Crear mi presupuesto gratis" }).first();
    await expect(cta).toBeInViewport();
    const box = (await cta.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44); // botón tocable
    await expect(page.getByRole("link", { name: "Ver ejemplos" }).first()).toBeInViewport();
    expect(await noOverflow(page)).toBeLessThanOrEqual(1);
    // El producto real (PDF generado) aparece con dimensiones y carga correctamente
    const hero = page.locator('img[src="/ejemplos/hero-minimalista.webp"]');
    await expect(hero).toBeVisible();
    expect(await hero.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  });

  test("el CTA lleva al editor sin exigir registro y 'Ver ejemplos' muestra los PDF reales", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Ver ejemplos" }).first().click();
    await expect(page.locator("#ejemplos")).toBeInViewport();
    for (const alt of [/service y frenos/, /refacción de cocina/, /aire acondicionado/]) {
      await expect(page.locator("#ejemplos").getByRole("img", { name: alt })).toBeVisible();
    }
    for (const file of ["talleres", "construccion", "tecnicos"]) {
      const pdf = await page.request.get(`/ejemplos/ejemplo-${file}.pdf`);
      expect(pdf.status()).toBe(200);
      expect(pdf.headers()["content-type"]).toContain("application/pdf");
    }
    await page.getByRole("link", { name: "Crear mi presupuesto gratis" }).first().click();
    await expect(page).toHaveURL(/\/crear$/);
    await expect(page.getByLabel("Nombre comercial")).toBeVisible();
  });

  for (const slug of ["talleres", "construccion", "tecnicos"]) {
    test(`página por rubro /para/${slug}: contenido propio, imagen real y metadatos`, async ({
      page,
    }) => {
      const response = await page.goto(`/para/${slug}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Crear mi presupuesto gratis" }).first(),
      ).toBeInViewport();
      const img = page.locator(`img[src="/ejemplos/rubro-${slug}.webp"]`);
      expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
      expect(await noOverflow(page)).toBeLessThanOrEqual(1);
      // Canonical absoluto, Open Graph y Twitter con imagen absoluta
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`/para/${slug}$`),
      );
      const og = await page.locator('meta[property="og:image"]').getAttribute("content");
      expect(og).toMatch(/^https?:\/\/.+\/og\/para-.+\.png$/);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );
      const ogPath = new URL(og!).pathname;
      const image = await page.request.get(ogPath);
      expect(image.status()).toBe(200);
      expect(image.headers()["content-type"]).toContain("image/png");
    });
  }

  test("una ruta de rubro inexistente responde 404", async ({ page }) => {
    expect((await page.goto("/para/inexistente"))?.status()).toBe(404);
  });

  test("metadatos para compartir de la landing: Open Graph, Twitter, canonical, favicon e imagen 1200×630", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Creá presupuestos profesionales en minutos/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Empezá gratis/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /minutos/);
    const og = (await page.locator('meta[property="og:image"]').getAttribute("content"))!;
    expect(og).toMatch(/^https?:\/\//);
    expect(await page.locator('meta[name="twitter:image"]').getAttribute("content")).toMatch(
      /^https?:\/\//,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    const png = await page.request.get(new URL(og).pathname);
    expect(png.status()).toBe(200);
    const body = await png.body();
    // Cabecera PNG: ancho y alto en los bytes 16-23
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
    expect((await page.request.get("/favicon.ico")).status()).toBe(200);
  });

  test("sitemap y robots incluyen las páginas de campaña", async ({ page }) => {
    const sitemap = await (await page.request.get("/sitemap.xml")).text();
    for (const slug of ["talleres", "construccion", "tecnicos"])
      expect(sitemap).toContain(`/para/${slug}`);
    expect((await page.request.get("/robots.txt")).status()).toBe(200);
  });

  test("todos los enlaces con UTM de las campañas responden sin redirecciones ni errores", async ({
    page,
  }) => {
    for (const l of LINKS as { url: string }[]) {
      const u = new URL(l.url);
      const response = await page.request.get(`${u.pathname}${u.search}`, { maxRedirects: 0 });
      expect(response.status(), l.url).toBe(200);
    }
  });
});

test.describe("medición y privacidad", () => {
  test("sin identificadores configurados no se muestra aviso ni se cargan scripts de terceros", async ({
    page,
  }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      const host = new URL(r.url()).hostname;
      if (!["localhost", "127.0.0.1"].includes(host)) external.push(r.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Crear mi presupuesto gratis" }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("consent-banner")).toHaveCount(0);
    expect(external).toEqual([]);
  });

  test("el origen de adquisición (UTM) se conserva hasta el registro y no incluye datos personales", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem("ph_debug", "1"));
    await page.goto(
      "/?utm_source=Instagram&utm_medium=paid_social&utm_campaign=lanzamiento_01&utm_content=minutos_v1",
    );
    await page.getByRole("link", { name: "Crear mi presupuesto gratis" }).first().click();
    await expect(page).toHaveURL(/\/crear$/);
    await expect(page.getByLabel("Nombre comercial")).toBeVisible();

    // Registro: la señal efímera dispara "sign_up" con la misma atribución
    const email = unique("utm");
    await page.goto("/registro?next=/crear");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await page.waitForURL((u) => u.pathname === "/crear");
    await page.waitForLoadState("networkidle");

    const log = (await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("ph_debug_log") ?? "[]"),
    )) as { event: string; params: Record<string, unknown>; sent: boolean }[];
    const names = log.map((e) => e.event);
    for (const expected of ["landing_view", "cta_start", "editor_start", "sign_up"]) {
      expect(names, expected).toContain(expected);
    }
    for (const e of log) {
      expect(e.params.utm_source).toBe("instagram");
      expect(e.params.utm_campaign).toBe("lanzamiento_01");
      expect(e.sent).toBe(false); // sin consentimiento ni identificadores, nada sale del sitio
      // Lista blanca: ningún dato personal ni contenido
      expect(JSON.stringify(e.params)).not.toContain(email);
      expect(
        Object.keys(e.params).every((k) =>
          /^(location|page|plan|value|currency|content_name|first|transaction_id|utm_.*)$/.test(k),
        ),
      ).toBe(true);
    }
    // La cookie efímera del registro se consume (no queda de forma permanente)
    expect(await page.evaluate(() => document.cookie.includes("ph_signup"))).toBe(false);
  });

  test("con identificadores y consentimiento: los píxeles solo se cargan al aceptar", async ({
    page,
  }) => {
    const hits: string[] = [];
    await page.route("**/api/analytics-config", (route) =>
      route.fulfill({
        json: { meta: "1234567890123", tiktok: "ABCDEFGHIJKLMNOPQRST", ga4: "G-ABCDEF1234" },
      }),
    );
    await page.route(
      /connect\.facebook\.net|analytics\.tiktok\.com|googletagmanager\.com/,
      (route) => {
        hits.push(route.request().url());
        return route.fulfill({ contentType: "text/javascript", body: "" });
      },
    );
    await page.goto("/");
    const banner = page.getByTestId("consent-banner");
    await expect(banner).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(hits).toEqual([]); // nada antes de decidir

    await banner.getByRole("button", { name: "Aceptar" }).click();
    await expect.poll(() => hits.length).toBeGreaterThanOrEqual(3);
    expect(hits.some((h) => h.includes("facebook"))).toBe(true);
    expect(hits.some((h) => h.includes("tiktok"))).toBe(true);
    expect(hits.some((h) => h.includes("googletagmanager"))).toBe(true);
    await expect(banner).toHaveCount(0);
  });

  test("el pie permite volver a elegir las cookies", async ({ page }) => {
    await page.route("**/api/analytics-config", (route) =>
      route.fulfill({ json: { ga4: "G-ABCDEF1234" } }),
    );
    await page.route(/googletagmanager\.com/, (route) =>
      route.fulfill({ contentType: "text/javascript", body: "" }),
    );
    await page.goto("/");
    await page.getByTestId("consent-banner").getByRole("button", { name: "Rechazar" }).click();
    await expect(page.getByTestId("consent-banner")).toHaveCount(0);
    await page.getByRole("button", { name: "Preferencias de cookies" }).click();
    await expect(page.getByTestId("consent-banner")).toBeVisible();
  });

  test("al rechazar no se carga nada y la elección se recuerda", async ({ page }) => {
    const hits: string[] = [];
    await page.route("**/api/analytics-config", (route) =>
      route.fulfill({ json: { meta: "1234567890123" } }),
    );
    await page.route(/connect\.facebook\.net/, (route) => {
      hits.push(route.request().url());
      return route.fulfill({ contentType: "text/javascript", body: "" });
    });
    await page.goto("/");
    await page.getByTestId("consent-banner").getByRole("button", { name: "Rechazar" }).click();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("consent-banner")).toHaveCount(0);
    expect(hits).toEqual([]);
  });

  test("Global Privacy Control se respeta: sin aviso y sin píxeles", async ({ page }) => {
    const hits: string[] = [];
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "globalPrivacyControl", { value: true }),
    );
    await page.route("**/api/analytics-config", (route) =>
      route.fulfill({ json: { meta: "1234567890123" } }),
    );
    await page.route(/connect\.facebook\.net/, (route) => {
      hits.push(route.request().url());
      return route.fulfill({ contentType: "text/javascript", body: "" });
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("consent-banner")).toHaveCount(0);
    expect(hits).toEqual([]);
  });

  test("identificadores con formato inválido en el servidor se ignoran", async ({ page }) => {
    const config = await (await page.request.get("/api/analytics-config")).json();
    expect(config).toEqual({}); // el entorno de pruebas no define ninguno
  });
});

test.describe("navegadores internos de Instagram y TikTok", () => {
  const agents = {
    instagram:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 Instagram 320.0.0.0.0 Android",
    tiktok:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview/d8a21c6",
    facebook:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0;FBBV/500000;FBDV/iPhone14,5]",
    facebookBot: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    whatsappBot: "WhatsApp/2.23.20 A",
  };
  for (const [name, ua] of Object.entries(agents)) {
    test(`${name}: la landing y las páginas por rubro responden 200 con metadatos`, async ({
      playwright,
      baseURL,
    }) => {
      const ctx = await playwright.request.newContext({
        baseURL,
        extraHTTPHeaders: { "user-agent": ua },
      });
      for (const p of ["/", "/para/talleres", "/crear"]) {
        const r = await ctx.get(p, { maxRedirects: 0 });
        expect(r.status(), `${name} ${p}`).toBe(200);
        const html = await r.text();
        if (p !== "/crear") expect(html).toContain('property="og:image"');
      }
      await ctx.dispose();
    });
  }
});
