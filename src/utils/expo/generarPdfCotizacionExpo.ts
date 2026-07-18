import jsPDF from "jspdf";

// ============================================================================
// PDF OVERLAY PARA LA HOJA PREIMPRESA DE COTIZACION EXPO
//
// Sistema de coordenadas usando milimetros:
//   X aumenta hacia la derecha.
//   Y aumenta hacia abajo.
//   dx positivo  = mueve a la derecha.
//   dx negativo  = mueve a la izquierda.
//   dy positivo  = mueve hacia abajo.
//   dy negativo  = mueve hacia arriba.
//
// El PDF solamente contiene los datos. El diseño ya existe en la hoja fisica.
// ============================================================================

const PAGE_W = 300;
const PAGE_H = 210;

// Mueve absolutamente todo el overlay.
// Utilizalo primero cuando toda la impresion salga desplazada por igual.
const OFFSET_GLOBAL_X = 0;
const OFFSET_GLOBAL_Y = 0;

const gx = (x: number): number => x + OFFSET_GLOBAL_X;
const gy = (y: number): number => y + OFFSET_GLOBAL_Y;

interface AjusteXY { dx: number; dy: number; }

const SIN_AJUSTE: AjusteXY = { dx: 0, dy: 0 };

function sumarAjustes(...ajustes: Array<Partial<AjusteXY> | undefined>): AjusteXY {
  return ajustes.reduce<AjusteXY>(
    (resultado, ajuste) => ({
      dx: resultado.dx + (ajuste?.dx ?? 0),
      dy: resultado.dy + (ajuste?.dy ?? 0),
    }),
    { ...SIN_AJUSTE }
  );
}

// ============================================================================
// 1. CAMPOS SUPERIORES Y COMENTARIOS
// ============================================================================

interface CampoPosicion {
  x: number;
  y: number;
  ancho: number;
  fontSize: number;
  align: "left" | "center" | "right";
}

const CAMPOS = {
  folio:   { x: 271, y: 13, ancho: 27, fontSize: 13, align: "center" },
  cliente: { x: 114, y: 65, ancho: 36, fontSize: 8,  align: "center" },
  empresa: { x: 153, y: 65, ancho: 34, fontSize: 8,  align: "center" },
  fecha:   { x: 190, y: 65, ancho: 31, fontSize: 8,  align: "center" },
  asesor:  { x: 225, y: 65, ancho: 34, fontSize: 8,  align: "center" },
} satisfies Record<string, CampoPosicion>;

type NombreCampoSuperior = keyof typeof CAMPOS;

// ---------------------------------------------------------------------------
// ACOMODO INDIVIDUAL DE FOLIO, CLIENTE, EMPRESA, FECHA, ASESOR Y COMENTARIOS
// ---------------------------------------------------------------------------
// Cambia solamente estos valores para mover cada objeto de manera independiente.
// Ejemplo: cliente: { dx: 2, dy: -1 } lo mueve 2 mm a la derecha y 1 mm arriba.
const AJUSTES_CAMPOS = {
  folio:       { dx: 1, dy: 5 },
  cliente:     { dx: 0, dy: 0 },
  empresa:     { dx: 0, dy: 0 },
  fecha:       { dx: 0, dy: 0 },
  asesor:      { dx: 0, dy: 0 },
  comentarios: { dx: 2, dy: 1 },
} satisfies Record<NombreCampoSuperior | "comentarios", AjusteXY>;

const COMENTARIOS = { x: 95, y: 150, ancho: 190, maxLineas: 3, fontSize: 8 };

// ============================================================================
// 2. TABLA PREIMPRESA
// ============================================================================

const TABLA = { xInicio: 90, xFin: 289, yEncabezado: 85, altoEncabezado: 13, yFilasInicio: 98, yFilasFin: 135 };

// ---------------------------------------------------------------------------
// POSICIONES FIJAS DE LOS 5 RENGLONES DE LA HOJA
// ---------------------------------------------------------------------------
// La hoja preimpresa SIEMPRE tiene 5 renglones y 3 celdas de cantidad, vengan
// los productos que vengan. Por eso las coordenadas son constantes y NO se
// calculan a partir de cuantos productos o cuantas cantidades llegaron.
//
// Regla: el producto 1 va SIEMPRE en FILAS[0], el 2 en FILAS[1], etc.
// Con 1 producto se usa FILAS[0] y las demas quedan vacias. Con 3 productos
// se usan FILAS[0..2]. Nunca se recentra ni se reparte el espacio sobrante.
//
// Cada valor es la Y en mm, ANTES de sumarle el dy de su columna y el ajuste
// individual de AJUSTES_POR_PRODUCTO. Para mover un renglon completo, cambia
// aqui sus numeros; para mover un solo dato, usa AJUSTES_POR_PRODUCTO.
//
//   lineaUnica = dato de una sola linea (medida, tintas, laminacion, etc.)
//   linea1 / linea2 = las dos lineas de un mismo dato (nombre largo,
//                     o material arriba y calibre abajo)
//   cantidad / separador / precio = los tres renglones de la celda de cantidad
interface PosicionFila {
  lineaUnica: number;
  linea1: number;
  linea2: number;
  cantidad: number;
  separador: number;
  precio: number;
}

const FILAS: PosicionFila[] = [
  { lineaUnica: 102.48, linea1: 101.396, linea2: 103.396, cantidad: 100.812, separador: 101.552, precio: 104.068 },
  { lineaUnica: 109.88, linea1: 108.796, linea2: 110.796, cantidad: 108.212, separador: 108.952, precio: 111.468 },
  { lineaUnica: 116.28, linea1: 115.196, linea2: 117.196, cantidad: 114.612, separador: 115.352, precio: 117.868 },
  { lineaUnica: 123.68, linea1: 122.596, linea2: 124.596, cantidad: 122.012, separador: 122.752, precio: 125.268 },
  { lineaUnica: 131.08, linea1: 129.996, linea2: 131.996, cantidad: 129.412, separador: 130.152, precio: 132.668 },
];

// Centro X fijo de cada una de las 3 celdas de cantidad, ANTES de sumarle el
// dx de la columna cantidad. La cantidad 1 va SIEMPRE en SLOTS_CANTIDAD[0],
// aunque el producto traiga una sola cantidad.
const SLOTS_CANTIDAD: number[] = [258.5, 270.7, 282.9];

// Mitad del largo de la rayita que separa cantidad de precio.
const SEPARADOR_MEDIO_ANCHO = 3.782;

const MAX_FILAS = FILAS.length;
const MAX_CANTIDADES = SLOTS_CANTIDAD.length;

interface ColumnaLayout {
  x1: number;
  x2: number;
  align: "left" | "center" | "right";
  dx: number;
  dy: number;
  paddingX: number;
}

// dx/dy en COLUMNAS mueve la columna completa en todos los productos.
// Cada columna con su propio dx, ajustado de forma independiente.
const COLUMNAS = {
  producto:        { x1: 90,    x2: 121.8, align: "left",   dx: 2, dy: 2, paddingX: 1.2 },
  medida:          { x1: 121.8, x2: 142.4, align: "center", dx: 1, dy: 2, paddingX: 0.8 },
  materialCalibre: { x1: 142.4, x2: 163.9, align: "center", dx: 3, dy: 2, paddingX: 0.8 },
  tintasFV:        { x1: 163.9, x2: 172.5, align: "center", dx: 2, dy: 2, paddingX: 0.5 },
  laminacion:      { x1: 172.5, x2: 189.6, align: "center", dx: 1, dy: 2, paddingX: 0.7 },
  hs:              { x1: 189.6, x2: 198.2, align: "center", dx: 3, dy: 2, paddingX: 0.4 },
  ar:              { x1: 198.2, x2: 203.4, align: "center", dx: 4, dy: 2, paddingX: 0.3 },
  textura:         { x1: 203.4, x2: 217.1, align: "center", dx: 6, dy: 2, paddingX: 0.5 },
  uv:              { x1: 217.1, x2: 223.2, align: "center", dx: 5, dy: 2, paddingX: 0.3 },
  asa:             { x1: 223.2, x2: 235.2, align: "center", dx: 5, dy: 2, paddingX: 0.5 },
  otroPigmento:    { x1: 235.2, x2: 252.4, align: "center", dx: 5, dy: 2, paddingX: 0.5 },
  cantidad:        { x1: 252.4, x2: 289,   align: "center", dx: 5, dy: 2, paddingX: 0.5 },
} satisfies Record<string, ColumnaLayout>;

type NombreColumna = keyof typeof COLUMNAS;

// ============================================================================
// 3. ACOMODO POR OBJETO DENTRO DE CADA FILA
// ============================================================================

interface AjusteCantidad {
  // bloque mueve cantidad, linea y precio juntos.
  bloque?: Partial<AjusteXY>;
  cantidad?: Partial<AjusteXY>;
  linea?: Partial<AjusteXY>;
  precio?: Partial<AjusteXY>;
}

interface AjusteProducto {
  // producto mueve las dos lineas del nombre juntas.
  producto?: Partial<AjusteXY>;
  productoLinea1?: Partial<AjusteXY>;
  productoLinea2?: Partial<AjusteXY>;
  medida?: Partial<AjusteXY>;
  material?: Partial<AjusteXY>;
  calibre?: Partial<AjusteXY>;
  tintasFV?: Partial<AjusteXY>;
  laminacion?: Partial<AjusteXY>;
  hs?: Partial<AjusteXY>;
  ar?: Partial<AjusteXY>;
  textura?: Partial<AjusteXY>;
  uv?: Partial<AjusteXY>;
  asa?: Partial<AjusteXY>;
  otroPigmento?: Partial<AjusteXY>;
  cantidad1?: AjusteCantidad;
  cantidad2?: AjusteCantidad;
  cantidad3?: AjusteCantidad;
}

// 0 = primer producto, 1 = segundo, 2 = tercero, etc.
//
// Estos ajustes se suman a los dx/dy generales de COLUMNAS.
// Deja todo en cero hasta hacer la primera impresion de calibracion.
const AJUSTES_POR_PRODUCTO: Record<number, AjusteProducto> = {
  0: {
    producto:     { dx: 0, dy: 0 },
    productoLinea1: { dx: 0, dy: 0 },
    productoLinea2: { dx: 0, dy: 0 },
    medida:       { dx: 0, dy: 0 },
    material:     { dx: 0, dy: 0 },
    calibre:      { dx: 0, dy: 0 },
    tintasFV:     { dx: 0, dy: 0 },
    laminacion:   { dx: 0, dy: 0 },
    hs:           { dx: 0, dy: 0 },
    ar:           { dx: 0, dy: 0 },
    textura:      { dx: 0, dy: 0 },
    uv:           { dx: 0, dy: 0 },
    asa:          { dx: 0, dy: 0 },
    otroPigmento: { dx: 0, dy: 0 },
    // Bloque de cantidad/precio de los 5 renglones: se les da la MISMA
    // separacion entre ellos (cancelando el AJUSTE_EXTRA_FILA de las filas
    // 3, 4 y 5, que solo afecta al resto de la fila) y se bajan 1mm parejo
    // a todos. No toca producto/medida/material/etc. de esta fila.
    cantidad1: { bloque: { dx: 0, dy: -1 } },
    cantidad2: { bloque: { dx: 0, dy: -1 } },
    cantidad3: { bloque: { dx: 0, dy: -1 } },
  },

  // Copia este bloque cuando quieras ajustar otra fila:
  // 1: {
  //   producto: { dx: 0, dy: 0 },
  //   medida:   { dx: 0, dy: 0 },
  //   material: { dx: 0, dy: 0 },
  //   calibre:  { dx: 0, dy: 0 },
  // },

  1: {
    cantidad1: { bloque: { dx: 0, dy: -1 } },
    cantidad2: { bloque: { dx: 0, dy: -1 } },
    cantidad3: { bloque: { dx: 0, dy: -1 } },
  },
  2: {
    cantidad1: { bloque: { dx: 0, dy: 0 } },
    cantidad2: { bloque: { dx: 0, dy: 0 } },
    cantidad3: { bloque: { dx: 0, dy: 0 } },
  },
  3: {
    cantidad1: { bloque: { dx: 0, dy: 0 } },
    cantidad2: { bloque: { dx: 0, dy: 0 } },
    cantidad3: { bloque: { dx: 0, dy: 0 } },
  },
  4: {
    cantidad1: { bloque: { dx: 0, dy: 0 } },
    cantidad2: { bloque: { dx: 0, dy: 0 } },
    cantidad3: { bloque: { dx: 0, dy: 0 } },
  },
};

function obtenerAjusteProducto(
  indiceProducto: number,
  objeto: keyof Omit<AjusteProducto, "cantidad1" | "cantidad2" | "cantidad3">
): AjusteXY {
  return sumarAjustes(AJUSTES_POR_PRODUCTO[indiceProducto]?.[objeto]);
}

function obtenerAjusteCantidad(indiceProducto: number, indiceDetalle: number, parte: keyof AjusteCantidad): AjusteXY {
  const clave = `cantidad${indiceDetalle + 1}` as "cantidad1" | "cantidad2" | "cantidad3";
  const ajusteCantidad = AJUSTES_POR_PRODUCTO[indiceProducto]?.[clave];
  return sumarAjustes(ajusteCantidad?.bloque, parte === "bloque" ? undefined : ajusteCantidad?.[parte]);
}

// ============================================================================
// 4. HELPERS DE TEXTO
// ============================================================================

function limitarTexto(doc: jsPDF, valor: unknown, maxWidth: number, fontSize: number): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";

  doc.setFontSize(fontSize);
  if (doc.getTextWidth(texto) <= maxWidth) return texto;

  let resultado = texto;
  while (resultado.length > 1 && doc.getTextWidth(resultado) > maxWidth) {
    resultado = resultado.slice(0, -1);
  }

  return resultado.trimEnd();
}

// Recorte fijo por numero de caracteres (independiente del ancho en mm).
// Se usa para pigmento (max 8) y textura (max 7): de ahi en mas se corta la palabra.
function recortarCaracteres(valor: unknown, maxCaracteres: number): string {
  const texto = String(valor ?? "").trim();
  if (texto.length <= maxCaracteres) return texto;
  return texto.slice(0, maxCaracteres).trimEnd();
}

function textoEnCampo(doc: jsPDF, valor: unknown, nombreCampo: NombreCampoSuperior, bold = true): void {
  const campo = CAMPOS[nombreCampo];
  const ajuste = AJUSTES_CAMPOS[nombreCampo];
  const texto = limitarTexto(doc, valor, campo.ancho, campo.fontSize);
  if (!texto) return;

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(campo.fontSize);
  doc.text(texto, gx(campo.x + ajuste.dx), gy(campo.y + ajuste.dy), { align: campo.align });
}

function obtenerXColumna(columna: ColumnaLayout): number {
  if (columna.align === "left") return columna.x1 + columna.paddingX + columna.dx;
  if (columna.align === "right") return columna.x2 - columna.paddingX + columna.dx;
  return (columna.x1 + columna.x2) / 2 + columna.dx;
}

function anchoUtilColumna(columna: ColumnaLayout): number {
  return columna.x2 - columna.x1 - columna.paddingX * 2;
}

function textoEnColumna(
  doc: jsPDF,
  columnaNombre: NombreColumna,
  valor: unknown,
  y: number,
  fontSize: number,
  ajusteObjeto: Partial<AjusteXY> = SIN_AJUSTE,
  bold = true
): void {
  const columna = COLUMNAS[columnaNombre];
  const texto = limitarTexto(doc, valor, anchoUtilColumna(columna), fontSize);
  if (!texto) return;

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.text(
    texto,
    gx(obtenerXColumna(columna) + (ajusteObjeto.dx ?? 0)),
    gy(y + columna.dy + (ajusteObjeto.dy ?? 0)),
    { align: columna.align }
  );
}

function dividirEnDosLineas(doc: jsPDF, valor: unknown, maxWidth: number, fontSize: number): [string, string] {
  const texto = String(valor ?? "").trim();
  if (!texto) return ["", ""];

  doc.setFontSize(fontSize);
  if (doc.getTextWidth(texto) <= maxWidth) return [texto, ""];

  const palabras = texto.split(/\s+/);
  let primera = "";
  let indice = 0;

  for (; indice < palabras.length; indice += 1) {
    const prueba = primera ? `${primera} ${palabras[indice]}` : palabras[indice];
    if (doc.getTextWidth(prueba) > maxWidth) break;
    primera = prueba;
  }

  if (!primera) return [limitarTexto(doc, texto, maxWidth, fontSize), ""];

  const segundaCompleta = palabras.slice(indice).join(" ");
  const segunda = limitarTexto(doc, segundaCompleta, maxWidth, fontSize);
  return [primera, segunda];
}

function parsearMaterialYCalibreExpo(grupDesc: string): { materialStr: string; calibreStr: string } {
  if (!grupDesc) return { materialStr: "", calibreStr: "" };

  const partes = grupDesc.split(/\s*\+\s*/).map((parte: string) => parte.trim());
  const regexCalibre = /(\d+(?:\.\d+)?\s*(?:pts|gms|gsm|ect))/gi;

  const materialStr = partes
    .map((parte: string) => parte.replace(regexCalibre, "").trim())
    .filter(Boolean)
    .join(" + ");

  const calibreStr = partes
    .map((parte: string) => {
      const coincidencia = parte.match(/(\d+(?:\.\d+)?\s*(?:pts|gms|gsm|ect))/i);
      return coincidencia ? coincidencia[1] : "";
    })
    .filter(Boolean)
    .join(" / ");

  return { materialStr, calibreStr };
}

function formatearTintasExpo(tintasFrente: unknown, tintasVuelta: unknown): string | null {
  if (tintasFrente === null || tintasFrente === undefined || tintasFrente === "") return null;

  const frente = String(tintasFrente);
  const tieneVuelta =
    tintasVuelta !== null && tintasVuelta !== undefined && tintasVuelta !== "" && Number(tintasVuelta) > 0;

  return tieneVuelta ? `${frente}x${tintasVuelta}` : frente;
}

function limpiarTextoCatalogo(valor: unknown): string | null {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;

  // Los catálogos pueden traer códigos o IDs entre paréntesis.
  // En el overlay se imprime únicamente el nombre visible.
  const limpio = texto.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  return limpio || null;
}

function combinarTextosCatalogo(...valores: unknown[]): string | null {
  const partes = valores
    .map(limpiarTextoCatalogo)
    .filter((valor): valor is string => Boolean(valor));

  return partes.length > 0 ? Array.from(new Set(partes)).join(" · ") : null;
}

function numeroSeguro(valor: unknown): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

// ============================================================================
// 5. MODO DE CALIBRACION
// ============================================================================

function dibujarCalibracion(doc: jsPDF): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4);
  doc.setLineWidth(0.1);

  doc.setDrawColor(180, 180, 180);
  doc.setTextColor(140, 140, 140);

  for (let x = 0; x <= PAGE_W; x += 10) {
    doc.line(gx(x), gy(0), gx(x), gy(PAGE_H));
    doc.text(String(x), gx(x + 0.4), gy(4));
  }

  for (let y = 0; y <= PAGE_H; y += 10) {
    doc.line(gx(0), gy(y), gx(PAGE_W), gy(y));
    doc.text(String(y), gx(0.5), gy(y + 3));
  }

  // Limites de encabezado y filas.
  doc.setDrawColor(255, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(gx(TABLA.xInicio), gy(TABLA.yEncabezado), TABLA.xFin - TABLA.xInicio, TABLA.altoEncabezado);
  doc.rect(gx(TABLA.xInicio), gy(TABLA.yFilasInicio), TABLA.xFin - TABLA.xInicio, TABLA.yFilasFin - TABLA.yFilasInicio);

  // Limites verticales de las columnas.
  doc.setDrawColor(0, 80, 220);
  doc.setLineWidth(0.2);
  const limites = Array.from(
    new Set(Object.values(COLUMNAS).flatMap((columna) => [columna.x1, columna.x2]))
  ).sort((a, b) => a - b);

  limites.forEach((x) => {
    doc.line(gx(x), gy(TABLA.yEncabezado), gx(x), gy(TABLA.yFilasFin));
  });

  // Cruces de los campos superiores con sus ajustes individuales aplicados.
  doc.setDrawColor(0, 150, 70);
  (Object.keys(CAMPOS) as NombreCampoSuperior[]).forEach((nombreCampo) => {
    const campo = CAMPOS[nombreCampo];
    const ajuste = AJUSTES_CAMPOS[nombreCampo];
    const xCentro = campo.x + ajuste.dx;
    const yBase = campo.y + ajuste.dy;

    doc.line(gx(xCentro - 2), gy(yBase), gx(xCentro + 2), gy(yBase));
    doc.line(gx(xCentro), gy(yBase - 2), gx(xCentro), gy(yBase + 2));
  });

  const ajusteComentarios = AJUSTES_CAMPOS.comentarios;
  doc.rect(gx(COMENTARIOS.x + ajusteComentarios.dx), gy(COMENTARIOS.y + ajusteComentarios.dy - 3), COMENTARIOS.ancho, 18);

  doc.setTextColor(0, 0, 0);
}

// ============================================================================
// 6. TIPOS PUBLICOS
// ============================================================================

export interface ProductoPdfExpo {
  nombre: string;
  medida?: string | null;
  material?: string | null;
  calibre?: string | null;
  tintas?: string | null;
  laminado?: string | null;
  hs?: string | null;
  ar?: string | null;
  textura?: string | null;
  uv?: string | null;
  asa?: string | null;
  pigmento?: string | null;
  detalles: { cantidad: number; precio_unitario: number | null; precio_total: number }[];
}

export interface PdfCotizacionExpoParams {
  folio: string;
  cliente: string;
  empresa: string;
  asesor: string;
  fecha: string;
  comentarios?: string;
  productos: ProductoPdfExpo[];
}

// ============================================================================
// 7. GENERADOR
// ============================================================================

export function generarPdfCotizacionExpo(params: PdfCotizacionExpoParams, modoCalibracion = false): void {
  const { folio, cliente, empresa, asesor, fecha, comentarios = "", productos = [] } = params;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [PAGE_H, PAGE_W], compress: true });

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // Campos superiores, cada uno con ajuste independiente.
  textoEnCampo(doc, folio, "folio", true);
  textoEnCampo(doc, cliente, "cliente", true);
  textoEnCampo(doc, empresa, "empresa", true);
  textoEnCampo(doc, fecha, "fecha", true);
  textoEnCampo(doc, asesor, "asesor", true);

  // La hoja fisica solo tiene 5 renglones y el acomodo ya no se comprime,
  // asi que un producto 6 se imprimiria fuera de la tabla.
  const productosVisibles = productos.slice(0, MAX_FILAS);
  if (productos.length > MAX_FILAS) {
    console.warn(
      `[cotizacion-expo] Llegaron ${productos.length} productos y la hoja preimpresa ` +
      `solo tiene ${MAX_FILAS} renglones. Se imprimen los primeros ${MAX_FILAS}.`
    );
  }

  // Tamaños visibles restaurados a los del archivo original.
  // Cambiar estos valores no modifica las coordenadas ni el acomodo.
  const TAMANO = {
    producto: 7, productoSegundaLinea: 7, medida: 7, material: 7, calibre: 7,
    tintas: 7, laminacion: 7, hs: 7, ar: 7, textura: 7, uv: 7, asa: 7,
    pigmento: 7, cantidad: 8, precio: 7.5,
  } as const;

  productosVisibles.forEach((producto, indiceProducto) => {
    // Posiciones FIJAS del renglon que le toca a este producto.
    // No dependen de cuantos productos llegaron.
    const fila = FILAS[indiceProducto];
    const yLineaUnica = fila.lineaUnica;
    const yLinea1 = fila.linea1;
    const yLinea2 = fila.linea2;

    // PRODUCTO: ajuste general y ajustes particulares de linea 1 y linea 2.
    const columnaProducto = COLUMNAS.producto;
    const [productoL1, productoL2] = dividirEnDosLineas(
      doc, producto.nombre, anchoUtilColumna(columnaProducto), TAMANO.productoSegundaLinea
    );

    const ajusteProductoGeneral = obtenerAjusteProducto(indiceProducto, "producto");
    const ajusteProductoL1 = sumarAjustes(ajusteProductoGeneral, obtenerAjusteProducto(indiceProducto, "productoLinea1"));
    const ajusteProductoL2 = sumarAjustes(ajusteProductoGeneral, obtenerAjusteProducto(indiceProducto, "productoLinea2"));

    textoEnColumna(
      doc, "producto", productoL1,
      productoL2 ? yLinea1 : yLineaUnica,
      productoL2 ? TAMANO.productoSegundaLinea : TAMANO.producto,
      ajusteProductoL1, true
    );

    if (productoL2) {
      textoEnColumna(doc, "producto", productoL2, yLinea2, TAMANO.productoSegundaLinea, ajusteProductoL2, true);
    }

    textoEnColumna(doc, "medida", producto.medida, yLineaUnica, TAMANO.medida, obtenerAjusteProducto(indiceProducto, "medida"), true);

    const tieneMaterial = Boolean(String(producto.material ?? "").trim());
    const tieneCalibre = Boolean(String(producto.calibre ?? "").trim());

    if (tieneMaterial && tieneCalibre) {
      textoEnColumna(doc, "materialCalibre", producto.material, yLinea1, TAMANO.material, obtenerAjusteProducto(indiceProducto, "material"), true);
      textoEnColumna(doc, "materialCalibre", producto.calibre, yLinea2, TAMANO.calibre, obtenerAjusteProducto(indiceProducto, "calibre"), true);
    } else {
      const objeto = tieneMaterial ? "material" : "calibre";
      textoEnColumna(
        doc, "materialCalibre", producto.material || producto.calibre, yLineaUnica,
        tieneMaterial ? TAMANO.material : TAMANO.calibre,
        obtenerAjusteProducto(indiceProducto, objeto), true
      );
    }

    textoEnColumna(doc, "tintasFV", producto.tintas, yLineaUnica, TAMANO.tintas, obtenerAjusteProducto(indiceProducto, "tintasFV"), true);
    textoEnColumna(doc, "laminacion", producto.laminado, yLineaUnica, TAMANO.laminacion, obtenerAjusteProducto(indiceProducto, "laminacion"), true);
    textoEnColumna(doc, "hs", producto.hs, yLineaUnica, TAMANO.hs, obtenerAjusteProducto(indiceProducto, "hs"), true);
    textoEnColumna(doc, "ar", producto.ar, yLineaUnica, TAMANO.ar, obtenerAjusteProducto(indiceProducto, "ar"), true);
    textoEnColumna(doc, "textura", recortarCaracteres(producto.textura, 8), yLineaUnica, TAMANO.textura, obtenerAjusteProducto(indiceProducto, "textura"), true);
    textoEnColumna(doc, "uv", producto.uv, yLineaUnica, TAMANO.uv, obtenerAjusteProducto(indiceProducto, "uv"), true);
    textoEnColumna(doc, "asa", producto.asa, yLineaUnica, TAMANO.asa, obtenerAjusteProducto(indiceProducto, "asa"), true);
    textoEnColumna(doc, "otroPigmento", recortarCaracteres(producto.pigmento, 8), yLineaUnica, TAMANO.pigmento, obtenerAjusteProducto(indiceProducto, "otroPigmento"), true);

    // CANTIDADES: cada cantidad, linea y precio se puede mover por separado.
    // Cada una va en su celda FIJA: la 1a en SLOTS_CANTIDAD[0], la 2a en el
    // [1] y la 3a en el [2]. Si el producto trae menos de 3, las celdas
    // sobrantes quedan vacias; las que si vienen no se mueven ni se recentran.
    const detalles = (producto.detalles || []).slice(0, MAX_CANTIDADES);
    const columnaCantidad = COLUMNAS.cantidad;

    detalles.forEach((detalle, indiceDetalle) => {
      const xCentroBase = SLOTS_CANTIDAD[indiceDetalle] + columnaCantidad.dx;

      const cantidad = numeroSeguro(detalle.cantidad);
      const total = numeroSeguro(detalle.precio_total);
      const precioUnitario =
        detalle.precio_unitario !== null && detalle.precio_unitario !== undefined
          ? numeroSeguro(detalle.precio_unitario)
          : cantidad > 0 ? total / cantidad : 0;

      const yCantidadBase = fila.cantidad + columnaCantidad.dy;
      const ySeparadorBase = fila.separador + columnaCantidad.dy;
      const yPrecioBase = fila.precio + columnaCantidad.dy;

      const ajusteCantidad = obtenerAjusteCantidad(indiceProducto, indiceDetalle, "cantidad");
      const ajusteLinea = obtenerAjusteCantidad(indiceProducto, indiceDetalle, "linea");
      const ajustePrecio = obtenerAjusteCantidad(indiceProducto, indiceDetalle, "precio");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(TAMANO.cantidad);
      doc.text(
        cantidad.toLocaleString("es-MX"),
        gx(xCentroBase + ajusteCantidad.dx),
        gy(yCantidadBase + ajusteCantidad.dy),
        { align: "center" }
      );

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.15);
      const medioSeparador = SEPARADOR_MEDIO_ANCHO;
      doc.line(
        gx(xCentroBase - medioSeparador + ajusteLinea.dx),
        gy(ySeparadorBase + ajusteLinea.dy),
        gx(xCentroBase + medioSeparador + ajusteLinea.dx),
        gy(ySeparadorBase + ajusteLinea.dy)
      );

      doc.setFontSize(TAMANO.precio);
      doc.text(`$${precioUnitario.toFixed(2)}`, gx(xCentroBase + ajustePrecio.dx), gy(yPrecioBase + ajustePrecio.dy), { align: "center" });
    });
  });

  // Comentarios con ajuste independiente.
  if (comentarios.trim()) {
    const ajuste = AJUSTES_CAMPOS.comentarios;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(COMENTARIOS.fontSize);

    const lineas = doc.splitTextToSize(comentarios.trim(), COMENTARIOS.ancho) as string[];
    doc.text(lineas.slice(0, COMENTARIOS.maxLineas), gx(COMENTARIOS.x + ajuste.dx), gy(COMENTARIOS.y + ajuste.dy));
  }

  if (modoCalibracion) dibujarCalibracion(doc);

  doc.save(`Cotizacion_${folio}.pdf`);
}

// ============================================================================
// 8. ADAPTADOR DESDE LOS DATOS DEL BACKEND
// ============================================================================

export function cotizacionBackDataAPdfParams(
  backData: any,
  folio: string,
  fecha: string,
  asesor: string
): PdfCotizacionExpoParams {
  const productos: ProductoPdfExpo[] = (backData.productos || []).map((producto: any) => {
    const esPapel = producto.tipo_material === "papel";

    const { materialStr, calibreStr } = esPapel
      ? parsearMaterialYCalibreExpo(producto.grupo_descripcion || "")
      : { materialStr: "", calibreStr: "" };

    const tipoAsaPapel = limpiarTextoCatalogo(producto.asa_nombre);
    const tipoAsaPlastico = limpiarTextoCatalogo(
      producto.suaje_tipo || producto.asa_nombre
    );
    const colorAsaPlastico = limpiarTextoCatalogo(
      producto.color_asa_nombre || producto.asa_color
    );

    return {
      nombre: producto.nombre || producto.descripcion || "Producto",
      medida: producto.medida || null,
      material: producto.material || (esPapel ? materialStr : "") || null,
      calibre: producto.calibre || (esPapel ? calibreStr : "") || null,
      tintas: formatearTintasExpo(producto.tintas, producto.tintas_dentro),

      // La hoja física comparte esta columna: laminado para papel y tipo para plástico.
      laminado: esPapel
        ? limpiarTextoCatalogo(producto.laminado_nombre)
        : limpiarTextoCatalogo(producto.tipo_producto || producto.expo_tipo_producto),

      hs: esPapel ? limpiarTextoCatalogo(producto.foil_nombre) : null,
      ar: esPapel && producto.alto_relieve ? "SI" : null,
      textura: esPapel ? limpiarTextoCatalogo(producto.textura_nombre) : null,
      uv: esPapel && producto.uv ? "SI" : null,

      // Papel muestra el tipo de asa. Plástico muestra tipo de suaje/asa y color.
      asa: esPapel
        ? tipoAsaPapel
        : combinarTextosCatalogo(tipoAsaPlastico, colorAsaPlastico),

      // En OTRO/PIGMENTO se muestra únicamente el pigmento limpio.
      pigmento: limpiarTextoCatalogo(producto.pigmento || producto.pigmentos),
      detalles: (producto.detalles || []).map((detalle: any) => ({
        cantidad: numeroSeguro(detalle.cantidad),
        precio_unitario:
          detalle.precio_unitario !== null && detalle.precio_unitario !== undefined
            ? numeroSeguro(detalle.precio_unitario)
            : null,
        precio_total: numeroSeguro(detalle.precio_total),
      })),
    };
  });

  const observacionesUnicas = Array.from(
    new Set<string>(
      (backData.productos || [])
        .map((producto: any) => String(producto.observacion || "").trim())
        .filter(Boolean)
    )
  );

  const comentariosFallback = observacionesUnicas.join(" | ");

  return {
    folio,
    cliente: backData.cliente || "",
    empresa: backData.impresion || "",
    asesor,
    fecha,
    comentarios: backData.comentarios || comentariosFallback || "",
    productos,
  };
}