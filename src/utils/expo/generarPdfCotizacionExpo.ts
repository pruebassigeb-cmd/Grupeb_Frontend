import jsPDF from "jspdf";

// ─── Hoja membretada: 300mm × 210mm landscape ────────────────────────────────
// Coordenadas calibradas a tanteo sobre el PDF de muestra.
// Ajustar X/Y cuando llegue la hoja física impresa.

const PAGE_W = 300;
const PAGE_H = 210;

// ── SECCIÓN 1: FOLIO ─────────────────────────────────────────────────────────
const Y_FOLIO        = 7;
const X_FOLIO         = 256;

// ── SECCIÓN 2: CLIENTE / EMPRESA / FECHA / ASESOR ───────────────────────────
const Y_HEADER       = 59;
const X_CLIENTE      = 70;
const X_EMPRESA      = 119;
const X_FECHA        = 161;
const X_ASESOR       = 206;

// ── SECCIÓN 3: TABLA ─────────────────────────────────────────────────────────
const Y_TABLA        = 102;
const ROW_H          = 8;

// Columnas de la tabla — todas corridas 10mm a la izquierda
const X_PRODUCTO     = 70;
const X_MEDIDA       = 106;
const X_MATERIAL     = 131;
const X_TINTAS       = 156;
const X_LAM          = 166;
const X_HS           = 186;
const X_AR           = 196;
const X_TEX          = 202;
const X_UV           = 218;
const X_ASA          = 225;
const X_PIGMENTO     = 239;

// Columnas de precio — cada producto trae su propia cantidad, así que esta
// sección ya no tiene un encabezado de cantidad compartido: la cantidad se
// imprime por fila, en el lugar donde antes iba el precio.
const X_PRECIOS_INI  = 259;
const X_PRECIOS_FIN  = 297;
const GUTTER_PRECIOS = 3;
const PRECIO_Y_OFFSET = -1;

// ── SECCIÓN 4: COMENTARIOS ──────────────────────────────────────────────────
const Y_COMENTARIOS  = 155;
const X_COMENTARIOS  = 70;


// ─── Helpers ─────────────────────────────────────────────────────────────────
function txt(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size = 7,
  align: "left" | "center" | "right" = "left",
  bold = false
) {
  if (!text) return;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.text(text, x, y, { align });
  if (bold) doc.setFont("helvetica", "normal");
}

function truncar(doc: jsPDF, text: string, maxWidth: number, size = 7): string {
  doc.setFontSize(size);
  const words = String(text).split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (doc.getTextWidth(test) > maxWidth) break;
    line = test;
  }
  return line || String(text).slice(0, 18);
}

// Trunca por número de CARACTERES (no ancho en mm).
function truncarConPuntos(text: string, maxChars: number): string {
  const t = String(text || "");
  return t.length > maxChars ? t.slice(0, maxChars) : t;
}

function partirNombre(doc: jsPDF, nombre: string, maxWidth: number): [string, string] {
  const texto = String(nombre || "");
  const separador = "—";

  if (texto.includes(separador)) {
    const idx = texto.indexOf(separador);
    const linea1 = texto.slice(0, idx).trim();
    const linea2 = texto.slice(idx + separador.length).trim();
    return [truncar(doc, linea1, maxWidth), truncar(doc, linea2, maxWidth)];
  }

  doc.setFontSize(7);
  const palabras = texto.split(" ");
  let linea1 = "";
  let i = 0;
  for (; i < palabras.length; i++) {
    const test = linea1 ? `${linea1} ${palabras[i]}` : palabras[i];
    if (doc.getTextWidth(test) > maxWidth) break;
    linea1 = test;
  }
  const resto = palabras.slice(i).join(" ");
  return [linea1 || texto, resto ? truncar(doc, resto, maxWidth) : ""];
}

// ─── Helper: separar material y calibre desde grupo_descripcion ─────────────
// El backend solo llena material_nombre/calibre_numero para PLÁSTICO — para
// productos de PAPEL, esos dos campos vienen null y lo único poblado es
// grupo_descripcion (ej. "Couché 12pts + Cartulina 14pts"). Sin este
// respaldo, el PDF de cotización imprimía material/calibre vacíos en papel.
function parsearMaterialYCalibreExpo(grupDesc: string): { materialStr: string; calibreStr: string } {
  if (!grupDesc) return { materialStr: "", calibreStr: "" };
  const partes = grupDesc.split(/\s*\+\s*/).map((s: string) => s.trim());
  const regexCalibre = /(\d+(?:\.\d+)?\s*(?:pts|gms|ect))/gi;
  const materialStr = partes
    .map((p: string) => p.replace(regexCalibre, "").trim())
    .filter(Boolean)
    .join(" + ");
  const calibreStr = partes
    .map((p: string) => { const m = p.match(/(\d+(?:\.\d+)?\s*(?:pts|gms|ect))/i); return m ? m[1] : ""; })
    .filter(Boolean)
    .join(" / ");
  return { materialStr, calibreStr };
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
export interface ProductoPdfExpo {
  nombre:         string;
  medida?:        string | null;
  material?:      string | null;
  calibre?:       string | null;
  tintas?:        string | null;
  laminado?:      string | null;
  hs?:            string | null;
  ar?:            string | null;
  textura?:       string | null;
  uv?:            string | null;
  asa?:           string | null;
  pigmento?:      string | null;
  detalles: {
    cantidad:       number;
    precio_unitario: number | null;
    precio_total:   number;
  }[];
}

export interface PdfCotizacionExpoParams {
  folio:      string;
  cliente:    string;
  empresa:    string;
  asesor:     string;
  fecha:      string;
  comentarios?: string;
  productos:  ProductoPdfExpo[];
}

// ─── Generador ───────────────────────────────────────────────────────────────
export function generarPdfCotizacionExpo(params: PdfCotizacionExpoParams): void {
  const { folio, cliente, empresa, asesor, fecha, comentarios = "", productos } = params;

  const doc = new jsPDF({
    orientation: "landscape",
    unit:        "mm",
    format:      [PAGE_H, PAGE_W],
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  // ── FOLIO ──────────────────────────────────────────────────────────────────
  txt(doc, folio, X_FOLIO + 15, Y_FOLIO, 13, "center", true);

  // ── HEADER — Cliente / Empresa / Fecha / Asesor ───────────────────────────
  txt(doc, cliente,      X_CLIENTE  + 18, Y_HEADER, 9, "center", true);
  txt(doc, empresa || "—", X_EMPRESA + 18, Y_HEADER, 9, "center", true);
  txt(doc, fecha,        X_FECHA    + 18, Y_HEADER, 9, "center", true);
  txt(doc, asesor,       X_ASESOR   + 14, Y_HEADER, 9, "center", true);

  // ── TABLA DE PRODUCTOS ────────────────────────────────────────────────────
  const numPrecios = Math.min(
    3,
    Math.max(...productos.map(p => p.detalles?.length || 0), 0)
  );
  const anchoPrecio = numPrecios > 0
    ? (X_PRECIOS_FIN - X_PRECIOS_INI - GUTTER_PRECIOS * (numPrecios - 1)) / numPrecios
    : 0;

  productos.forEach((prod, idx) => {
    const y = Y_TABLA + idx * ROW_H;

    // Producto — apilado en 2 líneas.
    const [nombreL1, nombreL2] = partirNombre(doc, prod.nombre, 32);
    txt(doc, nombreL1, X_PRODUCTO, y, 9);
    if (nombreL2) txt(doc, nombreL2, X_PRODUCTO, y + 2.8, 8);

    if (prod.medida)   txt(doc, truncar(doc, prod.medida, 22, 8), X_MEDIDA, y, 8);

    // Material (línea 1) + Calibre (línea 2)
    if (prod.material) txt(doc, truncar(doc, prod.material, 22, 8), X_MATERIAL, y, 8);
    if (prod.calibre)  txt(doc, String(prod.calibre), X_MATERIAL, y + 3.5, 7);

    if (prod.tintas) txt(doc, String(prod.tintas), X_TINTAS, y, 8, "center");

    if (prod.laminado) txt(doc, truncar(doc, prod.laminado, 18, 8), X_LAM, y, 8);
    if (prod.hs)       txt(doc, truncarConPuntos(prod.hs, 6),     X_HS, y, 7.5, "center");
    if (prod.ar)       txt(doc, prod.ar,                          X_AR, y, 7.5, "center");
    if (prod.textura)  txt(doc, truncarConPuntos(prod.textura, 8), X_TEX, y, 8);
    if (prod.uv)       txt(doc, prod.uv,                          X_UV, y, 7.5, "center");
    if (prod.asa)      txt(doc, truncar(doc, prod.asa, 9, 8), X_ASA, y, 8);
    if (prod.pigmento) txt(doc, truncar(doc, prod.pigmento, 9, 8), X_PIGMENTO, y, 8);

    // Precios — cada renglón imprime SU propia cantidad, una línea real
    // dibujada debajo como separador (no un carácter "_", cuya posición
    // varía según la fuente), y luego SU propio precio unitario.
    const detalles = (prod.detalles || []).slice(0, numPrecios);
    detalles.forEach((d, i) => {
  const xCol = X_PRECIOS_INI + i * (anchoPrecio + GUTTER_PRECIOS) + anchoPrecio / 2;
  const pxPz = d.precio_unitario != null
    ? Number(d.precio_unitario)
    : Number(d.precio_total) / Number(d.cantidad);

  txt(doc, Number(d.cantidad).toLocaleString("es-MX"), xCol, y + PRECIO_Y_OFFSET, 8, "center");

  const lineaY = y + 0.8 + PRECIO_Y_OFFSET;
  const medioAncho = anchoPrecio * 0.28;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(xCol - medioAncho, lineaY, xCol + medioAncho, lineaY);

  txt(doc, `$${pxPz.toFixed(2)}`, xCol, y + 3.5 + PRECIO_Y_OFFSET, 7.5, "center");
});
  });

  // ── COMENTARIOS ────────────────────────────────────────────────────────────
  if (comentarios.trim()) {
    doc.setFontSize(8);
    const lineas = doc.splitTextToSize(comentarios, 240);
    doc.text(lineas.slice(0, 3), X_COMENTARIOS, Y_COMENTARIOS);
  }

  // ── GUARDAR ────────────────────────────────────────────────────────────────
  doc.save(`Cotizacion_${folio}.pdf`);
}

// ─── Helper para construir params desde backData (ListaCotizaciones) ─────────
// backData es lo que regresa getCotizacionesExpo() — se usa tanto para
// reimprimir manualmente desde la lista como para el PDF que se genera al
// guardar. Para productos de PAPEL, material/calibre no vienen poblados
// directo del backend — se reconstruyen desde grupo_descripcion.
export function cotizacionBackDataAPdfParams(
  backData: any,
  folio: string,
  fecha: string,
  asesor: string
): PdfCotizacionExpoParams {
  const productos: ProductoPdfExpo[] = (backData.productos || []).map((p: any) => {
    const laminadoOTipo = p.laminado_nombre || p.tipo_producto || null;
    const hs = p.foil_nombre || null;
    const asa = p.asa_nombre
      || (p.suaje_tipo ? `${p.suaje_tipo}${p.color_asa_nombre ? " · " + p.color_asa_nombre : ""}` : null);

    const esPapel = p.tipo_material === "papel";
    const { materialStr, calibreStr } = esPapel
      ? parsearMaterialYCalibreExpo(p.grupo_descripcion || "")
      : { materialStr: "", calibreStr: "" };

    return {
      nombre:   p.nombre   || p.descripcion || "Producto",
      medida:   p.medida   || null,
      material: p.material || (esPapel ? materialStr : "") || null,
      calibre:  p.calibre  || (esPapel ? calibreStr : "") || null,
      tintas:   p.tintas   ?? null,
      laminado: laminadoOTipo,
      hs,
      ar:       p.alto_relieve ? 'SI' : null,
      textura:  p.textura_nombre || null,
      uv:       p.uv ? 'SI' : null,
      asa,
      pigmento: p.pigmento || p.pigmentos || null,
      detalles: (p.detalles || []).map((d: any) => ({
        cantidad:        Number(d.cantidad),
        precio_unitario: d.precio_unitario != null ? Number(d.precio_unitario) : null,
        precio_total:    Number(d.precio_total),
      })),
    };
  });

  const observacionesUnicas = Array.from(new Set(
    (backData.productos || [])
      .map((p: any) => (p.observacion || "").trim())
      .filter(Boolean)
  ));
  const comentariosFallback = observacionesUnicas.join(" | ");

  return {
    folio,
    cliente:    backData.cliente || "",
    empresa:    backData.impresion || "",
    asesor,
    fecha,
    comentarios: backData.comentarios || comentariosFallback || "",
    productos,
  };
}