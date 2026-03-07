import jsPDF from "jspdf";
import { cargarLogoBase64, parsePantones } from "./Pdfutils";
import { buscarRodillos, formatearRepeticionParaPdf } from "./rodillosService";
import type { MedidaKey } from "../types/productos-plastico.types";

export interface OrdenProduccionData {
  no_pedido:        number;
  no_produccion:    string | null;
  fecha:            string;
  fecha_produccion: string | null;

  // ✅ nuevo — fecha de aprobación individual del diseño
  fecha_aprobacion_diseno: string | null;

  // Cliente
  cliente:   string;
  empresa:   string;
  telefono:  string;
  correo:    string;
  impresion: string | null;

  // Producto
  nombre_producto: string;
  categoria:       string;
  material:        string;
  calibre:         string;
  medida:          string;

  // Medidas individuales
  altura:        string;
  ancho:         string;
  fuelle_fondo:  string;
  fuelle_lat_iz: string;
  fuelle_lat_de: string;
  refuerzo:      string;
  por_kilo:      string | null;

  // Medidas para cálculo de rodillo
  medidas: Record<MedidaKey, string>;

  // Características
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
  observacion: string | null;

  // Cantidad
  cantidad:      number | null;
  kilogramos:    number | null;
  modo_cantidad: string;
}

// ── Paleta ───────────────────────────────────────────────────
const BLACK      = [0,   0,   0]   as [number, number, number];
const WHITE      = [255, 255, 255] as [number, number, number];
const GRAY_DARK  = [60,  60,  60]  as [number, number, number];
const GRAY_MED   = [140, 140, 140] as [number, number, number];

// ── Helpers ──────────────────────────────────────────────────
const f = (v: any) =>
  v === null || v === undefined || String(v).trim() === "" ? "" : String(v).trim();

function celdaLabel(
  doc: jsPDF,
  label: string,
  value: string,
  x: number, y: number, w: number, h: number,
  labelSize = 5.5,
  valueSize = 8,
  bold = false
) {
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(labelSize);
  doc.setTextColor(...GRAY_DARK);
  doc.text(label, x + 1.2, y + 3.5);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(valueSize);
  doc.setTextColor(...BLACK);
  doc.text(f(value), x + w / 2, y + h - 2.5, { align: "center" });
}

function celdaHeader(
  doc: jsPDF,
  label: string,
  x: number, y: number, w: number, h: number,
  fontSize = 6.5
) {
  doc.setFillColor(...GRAY_DARK);
  doc.rect(x, y, w, h, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.setTextColor(...WHITE);
  doc.text(label, x + w / 2, y + h / 2 + 1.8, { align: "center" });
  doc.setTextColor(...BLACK);
}

function bloqueOperativo(
  doc: jsPDF,
  titulo: string,
  col1: string,
  col2: string,
  col3: string,
  x: number, y: number, w: number, h: number
) {
  const labelH = 6;
  const bodyH  = h - labelH;
  const filaH  = bodyH / 2;
  const colW   = w / 3;

  celdaHeader(doc, titulo, x, y, w, labelH);

  const dataY = y + labelH;
  celdaLabel(doc, col1, "", x,            dataY, colW, filaH, 5.5, 8);
  celdaLabel(doc, col2, "", x + colW,     dataY, colW, filaH, 5.5, 8);
  celdaLabel(doc, col3, "", x + colW * 2, dataY, colW, filaH, 5.5, 8);

  const firmaY = dataY + filaH;
  const obsW   = w * 0.40;
  const firmaW = w * 0.30;
  const calW   = w - obsW - firmaW;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.2);
  doc.rect(x, firmaY, obsW, filaH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("Observación", x + 1.2, firmaY + 3.5);
  doc.setTextColor(...BLACK);

  doc.rect(x + obsW, firmaY, firmaW, filaH);
  doc.setFontSize(5.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("Firma Encargado", x + obsW + firmaW / 2, firmaY + 3.5, { align: "center" });
  doc.setDrawColor(...GRAY_MED);
  doc.line(x + obsW + 3, firmaY + filaH - 3, x + obsW + firmaW - 3, firmaY + filaH - 3);
  doc.setTextColor(...BLACK);

  doc.setDrawColor(...BLACK);
  doc.rect(x + obsW + firmaW, firmaY, calW, filaH);
  doc.setFontSize(5.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("Autorización Calidad", x + obsW + firmaW + calW / 2, firmaY + 3.5, { align: "center" });
  doc.setDrawColor(...GRAY_MED);
  doc.line(x + obsW + firmaW + 3, firmaY + filaH - 3, x + obsW + firmaW + calW - 3, firmaY + filaH - 3);
  doc.setTextColor(...BLACK);
}

function formatFecha(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

// ── Generador principal ──────────────────────────────────────
export async function generarPdfOrdenProduccion(data: OrdenProduccionData): Promise<void> {
  const logoBase64 = await cargarLogoBase64("/src/assets/logogrupeb.png");

  let repeticionStr = "";
  try {
    const respRodillos = await buscarRodillos(data.medidas);
    repeticionStr = formatearRepeticionParaPdf(respRodillos.resultados, respRodillos.valor_buscado);
  } catch (e) {
    console.warn("⚠️ No se pudo obtener rodillos:", e);
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW = 210;
  const PH = 297;
  const M  = 8;
  const CW = PW - M * 2;

  let y = M;

  // ── FILA 1 — Supervisores ──
  const supervisores = ["Ventas", "Diseño", "Logística", "Extrusión", "Impresión", "Bolseo"];
  const supW = CW / supervisores.length;
  const supH = 12;

  supervisores.forEach((s, i) => {
    const sx = M + i * supW;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.2);
    doc.rect(sx, y, supW, supH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...GRAY_DARK);
    doc.text(s, sx + supW / 2, y + 4, { align: "center" });
    doc.setDrawColor(...GRAY_MED);
    doc.line(sx + 2, y + supH - 2, sx + supW - 2, y + supH - 2);
    doc.setTextColor(...BLACK);
  });

  y += supH;

  // ── FILA 2 — Logo | Título | ORDEN No. + FECHA ──
  const logoW  = 30;
  const ordenW = 45;
  const titleW = CW - logoW - ordenW;
  const fila2H = 20;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(M, y, logoW, fila2H);
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", M + 1, y + 1, logoW - 2, fila2H - 2); }
    catch {
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...BLACK);
      doc.text("EB", M + logoW / 2, y + fila2H / 2 + 2, { align: "center" });
    }
  }

  const titleX = M + logoW;
  doc.rect(titleX, y, titleW, fila2H);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BLACK);
  doc.text("Orden de Producción de Plástico", titleX + titleW / 2, y + fila2H / 2 + 2, { align: "center" });

  const ordenX = M + logoW + titleW;
  doc.rect(ordenX, y, ordenW, fila2H);
  doc.setFillColor(...GRAY_DARK);
  doc.rect(ordenX, y, ordenW, 5, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...WHITE);
  doc.text("ORDEN", ordenX + ordenW / 2, y + 3.5, { align: "center" });
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(...GRAY_DARK);
  doc.text("No", ordenX + 2, y + 9);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...BLACK);
  doc.text(f(data.no_produccion ?? `PED-${data.no_pedido}`), ordenX + ordenW / 2, y + 11, { align: "center" });
  doc.setDrawColor(...GRAY_MED); doc.setLineWidth(0.2);
  doc.line(ordenX, y + 13, ordenX + ordenW, y + 13);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(...GRAY_DARK);
  doc.text("FECHA", ordenX + 2, y + 16.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...BLACK);
  doc.text(formatFecha(data.fecha), ordenX + ordenW / 2, y + 19, { align: "center" });

  y += fila2H;

  // ── FILA 3 — Impresión | Fecha Entrega | Prioridad | Pedido ──
  const fila3H = 10;
  const impW   = CW * 0.36;
  const entW   = CW * 0.28;
  const priW   = CW * 0.18;
  const pedW   = CW - impW - entW - priW;

  celdaLabel(doc, "Impresión",     f(data.impresion ?? data.cliente), M,                      y, impW, fila3H, 5.5, 7.5);
  celdaLabel(doc, "Fecha Entrega", "",                                M + impW,               y, entW, fila3H, 5.5, 7.5);
  celdaLabel(doc, "Prioridad",     "",                                M + impW + entW,        y, priW, fila3H, 5.5, 7.5);
  celdaLabel(doc, "Pedido",        f(data.no_pedido),                 M + impW + entW + priW, y, pedW, fila3H, 5.5, 8, true);

  y += fila3H;

  // ── FILA 4 — Producto | Cantidad | Medida | Material | Calibre ──
  const fila4H = 11;
  const prodW  = CW * 0.28;
  const cantW  = CW * 0.14;
  const medW   = CW * 0.18;
  const matW   = CW * 0.24;
  const calW2  = CW - prodW - cantW - medW - matW;

  const cantDisplay = data.modo_cantidad === "kilo" && data.kilogramos
    ? `${data.kilogramos} kg`
    : data.cantidad
    ? data.cantidad.toLocaleString("es-MX")
    : "";

  celdaLabel(doc, "Producto",  f(data.nombre_producto), M,                               y, prodW, fila4H, 5.5, 7.5);
  celdaLabel(doc, "Cantidad",  cantDisplay,              M + prodW,                       y, cantW, fila4H, 5.5, 8, true);
  celdaLabel(doc, "Medida",    f(data.medida),           M + prodW + cantW,               y, medW,  fila4H, 5.5, 7.5);
  celdaLabel(doc, "Material",  f(data.material),         M + prodW + cantW + medW,        y, matW,  fila4H, 5.5, 7.5);
  celdaLabel(doc, "Calibre",   f(data.calibre),          M + prodW + cantW + medW + matW, y, calW2, fila4H, 5.5, 8, true);

  y += fila4H;

  // ── FILA 5 — Asa / Suaje ──
  const fila5H = 9;
  celdaLabel(doc, "Asa / Suaje", f(data.asa_suaje), M, y, CW, fila5H, 5.5, 7.5);

  y += fila5H;

  // ── FILA 6 — Repetición | Código | Pantones ──
  const fila6H = 10;
  const repW   = CW * 0.50;
  const codW   = CW * 0.15;
  const panW   = CW - repW - codW;
  const pantStr = parsePantones(data.pantones);

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.2);
  doc.rect(M, y, repW, fila6H);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("Repetición", M + 1.2, y + 3.5);
  doc.setTextColor(...BLACK);
  if (repeticionStr) {
    doc.setFontSize(5.5);
    doc.text(repeticionStr, M + repW / 2, y + fila6H - 2.5, {
      align: "center",
      maxWidth: repW - 2,
    });
  }

  celdaLabel(doc, "Código",   "",                             M + repW,        y, codW, fila6H, 5.5, 7.5);
  celdaLabel(doc, "Pantones", pantStr !== "—" ? pantStr : "", M + repW + codW, y, panW, fila6H, 5.5, 7.5);

  y += fila6H;

  // ── FILA 7 — Altura | Muelle Fondo | Ancho | Pigmento | Cantidad kg | Caras ──
  const fila7H = 11;
  const medCols = [
    { label: "Altura",        value: f(data.altura),       w: CW * 0.11 },
    { label: "Muelle Fondo",  value: f(data.fuelle_fondo), w: CW * 0.15 },
    { label: "Ancho",         value: f(data.ancho),        w: CW * 0.11 },
    { label: "Pigmento",      value: f(data.pigmentos),    w: CW * 0.21 },
    { label: "Cantidad (kg)", value: data.kilogramos ? `${data.kilogramos} Kilos` : "", w: CW * 0.26 },
    { label: "Caras",         value: f(data.caras),        w: CW - (CW * 0.11 + CW * 0.15 + CW * 0.11 + CW * 0.21 + CW * 0.26) },
  ];

  let cx = M;
  medCols.forEach(col => {
    celdaLabel(doc, col.label, col.value, cx, y, col.w, fila7H, 5.5, 8,
      col.label === "Cantidad (kg)" || col.label === "Caras");
    cx += col.w;
  });

  y += fila7H + 3;

  // ── BLOQUES OPERATIVOS + COLUMNA DERECHA ──
  const colIzqW = CW * 0.62;
  const colDerW = CW - colIzqW;
  const colDerX = M + colIzqW;
  const bloqueH = 30;
  const bloqueY = y;

  bloqueOperativo(doc, "EXTRUSIÓN",        "Kilos a Extruir",  "Merma", "Kilos p/ Impresión", M, y, colIzqW, bloqueH); y += bloqueH;
  bloqueOperativo(doc, "IMPRESIÓN",        "Kilos Impresos",   "Merma", "Kilos p/ Bolseo",    M, y, colIzqW, bloqueH); y += bloqueH;
  bloqueOperativo(doc, "BOLSEO",           "Kilos Bolsear",    "Merma", "Producto Terminado", M, y, colIzqW, bloqueH); y += bloqueH;
  bloqueOperativo(doc, "PIEZAS RECIBIDAS", "Piezas Recibidas", "Merma", "Producto Terminado", M, y, colIzqW, bloqueH); y += bloqueH;

  // ── Columna derecha — Autorización de Diseño ──
  const totalBloques  = bloqueH * 4;
  const autDisenoH    = totalBloques * 0.50;
  const labelBloqH    = 6;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.2);
  doc.rect(colDerX, bloqueY, colDerW, autDisenoH);
  celdaHeader(doc, "AUTORIZACIÓN DE DISEÑO", colDerX, bloqueY, colDerW, labelBloqH);

  // ✅ Fecha de aprobación individual del diseño
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("Fecha aprobación:", colDerX + 3, bloqueY + labelBloqH + 7);
  doc.setFontSize(7);
  doc.setTextColor(...BLACK);
  doc.text(
    formatFecha(data.fecha_aprobacion_diseno) || "—",
    colDerX + colDerW / 2,
    bloqueY + labelBloqH + 14,
    { align: "center" }
  );

  doc.setFontSize(5.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("Observaciones:", colDerX + 3, bloqueY + labelBloqH + 21);
  doc.setTextColor(...BLACK);

  // Línea de firma
  doc.setDrawColor(...GRAY_MED);
  doc.line(
    colDerX + 5,
    bloqueY + autDisenoH - 4,
    colDerX + colDerW - 5,
    bloqueY + autDisenoH - 4
  );
  doc.setFontSize(5.5);
  doc.setTextColor(...GRAY_MED);
  doc.text("Autorizó Diseño", colDerX + colDerW / 2, bloqueY + autDisenoH - 1, { align: "center" });
  doc.setTextColor(...BLACK);

  // ── Columna derecha — Gráfica de Rendimiento ──
  const grafY = bloqueY + autDisenoH;
  const grafH = totalBloques - autDisenoH;
  doc.setDrawColor(...BLACK);
  doc.rect(colDerX, grafY, colDerW, grafH);
  celdaHeader(doc, "Gráfica de Rendimiento", colDerX, grafY, colDerW, labelBloqH);

  // ── PIE DE PÁGINA ──
  const pieY = PH - M - 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...GRAY_MED);
  const noOp = data.no_produccion ?? `Pedido #${data.no_pedido}`;
  doc.text("Generó Orden: Sistema",                  M,      pieY);
  doc.text(`${noOp}  ·  ${formatFecha(data.fecha)}`, PW / 2, pieY, { align: "center" });
  doc.text("Autorizó Diseño:",                        PW - M, pieY, { align: "right" });
  doc.setTextColor(...BLACK);

  doc.save(`OrdenProduccion_${data.no_produccion ?? data.no_pedido}.pdf`);
}