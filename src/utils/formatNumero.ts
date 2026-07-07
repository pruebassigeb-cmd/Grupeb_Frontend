/**
 * Formatea un número (o el string numérico que devuelve Postgres para
 * columnas `numeric`, ej. "28.00", "12.500") quitando los ceros decimales
 * sobrantes — pero conservando los decimales reales.
 *
 *   formatNumero("28.00")   -> "28"
 *   formatNumero("12.500")  -> "12.5"
 *   formatNumero("0.020")   -> "0.02"
 *   formatNumero("12.345")  -> "12.345"   (no se pierde precisión real)
 *   formatNumero(28)        -> "28"
 *   formatNumero(null)      -> ""
 */
export function formatNumero(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "";

  const str = typeof valor === "number" ? valor.toString() : valor.trim();

  if (!str.includes(".")) return str;

  // Quita ceros finales y, si ya no queda nada después del punto, el punto también.
  return str.replace(/0+$/, "").replace(/\.$/, "");
}