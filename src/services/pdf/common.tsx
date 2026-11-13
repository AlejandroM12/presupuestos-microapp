/* eslint-disable jsx-a11y/alt-text -- el Image de react-pdf no admite alt */
import { Image, Text, View, type Styles } from "@react-pdf/renderer";

type Style = Styles[string];
import type { PdfModel } from "./model";

export const PAGE_PADDING = 44;
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
  color = "#94a3b8",
  font = "Inter",
}: {
  m: PdfModel;
  color?: string;
  font?: string;
}) {
  const base: Style = { position: "absolute", bottom: 22, fontFamily: font, fontSize: 7, color };
  return (
    <>
      {/* lineHeight: 0 anula el interlineado heredado de Page: con un valor truthy react-pdf no dibuja textos `render`. */}
      <Text
        fixed
        style={{ ...base, right: PAGE_PADDING, width: 100, textAlign: "right", lineHeight: 0 }}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
      <View fixed style={{ ...base, left: PAGE_PADDING, maxWidth: 380 }}>
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
