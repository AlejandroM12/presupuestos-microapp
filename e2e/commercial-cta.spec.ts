import { expect, test } from "@playwright/test";

// El servidor de E2E define ATAJOLAB_WHATSAPP_E164 con un número de PRUEBA (no es el comercial).
const TEST_NUMBER = "5491100000000";

test.describe("CTA de plantillas personalizadas", () => {
  test("los botones abren WhatsApp con el mensaje de la actividad y sin desbordes", async ({
    page,
  }) => {
    await page.goto("/");
    const links = page.locator('a[href^="https://wa.me/"]');
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThanOrEqual(2);

    for (const href of await links.evaluateAll((els) => els.map((e) => e.getAttribute("href")!))) {
      const url = new URL(href);
      expect(url.pathname).toBe(`/${TEST_NUMBER}`);
      expect(url.searchParams.get("text")).toContain("plantilla personalizada");
    }
    // Se abren en otra pestaña sin pasar el contexto de la página
    await expect(links.first()).toHaveAttribute("target", "_blank");
    await expect(links.first()).toHaveAttribute("rel", /noopener/);

    // Un CTA por profesión incluye la actividad en el mensaje
    const withActivity = await links.evaluateAll((els) =>
      els.map((e) => new URL(e.getAttribute("href")!).searchParams.get("text")!),
    );
    expect(withActivity.some((t) => /Talleres mecánicos/i.test(t))).toBe(true);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("el CTA es alcanzable y tocable en el viewport actual", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator('a[href^="https://wa.me/"]').first();
    await cta.scrollIntoViewIfNeeded();
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(36);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  });
});
