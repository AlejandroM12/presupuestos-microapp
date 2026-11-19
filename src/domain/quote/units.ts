/**
 * Presentación de cantidades y unidades: "1 unidad", "2 unidades", "3 m", "12 bolsas".
 * Solo se normalizan unidades conocidas; las unidades personalizadas se respetan tal como se
 * escribieron (sin pluralizar ni cambiar mayúsculas).
 */

/** Unidades con plural regular (singular, plural). */
const PLURALIZABLE: Record<string, [string, string]> = {
  unidad: ["unidad", "unidades"],
  servicio: ["servicio", "servicios"],
  trabajo: ["trabajo", "trabajos"],
  juego: ["juego", "juegos"],
  bolsa: ["bolsa", "bolsas"],
  jornal: ["jornal", "jornales"],
  hora: ["hora", "horas"],
  día: ["día", "días"],
  dia: ["día", "días"],
  kit: ["kit", "kits"],
  pieza: ["pieza", "piezas"],
  caja: ["caja", "cajas"],
  rollo: ["rollo", "rollos"],
  visita: ["visita", "visitas"],
  mes: ["mes", "meses"],
};

/** Unidades que se abrevian y no cambian con la cantidad. */
const INVARIABLE: Record<string, string> = {
  m: "m",
  metro: "m",
  metros: "m",
  m2: "m²",
  "m²": "m²",
  "metro cuadrado": "m²",
  "metros cuadrados": "m²",
  m3: "m³",
  "m³": "m³",
  "metro cúbico": "m³",
  "metros cúbicos": "m³",
  kg: "kg",
  kilogramo: "kg",
  kilogramos: "kg",
  l: "l",
  litro: "l",
  litros: "l",
  h: "h",
  hs: "h",
  km: "km",
  gl: "gl",
  u: "u",
};

const groupedFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 });
const plainFormat = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 3,
  useGrouping: false,
});

/** Número con coma decimal; separador de miles solo desde 10.000 ("2021" no se ve como "2.021"). */
export function formatCount(value: number): string {
  return (Math.abs(value) >= 10000 ? groupedFormat : plainFormat).format(value);
}

export function formatUnit(unit: string, quantity: number): string {
  const trimmed = unit.trim();
  const key = trimmed.toLowerCase();
  if (key in INVARIABLE) return INVARIABLE[key];
  const forms = PLURALIZABLE[key];
  if (forms) return quantity === 1 ? forms[0] : forms[1];
  return trimmed;
}

/** "2 unidades", "3,5 h", "38 m²". Si la cantidad no es numérica se devuelve tal cual. */
export function formatQuantity(quantity: string, unit: string): string {
  const n = Number(quantity.trim().replace(",", "."));
  if (!Number.isFinite(n)) return `${quantity} ${unit}`.trim();
  return `${formatCount(n)} ${formatUnit(unit, n)}`.trim();
}
