import jsPDF from "jspdf";
import type { NotaRemisionData } from "../services/enviosService";
import type { NotaRemisionMultiData } from "../types/envios.types";
import logoGrupeb from "../assets/grupeblanco.png";

// ─────────────────────────────────────────────────────────────────
// NOTA SIMPLE (sin cambios respecto al original)
// ─────────────────────────────────────────────────────────────────
const dibujarNota = (
  doc: jsPDF,
  data: NotaRemisionData,
  offsetY: number,
  etiqueta: "ORIGINAL" | "COPIA"
) => {
  const W  = 215.9;
  const m  = 10;
  const rw = W - m * 2;
  let y = offsetY + 6;

  // ── ENCABEZADO verde ──
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
    m + 23, y + 13.5
  );
  doc.text("Tel: 31801460 / 31259595 / 31803373", m + 75, y + 10);
  doc.addImage(logoGrupeb, "PNG", m + 1, y - 0.5, 15, 15);

  // Caja negra NOTA DE REMISION
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
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  doc.text(`Fecha: ${fecha}`, W - m - 26, y + 13, { align: "center" });
  y += 16;

  // ── DATOS CLIENTE ──
  const clienteY = y;
  const clienteH = 16;

  doc.setFillColor(245, 245, 245);
  doc.rect(m, clienteY, rw, clienteH, "F");
  doc.setDrawColor(180, 180, 180);
  doc.rect(m, clienteY, rw, clienteH);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:",    m + 2, clienteY + 4);
  doc.text("Pedido No.:", m + 2, clienteY + 9);
  doc.text("Direccion:",  m + 2, clienteY + 14);
  doc.setFont("helvetica", "normal");
  doc.text(data.cliente.nombre,    m + 22, clienteY + 4);
  doc.text(data.envio.no_pedido,   m + 22, clienteY + 9);
  doc.text(data.cliente.direccion, m + 22, clienteY + 14);

  // Marca de agua ORIGINAL / COPIA
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(
    etiqueta === "ORIGINAL" ? 220 : 210,
    etiqueta === "ORIGINAL" ? 230 : 210,
    etiqueta === "ORIGINAL" ? 215 : 210,
  );
  doc.text(etiqueta, m + rw * 0.90, clienteY + clienteH / 2 - 1, {
    align: "center",
    angle: -10,
  });

  y += 18;

  // ── TABLA HEADERS ──
  const cols = [
    { label: "Cantidad",     x: m,        w: 28 },
    { label: "Descripcion",  x: m + 28,   w: 75 },
    { label: "Cajas/Bultos", x: m + 103,  w: 24 },
    { label: "Precio",       x: m + 127,  w: 30 },
    { label: "Importe",      x: m + 157,  w: rw - 157 },
  ];

  doc.setFillColor(74, 103, 65);
  doc.rect(m, y, rw, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  cols.forEach(col => {
    doc.text(col.label, col.x + col.w / 2, y + 5, { align: "center" });
  });
  y += 7;

  // ── FILAS PRODUCTOS ──
  const rowH = 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  data.productos.forEach((prod, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 245, i % 2 === 0 ? 255 : 245, i % 2 === 0 ? 255 : 245);
    doc.rect(m, y, rw, rowH, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(m, y, rw, rowH);
    doc.setTextColor(30, 30, 30);

    const cantidad = prod.total_unidades != null
      ? `${prod.total_unidades.toLocaleString("es-MX")} pzas`
      : prod.total_kg != null
        ? `${prod.total_kg.toLocaleString("es-MX")} kg`
        : "-";

    doc.text(cantidad, cols[0].x + cols[0].w / 2, y + 5, { align: "center" });
    const desc = `${prod.nombre_producto}${prod.medida ? ` (${prod.medida})` : ""}`;
    doc.text(desc, cols[1].x + 2, y + 5);
    doc.text(String(prod.total_bultos), cols[2].x + cols[2].w / 2, y + 5, { align: "center" });
    y += rowH;
  });

  // Filas vacías mínimo 6
  const filasVacias = Math.max(0, 6 - data.productos.length);
  for (let i = 0; i < filasVacias; i++) {
    const idx = data.productos.length + i;
    doc.setFillColor(idx % 2 === 0 ? 255 : 245, idx % 2 === 0 ? 255 : 245, idx % 2 === 0 ? 255 : 245);
    doc.rect(m, y, rw, rowH, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(m, y, rw, rowH);
    y += rowH;
  }

  // ── PIE ──
  const pieH = 18;
  const leyW = rw * 0.38;
  const recW = rw * 0.38;
  const totW = rw - leyW - recW;
  const leyX = m;
  const recX = m + leyW;
  const totX = m + leyW + recW;

  doc.setFillColor(245, 245, 245);
  doc.rect(leyX, y, rw, pieH, "F");
  doc.setDrawColor(180, 180, 180);
  doc.rect(leyX, y, rw, pieH);
  doc.line(recX, y, recX, y + pieH);
  doc.line(totX, y, totX, y + pieH);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  [
    "Debo(emos) y pagare(mos) incondicionalmente a la orden de",
    "Grupeb SA de CV a la vista la cantidad senalada importe de",
    "las mercancias recibidas de conformidad, si no fuere pagada",
    "a su vencimiento causara intereses moratorios del _____%.",
  ].forEach((linea, i) => {
    doc.text(linea, leyX + 1.5, y + 4 + i * 3.3);
  });

  doc.setFillColor(10, 10, 10);
  doc.rect(recX, y, recW, 5, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("Recibido por:", recX + 1.5, y + 3.5);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Nombre:",  recX + 1.5, y + 8.5);
  doc.text("Empresa:", recX + 1.5, y + 12.5);
  doc.text("FIRMA",    recX + 1.5, y + 16.5);
  doc.setDrawColor(100, 100, 100);
  doc.line(recX + 14, y + 8.5,  recX + recW - 1, y + 8.5);
  doc.line(recX + 14, y + 12.5, recX + recW - 1, y + 12.5);
  doc.line(recX + 10, y + 16.5, recX + recW - 1, y + 16.5);

  const subH = pieH / 3;
  [
    { label: "SUB TOTAL", dark: false },
    { label: "IVA",       dark: false },
    { label: "TOTAL",     dark: false },
  ].forEach(({ label, dark }, i) => {
    const ty = y + i * subH;
    doc.setFillColor(dark ? 30 : 245, dark ? 30 : 245, dark ? 30 : 245);
    doc.rect(totX, ty, totW, subH, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(totX, ty, totW, subH);
    doc.setTextColor(dark ? 255 : 30, dark ? 255 : 30, dark ? 255 : 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(label, totX + 1.5, ty + subH / 2 + 2);
  });
};

// ── Una nota (2 copias) por pedido ──
const ALTO_COPIA = 130;
const SEP        = 7;

export const generarNotaRemision = async (data: NotaRemisionData): Promise<void> => {
  const doc = new jsPDF({
    unit:        "mm",
    format:      [215.9, 279.4],
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

  doc.output("dataurlnewwindow");
};

// ── Múltiples notas simples en un solo PDF (procesar carrito — sin cambios) ──
export const generarNotasMultiples = async (notas: NotaRemisionData[]): Promise<void> => {
  const doc = new jsPDF({
    unit:        "mm",
    format:      [215.9, 279.4],
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

  doc.output("dataurlnewwindow");
};

// ─────────────────────────────────────────────────────────────────
// NOTA MULTI-PEDIDO (NUEVA)
// ─────────────────────────────────────────────────────────────────
const dibujarNotaMulti = (
  doc: jsPDF,
  data: NotaRemisionMultiData,
  offsetY: number,
  etiqueta: "ORIGINAL" | "COPIA"
) => {
  const W  = 215.9;
  const m  = 10;
  const rw = W - m * 2;
  let y = offsetY + 6;

  // ── ENCABEZADO verde ──
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
    m + 23, y + 13.5
  );
  doc.text("Tel: 31801460 / 31259595 / 31803373", m + 75, y + 10);
  doc.addImage(logoGrupeb, "PNG", m + 1, y - 0.5, 15, 15);

  // Caja negra NOTA DE REMISION
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
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  doc.text(`Fecha: ${fecha}`, W - m - 26, y + 13, { align: "center" });
  y += 16;

  // ── DATOS CLIENTE — altura extra para tipo de entrega ──
  const clienteY = y;
  const clienteH = 22;

  doc.setFillColor(245, 245, 245);
  doc.rect(m, clienteY, rw, clienteH, "F");
  doc.setDrawColor(180, 180, 180);
  doc.rect(m, clienteY, rw, clienteH);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:",      m + 2, clienteY + 4);
  doc.text("Pedidos No.:",  m + 2, clienteY + 9);
  doc.text("Direccion:",    m + 2, clienteY + 14);
  doc.text("Entrega:",      m + 2, clienteY + 19);
  doc.setFont("helvetica", "normal");
  doc.text(data.cliente.nombre,           m + 26, clienteY + 4);
  // no_pedido ya viene como string separada por coma desde el back
  doc.text(data.envio.no_pedido,          m + 26, clienteY + 9);
  doc.text(data.cliente.direccion || "-", m + 26, clienteY + 14);
  const tipoLabel = data.tipo_entrega === "local"
    ? `Envío local${data.chofer ? ` — ${data.chofer.nombre}` : ""}${data.unidad ? ` — ${data.unidad.nombre}` : ""}`
    : "Recolección en planta";
  doc.text(tipoLabel, m + 26, clienteY + 19);

  // Marca de agua
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(
    etiqueta === "ORIGINAL" ? 220 : 210,
    etiqueta === "ORIGINAL" ? 230 : 210,
    etiqueta === "ORIGINAL" ? 215 : 210,
  );
  doc.text(etiqueta, m + rw * 0.90, clienteY + clienteH / 2 - 1, {
    align: "center",
    angle: -10,
  });

  y += clienteH + 2;

  // ── TABLA HEADERS — columna extra "Pedido" ──
  const cols = [
    { label: "Pedido",       x: m,        w: 24 },
    { label: "Cantidad",     x: m + 24,   w: 28 },
    { label: "Descripcion",  x: m + 52,   w: 58 },
    { label: "Cajas/Bultos", x: m + 110,  w: 24 },
    { label: "Precio",       x: m + 134,  w: 26 },
    { label: "Importe",      x: m + 160,  w: rw - 160 },
  ];

  doc.setFillColor(74, 103, 65);
  doc.rect(m, y, rw, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  cols.forEach(col => {
    doc.text(col.label, col.x + col.w / 2, y + 5, { align: "center" });
  });
  y += 7;

  // ── FILAS PRODUCTOS ──
  const rowH = 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  data.productos.forEach((prod, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 245, i % 2 === 0 ? 255 : 245, i % 2 === 0 ? 255 : 245);
    doc.rect(m, y, rw, rowH, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(m, y, rw, rowH);
    doc.setTextColor(30, 30, 30);

    const cantidad = prod.total_unidades != null
      ? `${prod.total_unidades.toLocaleString("es-MX")} pzas`
      : prod.total_kg != null
        ? `${prod.total_kg.toLocaleString("es-MX")} kg`
        : "-";

    doc.text(prod.no_pedido || "",                    cols[0].x + cols[0].w / 2, y + 5, { align: "center" });
    doc.text(cantidad,                                 cols[1].x + cols[1].w / 2, y + 5, { align: "center" });
    const desc = `${prod.nombre_producto}${prod.medida ? ` (${prod.medida})` : ""}`;
    doc.text(desc, cols[2].x + 2, y + 5);
    doc.text(String(prod.total_bultos),                cols[3].x + cols[3].w / 2, y + 5, { align: "center" });
    y += rowH;
  });

  // Filas vacías mínimo 5
  const filasVacias = Math.max(0, 5 - data.productos.length);
  for (let i = 0; i < filasVacias; i++) {
    const idx = data.productos.length + i;
    doc.setFillColor(idx % 2 === 0 ? 255 : 245, idx % 2 === 0 ? 255 : 245, idx % 2 === 0 ? 255 : 245);
    doc.rect(m, y, rw, rowH, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(m, y, rw, rowH);
    y += rowH;
  }

  // ── PIE (idéntico al original) ──
  const pieH = 18;
  const leyW = rw * 0.38;
  const recW = rw * 0.38;
  const totW = rw - leyW - recW;
  const leyX = m;
  const recX = m + leyW;
  const totX = m + leyW + recW;

  doc.setFillColor(245, 245, 245);
  doc.rect(leyX, y, rw, pieH, "F");
  doc.setDrawColor(180, 180, 180);
  doc.rect(leyX, y, rw, pieH);
  doc.line(recX, y, recX, y + pieH);
  doc.line(totX, y, totX, y + pieH);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  [
    "Debo(emos) y pagare(mos) incondicionalmente a la orden de",
    "Grupeb SA de CV a la vista la cantidad senalada importe de",
    "las mercancias recibidas de conformidad, si no fuere pagada",
    "a su vencimiento causara intereses moratorios del _____%.",
  ].forEach((linea, i) => {
    doc.text(linea, leyX + 1.5, y + 4 + i * 3.3);
  });

  doc.setFillColor(100, 100, 100);
  doc.rect(recX, y, recW, 5, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("Recibido por:", recX + 1.5, y + 3.5);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Nombre:",  recX + 1.5, y + 8.5);
  doc.text("Empresa:", recX + 1.5, y + 12.5);
  doc.text("FIRMA",    recX + 1.5, y + 16.5);
  doc.setDrawColor(100, 100, 100);
  doc.line(recX + 14, y + 8.5,  recX + recW - 1, y + 8.5);
  doc.line(recX + 14, y + 12.5, recX + recW - 1, y + 12.5);
  doc.line(recX + 10, y + 16.5, recX + recW - 1, y + 16.5);

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

// Alto ligeramente mayor por la fila extra de tipo de entrega
const ALTO_COPIA_MULTI = 138;
const SEP_MULTI        = 7;

export const generarNotaRemisionMulti = async (data: NotaRemisionMultiData): Promise<void> => {
  const doc = new jsPDF({
    unit:        "mm",
    format:      [215.9, 279.4],
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

  doc.output("dataurlnewwindow");
};