import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  contactLine,
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

export function ComercialDocument({ m }: { m: PdfModel }) {
  const { quote: q, accent } = m;
  const onAccent = readableOn(accent);
  const soft = tint(accent, 0.07);
  const s = StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingHorizontal: PAGE_PADDING,
      paddingBottom: 72,
      fontFamily: "Inter",
      fontSize: 9,
      lineHeight: 1.4,
      color: "#1f2937",
    },
    banner: {
      marginTop: -36,
      marginHorizontal: -PAGE_PADDING,
      paddingHorizontal: PAGE_PADDING,
      paddingVertical: 24,
      backgroundColor: accent,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    business: { fontWeight: 700, fontSize: 19, color: onAccent, lineHeight: 1.2 },
    bannerMuted: { color: onAccent, opacity: 0.85, fontSize: 8.5, marginTop: 2 },
    logoBox: { backgroundColor: "#fff", padding: 6, borderRadius: 4, marginRight: 14 },
    docLabel: {
      color: onAccent,
      fontSize: 8,
      letterSpacing: 2.5,
      textTransform: "uppercase",
      opacity: 0.85,
    },
    docNumber: { color: onAccent, fontWeight: 700, fontSize: 20, marginTop: 2 },
    hero: { flexDirection: "row", marginTop: 18, borderWidth: 1.5, borderColor: accent },
    heroTotal: { backgroundColor: soft, padding: 14, flex: 1.1, justifyContent: "center" },
    heroLabel: {
      fontSize: 7.5,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: accent,
      fontWeight: 700,
    },
    heroValue: { fontSize: 26, fontWeight: 700, color: "#111827", marginTop: 3 },
    heroTerms: { flex: 1, padding: 14, borderLeftWidth: 1.5, borderLeftColor: accent },
    termLabel: {
      fontSize: 7,
      letterSpacing: 1.4,
      textTransform: "uppercase",
      color: accent,
      fontWeight: 700,
      marginTop: 6,
    },
    termText: { fontSize: 8.5, lineHeight: 1.35 },
    infoRow: { flexDirection: "row", marginTop: 18 },
    col: { flex: 1, paddingRight: 14 },
    kicker: {
      fontSize: 7.5,
      letterSpacing: 1.6,
      textTransform: "uppercase",
      fontWeight: 700,
      color: accent,
      marginBottom: 4,
    },
    muted: { color: "#6b7280" },
    title: { fontSize: 14, fontWeight: 700, marginTop: 20, lineHeight: 1.25 },
    description: { marginTop: 4, color: "#4b5563" },
    thead: {
      flexDirection: "row",
      backgroundColor: accent,
      marginTop: 16,
      paddingVertical: 7,
      paddingHorizontal: 8,
    },
    th: {
      color: onAccent,
      fontWeight: 700,
      fontSize: 7.5,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    row: {
      flexDirection: "row",
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#d1d5db",
    },
    cDesc: { flexGrow: 1, flexBasis: 0, paddingRight: 8 },
    cQty: { width: 70, textAlign: "right" },
    cPrice: { width: 78, textAlign: "right" },
    cDisc: { width: 36, textAlign: "right" },
    cAmount: { width: 82, textAlign: "right" },
    totals: { marginTop: 12, alignSelf: "flex-end", width: 240 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
    grand: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 2,
      borderTopColor: accent,
      marginTop: 6,
      paddingTop: 7,
    },
    grandText: { fontWeight: 700, fontSize: 13, color: accent },
    cta: {
      marginTop: 18,
      backgroundColor: soft,
      borderLeftWidth: 4,
      borderLeftColor: accent,
      padding: 10,
    },
    noteLabel: {
      fontSize: 7,
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
        <View style={s.banner}>
          <View style={{ flexDirection: "row", alignItems: "center", maxWidth: 340 }}>
            {q.issuer.logo ? (
              <View style={s.logoBox}>
                <Logo src={q.issuer.logo} style={{ maxWidth: 90 }} />
              </View>
            ) : null}
            <View>
              <Text style={s.business}>{q.issuer.businessName}</Text>
              {q.issuer.professionalName ? (
                <Text style={s.bannerMuted}>{q.issuer.professionalName}</Text>
              ) : null}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docLabel}>Presupuesto</Text>
            <Text style={s.docNumber}>N.º {q.number}</Text>
          </View>
        </View>

        <View style={s.hero} wrap={false}>
          <View style={s.heroTotal}>
            <Text style={s.heroLabel}>Total {m.currency}</Text>
            <Text style={s.heroValue}>{m.money(m.totals.total)}</Text>
          </View>
          <View style={s.heroTerms}>
            <Text style={[s.termLabel, { marginTop: 0 }]}>Válido hasta</Text>
            <Text style={s.termText}>{m.validUntilDate}</Text>
            {q.paymentTerms ? (
              <>
                <Text style={s.termLabel}>Forma de pago</Text>
                <Text style={s.termText}>{q.paymentTerms}</Text>
              </>
            ) : null}
            {q.deliveryTime ? (
              <>
                <Text style={s.termLabel}>Plazo</Text>
                <Text style={s.termText}>{q.deliveryTime}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={s.infoRow} wrap={false}>
          <View style={s.col}>
            <Text style={s.kicker}>Cliente</Text>
            <Text style={{ fontWeight: 600 }}>{q.customer.name}</Text>
            {customerLines(m).map((l) => (
              <Text key={l} style={s.muted}>
                {l}
              </Text>
            ))}
          </View>
          <View style={s.col}>
            <Text style={s.kicker}>Contacto</Text>
            {q.issuer.address ? <Text style={s.muted}>{q.issuer.address}</Text> : null}
            {q.issuer.taxId ? <Text style={s.muted}>CUIT {q.issuer.taxId}</Text> : null}
            {contactLines(m).map((l) => (
              <Text key={l} style={s.muted}>
                {l}
              </Text>
            ))}
          </View>
          <View style={[s.col, { paddingRight: 0 }]}>
            <Text style={s.kicker}>Emisión</Text>
            <Text style={s.muted}>{m.issueDate}</Text>
          </View>
        </View>

        <Text style={s.title}>{q.title}</Text>
        {q.description ? <Text style={s.description}>{q.description}</Text> : null}

        {tableRowChunks(m.rows, { firstPage: 3, otherPages: 5 }).map((chunk, chunkIndex) => (
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
          <View style={s.cta}>
            <Text style={{ fontWeight: 600 }}>¿Te interesa esta propuesta?</Text>
            <Text style={s.muted}>
              Para aceptarla o hacer consultas, contactá a{" "}
              {q.issuer.professionalName || q.issuer.businessName}
              {contactLine(m) ? `: ${contactLine(m)}` : "."}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          {termsBlocks(m)
            .filter((b) => b.label !== "Forma de pago" && b.label !== "Plazo estimado")
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

        <PageFooter m={m} />
        <PreviewMark m={m} />
      </Page>
    </Document>
  );
}
