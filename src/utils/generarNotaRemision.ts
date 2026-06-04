import jsPDF from "jspdf";
import type { NotaRemisionData } from "../services/enviosService";
import type { NotaRemisionMultiData } from "../types/envios.types";
import logoGrupeb from "../assets/grupeblanco.png";
import { subirPdfA3 } from "../services/pdfS3.service";

// ─────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────
const texto = (v: any) =>
  v === null || v === undefined || String(v).trim() === "" ? "-" : String(v);

const formatCantidad = (prod: any) => {
  if (prod.total_unidades != null) {
    return `${Number(prod.total_unidades).toLocaleString("es-MX")} pzas`;
  }

  if (prod.total_kg != null) {
    return `${Number(prod.total_kg).toLocaleString("es-MX")} kg`;
  }

  return "-";
};

const buildDescripcion = (prod: any) => {
  const descripcion =
    prod.descripcion ||
    prod.producto_descripcion ||
    prod.descripcion_producto ||
    prod.detalle ||
    prod.observacion ||
    "";

  const descripcionExtra = descripcion ? ` — ${descripcion}` : "";

  return (
    `${prod.nombre_producto || ""}` +
    `${prod.medida ? ` (${prod.medida})` : ""}` +
    descripcionExtra
  );
};

// ── Dibuja sección de observaciones (solo si hay texto) ─────────────
const dibujarObservaciones = (
  doc: jsPDF,
  y: number,
  m: number,
  rw: number,
  observaciones: string | null
): number => {
  if (!observaciones?.trim()) return y;
  const obsH = 10;
  doc.setFillColor(255, 253, 230);
  doc.rect(m, y, rw, obsH, "F");
  doc.setDrawColor(200, 180, 100);
  doc.rect(m, y, rw, obsH);
  doc.setTextColor(80, 60, 0);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("Observaciones:", m + 2, y + 4);
  doc.setFont("helvetica", "normal");
  const maxW = rw - 32;
  const lines = doc.splitTextToSize(observaciones.trim(), maxW);
  doc.text(lines[0], m + 30, y + 4);
  if (lines[1]) doc.text(lines[1], m + 2, y + 8);
  return y + obsH;
};

const dibujarPie = (
  doc: jsPDF,
  y: number,
  m: number,
  rw: number,
  recibidoOscuro = false // Parámetro conservado por compatibilidad, ya no se usa
) => {
  const pieH = 18;
  const leyW = rw * 0.38;
  const recW = rw * 0.38;
  const totW = rw - leyW - recW;
  const leyX = m;
  const recX = m + leyW;
  const totX = m + leyW + recW;

  // Fondo y bordes del pie
  doc.setFillColor(245, 245, 245);
  doc.rect(leyX, y, rw, pieH, "F");
  doc.setDrawColor(180, 180, 180);
  doc.rect(leyX, y, rw, pieH);
  doc.line(recX, y, recX, y + pieH);
  doc.line(totX, y, totX, y + pieH);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");

  // Texto legal izquierdo
  [
    "Debo(emos) y pagare(mos) incondicionalmente a la orden de",
    "Grupeb SA de CV a la vista la cantidad senalada importe de",
    "las mercancias recibidas de conformidad, si no fuere pagada",
    "a su vencimiento causara intereses moratorios del _____%.",
  ].forEach((linea, i) => {
    doc.text(linea, leyX + 1.5, y + 4 + i * 3.3);
  });

  // --- SECCIÓN RECIBIDO (solo Nombre y Firma) ---
  doc.setTextColor(0, 0, 0);

  // ── NOMBRE ─────────────────────────
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");

  doc.text("Nombre:", recX + 1.5, y + 5);

  doc.setDrawColor(100, 100, 100);

  doc.line(recX + 14, y + 5, recX + recW - 10, y + 5);

  // ── FIRMA ──────────────────────────
  doc.line(recX + 10, y + 13, recX + recW - 10, y + 13);

  // texto debajo centrado
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  doc.text("Firma", recX + recW / 2, y + 17, { align: "center" });

  // --- SECCIÓN TOTALES ---
  const subH = pieH / 3;
  ["SUB TOTAL", "IVA", "TOTAL"].forEach((label, i) => {
    const ty = y + i * subH;
    doc.setFillColor(245, 245, 245);
    doc.rect(totX, ty, totW, subH, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(totX, ty, totW, subH);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(label, totX + 1.5, ty + subH / 2 + 2);
  });
};

// ─────────────────────────────────────────────────────────────────
// NOTA SIMPLE
// ─────────────────────────────────────────────────────────────────
const dibujarNota = (
  doc: jsPDF,
  data: NotaRemisionData,
  offsetY: number,
  etiqueta: "ORIGINAL" | "COPIA"
) => {
  const W = 215.9;
  const m = 10;
  const rw = W - m * 2;
  let y = offsetY + 6;

  doc.setFillColor(74, 103, 65);
  doc.rect(m, y, rw, 14, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Grupeb SA de CV", m + 23, y + 6);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("RFC GRU110202DS5", m + 23, y + 10);
  doc.text(
    "Calle Rogelio Ledesma #102, Col. Cruz Vieja, C.P. 45644, Tlajomulco de Zuniga, Jalisco",
    m + 23,
    y + 13.5
  );
  doc.text("Tel: 31801460 / 31259595 / 31803373", m + 75, y + 10);

  doc.addImage(logoGrupeb, "PNG", m + 1, y - 0.5, 15, 15);

  doc.setFillColor(30, 30, 30);
  doc.rect(W - m - 52, y, 52, 14, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("NOTA DE REMISION", W - m - 26, y + 4.5, { align: "center" });

  doc.setFontSize(11);
  doc.text(`No. ${data.no_nota}`, W - m - 26, y + 9, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");

  const fecha = new Date(data.envio.fecha_envio).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  doc.text(`Fecha: ${fecha}`, W - m - 26, y + 13, { align: "center" });

  y += 16;

  const clienteY = y;
  const clienteH = 16;

  doc.setFillColor(245, 245, 245);
  doc.rect(m, clienteY, rw, clienteH, "F");

  doc.setDrawColor(180, 180, 180);
  doc.rect(m, clienteY, rw, clienteH);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  doc.text("Cliente:", m + 2, clienteY + 4);
  doc.text("Pedido No.:", m + 2, clienteY + 9);
  doc.text("Direccion:", m + 2, clienteY + 14);

  doc.setFont("helvetica", "normal");
  doc.text(texto(data.cliente.nombre), m + 22, clienteY + 4);
  doc.text(texto(data.envio.no_pedido), m + 22, clienteY + 9);
  doc.text(texto(data.cliente.direccion), m + 22, clienteY + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(
    etiqueta === "ORIGINAL" ? 220 : 210,
    etiqueta === "ORIGINAL" ? 230 : 210,
    etiqueta === "ORIGINAL" ? 215 : 210
  );
  doc.text(etiqueta, m + rw * 0.9, clienteY + clienteH / 2 - 1, {
    align: "center",
    angle: -10,
  });

  y += 18;

  const cols = [
    { label: "Cantidad", x: m, w: 28 },
    { label: "Descripcion", x: m + 28, w: 75 },
    { label: "Cajas/Bultos", x: m + 103, w: 24 },
    { label: "Precio", x: m + 127, w: 30 },
    { label: "Importe", x: m + 157, w: rw - 157 },
  ];

  doc.setFillColor(74, 103, 65);
  doc.rect(m, y, rw, 7, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");

  cols.forEach((col) => {
    doc.text(col.label, col.x + col.w / 2, y + 5, { align: "center" });
  });

  y += 7;

  const rowH = 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  data.productos.forEach((prod, i) => {
    doc.setFillColor(
      i % 2 === 0 ? 255 : 245,
      i % 2 === 0 ? 255 : 245,
      i % 2 === 0 ? 255 : 245
    );

    doc.rect(m, y, rw, rowH, "F");

    doc.setDrawColor(180, 180, 180);
    doc.rect(m, y, rw, rowH);

    doc.setTextColor(30, 30, 30);

    const cantidad = formatCantidad(prod);
    const desc = buildDescripcion(prod);

    doc.text(cantidad, cols[0].x + cols[0].w / 2, y + 5, {
      align: "center",
    });

    doc.text(desc, cols[1].x + 2, y + 5);

    doc.text(String(prod.total_bultos), cols[2].x + cols[2].w / 2, y + 5, {
      align: "center",
    });

    y += rowH;
  });

  const filasVacias = Math.max(0, 6 - data.productos.length);

  for (let i = 0; i < filasVacias; i++) {
    const idx = data.productos.length + i;

    doc.setFillColor(
      idx % 2 === 0 ? 255 : 245,
      idx % 2 === 0 ? 255 : 245,
      idx % 2 === 0 ? 255 : 245
    );

    doc.rect(m, y, rw, rowH, "F");

    doc.setDrawColor(180, 180, 180);
    doc.rect(m, y, rw, rowH);

    y += rowH;
  }

  // ── Observaciones de la nota (solo si existen) ──
  y = dibujarObservaciones(doc, y, m, rw, (data as any).observaciones || null);

  dibujarPie(doc, y, m, rw);
};

const ALTO_COPIA = 130;
const SEP = 7;

export const generarNotaRemision = async (
  data: NotaRemisionData,
  guardarEnS3 = false
): Promise<void> => {
  const doc = new jsPDF({
    unit: "mm",
    format: [215.9, 279.4],
    orientation: "portrait",
  });

  const W = 215.9;

  dibujarNota(doc, data, 5, "ORIGINAL");

  doc.setDrawColor(180, 180, 180);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(10, ALTO_COPIA + 5, W - 10, ALTO_COPIA + 5);
  doc.setLineDashPattern([], 0);

  doc.setFontSize(6);
  doc.setTextColor(180, 180, 180);
  doc.text("Cortar aqui", W / 2, ALTO_COPIA + 4, { align: "center" });

  dibujarNota(doc, data, ALTO_COPIA + SEP, "COPIA");

  const nombre = `nota-remision-${data.no_nota}.pdf`;
  doc.save(nombre);
  if (guardarEnS3) {
    const blob = doc.output("blob");
    await subirPdfA3(blob, nombre, "pdfs", "notas-remision");
  }
};

export const generarNotasMultiples = async (
  notas: NotaRemisionData[],
  guardarEnS3 = false
): Promise<void> => {
  const doc = new jsPDF({
    unit: "mm",
    format: [215.9, 279.4],
    orientation: "portrait",
  });

  const W = 215.9;

  notas.forEach((nota, index) => {
    if (index > 0) doc.addPage();

    dibujarNota(doc, nota, 5, "ORIGINAL");

    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(10, ALTO_COPIA + 5, W - 10, ALTO_COPIA + 5);
    doc.setLineDashPattern([], 0);

    doc.setFontSize(6);
    doc.setTextColor(180, 180, 180);
    doc.text("Cortar aqui", W / 2, ALTO_COPIA + 4, { align: "center" });

    dibujarNota(doc, nota, ALTO_COPIA + SEP, "COPIA");
  });

  if (guardarEnS3) {
    const nombreMulti = `notas-remision-batch-${Date.now()}.pdf`;
    const blob = doc.output("blob");
    await subirPdfA3(blob, nombreMulti, "pdfs", "notas-remision");
  }
  doc.output("dataurlnewwindow");
};

// ─────────────────────────────────────────────────────────────────
// NOTA MULTI-PEDIDO
// ─────────────────────────────────────────────────────────────────
const dibujarNotaMulti = (
  doc: jsPDF,
  data: NotaRemisionMultiData,
  offsetY: number,
  etiqueta: "ORIGINAL" | "COPIA"
) => {
  const W = 215.9;
  const m = 10;
  const rw = W - m * 2;
  let y = offsetY + 6;

  doc.setFillColor(74, 103, 65);
  doc.rect(m, y, rw, 14, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Grupeb SA de CV", m + 23, y + 6);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("RFC GRU110202DS5", m + 23, y + 10);
  doc.text(
    "Calle Rogelio Ledesma #102, Col. Cruz Vieja, C.P. 45644, Tlajomulco de Zuniga, Jalisco",
    m + 23,
    y + 13.5
  );
  doc.text("Tel: 31801460 / 31259595 / 31803373", m + 75, y + 10);

  doc.addImage(logoGrupeb, "PNG", m + 1, y - 0.5, 15, 15);

  doc.setFillColor(30, 30, 30);
  doc.rect(W - m - 52, y, 52, 14, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("NOTA DE REMISION", W - m - 26, y + 4.5, { align: "center" });

  doc.setFontSize(11);
  doc.text(`No. ${data.no_nota}`, W - m - 26, y + 9, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");

  const fecha = new Date(data.envio.fecha_envio).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  doc.text(`Fecha: ${fecha}`, W - m - 26, y + 13, { align: "center" });

  y += 16;

  const clienteY = y;
  const clienteH = 22;

  doc.setFillColor(245, 245, 245);
  doc.rect(m, clienteY, rw, clienteH, "F");

  doc.setDrawColor(180, 180, 180);
  doc.rect(m, clienteY, rw, clienteH);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  doc.text("Cliente:", m + 2, clienteY + 4);
  doc.text("Pedidos No.:", m + 2, clienteY + 9);
  doc.text("Direccion:", m + 2, clienteY + 14);
  doc.text("Entrega:", m + 2, clienteY + 19);

  doc.setFont("helvetica", "normal");
  doc.text(texto(data.cliente.nombre), m + 26, clienteY + 4);
  doc.text(texto(data.envio.no_pedido), m + 26, clienteY + 9);
  doc.text(texto(data.cliente.direccion), m + 26, clienteY + 14);

  const tipoLabel =
    data.tipo_entrega === "local"
      ? `Envío local${data.chofer ? ` — ${data.chofer.nombre}` : ""}${
          data.unidad ? ` — ${data.unidad.nombre}` : ""
        }`
      : "Recolección en planta";

  doc.text(tipoLabel, m + 26, clienteY + 19);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(
    etiqueta === "ORIGINAL" ? 220 : 210,
    etiqueta === "ORIGINAL" ? 230 : 210,
    etiqueta === "ORIGINAL" ? 215 : 210
  );

  doc.text(etiqueta, m + rw * 0.9, clienteY + clienteH / 2 - 1, {
    align: "center",
    angle: -10,
  });

  y += clienteH + 2;

  const cols = [
    { label: "Pedido", x: m, w: 20 },
    { label: "Cantidad", x: m + 20, w: 24 },
    { label: "Descripcion", x: m + 44, w: 100 },
    { label: "Cajas/Bultos", x: m + 144, w: 28 },
    { label: "Precio", x: m + 172, w: 12 },
    { label: "Importe", x: m + 184, w: rw - 184 },
  ];

  doc.setFillColor(74, 103, 65);
  doc.rect(m, y, rw, 7, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");

  cols.forEach((col) => {
    doc.text(col.label, col.x + col.w / 2, y + 5, { align: "center" });
  });

  y += 7;

  const rowH = 7;

  let rowIndex = 0;

  data.productos.forEach((prod) => {
    doc.setFillColor(
      rowIndex % 2 === 0 ? 255 : 245,
      rowIndex % 2 === 0 ? 255 : 245,
      rowIndex % 2 === 0 ? 255 : 245
    );

    doc.rect(m, y, rw, rowH, "F");

    doc.setDrawColor(180, 180, 180);
    doc.rect(m, y, rw, rowH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);

    const cantidad = formatCantidad(prod);
    const desc = buildDescripcion(prod);

    doc.setFont("helvetica", "bold");
    doc.text(texto(prod.no_pedido), cols[0].x + cols[0].w / 2, y + 5, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.text(cantidad, cols[1].x + cols[1].w / 2, y + 5, {
      align: "center",
    });

    doc.text(desc, cols[2].x + 2, y + 5);

    doc.text(String(prod.total_bultos), cols[3].x + cols[3].w / 2, y + 5, {
      align: "center",
    });

    y += rowH;
    rowIndex++;
  });

  const filasVacias = Math.max(0, 6 - data.productos.length);

  for (let i = 0; i < filasVacias; i++) {
    const idx = data.productos.length + i;

    doc.setFillColor(
      idx % 2 === 0 ? 255 : 245,
      idx % 2 === 0 ? 255 : 245,
      idx % 2 === 0 ? 255 : 245
    );

    doc.rect(m, y, rw, rowH, "F");

    doc.setDrawColor(180, 180, 180);
    doc.rect(m, y, rw, rowH);

    y += rowH;
  }

  // ── Observaciones de la nota multi ──
  y = dibujarObservaciones(doc, y, m, rw, data.observaciones || null);

  dibujarPie(doc, y, m, rw, true);
};

const ALTO_COPIA_MULTI = 138;
const SEP_MULTI = 7;

export const generarNotaRemisionMulti = async (
  data: NotaRemisionMultiData,
  guardarEnS3 = false
): Promise<void> => {
  const doc = new jsPDF({
    unit: "mm",
    format: [215.9, 279.4],
    orientation: "portrait",
  });

  const W = 215.9;

  dibujarNotaMulti(doc, data, 5, "ORIGINAL");

  doc.setDrawColor(180, 180, 180);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(10, ALTO_COPIA_MULTI + 5, W - 10, ALTO_COPIA_MULTI + 5);
  doc.setLineDashPattern([], 0);

  doc.setFontSize(6);
  doc.setTextColor(180, 180, 180);
  doc.text("Cortar aqui", W / 2, ALTO_COPIA_MULTI + 4, { align: "center" });

  dibujarNotaMulti(doc, data, ALTO_COPIA_MULTI + SEP_MULTI, "COPIA");

  const nombre = `nota-remision-${data.no_nota}.pdf`;
  doc.save(nombre);
  if (guardarEnS3) {
    const blob = doc.output("blob");
    await subirPdfA3(blob, nombre, "pdfs", "notas-remision");
  }
};