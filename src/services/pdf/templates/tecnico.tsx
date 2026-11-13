import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  contactLine,
  customerLines,
  Logo,
  NoteBlock,
  PAGE_PADDING,
  PageFooter,
  PreviewMark,
  readableOn,
  termsBlocks,
  tint,
} from "../common";
import type { PdfModel } from "../model";

const GRID = "#9ca3af";

export function TecnicoDocument({ m }: { m: PdfModel }) {
  const { quote: q, accent } = m;
  const onAccent = readableOn(accent);
  const s = StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingHorizontal: PAGE_PADDING,
      paddingBottom: 72,
      fontFamily: "JetBrains",
      fontSize: 8,
      color: "#111827",
    },
    titleRow: { flexDirection: "row", borderWidth: 1, borderColor: GRID },
    titleCell: { flex: 1, padding: 10 },
    titleBox: { width: 150, backgroundColor: accent, padding: 10, justifyContent: "center" },
    docTitle: { fontWeight: 700, fontSize: 15, color: onAccent, letterSpacing: 1 },
    docNum: { fontSize: 10, color: onAccent, marginTop: 3 },
    business: { fontWeight: 700, fontSize: 12 },
    grid: {
      flexDirection: "row",
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: GRID,
    },
    cell: { flex: 1, padding: 7, borderRightWidth: 1, borderRightColor: GRID },
    cellLast: { flex: 1, padding: 7 },
    cellLabel: {
      fontSize: 6.5,
      color: accent,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 3,
    },
    block: {
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: GRID,
      padding: 8,
    },
    blockTitle: { fontWeight: 700, fontSize: 10 },
    muted: { color: "#4b5563" },
    thead: {
      flexDirection: "row",
      backgroundColor: tint(accent, 0.14),
      borderWidth: 1,
      borderColor: GRID,
      marginTop: 14,
    },
    th: {
      fontSize: 6.5,
      fontWeight: 700,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      paddingVertical: 5,
      paddingHorizontal: 4,
    },
    row: {
      flexDirection: "row",
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: GRID,
    },
    td: { paddingVertical: 5, paddingHorizontal: 4, lineHeight: 1.35 },
    cIdx: { width: 24, textAlign: "center", borderRightWidth: 1, borderRightColor: GRID },
    cDesc: {
      flexGrow: 1,
      flexBasis: 0,
      borderRightWidth: 1,
      borderRightColor: GRID,
      fontFamily: "Inter",
      fontSize: 8.5,
    },
    cQty: { width: 70, textAlign: "right", borderRightWidth: 1, borderRightColor: GRID },
    cPrice: { width: 80, textAlign: "right", borderRightWidth: 1, borderRightColor: GRID },
    cDisc: { width: 34, textAlign: "right", borderRightWidth: 1, borderRightColor: GRID },
    cAmount: { width: 84, textAlign: "right" },
    totals: { marginTop: 12, alignSelf: "flex-end", width: 250, borderWidth: 1, borderColor: GRID },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: GRID,
    },
    grand: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 8,
      backgroundColor: accent,
    },
    grandText: { fontWeight: 700, fontSize: 10, color: onAccent },
    noteLabel: {
      fontSize: 6.5,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: accent,
      marginBottom: 2,
    },
    noteText: { fontFamily: "Inter", fontSize: 8.5, lineHeight: 1.45 },
  });

  return (
    <Document title={`Presupuesto ${q.number}`} author={q.issuer.businessName} language="es-AR">
      <Page size="A4" style={s.page}>
        <View style={s.titleRow}>
          <View style={s.titleCell}>
            {q.issuer.logo ? <Logo src={q.issuer.logo} style={{ marginBottom: 6 }} /> : null}
            <Text style={s.business}>{q.issuer.businessName}</Text>
            {q.issuer.professionalName ? (
              <Text style={s.muted}>{q.issuer.professionalName}</Text>
            ) : null}
            {q.issuer.address ? <Text style={s.muted}>{q.issuer.address}</Text> : null}
            {q.issuer.taxId ? <Text style={s.muted}>CUIT {q.issuer.taxId}</Text> : null}
            <Text style={s.muted}>{contactLine(m)}</Text>
          </View>
          <View style={s.titleBox}>
            <Text style={s.docTitle}>PRESUPUESTO</Text>
            <Text style={s.docNum}>N.º {q.number}</Text>
          </View>
        </View>
        <View style={s.grid} wrap={false}>
          <View style={s.cell}>
            <Text style={s.cellLabel}>Fecha</Text>
            <Text>{m.issueDate}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.cellLabel}>Válido hasta</Text>
            <Text>{m.validUntilDate}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.cellLabel}>Moneda</Text>
            <Text>{m.currency}</Text>
          </View>
          <View style={s.cellLast}>
            <Text style={s.cellLabel}>Plazo</Text>
            <Text style={{ fontFamily: "Inter" }}>{q.deliveryTime || "A convenir"}</Text>
          </View>
        </View>
        <View style={s.block} wrap={false}>
          <Text style={s.cellLabel}>Cliente</Text>
          <Text style={s.blockTitle}>{q.customer.name}</Text>
          {customerLines(m).map((l) => (
            <Text key={l} style={s.muted}>
              {l}
            </Text>
          ))}
        </View>
        <View style={s.block} wrap={false}>
          <Text style={s.cellLabel}>Trabajo</Text>
          <Text style={[s.blockTitle, { fontFamily: "Inter" }]}>{q.title}</Text>
          {q.description ? (
            <Text style={[s.muted, { fontFamily: "Inter", fontSize: 8.5, lineHeight: 1.4 }]}>
              {q.description}
            </Text>
          ) : null}
        </View>

        <View style={s.thead} fixed>
          <Text style={[s.th, s.cIdx]}>It.</Text>
          <Text style={[s.th, s.cDesc, { fontFamily: "JetBrains", fontSize: 6.5 }]}>
            Descripción
          </Text>
          <Text style={[s.th, s.cQty]}>Cantidad</Text>
          <Text style={[s.th, s.cPrice]}>P. unit.</Text>
          <Text style={[s.th, s.cDisc]}>Dto</Text>
          <Text style={[s.th, s.cAmount]}>Importe</Text>
        </View>
        {m.rows.map((r, i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={[s.td, s.cIdx]}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={[s.td, s.cDesc]}>{r.description}</Text>
            <Text style={[s.td, s.cQty]}>{r.quantity}</Text>
            <Text style={[s.td, s.cPrice]}>{r.unitPrice}</Text>
            <Text style={[s.td, s.cDisc]}>{r.discount}</Text>
            <Text style={[s.td, s.cAmount, { fontWeight: 700 }]}>{r.amount}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text>SUBTOTAL</Text>
            <Text>{m.money(m.totals.subtotal)}</Text>
          </View>
          {m.hasDiscount && (
            <View style={s.totalRow}>
              <Text>DESCUENTO</Text>
              <Text>- {m.money(m.totals.globalDiscount)}</Text>
            </View>
          )}
          {m.hasSurcharge && (
            <View style={s.totalRow}>
              <Text>RECARGO</Text>
              <Text>{m.money(m.totals.surcharge)}</Text>
            </View>
          )}
          {m.totals.taxes.map((t) => (
            <View key={t.id} style={s.totalRow}>
              <Text>{t.label.toUpperCase()}</Text>
              <Text>{m.money(t.amount)}</Text>
            </View>
          ))}
          <View style={s.grand}>
            <Text style={s.grandText}>TOTAL {m.currency}</Text>
            <Text style={s.grandText}>{m.money(m.totals.total)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          {termsBlocks(m)
            .filter((b) => b.label !== "Plazo estimado")
            .map((b) => (
              <NoteBlock
                key={b.label}
                label={b.label}
                text={b.text}
                labelStyle={s.noteLabel}
                textStyle={s.noteText}
              />
            ))}
        </View>

        <PageFooter m={m} font="JetBrains" color="#6b7280" />
        <PreviewMark m={m} />
      </Page>
    </Document>
  );
}
