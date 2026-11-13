// Utilidad de desarrollo: rasteriza PDFs a PNG (primera y demás páginas) para revisarlos a ojo.
// Uso: node scripts/pdf-to-png.mjs <carpeta-con-pdfs>
import { chromium } from "@playwright/test";
import { copyFileSync, createReadStream, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const dir = path.resolve(process.argv[2] ?? ".");
const pdfjs = path.resolve("node_modules/pdfjs-dist/build");
copyFileSync(path.join(pdfjs, "pdf.min.mjs"), path.join(dir, "pdf.min.mjs"));
copyFileSync(path.join(pdfjs, "pdf.worker.min.mjs"), path.join(dir, "pdf.worker.min.mjs"));

const types = { ".html": "text/html", ".mjs": "text/javascript", ".pdf": "application/pdf" };
const server = createServer((req, res) => {
  const file = path.join(dir, decodeURIComponent(req.url.split("?")[0]));
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

const html = `<!doctype html><body style="margin:0;background:#888"><canvas id="c"></canvas>
<script type="module">
import * as pdfjs from "/pdf.min.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
window.renderPage = async (url, n) => {
  const doc = await pdfjs.getDocument({ url }).promise;
  if (n > doc.numPages) return doc.numPages;
  const page = await doc.getPage(n);
  const vp = page.getViewport({ scale: 1.5 });
  const c = document.getElementById("c");
  c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
  return doc.numPages;
};
</script></body>`;
import("node:fs").then((fs) => fs.writeFileSync(path.join(dir, "viewer.html"), html));
await new Promise((r) => setTimeout(r, 100));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/viewer.html`);
for (const name of readdirSync(dir).filter((f) => f.endsWith(".pdf"))) {
  for (let n = 1; n <= 3; n++) {
    const pages = await page.evaluate(([u, n]) => window.renderPage(u, n), [`${base}/${name}`, n]);
    if (n > pages) break;
    await page.locator("canvas").screenshot({ path: path.join(dir, `${name.replace(".pdf", "")}-p${n}.png`) });
  }
}
await browser.close();
server.close();
