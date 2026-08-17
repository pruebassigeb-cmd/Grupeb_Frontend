import jsPDF from "jspdf";
import { cargarLogoBase64, parsePantones } from "../Pdfutils";
import type { MedidaKey } from "../../types/plastico/productos-plastico.types";
import logoUrl from "../../assets/logogrupeb.png";
import { subirPdfA3 } from "../../services/pdfS3.service";

export interface OrdenProduccionData {
  no_pedido: string;
  no_produccion: string | null;
  fecha: string;
  fecha_produccion: string | null;
  fecha_aprobacion_diseno: string | null;
  observaciones_diseno: string | null;
  fecha_entrega: string | null;
  prioridad?: boolean;
  cliente: string;
  empresa: string;
  telefono: string;
  correo: string;
  impresion: string | null;
  nombre_producto: string;
  descripcion: string | null;
  categoria: string;
  material: string;
  calibre: string;
  medida: string;
  altura: string;
  ancho: string;
  fuelle_fondo: string;
  fuelle_lat_iz: string;
  fuelle_lat_de: string;
  refuerzo: string;
  por_kilo: string | null;
  medidas: Record<MedidaKey, string>;
  tintas: number | null;
  caras: number | null;
  pigmentos: string | null;
  pantones: string[] | null;
  asa_suaje: string | null;
  color_asa_nombre?: string | null;
  medida_troquel?: string | null;
  observacion: string | null;
  perforacion?: boolean;
  cantidad: number | null;
  kilogramos: number | null;
  modo_cantidad: string;
  repeticion_extrusion: number | null;
  repeticion_metro: number | null;
  metros: number | null;
  ancho_bobina: number | null;
  repeticion_kidder: string | null;
  repeticion_sicosa: string | null;
  kilos: number | null;
  kilos_merma: number | null;
  pzas: number | null;
  pzas_merma: number | null;
  kilos_extruir?: number | null;
  metros_extruir?: number | null;
  ext_merma?: number | null;
  k_para_impresion?: number | null;
  metros_extruidos?: number | null;
  kilos_imprimir?: number | null;
  imp_merma?: number | null;
  kilos_impresos?: number | null;
  metros_imprimir?: number | null;
  metros_impresos?: number | null;
  imp_maquina?: string | null;
  imp_repeticion?: string | null;
  ext_observaciones?: string | null;
  imp_observaciones?: string | null;
  bol_observaciones?: string | null;
  asa_observaciones?: string | null;
  kilos_bolsear?: number | null;
  kilos_bolseados?: number | null;
  bol_merma?: number | null;
  piezas_bolseadas?: number | null;
  kilos_bolseados2?: number | null;
  bol_piezas_merma?: number | null;
  asa_kilos_recibidos?: number | null;
  asa_piezas_recibidas?: number | null;
  asa_merma?: number | null;
  asa_merma_kilos?: number | null;
  asa_merma_piezas?: number | null;
  asa_kilos_finales?: number | null;
  asa_piezas_finales?: number | null;
  asa_flexible_aplica?: boolean;
  bultos_total?: number | null;
  bultos_medidas?: string | null;
  bultos_peso?: number | string | null;
  bultos_piezas?: number | null;
  ancho_pelicula?: string | null;
  fuelle_r?: string | null;
  fuelle_f?: string | null;
  bolseo_asa?: string | null;
  metros_calculados?: number | null;
  bolsas_calculadas?: number | null;
  codigo_kliche?: string | null;
  ubicacion_kliche?: string | null;
  // ── Imágenes de diseño — vienen como data URL base64 desde el backend ──
  url_render?: string | null;
  url_master?: string | null;
}

const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY_DARK: [number, number, number] = [60, 60, 60];
const GRAY_MED: [number, number, number] = [140, 140, 140];
const RED: [number, number, number] = [200, 0, 0];

const LABEL_SIZE = 7;

const f = (v: any) =>
  v === null || v === undefined || String(v).trim() === "" ? "" : String(v).trim();

const combinarCantidades = (
  kilos?: number | null,
  piezas?: number | null,
): string => {
  const partes: string[] = [];
  if (kilos != null) partes.push(`${f(kilos)} kg`);
  if (piezas != null) partes.push(`${f(piezas)} pzas`);
  return partes.join(" / ");
};

 const soloColorPigmento = (v: any): string => {
  const texto = f(v);
  if (!texto) return "";

  // Caso normal: "Azul 2935 (AL-BC-05-20)" → nos quedamos con lo de antes del "("
  const antesDelParentesis = texto.replace(/\s*\(.*$/, "").trim();
  if (antesDelParentesis) return antesDelParentesis;

  // Caso invertido: "(AL-BC-05-20) Azul 2935" o el color quedó dentro del
  // paréntesis → extraemos el contenido interno como respaldo.
  const match = texto.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : texto;
};

const formatKilos = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calcularAnchoPeliculaYBolseo(data: OrdenProduccionData): {
  anchoPelicula: string;
  bolseo: string;
} {
  const n = (v: string | null | undefined) => {
    const parsed = parseFloat(String(v ?? "").trim());
    return isNaN(parsed) ? 0 : parsed;
  };
  const has = (v: string | null | undefined) => n(v) > 0;

  const tieneLateral = has(data.fuelle_lat_iz) || has(data.fuelle_lat_de);

  if (tieneLateral) {
    const total = n(data.ancho) + n(data.fuelle_lat_iz) + n(data.fuelle_lat_de);
    return {
      anchoPelicula: total > 0 ? String(total) : "",
      bolseo: has(data.altura) ? String(n(data.altura)) : "",
    };
  } else {
    const total = n(data.altura) + n(data.fuelle_fondo) + n(data.refuerzo);
    return {
      anchoPelicula: total > 0 ? String(total) : "",
      bolseo: has(data.ancho) ? String(n(data.ancho)) : "",
    };
  }
}

// ── El backend ya mandó la imagen como data URL base64 — solo extraemos base64 y format ──
type ImgData = {
  base64: string;
  format: "PNG" | "JPEG";
  dataUrl: string;
};

// Convierte una URL externa (S3, Cloudinary, etc.) a data URL base64
async function urlToDataUrl(url: string): Promise<string | null> {
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

function dataUrlToImgData(dataUrl: string): ImgData | null {
  try {
    if (!dataUrl.startsWith("data:")) return null;

    const mime = dataUrl.split(";")[0].split(":")[1] || "image/png";
    const base64 = dataUrl.split(",")[1];

    if (!base64) return null;

    const format: "PNG" | "JPEG" =
      mime.includes("jpeg") || mime.includes("jpg") ? "JPEG" : "PNG";

    return { base64, format, dataUrl };
  } catch {
    return null;
  }
}

// ======================================================
// OBTENER TAMAÑO REAL DE IMAGEN
// ======================================================
function getImageSize(imgData: ImgData): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };

    img.onerror = reject;
    img.src = imgData.dataUrl;
  });
}

// ======================================================
// INSERTAR IMAGEN SIN DEFORMAR
// Se comporta como object-fit: contain;
// ocupa el máximo espacio posible sin alterar proporción.
// ======================================================
async function addImageContain(
  doc: jsPDF,
  img: ImgData,
  x: number,
  y: number,
  maxW: number,
  maxH: number
): Promise<void> {
  const size = await getImageSize(img);

  if (!size.width || !size.height) {
    throw new Error("No se pudo obtener el tamaño de la imagen");
  }

  const ratio = Math.min(maxW / size.width, maxH / size.height);

  const finalW = size.width * ratio;
  const finalH = size.height * ratio;

  const finalX = x + (maxW - finalW) / 2;
  const finalY = y + (maxH - finalH) / 2;

  doc.addImage(
    img.base64,
    img.format,
    finalX,
    finalY,
    finalW,
    finalH,
    undefined,
    "FAST"
  );
}

function celdaLabel(
  doc: jsPDF,
  label: string,
  value: string,
  x: number, y: number, w: number, h: number,
  labelSize = LABEL_SIZE,
  valueSize = 15,
  bold = false,
  value2?: string
) {
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(labelSize);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text(label, x + 1.5, y + 4.5);

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  // Auto-ajuste: si el texto no cabe en el ancho de la celda con el
  // tamaño solicitado, se reduce progresivamente (mínimo 6pt) para que
  // nunca se encime con las celdas vecinas.
  const anchoDisponible = w - 3; // padding aprox. 1.5mm por lado
  const ajustarTamano = (texto: string, tamanoInicial: number) => {
    let tamano = tamanoInicial;
    doc.setFontSize(tamano);
    while (tamano > 6 && doc.getTextWidth(texto) > anchoDisponible) {
      tamano -= 0.5;
      doc.setFontSize(tamano);
    }
    return tamano;
  };

  if (value2) {
    // Dos líneas de valor dentro de la misma celda (p. ej. fecha + no. de pedido)
    const texto1 = f(value);
    const texto2 = f(value2);
    const tamanoMax = Math.min(valueSize, 8.5); // 2 líneas necesitan fuente más chica para no encimarse
    const tamano1 = ajustarTamano(texto1, tamanoMax);
    const tamano2 = ajustarTamano(texto2, tamanoMax);
    const tamanoFinal = Math.min(tamano1, tamano2);

    doc.setFontSize(tamanoFinal);
    doc.text(texto1, x + w / 2, y + h * 0.62, { align: "center" });
    doc.text(texto2, x + w / 2, y + h - 1.5, { align: "center" });
  } else {
    const texto = f(value);
    const tamanoFinal = ajustarTamano(texto, valueSize);
    doc.setFontSize(tamanoFinal);
    doc.text(texto, x + w / 2, y + h - 3, { align: "center" });
  }
}

function celdaHeader(
  doc: jsPDF,
  label: string,
  x: number, y: number, w: number, h: number,
  fontSize = 12
) {
  doc.setFillColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.rect(x, y, w, h, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text(label, x + w / 2, y + h / 2 + 2.2, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

function celdaFirma(
  doc: jsPDF,
  label: string,
  x: number, y: number, w: number, h: number
) {
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text(label, x + 1.5, y + 4.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

function lineasTruncadas(
  doc: jsPDF,
  value: unknown,
  maxWidth: number,
  maxLines: number,
): string[] {
  const texto = f(value).replace(/\s+/g, " ");
  if (!texto || maxLines <= 0) return [];

  const lineas = doc.splitTextToSize(texto, maxWidth) as string[];
  if (lineas.length <= maxLines) return lineas;

  const visibles = lineas.slice(0, maxLines);
  const ultimaPosicion = visibles.length - 1;
  const sufijo = "...";
  let ultima = visibles[ultimaPosicion].trimEnd();

  while (ultima && doc.getTextWidth(`${ultima}${sufijo}`) > maxWidth) {
    ultima = ultima.slice(0, -1).trimEnd();
  }

  visibles[ultimaPosicion] = ultima ? `${ultima}${sufijo}` : sufijo;
  return visibles;
}

function celdaTextoAcotado(
  doc: jsPDF,
  label: string,
  value: unknown,
  x: number, y: number, w: number, h: number,
  valueSize = 7,
  maxLines = 2,
) {
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text(label, x + 1.5, y + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(valueSize);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  const lineas = lineasTruncadas(doc, value, Math.max(w - 3, 1), maxLines);
  if (lineas.length > 0) {
    doc.text(lineas, x + w / 2, y + 8, {
      align: "center",
      lineHeightFactor: 1.05,
    });
  }
}

function celdaObservacion(
  doc: jsPDF,
  value: unknown,
  x: number, y: number, w: number, h: number,
) {
  const valueSize = 6.5;
  const lineHeightMm = valueSize * 0.3528 * 1.05;
  const maxLines = Math.max(1, Math.floor((h - 7) / lineHeightMm));
  celdaTextoAcotado(doc, "Observacion", value, x, y, w, h, valueSize, maxLines);
}

function bloqueOperativo(
  doc: jsPDF,
  titulo: string,
  f1c1Label: string, f1c1Val: string,
  f1c2Label: string, f1c2Val: string,
  f1c3Label: string, f1c3Val: string,
  f1c4Label: string, f1c4Val: string,
  f2c1Label: string, f2c1Val: string,
  x: number, y: number, w: number, h: number,
  observacion?: string | null,
) {
  const labelH = 6;
  const bodyH = h - labelH;
  const filaH = bodyH / 2;
  const colW = w / 4;

  celdaHeader(doc, titulo, x, y, w, labelH, 9);
  const dataY = y + labelH;

  celdaLabel(doc, f1c1Label, f1c1Val, x, dataY, colW, filaH, LABEL_SIZE, 11, !!f1c1Val);
  celdaLabel(doc, f1c2Label, f1c2Val, x + colW, dataY, colW, filaH, LABEL_SIZE, 11, !!f1c2Val);
  celdaLabel(doc, f1c3Label, f1c3Val, x + colW * 2, dataY, colW, filaH, LABEL_SIZE, 11, !!f1c3Val);
  celdaLabel(doc, f1c4Label, f1c4Val, x + colW * 3, dataY, colW, filaH, LABEL_SIZE, 11, !!f1c4Val);

  const firmaY = dataY + filaH;
  celdaLabel(doc, f2c1Label, f2c1Val, x, firmaY, colW, filaH, LABEL_SIZE, 11, !!f2c1Val);

  celdaObservacion(doc, observacion, x + colW, firmaY, colW, filaH);

  celdaFirma(doc, "Aut. Calidad", x + colW * 2, firmaY, colW, filaH);
  celdaFirma(doc, "Firma Encargado", x + colW * 3, firmaY, colW, filaH);
}

function bloqueBolseo(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  kilosBolsear?: number | null,
  mermaKilos?: number | null,
  mermaPiezas?: number | null,
  kilosBolseados?: number | null,
  piezasBolseadas?: number | null,
  observacion?: string | null,
) {
  const n = (v?: number | null) => v != null ? String(v) : "";
  const b = (v?: number | null) => v != null;
  const merma = combinarCantidades(mermaKilos, mermaPiezas);

  const labelH = 6;
  const bodyH = h - labelH;
  const filaH = bodyH / 2;
  const colW = w / 4;

  celdaHeader(doc, "BOLSEO", x, y, w, labelH, 9);
  const dataY = y + labelH;

  celdaLabel(doc, "Kilos a Bolsear", n(kilosBolsear), x, dataY, colW, filaH, LABEL_SIZE, 11, b(kilosBolsear));
  celdaLabel(doc, "Merma", merma, x + colW, dataY, colW, filaH, LABEL_SIZE, 9, !!merma);
  celdaLabel(doc, "Kilos Bolseados", n(kilosBolseados), x + colW * 2, dataY, colW, filaH, LABEL_SIZE, 11, b(kilosBolseados));
  celdaLabel(doc, "Piezas Bolseadas", n(piezasBolseadas), x + colW * 3, dataY, colW, filaH, LABEL_SIZE, 11, b(piezasBolseadas));

  const firmaY = dataY + filaH;
  const obsW = colW * 2;

  celdaObservacion(doc, observacion, x, firmaY, obsW, filaH);

  celdaFirma(doc, "Aut. Calidad", x + obsW, firmaY, colW, filaH);
  celdaFirma(doc, "Firma Encargado", x + obsW + colW, firmaY, colW, filaH);
}

// Solo se llama cuando el producto de verdad lleva asa flexible (ver
// asaFlexibleAplica en el llamador) — si no aplica, el llamador ni siquiera
// dibuja este bloque, así que aquí no hay que contemplar el caso contrario.
function bloqueAsaFlexible(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  datos: {
    kilosRecibidos?: number | null;
    piezasRecibidas?: number | null;
    mermaKilos?: number | null;
    mermaPiezas?: number | null;
    kilosFinales?: number | null;
    piezasFinales?: number | null;
    observacion?: string | null;
  },
) {
  const valor = (v?: number | null) => v != null ? String(v) : "";
  const merma = combinarCantidades(datos.mermaKilos, datos.mermaPiezas);
  bloqueOperativo(
    doc, "ASA FLEXIBLE",
    "Kilos", valor(datos.kilosRecibidos),
    "Piezas", valor(datos.piezasRecibidas),
    "Merma", merma,
    "Kilos Finales", valor(datos.kilosFinales),
    "Piezas Finales", valor(datos.piezasFinales),
    x, y, w, h,
    datos.observacion,
  );
}

function bloqueBultosAlmacen(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  total?: number | null,
  medidas?: string | null,
  peso?: number | string | null,
  piezas?: number | null,
) {
  const labelH = 5;
  const bultosW = w / 2;
  const almW = w - bultosW;
  const almX = x + bultosW;

  celdaHeader(doc, "BULTOS", x, y, bultosW, labelH, 9);
  const bultosDataY = y + labelH;
  const bultosDataH = h - labelH;

  const colW3 = bultosW / 3;
  const pesoTexto = f(peso);
  const pesoConUnidad = pesoTexto && !/[a-z]/i.test(pesoTexto)
    ? `${pesoTexto} kg`
    : pesoTexto;
  celdaTextoAcotado(doc, "Bultos", total, x, bultosDataY, colW3, bultosDataH, 10, 2);
  celdaTextoAcotado(doc, "Medidas", medidas, x + colW3, bultosDataY, colW3, bultosDataH, 7, 4);
  celdaTextoAcotado(doc, "Peso", pesoConUnidad, x + colW3 * 2, bultosDataY, colW3, bultosDataH, 6.5, 4);

  celdaHeader(doc, "ALMACEN", almX, y, almW, labelH, 9);
  const almDataY = y + labelH;
  const almDataH = h - labelH;
  const almRowH = almDataH / 3;
  const almCol1W = almW / 2;
  const almCol2W = almW - almCol1W;

  celdaLabel(doc, "Piezas Recibidas", f(piezas), almX, almDataY, almCol1W, almRowH, LABEL_SIZE, 11, piezas != null);
  celdaLabel(doc, "Ubicacion", "", almX + almCol1W, almDataY, almCol2W, almRowH, LABEL_SIZE, 11, false);

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(almX, almDataY + almRowH, almW, almRowH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observaciones", almX + 1.5, almDataY + almRowH + 4.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  celdaFirma(doc, "Firma Calidad", almX, almDataY + almRowH * 2, almCol1W, almRowH);
  celdaFirma(doc, "Firma Almacen", almX + almCol1W, almDataY + almRowH * 2, almCol2W, almRowH);
}

function formatFecha(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function construirRepeticionStr(data: OrdenProduccionData): string {
  const partes: string[] = [];
  if (data.repeticion_kidder) partes.push(`KIDDER: ${data.repeticion_kidder}`);
  if (data.repeticion_sicosa) partes.push(`SICOSA: ${data.repeticion_sicosa}`);
  return partes.join("\n");
}

export async function generarPdfOrdenProduccion(
  data: OrdenProduccionData,
  guardarEnS3 = false,
): Promise<void> {
  // Ya no existe una variante "en blanco": el PDF siempre se llena con los
  // datos reales registrados en planta. Al inicio de la producción esos
  // campos vienen vacíos de por sí (nada se ha registrado todavía), así que
  // el mismo documento se ve "en blanco" al arrancar y se va llenando solo
  // conforme avanza — sin necesidad de generar un artefacto aparte.
  const datosRuntime = data;
  const logoBase64 = await cargarLogoBase64(logoUrl);
  const repeticionStr = construirRepeticionStr(data);
  const pantStr = parsePantones(data.pantones);

  console.log("🔍 url_render primeros 50 chars:", data.url_render?.substring(0, 50));
  console.log("🔍 url_master primeros 50 chars:", data.url_master?.substring(0, 50));

  // ── Las imágenes llegan como data URL base64 desde el backend ──
  let renderImg: ImgData | null = null;
let masterImg: ImgData | null = null;
if (data.url_render) {
  const dataUrl = data.url_render.startsWith("data:")
    ? data.url_render
    : await urlToDataUrl(data.url_render);
  renderImg = dataUrl ? dataUrlToImgData(dataUrl) : null;
}

if (data.url_master) {
  const dataUrl = data.url_master.startsWith("data:")
    ? data.url_master
    : await urlToDataUrl(data.url_master);
  masterImg = dataUrl ? dataUrlToImgData(dataUrl) : null;
}

console.log("🖼️ renderImg:", renderImg ? `OK (${renderImg.format})` : "null");
console.log("🎨 masterImg:", masterImg ? `OK (${masterImg.format})` : "null");

  //console.log("🖼️ renderImg:", renderImg ? `OK (${renderImg.format})` : "null");
  //console.log("🎨 masterImg:", masterImg ? `OK (${masterImg.format})` : "null");

  const { anchoPelicula, bolseo: bolseoCalculado } = calcularAnchoPeliculaYBolseo(data);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const PW = 210;
  const PH = 297;
  const M = 8;
  const CW = PW - M * 2;
  let y = M;

  // ── FILA 1 — Logo | Título | ORDEN No. + FECHA ──
  const logoW = 36;
  const ordenW = 52;
  const titleW = CW - logoW - ordenW;
  const fila2H = 25;

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.3);
  doc.rect(M, y, logoW, fila2H);
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", M + 1, y + 1, logoW - 2, fila2H - 2); }
    catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(25);
      doc.text("EB", M + logoW / 2, y + fila2H / 2 + 3, { align: "center" });
    }
  }

  const titleX = M + logoW;
  doc.rect(titleX, y, titleW, fila2H);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text("Orden de Producción de Plástico", titleX + titleW / 2, y + fila2H / 2 + 3, { align: "center" });

  const ordenX = M + logoW + titleW;
  doc.rect(ordenX, y, ordenW, fila2H);
  doc.setFillColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.rect(ordenX, y, ordenW, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text("ORDEN", ordenX + ordenW / 2, y + 4.5, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("No", ordenX + 2, y + 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text(f(data.no_produccion ?? `PED-${data.no_pedido}`), ordenX + ordenW / 2, y + 14, { align: "center" });
  doc.setDrawColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.setLineWidth(0.2);
  doc.line(ordenX, y + 16, ordenX + ordenW, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("FECHA", ordenX + 2, y + 20);
  doc.setFontSize(13);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text(formatFecha(data.fecha_produccion), ordenX + ordenW / 2, y + 23.5, { align: "center" });
  y += fila2H;

  // ── FILA 2 — Impresión | Fecha Entrega | Prioridad | Pedido ──
  const fila3H = 13;
  const impW = CW * 0.36;
  const entW = CW * 0.28;
  const priW = CW * 0.18;
  const pedW = CW - impW - entW - priW;

  celdaLabel(doc, "Impresión", f(data.impresion ?? data.cliente), M, y, impW, fila3H, LABEL_SIZE, 13);
  celdaLabel(doc, "Fecha Entrega", formatFecha(data.fecha_entrega), M + impW, y, entW, fila3H, LABEL_SIZE, 13);

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(M + impW + entW, y, priW, fila3H);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Prioridad", M + impW + entW + 1.5, y + 4.5);
  doc.setFont("helvetica", data.prioridad ? "bold" : "normal");
  doc.setFontSize(13);
  doc.setTextColor(
    data.prioridad ? RED[0] : BLACK[0],
    data.prioridad ? RED[1] : BLACK[1],
    data.prioridad ? RED[2] : BLACK[2]
  );
  doc.text(data.prioridad ? "URGENTE" : "Normal", M + impW + entW + priW / 2, y + fila3H - 3, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  celdaLabel(doc, "Pedido", formatFecha(data.fecha),
    M + impW + entW + priW, y, pedW, fila3H, LABEL_SIZE, 11, true,
    data.no_pedido ? data.no_pedido.trim() : "—");
  y += fila3H;

  // ── FILA 3 — Producto | Cantidad | Medida | Kilos/mts/Bolsas ──
  const fila4H = 14;
  const prodW4 = CW * 0.34;
  const cant4W = CW * 0.13;
  const med4W = CW * 0.38;
  const kilos4W = CW - prodW4 - cant4W - med4W;

  const cantDisplay = data.modo_cantidad === "kilo" && data.kilogramos
    ? `${data.kilogramos} kg`
    : data.cantidad ? data.cantidad.toLocaleString("es-MX") : "";

// Por esto:
doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
doc.setLineWidth(0.2);
doc.rect(M, y, prodW4, fila4H);
doc.setFont("helvetica", "normal");
doc.setFontSize(LABEL_SIZE);
doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
doc.text("Producto", M + 1.5, y + 4.5);
doc.setFont("helvetica", "normal");
doc.setFontSize(13);
doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
const productoNombre = f(data.nombre_producto);
const productoDesc = f(data.descripcion ?? "");
if (productoDesc) {
  // Nombre centrado un poco más arriba, descripción debajo en gris pequeño
  doc.text(productoNombre, M + prodW4 / 2, y + fila4H - 6, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.text(productoDesc, M + prodW4 / 2, y + fila4H - 1.5, { align: "center" });
} else {
  doc.text(productoNombre, M + prodW4 / 2, y + fila4H - 3, { align: "center" });
}
doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);  celdaLabel(doc, "Cantidad", cantDisplay, M + prodW4, y, cant4W, fila4H, LABEL_SIZE, 15, true);
  celdaLabel(doc, "Medida", f(data.medida), M + prodW4 + cant4W, y, med4W, fila4H, LABEL_SIZE, 13);

  const kilos4X = M + prodW4 + cant4W + med4W;
  const kilosTotH = fila4H * 2;
  const secH = kilosTotH / 3;

  const kilosVal = data.kilos_merma != null
    ? formatKilos(Number(data.kilos_merma))
    : data.kilogramos != null
      ? formatKilos(Number(data.kilogramos))
      : data.kilos != null
        ? formatKilos(Number(data.kilos))
        : "";

  const mtsVal = data.metros_extruir != null
    ? Number(data.metros_extruir).toLocaleString("es-MX")
    : data.metros_calculados != null
      ? data.metros_calculados.toLocaleString("es-MX")
      : data.metros != null
        ? data.metros.toLocaleString("es-MX")
        : "";

  const bolsasVal = data.pzas_merma != null
    ? Number(data.pzas_merma).toLocaleString("es-MX")
    : data.bolsas_calculadas != null
      ? data.bolsas_calculadas.toLocaleString("es-MX")
      : data.pzas != null
        ? data.pzas.toLocaleString("es-MX")
        : "";

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(kilos4X, y, kilos4W, secH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Kilos", kilos4X + 1.5, y + 3);
  if (kilosVal) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(kilosVal, kilos4X + kilos4W / 2, y + secH - 1.5, { align: "center" });
  }

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.rect(kilos4X, y + secH, kilos4W, secH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("mts", kilos4X + 1.5, y + secH + 3);
  if (mtsVal) {
    doc.setFont("helvetica");
    doc.setFontSize(15);
    doc.setTextColor(0, 0, 0);
    doc.text(mtsVal, kilos4X + kilos4W / 2, y + secH * 2 - 1.5, { align: "center" });
  }

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.rect(kilos4X, y + secH * 2, kilos4W, secH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Bolsas", kilos4X + 1.5, y + secH * 2 + 3);
  if (bolsasVal) {
    doc.setFont("helvetica");
    doc.setFontSize(15);
    doc.setTextColor(0, 0, 0);
    doc.text(bolsasVal, kilos4X + kilos4W / 2, y + secH * 3 - 1.5, { align: "center" });
  }
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  y += fila4H;

  // ── FILA 4 — Medidas / Material / Calibre / Pigmento / Caras ──
  const fila5H = 14;
  const medidasW = CW - kilos4W;
 
  const cols5 = [
    { label: "Ancho Pel.", value: anchoPelicula, w: medidasW * 0.09 },
    { label: "Altura", value: f(data.altura), w: medidasW * 0.08 },
    { label: "Fuelle R", value: f(data.refuerzo), w: medidasW * 0.09 },
    { label: "Fuelle F", value: f(data.fuelle_fondo), w: medidasW * 0.08 },
    { label: "Ancho", value: f(data.ancho), w: medidasW * 0.09 },
    { label: "Fuelle Lat", value: f(data.fuelle_lat_iz), w: medidasW * 0.09 },
    { label: "Fuelle Lat", value: f(data.fuelle_lat_de), w: medidasW * 0.09 },
    { label: "Material", value: f(data.material), w: medidasW * 0.17 },
    { label: "Calibre", value: f(data.calibre), w: medidasW * 0.08 },
{ label: "Pigmento", value: soloColorPigmento(data.pigmentos), w: medidasW * 0.08 },    {
      label: "Caras", value: f(data.caras),
      w: medidasW - medidasW * (0.09 + 0.08 + 0.09 + 0.08 + 0.09 + 0.09 + 0.09 + 0.17 + 0.08 + 0.08)
    },
  ];

  let cx5 = M;
  cols5.forEach(col => {
    celdaLabel(doc, col.label, col.value, cx5, y, col.w, fila5H, LABEL_SIZE, 11, false);
    cx5 += col.w;
  });
  y += fila5H;

  // ── FILA 5 — Repetición | Código Kliche | Ubicación | Pantones ──
  const fila6H = 16;
  const repW6 = CW * 0.35;
  const codK6W = CW * 0.075;
  const ubic6W = CW * 0.075;
  const pan6W = CW - repW6 - codK6W - ubic6W;

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(M, y, repW6, fila6H);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Repetición de Impresión", M + 1.5, y + 4.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  if (repeticionStr) {
    doc.setFontSize(9);
    doc.text(repeticionStr, M + 2, y + 8.5, { maxWidth: repW6 - 3 });
  }

  celdaLabel(doc, "Cod. Kliche", f(data.codigo_kliche), M + repW6, y, codK6W, fila6H, LABEL_SIZE, 12);
  celdaLabel(doc, "Ubicación", f(data.ubicacion_kliche ?? ""), M + repW6 + codK6W, y, ubic6W, fila6H, LABEL_SIZE, 12);
  celdaLabel(doc, "Pantones", pantStr !== "—" ? pantStr : "", M + repW6 + codK6W + ubic6W, y, pan6W, fila6H, LABEL_SIZE, 12);
  y += fila6H;

  // ── FILA 6 — Asa/Suaje | Bolseo | Observaciones ──
  const fila7H = 14;
  const asa7W = CW * 0.22;
  const bol7W = CW * 0.12;
  const perf7W = CW * 0.10;
  const obs7W = CW - asa7W - bol7W - perf7W;

  const esTroquel = (data.asa_suaje || "").toLowerCase().includes("troquel") ||
    (data.nombre_producto || "").toLowerCase().includes("troquel");
  const esAsaFlex = (data.nombre_producto || "").toLowerCase().includes("asa flexible");
  let asaTexto = f(data.asa_suaje);
  if (esAsaFlex && data.color_asa_nombre) {
    asaTexto = `${asaTexto} ${data.color_asa_nombre}`;
  } else if (esTroquel && data.medida_troquel) {
    asaTexto = `${asaTexto} ${data.medida_troquel}`;
  }

  celdaLabel(doc, "Asa / Troquel", asaTexto, M, y, asa7W, fila7H, LABEL_SIZE, 13);
  celdaLabel(doc, "Bolseo", bolseoCalculado || f(data.bolseo_asa), M + asa7W, y, bol7W, fila7H, LABEL_SIZE, 13);
  celdaLabel(doc, "Perf.", data.perforacion ? "SI" : "-", M + asa7W + bol7W, y, perf7W, fila7H, LABEL_SIZE, 13);

  doc.rect(M + asa7W + bol7W + perf7W, y, obs7W, fila7H);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observaciones", M + asa7W + bol7W + perf7W + 1.5, y + 4.5);
  if (data.observacion) {
    doc.setFontSize(9.5);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(data.observacion, M + asa7W + bol7W + perf7W + 2, y + 9.5, { maxWidth: obs7W - 3 });
  }
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  y += fila7H;

  // ══════════════════════════════════════════════════════════
  // BLOQUES OPERATIVOS + COLUMNA DERECHA
  // ══════════════════════════════════════════════════════════
  const colIzqW = CW * 0.62;
  const colDerW = CW - colIzqW;
  const colDerX = M + colIzqW;
  const bloqueY = y;

  const asaTieneDatos = !!datosRuntime && [
    datosRuntime.asa_kilos_recibidos,
    datosRuntime.asa_piezas_recibidas,
    datosRuntime.asa_merma_kilos,
    datosRuntime.asa_merma_piezas,
    datosRuntime.asa_merma,
    datosRuntime.asa_kilos_finales,
    datosRuntime.asa_piezas_finales,
    datosRuntime.asa_observaciones,
  ].some((value) => f(value) !== "");
  const asaFlexibleAplica = !!datosRuntime &&
    (datosRuntime.asa_flexible_aplica ?? asaTieneDatos);

  const espacioTotal = (PH - M - y) * 0.90;
  const bultosRatio = 0.22;
  const bultosH = espacioTotal * bultosRatio;
  // Extrusión, Impresión y Bolseo siempre van. Asa Flexible solo la lleva
  // el producto cuyo tipo la incluye (asaFlexibleAplica) — si no aplica, no
  // se dibuja ningún bloque en su lugar, y las 3 filas restantes se reparten
  // el espacio que le hubiera tocado para no dejar un hueco en blanco.
  const cantidadBloques = asaFlexibleAplica ? 4 : 3;
  const bloqueH = (espacioTotal - bultosH) / cantidadBloques;

  const valorRuntime = (value: number | string | null | undefined) =>
    value != null ? String(value) : "";
  const detallesImpresion = [
    datosRuntime?.imp_maquina ? String(datosRuntime.imp_maquina).toUpperCase() : "",
    datosRuntime?.imp_repeticion ? `REP. ${datosRuntime.imp_repeticion}` : "",
  ].filter(Boolean);
  const tituloImpresion = detallesImpresion.length > 0
    ? `IMPRESIÓN - ${detallesImpresion.join(" | ")}`
    : "IMPRESIÓN";

  bloqueOperativo(
    doc, "EXTRUSIÓN",
    "Kilos a Extruir", valorRuntime(datosRuntime?.kilos_extruir),
    "Metros a Extruir", valorRuntime(datosRuntime?.metros_extruir),
    "Merma", valorRuntime(datosRuntime?.ext_merma),
    "Kilos p/ Impresión", valorRuntime(datosRuntime?.k_para_impresion),
    "Metros p/ Impresión", valorRuntime(datosRuntime?.metros_extruidos),
    M, y, colIzqW, bloqueH,
    datosRuntime?.ext_observaciones,
  ); y += bloqueH;

  bloqueOperativo(
    doc, tituloImpresion,
    "Kilos a Imprimir", valorRuntime(datosRuntime?.kilos_imprimir),
    "Metros a Imprimir", valorRuntime(datosRuntime?.metros_imprimir),
    "Merma", valorRuntime(datosRuntime?.imp_merma),
    "Kilos p/ Bolseo", valorRuntime(datosRuntime?.kilos_impresos),
    "Metros p/ Bolseo", valorRuntime(datosRuntime?.metros_impresos),
    M, y, colIzqW, bloqueH,
    datosRuntime?.imp_observaciones,
  ); y += bloqueH;

  bloqueBolseo(
    doc,
    M, y, colIzqW, bloqueH,
    datosRuntime?.kilos_bolsear,
    datosRuntime?.bol_merma,
    datosRuntime?.bol_piezas_merma,
    datosRuntime?.kilos_bolseados ?? datosRuntime?.kilos_bolseados2,
    datosRuntime?.piezas_bolseadas,
    datosRuntime?.bol_observaciones,
  ); y += bloqueH;

  if (asaFlexibleAplica) {
    bloqueAsaFlexible(doc, M, y, colIzqW, bloqueH, {
      kilosRecibidos: datosRuntime?.asa_kilos_recibidos,
      piezasRecibidas: datosRuntime?.asa_piezas_recibidas,
      mermaKilos: datosRuntime?.asa_merma_kilos,
      mermaPiezas: datosRuntime?.asa_merma_piezas ?? datosRuntime?.asa_merma,
      kilosFinales: datosRuntime?.asa_kilos_finales,
      piezasFinales: datosRuntime?.asa_piezas_finales,
      observacion: datosRuntime?.asa_observaciones,
    });
    y += bloqueH;
  }

  bloqueBultosAlmacen(
    doc, M, y, colIzqW, bultosH,
    datosRuntime?.bultos_total,
    datosRuntime?.bultos_medidas,
    datosRuntime?.bultos_peso,
    datosRuntime?.bultos_piezas,
  );

  // ── COLUMNA DERECHA ──
  const autDisenoH = bloqueH;
  const renderH = espacioTotal - autDisenoH;
  const labelDerH = 6;

  // Autorización de diseño
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(colDerX, bloqueY, colDerW, autDisenoH);
  celdaHeader(doc, "AUTORIZACIÓN DE DISEÑO", colDerX, bloqueY, colDerW, labelDerH, 9);

  const adBodyY = bloqueY + labelDerH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Fecha aprobación:", colDerX + 3, adBodyY + 7);
  const fechaAprobStr = formatFecha(data.fecha_aprobacion_diseno) || "—";
  const labelFechaW = doc.getTextWidth("Fecha aprobación: ");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text(fechaAprobStr, colDerX + 3 + labelFechaW, adBodyY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observaciones:", colDerX + 3, adBodyY + 14);
  if (data.observaciones_diseno) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(LABEL_SIZE);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(data.observaciones_diseno, colDerX + 3, adBodyY + 20, { maxWidth: colDerW - 6 });
  }
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.text("Autorizó Diseño", colDerX + colDerW / 2, bloqueY + autDisenoH - 2, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  // ── Render Cliente ──
  const renderY = bloqueY + autDisenoH;
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(colDerX, renderY, colDerW, renderH);
  celdaHeader(doc, "Render Cliente", colDerX, renderY, colDerW, labelDerH, 9);

  if (renderImg) {
    const imgPad = 2;
    const imgX = colDerX + imgPad;
    const imgY = renderY + labelDerH + imgPad;
    const imgW = colDerW - imgPad * 2;
    const imgH = renderH - labelDerH - imgPad * 2;
    try {
      await addImageContain(doc, renderImg, imgX, imgY, imgW, imgH);
    } catch (e) {
      console.error("❌ addImage render error:", e);
    }
  }

  // ══════════════════════════════════════════════════════════
  // HOJA 2 — Master Graphic (solo si existe)
  // ══════════════════════════════════════════════════════════
  if (masterImg) {
    doc.addPage();

    const mM = 10;
    const mCW = PW - mM * 2;
    const mCH = PH - mM * 2;

    const hdrH = 14;
    doc.setFillColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
    doc.rect(mM, mM, mCW, hdrH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.text("MASTER GRAPHIC", mM + mCW / 2, mM + hdrH / 2 + 2.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const subTxt = `${f(data.no_produccion ?? `PED-${data.no_pedido}`)}  ·  Pedido ${data.no_pedido}  ·  ${f(data.nombre_producto)}`;
    doc.text(subTxt, mM + mCW / 2, mM + hdrH - 2.5, { align: "center" });
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

    const masterPad = 4;
    const masterX = mM + masterPad;
    const masterY = mM + hdrH + masterPad;
    const masterW = mCW - masterPad * 2;
    const masterH = mCH - hdrH - masterPad * 2;

    doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.setLineWidth(0.3);
    doc.rect(masterX, masterY, masterW, masterH);

    try {
      const masterSize = await getImageSize(masterImg);
      const isLandscape = masterSize.width > masterSize.height;

      if (isLandscape) {
        // Rotar 90° para que quede "parada" en la hoja portrait
        const canvas = document.createElement("canvas");
        canvas.width = masterSize.height;
        canvas.height = masterSize.width;
        const ctx = canvas.getContext("2d")!;
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = masterImg!.dataUrl;
        });
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -masterSize.width / 2, -masterSize.height / 2);

        const rotatedDataUrl = canvas.toDataURL("image/png");
        const rotatedImg = dataUrlToImgData(rotatedDataUrl);
        if (rotatedImg) {
          await addImageContain(doc, rotatedImg, masterX, masterY, masterW, masterH);
        }
      } else {
        await addImageContain(doc, masterImg, masterX, masterY, masterW, masterH);
      }
    } catch (e) {
      console.error("❌ addImage master error:", e);
      // ... tu manejo de error existente
    }
  }

  const nombre = `OrdenProduccion_${data.no_produccion ?? data.no_pedido}_Produccion.pdf`;
doc.save(nombre);
if (guardarEnS3) {
  const blob = doc.output("blob");
  await subirPdfA3(blob, nombre, "pdfs", "ordenes-produccion");
}
}