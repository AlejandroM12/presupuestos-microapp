import { deflateSync } from "node:zlib";
import { parseCustomTemplateConfig } from "@/domain/custom-template/config";
import { calculateTotals } from "@/domain/quote/calculations";
import { defaultQuote } from "@/domain/quote/defaults";
import { quoteSchema, type Quote } from "@/domain/quote/schema";
import { formatMoney } from "@/lib/format";
import { DEMO_TEMPLATES, DEMO_USD, type DemoTemplateData } from "./demo-data";
import type { CustomRenderConfig } from "./model";

export { DEMO_TEMPLATES };
export type { DemoTemplateData };

// ---------------------------------------------------------------------------
// Logos de demostración (PNG generados en código: formas simples, sin marcas reales)
// ---------------------------------------------------------------------------

function crc32(buf: Buffer): number {
  let c: number;
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

type Rgb = [number, number, number];

/** PNG RGBA de w×h; `paint(x, y)` devuelve el color o null (transparente). */
function png(w: number, h: number, paint: (x: number, y: number) => Rgb | null): string {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const c = paint(x, y);
      const o = y * (w * 4 + 1) + 1 + x * 4;
      if (c) {
        raw[o] = c[0];
        raw[o + 1] = c[1];
        raw[o + 2] = c[2];
        raw[o + 3] = 255;
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header[8] = 8;
  header[9] = 6;
  const file = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${file.toString("base64")}`;
}

const dist = (x: number, y: number, cx: number, cy: number) => Math.hypot(x - cx, y - cy);

export type LogoKind = "engranaje" | "casa" | "copo" | "ancho" | "alto";

/** Logos sencillos con distintas proporciones (engranaje 1:1, casa 1:1, copo 1:1, ancho 4:1, alto 1:2). */
export function demoLogo(kind: LogoKind): string {
  switch (kind) {
    case "engranaje": {
      const c: Rgb = [14, 116, 144];
      return png(200, 200, (x, y) => {
        const d = dist(x, y, 100, 100);
        const a = Math.atan2(y - 100, x - 100);
        const teeth = d < 92 && d > 70 && Math.cos(a * 8) > 0.2;
        if ((d < 70 && d > 34) || teeth) return c;
        if (d <= 34 && d > 16) return c;
        return null;
      });
    }
    case "casa": {
      const c: Rgb = [180, 83, 9];
      return png(200, 200, (x, y) => {
        const roof = y > 30 && y < 100 && Math.abs(x - 100) < (y - 30) * 1.3;
        const body = y >= 100 && y < 175 && x > 45 && x < 155;
        const door = y > 120 && x > 88 && x < 112;
        if (door) return null;
        return roof || body ? c : null;
      });
    }
    case "copo": {
      const c: Rgb = [29, 78, 216];
      return png(200, 200, (x, y) => {
        const dx = Math.abs(x - 100);
        const dy = Math.abs(y - 100);
        const arm =
          (dx < 7 && dy < 85) || (dy < 7 && dx < 85) || (Math.abs(dx - dy) < 6 && dx < 60);
        return arm || dist(x, y, 100, 100) < 14 ? c : null;
      });
    }
    case "ancho": {
      const c: Rgb = [15, 23, 42];
      return png(480, 120, (x, y) =>
        y > 20 && y < 100 && x > 10 && x < 470 && (x + y) % 60 < 38 ? c : null,
      );
    }
    case "alto": {
      const c: Rgb = [190, 24, 93];
      return png(100, 200, (x, y) =>
        dist(x, y, 50, 50) < 40 || (y > 100 && x > 20 && x < 80) ? c : null,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Presupuestos de demostración
// ---------------------------------------------------------------------------

export interface DemoDocument {
  data: DemoTemplateData;
  quote: Quote;
  config: CustomRenderConfig;
  /** Valores de los campos tal como los guarda el presupuesto. */
  values: Record<string, string | number | boolean>;
}

export interface DemoOptions {
  /** Cantidad de conceptos (para pruebas de volumen); por defecto, los de la demostración. */
  itemCount?: number;
  /** Variante en USD con precios propios (sin conversión automática). */
  currency?: "ARS" | "USD";
  /** Densidad compacta de la plantilla privada. */
  compact?: boolean;
}

/** Leyenda que identifica los documentos como demostración (visible en cada página). */
export const DEMO_LABEL = "MUESTRA DE DEMOSTRACIÓN · datos ficticios";

function build(data: DemoTemplateData, options: DemoOptions = {}): DemoDocument {
  const { itemCount, currency = "ARS", compact = false } = options;
  const q = defaultQuote(new Date(2026, 10, 19));
  q.number = "0048";
  q.title = data.title;
  q.description = data.description;
  q.issuer = { ...q.issuer, ...data.issuer, logo: demoLogo(data.logo) };
  q.customer = { ...q.customer, ...data.customer };
  q.notes = data.notes;
  q.terms = data.terms;
  q.deliveryTime = data.deliveryTime;
  q.taxes = data.taxes;
  const usd = currency === "USD" ? DEMO_USD[data.key] : undefined;
  if (usd) {
    q.currency = "USD";
    q.taxes = usd.taxes ?? [];
  }
  const base = (usd ? usd.items : data.items).map((it, i) => ({
    id: `demo-${i}`,
    description: it.description,
    quantity: it.quantity,
    unit: it.unit,
    unitPrice: it.unitPrice,
    discountPercent: it.discountPercent ?? "0",
  }));
  // Para pruebas de volumen se repite la lista de conceptos numerándolos.
  q.items =
    itemCount === undefined
      ? base
      : Array.from({ length: itemCount }, (_, i) => ({
          ...base[i % base.length],
          id: `demo-${i}`,
          description: `${base[i % base.length].description} (ítem ${i + 1})`,
        }));
  q.paymentTerms = data.paymentTerms;

  const values = { ...data.values };
  if (data.advancePercent !== undefined) {
    // El anticipo se calcula sobre el total real y se menciona con el mismo importe en la forma de pago.
    const total = calculateTotals(quoteSchema.parse(q)).total;
    const advance = (Number(total) * data.advancePercent) / 100;
    values.anticipo = Math.round(advance * 100) / 100;
    q.paymentTerms = data.paymentTerms.replace(
      "{anticipo}",
      formatMoney(String(values.anticipo), currency),
    );
  }
  const parsed = quoteSchema.parse({ ...q, customFieldValues: values });
  const style = data.config.style as { footerText?: string };
  const config = {
    name: data.name,
    ...parseCustomTemplateConfig({
      ...data.config,
      style: {
        ...style,
        footerText: `${DEMO_LABEL} · ${style.footerText ?? ""}`.trim(),
        density: compact ? "compact" : "standard",
      },
    }),
  };
  return { data, quote: parsed, config, values };
}

export function demoDocument(
  key: DemoTemplateData["key"],
  options: DemoOptions | number = {},
): DemoDocument {
  const data = DEMO_TEMPLATES.find((d) => d.key === key)!;
  return build(data, typeof options === "number" ? { itemCount: options } : options);
}

export const DEMO_TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";
