import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  contactLine,
  customerLines,
  Logo,
  NoteBlock,
  PageFooter,
  PAGE_PADDING,
  PreviewMark,
  readableOn,
  tableRowChunks,
  termsBlocks,
  tint,
} from "../common";
import type { PdfModel } from "../model";

const INK = "#111827";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

const FONTS = { sans: "Inter", serif: "Lora", mono: "JetBrains" } as const;

/**
 * Documento genérico para plantillas privadas. Se compone solo con datos validados
 * (estilo, campos y secciones): nunca interpreta HTML ni código de la configuración.
 */
export function CustomDocument({ m }: { m: PdfModel }) {
  const { quote: q } = m;
  const custom = m.custom!;
  const font = FONTS[custom.style.fontFamily];
  const accent = m.accent;
  const s = StyleSheet.create({
    page: {
      paddingTop: 0,
      paddingBottom: 78,
      fontFamily: font,
      fontSize: 9,
      color: INK,
      lineHeight: 1.4,
    },
    band: { backgroundColor: accent, height: 10 },
    body: { paddingHorizontal: PAGE_PADDING, paddingTop: 28 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    business: { fontSize: 16, fontWeight: 700, lineHeight: 1.2, marginBottom: 3 },
    muted: { color: MUTED },
    docTitle: { fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: accent },
    docNumber: { fontSize: 16, fontWeight: 700, marginTop: 2 },
    subtitle: { color: MUTED, marginTop: 2, maxWidth: 200, textAlign: "right" },
    rule: { height: 1, backgroundColor: accent, marginTop: 16, marginBottom: 14 },
    label: {
      fontSize: 7,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: MUTED,
      marginBottom: 3,
    },
    strong: { fontWeight: 600 },
    title: { fontSize: 13, fontWeight: 600, marginTop: 18 },
    blockTitle: {
      fontSize: 8,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: accent,
      marginBottom: 4,
    },
    fieldRow: { flexDirection: "row", paddingVertical: 2 },
    fieldLabel: { width: 130, color: MUTED, paddingRight: 8 },
    fieldValue: { flexGrow: 1, flexBasis: 0 },
    tableHead: {
      flexDirection: "row",
      backgroundColor: tint(accent, 0.12),
      paddingVertical: 5,
      paddingHorizontal: 4,
      marginTop: 16,
    },
    th: { fontSize: 7, letterSpacing: 1.1, textTransform: "uppercase", color: INK },
    row: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: LINE,
    },
    cDesc: { flexGrow: 1, flexBasis: 0, paddingRight: 8 },
    cQty: { width: 72, textAlign: "right" },
    cPrice: { width: 78, textAlign: "right" },
    cDisc: { width: 38, textAlign: "right" },
    cAmount: { width: 84, textAlign: "right" },
    totals: { marginTop: 14, alignSelf: "flex-end", width: 230 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
    grand: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: accent,
      marginTop: 6,
      paddingVertical: 7,
      paddingHorizontal: 8,
    },
    grandText: { fontSize: 12, fontWeight: 700, color: readableOn(accent) },
    noteLabel: {
      fontSize: 7,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: MUTED,
      marginBottom: 2,
    },
    noteText: { fontSize: 8.5 },
  });

  return (
    <Document title={`Presupuesto ${q.number}`} author={q.issuer.businessName} language="es-AR">
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed />
        <View style={s.body}>
          <View style={s.header}>
            <View style={{ maxWidth: 300 }}>
              {custom.style.showLogo ? (
                <Logo src={q.issuer.logo} style={{ marginBottom: 8 }} />
              ) : null}
              <Text style={s.business}>{q.issuer.businessName}</Text>
              {q.issuer.professionalName ? (
                <Text style={s.muted}>{q.issuer.professionalName}</Text>
              ) : null}
              {q.issuer.address ? <Text style={s.muted}>{q.issuer.address}</Text> : null}
              {q.issuer.taxId ? <Text style={s.muted}>CUIT {q.issuer.taxId}</Text> : null}
              <Text style={s.muted}>{contactLine(m)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.docTitle}>{custom.style.headerTitle || "Presupuesto"}</Text>
              <Text style={s.docNumber}>N.º {q.number}</Text>
              {custom.style.headerSubtitle ? (
                <Text style={s.subtitle}>{custom.style.headerSubtitle}</Text>
              ) : null}
              <Text style={[s.muted, { marginTop: 6 }]}>Fecha: {m.issueDate}</Text>
              <Text style={s.muted}>Válido hasta: {m.validUntilDate}</Text>
            </View>
          </View>

          <View style={s.rule} />

          <View style={{ flexDirection: "row", justifyContent: "space-between" }} wrap={false}>
            <View style={{ maxWidth: 260 }}>
              <Text style={s.label}>Para</Text>
              <Text style={s.strong}>{q.customer.name}</Text>
              {customerLines(m).map((line) => (
                <Text key={line} style={s.muted}>
                  {line}
                </Text>
              ))}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.label}>Moneda</Text>
              <Text style={s.strong}>{m.currency}</Text>
            </View>
          </View>

          <Text style={s.title}>{q.title}</Text>
          {q.description ? <Text style={[s.muted, { marginTop: 4 }]}>{q.description}</Text> : null}

          {custom.blocks.map((b, bi) => (
            <View key={`${b.title}-${bi}`} wrap={false} style={{ marginTop: 14 }}>
              {b.title ? <Text style={s.blockTitle}>{b.title}</Text> : null}
              {b.rows.map((r) => (
                <View key={r.label} style={s.fieldRow}>
                  <Text style={s.fieldLabel}>{r.label}</Text>
                  <Text style={s.fieldValue}>{r.value}</Text>
                </View>
              ))}
            </View>
          ))}

          {tableRowChunks(m.rows).map((chunk, chunkIndex) => (
            <View key={chunkIndex} wrap={false}>
              <View style={s.tableHead}>
                <Text style={[s.th, s.cDesc]}>Descripción</Text>
                <Text style={[s.th, s.cQty]}>Cantidad</Text>
                <Text style={[s.th, s.cPrice]}>Precio</Text>
                <Text style={[s.th, s.cDisc]}>Dto.</Text>
                <Text style={[s.th, s.cAmount]}>Importe</Text>
              </View>
              {chunk.map((r, i) => (
                <View key={i} style={s.row}>
                  <Text style={s.cDesc}>{r.description}</Text>
                  <Text style={s.cQty}>{r.quantity}</Text>
                  <Text style={s.cPrice}>{r.unitPrice}</Text>
                  <Text style={s.cDisc}>{r.discount}</Text>
                  <Text style={[s.cAmount, s.strong]}>{r.amount}</Text>
                </View>
              ))}
            </View>
          ))}

          <View style={s.totals} wrap={false}>
            <View style={s.totalRow}>
              <Text style={s.muted}>Subtotal</Text>
              <Text>{m.money(m.totals.subtotal)}</Text>
            </View>
            {m.hasDiscount && (
              <View style={s.totalRow}>
                <Text style={s.muted}>Descuento</Text>
                <Text>- {m.money(m.totals.globalDiscount)}</Text>
              </View>
            )}
            {m.hasSurcharge && (
              <View style={s.totalRow}>
                <Text style={s.muted}>Recargo</Text>
                <Text>{m.money(m.totals.surcharge)}</Text>
              </View>
            )}
            {m.totals.taxes.map((t) => (
              <View key={t.id} style={s.totalRow}>
                <Text style={s.muted}>{t.label}</Text>
                <Text>{m.money(t.amount)}</Text>
              </View>
            ))}
            <View style={s.grand}>
              <Text style={s.grandText}>Total {m.currency}</Text>
              <Text style={s.grandText}>{m.money(m.totals.total)}</Text>
            </View>
          </View>

          <View style={{ marginTop: 14 }}>
            {termsBlocks(m).map((b) => (
              <NoteBlock
                key={b.label}
                label={b.label}
                text={b.text}
                labelStyle={s.noteLabel}
                textStyle={s.noteText}
              />
            ))}
          </View>
        </View>

        {custom.style.footerText ? (
          <View
            fixed
            style={{ position: "absolute", bottom: 44, left: PAGE_PADDING, right: PAGE_PADDING }}
          >
            <Text style={{ fontSize: 8, color: MUTED, lineHeight: 1.3 }}>
              {custom.style.footerText}
            </Text>
          </View>
        ) : null}
        <PageFooter m={m} font={font} />
        <PreviewMark m={m} />
      </Page>
    </Document>
  );
}
