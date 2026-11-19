import { Circle, Document, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import {
  contactLines,
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
import { CLOSING_MAX, closingTextLength, ContinuationHeader } from "../pagination";

const DARK = "#1c1917";

export function CreativoDocument({ m }: { m: PdfModel }) {
  const { quote: q, accent } = m;
  const onAccent = readableOn(accent);
  const s = StyleSheet.create({
    page: {
      paddingTop: 44,
      paddingHorizontal: PAGE_PADDING,
      paddingBottom: 72,
      fontFamily: "Inter",
      fontSize: 9,
      lineHeight: 1.4,
      color: DARK,
    },
    topStrip: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 10,
      backgroundColor: accent,
    },
    hero: { marginTop: 8 },
    bigTitle: {
      fontFamily: "Bricolage",
      fontWeight: 700,
      fontSize: 44,
      lineHeight: 1,
      color: DARK,
      maxWidth: 360,
    },
    numberTag: {
      position: "absolute",
      top: 24,
      right: 0,
      backgroundColor: DARK,
      paddingVertical: 8,
      paddingHorizontal: 14,
      transform: "rotate(3deg)",
    },
    numberText: { fontFamily: "Bricolage", fontWeight: 700, fontSize: 15, color: "#fff" },
    brandRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
    business: { fontFamily: "Bricolage", fontWeight: 700, fontSize: 15, lineHeight: 1.2 },
    muted: { color: "#78716c" },
    twoCol: { flexDirection: "row", marginTop: 22 },
    col: { flex: 1, paddingRight: 14 },
    kicker: {
      fontSize: 7.5,
      fontWeight: 700,
      letterSpacing: 1.6,
      textTransform: "uppercase",
      color: accent,
      marginBottom: 4,
    },
    jobTitle: {
      fontFamily: "Bricolage",
      fontWeight: 700,
      fontSize: 16,
      lineHeight: 1.25,
      marginTop: 22,
    },
    description: { marginTop: 4, color: "#57534e" },
    card: {
      flexDirection: "row",
      marginTop: 8,
      backgroundColor: tint(accent, 0.07),
      borderLeftWidth: 4,
      borderLeftColor: accent,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    cDesc: { flexGrow: 1, flexBasis: 0, paddingRight: 10 },
    cMeta: { width: 128, textAlign: "right", color: "#57534e", fontSize: 8.5 },
    cAmount: {
      width: 82,
      textAlign: "right",
      fontFamily: "Bricolage",
      fontWeight: 700,
      fontSize: 11,
    },
    sumWrap: { flexDirection: "row", marginTop: 18, alignItems: "flex-start" },
    totalBlock: {
      backgroundColor: accent,
      paddingVertical: 16,
      paddingHorizontal: 16,
      width: 230,
      borderTopLeftRadius: 18,
      borderBottomRightRadius: 18,
    },
    totalLabel: {
      fontSize: 8,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: onAccent,
      opacity: 0.85,
    },
    totalValue: {
      fontFamily: "Bricolage",
      fontWeight: 700,
      fontSize: 24,
      lineHeight: 1.15,
      color: onAccent,
      marginTop: 4,
    },
    sumRows: { flex: 1, paddingLeft: 20 },
    sumRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 2.5,
      borderBottomWidth: 0.5,
      borderBottomColor: "#d6d3d1",
    },
    noteLabel: {
      fontSize: 7.5,
      fontWeight: 700,
      letterSpacing: 1.4,
      textTransform: "uppercase",
      color: accent,
      marginBottom: 2,
    },
    noteText: { fontSize: 9, lineHeight: 1.45 },
  });

  return (
    <Document title={`Presupuesto ${q.number}`} author={q.issuer.businessName} language="es-AR">
      <Page size="A4" style={s.page}>
        <View fixed style={s.topStrip} />
        <ContinuationHeader m={m} color="#1c1917" muted="#57534e" accent={accent} />
        <Svg
          style={{ position: "absolute", top: -60, right: -50, width: 230, height: 230 }}
          viewBox="0 0 230 230"
        >
          <Circle cx="115" cy="115" r="115" fill={tint(accent, 0.18)} />
          <Circle cx="140" cy="90" r="62" fill={accent} />
        </Svg>
        <Svg
          style={{ position: "absolute", top: 120, left: -30, width: 60, height: 60 }}
          viewBox="0 0 60 60"
        >
          <Path d="M0 30 Q30 -10 60 30 Q30 70 0 30 Z" fill={tint(accent, 0.3)} />
        </Svg>

        <View style={s.hero}>
          <Text style={s.bigTitle}>Presupuesto</Text>
          <View style={s.numberTag}>
            <Text style={s.numberText}>N.º {q.number}</Text>
          </View>
        </View>

        <View style={s.brandRow}>
          {q.issuer.logo ? <Logo src={q.issuer.logo} style={{ marginRight: 12 }} /> : null}
          <View>
            <Text style={s.business}>{q.issuer.businessName}</Text>
            {q.issuer.professionalName ? (
              <Text style={s.muted}>{q.issuer.professionalName}</Text>
            ) : null}
          </View>
        </View>

        <View style={s.twoCol} wrap={false}>
          <View style={s.col}>
            <Text style={s.kicker}>Para</Text>
            <Text style={{ fontWeight: 600 }}>{q.customer.name}</Text>
            {customerLines(m).map((l) => (
              <Text key={l} style={s.muted}>
                {l}
              </Text>
            ))}
          </View>
          <View style={s.col}>
            <Text style={s.kicker}>De</Text>
            {q.issuer.address ? <Text style={s.muted}>{q.issuer.address}</Text> : null}
            {q.issuer.taxId ? <Text style={s.muted}>CUIT {q.issuer.taxId}</Text> : null}
            {contactLines(m).map((l) => (
              <Text key={l} style={s.muted}>
                {l}
              </Text>
            ))}
          </View>
          <View style={[s.col, { paddingRight: 0 }]}>
            <Text style={s.kicker}>Fechas</Text>
            <Text style={s.muted}>Emisión: {m.issueDate}</Text>
            <Text style={s.muted}>Válido hasta: {m.validUntilDate}</Text>
          </View>
        </View>

        <Text style={s.jobTitle}>{q.title}</Text>
        {q.description ? <Text style={s.description}>{q.description}</Text> : null}

        <View style={{ marginTop: 6 }}>
          {m.rows.map((r, i) => {
            const isLast = i === m.rows.length - 1;
            const keep = isLast && closingTextLength(m) <= CLOSING_MAX;
            const cardEl = (
              <View style={s.card}>
                <View style={s.cDesc}>
                  <Text style={{ fontWeight: 600 }}>{r.description}</Text>
                </View>
                <Text style={s.cMeta}>
                  {r.quantity} × {r.unitPrice}
                  {r.discount !== "—" ? `  (-${r.discount})` : ""}
                </Text>
                <Text style={s.cAmount}>{r.amount}</Text>
              </View>
            );
            return keep ? (
              <View key={i} wrap={false}>
                {cardEl}
                <View style={s.sumWrap}>
                  <View style={s.totalBlock}>
                    <Text style={s.totalLabel}>Total {m.currency}</Text>
                    <Text style={s.totalValue}>{m.money(m.totals.total)}</Text>
                  </View>
                  <View style={s.sumRows}>
                    <View style={s.sumRow}>
                      <Text style={s.muted}>Subtotal</Text>
                      <Text>{m.money(m.totals.subtotal)}</Text>
                    </View>
                    {m.hasDiscount && (
                      <View style={s.sumRow}>
                        <Text style={s.muted}>Descuento</Text>
                        <Text>- {m.money(m.totals.globalDiscount)}</Text>
                      </View>
                    )}
                    {m.hasSurcharge && (
                      <View style={s.sumRow}>
                        <Text style={s.muted}>Recargo</Text>
                        <Text>{m.money(m.totals.surcharge)}</Text>
                      </View>
                    )}
                    {m.totals.taxes.map((t) => (
                      <View key={t.id} style={s.sumRow}>
                        <Text style={s.muted}>{t.label}</Text>
                        <Text>{m.money(t.amount)}</Text>
                      </View>
                    ))}
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
            ) : (
              <View key={i}>{cardEl}</View>
            );
          })}
        </View>
        {closingTextLength(m) > CLOSING_MAX && (
          <>
            <View style={s.sumWrap} wrap={false}>
              <View style={s.totalBlock}>
                <Text style={s.totalLabel}>Total {m.currency}</Text>
                <Text style={s.totalValue}>{m.money(m.totals.total)}</Text>
              </View>
              <View style={s.sumRows}>
                <View style={s.sumRow}>
                  <Text style={s.muted}>Subtotal</Text>
                  <Text>{m.money(m.totals.subtotal)}</Text>
                </View>
                {m.hasDiscount && (
                  <View style={s.sumRow}>
                    <Text style={s.muted}>Descuento</Text>
                    <Text>- {m.money(m.totals.globalDiscount)}</Text>
                  </View>
                )}
                {m.hasSurcharge && (
                  <View style={s.sumRow}>
                    <Text style={s.muted}>Recargo</Text>
                    <Text>{m.money(m.totals.surcharge)}</Text>
                  </View>
                )}
                {m.totals.taxes.map((t) => (
                  <View key={t.id} style={s.sumRow}>
                    <Text style={s.muted}>{t.label}</Text>
                    <Text>{m.money(t.amount)}</Text>
                  </View>
                ))}
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
          </>
        )}

        <PageFooter m={m} color="#78716c" />
        <PreviewMark m={m} />
      </Page>
    </Document>
  );
}
