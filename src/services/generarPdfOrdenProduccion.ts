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
  color_asa_nombre?: string | null;   // ← nuevo
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
}

const BLACK:       [number, number, number] = [0,   0,   0];
const WHITE:       [number, number, number] = [255, 255, 255];
const GRAY_DARK:   [number, number, number] = [60,  60,  60];
const GRAY_MED:    [number, number, number] = [140, 140, 140];
const GRAY_LIGHT2: [number, number, number] = [240, 240, 240];
const RED:         [number, number, number] = [200, 0,   0];

const f = (v: any) =>
  v === null || v === undefined || String(v).trim() === "" ? "" : String(v).trim();

function celdaLabel(
  doc: jsPDF,
  label: string,
  value: string,
  x: number, y: number, w: number, h: number,
  labelSize = 10,
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

function bloqueOperativo(
  doc: jsPDF,
  titulo: string,
  col1: string,
  col2: string,
  col3: string,
  x: number, y: number, w: number, h: number,
  val1?: number | null,
  val2?: number | null,
  val3?: number | null,
) {
  const n = (v?: number | null) => v != null ? String(v) : "";
  const b = (v?: number | null) => v != null;

  const labelH = 8;
  const bodyH  = h - labelH;
  const filaH  = bodyH / 2;
  const colW   = w / 3;

  celdaHeader(doc, titulo, x, y, w, labelH);

  const dataY = y + labelH;
  celdaLabel(doc, col1, n(val1), x,            dataY, colW, filaH, 10, 15, b(val1));
  celdaLabel(doc, col2, n(val2), x + colW,     dataY, colW, filaH, 10, 15, b(val2));
  celdaLabel(doc, col3, n(val3), x + colW * 2, dataY, colW, filaH, 10, 15, b(val3));

  const firmaY = dataY + filaH;
  const obsW   = w * 0.40;
  const firmaW = w * 0.30;
  const calW   = w - obsW - firmaW;

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(x, firmaY, obsW, filaH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observación", x + 1.5, firmaY + 4.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  doc.rect(x + obsW, firmaY, firmaW, filaH);
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Autorización Calidad", x + obsW + firmaW / 2, firmaY + 4.5, { align: "center" });
  doc.setDrawColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.line(x + obsW + 3, firmaY + filaH - 3.5, x + obsW + firmaW - 3, firmaY + filaH - 3.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.rect(x + obsW + firmaW, firmaY, calW, filaH);
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Firma Encargado", x + obsW + firmaW + calW / 2, firmaY + 4.5, { align: "center" });
  doc.setDrawColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.line(x + obsW + firmaW + 3, firmaY + filaH - 3.5, x + obsW + firmaW + calW - 3, firmaY + filaH - 3.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

function bloqueExtrusionConMetros(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  kilos_extruir?:    number | null,
  metros_extruir?:   number | null,
  ext_merma?:        number | null,
  k_para_impresion?: number | null,
  metros_extruidos?: number | null,
) {
  const n = (v?: number | null) => v != null ? String(v) : "";
  const b = (v?: number | null) => v != null;

  const labelH = 8;
  const bodyH  = h - labelH;
  const filaH  = bodyH / 2;
  const colW   = w / 4;

  celdaHeader(doc, "EXTRUSIÓN", x, y, w, labelH);
  const dataY = y + labelH;

  celdaLabel(doc, "Kilos a Extruir",    n(kilos_extruir),    x,            dataY, colW, filaH, 10, 15, b(kilos_extruir));
  celdaLabel(doc, "Metros a Extruir",   n(metros_extruir),   x + colW,     dataY, colW, filaH, 10, 15, b(metros_extruir));
  celdaLabel(doc, "Merma",              n(ext_merma),        x + colW * 2, dataY, colW, filaH, 10, 15, b(ext_merma));
  celdaLabel(doc, "Kilos p/ Impresión", n(k_para_impresion), x + colW * 3, dataY, colW, filaH, 10, 15, b(k_para_impresion));

  const firmaY  = dataY + filaH;
  const metExtW = w * 0.25;
  const obsW    = w * 0.25;
  const firmaW  = w * 0.25;
  const calW    = w - metExtW - obsW - firmaW;

  celdaLabel(doc, "Metros Extruidos", n(metros_extruidos), x, firmaY, metExtW, filaH, 10, 15, b(metros_extruidos));

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(x + metExtW, firmaY, obsW, filaH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observación", x + metExtW + 1.5, firmaY + 4.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  doc.rect(x + metExtW + obsW, firmaY, firmaW, filaH);
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Autorización Calidad", x + metExtW + obsW + firmaW / 2, firmaY + 4.5, { align: "center" });
  doc.setDrawColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.line(x + metExtW + obsW + 3, firmaY + filaH - 3.5, x + metExtW + obsW + firmaW - 3, firmaY + filaH - 3.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.rect(x + metExtW + obsW + firmaW, firmaY, calW, filaH);
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Firma Encargado", x + metExtW + obsW + firmaW + calW / 2, firmaY + 4.5, { align: "center" });
  doc.setDrawColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.line(x + metExtW + obsW + firmaW + 3, firmaY + filaH - 3.5, x + metExtW + obsW + firmaW + calW - 3, firmaY + filaH - 3.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

function bloqueMerma(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  kilos:       number | null,
  kilos_merma: number | null,
  pzas:        number | null,
  pzas_merma:  number | null,
) {
  const headerH = 8;
  const colW    = w / 4;
  const bodyH   = h - headerH;
  const dataY   = y + headerH;

  doc.setFillColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.rect(x, y, w, headerH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text("MERMA", x + w / 2, y + headerH / 2 + 2, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  const campos = [
    { label: "Kilos sin merma",  value: kilos       != null ? kilos.toFixed(2)                           : "—", gris: false },
    { label: "Kilos con merma",  value: kilos_merma != null ? kilos_merma.toFixed(2)                     : "—", gris: true  },
    { label: "Pzas sin merma",   value: pzas        != null ? Number(pzas).toLocaleString("es-MX")       : "—", gris: false },
    { label: "Pzas con merma",   value: pzas_merma  != null ? Number(pzas_merma).toLocaleString("es-MX") : "—", gris: true  },
  ];

  campos.forEach((campo, i) => {
    const cx = x + i * colW;
    doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.setLineWidth(0.2);
    if (campo.gris) {
      doc.setFillColor(GRAY_LIGHT2[0], GRAY_LIGHT2[1], GRAY_LIGHT2[2]);
      doc.rect(cx, dataY, colW, bodyH, "FD");
    } else {
      doc.rect(cx, dataY, colW, bodyH);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
    doc.text(campo.label, cx + colW / 2, dataY + 4.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(campo.value, cx + colW / 2, dataY + bodyH - 3, { align: "center" });
  });
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
  return partes.join("  /  ");
}

export async function generarPdfOrdenProduccion(data: OrdenProduccionData): Promise<void> {
  const logoBase64 = await cargarLogoBase64(logoUrl);
  const repeticionStr = construirRepeticionStr(data);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const PH = 297;
  const M  = 8;
  const CW = PW - M * 2;
  let y = M;

  // ── FILA 1 — Supervisores ──
  const supervisores = ["Ventas", "Diseño", "Logística", "Extrusión", "Impresión", "Bolseo"];
  const supW = CW / supervisores.length;
  const supH = 15;
  supervisores.forEach((s, i) => {
    const sx = M + i * supW;
    doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.setLineWidth(0.2);
    doc.rect(sx, y, supW, supH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
    doc.text(s, sx + supW / 2, y + 5.5, { align: "center" });
    doc.setDrawColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
    doc.line(sx + 2, y + supH - 2.5, sx + supW - 2, y + supH - 2.5);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  });
  y += supH;

  // ── FILA 2 — Logo | Título | ORDEN No. + FECHA ──
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
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
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

  // ── FILA 3 — Impresión | Fecha Entrega | Prioridad | Pedido ──
  const fila3H = 13;
  const impW   = CW * 0.36;
  const entW   = CW * 0.28;
  const priW   = CW * 0.18;
  const pedW   = CW - impW - entW - priW;

  celdaLabel(doc, "Impresión",     f(data.impresion ?? data.cliente), M,          y, impW, fila3H, 10, 13);
  celdaLabel(doc, "Fecha Entrega", formatFecha(data.fecha_entrega),   M + impW,   y, entW, fila3H, 10, 13);

  const prioridadTexto = data.prioridad ? "URGENTE" : "Normal";
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(M + impW + entW, y, priW, fila3H);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Prioridad", M + impW + entW + 1.5, y + 4.5);
  doc.setFont("helvetica", data.prioridad ? "bold" : "normal");
  doc.setFontSize(13);
  doc.setTextColor(
    data.prioridad ? RED[0] : BLACK[0],
    data.prioridad ? RED[1] : BLACK[1],
    data.prioridad ? RED[2] : BLACK[2]
  );
  doc.text(prioridadTexto, M + impW + entW + priW / 2, y + fila3H - 3, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  celdaLabel(doc, "Pedido", data.no_pedido ? data.no_pedido.trim() : "—",
    M + impW + entW + priW, y, pedW, fila3H, 10, 11, true);
  y += fila3H;

  // ── FILA 4 — Producto | Cantidad | Medida | Material | Calibre ──
  const fila4H = 14;
  const prodW  = CW * 0.28;
  const cantW  = CW * 0.14;
  const medW   = CW * 0.18;
  const matW   = CW * 0.24;
  const calW2  = CW - prodW - cantW - medW - matW;
  const cantDisplay = data.modo_cantidad === "kilo" && data.kilogramos
    ? `${data.kilogramos} kg`
    : data.cantidad ? data.cantidad.toLocaleString("es-MX") : "";
  celdaLabel(doc, "Producto",  f(data.nombre_producto), M,                               y, prodW, fila4H, 10, 13);
  celdaLabel(doc, "Cantidad",  cantDisplay,              M + prodW,                       y, cantW, fila4H, 10, 15, true);
  celdaLabel(doc, "Medida",    f(data.medida),           M + prodW + cantW,               y, medW,  fila4H, 10, 13);
  celdaLabel(doc, "Material",  f(data.material),         M + prodW + cantW + medW,        y, matW,  fila4H, 10, 13);
  celdaLabel(doc, "Calibre",   f(data.calibre),          M + prodW + cantW + medW + matW, y, calW2, fila4H, 10, 15, true);
  y += fila4H;

  // ── FILA 5 — Repetición de Impresión ──
  const fila5H = 11;
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(M, y, CW, fila5H);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Repetición de Impresión", M + 1.5, y + 4.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  if (repeticionStr) {
    doc.setFontSize(10);
    doc.text(repeticionStr, M + CW / 2, y + fila5H - 3, { align: "center", maxWidth: CW - 2 });
  }
  y += fila5H;

  // ── FILA 6 — Asa/Suaje | Color Asa | Código | Pantones ──
  // Distribucion: suaje 30% | color asa 20% | código 13% | pantones resto
  const fila6H  = 13;
  const asaW    = CW * 0.30;
  const colorW  = CW * 0.20;
  const codW    = CW * 0.13;
  const panW    = CW - asaW - colorW - codW;
  const pantStr = parsePantones(data.pantones);

  celdaLabel(doc, "Asa / Suaje",  f(data.asa_suaje),              M,                      y, asaW,  fila6H, 10, 13);
  celdaLabel(doc, "Color Asa",    f(data.color_asa_nombre ?? ""), M + asaW,               y, colorW, fila6H, 10, 13);
  celdaLabel(doc, "Código",       "",                             M + asaW + colorW,      y, codW,  fila6H, 10, 13);
  celdaLabel(doc, "Pantones",     pantStr !== "—" ? pantStr : "", M + asaW + colorW + codW, y, panW, fila6H, 10, 13);
  y += fila6H;

  // ── FILA 7 — Altura | Muelle Fondo | Ancho | Pigmento | Caras ──
  const fila7H = 14;
  const medCols = [
    { label: "Altura",       value: f(data.altura),       w: CW * 0.11 },
    { label: "Muelle Fondo", value: f(data.fuelle_fondo), w: CW * 0.15 },
    { label: "Ancho",        value: f(data.ancho),        w: CW * 0.11 },
    { label: "Pigmento",     value: f(data.pigmentos),    w: CW * 0.21 },
    { label: "Caras",        value: f(data.caras),        w: CW - (CW * 0.11 + CW * 0.15 + CW * 0.11 + CW * 0.21) },
  ];
  let cx2 = M;
  medCols.forEach(col => {
    celdaLabel(doc, col.label, col.value, cx2, y, col.w, fila7H, 10, 15, col.label === "Caras");
    cx2 += col.w;
  });
  y += fila7H;

  // ── FILA 8 — BLOQUE DE MERMA ──
  const mermaH = 20;
  bloqueMerma(doc, M, y, CW, mermaH, data.kilos, data.kilos_merma, data.pzas, data.pzas_merma);
  y += mermaH + 1;

  // ── BLOQUES OPERATIVOS + COLUMNA DERECHA ──
  const colIzqW = CW * 0.62;
  const colDerW = CW - colIzqW;
  const colDerX = M + colIzqW;
  const bloqueH = 34;
  const bloqueY = y;

  const tituloImpresion = data.imp_maquina
    ? `IMPRESIÓN — ${String(data.imp_maquina).toUpperCase()}`
    : "IMPRESIÓN";

  bloqueExtrusionConMetros(doc, M, y, colIzqW, bloqueH,
    data.kilos_extruir, data.metros_extruir,
    data.ext_merma, data.k_para_impresion, data.metros_extruidos
  ); y += bloqueH;

  bloqueOperativo(doc, tituloImpresion,
    "Kilos a Imprimir", "Merma", "Kilos p/ Bolseo",
    M, y, colIzqW, bloqueH,
    data.kilos_imprimir, data.imp_merma, data.kilos_impresos
  ); y += bloqueH;

  bloqueOperativo(doc, "BOLSEO",
    "Kilos Bolsear", "Merma", "Producto Terminado",
    M, y, colIzqW, bloqueH,
    data.kilos_bolsear, data.bol_merma, data.piezas_bolseadas
  ); y += bloqueH;

  bloqueOperativo(doc, "PIEZAS RECIBIDAS",
    "Piezas Recibidas", "Merma", "Producto Terminado",
    M, y, colIzqW, bloqueH,
    data.asa_piezas_recibidas, data.asa_merma, null
  ); y += bloqueH;

  // ── Columna derecha ──
  const totalBloques = bloqueH * 4;
  const labelBloqH   = 8;
  const autDisenoH   = totalBloques * 0.50;
  const graficaH     = totalBloques - autDisenoH;

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(colDerX, bloqueY, colDerW, autDisenoH);
  celdaHeader(doc, "AUTORIZACIÓN DE DISEÑO", colDerX, bloqueY, colDerW, labelBloqH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Fecha aprobación:", colDerX + 3, bloqueY + labelBloqH + 9);
  doc.setFontSize(13);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text(
    formatFecha(data.fecha_aprobacion_diseno) || "—",
    colDerX + colDerW / 2, bloqueY + labelBloqH + 17, { align: "center" }
  );

  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Obs. Diseño:", colDerX + 3, bloqueY + labelBloqH + 26);
  if (data.observaciones_diseno) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(data.observaciones_diseno, colDerX + 3, bloqueY + labelBloqH + 33, {
      maxWidth: colDerW - 6,
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Obs. Pedido:", colDerX + 3, bloqueY + labelBloqH + 47);
  if (data.observacion) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(data.observacion, colDerX + 3, bloqueY + labelBloqH + 54, {
      maxWidth: colDerW - 6,
    });
  }

  doc.setDrawColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.line(colDerX + 5, bloqueY + autDisenoH - 5, colDerX + colDerW - 5, bloqueY + autDisenoH - 5);
  doc.setFontSize(10);
  doc.setTextColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.text("Autorizó Diseño", colDerX + colDerW / 2, bloqueY + autDisenoH - 1.5, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  const graficaY = bloqueY + autDisenoH;
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.2);
  doc.rect(colDerX, graficaY, colDerW, graficaH);
  celdaHeader(doc, "GRÁFICA DE RENDIMIENTO", colDerX, graficaY, colDerW, labelBloqH);

  // ── PIE DE PÁGINA ──
  const pieY = PH - M - 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  const noOp = data.no_produccion ?? `Pedido #${data.no_pedido}`;
  doc.text("Generó Orden: Sistema",                  M,      pieY);
  doc.text(`${noOp}  ·  ${formatFecha(data.fecha)}`, PW / 2, pieY, { align: "center" });
  doc.text("Autorizó Diseño:",                        PW - M, pieY, { align: "right" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  doc.save(`OrdenProduccion_${data.no_produccion ?? data.no_pedido}.pdf`);
}