import jsPDF from "jspdf";
import { cargarLogoBase64 } from "../Pdfutils";
import logoUrl from "../../assets/logogrupeb.png";
import { subirPdfA3 } from "../../services/pdfS3.service";
import type {
  NombreProcesoOrdenPapel,
  OrdenProduccionPapelData,
  ProcesoOrdenPapelPdf,
  ProcesoPapelRuntime,
} from "../../types/papel/ordenProduccionPapel.types";
import {
  construirProcesosOrdenPapelPdf,
  f,
  fmtNum,
  n,
  normalizarOrdenProduccionPapelData,
  obtenerRegistroProcesoPapel,
  primeraLinea,
  redondear,
  validarProductoPapelParaPdf,
} from "./ordenProduccionPapelPdf.helpers";

// ════════════════════════════════════════════════════════════════════════
// GEOMETRÍA DEL FORMATO
// ════════════════════════════════════════════════════════════════════════
// Todas las medidas están en milímetros y calcadas del formato impreso de
// Grupo EB. La hoja original es un tamaño propio (~211 x 280 mm); aquí se
// dibuja sobre carta (216 x 279.4) centrando el marco, para que salga bien
// en cualquier impresora sin configurar tamaños especiales.
//
// Si algún día hay que mover una columna, TODO se controla desde este
// bloque: los dibujos de abajo solo leen estas constantes.
// ════════════════════════════════════════════════════════════════════════
const PW = 216;
const PH = 279.4;

const M = 4.5;                    // margen exterior / marco de la hoja
const X0 = M;                     // borde izquierdo del formato
const X1 = PW - M;                // borde derecho del formato
const CW = X1 - X0;               // ancho útil

// ── Columnas verticales del encabezado ──────────────────────────────────
const X_LOGO_R = X0 + CW * 0.185;   // fin de la celda del logo
const X_TITULO_R = X0 + CW * 0.728; // fin del título / inicio del cuadro ORDEN
const X_FIRMA_L = X0 + CW * 0.862;  // inicio de la columna Ventas/Diseño/Logistica

// ── Columnas del cuerpo (procesos) ──────────────────────────────────────
// La fila de preparación (Hojeado + Pliegos/Guillotina) y la de Almacén
// usan la columna izquierda ANCHA; el resto de los procesos usan la
// angosta, dejando un aire mayor entre ambas columnas — igual que el
// formato original.
const W_IZQ_ANCHA = CW * 0.546;
const W_IZQ = CW * 0.501;
const X_DER = X0 + CW * 0.554;
const W_DER = X1 - X_DER;

// ── Alturas ─────────────────────────────────────────────────────────────
const H = {
  ENCABEZADO: 28.8,
  TAGS: 5.4,          // franja de procesos, pegada abajo del título
  ORDEN_BANDA: 5.0,   // banda negra "ORDEN"
  ORDEN_NO: 11.4,
  INFO: 13.0,
  PRODUCTO: 13.6,
  ATRIBUTOS: 13.2,
};

const Y_INICIO = M;
const GAP_FILA = 1.1;   // aire vertical entre bloques de proceso

// ── Alturas por proceso ─────────────────────────────────────────────────
const ALTO_PROCESO: Partial<Record<NombreProcesoOrdenPapel, number>> = {
  hojeado_papel: 14, // antes 16.5 -- fila un poco menos alta
  impresion_papel: 33.8,
  laminacion_papel: 22.2,
  barniz_uv_papel: 11.9,
  hot_stamping_papel: 13.2,
  texturizado_papel: 13.0,
  alto_relieve_papel: 12.1,
  suaje_produccion_papel: 13.0,
  armado_papel: 15.4,
  empaque_papel: 8.9,
};
const ALTO_PROCESO_DEFAULT = 12.5;
const ALTO_ALMACEN = 17.3;

// ── Tipografía ──────────────────────────────────────────────────────────
const FS = {
  TITULO: 15,
  ORDEN: 8,
  NO: 15,
  FECHA: 11,
  ETIQUETA: 5.4,       // etiquetas chicas grises dentro de las celdas
  ETIQUETA_MINI: 4.2,  // etiquetas de la franja de procesos y almacén
  VALOR: 10,
  VALOR_GRANDE: 13,
  TEXTO: 7.5,
  SPEC: 6.2,
};

const LW = 0.22;        // grosor de línea interior
const LW_MARCO = 0.45;  // grosor del marco exterior y de los recuadros madre

const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY_DARK: [number, number, number] = [60, 60, 60];
const GRAY_LABEL: [number, number, number] = [90, 90, 90];
const GRAY_LIGHT: [number, number, number] = [245, 245, 245];

type Align = "left" | "center" | "right";

// ════════════════════════════════════════════════════════════════════════
// PRIMITIVAS DE DIBUJO
// ════════════════════════════════════════════════════════════════════════
function setBlack(doc: jsPDF) {
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

function caja(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { lw?: number; fill?: [number, number, number] } = {}
) {
  setBlack(doc);
  doc.setLineWidth(opts.lw ?? LW);
  if (opts.fill) {
    doc.setFillColor(opts.fill[0], opts.fill[1], opts.fill[2]);
    doc.rect(x, y, w, h, "FD");
  } else {
    doc.rect(x, y, w, h);
  }
}

function linea(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, lw = LW) {
  setBlack(doc);
  doc.setLineWidth(lw);
  doc.line(x1, y1, x2, y2);
}

function lineaPunteada(doc: jsPDF, x1: number, y: number, x2: number, paso = 1.2) {
  setBlack(doc);
  doc.setLineWidth(LW);
  for (let x = x1; x < x2; x += paso * 2) {
    doc.line(x, y, Math.min(x + paso, x2), y);
  }
}

interface OpcionesTexto {
  size?: number;
  bold?: boolean;
  align?: Align;
  color?: [number, number, number];
  maxW?: number;
  maxLines?: number;
}

/** Escribe texto. Con `maxW` se parte en líneas y devuelve cuántas escribió. */
function txt(doc: jsPDF, texto: string, x: number, y: number, opts: OpcionesTexto = {}): number {
  const contenido = f(texto);
  if (!contenido) return 0;

  const size = opts.size ?? FS.TEXTO;
  const color = opts.color ?? BLACK;

  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);

  if (opts.maxW) {
    const lineas = (doc.splitTextToSize(contenido, opts.maxW) as string[]).slice(
      0,
      opts.maxLines ?? 2
    );
    doc.text(lineas, x, y, { align: opts.align ?? "left" });
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    return lineas.length;
  }

  doc.text(contenido, x, y, { align: opts.align ?? "left" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  return 1;
}

/** Etiqueta chica gris en la esquina superior izquierda de una celda. */
function etiqueta(doc: jsPDF, label: string, x: number, y: number, size = FS.ETIQUETA) {
  txt(doc, label, x + 1.1, y + size * 0.35 + 1.5, { size, color: GRAY_LABEL });
}

/**
 * Celda estándar del formato: recuadro + etiqueta chica arriba a la
 * izquierda + valor grande. Es el ladrillo con el que están hechas casi
 * todas las casillas del documento.
 */
function celda(
  doc: jsPDF,
  label: string,
  valor: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    size?: number;
    align?: Align;
    bold?: boolean;
    sinBorde?: boolean;
    labelSize?: number;
    maxLines?: number;
    dy?: number;
  } = {}
) {
  if (!opts.sinBorde) caja(doc, x, y, w, h);
  const labelSize = opts.labelSize ?? FS.ETIQUETA;
  if (label) etiqueta(doc, label, x, y, labelSize);

  const size = opts.size ?? FS.VALOR;
  const align = opts.align ?? "center";
  const vx = align === "left" ? x + 1.4 : align === "right" ? x + w - 1.4 : x + w / 2;

  const lineas = (doc.setFont("helvetica", opts.bold === false ? "normal" : "bold"),
    doc.setFontSize(size),
    doc.splitTextToSize(f(valor), w - 2.6) as string[]).slice(0, opts.maxLines ?? 2);

  if (lineas.length === 0) return;

  // El valor se apoya en la parte baja de la celda, dejando el espacio de
  // arriba para la etiqueta — así se ve en el formato original.
  const alturaTexto = size * 0.352778;
  const base = y + h - 1.6 - (lineas.length - 1) * alturaTexto * 1.05 + (opts.dy ?? 0);
  txt(doc, lineas.join("\n"), vx, base, { size, bold: opts.bold !== false, align });
}

/**
 * Cabecera vertical oscura (la pestaña con el nombre del proceso). Acepta
 * varias líneas — "Pliegos / Guillotina" va en dos renglones, igual que en
 * el formato impreso. El tamaño baja solo si el texto no cabe a lo alto.
 */
function pestanaVertical(doc: jsPDF, label: string | string[], x: number, y: number, w: number, h: number) {
  const lineas = Array.isArray(label) ? label : [label];

  doc.setFillColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(LW);
  doc.rect(x, y, w, h, "FD");

  doc.setFont("helvetica", "bold");
  let size = lineas.length > 1 ? 5 : 6;
  const disponible = h - 2;
  const mayor = () => Math.max(...lineas.map((l) => doc.getStringUnitWidth(l)));
  while (size > 3 && mayor() * size * 0.352778 > disponible) size -= 0.2;
  doc.setFontSize(size);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);

  // Al rotar 90°, el ancho del texto pasa a ser su extensión vertical y el
  // interlineado se reparte a lo ancho de la pestaña.
  const paso = size * 0.352778 * 1.15;
  const x0 = x + w / 2 - ((lineas.length - 1) * paso) / 2 + size * 0.32;
  lineas.forEach((linea, i) => {
    const alto = doc.getStringUnitWidth(linea) * size * 0.352778;
    doc.text(linea, x0 + paso * i, y + h / 2 + alto / 2, { align: "left", angle: 90 });
  });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

/** Renglón "Etiqueta  valor" en una sola línea (label gris + valor bold). */
function etiquetaValor(
  doc: jsPDF,
  label: string,
  valor: string,
  x: number,
  y: number,
  w: number,
  opts: { labelSize?: number; valorSize?: number } = {}
) {
  const labelSize = opts.labelSize ?? FS.ETIQUETA;
  const valorSize = opts.valorSize ?? FS.TEXTO;
  let offset = 0;

  if (label) {
    txt(doc, label, x, y, { size: labelSize, color: GRAY_LABEL });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(labelSize);
    offset = doc.getStringUnitWidth(label) * labelSize * 0.352778 + 1.6;
  }
  txt(doc, valor, x + offset, y, { size: valorSize, bold: true, maxW: Math.max(w - offset, 3), maxLines: 1 });
}

/**
 * Dibuja una imagen dentro de una casilla si viene en los datos (data URL
 * o base64). Las dos casillas ilustradas del formato original — la foto de
 * la bobina en Hojeado y el esquema de corte en Guillotina — salen de
 * `data.img_hojeado` / `data.img_guillotina`. Si no llegan, la casilla
 * queda en blanco y el resto del bloque no se mueve.
 */
function imagenOpcional(doc: jsPDF, fuente: unknown, x: number, y: number, w: number, h: number) {
  const src = f(fuente);
  if (!src) return;
  try {
    const formato = src.includes("jpeg") || src.includes("jpg") ? "JPEG" : "PNG";
    doc.addImage(src, formato, x + 0.7, y + 0.7, w - 1.4, h - 1.4, undefined, "FAST");
  } catch {
    // Si la imagen no carga, se deja la casilla vacía a propósito.
  }
}

/** Casilla de verificación ☐ / ☒ del listado de máquinas. */
function checkbox(doc: jsPDF, marcado: boolean, x: number, y: number, lado = 2.1) {
  setBlack(doc);
  doc.setLineWidth(0.18);
  doc.rect(x, y, lado, lado);
  if (marcado) {
    doc.setLineWidth(0.35);
    doc.line(x + 0.35, y + lado / 2, x + lado * 0.42, y + lado - 0.4);
    doc.line(x + lado * 0.42, y + lado - 0.4, x + lado - 0.3, y + 0.35);
  }
}

/** Línea de firma con la barra de fecha "  /     /  " arriba. */
function lineaFirma(doc: jsPDF, x: number, y: number, w: number, opts: { anio?: string } = {}) {
  const cx = x + w / 2;
  txt(doc, "/", cx - w * 0.12, y - 1.2, { size: FS.ETIQUETA, bold: true });
  txt(doc, "/", cx + w * 0.12, y - 1.2, { size: FS.ETIQUETA, bold: true });
  if (opts.anio) txt(doc, opts.anio, x + w - 1.2, y - 1.2, { size: FS.ETIQUETA, align: "right" });
  linea(doc, x + 1.2, y, x + w - 1.2, y, 0.18);
}

// ════════════════════════════════════════════════════════════════════════
// LÓGICA DE DATOS  (se conserva íntegra del generador anterior)
// ════════════════════════════════════════════════════════════════════════

// Campo del registro de CADA proceso que representa lo que ese proceso
// entregó realmente. Sirve para encadenar: la "entrada" de un proceso es
// SIEMPRE lo "entregado" del proceso anterior, nunca un campo de entrada
// propio.
const CAMPO_ENTREGADA_POR_PROCESO: Record<NombreProcesoOrdenPapel, string> = {
  hojeado_papel: "cantidad_entregada",
  guillotina_papel: "cantidad_entregada",
  impresion_papel: "pliegos_entregados",
  laminacion_papel: "pliegos_entregados",
  barniz_uv_papel: "pliegos_entregados",
  hot_stamping_papel: "pliegos_entregados",
  texturizado_papel: "pliegos_entregados",
  alto_relieve_papel: "pliegos_entregados",
  suaje_produccion_papel: "pliegos_entregados",
  armado_papel: "bolsas_entregadas",
  empaque_papel: "bolsas_entregadas_final",
};

function obtenerCantidadEntregadaProceso(
  key: NombreProcesoOrdenPapel,
  registro: ProcesoPapelRuntime | null
): number | null {
  const reg = (registro ?? {}) as Record<string, unknown>;
  return n(reg[CAMPO_ENTREGADA_POR_PROCESO[key]]);
}

// Orden visual fijo que sigue el formato impreso.
const ORDEN_VISUAL_PROCESOS: NombreProcesoOrdenPapel[] = [
  "hojeado_papel",
  "guillotina_papel",
  "impresion_papel",
  "laminacion_papel",
  "barniz_uv_papel",
  "hot_stamping_papel",
  "texturizado_papel",
  "alto_relieve_papel",
  "suaje_produccion_papel",
  "armado_papel",
  "empaque_papel",
];

function ordenarProcesosParaVisual(procesos: ProcesoOrdenPapelPdf[]): ProcesoOrdenPapelPdf[] {
  const indice = new Map(ORDEN_VISUAL_PROCESOS.map((key, i) => [key, i]));
  return [...procesos].sort((a, b) => (indice.get(a.key) ?? 99) - (indice.get(b.key) ?? 99));
}

// Quita ".00" de medidas sin decimales reales ("12.00+7.00" → "12+7").
function sinDecimalesInnecesarios(texto: string): string {
  if (!texto) return texto;
  return texto.replace(/(\d+)\.0+(?!\d)/g, "$1");
}

function fmtCantidad(data: OrdenProduccionPapelData): string {
  const kg = n(data.kilogramos);
  const cant = n(data.cantidad);
  if (String(data.modo_cantidad ?? "").toLowerCase() === "kilo" && kg !== null) {
    return `${fmtNum(kg, 2)} kg`;
  }
  return cant !== null ? fmtNum(cant) : "";
}

// "Pliego Hojeado" no es un campo único: bobina (ancho) y hojeado (corte)
// se guardan separados y aquí se unen ("61x45").
function pliegoHojeadoTexto(data: OrdenProduccionPapelData): string {
  const bobina = primeraLinea(data.hoj_bobina, data.bobina_cm);
  const hojeado = primeraLinea(data.pliego_hojeado, data.hoj_corte, data.pliego);
  if (bobina && hojeado) return `${bobina}x${hojeado}`;
  return primeraLinea(hojeado, bobina);
}

/**
 * Fecha en el formato del documento impreso: "27 abr 2026".
 * Las fechas que llegan como "YYYY-MM-DD" se arman en hora local a
 * propósito: `new Date("2026-04-27")` las interpreta como UTC y en México
 * se veían con un día menos.
 */
function fmtFechaCorta(value: unknown): string {
  if (!value) return "";

  let date: Date;
  const texto = f(value);
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (value instanceof Date) {
    date = value;
  } else if (soloFecha) {
    date = new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]));
  } else {
    date = new Date(texto);
  }

  if (Number.isNaN(date.getTime())) return texto;
  return date
    .toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/\./g, "");
}

function valorMaquina(proceso: ProcesoOrdenPapelPdf, registro: ProcesoPapelRuntime | null): string {
  return primeraLinea(registro?.maquina, proceso.maquina);
}

/**
 * Etiqueta "Maquina" + nombre dentro de una casilla angosta (la de la foto
 * de Hojeado/Guillotina, que normalmente queda en blanco porque casi nunca
 * hay imagen cargada). La letra del nombre se va encogiendo hasta que quepa
 * en el ancho disponible, en vez de recortarse.
 */
function maquinaEnCasilla(doc: jsPDF, valor: string, x: number, y: number, w: number, h: number) {
  const texto = f(valor);
  etiqueta(doc, "Maquina", x, y);
  if (!texto) return;

  const disponible = w - 2.2;
  doc.setFont("helvetica", "bold");
  let size = 8;
  while (size > 4.5 && doc.getStringUnitWidth(texto) * size * 0.352778 > disponible) size -= 0.2;

  txt(doc, texto, x + w / 2, y + h - 2.4, {
    size, bold: true, align: "center", maxW: disponible, maxLines: 2,
  });
}

function arrTexto(value: unknown): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value).trim();
}

function tintasConPantones(cantidad: unknown, pantones: unknown): string {
  const cant = n(cantidad);
  const pant = arrTexto(pantones);
  if (cant !== null && pant) return `${fmtNum(cant)}: ${pant}`;
  if (cant !== null) return fmtNum(cant);
  return pant;
}

// Título y cifras de la columna derecha (registro de producción) por proceso.
interface DatosProceso {
  tituloEntrada: string;
  entrada: string;
  merma: string;
  entregadas: string;
}

function datosProceso(
  key: NombreProcesoOrdenPapel,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null
): DatosProceso {
  const reg = (registro ?? {}) as Record<string, any>;
  const merma = fmtNum(reg.merma);
  const anyData = data as any;

  switch (key) {
    case "hojeado_papel":
      return {
        tituloEntrada: "Cantidad hojeado",
        entrada: fmtNum(anyData.cantidad_hojeada_calculada),
        merma,
        entregadas: fmtNum(reg.cantidad_entregada),
      };
    case "guillotina_papel":
      return {
        tituloEntrada: "Cortes",
        entrada: fmtNum(anyData.pliegos_impresion_estimados),
        merma,
        entregadas: fmtNum(reg.cantidad_entregada),
      };
    case "impresion_papel":
      return { tituloEntrada: "Hojas impresas", entrada: fmtNum(reg.pliegos_entrada), merma, entregadas: fmtNum(reg.pliegos_entregados) };
    case "laminacion_papel":
      return { tituloEntrada: "Hojas Laminadas", entrada: fmtNum(reg.pliegos_entrada), merma, entregadas: fmtNum(reg.pliegos_entregados) };
    case "barniz_uv_papel":
      return { tituloEntrada: "Hojas UV", entrada: fmtNum(reg.pliegos_entrada), merma, entregadas: fmtNum(reg.pliegos_entregados) };
    case "hot_stamping_papel":
      return { tituloEntrada: "Hojas Estampadas", entrada: fmtNum(reg.pliegos_entrada), merma, entregadas: fmtNum(reg.pliegos_entregados) };
    case "texturizado_papel":
      return { tituloEntrada: "Hojas Texturizadas", entrada: fmtNum(reg.pliegos_entrada), merma, entregadas: fmtNum(reg.pliegos_entregados) };
    case "alto_relieve_papel":
      return { tituloEntrada: "Hojas Alto Relieve", entrada: fmtNum(reg.pliegos_entrada), merma, entregadas: fmtNum(reg.pliegos_entregados) };
    case "suaje_produccion_papel":
      return { tituloEntrada: "Hojas Suaje", entrada: fmtNum(reg.pliegos_entrada), merma, entregadas: fmtNum(reg.pliegos_entregados) };
    case "armado_papel":
      return { tituloEntrada: "Bolsas Armadas", entrada: fmtNum(reg.bolsas_armadas ?? reg.pliegos_entrada), merma, entregadas: fmtNum(reg.bolsas_entregadas) };
    case "empaque_papel":
      return {
        tituloEntrada: "Revison",
        entrada: fmtNum(reg.bolsas_entrada),
        merma: fmtNum(reg.revision ?? reg.merma),
        entregadas: fmtNum(reg.bolsas_entregadas_final),
      };
  }
}

// ── Render / Master Graphic: hojas extra al final del documento ─────────
type ImgDataPapel = { base64: string; format: "PNG" | "JPEG"; dataUrl: string };

async function urlToDataUrlPapel(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function dataUrlToImgDataPapel(dataUrl: string): ImgDataPapel | null {
  try {
    if (!dataUrl.startsWith("data:")) return null;
    const mime = dataUrl.split(";")[0].split(":")[1] || "image/png";
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;
    const format: "PNG" | "JPEG" = mime.includes("jpeg") || mime.includes("jpg") ? "JPEG" : "PNG";
    return { base64, format, dataUrl };
  } catch {
    return null;
  }
}

function getImageSizePapel(imgData: ImgDataPapel): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = reject;
    img.src = imgData.dataUrl;
  });
}

async function addImageContainPapel(
  doc: jsPDF, img: ImgDataPapel, x: number, y: number, maxW: number, maxH: number
): Promise<void> {
  const size = await getImageSizePapel(img);
  if (!size.width || !size.height) throw new Error("No se pudo obtener el tamaño de la imagen");
  const ratio = Math.min(maxW / size.width, maxH / size.height);
  const finalW = size.width * ratio;
  const finalH = size.height * ratio;
  doc.addImage(img.base64, img.format, x + (maxW - finalW) / 2, y + (maxH - finalH) / 2, finalW, finalH, undefined, "FAST");
}

async function dibujarPaginaImagenPapel(
  doc: jsPDF, titulo: string, subtitulo: string, dataUrlImg: string
): Promise<void> {
  doc.addPage();
  const Mi = 10;
  const cw = PW - Mi * 2;
  const ch = PH - Mi * 2;
  const hdrH = 14;

  doc.setFillColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.rect(Mi, Mi, cw, hdrH, "FD");
  txt(doc, titulo, Mi + cw / 2, Mi + hdrH / 2 + 2.5, { size: 13, bold: true, align: "center", color: WHITE });
  txt(doc, subtitulo, Mi + cw / 2, Mi + hdrH - 2.5, { size: 8, align: "center", color: WHITE });

  const pad = 4;
  const imgX = Mi + pad;
  const imgY = Mi + hdrH + pad;
  const imgW = cw - pad * 2;
  const imgH = ch - hdrH - pad * 2;
  caja(doc, imgX, imgY, imgW, imgH, { lw: 0.3 });

  try {
    const img = dataUrlToImgDataPapel(dataUrlImg);
    if (img) await addImageContainPapel(doc, img, imgX, imgY, imgW, imgH);
  } catch (e) {
    console.error(`❌ addImage ${titulo} error:`, e);
  }
}

// ════════════════════════════════════════════════════════════════════════
// ENCABEZADO
// ════════════════════════════════════════════════════════════════════════

// Catálogo completo de la franja de procesos del formato impreso. Los
// cuatro que no tienen `key` (Rev, Litolami, Desbarbe, Pegado) no son
// procesos del sistema todavía: existen en el papel y se marcan con las
// banderas opcionales indicadas en `flag`.
const TAGS_PROCESO: Array<{ label: string; key?: NombreProcesoOrdenPapel; flag?: string }> = [
  { label: "Hojeo", key: "hojeado_papel" },
  { label: "Guillo", key: "guillotina_papel" },
  { label: "Offset", key: "impresion_papel" },
  { label: "Lam", key: "laminacion_papel" },
  { label: "HS", key: "hot_stamping_papel" },
  { label: "AR", key: "alto_relieve_papel" },
  { label: "UV", key: "barniz_uv_papel" },
  { label: "Textu", key: "texturizado_papel" },
  { label: "Suaje", key: "suaje_produccion_papel" },
  { label: "Armado", key: "armado_papel" },
  { label: "Rev", flag: "revision" },
  { label: "Empaque", key: "empaque_papel" },
  { label: "Litolami", flag: "litolaminado" },
  { label: "Desbarbe", flag: "desbarbe" },
  { label: "Pegado", flag: "pegado" },
];

function franjaProcesos(
  doc: jsPDF,
  data: OrdenProduccionPapelData,
  aplican: Set<NombreProcesoOrdenPapel>,
  x: number,
  y: number,
  w: number,
  h: number
) {
  caja(doc, x, y, w, h);

  // Ancho proporcional al largo de cada etiqueta, para que "Desbarbe"
  // no quede apretado y "UV" no sobre espacio.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS.ETIQUETA_MINI);
  const pesos = TAGS_PROCESO.map((t) => Math.max(doc.getStringUnitWidth(t.label), 3.2));
  const total = pesos.reduce((a, b) => a + b, 0);

  let cx = x;
  TAGS_PROCESO.forEach((tag, i) => {
    const cw = (w * pesos[i]) / total;
    if (i > 0) linea(doc, cx, y, cx, y + h);

    const marcado = tag.key ? aplican.has(tag.key) : Boolean((data as any)[tag.flag ?? ""]);
    if (marcado) {
      txt(doc, "X", cx + cw / 2, y + h * 0.52, { size: 6, bold: true, align: "center" });
    }
    txt(doc, tag.label, cx + cw / 2, y + h - 0.9, {
      size: FS.ETIQUETA_MINI,
      align: "center",
      color: GRAY_LABEL,
    });
    cx += cw;
  });
}

/**
 * Columna Ventas / Diseño / Logistica: pegada al borde derecho, debajo del
 * cuadro ORDEN. Cada renglón es la línea de firma con la barra de fecha
 * arriba y la etiqueta chica debajo — sin recuadro, tal como el original.
 */
function columnaFirmas(doc: jsPDF, yBase: number) {
  const filas = [
    { label: "Ventas", y: yBase + H.INFO },
    { label: "Diseño", y: yBase + H.INFO + H.PRODUCTO },
    { label: "Logistica", y: yBase + H.INFO + H.PRODUCTO + H.ATRIBUTOS },
  ];
  const w = X1 - X_FIRMA_L;
  const cx = X_FIRMA_L + w / 2;

  filas.forEach(({ label, y }) => {
    txt(doc, "/", X1 - 4.2, y - 1.6, { size: FS.ETIQUETA, bold: true });
    linea(doc, X_FIRMA_L + 1.5, y, X1 - 1.5, y, 0.18);
    txt(doc, label, cx, y + 1.1, { size: FS.ETIQUETA_MINI, align: "center", color: GRAY_LABEL });
  });
}

function dibujarEncabezado(
  doc: jsPDF,
  data: OrdenProduccionPapelData,
  aplican: Set<NombreProcesoOrdenPapel>,
  logoBase64: string | null,
  y: number
) {
  // ── Logo ──────────────────────────────────────────────────────────────
  caja(doc, X0, y, X_LOGO_R - X0, H.ENCABEZADO, { lw: LW_MARCO });
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", X0 + 1.5, y + 1.5, X_LOGO_R - X0 - 3, H.ENCABEZADO - 3);
    } catch {
      txt(doc, "EB", (X0 + X_LOGO_R) / 2, y + H.ENCABEZADO / 2 + 4, { size: 24, bold: true, align: "center" });
    }
  } else {
    txt(doc, "EB", (X0 + X_LOGO_R) / 2, y + H.ENCABEZADO / 2 + 4, { size: 24, bold: true, align: "center" });
  }

  // ── Título + franja de procesos ───────────────────────────────────────
  const tituloW = X_TITULO_R - X_LOGO_R;
  caja(doc, X_LOGO_R, y, tituloW, H.ENCABEZADO, { lw: LW_MARCO });
  txt(doc, "Orden de Produccion Papel", X_LOGO_R + tituloW / 2, y + (H.ENCABEZADO - H.TAGS) / 2 + 4.5, {
    size: FS.TITULO,
    bold: true,
    align: "center",
    maxW: tituloW - 6,
    maxLines: 1,
  });
  franjaProcesos(doc, data, aplican, X_LOGO_R, y + H.ENCABEZADO - H.TAGS, tituloW, H.TAGS);

  // ── Cuadro ORDEN ──────────────────────────────────────────────────────
  const ox = X_TITULO_R;
  const ow = X1 - X_TITULO_R;
  caja(doc, ox, y, ow, H.ENCABEZADO, { lw: LW_MARCO });

  doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(LW);
  doc.rect(ox, y, ow, H.ORDEN_BANDA, "FD");
  txt(doc, "ORDEN", ox + ow / 2, y + H.ORDEN_BANDA - 1.5, {
    size: FS.ORDEN, bold: true, align: "center", color: WHITE,
  });

  const yNo = y + H.ORDEN_BANDA;
  linea(doc, ox, yNo + H.ORDEN_NO, X1, yNo + H.ORDEN_NO);
  etiqueta(doc, "No", ox, yNo);
  txt(doc, f(data.no_produccion ?? `PED-${data.no_pedido}`), ox + ow * 0.58, yNo + H.ORDEN_NO - 2.2, {
    size: FS.NO, bold: true, align: "center", maxW: ow * 0.8, maxLines: 1,
  });

  const yFecha = yNo + H.ORDEN_NO;
  const hFecha = H.ENCABEZADO - H.ORDEN_BANDA - H.ORDEN_NO;
  etiqueta(doc, "FECHA", ox, yFecha);
  txt(doc, fmtFechaCorta(data.fecha), ox + ow * 0.58, yFecha + hFecha - 2.2, {
    size: FS.FECHA, align: "center", maxW: ow * 0.8, maxLines: 1,
  });
}

// ── Fila de datos generales (Impresión / Fecha entrega / Prioridad / Pedido)
function filaInfo(doc: jsPDF, data: OrdenProduccionPapelData, y: number) {
  const w = X_FIRMA_L - X0;
  const cols: Array<[string, string, number, number]> = [
    ["Impresión", primeraLinea(data.impresion, data.cliente), 0.385, 12],
    ["Fecha Entrega", fmtFechaCorta(data.fecha_entrega ?? null), 0.311, 12],
    ["Prioridad", data.prioridad ? "URGENTE" : "Normal", 0.168, 10],
    ["Pedido", f(data.no_pedido), 0.136, 10],
  ];

  let cx = X0;
  cols.forEach(([label, valor, peso, size], i) => {
    const cw = w * peso;
    celda(doc, label, valor, cx, y, cw, H.INFO, { size, maxLines: 1 });
    if (i === 0) caja(doc, cx, y, cw, H.INFO, { lw: LW_MARCO });
    cx += cw;
  });
}

// ── Fila de producto (Producto / Cantidad / Medida / Material / Calibre) ──
function filaProducto(doc: jsPDF, data: OrdenProduccionPapelData, y: number) {
  const w = X_FIRMA_L - X0;
  const cols: Array<[string, string, number, number]> = [
    ["Producto", primeraLinea(data.nombre_producto, data.descripcion), 0.385, 12],
    ["Cantidad", fmtCantidad(data), 0.118, 12],
    ["Medida", sinDecimalesInnecesarios(f(data.medida)), 0.193, 12],
    ["Material", primeraLinea(data.material, data.grupo_descripcion), 0.168, 11],
    ["Calibre", f(data.calibre), 0.136, 11],
  ];

  let cx = X0;
  cols.forEach(([label, valor, peso, size]) => {
    const cw = w * peso;
    celda(doc, label, valor, cx, y, cw, H.PRODUCTO, { size, maxLines: 1 });
    cx += cw;
  });
}

// ── Fila de atributos de la bolsa ────────────────────────────────────────
function filaAtributos(doc: jsPDF, data: OrdenProduccionPapelData, y: number) {
  const w = X_FIRMA_L - X0;
  const attrs: Array<[string, string, number, number]> = [
    ["Ancho", sinDecimalesInnecesarios(primeraLinea(data.ancho)), 0.075, 11],
    ["Fuelle", sinDecimalesInnecesarios(primeraLinea(data.fuelle, data.fuelle_fondo)), 0.066, 11],
    ["Altura", sinDecimalesInnecesarios(primeraLinea(data.altura)), 0.066, 11],
    ["Asa", primeraLinea(data.asa_tipo, data.asa, data.asa_suaje), 0.143, 10],
    ["Color", primeraLinea(data.color_asa_nombre, data.asa_color), 0.075, 10],
    ["Tamaño", primeraLinea(data.asa_medida, data.medida_asa), 0.091, 10],
    ["Pegamento", f(data.pegamento), 0.127, 8],
    ["Tipo pegue", primeraLinea(data.tipo_pegue, data.tipo_pegado), 0.106, 9],
    ["Suaje", primeraLinea(data.numero_suaje, data.suaje_nombre, data.suaje), 0.075, 10],
    ["Rendimiento", primeraLinea(data.rendimiento, data.hoj_rendimiento), 0.176, 10],
  ];

  let cx = X0;
  attrs.forEach(([label, valor, peso, size]) => {
    const cw = w * peso;
    celda(doc, label, valor, cx, y, cw, H.ATRIBUTOS, { size, maxLines: 2 });
    cx += cw;
  });
}

// ════════════════════════════════════════════════════════════════════════
// COLUMNA DERECHA — registro de producción de cada proceso
// ════════════════════════════════════════════════════════════════════════

/** Variante compacta: 3 casillas arriba, firma + observaciones abajo. */
function registroCompacto(
  doc: jsPDF,
  datos: DatosProceso,
  registro: ProcesoPapelRuntime | null,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const topH = h * 0.56;
  const c1 = w * 0.40;
  const c2 = w * 0.20;
  const c3 = w - c1 - c2;

  celda(doc, datos.tituloEntrada, datos.entrada, x, y, c1, topH, { size: 8.5, maxLines: 1 });
  celda(doc, "Merma", datos.merma, x + c1, y, c2, topH, { size: 8.5, maxLines: 1 });
  celda(doc, "Entregadas", datos.entregadas, x + c1 + c2, y, c3, topH, { size: 8.5, maxLines: 1 });

  const by = y + topH;
  const bh = h - topH;
  const firmaW = w * 0.62;

  caja(doc, x, by, firmaW, bh);
  lineaFirma(doc, x + 1, by + bh - 1.3, firmaW - 2);

  caja(doc, x + firmaW, by, w - firmaW, bh);
  txt(doc, "Observaciones:", x + firmaW + 1.2, by + 2.6, { size: FS.ETIQUETA_MINI, color: GRAY_LABEL });
  const obs = primeraLinea(registro?.observaciones, registro?.observaciones_calidad);
  if (obs) {
    txt(doc, obs, x + firmaW + 1.2, by + 5.2, {
      size: FS.ETIQUETA_MINI, maxW: w - firmaW - 2.4, maxLines: 2,
    });
  }
}

/**
 * Variante grande (Impresión / Laminación): las cifras a la izquierda y un
 * recuadro amplio de observaciones + firma con año a la derecha.
 */
function registroGrande(
  doc: jsPDF,
  datos: DatosProceso,
  registro: ProcesoPapelRuntime | null,
  anio: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { apilado?: boolean } = {}
) {
  const obs = primeraLinea(registro?.observaciones, registro?.observaciones_calidad);

  if (opts.apilado) {
    // Impresión: tres casillas apiladas a la izquierda, observaciones a la
    // derecha ocupando todo el alto y la firma al pie.
    const izqW = w * 0.42;
    const filaH = h / 3;
    celda(doc, datos.tituloEntrada, datos.entrada, x, y, izqW, filaH, { size: 8.5, maxLines: 1 });
    celda(doc, "Merma", datos.merma, x, y + filaH, izqW, filaH, { size: 8.5, maxLines: 1 });
    celda(doc, "Entregadas", datos.entregadas, x, y + filaH * 2, izqW, filaH, { size: 8.5, maxLines: 1 });

    const derX = x + izqW;
    const derW = w - izqW;
    const obsH = h - filaH;
    caja(doc, derX, y, derW, obsH);
    txt(doc, "Observaciones:", derX + 1.4, y + 3, { size: FS.ETIQUETA, color: GRAY_LABEL });
    if (obs) txt(doc, obs, derX + 1.4, y + 6.4, { size: FS.SPEC, maxW: derW - 2.8, maxLines: 5 });

    caja(doc, derX, y + obsH, derW, h - obsH);
    lineaFirma(doc, derX + 1, y + h - 1.6, derW - 2, { anio });
    return;
  }

  // Laminación: cifras en una franja arriba y la firma en columna propia.
  const firmaW = w * 0.30;
  const datosW = w - firmaW;
  const topH = h * 0.45;
  const c1 = datosW * 0.46;
  const c2 = datosW * 0.24;

  celda(doc, datos.tituloEntrada, datos.entrada, x, y, c1, topH, { size: 8.5, maxLines: 1 });
  celda(doc, "Merma", datos.merma, x + c1, y, c2, topH, { size: 8.5, maxLines: 1 });
  celda(doc, "Entregadas", datos.entregadas, x + c1 + c2, y, datosW - c1 - c2, topH, { size: 8.5, maxLines: 1 });

  caja(doc, x, y + topH, datosW, h - topH);
  txt(doc, "Observaciones:", x + 1.4, y + topH + 3, { size: FS.ETIQUETA, color: GRAY_LABEL });
  if (obs) txt(doc, obs, x + 1.4, y + topH + 6.2, { size: FS.SPEC, maxW: datosW - 2.8, maxLines: 3 });

  const fx = x + datosW;
  caja(doc, fx, y, firmaW, h);
  lineaFirma(doc, fx + 1, y + topH - 1.4, firmaW - 2, { anio });
  txt(doc, "Firma y Fecha", fx + firmaW / 2, y + h - 1.6, {
    size: FS.ETIQUETA_MINI, align: "center", color: GRAY_LABEL,
  });
}

// ════════════════════════════════════════════════════════════════════════
// COLUMNA IZQUIERDA — ficha técnica de cada proceso
// ════════════════════════════════════════════════════════════════════════
const W_PESTANA = 6.4;

/** Fila 1: Hojeado (izquierda, ancha). */
function bloqueHojeado(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  entrada: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  pestanaVertical(doc, "Hojeado", x, y, W_PESTANA, h);
  let cx = x + W_PESTANA;

  // Foto de la bobina del formato original (opcional, ver imagenOpcional).
  // Casi nunca hay imagen cargada, así que ese espacio se aprovecha para
  // mostrar la máquina registrada.
  const imgW = w * 0.13;
  caja(doc, cx, y, imgW, h);
  imagenOpcional(doc, (data as any).img_hojeado, cx, y, imgW, h);
  maquinaEnCasilla(doc, valorMaquina(proceso, registro), cx, y, imgW, h);
  cx += imgW;

  const restante = w - W_PESTANA - imgW;
  const cols: Array<[string, string, number]> = [
    ["Bobina", `${primeraLinea(data.hoj_bobina, data.bobina_cm)} cm`, 0.16],
    ["Hojeado", `${primeraLinea(data.pliego_hojeado, data.hoj_corte, data.pliego)} cm`, 0.16],
    ["Rend", f(primeraLinea(data.hoj_rendimiento, data.rendimiento)), 0.11],
    ["Pliego Hojeado", `${pliegoHojeadoTexto(data)} cm`, 0.25],
  ];

  cols.forEach(([label, valor, peso]) => {
    const cw = restante * peso;
    celda(doc, label, valor.trim() === "cm" ? "" : valor, cx, y, cw, h, { size: 8, maxLines: 1 });
    cx += cw;
  });

  // Celda destacada: cantidad calculada arriba; abajo también se registran
  // datos (ver registro del proceso), así que "Corte Guillotina" se deja
  // como etiqueta chica en la esquina en vez de ocupar el centro completo
  // de la mitad inferior.
  const destW = X0 + w - cx;
  caja(doc, cx, y, destW, h);
  const supH = h * 0.62;
  linea(doc, cx, y + supH, cx + destW, y + supH);
  etiqueta(doc, "Cantidad hojeado", cx, y, FS.ETIQUETA_MINI);
  txt(doc, entrada, cx + destW / 2, y + supH - 1.6, { size: 12, bold: true, align: "center" });
  txt(doc, "Corte Guillotina", cx + destW - 1.5, y + h - 1.2, {
    size: FS.ETIQUETA_MINI, align: "right", color: GRAY_LABEL,
  });
}

/** Fila 1: Pliegos / Guillotina (a la derecha, en lugar del registro). */
function bloqueGuillotina(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const reg = (registro ?? {}) as Record<string, any>;
  const pestanaW = W_PESTANA * 1.35;
  pestanaVertical(doc, ["Pliegos/", "Guillotina"], x, y, pestanaW, h);
  let cx = x + pestanaW;

  // Casi nunca hay imagen cargada, así que ese espacio se aprovecha para
  // mostrar la máquina registrada.
  const imgW = w * 0.16;
  caja(doc, cx, y, imgW, h);
  imagenOpcional(doc, (data as any).img_guillotina, cx, y, imgW, h);
  maquinaEnCasilla(doc, valorMaquina(proceso, registro), cx, y, imgW, h);
  cx += imgW;

  const restante = w - pestanaW - imgW;

  // Pliego / Pliegos (dos renglones etiqueta-valor apilados).
  const c1 = restante * 0.34;
  caja(doc, cx, y, c1, h);
  etiquetaValor(doc, "Pliego", primeraLinea(data.pliego, reg.pliego), cx + 1.2, y + h * 0.36, c1 - 2.4, { valorSize: 7 });
  etiquetaValor(doc, "Pliegos", fmtNum(primeraLinea(reg.pliegos, data.pliegos_guillotina)), cx + 1.2, y + h * 0.82, c1 - 2.4, { valorSize: 8 });
  cx += c1;

  const c2 = restante * 0.13;
  // CORREGIDO: `reg.rendimiento` no existe como columna en guillotina_papel
  // (esa tabla solo guarda pliegos/cortes/merma/cantidad_entregada -- ver
  // DDL) y `data.rendimiento_guillotina` nunca se calcula en ningún lado
  // del backend, así que esta celda SIEMPRE quedaba vacía sin importar el
  // dato real en BD. El campo correcto es el genérico `data.rendimiento`
  // (confirmado por respuesta real del backend), igual que ya se usa
  // arriba para "Pliego" (`data.pliego`).
  celda(doc, "Rend", f(data.rendimiento), cx, y, c2, h, { size: 8, maxLines: 1 });
  cx += c2;

  // Recuadro con la marca de corte punteada.
  const c3 = restante * 0.17;
  caja(doc, cx, y, c3, h);
  lineaPunteada(doc, cx + 1.6, y + h / 2, cx + c3 - 1.6);
  cx += c3;

  const c4 = x + w - cx;
  caja(doc, cx, y, c4, h);
  etiquetaValor(doc, "Corte", `${primeraLinea(data.corte_guillotina, data.corte)} cm`, cx + 1.2, y + h * 0.36, c4 - 2.4, { valorSize: 7 });
  etiquetaValor(doc, "Cortes", fmtNum(reg.cortes), cx + 1.2, y + h * 0.82, c4 - 2.4, { valorSize: 8 });
}

function bloqueImpresion(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  entrada: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  pestanaVertical(doc, "Impresion", x, y, W_PESTANA, h);
  const mainX = x + W_PESTANA;
  const mainW = w - W_PESTANA;

  const topH = h * 0.55;
  const box1W = mainW * 0.35;

  // Máquina registrada para este producto (una sola, asignada al darlo de
  // alta) — se imprime directo, igual que en el resto de los procesos, en
  // vez de un listado para marcar (el producto no tiene varias para elegir).
  caja(doc, mainX, y, box1W, topH);
  etiqueta(doc, "Maquina", mainX, y);
  txt(doc, valorMaquina(proceso, registro), mainX + 1.4, y + 7.4, {
    size: 8.5, bold: true, maxW: box1W - 2.8, maxLines: 1,
  });

  // Número heredado + ficha del material.
  const box2X = mainX + box1W;
  const box2W = mainW - box1W;
  caja(doc, box2X, y, box2W, topH);
  const divY = y + topH * 0.55;
  linea(doc, box2X, divY, box2X + box2W, divY);
  if (entrada) {
    txt(doc, entrada, box2X + box2W * 0.46, divY - 1.8, { size: 14, bold: true, align: "right" });
    txt(doc, "Maquina", box2X + box2W * 0.52, divY - 1.8, { size: 8 });
  }
  const materialTexto = primeraLinea(
    data.material_impresion,
    [primeraLinea(data.material), primeraLinea(data.calibre), `${pliegoHojeadoTexto(data)} cm`]
      .filter(Boolean).join("   ")
  );
  txt(doc, materialTexto, box2X + box2W / 2, y + topH - 2.2, {
    size: 8, align: "center", maxW: box2W - 3, maxLines: 1,
  });

  // Pantones.
  const panY = y + topH;
  const panH = h - topH;
  caja(doc, mainX, panY, mainW, panH);

  const tf = n(data.tintas_frente ?? data.tintas);
  const tv = n(data.tintas_reverso ?? data.tintas_dentro ?? data.tintasDentro);
  const formatoTintas = tf !== null || tv !== null ? `${tf ?? 0}x${tv ?? 0}` : "";

  txt(doc, "Pantones", mainX + 1.6, panY + 3.4, { size: FS.ETIQUETA, color: GRAY_LABEL });
  if (formatoTintas) txt(doc, formatoTintas, mainX + 14, panY + 3.4, { size: 9, bold: true });

  const fTexto = tintasConPantones(data.tintas_frente ?? data.tintas, data.pantones_frente ?? data.pantones);
  const vTexto = tintasConPantones(
    data.tintas_reverso ?? data.tintas_dentro ?? data.tintasDentro,
    data.pantones_reverso ?? data.pantones_dentro ?? data.pantonesDentro
  );
  const soloPantones = (t: string) => t.includes(":") ? t.split(":").slice(1).join(":").trim() : t;

  let py = panY + 7.4;
  ([["F:", fTexto], ["V:", vTexto]] as Array<[string, string]>).forEach(([pre, valor]) => {
    if (!valor) return;
    txt(doc, pre, mainX + 1.6, py, { size: 7.5 });
    txt(doc, soloPantones(valor), mainX + 6, py, { size: 7.5, maxW: mainW - 7.6, maxLines: 1 });
    py += 3.6;
  });
}

function bloqueLaminacion(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  entrada: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const reg = (registro ?? {}) as Record<string, any>;
  const anyData = data as any;

  pestanaVertical(doc, "Laminacion", x, y, W_PESTANA, h);
  const mainX = x + W_PESTANA;
  const mainW = w - W_PESTANA;
  const box1W = mainW * 0.54;

  caja(doc, mainX, y, box1W, h);
  etiqueta(doc, "Maquina", mainX, y);
  txt(doc, valorMaquina(proceso, registro), mainX + 1.4, y + 7.4, {
    size: 8.5, bold: true, maxW: box1W - 2.8, maxLines: 1,
  });

  const metros = fmtNum(reg.metros ?? anyData.metros_laminacion_estimados);
  const rollos = fmtNum(reg.rollos ?? anyData.rollos_laminacion_estimados, 1);
  const desarrollo = primeraLinea(reg.desarrollo_mm, anyData.desarrollo_laminacion_mm, anyData.desarrollo_mm);
  const ctesMod = primeraLinea(reg.ctes_mod, anyData.ctes_mod_laminacion, anyData.ctes_mod);

  let sy = y + 11.4;
  if (metros) {
    txt(doc, "Metros:", mainX + 1.4, sy, { size: FS.SPEC, color: GRAY_LABEL });
    txt(doc, `${metros} mts`, mainX + 10, sy, { size: FS.SPEC, bold: true });
    if (rollos) txt(doc, `${rollos}rollos`, mainX + box1W - 2, sy, { size: FS.SPEC, align: "right" });
    sy += 3.2;
  }
  if (desarrollo) {
    etiquetaValor(doc, "Desarollo:", `${desarrollo}mm`, mainX + 1.4, sy, box1W - 3, { labelSize: FS.SPEC, valorSize: FS.SPEC });
    sy += 3.2;
  }
  if (ctesMod) {
    etiquetaValor(doc, "CTES/Mod:", f(ctesMod), mainX + 1.4, sy, box1W - 3, { labelSize: FS.SPEC, valorSize: FS.SPEC });
  }

  // Columna derecha: número arriba, acabado + bobina abajo.
  const box2X = mainX + box1W;
  const box2W = mainW - box1W;
  const supH = h * 0.45;

  caja(doc, box2X, y, box2W, supH);
  if (entrada) {
    txt(doc, entrada, box2X + box2W * 0.5, y + supH / 2 + 2, { size: 12, bold: true, align: "right" });
    txt(doc, "Pliegos", box2X + box2W * 0.56, y + supH / 2 + 2, { size: 7.5 });
  }

  caja(doc, box2X, y + supH, box2W, h - supH);
  const acabado = primeraLinea(data.laminado_acabado, data.laminado_nombre, data.laminado);
  txt(doc, acabado, box2X + box2W * 0.28, y + supH + (h - supH) / 2 + 1.4, {
    size: 11, bold: true, align: "center", maxW: box2W * 0.5, maxLines: 1,
  });
  const bobina = primeraLinea(data.hoj_bobina, data.bobina_cm, reg.bobina_cm, anyData.bobina_laminacion_cm);
  if (bobina) {
    etiquetaValor(doc, "Bobina:", `${bobina}cm`, box2X + box2W * 0.55, y + supH + (h - supH) / 2 + 1.4, box2W * 0.44, { valorSize: 9 });
  }
}

/** UV, HS, Textura, AR, Suaje: máquina + número + (opcional) dato del acabado. */
interface ExtraSimple { label: string; value: string; }

function bloqueSimple(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  registro: ProcesoPapelRuntime | null,
  entrada: string,
  extras: ExtraSimple[],
  x: number,
  y: number,
  w: number,
  h: number
) {
  pestanaVertical(doc, proceso.etiqueta, x, y, W_PESTANA, h);
  const mainX = x + W_PESTANA;
  const mainW = w - W_PESTANA;

  const conExtras = extras.length > 0;
  const box1W = mainW * (conExtras ? 0.36 : 0.45);
  const box2W = mainW * (conExtras ? 0.34 : 0.55);

  caja(doc, mainX, y, box1W, h);
  etiqueta(doc, "Maquina", mainX, y);
  txt(doc, valorMaquina(proceso, registro), mainX + 1.4, y + h - 2.4, {
    size: 8.5, bold: true, maxW: box1W - 2.8, maxLines: 1,
  });

  const box2X = mainX + box1W;
  caja(doc, box2X, y, box2W, h);
  if (entrada) {
    txt(doc, entrada, box2X + box2W * 0.52, y + h / 2 + 2, { size: 12, bold: true, align: "right" });
    txt(doc, "Pliegos", box2X + box2W * 0.58, y + h / 2 + 2, { size: 7.5 });
  }

  if (!conExtras) return;

  const box3X = box2X + box2W;
  const box3W = mainW - box1W - box2W;
  caja(doc, box3X, y, box3W, h);

  if (extras.length === 1 && !extras[0].label) {
    txt(doc, extras[0].value, box3X + box3W / 2, y + h / 2 + 1.6, {
      size: 10, bold: true, align: "center", maxW: box3W - 2.6, maxLines: 1,
    });
  } else if (extras.length === 1) {
    celda(doc, extras[0].label, extras[0].value, box3X, y, box3W, h, { size: 9.5, sinBorde: true, maxLines: 1 });
  } else {
    const filaH = h / extras.length;
    extras.forEach((extra, i) => {
      const ey = y + filaH * i;
      if (i > 0) linea(doc, box3X, ey, box3X + box3W, ey);
      etiquetaValor(doc, extra.label, extra.value, box3X + 1.4, ey + filaH / 2 + 1.2, box3W - 2.8, { valorSize: 8 });
    });
  }
}

function bloqueArmado(
  doc: jsPDF,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  entrada: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const reg = (registro ?? {}) as Record<string, any>;
  pestanaVertical(doc, "Armado", x, y, W_PESTANA, h);
  const mainX = x + W_PESTANA;
  const mainW = w - W_PESTANA;

  const maquinaW = mainW * 0.26;
  const cantW = mainW * 0.17;
  const tablaW = mainW - maquinaW - cantW;

  caja(doc, mainX, y, maquinaW, h);
  etiqueta(doc, "Maquina", mainX, y);
  txt(doc, primeraLinea((data as any).maquina_armado_pdf, registro?.maquina, "Manual"), mainX + 1.4, y + h / 2 + 3, {
    size: 10, bold: true, maxW: maquinaW - 2.8, maxLines: 1,
  });

  const cantX = mainX + maquinaW;
  celda(doc, "Pliegos", entrada, cantX, y, cantW, h / 2, { size: 9, maxLines: 1 });
  celda(doc, "Bolsas", fmtNum(reg.bolsas_armadas), cantX, y + h / 2, cantW, h / 2, { size: 9, maxLines: 1 });

  const tablaX = cantX + cantW;
  caja(doc, tablaX, y, tablaW, h);
  const filaH = h / 4;

  const asaValor = [
    primeraLinea(data.asa_tipo, data.asa, data.asa_suaje),
    primeraLinea(data.color_asa_nombre, data.asa_color),
  ].filter(Boolean).join(" ");
  const asaMedida = primeraLinea(data.asa_medida, data.medida_asa);

  const filas: Array<Array<{ label: string; value: string; peso: number }>> = [
    [{ label: "Tipo Pegado", value: primeraLinea(data.tipo_pegue, data.tipo_pegado), peso: 1 }],
    [{ label: "Pegamento", value: f(data.pegamento), peso: 1 }],
    [
      { label: "Asa", value: asaValor, peso: 0.72 },
      { label: "", value: asaMedida ? `${asaMedida}cm` : "", peso: 0.28 },
    ],
    [
      { label: "Refuerzo", value: primeraLinea(data.refuerzo, data.refuerzo_medida), peso: 0.45 },
      { label: "Base", value: primeraLinea(data.base_medida, data.base), peso: 0.55 },
    ],
  ];

  filas.forEach((fila, i) => {
    const ry = y + filaH * i;
    if (i > 0) linea(doc, tablaX, ry, tablaX + tablaW, ry);
    let sx = tablaX;
    fila.forEach((seg, si) => {
      const segW = tablaW * seg.peso;
      if (si > 0) linea(doc, sx, ry, sx, ry + filaH);
      etiquetaValor(doc, seg.label, seg.value, sx + 1.4, ry + filaH / 2 + 1.1, segW - 2.8, { valorSize: 7 });
      sx += segW;
    });
  });
}

function bloqueEmpaque(
  doc: jsPDF,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  x: number,
  y: number,
  w: number,
  h: number
) {
  pestanaVertical(doc, "Empaque", x, y, W_PESTANA, h);
  const mainX = x + W_PESTANA;
  const mainW = w - W_PESTANA;

  const box1W = mainW * 0.26;
  caja(doc, mainX, y, box1W, h);
  etiqueta(doc, "Maquina", mainX, y);
  txt(doc, primeraLinea((data as any).maquina_armado_pdf, registro?.maquina, "Manual"), mainX + 1.4, y + h - 2, {
    size: 9.5, bold: true, maxW: box1W - 2.8, maxLines: 1,
  });

  const box2X = mainX + box1W;
  const box2W = mainW - box1W;
  caja(doc, box2X, y, box2W, h);
  txt(doc, primeraLinea(data.tipo_caja, data.empaque), box2X + box2W * 0.36, y + h / 2 + 1.8, {
    size: 11, bold: true, align: "center", maxW: box2W * 0.68, maxLines: 1,
  });
  const cantidad = primeraLinea(data.cantidad_por_caja, data.pzs_caja);
  if (cantidad) {
    etiquetaValor(doc, "Cantidad", `${cantidad}pz`, box2X + box2W * 0.72, y + h / 2 + 1.6, box2W * 0.27, { valorSize: 8.5 });
  }
}

// ── Almacén ─────────────────────────────────────────────────────────────
interface TarimaDetalle { titulo?: string; medida?: string; ubicacion?: string; }

function tarimasDeData(data: OrdenProduccionPapelData): TarimaDetalle[] {
  const raw = (data as any).tarimas_detalle;
  if (Array.isArray(raw) && raw.length > 0) return raw as TarimaDetalle[];
  return [{}, {}];
}

function bloqueAlmacenIzq(doc: jsPDF, data: OrdenProduccionPapelData, x: number, y: number, w: number, h: number) {
  const anyData = data as any;
  pestanaVertical(doc, "Almacen", x, y, W_PESTANA, h);
  let cx = x + W_PESTANA;
  const restante = w - W_PESTANA;

  const c1 = restante * 0.16;
  celda(doc, "Cajas/ Bultos", f(anyData.cajas_bultos), cx, y, c1, h, { size: 9, labelSize: FS.ETIQUETA_MINI, maxLines: 1 });
  cx += c1;

  const c2 = restante * 0.09;
  celda(doc, "Tarimas", f(anyData.tarimas), cx, y, c2, h, { size: 9, labelSize: FS.ETIQUETA_MINI, maxLines: 1 });
  cx += c2;

  const c3 = restante * 0.55;
  caja(doc, cx, y, c3, h);
  etiqueta(doc, "Cajas/ Bultos X Tarima", cx, y, FS.ETIQUETA_MINI);

  const c4 = x + w - cx - c3;
  caja(doc, cx + c3, y, c4, h);
  etiqueta(doc, "Ubicacion", cx + c3, y, FS.ETIQUETA_MINI);

  const tarimas = tarimasDeData(data).slice(0, 2);
  const filaH = (h - 4.4) / Math.max(tarimas.length, 1);
  tarimas.forEach((tarima, i) => {
    const ty = y + 4.4 + filaH * i + filaH / 2 + 1;
    txt(doc, f(tarima.titulo), cx + 1.6, ty, { size: 6.4, bold: true, maxW: c3 * 0.42, maxLines: 1 });
    if (tarima.medida) {
      txt(doc, `${tarima.medida} cm`, cx + c3 * 0.48, ty, { size: 7.5, bold: true, maxW: c3 * 0.5, maxLines: 1 });
    }
    txt(doc, f(tarima.ubicacion), cx + c3 + c4 / 2, ty, { size: 7.5, bold: true, align: "center" });
  });
}

function bloqueAlmacenDer(doc: jsPDF, data: OrdenProduccionPapelData, x: number, y: number, w: number, h: number) {
  const anyData = data as any;
  const c1 = w * 0.17;
  const c2 = w * 0.19;
  const c3 = w * 0.31;
  const c4 = w - c1 - c2 - c3;

  const par = (a: unknown, b: unknown, sufijo = "kg") =>
    [a, b].map((v) => (n(v) !== null ? `${fmtNum(v)}${sufijo}` : "")).filter(Boolean);

  const dobles: Array<[string, string[]]> = [
    ["Peso", par(anyData.peso_kg, anyData.peso_kg_2)],
    ["Volumetrico", par(anyData.peso_volumetrico_kg, anyData.peso_volumetrico_kg_2)],
  ];

  let cx = x;
  dobles.forEach(([label, valores], i) => {
    const cw = i === 0 ? c1 : c2;
    caja(doc, cx, y, cw, h);
    txt(doc, label, cx + cw / 2, y + 3, { size: FS.ETIQUETA_MINI, bold: true, align: "center", color: GRAY_LABEL });
    const filaH = (h - 4.4) / 2;
    valores.forEach((valor, j) => {
      txt(doc, valor, cx + cw / 2, y + 4.4 + filaH * j + filaH / 2 + 1, {
        size: 7.5, bold: true, align: "center",
      });
    });
    cx += cw;
  });

  caja(doc, cx, y, c3, h);
  txt(doc, f(anyData.paqueteria), cx + c3 / 2, y + h / 2, {
    size: 8.5, bold: true, align: "center", maxW: c3 - 3, maxLines: 2,
  });
  cx += c3;

  caja(doc, cx, y, c4, h);
  lineaFirma(doc, cx + 1, y + h * 0.42, c4 - 2);
  txt(doc, "Observaciones:", cx + 1.4, y + h - 2, { size: FS.ETIQUETA_MINI, color: GRAY_LABEL });
}

// ════════════════════════════════════════════════════════════════════════
// GENERADOR
// ════════════════════════════════════════════════════════════════════════
export async function generarPdfOrdenProduccionPapel(
  dataEntrada: OrdenProduccionPapelData,
  guardarEnS3 = false
): Promise<void> {
  // Normaliza en cliente ANTES de validar/dibujar: rellena material_impresion,
  // asa_descripcion, refuerzo y recalcula estimados (pliegos, desarrollo,
  // metros, rollos, bolsas, bobina, ctes/mod) si el backend no los mandó.
  const data = normalizarOrdenProduccionPapelData(dataEntrada);
  validarProductoPapelParaPdf(data);

  const procesos = ordenarProcesosParaVisual(construirProcesosOrdenPapelPdf(data));
  const aplican = new Set(procesos.map((p) => p.key));
  const logoBase64 = await cargarLogoBase64(logoUrl);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const marcoHoja = () => caja(doc, X0, Y_INICIO, CW, PH - Y_INICIO - M, { lw: LW_MARCO });
  marcoHoja();

  // ── Encabezado y datos generales ──────────────────────────────────────
  let y = Y_INICIO;
  dibujarEncabezado(doc, data, aplican, logoBase64, y);
  y += H.ENCABEZADO;

  const yFirmas = y;
  filaInfo(doc, data, y);
  y += H.INFO;
  filaProducto(doc, data, y);
  y += H.PRODUCTO;
  filaAtributos(doc, data, y);
  y += H.ATRIBUTOS;

  columnaFirmas(doc, yFirmas);
  y += 1.6;

  // Año que se imprime al final de las líneas de firma con fecha.
  const anio = f(new Date(String(data.fecha ?? Date.now())).getFullYear() || "");

  // ── Fila de preparación: Hojeado (izq) + Pliegos/Guillotina (der) ─────
  const hojeado = procesos.find((p) => p.key === "hojeado_papel");
  const guillotina = procesos.find((p) => p.key === "guillotina_papel");
  const regHojeado = hojeado ? obtenerRegistroProcesoPapel(data, "hojeado_papel") : null;
  const regGuillotina = guillotina ? obtenerRegistroProcesoPapel(data, "guillotina_papel") : null;

  if (hojeado || guillotina) {
    const alto = ALTO_PROCESO.hojeado_papel ?? 16.5;
    const datosPrep = datosProceso(
      hojeado ? "hojeado_papel" : "guillotina_papel",
      data,
      hojeado ? regHojeado : regGuillotina
    );

    if (hojeado) {
      bloqueHojeado(doc, hojeado, data, regHojeado, datosPrep.entrada, X0, y, W_IZQ_ANCHA, alto);
    } else if (guillotina) {
      bloqueGuillotina(doc, guillotina, data, regGuillotina, X0, y, W_IZQ_ANCHA, alto);
    }

    if (hojeado && guillotina) {
      bloqueGuillotina(doc, guillotina, data, regGuillotina, X_DER, y, W_DER, alto);
    } else {
      registroCompacto(doc, datosPrep, hojeado ? regHojeado : regGuillotina, X_DER, y, W_DER, alto);
    }
    y += alto + GAP_FILA;
  }

  // ── Resto de los procesos ─────────────────────────────────────────────
  const rendimientoPrep = n((data as any).rendimiento) ?? n((data as any).hoj_rendimiento);

  const extrasPorProceso = (key: NombreProcesoOrdenPapel, registro: ProcesoPapelRuntime | null): ExtraSimple[] => {
    const reg = (registro ?? {}) as Record<string, any>;
    switch (key) {
      case "hot_stamping_papel":
        return [{ label: "", value: primeraLinea(data.foil_nombre, data.foil) }].filter((e) => e.value);
      case "texturizado_papel":
        return [{ label: "Textura", value: primeraLinea(data.textura_nombre, data.textura) }].filter((e) => e.value);
      case "suaje_produccion_papel": {
        const suaje = primeraLinea(data.numero_suaje, data.suaje_nombre, data.suaje, reg.suaje_idsuaje_papel);
        const matrix = primeraLinea(reg.matrix, data.matrix, (data as any).matrix_nombre);
        const extras: ExtraSimple[] = [];
        if (suaje) extras.push({ label: "Suaje", value: suaje });
        if (matrix) extras.push({ label: "Matrix", value: matrix });
        return extras;
      }
      default:
        return [];
    }
  };

  const restantes = procesos.filter(
    (p) => p.key !== "hojeado_papel" && p.key !== "guillotina_papel"
  );

  restantes.forEach((proceso) => {
    const registro = obtenerRegistroProcesoPapel(data, proceso.key);
    const datos = datosProceso(proceso.key, data, registro);
    const alto = ALTO_PROCESO[proceso.key] ?? ALTO_PROCESO_DEFAULT;

    if (y + alto > PH - M - 2) {
      doc.addPage();
      marcoHoja();
      y = Y_INICIO + 2;
    }

    // ── Entrada encadenada ──────────────────────────────────────────────
    // La entrada de ESTE proceso es SIEMPRE lo "Entregado" del proceso
    // ANTERIOR de la cadena completa (incluida la preparación).
    const indiceGlobal = procesos.findIndex((p) => p.key === proceso.key);
    let entradaNum: number | null = null;
    if (indiceGlobal > 0) {
      const anterior = procesos[indiceGlobal - 1];
      entradaNum = obtenerCantidadEntregadaProceso(anterior.key, obtenerRegistroProcesoPapel(data, anterior.key));
    }

    // Empaque es el único punto donde se necesita el resultado REAL: se
    // multiplica lo entregado por Armado por el rendimiento, en vez de
    // heredar el número tal cual como hacen los demás procesos.
    if (proceso.key === "empaque_papel" && entradaNum !== null && rendimientoPrep !== null && rendimientoPrep > 0) {
      entradaNum = redondear(entradaNum * rendimientoPrep);
    }
    const entrada = entradaNum !== null ? fmtNum(entradaNum) : "";

    switch (proceso.key) {
      case "impresion_papel":
        bloqueImpresion(doc, proceso, data, registro, entrada, X0, y, W_IZQ, alto);
        registroGrande(doc, datos, registro, anio, X_DER, y, W_DER, alto, { apilado: true });
        break;
      case "laminacion_papel":
        bloqueLaminacion(doc, proceso, data, registro, entrada, X0, y, W_IZQ, alto);
        registroGrande(doc, datos, registro, anio, X_DER, y, W_DER, alto);
        break;
      case "armado_papel":
        bloqueArmado(doc, data, registro, entrada, X0, y, W_IZQ, alto);
        registroCompacto(doc, datos, registro, X_DER, y, W_DER, alto);
        break;
      case "empaque_papel":
        bloqueEmpaque(doc, data, registro, X0, y, W_IZQ, alto);
        registroCompacto(doc, datos, registro, X_DER, y, W_DER, alto);
        break;
      default:
        bloqueSimple(doc, proceso, registro, entrada, extrasPorProceso(proceso.key, registro), X0, y, W_IZQ, alto);
        registroCompacto(doc, datos, registro, X_DER, y, W_DER, alto);
        break;
    }

    y += alto + GAP_FILA;
  });

  // ── Almacén ───────────────────────────────────────────────────────────
  if (y + ALTO_ALMACEN > PH - M - 2) {
    doc.addPage();
    marcoHoja();
    y = Y_INICIO + 2;
  }
  bloqueAlmacenIzq(doc, data, X0, y, W_IZQ_ANCHA, ALTO_ALMACEN);
  bloqueAlmacenDer(doc, data, X_DER, y, W_DER, ALTO_ALMACEN);

  // ── Hojas extra: Render Cliente / Master Graphic ──────────────────────
  const urlRenderPapel = (data as any).url_render as string | null | undefined;
  const urlMasterPapel = (data as any).url_master as string | null | undefined;
  const subTituloImg = `${f(data.no_produccion ?? `PED-${data.no_pedido}`)}  ·  Pedido ${data.no_pedido}`;

  if (urlRenderPapel) {
    const dataUrlRender = urlRenderPapel.startsWith("data:")
      ? urlRenderPapel
      : await urlToDataUrlPapel(urlRenderPapel);
    if (dataUrlRender) await dibujarPaginaImagenPapel(doc, "RENDER CLIENTE", subTituloImg, dataUrlRender);
  }

  if (urlMasterPapel) {
    const dataUrlMaster = urlMasterPapel.startsWith("data:")
      ? urlMasterPapel
      : await urlToDataUrlPapel(urlMasterPapel);
    if (dataUrlMaster) await dibujarPaginaImagenPapel(doc, "MASTER GRAPHIC", subTituloImg, dataUrlMaster);
  }

  const nombre = `OrdenProduccionPapel_${data.no_produccion ?? data.no_pedido}.pdf`;
  doc.save(nombre);

  if (guardarEnS3) {
    const blob = doc.output("blob");
    await subirPdfA3(blob, nombre, "pdfs", "ordenes-produccion");
  }
}