import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  contactLine,
  customerLines,
  Logo,
  NoteBlock,
  PageFooter,
  PAGE_PADDING,
  termsBlocks,
} from "../common";
import type { PdfModel } from "../model";

const INK = "#111827";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

const s = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING,
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 70,
    fontFamily: "Inter",
    fontSize: 9,
    color: INK,
    lineHeight: 1.4,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  business: { fontSize: 16, fontWeight: 700, lineHeight: 1.2, marginBottom: 3 },
  muted: { color: MUTED },
  docTitle: { fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: MUTED },
  docNumber: { fontSize: 16, fontWeight: 700, marginTop: 2 },
  rule: { height: 1, backgroundColor: INK, marginTop: 18, marginBottom: 14 },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  label: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 3,
  },
  strong: { fontWeight: 600 },
  title: { fontSize: 13, fontWeight: 600, marginTop: 20 },
  description: { marginTop: 4, color: MUTED },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 5,
    marginTop: 18,
  },
  th: { fontSize: 7, letterSpacing: 1.2, textTransform: "uppercase", color: MUTED },
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: LINE },
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
    borderTopWidth: 1,
    borderTopColor: INK,
    marginTop: 6,
    paddingTop: 7,
  },
  grandText: { fontSize: 13, fontWeight: 700 },
  noteLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 2,
  },
  noteText: { fontSize: 8.5 },
});

export function MinimalistaDocument({ m }: { m: PdfModel }) {
  const { quote: q } = m;
  return (
    <Document title={`Presupuesto ${q.number}`} author={q.issuer.businessName} language="es-AR">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={{ maxWidth: 300 }}>
            <Logo src={q.issuer.logo} style={{ marginBottom: 8 }} />
            <Text style={s.business}>{q.issuer.businessName}</Text>
            {q.issuer.professionalName ? (
              <Text style={s.muted}>{q.issuer.professionalName}</Text>
            ) : null}
            {q.issuer.address ? <Text style={s.muted}>{q.issuer.address}</Text> : null}
            {q.issuer.taxId ? <Text style={s.muted}>CUIT {q.issuer.taxId}</Text> : null}
            <Text style={s.muted}>{contactLine(m)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTitle}>Presupuesto</Text>
            <Text style={s.docNumber}>N.º {q.number}</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>Fecha: {m.issueDate}</Text>
            <Text style={s.muted}>Válido hasta: {m.validUntilDate}</Text>
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.meta} wrap={false}>
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
        {q.description ? <Text style={s.description}>{q.description}</Text> : null}

        <View style={s.tableHead} fixed>
          <Text style={[s.th, s.cDesc]}>Descripción</Text>
          <Text style={[s.th, s.cQty]}>Cantidad</Text>
          <Text style={[s.th, s.cPrice]}>Precio</Text>
          <Text style={[s.th, s.cDisc]}>Dto.</Text>
          <Text style={[s.th, s.cAmount]}>Importe</Text>
        </View>
        {m.rows.map((r, i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={s.cDesc}>{r.description}</Text>
            <Text style={s.cQty}>{r.quantity}</Text>
            <Text style={s.cPrice}>{r.unitPrice}</Text>
            <Text style={s.cDisc}>{r.discount}</Text>
            <Text style={[s.cAmount, s.strong]}>{r.amount}</Text>
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

        <PageFooter m={m} />
      </Page>
    </Document>
  );
}
