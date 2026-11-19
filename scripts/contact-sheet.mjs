// Utilidad de desarrollo: junta varias imágenes (páginas de PDF rasterizadas) en una sola hoja
// para revisarlas a la vez. Uso: node scripts/contact-sheet.mjs <salida.png> <img1> <img2> ...
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const [out, ...files] = process.argv.slice(2);
if (!out || files.length === 0) {
  console.error("Uso: node scripts/contact-sheet.mjs <salida.png> <img1> <img2> ...");
  process.exit(1);
}
const height = Number(process.env.SHEET_HEIGHT ?? 1000);
const html = `<body style="margin:0;background:#777;display:flex;gap:8px;align-items:flex-start">${files
  .map((f) => `<img src="data:image/png;base64,${readFileSync(path.resolve(f)).toString("base64")}" style="height:${height}px">`)
  .join("")}</body>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height } });
await page.setContent(html);
await page.waitForFunction(() => [...document.images].every((i) => i.complete));
await page.screenshot({ path: path.resolve(out), fullPage: true });
await browser.close();
