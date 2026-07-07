import jsPDF from "jspdf";

// ─── Hoja membretada: 300mm × 210mm landscape ────────────────────────────────
// Coordenadas calibradas a tanteo sobre el PDF de muestra.
// Ajustar X/Y cuando llegue la hoja física impresa.

const PAGE_W = 300;
const PAGE_H = 210;

// ── SECCIÓN 1: FOLIO ─────────────────────────────────────────────────────────
const Y_FOLIO        = 7;    // bajado 2mm desde donde estaba
const X_FOLIO         = 256;  // corrido 2mm a la izquierda desde donde estaba

// ── SECCIÓN 2: CLIENTE / EMPRESA / FECHA / ASESOR ───────────────────────────
const Y_HEADER       = 58;
const X_CLIENTE      = 73;
const X_EMPRESA      = 119;  // corrido 5mm más a la derecha
const X_FECHA        = 156;  // corrido 5mm más a la derecha
const X_ASESOR       = 207;

// ── SECCIÓN 3: TABLA ─────────────────────────────────────────────────────────
const Y_TABLA        = 102;  // bajada 4mm más
const ROW_H          = 8;    // se había reducido a 7mm; subida 1mm para evitar que las líneas apiladas (nombre, material/calibre, asa/pigmento) del renglón se peguen con el siguiente renglón

// Columnas de la tabla — todas corridas 10mm a la izquierda
const X_PRODUCTO     = 70;
const X_MEDIDA       = 106;
const X_MATERIAL     = 130;  // material + calibre (dos líneas)
const X_TINTAS       = 156;
const X_LAM          = 166;  // Laminación (papel) / Tipo (plástico) — 4mm a la izquierda
const X_HS           = 189;  // HS (Hot Stamping / Foil) — 3mm a la izquierda
const X_AR           = 198;  // AR — 4mm a la izquierda
const X_TEX          = 208;  // Textura — 4mm a la izquierda
const X_UV           = 226;  // UV — 6mm a la izquierda
const X_ASA          = 231;  // Asa — 5mm a la izquierda
const X_PIGMENTO     = 242;  // Pigmento — 4mm a la izquierda

// Columnas de precio — recorridas 2mm más a la derecha, con espacio (gutter)
// de 3mm entre cada columna de precio
const X_PRECIOS_INI  = 259;
const X_PRECIOS_FIN  = 297;
const GUTTER_PRECIOS = 3;    // separación extra entre columnas de precio
const PRECIO_Y_OFFSET = -2;  // toda la sección de precios sube 3mm — bajada 1mm

// ── SECCIÓN 4: COMENTARIOS ──────────────────────────────────────────────────
const Y_COMENTARIOS  = 155;  // bajado 10mm desde donde estaba
const X_COMENTARIOS  = 70;   // corrido 10mm a la izquierda desde donde estaba


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

// Parte el nombre del producto en 2 líneas para mostrarlo apilado (misma
// lógica visual que Material/Calibre): si el nombre trae un guion largo
// "—" se corta ahí (línea 1 = antes del guion, línea 2 = después); si no
// trae guion, se envuelve por ancho tomando lo que quepa en la línea 1 y
// el resto en la línea 2. Cada línea se trunca al maxWidth disponible.
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
    ? (X_PRECIOS_FIN - X_PRECIOS_INI - GUTTER_PRECIOS * (numPrecios - 1)) / numPrecios
    : 0;

  // Encabezados de cantidad (500 / 1,000 / 3,000 — tomado del primer producto)
  if (numPrecios > 0 && productos[0]?.detalles?.length > 0) {
    const detallesRef = productos[0].detalles.slice(0, numPrecios);
    detallesRef.forEach((d, i) => {
      const xCol = X_PRECIOS_INI + i * (anchoPrecio + GUTTER_PRECIOS) + anchoPrecio / 2;
      txt(doc, Number(d.cantidad).toLocaleString("es-MX"), xCol, Y_TABLA - 5 + PRECIO_Y_OFFSET, 6.5, "center");
    });
  }

  productos.forEach((prod, idx) => {
    const y = Y_TABLA + idx * ROW_H;

    // Producto — apilado en 2 líneas (línea 1 arriba, línea 2 debajo,
    // mismo renglón), igual que Material/Calibre
    const [nombreL1, nombreL2] = partirNombre(doc, prod.nombre, 32);
    txt(doc, nombreL1, X_PRODUCTO, y);
    if (nombreL2) txt(doc, nombreL2, X_PRODUCTO, y + 2.8, 6);

    // Medida
    if (prod.medida)   txt(doc, truncar(doc, prod.medida, 22), X_MEDIDA, y);

    // Material (línea 1) + Calibre (línea 2)
    if (prod.material) txt(doc, truncar(doc, prod.material, 22), X_MATERIAL, y);
    if (prod.calibre)  txt(doc, String(prod.calibre), X_MATERIAL, y + 4, 6);

    // Tintas
    if (prod.tintas) txt(doc, String(prod.tintas), X_TINTAS, y, 7, "center");

    // Acabados
    if (prod.laminado) txt(doc, truncar(doc, prod.laminado, 18), X_LAM, y);
    if (prod.hs)       txt(doc, truncar(doc, prod.hs, 8),       X_HS, y, 6.5, "center");
    if (prod.ar)       txt(doc, prod.ar,                          X_AR, y, 6.5, "center");
    if (prod.textura)  txt(doc, truncar(doc, prod.textura, 16),  X_TEX, y);
    if (prod.uv)       txt(doc, prod.uv,                          X_UV, y, 6.5, "center");
    if (prod.asa)      txt(doc, truncar(doc, prod.asa, 9), X_ASA, y, 6.5);
    if (prod.pigmento) txt(doc, truncar(doc, prod.pigmento, 9), X_PIGMENTO, y, 6.5);

    // Precios — centrados en su columna, precio/pz + precio total abajo
    const detalles = (prod.detalles || []).slice(0, numPrecios);
    detalles.forEach((d, i) => {
      const xCol = X_PRECIOS_INI + i * (anchoPrecio + GUTTER_PRECIOS) + anchoPrecio / 2;
      const pxPz = d.precio_unitario != null
        ? Number(d.precio_unitario)
        : Number(d.precio_total) / Number(d.cantidad);
      txt(doc, `$${pxPz.toFixed(2)}/pz`, xCol, y + PRECIO_Y_OFFSET,     7, "center");
      txt(doc, `±20%`,                    xCol, y + 4 + PRECIO_Y_OFFSET, 5.5, "center");
    });
  });

  // ── COMENTARIOS ────────────────────────────────────────────────────────────
  if (comentarios.trim()) {
    doc.setFontSize(7);
    const lineas = doc.splitTextToSize(comentarios, 240);
    doc.text(lineas.slice(0, 3), X_COMENTARIOS, Y_COMENTARIOS);
  }

  // ── GUARDAR ────────────────────────────────────────────────────────────────
  doc.save(`Cotizacion_${folio}.pdf`);
}

// ─── Helper para construir params desde backData (ListaCotizaciones) ─────────
// backData es lo que regresa getCotizacionesExpo() — se usa tanto para
// reimprimir manualmente desde la lista como para el PDF que se genera al
// guardar (ver guardarEImprimir en Expo.tsx, que ahora relee la cotización
// recién creada y pasa por esta MISMA función, para que ambos caminos
// produzcan siempre el mismo PDF).
export function cotizacionBackDataAPdfParams(
  backData: any,
  folio: string,
  fecha: string,
  asesor: string
): PdfCotizacionExpoParams {
  const productos: ProductoPdfExpo[] = (backData.productos || []).map((p: any) => {
    // "Lam./Tipo": en papel es la laminación (laminado_nombre); en plástico
    // no existe laminado, así que caemos al "tipo" del producto (p.ej.
    // "Bolsa asa flexible"). Antes esto SOLO leía laminado_nombre, por eso
    // el plástico siempre salía en blanco en esa columna.
    const laminadoOTipo = p.laminado_nombre || p.tipo_producto || null;

    // HS = Hot Stamping, que en este sistema se maneja como "foil"
    // (mismo concepto, mismo catálogo). cotizacionBackDataAPdfParams antes
    // lo omitía por completo (siempre null) aunque el dato sí existe.
    const hs = p.foil_nombre || null;

    // Asa: en papel viene en asa_nombre; en plástico viene separada en
    // suaje_tipo + color_asa_nombre. Antes solo se leía asa_nombre, así
    // que el asa de plástico tampoco se imprimía.
    const asa = p.asa_nombre
      || (p.suaje_tipo ? `${p.suaje_tipo}${p.color_asa_nombre ? " · " + p.color_asa_nombre : ""}` : null);

    return {
      nombre:   p.nombre   || p.descripcion || "Producto",
      medida:   p.medida   || null,
      material: p.material || null,
      calibre:  p.calibre  || null,
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

  // ── Comentarios ──────────────────────────────────────────────────────────
  // El backend NO guarda el comentario general de la cotización en un campo
  // propio — lo reparte dentro de `observacion` de cada producto que no
  // tuviera ya su propia observación (ver obsGeneral en el controller de
  // creación). Por eso backData.comentarios nunca existe. Como respaldo,
  // juntamos las observaciones únicas de los productos — funciona bien
  // cuando todos comparten el mismo comentario general, pero no es una
  // reconstrucción perfecta si cada producto tenía su propia nota distinta.
  // La solución de raíz sería agregar una columna `comentarios` a la tabla
  // `solicitud` y guardarla ahí directamente al crear la cotización.
  const observacionesUnicas = Array.from(new Set(
    (backData.productos || [])
      .map((p: any) => (p.observacion || "").trim())
      .filter(Boolean)
  ));
  const comentariosFallback = observacionesUnicas.join(" | ");

  return {
    folio,
    cliente:    backData.cliente || "",
    asesor,
    fecha,
    comentarios: backData.comentarios || comentariosFallback || "",
    productos,
  };
}