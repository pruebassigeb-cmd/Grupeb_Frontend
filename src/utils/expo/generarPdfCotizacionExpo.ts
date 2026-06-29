import jsPDF from "jspdf";

// ─── Hoja membretada: 300mm × 210mm landscape ────────────────────────────────
// Coordenadas calibradas a tanteo sobre el PDF de muestra.
// Ajustar X/Y cuando llegue la hoja física impresa.

const PAGE_W = 300;
const PAGE_H = 210;

// ─── Zonas del layout (mm) ───────────────────────────────────────────────────
// HEADER
const Y_FOLIO        = 22;   // fila del folio (arriba derecha)
const X_FOLIO        = 248;

const Y_HEADER       = 38;   // fila Cliente / Empresa / Fecha / Asesor
const X_CLIENTE      = 108;
const X_EMPRESA      = 164;
const X_FECHA        = 216;
const X_ASESOR       = 262;

// TABLA
const Y_TABLA        = 68;   // Y primera fila de productos
const ROW_H          = 14;   // altura por fila (mm)

// Columnas de la tabla
const X_PRODUCTO     = 20;
const X_MEDIDA       = 66;
const X_MATERIAL     = 90;   // material + calibre (dos líneas)
const X_TINTAS       = 116;
const X_LAM          = 130;  // Laminación
const X_HS           = 152;  // HS
const X_AR           = 162;  // AR
const X_TEX          = 172;  // Textura
const X_UV           = 192;  // UV
const X_ASA          = 202;  // Asa
const X_PIGMENTO     = 215;  // Otro/Pigmento

// Columnas de precio — dinámicas según cuántos precios haya (1, 2 o 3)
// Zona de precios: X 232 → X 295, se divide según numPrecios
const X_PRECIOS_INI  = 232;
const X_PRECIOS_FIN  = 295;

// COMENTARIOS
const Y_COMENTARIOS  = 175;
const X_COMENTARIOS  = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function txt(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size = 7,
  align: "left" | "center" | "right" = "left"
) {
  if (!text) return;
  doc.setFontSize(size);
  doc.text(text, x, y, { align });
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
  asesor:     string;
  fecha:      string;
  comentarios?: string;
  productos:  ProductoPdfExpo[];
}

// ─── Generador ───────────────────────────────────────────────────────────────
export function generarPdfCotizacionExpo(params: PdfCotizacionExpoParams): void {
  const { folio, cliente, asesor, fecha, comentarios = "", productos } = params;

  const doc = new jsPDF({
    orientation: "landscape",
    unit:        "mm",
    format:      [PAGE_H, PAGE_W], // jsPDF: [height, width] cuando orientation=landscape
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  // ── FOLIO ──────────────────────────────────────────────────────────────────
  txt(doc, folio, X_FOLIO + 15, Y_FOLIO, 8.5, "center");

  // ── HEADER — Cliente / Empresa / Fecha / Asesor ───────────────────────────
  txt(doc, cliente,      X_CLIENTE  + 18, Y_HEADER, 7.5, "center");
  txt(doc, "GRUPO EB",   X_EMPRESA  + 18, Y_HEADER, 7.5, "center");
  txt(doc, fecha,        X_FECHA    + 18, Y_HEADER, 7.5, "center");
  txt(doc, asesor,       X_ASESOR   + 14, Y_HEADER, 7.5, "center");

  // ── TABLA DE PRODUCTOS ────────────────────────────────────────────────────
  // Calcular número de columnas de precio (máximo del primer producto con detalles)
  const numPrecios = Math.min(
    3,
    Math.max(...productos.map(p => p.detalles?.length || 0), 0)
  );
  const anchoPrecio = numPrecios > 0
    ? (X_PRECIOS_FIN - X_PRECIOS_INI) / numPrecios
    : 0;

  // Encabezados de cantidad (500 / 1,000 / 3,000 — tomado del primer producto)
  if (numPrecios > 0 && productos[0]?.detalles?.length > 0) {
    const detallesRef = productos[0].detalles.slice(0, numPrecios);
    detallesRef.forEach((d, i) => {
      const xCol = X_PRECIOS_INI + i * anchoPrecio + anchoPrecio / 2;
      txt(doc, Number(d.cantidad).toLocaleString("es-MX"), xCol, Y_TABLA - 5, 6.5, "center");
    });
  }

  productos.forEach((prod, idx) => {
    const y = Y_TABLA + idx * ROW_H;

    // Producto (truncado a ~44mm)
    txt(doc, truncar(doc, prod.nombre, 44), X_PRODUCTO, y);

    // Medida
    if (prod.medida)   txt(doc, truncar(doc, prod.medida, 22), X_MEDIDA, y);

    // Material (línea 1) + Calibre (línea 2)
    if (prod.material) txt(doc, truncar(doc, prod.material, 22), X_MATERIAL, y);
    if (prod.calibre)  txt(doc, String(prod.calibre), X_MATERIAL, y + 4, 6);

    // Tintas
    if (prod.tintas) txt(doc, String(prod.tintas), X_TINTAS + 3, y, 7, "center");

    // Acabados
    if (prod.laminado) txt(doc, truncar(doc, prod.laminado, 18), X_LAM, y);
    if (prod.hs)       txt(doc, truncar(doc, prod.hs, 8),       X_HS  + 2, y, 6.5, "center");
    if (prod.ar)       txt(doc, prod.ar,                          X_AR  + 2, y, 6.5, "center");
    if (prod.textura)  txt(doc, truncar(doc, prod.textura, 16),  X_TEX, y);
    if (prod.uv)       txt(doc, prod.uv,                          X_UV  + 2, y, 6.5, "center");
    if (prod.asa)      txt(doc, truncar(doc, prod.asa, 10),       X_ASA, y);
    if (prod.pigmento) txt(doc, truncar(doc, prod.pigmento, 13),  X_PIGMENTO, y);

    // Precios — centrados en su columna, precio/pz + precio total abajo
    const detalles = (prod.detalles || []).slice(0, numPrecios);
    detalles.forEach((d, i) => {
      const xCol = X_PRECIOS_INI + i * anchoPrecio + anchoPrecio / 2;
      const pxPz = d.precio_unitario != null
        ? Number(d.precio_unitario)
        : Number(d.precio_total) / Number(d.cantidad);
      txt(doc, `$${pxPz.toFixed(2)}/pz`, xCol, y,     7, "center");
      txt(doc, `±20%`,                    xCol, y + 4, 5.5, "center");
    });
  });

  // ── COMENTARIOS ────────────────────────────────────────────────────────────
  if (comentarios.trim()) {
    const lineas = doc.splitTextToSize(comentarios, 240);
    doc.setFontSize(7);
    doc.text(lineas.slice(0, 3), X_COMENTARIOS, Y_COMENTARIOS);
  }

  // ── GUARDAR ────────────────────────────────────────────────────────────────
  doc.save(`Cotizacion_${folio}.pdf`);
}

// ─── Helper para construir params desde backData (ListaCotizaciones) ─────────
export function cotizacionBackDataAPdfParams(
  backData: any,
  folio: string,
  fecha: string,
  asesor: string
): PdfCotizacionExpoParams {
  const productos: ProductoPdfExpo[] = (backData.productos || []).map((p: any) => ({
    nombre:   p.nombre   || p.descripcion || "Producto",
    medida:   p.medida   || null,
    material: p.material || null,
    calibre:  p.calibre  || null,
    tintas:   p.tintas   ?? null,
    laminado: p.laminado_nombre || null,
    // hs desde backData no tiene tipo, se omite
    hs:       null,
    ar:       p.alto_relieve ? 'SI' : null,
    textura:  p.textura_nombre || null,
    uv:       p.uv ? 'SI' : null,
    asa:      p.asa_nombre || null,
    pigmento: p.pigmento || p.pigmentos || null,
    detalles: (p.detalles || []).map((d: any) => ({
      cantidad:        Number(d.cantidad),
      precio_unitario: d.precio_unitario != null ? Number(d.precio_unitario) : null,
      precio_total:    Number(d.precio_total),
    })),
  }));

  return {
    folio,
    cliente:    backData.cliente || "",
    asesor,
    fecha,
    comentarios: backData.comentarios || "",
    productos,
  };
}