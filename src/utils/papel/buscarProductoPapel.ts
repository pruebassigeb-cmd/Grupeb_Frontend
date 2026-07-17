// src/utils/papel/buscarProductoPapel.ts
// Helper centralizado de búsqueda para productos de papel. Se usa tanto en
// el buscador de pedidos (EditarPedidoPapel) como en el de cotizaciones
// (FormularioProductoPapel) para que ambos busquen exactamente igual, en
// TODOS los campos relevantes del producto — no solo tipo/descripción/medida.

export const normalizarTextoBusqueda = (v: unknown): string =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Compara un texto de búsqueda (puede tener varias palabras) contra todos
 * los campos relevantes de un producto de papel. Cada palabra escrita debe
 * aparecer en ALGÚN campo (no necesariamente el mismo), así que
 * "kraft 40x30" encuentra el producto aunque "kraft" esté en el material y
 * "40x30" en la medida.
 *
 * Se usa `any` a propósito: el backend regresa más campos de los que el
 * tipo ProductoPapelBusqueda declara (primer_calibre, tamano_prod, etc.),
 * y queremos que el buscador los cubra todos sin pelear con TypeScript.
 */
export function coincideBusquedaProductoPapel(
  producto: any,
  query: string,
): boolean {
  const queryNormalizado = normalizarTextoBusqueda(query);
  if (!queryNormalizado) return true;

  const camposTexto = [
    producto?.idproducto_papel,
    producto?.tipo_producto,
    producto?.descripcion_papel,
    producto?.medida,
    producto?.tamano_prod,
    producto?.tamano_asa_default,
    producto?.primer_tipo_papel,
    producto?.primer_calibre,
    producto?.primer_pliego,
    producto?.ancho,
    producto?.fuelle,
    producto?.altura,
    producto?.creado_por,
  ]
    .map((campo) => normalizarTextoBusqueda(campo))
    .filter(Boolean)
    .join(" | ");

  const palabras = queryNormalizado.split(" ").filter(Boolean);
  return palabras.every((palabra) => camposTexto.includes(palabra));
}