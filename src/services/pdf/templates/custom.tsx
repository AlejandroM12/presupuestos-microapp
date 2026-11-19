import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  contactLines,
  customerLines,
  Logo,
  NoteBlock,
  PageFooter,
  PAGE_PADDING,
  PreviewMark,
  readableOn,
  termsBlocks,
  tint,
} from "../common";
import type { PdfModel } from "../model";
import { CLOSING_MAX, closingTextLength, ContinuationHeader, PaginatedTable } from "../pagination";

const INK = "#111827";
const MUTED = "#4b5563";
const LINE = "#e5e7eb";
const GRID = "#cbd5e1";

const FONTS = { sans: "Inter", serif: "Lora", mono: "JetBrains" } as const;

/**
 * Documento genérico para plantillas privadas. Se compone solo con datos validados
 * (estilo, campos y secciones): nunca interpreta HTML ni código de la configuración.
 * Las variantes estructurales (encabezado, tabla, totales, columnas, fichas, aprobación) son
 * opciones declarativas con valores por defecto que reproducen el diseño original.
 */
export function CustomDocument({ m }: { m: PdfModel }) {
  const { quote: q } = m;
  const custom = m.custom!;
  const st = custom.style;
  const font = FONTS[st.fontFamily];
  const accent = m.accent;
  const onAccent = readableOn(accent);
  const soft = tint(accent, 0.1);
  const zebra = st.tableStyle === "zebra";
  const grid = st.tableStyle === "grid";

  const s = StyleSheet.create({
    page: {
      paddingTop: 0,
      paddingHorizontal: PAGE_PADDING,
      paddingBottom: 84,
      fontFamily: font,
      fontSize: 9.5,
      color: INK,
      lineHeight: 1.4,
    },
    strip: { backgroundColor: accent, height: 10, marginHorizontal: -PAGE_PADDING },
    muted: { color: MUTED },
    strong: { fontWeight: 600 },
    business: { fontSize: 17, fontWeight: 700, lineHeight: 1.2, marginBottom: 3 },
    docTitle: { fontSize: 8.5, letterSpacing: 2, textTransform: "uppercase", color: accent },
    docNumber: { fontSize: 17, fontWeight: 700, lineHeight: 1.2, marginTop: 2 },
    subtitle: { color: MUTED, marginTop: 4, maxWidth: 210, textAlign: "right" },
    label: {
      fontSize: 7.5,
      letterSpacing: 1.4,
      textTransform: "uppercase",
      color: MUTED,
      marginBottom: 3,
    },
    title: { fontSize: 14, fontWeight: 600, lineHeight: 1.25, marginTop: 18 },
    blockTitle: {
      fontSize: 8.5,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: accent,
      fontWeight: 600,
      marginBottom: 4,
    },
    card: {
      flex: 1,
      backgroundColor: soft,
      borderWidth: 1,
      borderColor: tint(accent, 0.35),
      padding: 8,
    },
    cardValue: { fontSize: 13, fontWeight: 700, lineHeight: 1.25 },
    head: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 5,
      backgroundColor: zebra ? accent : st.tableStyle === "lines" ? undefined : tint(accent, 0.12),
      borderBottomWidth: st.tableStyle === "lines" ? 1.5 : 0,
      borderBottomColor: accent,
      borderWidth: grid ? 0.75 : 0,
      borderColor: GRID,
    },
    th: {
      lineHeight: 1.2,
      fontSize: 7.5,
      letterSpacing: 1,
      textTransform: "uppercase",
      fontWeight: 600,
      color: zebra ? onAccent : st.tableStyle === "lines" ? accent : INK,
    },
    row: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 5,
      borderBottomWidth: 1,
      borderBottomColor: LINE,
      ...(grid ? { borderWidth: 0.75, borderColor: GRID, borderTopWidth: 0 } : {}),
    },
    cDesc: { flexGrow: 1, flexBasis: 0, paddingRight: 8 },
    cQty: { width: 72, textAlign: "right" },
    cPrice: { width: 78, textAlign: "right" },
    cDisc: { width: 38, textAlign: "right" },
    cAmount: { width: 84, textAlign: "right" },
    totals: { marginTop: 14, alignSelf: "flex-end", width: 240 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
    noteLabel: {
      fontSize: 7.5,
      letterSpacing: 1.4,
      textTransform: "uppercase",
      color: MUTED,
      marginBottom: 2,
    },
    noteText: { fontSize: 9 },
  });

  const totalsBox =
    st.totalsStyle === "box" ? { borderWidth: 1.2, borderColor: accent, padding: 10 } : {};
  const grand =
    st.totalsStyle === "bar"
      ? {
          flexDirection: "row" as const,
          justifyContent: "space-between" as const,
          backgroundColor: accent,
          marginTop: 6,
          paddingVertical: 7,
          paddingHorizontal: 8,
        }
      : {
          flexDirection: "row" as const,
          justifyContent: "space-between" as const,
          borderTopWidth: st.totalsStyle === "plain" ? 1.5 : 1,
          borderTopColor: accent,
          marginTop: 6,
          paddingTop: 7,
        };
  const grandColor = st.totalsStyle === "bar" ? onAccent : accent;

  const logo = st.showLogo ? <Logo src={q.issuer.logo} style={{ marginBottom: 8 }} /> : null;
  const issuerBlock = (color?: string) => (
    <View style={{ maxWidth: 300 }}>
      {/* Sobre una banda de color el logo va en una caja blanca para que siempre se distinga. */}
      {color && logo ? (
        <View
          style={{
            backgroundColor: "#ffffff",
            padding: 6,
            borderRadius: 3,
            alignSelf: "flex-start",
            marginBottom: 8,
          }}
        >
          <Logo src={q.issuer.logo} />
        </View>
      ) : (
        logo
      )}
      <Text style={[s.business, color ? { color } : {}]}>{q.issuer.businessName}</Text>
      {q.issuer.professionalName ? (
        <Text style={color ? { color } : s.muted}>{q.issuer.professionalName}</Text>
      ) : null}
      {q.issuer.address ? (
        <Text style={color ? { color } : s.muted}>{q.issuer.address}</Text>
      ) : null}
      {q.issuer.taxId ? (
        <Text style={color ? { color } : s.muted}>CUIT {q.issuer.taxId}</Text>
      ) : null}
      {contactLines(m).map((line) => (
        <Text key={line} style={color ? { color } : s.muted}>
          {line}
        </Text>
      ))}
    </View>
  );
  const docTitle = st.headerTitle || "Presupuesto";

  const header =
    st.headerVariant === "banner" ? (
      <View
        style={{
          marginHorizontal: -PAGE_PADDING,
          paddingHorizontal: PAGE_PADDING,
          paddingVertical: 22,
          backgroundColor: accent,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {issuerBlock(onAccent)}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.docTitle, { color: onAccent }]}>{docTitle}</Text>
          <Text style={[s.docNumber, { color: onAccent }]}>N.º {q.number}</Text>
          {st.headerSubtitle ? (
            <Text style={[s.subtitle, { color: onAccent }]}>{st.headerSubtitle}</Text>
          ) : null}
          <Text style={{ color: onAccent, marginTop: 6 }}>Fecha: {m.issueDate}</Text>
          <Text style={{ color: onAccent }}>Válido hasta: {m.validUntilDate}</Text>
        </View>
      </View>
    ) : st.headerVariant === "boxed" ? (
      <View
        style={{ marginTop: 26, flexDirection: "row", justifyContent: "space-between" }}
        wrap={false}
      >
        {issuerBlock()}
        <View
          style={{
            width: 190,
            borderWidth: 1.5,
            borderColor: accent,
            backgroundColor: soft,
            padding: 12,
          }}
        >
          <Text style={s.docTitle}>{docTitle}</Text>
          <Text style={[s.docNumber, { fontSize: 20 }]}>N.º {q.number}</Text>
          {st.headerSubtitle ? (
            <Text style={[s.muted, { marginTop: 3, fontSize: 8.5 }]}>{st.headerSubtitle}</Text>
          ) : null}
          <Text style={{ marginTop: 6 }}>Fecha: {m.issueDate}</Text>
          <Text>Válido hasta: {m.validUntilDate}</Text>
        </View>
      </View>
    ) : (
      <View
        style={{
          marginTop: 26,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {issuerBlock()}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.docTitle}>{docTitle}</Text>
          <Text style={s.docNumber}>N.º {q.number}</Text>
          {st.headerSubtitle ? <Text style={s.subtitle}>{st.headerSubtitle}</Text> : null}
          <Text style={[s.muted, { marginTop: 6 }]}>Fecha: {m.issueDate}</Text>
          <Text style={s.muted}>Válido hasta: {m.validUntilDate}</Text>
        </View>
      </View>
    );

  const approval = st.approval ? (
    <View wrap={false} style={{ marginTop: 18, borderWidth: 1, borderColor: GRID, padding: 12 }}>
      <Text style={[s.blockTitle, { marginBottom: 14 }]}>
        {st.approvalText || "Aprobación del cliente"}
      </Text>
      <View style={{ flexDirection: "row", gap: 18 }}>
        {["Firma", "Aclaración", "Fecha"].map((l, i) => (
          <View key={l} style={{ flex: i === 2 ? 0.7 : 1 }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: INK, height: 22 }} />
            <Text style={[s.label, { marginTop: 3, marginBottom: 0 }]}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  ) : null;

  return (
    <Document title={`Presupuesto ${q.number}`} author={q.issuer.businessName} language="es-AR">
      <Page size="A4" style={s.page}>
        {st.headerVariant === "banner" ? (
          <View
            fixed
            render={({ pageNumber }) => (pageNumber > 1 ? <View style={s.strip} /> : null)}
          />
        ) : (
          <View fixed style={s.strip} />
        )}
        <ContinuationHeader
          m={m}
          font={font}
          color={INK}
          muted={MUTED}
          accent={accent}
          style={{ marginTop: 18 }}
        />

        {header}
        <View style={{ height: 1, backgroundColor: accent, marginTop: 16, marginBottom: 14 }} />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }} wrap={false}>
          <View style={{ maxWidth: 270 }}>
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

        {custom.highlights.length > 0 && (
          <View wrap={false} style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            {custom.highlights.map((h) => (
              <View key={h.label} style={s.card}>
                <Text style={s.label}>{h.label}</Text>
                <Text style={s.cardValue}>{h.value}</Text>
              </View>
            ))}
          </View>
        )}

        {custom.blocks.map((b, bi) => (
          <View key={`${b.title}-${bi}`} wrap={false} style={{ marginTop: 14 }}>
            {b.title ? <Text style={s.blockTitle}>{b.title}</Text> : null}
            {b.columns === 2 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {b.rows.map((r) => (
                  <View
                    key={r.label}
                    style={{ width: r.wide ? "100%" : "50%", paddingRight: 10, paddingBottom: 5 }}
                  >
                    <Text style={[s.label, { marginBottom: 1 }]}>{r.label}</Text>
                    <Text>{r.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              b.rows.map((r) =>
                r.wide ? (
                  <View key={r.label} style={{ paddingVertical: 3 }}>
                    <Text style={[s.label, { marginBottom: 1 }]}>{r.label}</Text>
                    <Text>{r.value}</Text>
                  </View>
                ) : (
                  <View key={r.label} style={{ flexDirection: "row", paddingVertical: 2 }}>
                    <Text style={{ width: 140, color: MUTED, paddingRight: 8 }}>{r.label}</Text>
                    <Text style={{ flexGrow: 1, flexBasis: 0 }}>{r.value}</Text>
                  </View>
                ),
              )
            )}
          </View>
        ))}

        <PaginatedTable
          gap={16}
          rows={m.rows}
          keepClosing={closingTextLength(m) <= CLOSING_MAX}
          head={
            <View style={s.head}>
              <Text style={[s.th, s.cDesc]}>Descripción</Text>
              <Text style={[s.th, s.cQty]}>Cantidad</Text>
              <Text style={[s.th, s.cPrice]}>Precio</Text>
              <Text style={[s.th, s.cDisc]}>Dto.</Text>
              <Text style={[s.th, s.cAmount]}>Importe</Text>
            </View>
          }
          renderRow={(r, i) => (
            <View style={[s.row, zebra && i % 2 === 1 ? { backgroundColor: soft } : {}]}>
              <Text style={s.cDesc}>{r.description}</Text>
              <Text style={s.cQty}>{r.quantity}</Text>
              <Text style={s.cPrice}>{r.unitPrice}</Text>
              <Text style={s.cDisc}>{r.discount}</Text>
              <Text style={[s.cAmount, s.strong]}>{r.amount}</Text>
            </View>
          )}
          closing={
            <>
              <View style={[s.totals, totalsBox]}>
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
                <View style={grand}>
                  <Text style={{ fontSize: 12.5, fontWeight: 700, color: grandColor }}>
                    Total {m.currency}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: 700, color: grandColor }}>
                    {m.money(m.totals.total)}
                  </Text>
                </View>
                {custom.advance && (
                  <View
                    style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6 }}
                  >
                    <View style={s.totalRow}>
                      <Text style={s.muted}>{custom.advance.label}</Text>
                      <Text>{custom.advance.amount}</Text>
                    </View>
                    <View style={s.totalRow}>
                      <Text style={s.strong}>Saldo pendiente</Text>
                      <Text style={{ fontWeight: 700, color: accent }}>
                        {custom.advance.balance}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {st.showTerms && (
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
              )}
              {approval}
            </>
          }
        />

        {st.footerText ? (
          <View
            fixed
            style={{ position: "absolute", bottom: 46, left: PAGE_PADDING, right: PAGE_PADDING }}
          >
            <Text style={{ fontSize: 8.5, color: MUTED, lineHeight: 1.3 }}>{st.footerText}</Text>
          </View>
        ) : null}
        <PageFooter m={m} font={font} />
        <PreviewMark m={m} />
      </Page>
    </Document>
  );
}
