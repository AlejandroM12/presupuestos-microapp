/* eslint-disable jsx-a11y/alt-text -- el Image de react-pdf no admite alt */
import { Image, Text, View, type Styles } from "@react-pdf/renderer";

type Style = Styles[string];
import type { PdfModel } from "./model";

export const PAGE_PADDING = 44;

/** Mezcla un color hex con blanco: ratio 0 = blanco, 1 = color original. */
export function tint(hex: string, ratio: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mixc = (c: number) => Math.round(255 - (255 - c) * ratio);
  const r = mixc((n >> 16) & 255);
  const g = mixc((n >> 8) & 255);
  const b = mixc(n & 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Color de texto legible (blanco o casi negro) sobre un fondo dado. */
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 160 ? "#111827" : "#ffffff";
}

/** Marca de agua diagonal para las vistas previas de diseños que aún no se compraron. */
export function PreviewMark({ m }: { m: PdfModel }) {
  if (!m.preview) return null;
  return (
    <View
      fixed
      style={{
        position: "absolute",
        top: 330,
        left: 40,
        width: 515,
        alignItems: "center",
        transform: "rotate(-32deg)",
      }}
    >
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 62,
          fontWeight: 700,
          color: "#dc2626",
          opacity: 0.13,
        }}
      >
        VISTA PREVIA
      </Text>
      <Text
        style={{ fontFamily: "Inter", fontSize: 16, color: "#dc2626", opacity: 0.2, marginTop: 4 }}
      >
        AtajoLab Presupuestos · no es el documento final
      </Text>
    </View>
  );
}
export const LEGAL_NOTE =
  "Presupuesto comercial. Este documento no constituye una factura ni tiene validez fiscal.";
export const BRAND_NOTE = "Creado con AtajoLab Presupuestos · presupuestos.atajolab.dev";

export function Logo({ src, style }: { src: string; style?: Style }) {
  if (!src) return null;
  return (
    <Image src={src} style={{ maxHeight: 48, maxWidth: 140, objectFit: "contain", ...style }} />
  );
}

export function contactLine(m: PdfModel): string {
  const i = m.quote.issuer;
  return [i.email, i.phone && `Tel. ${i.phone}`, i.whatsapp && `WhatsApp ${i.whatsapp}`, i.website]
    .filter(Boolean)
    .join("  ·  ");
}

/** Datos de contacto, uno por línea (para columnas angostas). */
export function contactLines(m: PdfModel): string[] {
  const i = m.quote.issuer;
  return [
    i.email,
    i.phone && `Tel. ${i.phone}`,
    i.whatsapp && `WhatsApp ${i.whatsapp}`,
    i.website,
  ].filter((x): x is string => Boolean(x));
}

export function customerLines(m: PdfModel): string[] {
  const c = m.quote.customer;
  return [
    c.company,
    [c.email, c.phone].filter(Boolean).join("  ·  "),
    c.address,
    c.taxId && `CUIT/DNI ${c.taxId}`,
  ].filter((s): s is string => Boolean(s));
}

export function issuerLines(m: PdfModel): string[] {
  const i = m.quote.issuer;
  return [i.professionalName, i.address, i.taxId && `CUIT ${i.taxId}`, contactLine(m)].filter(
    (s): s is string => Boolean(s),
  );
}

/** Pie fijo con aviso legal, marca (solo gratis) y número de página. */
export function PageFooter({
  m,
  color = "#64748b",
  font = "Inter",
  left = PAGE_PADDING,
  maxWidth = 360,
}: {
  m: PdfModel;
  color?: string;
  font?: string;
  left?: number;
  /** Ancho máximo del aviso legal (evita chocar con el número de página). */
  maxWidth?: number;
}) {
  const base: Style = { position: "absolute", bottom: 22, fontFamily: font, fontSize: 7.5, color };
  return (
    <>
      {/* lineHeight: 0 anula el interlineado heredado de Page: con un valor truthy react-pdf no dibuja textos `render`. */}
      <Text
        fixed
        style={{ ...base, right: PAGE_PADDING, width: 100, textAlign: "right", lineHeight: 0 }}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
      <View fixed style={{ ...base, left, maxWidth }}>
        <Text>{LEGAL_NOTE}</Text>
        {m.showBrand ? <Text style={{ marginTop: 2 }}>{BRAND_NOTE}</Text> : null}
      </View>
    </>
  );
}

/** Bloque de texto libre (observaciones, condiciones, etc.) que no se parte entre páginas. */
export function NoteBlock({
  label,
  text,
  labelStyle,
  textStyle,
}: {
  label: string;
  text: string;
  labelStyle: Style;
  textStyle: Style;
}) {
  if (!text) return null;
  return (
    <View wrap={false} style={{ marginTop: 10 }}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={textStyle}>{text}</Text>
    </View>
  );
}

export function termsBlocks(m: PdfModel): { label: string; text: string }[] {
  const q = m.quote;
  return [
    { label: "Plazo estimado", text: q.deliveryTime },
    { label: "Forma de pago", text: q.paymentTerms },
    { label: "Observaciones", text: q.notes },
    { label: "Condiciones comerciales", text: q.terms },
  ].filter((b) => b.text);
}

/**
 * Parte las filas en bloques con encabezado propio.
 * Evita `fixed` en el thead: ese prop lo repite también en páginas que solo tienen
 * totales o condiciones (encabezado huérfano). Cada bloque es atómico (`wrap={false}`).
 */
export function tableRowChunks<T>(
  rows: T[],
  opts: { firstPage?: number; otherPages?: number } = {},
): T[][] {
  const firstPage = opts.firstPage ?? 4;
  const otherPages = opts.otherPages ?? 6;
  if (rows.length === 0) return [];
  const chunks: T[][] = [rows.slice(0, firstPage)];
  for (let i = firstPage; i < rows.length; i += otherPages) {
    chunks.push(rows.slice(i, i + otherPages));
  }
  return chunks;
}
