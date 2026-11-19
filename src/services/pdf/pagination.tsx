import { Text, View, type Styles } from "@react-pdf/renderer";
import type { ReactElement, ReactNode } from "react";
import type { PdfModel } from "./model";

type Style = Styles[string];

/**
 * Por encima de este tamaño de texto de cierre (observaciones + condiciones) ya no se garantiza
 * que quepa en una página junto con la última fila: se deja fluir y se evita forzar el bloque.
 */
/**
 * react-pdf no dibuja el texto de elementos creados por `render` si heredan el interlineado de la
 * página: se fija uno propio en el contenedor.
 */
const RENDERED: Style = { lineHeight: 1.2 };

export const CLOSING_MAX = 3200;

export function closingTextLength(m: PdfModel): number {
  const q = m.quote;
  return [q.notes, q.terms, q.deliveryTime, q.paymentTerms].reduce((n, t) => n + t.length, 0);
}

interface PaginatedTableProps<T> {
  /** Fila de encabezado de la tabla (se dibuja una vez por página, nunca huérfana). */
  head: ReactElement;
  rows: T[];
  renderRow: (row: T, index: number) => ReactElement;
  /**
   * Totales y condiciones. Se mantienen en la misma página que la última fila, de modo que
   * ninguna página queda solo con totales (o con un encabezado de tabla sin filas).
   */
  closing?: ReactNode;
  /** Separación sobre la tabla en la primera página (las páginas siguientes empiezan pegadas al encabezado compacto). */
  gap?: number;
  /** Permite fluir el cierre cuando es demasiado extenso para garantizar que quepa. */
  keepClosing?: boolean;
}

/**
 * Tabla paginada según la altura real del contenido (sin agrupar un número fijo de filas):
 * - Página 1: encabezado en línea, pegado a la primera fila.
 * - Páginas siguientes: el encabezado se repite arriba una única vez (elemento `fixed`).
 * - Cada fila es indivisible; la última viaja con los totales.
 */
export function PaginatedTable<T>({
  head,
  rows,
  renderRow,
  closing,
  keepClosing = true,
  gap = 0,
}: PaginatedTableProps<T>) {
  const first = rows[0];
  const last = rows.length > 1 ? rows[rows.length - 1] : undefined;
  const middle = rows.slice(1, last === undefined ? undefined : -1);

  return (
    <>
      <View
        fixed
        render={({ pageNumber }) => (pageNumber > 1 ? <View style={RENDERED}>{head}</View> : null)}
      />
      {first !== undefined && (
        <View wrap={false} style={{ marginTop: gap }}>
          <View
            render={({ pageNumber }) =>
              pageNumber === 1 ? <View style={RENDERED}>{head}</View> : null
            }
          />
          {renderRow(first, 0)}
          {last === undefined && keepClosing ? closing : null}
        </View>
      )}
      {middle.map((r, i) => (
        <View key={i + 1} wrap={false}>
          {renderRow(r, i + 1)}
        </View>
      ))}
      {last !== undefined && (
        <View wrap={false}>
          {renderRow(last, rows.length - 1)}
          {keepClosing ? closing : null}
        </View>
      )}
      {!keepClosing ? closing : null}
    </>
  );
}

/** Encabezado compacto de las páginas de continuación (desde la segunda). */
export function ContinuationHeader({
  m,
  font = "Inter",
  color = "#111827",
  muted = "#4b5563",
  accent,
  left = 0,
  style,
  docLabel = "Presupuesto",
}: {
  m: PdfModel;
  font?: string;
  color?: string;
  muted?: string;
  accent?: string;
  /** Margen izquierdo extra (plantillas con barra lateral). */
  left?: number;
  style?: Style;
  /** Tipo de documento configurado (por defecto "Presupuesto"). */
  docLabel?: string;
}) {
  const q = m.quote;
  return (
    <View
      fixed
      render={({ pageNumber }) =>
        pageNumber > 1 ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderBottomWidth: 1,
              borderBottomColor: accent ?? color,
              paddingBottom: 5,
              marginBottom: 10,
              marginLeft: left,
              fontFamily: font,
              ...style,
            }}
          >
            <View style={{ maxWidth: 260 }}>
              <Text
                style={{ fontFamily: font, fontSize: 10, fontWeight: 700, lineHeight: 1.2, color }}
              >
                {q.issuer.businessName}
              </Text>
            </View>
            <View style={{ maxWidth: 260, alignItems: "flex-end" }}>
              <Text
                style={{ fontFamily: font, fontSize: 8.5, fontWeight: 600, lineHeight: 1.2, color }}
              >
                {docLabel} N.º {q.number} · {m.issueDate}
              </Text>
              <Text style={{ fontFamily: font, fontSize: 8.5, lineHeight: 1.2, color: muted }}>
                Cliente: {q.customer.name}
              </Text>
            </View>
          </View>
        ) : null
      }
    />
  );
}
