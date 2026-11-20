// Utilidad de desarrollo: rasteriza la primera página (o las indicadas) de cada PDF de una carpeta
// a WebP/PNG con Chromium, sin dependencias nativas extra.
// Uso: node scripts/pdf-to-images.mjs <carpeta-pdf> <carpeta-salida> [--scale 1.5] [--format webp|png] [--pages 1]
import { chromium } from "@playwright/test";
import { copyFileSync, createReadStream, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const [pdfDir, outDir] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!pdfDir || !outDir) {
  console.error("Uso: node scripts/pdf-to-images.mjs <carpeta-pdf> <carpeta-salida> [--scale 1.5] [--format webp|png] [--pages 1]");
  process.exit(1);
}
const scale = Number(flag("scale", "1.5"));
const format = flag("format", "webp");
const maxPages = Number(flag("pages", "1"));
mkdirSync(outDir, { recursive: true });

const root = path.resolve(pdfDir);
const pdfjs = path.resolve("node_modules/pdfjs-dist/build");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".pdf": "application/pdf" };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = url.startsWith("/pdfjs/") ? path.join(pdfjs, url.slice(7)) : path.join(root, url);
  try {
    statSync(file);
  } catch {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const html = `<!doctype html><body><canvas id="c"></canvas>
<script type="module">
import * as pdfjs from "/pdfjs/pdf.min.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
window.render = async (url, n, scale, mime) => {
  const doc = await pdfjs.getDocument({ url }).promise;
  if (n > doc.numPages) return { pages: doc.numPages };
  const page = await doc.getPage(n);
  const vp = page.getViewport({ scale });
  const c = document.getElementById("c");
  c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return { pages: doc.numPages, data: c.toDataURL(mime, 0.86), w: c.width, h: c.height };
};
</script></body>`;
writeFileSync(path.join(root, "__viewer.html"), html);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/__viewer.html`);
const mime = format === "png" ? "image/png" : "image/webp";
for (const name of readdirSync(root).filter((f) => f.endsWith(".pdf"))) {
  for (let n = 1; n <= maxPages; n++) {
    const r = await page.evaluate(([u, n, s, m]) => window.render(u, n, s, m), [`${base}/${name}`, n, scale, mime]);
    if (!r.data) break;
    const file = path.join(outDir, `${name.replace(/\.pdf$/, "")}${maxPages > 1 ? `-p${n}` : ""}.${format}`);
    writeFileSync(file, Buffer.from(r.data.split(",")[1], "base64"));
    console.log(path.basename(file), `${r.w}x${r.h}`, `${Math.round(statSync(file).size / 1024)} KB`);
  }
}
await browser.close();
server.close();
import("node:fs").then((fs) => fs.rmSync(path.join(root, "__viewer.html"), { force: true }));
