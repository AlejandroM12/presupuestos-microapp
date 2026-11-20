// Genera las creatividades estáticas de campaña y las imágenes sociales (Open Graph) a partir de
// los PDF y capturas REALES del producto. Todo el contenido de los documentos es ficticio.
//
// Uso: node marketing/build/build-creatives.mjs
// Salida: marketing/creatividades/<formato>/<concepto>.png y public/og/*.png
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const IMG = path.join(root, "marketing", "ejemplos", "imagenes");
const CAP = path.join(root, "marketing", "capturas");
const FONTS = path.join(root, "assets", "fonts");
const TMP = path.join(here, ".tmp");
mkdirSync(TMP, { recursive: true });

const url = (p) => pathToFileURL(p).href;
const dataUri = (file, mime) => `data:${mime};base64,${readFileSync(file).toString("base64")}`;

const NAVY = "#14213d";
const ORANGE = "#f08a3c";
const CTA = "#d9480f";

const LOGO = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="${ORANGE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h9l5 5v11H5z"/><path d="M9 14h6M9 17.5h3"/></svg>`;

/** Conceptos: cada uno muestra un documento o pantalla reales del producto. */
const CONCEPTS = [
  {
    key: "minutos",
    kicker: "AtajoLab Presupuestos",
    headline: "Tu presupuesto profesional, listo en minutos.",
    sub: "Con tu logo, en PDF y listo para compartir.",
    visual: { type: "pdf", file: "hero-minimalista" },
    og: "presupuestos",
  },
  {
    key: "taller",
    kicker: "Para talleres mecánicos",
    headline: "Repuestos, mano de obra y total claro.",
    sub: "Presupuestos de taller listos para mandar por WhatsApp.",
    visual: { type: "pdf", file: "rubro-talleres" },
    og: "para-talleres",
  },
  {
    key: "obra",
    kicker: "Para obras y albañilería",
    headline: "Cotizá tu obra sin olvidarte nada.",
    sub: "Materiales, mano de obra y total calculado solo.",
    visual: { type: "pdf", file: "rubro-construccion" },
    og: "para-construccion",
  },
  {
    key: "tecnicos",
    kicker: "Para técnicos y servicios",
    headline: "De la visita al presupuesto, en el momento.",
    sub: "Desde el celular, con tu logo y en PDF.",
    visual: { type: "pdf", file: "rubro-tecnicos" },
    og: "para-tecnicos",
  },
  {
    key: "sin-registro",
    kicker: "Probalo ahora",
    headline: "Armá tu presupuesto sin registrarte.",
    sub: "Descargá el PDF con una cuenta gratis.",
    visual: { type: "phone", file: "editor-movil-vista-previa" },
  },
];

const FORMATS = {
  // Zonas seguras de Stories/TikTok: sin texto clave en los primeros ~250 px ni en los últimos ~340 px.
  vertical: { w: 1080, h: 1920, dir: "vertical-1080x1920" },
  feed: { w: 1080, h: 1350, dir: "vertical-1080x1350" },
  cuadrado: { w: 1080, h: 1080, dir: "cuadrado-1080x1080" },
  horizontal: { w: 1200, h: 630, dir: "social-1200x630" },
};

function visualHtml(v, box) {
  if (v.type === "phone") {
    const src = dataUri(path.join(CAP, `${v.file}.png`), "image/png");
    return `<div class="phone" style="width:${box.w}px;height:${box.h}px"><img src="${src}"></div>`;
  }
  const src = dataUri(path.join(IMG, `${v.file}.webp`), "image/webp");
  return `<div class="doc" style="width:${box.w}px;height:${box.h}px"><img src="${src}"></div>`;
}

const css = (f) => `
@font-face{font-family:Inter;font-weight:400;src:url(${url(path.join(FONTS, "inter-latin-400-normal.woff"))})}
@font-face{font-family:Inter;font-weight:600;src:url(${url(path.join(FONTS, "inter-latin-600-normal.woff"))})}
@font-face{font-family:Inter;font-weight:700;src:url(${url(path.join(FONTS, "inter-latin-700-normal.woff"))})}
@font-face{font-family:Bricolage;font-weight:700;src:url(${url(path.join(FONTS, "bricolage-grotesque-latin-700-normal.woff"))})}
*{box-sizing:border-box;margin:0}
html,body{width:${f.w}px;height:${f.h}px;overflow:hidden;background:${NAVY};font-family:Inter,sans-serif;color:#fff}
.stage{position:relative;width:${f.w}px;height:${f.h}px;overflow:hidden;
  background:radial-gradient(1200px 800px at 85% 110%,rgba(240,138,60,.22),transparent 60%),${NAVY}}
.brand{position:absolute;display:flex;align-items:center;gap:14px;font-family:Bricolage;font-weight:700;font-size:34px}
.brand span.lab{color:${ORANGE}}
.brand i{display:grid;place-items:center;width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.1);font-style:normal}
.kicker{position:absolute;color:${ORANGE};font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.h{position:absolute;font-family:Bricolage;font-weight:700;line-height:1.03;letter-spacing:-.02em}
.sub{position:absolute;color:rgba(255,255,255,.78);line-height:1.3}
.cta{position:absolute;display:flex;align-items:center;justify-content:center;background:${CTA};color:#fff;font-weight:700;border-radius:999px;box-shadow:0 12px 30px rgba(0,0,0,.28)}
.note{position:absolute;color:rgba(255,255,255,.6);font-size:22px}
.doc{position:absolute;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.45)}
.doc img{display:block;width:100%}
.phone{position:absolute;background:#0b1224;border-radius:64px;padding:16px;box-shadow:0 30px 70px rgba(0,0,0,.5);border:2px solid rgba(255,255,255,.18)}
.phone img{display:block;width:100%;height:100%;object-fit:cover;object-position:top;border-radius:50px}
`;

function layout(c, f) {
  const urlText = "presupuestos.atajolab.dev";
  const brand = (x, y, size = 34) =>
    `<div class="brand" style="left:${x}px;top:${y}px;font-size:${size}px"><i>${LOGO}</i><div>Atajo<span class="lab">Lab</span> Presupuestos</div></div>`;
  const text = ({ x, w, kicker, h, sub }) => `
    <div class="kicker" style="left:${x.x}px;top:${kicker.y}px;font-size:${kicker.s}px">${c.kicker}</div>
    <div class="h" style="left:${x.x}px;top:${h.y}px;width:${w}px;font-size:${h.s}px">${c.headline}</div>
    <div class="sub" style="left:${x.x}px;top:${sub.y}px;width:${w}px;font-size:${sub.s}px">${c.sub}</div>`;
  const cta = (x, y, w, h, s) =>
    `<div class="cta" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;font-size:${s}px">Crear mi presupuesto gratis</div>`;
  const rot = (html, x, y, deg = -2.5) =>
    `<div style="position:absolute;left:${x}px;top:${y}px;transform:rotate(${deg}deg)">${html.replace("position:absolute;", "")}</div>`;
  const note = (x, y, extra = "") =>
    `<div class="note" style="left:${x}px;top:${y}px;${extra}">${c.visual.type === "pdf" ? "Ejemplo con datos ficticios · " : ""}${urlText}</div>`;

  if (f === FORMATS.vertical) {
    const box = c.visual.type === "phone" ? { w: 520, h: 560 } : { w: 800, h: 560 };
    return `<div class="stage">
      ${brand(80, 250)}
      ${text({ x: { x: 80 }, w: 920, kicker: { y: 360, s: 30 }, h: { y: 415, s: 100 }, sub: { y: 745, s: 40 } })}
      ${rot(visualHtml(c.visual, box), (1080 - box.w) / 2, 890, -2)}
      ${cta(120, 1480, 840, 92, 40)}
      ${note(120, 1588)}
    </div>`;
  }
  if (f === FORMATS.feed) {
    const box = c.visual.type === "phone" ? { w: 440, h: 560 } : { w: 540, h: 560 };
    return `<div class="stage">
      ${brand(64, 56, 30)}
      ${text({ x: { x: 64 }, w: 952, kicker: { y: 150, s: 24 }, h: { y: 190, s: 86 }, sub: { y: 470, s: 34 } })}
      ${rot(visualHtml(c.visual, box), (1080 - box.w) / 2, 560)}
      ${cta(120, 1160, 840, 88, 36)}
      ${note(120, 1270)}
    </div>`;
  }
  if (f === FORMATS.cuadrado) {
    const box = c.visual.type === "phone" ? { w: 380, h: 740 } : { w: 420, h: 780 };
    return `<div class="stage">
      ${brand(56, 56, 28)}
      ${text({ x: { x: 56 }, w: 560, kicker: { y: 220, s: 22 }, h: { y: 262, s: 66 }, sub: { y: 640, s: 28 } })}
      ${cta(56, 880, 500, 84, 30)}
      ${note(56, 990, "font-size:20px")}
      ${rot(visualHtml(c.visual, box), 620, 150, 3)}
    </div>`;
  }
  // horizontal
  const box = c.visual.type === "phone" ? { w: 250, h: 470 } : { w: 330, h: 520 };
  return `<div class="stage">
    ${brand(56, 44, 24)}
    ${text({ x: { x: 56 }, w: 640, kicker: { y: 150, s: 18 }, h: { y: 184, s: 52 }, sub: { y: 380, s: 24 } })}
    ${cta(56, 470, 420, 68, 24)}
    ${note(56, 560, "font-size:18px")}
    ${rot(visualHtml(c.visual, box), 810, 70, 3)}
  </div>`;
}

const browser = await chromium.launch();
async function render(c, f, outFile) {
  const html = `<!doctype html><meta charset="utf-8"><style>${css(f)}</style><body>${layout(c, f)}</body>`;
  const file = path.join(TMP, "creative.html");
  writeFileSync(file, html);
  const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
  await page.goto(url(file));
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(path.dirname(outFile), { recursive: true });
  await page.screenshot({ path: outFile });
  await page.close();
}

for (const c of CONCEPTS) {
  for (const f of Object.values(FORMATS)) {
    await render(c, f, path.join(root, "marketing", "creatividades", f.dir, `${c.key}.png`));
  }
  // Imagen social de la landing y de cada página por rubro (Open Graph, 1200×630)
  if (c.og) await render(c, FORMATS.horizontal, path.join(root, "public", "og", `${c.og}.png`));
}
await browser.close();
rmSync(TMP, { recursive: true, force: true });
console.log("Creatividades generadas.");
