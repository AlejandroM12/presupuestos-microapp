import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  contactLines,
  customerLines,
  Logo,
  NoteBlock,
  PAGE_PADDING,
  PageFooter,
  PreviewMark,
  readableOn,
  tableRowChunks,
  termsBlocks,
  tint,
} from "../common";
import type { PdfModel } from "../model";

const GOLD = "#b08d57";
const INK = "#1f2937";

export function EjecutivoDocument({ m }: { m: PdfModel }) {
  const { quote: q, accent } = m;
  const onAccent = readableOn(accent);
  const s = StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingHorizontal: PAGE_PADDING,
      paddingBottom: 72,
      fontFamily: "Inter",
      fontSize: 9,
      lineHeight: 1.4,
      color: INK,
    },
    band: {
      marginTop: -36,
      marginHorizontal: -PAGE_PADDING,
      paddingHorizontal: PAGE_PADDING,
      paddingTop: 34,
      paddingBottom: 26,
      backgroundColor: accent,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    business: {
      fontFamily: "Lora",
      fontWeight: 700,
      fontSize: 20,
      color: onAccent,
      lineHeight: 1.2,
    },
    bandMuted: { color: onAccent, opacity: 0.75, fontSize: 8.5, marginTop: 2 },
    logoBox: {
      backgroundColor: "#fff",
      padding: 6,
      borderRadius: 3,
      marginBottom: 10,
      alignSelf: "flex-start",
    },
    docLabel: {
      fontFamily: "Lora",
      fontSize: 11,
      color: GOLD,
      letterSpacing: 3,
      textTransform: "uppercase",
    },
    docNumber: { fontFamily: "Lora", fontWeight: 700, fontSize: 24, color: onAccent, marginTop: 3 },
    goldRule: { height: 2, backgroundColor: GOLD, marginHorizontal: -PAGE_PADDING },
    infoRow: { flexDirection: "row", marginTop: 22 },
    infoCol: { flex: 1, paddingRight: 16 },
    heading: { fontFamily: "Lora", fontWeight: 700, fontSize: 10, color: accent, marginBottom: 4 },
    muted: { color: "#6b7280" },
    title: {
      fontFamily: "Lora",
      fontWeight: 700,
      fontSize: 15,
      marginTop: 22,
      color: accent,
      lineHeight: 1.25,
    },
    description: { marginTop: 4, color: "#4b5563" },
    thead: {
      flexDirection: "row",
      borderBottomWidth: 1.5,
      borderBottomColor: GOLD,
      paddingBottom: 5,
      marginTop: 18,
    },
    th: { fontFamily: "Lora", fontWeight: 700, fontSize: 8.5, color: accent },
    row: {
      flexDirection: "row",
      paddingVertical: 7,
      borderBottomWidth: 0.5,
      borderBottomColor: "#d1d5db",
    },
    cDesc: { flexGrow: 1, flexBasis: 0, paddingRight: 10 },
    cQty: { width: 70, textAlign: "right" },
    cPrice: { width: 78, textAlign: "right" },
    cDisc: { width: 38, textAlign: "right" },
    cAmount: { width: 84, textAlign: "right" },
    totalsWrap: { marginTop: 16, alignSelf: "flex-end", width: 250 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
    grand: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: accent,
      marginTop: 8,
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    grandText: { fontFamily: "Lora", fontWeight: 700, fontSize: 13, color: onAccent },
    noteLabel: {
      fontFamily: "Lora",
      fontWeight: 700,
      fontSize: 9.5,
      color: accent,
      marginBottom: 2,
    },
    noteText: { fontSize: 8.5, lineHeight: 1.45, color: "#374151" },
    noteBox: {
      marginTop: 18,
      borderTopWidth: 1,
      borderTopColor: tint(accent, 0.25),
      paddingTop: 4,
    },
  });

  return (
    <Document title={`Presupuesto ${q.number}`} author={q.issuer.businessName} language="es-AR">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <View style={{ maxWidth: 320 }}>
            {q.issuer.logo ? (
              <View style={s.logoBox}>
                <Logo src={q.issuer.logo} />
              </View>
            ) : null}
            <Text style={s.business}>{q.issuer.businessName}</Text>
            {q.issuer.professionalName ? (
              <Text style={s.bandMuted}>{q.issuer.professionalName}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docLabel}>Presupuesto</Text>
            <Text style={s.docNumber}>N.º {q.number}</Text>
          </View>
        </View>
        <View style={s.goldRule} />

        <View style={s.infoRow} wrap={false}>
          <View style={s.infoCol}>
            <Text style={s.heading}>Presentado a</Text>
            <Text style={{ fontWeight: 600 }}>{q.customer.name}</Text>
            {customerLines(m).map((l) => (
              <Text key={l} style={s.muted}>
                {l}
              </Text>
            ))}
          </View>
          <View style={s.infoCol}>
            <Text style={s.heading}>Emisor</Text>
            {q.issuer.address ? <Text style={s.muted}>{q.issuer.address}</Text> : null}
            {q.issuer.taxId ? <Text style={s.muted}>CUIT {q.issuer.taxId}</Text> : null}
            {contactLines(m).map((l) => (
              <Text key={l} style={s.muted}>
                {l}
              </Text>
            ))}
          </View>
          <View style={[s.infoCol, { paddingRight: 0 }]}>
            <Text style={s.heading}>Detalle</Text>
            <Text style={s.muted}>Fecha: {m.issueDate}</Text>
            <Text style={s.muted}>Válido hasta: {m.validUntilDate}</Text>
            <Text style={s.muted}>Moneda: {m.currency}</Text>
          </View>
        </View>

        <Text style={s.title}>{q.title}</Text>
        {q.description ? <Text style={s.description}>{q.description}</Text> : null}

        {tableRowChunks(m.rows).map((chunk, chunkIndex) => (
          <View key={chunkIndex} wrap={false}>
            <View style={s.thead}>
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
                <Text style={[s.cAmount, { fontWeight: 600 }]}>{r.amount}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={s.totalsWrap} wrap={false}>
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

        <View style={s.noteBox}>
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

        <PageFooter m={m} color={accent} font="Lora" />
        <PreviewMark m={m} />
      </Page>
    </Document>
  );
}
