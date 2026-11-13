import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  customerLines,
  Logo,
  NoteBlock,
  PageFooter,
  PreviewMark,
  readableOn,
  termsBlocks,
  tint,
} from "../common";
import type { PdfModel } from "../model";

const SIDEBAR = 170;

export function ModernoDocument({ m }: { m: PdfModel }) {
  const { quote: q, accent } = m;
  const onAccent = readableOn(accent);
  const soft = tint(accent, 0.08);
  const s = StyleSheet.create({
    page: {
      paddingTop: 40,
      paddingLeft: SIDEBAR + 30,
      paddingRight: 36,
      paddingBottom: 72,
      fontFamily: "Inter",
      fontSize: 9,
      lineHeight: 1.4,
      color: "#1f2937",
    },
    sidebarBar: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: SIDEBAR,
      backgroundColor: accent,
    },
    sidebarContent: {
      position: "absolute",
      top: 0,
      left: 0,
      width: SIDEBAR,
      padding: 24,
      paddingTop: 40,
      color: onAccent,
    },
    sbLabel: {
      fontSize: 7,
      letterSpacing: 1.6,
      textTransform: "uppercase",
      color: onAccent,
      opacity: 0.65,
      marginTop: 16,
      marginBottom: 3,
    },
    sbText: { color: onAccent, fontSize: 8.5, lineHeight: 1.45 },
    sbName: { color: onAccent, fontSize: 14, fontWeight: 700, lineHeight: 1.2 },
    logoBox: {
      backgroundColor: "#fff",
      padding: 6,
      borderRadius: 4,
      alignSelf: "flex-start",
      marginBottom: 12,
    },
    docLabel: {
      fontSize: 9,
      letterSpacing: 3,
      textTransform: "uppercase",
      color: accent,
      fontWeight: 700,
    },
    docNumber: { fontSize: 30, fontWeight: 700, color: "#111827", marginTop: 2 },
    title: { fontSize: 13, fontWeight: 600, marginTop: 14, lineHeight: 1.3 },
    description: { color: "#6b7280", marginTop: 4 },
    thead: {
      flexDirection: "row",
      marginTop: 20,
      paddingVertical: 7,
      paddingHorizontal: 8,
      backgroundColor: accent,
      borderRadius: 4,
    },
    th: {
      fontSize: 7.5,
      fontWeight: 600,
      color: onAccent,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    row: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderRadius: 3 },
    cDesc: { flexGrow: 1, flexBasis: 0, paddingRight: 8 },
    cQty: { width: 58, textAlign: "right" },
    cPrice: { width: 66, textAlign: "right" },
    cAmount: { width: 72, textAlign: "right" },
    totals: { marginTop: 14, alignSelf: "flex-end", width: 230 },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 2.5,
      paddingHorizontal: 8,
    },
    muted: { color: "#6b7280" },
    pill: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: accent,
      borderRadius: 18,
      marginTop: 8,
      paddingVertical: 9,
      paddingHorizontal: 16,
    },
    pillText: { color: onAccent, fontWeight: 700, fontSize: 12 },
    noteLabel: {
      fontSize: 7.5,
      letterSpacing: 1.4,
      textTransform: "uppercase",
      color: accent,
      fontWeight: 700,
      marginBottom: 2,
    },
    noteText: { fontSize: 8.5, lineHeight: 1.45 },
  });

  return (
    <Document title={`Presupuesto ${q.number}`} author={q.issuer.businessName} language="es-AR">
      <Page size="A4" style={s.page}>
        <View fixed style={s.sidebarBar} />
        <View style={s.sidebarContent}>
          {q.issuer.logo ? (
            <View style={s.logoBox}>
              <Logo src={q.issuer.logo} style={{ maxWidth: 110 }} />
            </View>
          ) : null}
          <Text style={s.sbName}>{q.issuer.businessName}</Text>
          {q.issuer.professionalName ? (
            <Text style={s.sbText}>{q.issuer.professionalName}</Text>
          ) : null}

          <Text style={s.sbLabel}>Contacto</Text>
          {[
            q.issuer.email,
            q.issuer.phone && `Tel. ${q.issuer.phone}`,
            q.issuer.whatsapp && `WhatsApp ${q.issuer.whatsapp}`,
            q.issuer.website,
            q.issuer.address,
            q.issuer.taxId && `CUIT ${q.issuer.taxId}`,
          ]
            .filter((x): x is string => Boolean(x))
            .map((l) => (
              <Text key={l} style={s.sbText}>
                {l}
              </Text>
            ))}

          <Text style={s.sbLabel}>Cliente</Text>
          <Text style={[s.sbText, { fontWeight: 700 }]}>{q.customer.name}</Text>
          {customerLines(m).map((l) => (
            <Text key={l} style={s.sbText}>
              {l}
            </Text>
          ))}

          <Text style={s.sbLabel}>Fechas</Text>
          <Text style={s.sbText}>Emisión: {m.issueDate}</Text>
          <Text style={s.sbText}>Válido hasta: {m.validUntilDate}</Text>
          <Text style={s.sbLabel}>Moneda</Text>
          <Text style={s.sbText}>{m.currency}</Text>
        </View>

        <Text style={s.docLabel}>Presupuesto</Text>
        <Text style={s.docNumber}>N.º {q.number}</Text>
        <Text style={s.title}>{q.title}</Text>
        {q.description ? <Text style={s.description}>{q.description}</Text> : null}

        <View style={s.thead} fixed>
          <Text style={[s.th, s.cDesc]}>Descripción</Text>
          <Text style={[s.th, s.cQty]}>Cant.</Text>
          <Text style={[s.th, s.cPrice]}>Precio</Text>
          <Text style={[s.th, s.cAmount]}>Importe</Text>
        </View>
        {m.rows.map((r, i) => (
          <View
            key={i}
            style={[s.row, { backgroundColor: i % 2 === 0 ? soft : "#ffffff" }]}
            wrap={false}
          >
            <View style={s.cDesc}>
              <Text>{r.description}</Text>
              {r.discount !== "—" ? (
                <Text style={{ fontSize: 7.5, color: accent }}>Descuento {r.discount}</Text>
              ) : null}
            </View>
            <Text style={s.cQty}>{r.quantity}</Text>
            <Text style={s.cPrice}>{r.unitPrice}</Text>
            <Text style={[s.cAmount, { fontWeight: 600 }]}>{r.amount}</Text>
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
          <View style={s.pill}>
            <Text style={s.pillText}>Total {m.currency}</Text>
            <Text style={s.pillText}>{m.money(m.totals.total)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
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

        <PageFooter m={m} left={SIDEBAR + 30} />
        <PreviewMark m={m} />
      </Page>
    </Document>
  );
}
