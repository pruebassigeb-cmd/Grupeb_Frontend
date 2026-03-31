import jsPDF from "jspdf";
import { cargarLogoBase64, parsePantones } from "./Pdfutils";
import type { MedidaKey } from "../types/productos-plastico.types";
import logoUrl from "../assets/logogrupeb.png";

export interface OrdenProduccionData {
  no_pedido:        string;
  no_produccion:    string | null;
  fecha:            string;
  fecha_produccion: string | null;
  fecha_aprobacion_diseno: string | null;
  observaciones_diseno:    string | null;
  fecha_entrega:    string | null;
  prioridad?: boolean;
  cliente:   string;
  empresa:   string;
  telefono:  string;
  correo:    string;
  impresion: string | null;
  nombre_producto: string;
  categoria:       string;
  material:        string;
  calibre:         string;
  medida:          string;
  altura:        string;
  ancho:         string;
  fuelle_fondo:  string;
  fuelle_lat_iz: string;
  fuelle_lat_de: string;
  refuerzo:      string;
  por_kilo:      string | null;
  medidas: Record<MedidaKey, string>;
  tintas:      number | null;
  caras:       number | null;
  bk:          boolean | null;
  foil:        boolean | null;
  alto_rel:    boolean | null;
  laminado:    boolean | null;
  uv_br:       boolean | null;
  pigmentos:   string | null;
  pantones:    string[] | null;
  asa_suaje:   string | null;
  color_asa_nombre?: string | null;
  medida_troquel?: string | null;
  observacion: string | null;
  cantidad:      number | null;
  kilogramos:    number | null;
  modo_cantidad: string;
  repeticion_extrusion: number | null;
  repeticion_metro:     number | null;
  metros:               number | null;
  ancho_bobina:         number | null;
  repeticion_kidder:    string | null;
  repeticion_sicosa:    string | null;
  kilos:       number | null;
  kilos_merma: number | null;
  pzas:        number | null;
  pzas_merma:  number | null;
  kilos_extruir?:        number | null;
  metros_extruir?:       number | null;
  ext_merma?:            number | null;
  k_para_impresion?:     number | null;
  metros_extruidos?:     number | null;
  kilos_imprimir?:       number | null;
  imp_merma?:            number | null;
  kilos_impresos?:       number | null;
  metros_imprimir?:      number | null;
  metros_impresos?:      number | null;
  imp_maquina?:          string | null;
  kilos_bolsear?:        number | null;
  bol_merma?:            number | null;
  piezas_bolseadas?:     number | null;
  kilos_bolseados?:      number | null;
  bol_piezas_merma?:     number | null;
  asa_piezas_recibidas?: number | null;
  asa_merma?:            number | null;
  ancho_pelicula?:       string | null;
  fuelle_r?:             string | null;
  fuelle_f?:             string | null;
  bolseo_asa?:           string | null;
  metros_calculados?:    number | null;
  bolsas_calculadas?:    number | null;
  codigo_kliche?:        string | null;
}

const BLACK:     [number, number, number] = [0,   0,   0];
const WHITE:     [number, number, number] = [255, 255, 255];
const GRAY_DARK: [number, number, number] = [60,  60,  60];
const GRAY_MED:  [number, number, number] = [140, 140, 140];
const RED:       [number, number, number] = [200, 0,   0];

const LABEL_SIZE = 7;

const f = (v: any) =>
  v === null || v === undefined || String(v).trim() === "" ? "" : String(v).trim();

function celdaLabel(
  doc: jsPDF,
  label: string,
  value: string,
  x: number, y: number, w: number, h: number,
  labelSize = LABEL_SIZE,
  valueSize = 15,
  bold = false
) {
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(labelSize);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text(label, x + 1.5, y + 4.5);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(valueSize);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text(f(value), x + w / 2, y + h - 3, { align: "center" });
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

// ── CAMBIO: texto en esquina superior izquierda, igual que celdaLabel ──
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
  doc.text(label, x + 1.5, y + 4.5);   // ← esquina superior izquierda
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
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
) {
  const labelH = 6;
  const bodyH  = h - labelH;
  const filaH  = bodyH / 2;
  const colW   = w / 4;

  celdaHeader(doc, titulo, x, y, w, labelH, 9);
  const dataY = y + labelH;

  celdaLabel(doc, f1c1Label, f1c1Val, x,            dataY, colW, filaH, LABEL_SIZE, 11, !!f1c1Val);
  celdaLabel(doc, f1c2Label, f1c2Val, x + colW,     dataY, colW, filaH, LABEL_SIZE, 11, !!f1c2Val);
  celdaLabel(doc, f1c3Label, f1c3Val, x + colW * 2, dataY, colW, filaH, LABEL_SIZE, 11, !!f1c3Val);
  celdaLabel(doc, f1c4Label, f1c4Val, x + colW * 3, dataY, colW, filaH, LABEL_SIZE, 11, !!f1c4Val);

  const firmaY = dataY + filaH;
  celdaLabel(doc, f2c1Label, f2c1Val, x, firmaY, colW, filaH, LABEL_SIZE, 11, !!f2c1Val);

  // Observacion — ya estaba en esquina superior izquierda, sin cambio
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(x + colW, firmaY, colW, filaH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observacion", x + colW + 1.5, firmaY + 4.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  celdaFirma(doc, "Aut. Calidad",    x + colW * 2, firmaY, colW, filaH);
  celdaFirma(doc, "Firma Encargado", x + colW * 3, firmaY, colW, filaH);
}

function bloqueBolseo(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  kilosBolseados?: number | null,
  merma?: number | null,
  kilosBolseados2?: number | null,
  piezasBolseadas?: number | null,
) {
  const n = (v?: number | null) => v != null ? String(v) : "";
  const b = (v?: number | null) => v != null;

  const labelH = 6;
  const bodyH  = h - labelH;
  const filaH  = bodyH / 2;
  const colW   = w / 4;

  celdaHeader(doc, "BOLSEO", x, y, w, labelH, 9);
  const dataY = y + labelH;

  celdaLabel(doc, "Kilos Bolseados",  n(kilosBolseados),  x,            dataY, colW, filaH, LABEL_SIZE, 11, b(kilosBolseados));
  celdaLabel(doc, "Merma",            n(merma),            x + colW,     dataY, colW, filaH, LABEL_SIZE, 11, b(merma));
  celdaLabel(doc, "Kilos Bolseados",  n(kilosBolseados2), x + colW * 2, dataY, colW, filaH, LABEL_SIZE, 11, b(kilosBolseados2));
  celdaLabel(doc, "Piezas Bolseadas", n(piezasBolseadas), x + colW * 3, dataY, colW, filaH, LABEL_SIZE, 11, b(piezasBolseadas));

  const firmaY = dataY + filaH;
  const obsW   = colW * 2;

  // Observacion — esquina superior izquierda
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(x, firmaY, obsW, filaH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observacion", x + 1.5, firmaY + 4.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  celdaFirma(doc, "Aut. Calidad",    x + obsW,        firmaY, colW, filaH);
  celdaFirma(doc, "Firma Encargado", x + obsW + colW, firmaY, colW, filaH);
}

function bloqueOtroProceso(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
) {
  bloqueOperativo(
    doc, "OTRO PROCESO",
    "Kilos",          "",
    "Piezas",         "",
    "Merma",          "",
    "Kilos Finales",  "",
    "Piezas Finales", "",
    x, y, w, h,
  );
}

function bloqueBultosAlmacen(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
) {
  const labelH  = 5;
  const bultosW = w / 2;
  const almW    = w - bultosW;
  const almX    = x + bultosW;

  celdaHeader(doc, "BULTOS", x, y, bultosW, labelH, 9);
  const bultosDataY = y + labelH;
  const bultosDataH = h - labelH;
  const colW3       = bultosW / 3;

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(x, bultosDataY, bultosW, bultosDataH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Bultos",  x + colW3 * 0 + 1.5, bultosDataY + 4.5);
  doc.text("Medidas", x + colW3 * 1 + 1.5, bultosDataY + 4.5);
  doc.text("Peso",    x + colW3 * 2 + 1.5, bultosDataY + 4.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  celdaHeader(doc, "ALMACEN", almX, y, almW, labelH, 9);
  const almDataY = y + labelH;
  const almDataH = h - labelH;
  const almRowH  = almDataH / 3;
  const almCol1W = almW / 2;
  const almCol2W = almW - almCol1W;

  celdaLabel(doc, "Piezas Recibidas", "", almX,            almDataY,        almCol1W, almRowH, LABEL_SIZE, 11, false);
  celdaLabel(doc, "Ubicacion",        "", almX + almCol1W, almDataY,        almCol2W, almRowH, LABEL_SIZE, 11, false);

  // ── CAMBIO: "Observaciones" en esquina superior izquierda ──
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(almX, almDataY + almRowH, almW, almRowH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observaciones", almX + 1.5, almDataY + almRowH + 4.5);  // ← esquina superior izquierda
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  celdaFirma(doc, "Firma Calidad", almX,            almDataY + almRowH * 2, almCol1W, almRowH);
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

export async function generarPdfOrdenProduccion(data: OrdenProduccionData): Promise<void> {
  const logoBase64    = await cargarLogoBase64(logoUrl);
  const repeticionStr = construirRepeticionStr(data);
  const pantStr       = parsePantones(data.pantones);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const PH = 297;
  const M  = 8;
  const CW = PW - M * 2;
  let y = M;

  // ── FILA 1 — Logo | Título | ORDEN No. + FECHA ──
  const logoW  = 36;
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
  doc.text(formatFecha(data.fecha), ordenX + ordenW / 2, y + 23.5, { align: "center" });
  y += fila2H;

  // ── FILA 2 — Impresión | Fecha Entrega | Prioridad | Pedido ──
  const fila3H = 13;
  const impW   = CW * 0.36;
  const entW   = CW * 0.28;
  const priW   = CW * 0.18;
  const pedW   = CW - impW - entW - priW;

  celdaLabel(doc, "Impresión",     f(data.impresion ?? data.cliente), M,        y, impW, fila3H, LABEL_SIZE, 13);
  celdaLabel(doc, "Fecha Entrega", formatFecha(data.fecha_entrega),   M + impW, y, entW, fila3H, LABEL_SIZE, 13);

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
  const prioridadTexto = data.prioridad ? "URGENTE" : "Normal";
  doc.text(prioridadTexto, M + impW + entW + priW / 2, y + fila3H - 3, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  celdaLabel(doc, "Pedido", data.no_pedido ? data.no_pedido.trim() : "—",
    M + impW + entW + priW, y, pedW, fila3H, LABEL_SIZE, 11, true);
  y += fila3H;

  // ── FILA 3 — Producto | Cantidad | Medida | Kilos/mts/Bolsas ──
  const fila4H  = 14;
  const prodW4  = CW * 0.34;
  const cant4W  = CW * 0.13;
  const med4W   = CW * 0.38;
  const kilos4W = CW - prodW4 - cant4W - med4W;

  const cantDisplay = data.modo_cantidad === "kilo" && data.kilogramos
    ? `${data.kilogramos} kg`
    : data.cantidad ? data.cantidad.toLocaleString("es-MX") : "";

  celdaLabel(doc, "Producto", f(data.nombre_producto), M,                   y, prodW4, fila4H, LABEL_SIZE, 13);
  celdaLabel(doc, "Cantidad", cantDisplay,              M + prodW4,          y, cant4W, fila4H, LABEL_SIZE, 15, true);
  celdaLabel(doc, "Medida",   f(data.medida),           M + prodW4 + cant4W, y, med4W,  fila4H, LABEL_SIZE, 13);

  const kilos4X   = M + prodW4 + cant4W + med4W;
  const kilosTotH = fila4H * 2;
  const secH      = kilosTotH / 3;

  const kilosVal = data.kilos_merma != null
    ? Number(data.kilos_merma).toFixed(2)
    : data.kilogramos != null
      ? Number(data.kilogramos).toFixed(2)
      : data.kilos != null
        ? Number(data.kilos).toFixed(2)
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

  // Sección Kilos
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

  // Sección mts
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.rect(kilos4X, y + secH, kilos4W, secH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("mts", kilos4X + 1.5, y + secH + 3);
  if (mtsVal) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(mtsVal, kilos4X + kilos4W / 2, y + secH * 2 - 1.5, { align: "center" });
  }

  // Sección Bolsas
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.rect(kilos4X, y + secH * 2, kilos4W, secH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Bolsas", kilos4X + 1.5, y + secH * 2 + 3);
  if (bolsasVal) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(bolsasVal, kilos4X + kilos4W / 2, y + secH * 3 - 1.5, { align: "center" });
  }
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  y += fila4H;

  // ── FILA 4 — Medidas / Material / Calibre / Pigmento / Caras ──
  const fila5H   = 14;
  const medidasW = CW - kilos4W;

  const cols5 = [
    { label: "Ancho Pel.", value: f(data.ancho_pelicula),                w: medidasW * 0.09 },
    { label: "Altura",     value: f(data.altura),                        w: medidasW * 0.08 },
    { label: "Fuelle R",   value: f(data.fuelle_r ?? data.fuelle_fondo), w: medidasW * 0.09 },
    { label: "Fuelle F",   value: f(data.fuelle_f ?? data.fuelle_fondo), w: medidasW * 0.08 },
    { label: "Ancho",      value: f(data.ancho),                         w: medidasW * 0.09 },
    { label: "Fuelle Lat", value: f(data.fuelle_lat_iz),                 w: medidasW * 0.09 },
    { label: "Fuelle Lat", value: f(data.fuelle_lat_de),                 w: medidasW * 0.09 },
    { label: "Material",   value: f(data.material),                      w: medidasW * 0.17 },
    { label: "Calibre",    value: f(data.calibre),                       w: medidasW * 0.08 },
    { label: "Pigmento",   value: f(data.pigmentos),                     w: medidasW * 0.08 },
    { label: "Caras",      value: f(data.caras),
      w: medidasW - medidasW * (0.09+0.08+0.09+0.08+0.09+0.09+0.09+0.17+0.08+0.08) },
  ];

  let cx5 = M;
  cols5.forEach(col => {
    celdaLabel(doc, col.label, col.value, cx5, y, col.w, fila5H, LABEL_SIZE, 11, false);
    cx5 += col.w;
  });
  y += fila5H;

  // ── FILA 5 — Repetición | Código Kliche | Pantones ──
  const fila6H = 16;
  const repW6  = CW * 0.35;
  const codK6W = CW * 0.15;
  const pan6W  = CW - repW6 - codK6W;

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

  celdaLabel(doc, "Código Kliche", f(data.codigo_kliche),         M + repW6,          y, codK6W, fila6H, LABEL_SIZE, 12);
  celdaLabel(doc, "Pantones",      pantStr !== "—" ? pantStr : "", M + repW6 + codK6W, y, pan6W,  fila6H, LABEL_SIZE, 12);
  y += fila6H;

  // ── FILA 6 — Asa/Suaje | Bolseo | Observaciones ──
  const fila7H = 14;
  const asa7W  = CW * 0.22;
  const bol7W  = CW * 0.12;
  const obs7W  = CW - asa7W - bol7W;

  const esTroquel = (data.asa_suaje || "").toLowerCase().includes("troquel") ||
                    (data.nombre_producto || "").toLowerCase().includes("troquel");
  const esAsaFlex = (data.nombre_producto || "").toLowerCase().includes("asa flexible");
  let asaTexto = f(data.asa_suaje);
  if (esAsaFlex && data.color_asa_nombre) {
    asaTexto = `${asaTexto} ${data.color_asa_nombre}`;
  } else if (esTroquel && data.medida_troquel) {
    asaTexto = `${asaTexto} ${data.medida_troquel}`;
  }

  celdaLabel(doc, "Asa / Troquel", asaTexto,           M,         y, asa7W, fila7H, LABEL_SIZE, 13);
  celdaLabel(doc, "Bolseo",        f(data.bolseo_asa), M + asa7W, y, bol7W, fila7H, LABEL_SIZE, 13);

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(M + asa7W + bol7W, y, obs7W, fila7H);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observaciones", M + asa7W + bol7W + 1.5, y + 4.5);
  if (data.observacion) {
    doc.setFontSize(9.5);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(data.observacion, M + asa7W + bol7W + 2, y + 9.5, { maxWidth: obs7W - 3 });
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

  const espacioTotal = PH - M - y;
  const bultosRatio  = 0.22;
  const bultosH      = espacioTotal * bultosRatio;
  const bloqueH      = (espacioTotal - bultosH) / 4;

  const tituloImpresion = data.imp_maquina
    ? `IMPRESIÓN — ${String(data.imp_maquina).toUpperCase()}`
    : "IMPRESIÓN";

  bloqueOperativo(
    doc, "EXTRUSIÓN",
    "Kilos Extruidos",    "",
    "Metros Extruidos",   data.metros_extruidos != null ? String(data.metros_extruidos) : "",
    "Merma",              data.ext_merma        != null ? String(data.ext_merma)        : "",
    "Kilos p/ Impresión", data.k_para_impresion != null ? String(data.k_para_impresion) : "",
    "Metros p/ Impresión","",
    M, y, colIzqW, bloqueH,
  ); y += bloqueH;

  bloqueOperativo(
    doc, tituloImpresion,
    "Kilos Impresos",  data.kilos_imprimir  != null ? String(data.kilos_imprimir)  : "",
    "Metros Impresos", data.metros_impresos != null ? String(data.metros_impresos) : "",
    "Merma",           data.imp_merma       != null ? String(data.imp_merma)       : "",
    "Kilos p/ Bolseo", data.kilos_impresos  != null ? String(data.kilos_impresos)  : "",
    "Metros p/ Bolseo","",
    M, y, colIzqW, bloqueH,
  ); y += bloqueH;

  bloqueBolseo(
    doc,
    M, y, colIzqW, bloqueH,
    data.kilos_bolseados,
    data.bol_merma,
    data.kilos_bolseados,
    data.piezas_bolseadas,
  ); y += bloqueH;

  bloqueOtroProceso(doc, M, y, colIzqW, bloqueH);
  y += bloqueH;

  bloqueBultosAlmacen(doc, M, y, colIzqW, bultosH);

  // ── COLUMNA DERECHA ──
  const autDisenoH = bloqueH;
  const renderH    = espacioTotal - autDisenoH;
  const labelDerH  = 6;

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
  const labelFechaW   = doc.getTextWidth("Fecha aprobación: ");
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

  // — Render Cliente —
  const renderY = bloqueY + autDisenoH;
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(colDerX, renderY, colDerW, renderH);
  celdaHeader(doc, "Render Cliente", colDerX, renderY, colDerW, labelDerH, 9);

  doc.save(`OrdenProduccion_${data.no_produccion ?? data.no_pedido}.pdf`);
}