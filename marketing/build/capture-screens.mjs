// Capturas reales del editor con datos ficticios (móvil y escritorio).
// Uso: node marketing/build/capture-screens.mjs [URL_BASE]   (por defecto producción)
import { chromium, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "https://presupuestos.atajolab.dev";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "capturas");

const ITEMS = [
  ["Diagnóstico y visita técnica", "1", "14500"],
  ["Carga de gas refrigerante R410A", "1", "30400"],
  ["Mano de obra técnica", "2", "16000"],
];

async function fill(page) {
  await page.getByLabel("Nombre comercial").fill("Clima Hogar Servicio Técnico");
  await page.getByLabel("Nombre", { exact: true }).fill("Lucía Fernández");
  await page.getByLabel("Título").fill("Reparación de aire acondicionado");
  for (let i = 0; i < ITEMS.length; i++) {
    if (i > 0) await page.getByRole("button", { name: /Agregar concepto/i }).click();
    await page.getByLabel("Descripción", { exact: true }).nth(i).fill(ITEMS[i][0]);
    await page.getByLabel("Cantidad").nth(i).fill(ITEMS[i][1]);
    await page.getByLabel("Precio unitario").nth(i).fill(ITEMS[i][2]);
  }
}

const browser = await chromium.launch();

// Móvil (iPhone 13): formulario y vista previa
{
  const ctx = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/crear`, { waitUntil: "networkidle" });
  await fill(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(OUT, "editor-movil-formulario.png") });
  await page.getByRole("tab", { name: "Vista previa" }).click();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(OUT, "editor-movil-vista-previa.png") });
  await ctx.close();
}

// Escritorio: editor y vista previa lado a lado
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/crear`, { waitUntil: "networkidle" });
  await fill(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "editor-escritorio.png") });
  await ctx.close();
}

// Landing (primera pantalla en móvil y escritorio)
{
  const m = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 3 });
  const p = await m.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.screenshot({ path: path.join(OUT, "landing-movil.png") });
  await m.close();
  const d = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const q = await d.newPage();
  await q.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await q.screenshot({ path: path.join(OUT, "landing-escritorio.png") });
  await d.close();
}
await browser.close();
console.log("Capturas en", OUT);
