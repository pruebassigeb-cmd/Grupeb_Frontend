// generarPdfPedido.ts — LANDSCAPE CARTA / MEMBRETADO 300x210
// Detección automática: solo plástico → tabla plástico, solo papel → tabla papel, mixto → tabla general

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  cargarLogoBase64,
  val, boolLabel, parsePantones, getMedida, tipoProducto,
  formatCantidadCelda, formatImporte,
  dibujarEncabezado, dibujarCajasPie, dibujarPiePagina,
  GRAY_DARK, GRAY_MED, GRAY_LIGHT, GRAY_ROW, BLACK, WHITE,
} from "./Pdfutils";
import type { ProductoPdf } from "./Pdfutils";
import logoUrl from "../assets/logogrupeb.png";
import { subirPdfA3 } from "./pdfS3.service";

interface PedidoPdf {
  no_pedido: string;
  no_cotizacion?: string | null;
  fecha: string;
  cliente: string;
  empresa: string;
  telefono: string;
  correo: string;
  impresion?: string | null;
  logoBase64?: string;
  productos: ProductoPdf[];
  subtotal: number;
  iva: number;
  total: number;
  anticipo: number;
  saldo: number;
  sin_iva?: boolean;
  celular?: string | null;
  razon_social?: string | null;
  rfc?: string | null;
  domicilio?: string | null;
  numero?: string | null;
  colonia?: string | null;
  codigo_postal?: string | null;
  poblacion?: string | null;
  estado_cliente?: string | null;
  cliente_id?: number | null;
  identificar?: string | null;
}

// ── Formato de hoja ───────────────────────────────────────────────────────────
export type FormatoPedidoPdf = "carta" | "membretado";

interface DimensionesFormato {
  PW: number;
  PH: number;
  formatoJsPdf: [number, number] | string;
  ocultarLogo: boolean;
}

function resolverDimensiones(formato: FormatoPedidoPdf): DimensionesFormato {
  if (formato === "membretado") {
    // La hoja membretada física mide 290 × 210 mm — un tamaño NO estándar que
    // los drivers de impresora no reconocen, lo que provoca escalados y
    // rotaciones impredecibles al imprimir. En su lugar el PDF se genera en
    // A4 apaisado (297 × 210 mm), tamaño estándar que todo driver conoce,
    // pero el contenido se maqueta dentro de 290 mm de ancho (PW = 290).
    // Así, al imprimir en "Tamaño real / 100%" con papel A4, el contenido cae
    // exactamente sobre la hoja de 290 mm con márgenes simétricos de 10 mm,
    // y los 7 mm sobrantes del A4 quedan en blanco fuera de la hoja física.
    return { PW: 290, PH: 210, formatoJsPdf: "a4", ocultarLogo: true };
  }
  return { PW: 279.4, PH: 215.9, formatoJsPdf: "letter", ocultarLogo: false };
}

// ── Detección de tipo ─────────────────────────────────────────────────────────
const esPapelProd = (p: ProductoPdf): boolean =>
  (p as any).tipo_material === "papel" ||
  (p as any).tipoCotizacion === "papel" ||
  (p as any).idproducto_papel != null ||
  (p as any).producto_papel_idproducto_papel != null;

const boolPdf = (value: unknown): string => boolLabel(value === true);

// ── Helper: separar material y calibre ───────────────────────────────────────
function parsearMaterialYCalibre(
  grupDesc: string, fallbackMaterial: string, fallbackCalibre: string
): { materialStr: string; calibreStr: string } {
  if (!grupDesc) return { materialStr: fallbackMaterial, calibreStr: fallbackCalibre };
  const partes = grupDesc.split(/\s*\+\s*/).map((s: string) => s.trim());
  const regexCalibre = /(\d+(?:\.\d+)?\s*(?:pts|gms|ect))/gi;
  const materialStr = partes.map((p: string) => p.replace(regexCalibre, "").trim()).filter(Boolean).join(" + ") || fallbackMaterial;
  const calibreStr = partes.map((p: string) => { const m = p.match(/(\d+(?:\.\d+)?\s*(?:pts|gms|ect))/i); return m ? m[1] : ""; }).filter(Boolean).join(" / ") || fallbackCalibre;
  return { materialStr, calibreStr };
}

// ── Helper: celda diagonal ───────────────────────────────────────────────────
function dibujarCeldaTintasDiagonal(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  exterior: string, interior: string, bgColor: [number, number, number]
) {
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(x, y, w, h, "F");
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  doc.line(x, y + h, x + w, y);
  doc.setFontSize(6); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
  doc.text(exterior, x + 1.5, y + 3.5, { maxWidth: w - 3 });
  doc.setFontSize(6); doc.setTextColor(80, 80, 80);
  doc.text(interior, x + w - 1.5, y + h - 1.5, { align: "right", maxWidth: w - 3 });
}

// ── Helper: fila observaciones ────────────────────────────────────────────────
function buildObsRow(prod: ProductoPdf, headLength: number): string[] | null {
  const hasHerr = prod.herramental_precio != null && prod.herramental_precio > 0;
  const hasObs = !!prod.observacion?.trim();

  if (!hasObs && !hasHerr) return null;

  const comboRow = new Array(headLength).fill("");
  if (hasObs) comboRow[0] = `Obs: ${prod.observacion!.trim()}`;
  if (hasHerr) {
    const nombreHerr = prod.herramental_descripcion?.trim() || "Herramental / molde";
    comboRow[1] = `Herramental: ${nombreHerr}  —  Cargo único.`;
    comboRow[headLength - 1] = `$${Number(prod.herramental_precio).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return comboRow;
}

// ── Helper: didParseCell compartido para filas Obs ───────────────────────────
function parseObsCell(data: any, headAll: string[], MID_COL: number) {
  const raw = data.row.raw as any[];
  const raw0 = String(raw?.[0] ?? "");
  const raw1 = String(raw?.[1] ?? "");
  const ci = data.column.index;
  const lastCol = headAll.length - 1;

  if (!raw0.startsWith("Obs:")) return false;

  const hasHerr = raw1.startsWith("Herramental:");
  if (ci === 0) {
    data.cell.colSpan = hasHerr ? MID_COL : headAll.length;
    data.cell.styles.fillColor = WHITE;
    data.cell.styles.fontStyle = "italic";
    data.cell.styles.fontSize = 6.5;
    data.cell.styles.textColor = BLACK;
    data.cell.styles.halign = "left";
    data.cell.styles.cellPadding = 0.8;
  } else if (hasHerr && ci === MID_COL) {
    data.cell.colSpan = lastCol - MID_COL;
    data.cell.styles.fillColor = WHITE;
    data.cell.styles.fontStyle = "italic";
    data.cell.styles.fontSize = 6.5;
    data.cell.styles.textColor = BLACK;
    data.cell.styles.halign = "left";
    data.cell.styles.overflow = "linebreak";
    data.cell.styles.cellPadding = 0.8;
    data.cell.text = [raw1];
  } else if (hasHerr && ci === lastCol) {
    data.cell.styles.fillColor = WHITE;
    data.cell.styles.fontStyle = "bold";
    data.cell.styles.fontSize = 9;
    data.cell.styles.textColor = BLACK;
    data.cell.styles.halign = "center";
  } else {
    data.cell.styles.fillColor = WHITE;
    data.cell.text = [];
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLA PEDIDO SOLO PLÁSTICO
// Columnas: Descripción | Medida | Tintas E/I | Caras | Material | Calibre |
//           Asa/Suaje | Pantones | Pigmento | Perf. | Cantidad/Precio | Importe
// ═══════════════════════════════════════════════════════════════════════════════
function renderTablaPlasticoPedido(
  doc: jsPDF, productos: ProductoPdf[], startY: number,
  M: number, PW: number, footerH: number
): number {
  const headAll = ["Descripción", "Medida", "Tintas", "Caras", "Material", "Calibre", "Asa/Suaje", "Pantones", "Pigmento", "Perf.", "Cantidad / Precio", "Importe"];
  const MID_COL = Math.floor(headAll.length / 2);
  const bodyRows: any[][] = [];

  productos.forEach(prod => {
    const det = prod.detalles.find(d => d.cantidad > 0);
    const descripcion = (prod as any).descripcion?.trim() || null;
    const tintasExt = prod.tintas != null ? String(prod.tintas) : "—";
    const tintasInt = (prod as any).tintasDentro != null && (prod as any).tintasDentro > 0
      ? String((prod as any).tintasDentro) : "—";
    const tieneDiagonal = tintasInt !== "—";
    const asaMostrar = (prod as any).asa_nombre ? String((prod as any).asa_nombre).trim() : boolLabel(prod.asa_suaje);

    bodyRows.push([
      descripcion ? `${tipoProducto(prod.nombre)}\n${descripcion}` : tipoProducto(prod.nombre),
      getMedida(prod),
      `${tintasExt}x${tintasInt === "—" ? "0" : tintasInt}`,
      val(prod.caras),
      val(prod.material),
      val(prod.calibre),
      asaMostrar,
      parsePantones(prod.pantones),
      prod.pigmentos ? String(prod.pigmentos).trim() || "—" : "—",
      prod.perforacion ? "SI" : "—",
      det ? formatCantidadCelda(det, prod.por_kilo) : "—",
      det ? formatImporte(det, prod.por_kilo) : "—",
    ]);

const obsRow = buildObsRow(prod, headAll.length);
    if (obsRow) bodyRows.push(obsRow);
    });

  const availW = PW - M * 2;
  const colW: Record<number, number> = { 0: 30, 1: 17, 2: 12, 3: 10, 4: 20, 5: 13, 6: 16, 7: 25, 8: 16, 9: 8 };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  const remaining = Math.max(availW - fixedTotal, 30);
  colW[10] = Math.round(remaining * 0.55);
  colW[11] = Math.round(remaining * 0.45);

  autoTable(doc, {
    startY, margin: { left: M, right: M, bottom: footerH + M },
    head: [headAll], body: bodyRows, theme: "grid",
    headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: "bold", fontSize: 7, cellPadding: 1.2, halign: "center", valign: "middle" },
    bodyStyles: { fontSize: 7, textColor: [0, 0, 0], cellPadding: 1.2, valign: "middle", minCellHeight: 7 },
    alternateRowStyles: { fillColor: WHITE },
    columnStyles: {
      0:  { cellWidth: colW[0],  halign: "left",   fontSize: 8, overflow: "linebreak" },
      1:  { cellWidth: colW[1],  halign: "center", fontSize: 8 },
      2:  { cellWidth: colW[2],  halign: "center", fontSize: 8 },
      3:  { cellWidth: colW[3],  halign: "center", fontSize: 8 },
      4:  { cellWidth: colW[4],  halign: "center", fontSize: 8, overflow: "linebreak" },
      5:  { cellWidth: colW[5],  halign: "center", fontSize: 8 },
      6:  { cellWidth: colW[6],  halign: "center", fontSize: 8, overflow: "linebreak" },
      7:  { cellWidth: colW[7],  halign: "left",   fontSize: 8, overflow: "linebreak" },
      8:  { cellWidth: colW[8],  halign: "center", fontSize: 8, overflow: "linebreak" },
      9:  { cellWidth: colW[9],  halign: "center", fontSize: 8 },
      10: { cellWidth: colW[10], halign: "center", fontSize: 9, textColor: BLACK },
      11: { cellWidth: colW[11], halign: "center", fontSize: 9, fontStyle: "bold", textColor: BLACK },
    },
    didParseCell(data) {
      if (data.section === "head" && (data.column.index === 10 || data.column.index === 11)) {
        data.cell.styles.fillColor = BLACK;
        data.cell.styles.textColor = WHITE;
      }
      if (data.section === "body") {
        const raw = data.row.raw as any[];
        const ci = data.column.index;
        if (ci === 2 && !String(raw?.[0] ?? "").startsWith("Obs:") && String(raw?.[2] ?? "").startsWith("DIAG:")) data.cell.text = [];
        parseObsCell(data, headAll, MID_COL);
      }
    },
    didDrawCell(data) {
      if (data.section !== "body" || data.column.index !== 2) return;
      const raw = data.row.raw as any[];
      if (String(raw?.[0] ?? "").startsWith("Obs:")) return;
      const cellVal = String(raw?.[2] ?? "");
      if (!cellVal.startsWith("DIAG:")) return;
      const partes = cellVal.replace("DIAG:", "").split("|");
      const bg: [number, number, number] = data.row.index % 2 === 0 ? [255, 255, 255]
        : [(GRAY_ROW as number[])[0] ?? 245, (GRAY_ROW as number[])[1] ?? 245, (GRAY_ROW as number[])[2] ?? 245];
      dibujarCeldaTintasDiagonal(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, partes[0] ?? "—", partes[1] ?? "—", bg);
    },
  });
  return (doc as any).lastAutoTable?.finalY ?? startY;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLA PEDIDO SOLO PAPEL
// Columnas: Descripción | Medida | Tintas E/I | Material |
//           Foil | Asa/Suaje | Alto Rel | Laminado | UV | Textura | Pantones |
//           Cantidad/Precio | Importe
// ═══════════════════════════════════════════════════════════════════════════════
function renderTablaPapelPedido(
  doc: jsPDF, productos: ProductoPdf[], startY: number,
  M: number, PW: number, footerH: number
): number {
  const headAll = ["Descripción", "Medida", "Tintas", "Material", "HS", "Asa/Suaje", "AR", "Laminado", "UV", "Textura", "Pantones", "Cantidad / Precio", "Importe"];
  const MID_COL = Math.floor(headAll.length / 2);
  const bodyRows: any[][] = [];

  productos.forEach(prod => {
    const det = prod.detalles.find(d => d.cantidad > 0);
    const descripcion = (prod as any).descripcion?.trim() || null;
    const grupDesc: string = (prod as any).grupo_descripcion ?? "";
    const { materialStr } = parsearMaterialYCalibre(grupDesc, val(prod.material), val(prod.calibre));
    const tintasExt = prod.tintas != null ? String(prod.tintas) : "—";
    const tintasInt = (prod as any).tintasDentro != null && (prod as any).tintasDentro > 0
      ? String((prod as any).tintasDentro) : "—";
    const tieneDiagonal = tintasInt !== "—";
    const foilMostrar = (prod as any).foil_nombre ? String((prod as any).foil_nombre).trim() : boolLabel(prod.foil);
    const asaMostrar = (prod as any).asa_nombre ? String((prod as any).asa_nombre).trim() : boolLabel(prod.asa_suaje);
    const laminadoMostrar = (prod as any).laminado_nombre ? String((prod as any).laminado_nombre).trim() : boolLabel(prod.laminado);
    const texturaMostrar = (prod as any).textura_nombre ? String((prod as any).textura_nombre).trim() : "—";
    const altoRelMostrar = (prod as any).alto_relieve === true ? "SI" : boolLabel((prod as any).alto_rel);

    bodyRows.push([
      descripcion ? `${tipoProducto(prod.nombre)}\n${descripcion}` : tipoProducto(prod.nombre),
      getMedida(prod),
      `${tintasExt}x${tintasInt === "—" ? "0" : tintasInt}`,
      materialStr,
      foilMostrar,
      asaMostrar,
      altoRelMostrar,
      laminadoMostrar,
      boolPdf((prod as any).uv ?? (prod as any).uvBr),
      texturaMostrar,
      parsePantones(prod.pantones),
      det ? formatCantidadCelda(det, prod.por_kilo) : "—",
      det ? formatImporte(det, prod.por_kilo) : "—",
    ]);

    const obsRow = buildObsRow(prod, headAll.length);
    if (obsRow) bodyRows.push(obsRow);
  });

  const availW = PW - M * 2;
  const colW: Record<number, number> = { 0: 30, 1: 17, 2: 12, 3: 24, 4: 14, 5: 16, 6: 10, 7: 14, 8: 8, 9: 14, 10: 24 };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  const remaining = Math.max(availW - fixedTotal, 30);
  colW[11] = Math.round(remaining * 0.55);
  colW[12] = Math.round(remaining * 0.45);

  autoTable(doc, {
    startY, margin: { left: M, right: M, bottom: footerH + M },
    head: [headAll], body: bodyRows, theme: "grid",
    headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: "bold", fontSize: 7, cellPadding: 1.2, halign: "center", valign: "middle" },
    bodyStyles: { fontSize: 7, textColor: [0, 0, 0], cellPadding: 1.2, valign: "middle", minCellHeight: 7 },
    alternateRowStyles: { fillColor: WHITE },
    columnStyles: {
      0:  { cellWidth: colW[0],  halign: "left",   fontSize: 8, overflow: "linebreak" },
      1:  { cellWidth: colW[1],  halign: "center", fontSize: 8 },
      2:  { cellWidth: colW[2],  halign: "center", fontSize: 8 },
      3:  { cellWidth: colW[3],  halign: "center", fontSize: 8, overflow: "linebreak" },
      4:  { cellWidth: colW[4],  halign: "center", fontSize: 8, overflow: "linebreak" },
      5:  { cellWidth: colW[5],  halign: "center", fontSize: 8, overflow: "linebreak" },
      6:  { cellWidth: colW[6],  halign: "center", fontSize: 8 },
      7:  { cellWidth: colW[7],  halign: "center", fontSize: 8, overflow: "linebreak" },
      8:  { cellWidth: colW[8],  halign: "center", fontSize: 8 },
      9:  { cellWidth: colW[9],  halign: "center", fontSize: 8, overflow: "linebreak" },
      10: { cellWidth: colW[10], halign: "left",   fontSize: 8, overflow: "linebreak" },
      11: { cellWidth: colW[11], halign: "center", fontSize: 9, textColor: BLACK },
      12: { cellWidth: colW[12], halign: "center", fontSize: 9, fontStyle: "bold", textColor: BLACK },
    },
    didParseCell(data) {
      if (data.section === "head" && (data.column.index === 11 || data.column.index === 12)) {
        data.cell.styles.fillColor = BLACK;
        data.cell.styles.textColor = WHITE;
      }
      if (data.section === "body") {
        const raw = data.row.raw as any[];
        const ci = data.column.index;
        if (ci === 2 && !String(raw?.[0] ?? "").startsWith("Obs:") && String(raw?.[2] ?? "").startsWith("DIAG:")) data.cell.text = [];
        parseObsCell(data, headAll, MID_COL);
      }
    },
    didDrawCell(data) {
      if (data.section !== "body" || data.column.index !== 2) return;
      const raw = data.row.raw as any[];
      if (String(raw?.[0] ?? "").startsWith("Obs:")) return;
      const cellVal = String(raw?.[2] ?? "");
      if (!cellVal.startsWith("DIAG:")) return;
      const partes = cellVal.replace("DIAG:", "").split("|");
      const bg: [number, number, number] = data.row.index % 2 === 0 ? [255, 255, 255]
        : [(GRAY_ROW as number[])[0] ?? 245, (GRAY_ROW as number[])[1] ?? 245, (GRAY_ROW as number[])[2] ?? 245];
      dibujarCeldaTintasDiagonal(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, partes[0] ?? "—", partes[1] ?? "—", bg);
    },
  });
  return (doc as any).lastAutoTable?.finalY ?? startY;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLA PEDIDO MIXTO — tabla general con todas las columnas
// ═══════════════════════════════════════════════════════════════════════════════
function renderTablaMixtaPedido(
  doc: jsPDF, productos: ProductoPdf[], startY: number,
  M: number, PW: number, footerH: number
): number {
  const headAll = [
    "Descripción", "Medida", "Tintas", "Caras",
    "Material", "Calibre", "HS", "Asa/Suaje", "AR",
    "Laminado", "UV", "Textura", "Pantones", "Pigmento", "Perf.",
    "Cantidad / Precio", "Importe",
  ];
  const MID_COL = Math.floor(headAll.length / 2);
  const bodyRows: any[][] = [];

  productos.forEach(prod => {
    const esPapel = esPapelProd(prod);
    const det = prod.detalles.find(d => d.cantidad > 0);
    const descripcion = (prod as any).descripcion?.trim() || null;
    const tintasExt = prod.tintas != null ? String(prod.tintas) : "—";
    const tintasInt = (prod as any).tintasDentro != null && (prod as any).tintasDentro > 0
      ? String((prod as any).tintasDentro) : "—";
    const tieneDiagonal = tintasInt !== "—";
    const grupDesc: string = (prod as any).grupo_descripcion ?? "";
    const { materialStr, calibreStr } = parsearMaterialYCalibre(grupDesc, val(prod.material), val(prod.calibre));
    const altoRelMostrar = (prod as any).alto_relieve === true ? "SI" : boolLabel((prod as any).alto_rel);
    const foilMostrar = (prod as any).foil_nombre ? String((prod as any).foil_nombre).trim() : (esPapel ? "—" : boolLabel(prod.foil));
    const asaMostrar = (prod as any).asa_nombre ? String((prod as any).asa_nombre).trim() : boolLabel(prod.asa_suaje);
    const laminadoMostrar = (prod as any).laminado_nombre ? String((prod as any).laminado_nombre).trim() : (esPapel ? "—" : boolLabel(prod.laminado));
    const texturaMostrar = (prod as any).textura_nombre ? String((prod as any).textura_nombre).trim() : "—";

    bodyRows.push([
      descripcion ? `${tipoProducto(prod.nombre)}\n${descripcion}` : tipoProducto(prod.nombre),
      getMedida(prod),
      `${tintasExt}x${tintasInt === "—" ? "0" : tintasInt}`,
      esPapel ? "—" : val(prod.caras),
      materialStr,
      esPapel ? "—" : calibreStr,
      foilMostrar,
      asaMostrar,
      altoRelMostrar,
      laminadoMostrar,
      boolPdf((prod as any).uv ?? (prod as any).uvBr),
      texturaMostrar,
      parsePantones(prod.pantones),
      esPapel ? "—" : (prod.pigmentos ? String(prod.pigmentos).trim() || "—" : "—"),
      esPapel ? "—" : (prod.perforacion ? "SI" : "—"),
      det ? formatCantidadCelda(det, prod.por_kilo) : "—",
      det ? formatImporte(det, prod.por_kilo) : "—",
    ]);

    const obsRow = buildObsRow(prod, headAll.length);
    if (obsRow) bodyRows.push(obsRow);
  });

  const availW = PW - M * 2;
  const colW: Record<number, number> = {
    0: 25, 1: 17, 2: 12, 3: 10, 4: 17, 5: 12,
    6: 14, 7: 15, 8: 10, 9: 14, 10: 8, 11: 14, 12: 22, 13: 14, 14: 8,
  };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  const remaining = Math.max(availW - fixedTotal, 30);
  colW[15] = Math.round(remaining * 0.55);
  colW[16] = Math.round(remaining * 0.45);

  autoTable(doc, {
    startY, margin: { left: M, right: M, bottom: footerH + M },
    head: [headAll], body: bodyRows, theme: "grid",
    headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: "bold", fontSize: 8, cellPadding: 1.2, halign: "center", valign: "middle" },
    bodyStyles: { fontSize: 8, textColor: [0, 0, 0], cellPadding: 1.2, valign: "middle", minCellHeight: 7 },
    alternateRowStyles: { fillColor: WHITE },
    columnStyles: {
      0:  { cellWidth: colW[0],  halign: "left",   fontSize: 8, overflow: "linebreak" },
      1:  { cellWidth: colW[1],  halign: "center", fontSize: 8 },
      2:  { cellWidth: colW[2],  halign: "center", fontSize: 8 },
      3:  { cellWidth: colW[3],  halign: "center", fontSize: 8 },
      4:  { cellWidth: colW[4],  halign: "center", fontSize: 8, overflow: "linebreak" },
      5:  { cellWidth: colW[5],  halign: "center", fontSize: 8, overflow: "linebreak" },
      6:  { cellWidth: colW[6],  halign: "center", fontSize: 8, overflow: "linebreak" },
      7:  { cellWidth: colW[7],  halign: "center", fontSize: 8, overflow: "linebreak" },
      8:  { cellWidth: colW[8],  halign: "center", fontSize: 8 },
      9:  { cellWidth: colW[9],  halign: "center", fontSize: 8, overflow: "linebreak" },
      10: { cellWidth: colW[10], halign: "center", fontSize: 8 },
      11: { cellWidth: colW[11], halign: "center", fontSize: 8, overflow: "linebreak" },
      12: { cellWidth: colW[12], halign: "left",   fontSize: 8, overflow: "linebreak" },
      13: { cellWidth: colW[13], halign: "center", fontSize: 8, overflow: "linebreak" },
      14: { cellWidth: colW[14], halign: "center", fontSize: 8 },
      15: { cellWidth: colW[15], halign: "center", fontSize: 9, textColor: BLACK },
      16: { cellWidth: colW[16], halign: "center", fontSize: 9, fontStyle: "bold", textColor: BLACK },
    },
    didParseCell(data) {
      if (data.section === "head" && (data.column.index === 15 || data.column.index === 16)) {
        data.cell.styles.fillColor = BLACK;
        data.cell.styles.textColor = WHITE;
      }
      if (data.section === "body") {
        const raw = data.row.raw as any[];
        const ci = data.column.index;
        if (ci === 2 && !String(raw?.[0] ?? "").startsWith("Obs:") && String(raw?.[2] ?? "").startsWith("DIAG:")) data.cell.text = [];
        parseObsCell(data, headAll, MID_COL);
      }
    },
    didDrawCell(data) {
      if (data.section !== "body" || data.column.index !== 2) return;
      const raw = data.row.raw as any[];
      if (String(raw?.[0] ?? "").startsWith("Obs:")) return;
      const cellVal = String(raw?.[2] ?? "");
      if (!cellVal.startsWith("DIAG:")) return;
      const partes = cellVal.replace("DIAG:", "").split("|");
      const bg: [number, number, number] = data.row.index % 2 === 0 ? [255, 255, 255]
        : [(GRAY_ROW as number[])[0] ?? 245, (GRAY_ROW as number[])[1] ?? 245, (GRAY_ROW as number[])[2] ?? 245];
      dibujarCeldaTintasDiagonal(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, partes[0] ?? "—", partes[1] ?? "—", bg);
    },
  });
  return (doc as any).lastAutoTable?.finalY ?? startY;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export async function generarPdfPedido(
  pedido: PedidoPdf,
  guardarEnS3 = false,
  descargar = true,
  formato: FormatoPedidoPdf = "carta"
): Promise<Blob> {
  const { PW, PH, formatoJsPdf, ocultarLogo } = resolverDimensiones(formato);
  const M = 10;

  // En la hoja membretada el logo ya viene impreso en el papel, así que
  // ni siquiera se descarga/decodifica el logoBase64.
  const logoBase64 = ocultarLogo
    ? null
    : (pedido.logoBase64 ?? await cargarLogoBase64(logoUrl));

  const sinIva = pedido.sin_iva === true;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: formatoJsPdf });
  const PED_FOOTER_H = 55;

  const y = await dibujarEncabezado({
    doc, logoBase64,
    mostrarLogo: !ocultarLogo,
    pageWidth: PW, margin: M,
    labelDocumento: "PEDIDO", labelFolio: "No P", folio: pedido.no_pedido,
    refTexto: pedido.no_cotizacion ? `Ref. Cot. ${pedido.no_cotizacion}` : undefined,
    fecha: pedido.fecha, empresa: pedido.empresa, impresion: pedido.impresion,
    cliente: pedido.cliente, telefono: pedido.telefono, correo: pedido.correo,
    celular: pedido.celular ?? null, razon_social: pedido.razon_social ?? null,
    rfc: pedido.rfc ?? null, domicilio: pedido.domicilio ?? null,
    numero: pedido.numero ?? null, colonia: pedido.colonia ?? null,
    codigo_postal: pedido.codigo_postal ?? null, poblacion: pedido.poblacion ?? null,
    estado_cliente: pedido.estado_cliente ?? null, cliente_id: pedido.cliente_id ?? null,
    identificar: pedido.identificar ?? null,
  });

  // ── Detección de modo ──────────────────────────────────────────────────────
  const hayPapel    = pedido.productos.some(esPapelProd);
  const hayPlastico = pedido.productos.some(p => !esPapelProd(p));
  const esMixto     = hayPapel && hayPlastico;

  let finalY = y;
  if (esMixto) {
    finalY = renderTablaMixtaPedido(doc, pedido.productos, y, M, PW, PED_FOOTER_H);
  } else if (hayPapel) {
    finalY = renderTablaPapelPedido(doc, pedido.productos, y, M, PW, PED_FOOTER_H);
  } else {
    finalY = renderTablaPlasticoPedido(doc, pedido.productos, y, M, PW, PED_FOOTER_H);
  }

  if (finalY + PED_FOOTER_H + M > PH) doc.addPage();

  dibujarCajasPie(doc, pedido.productos, [], {
    subtotal: pedido.subtotal,
    iva:      sinIva ? 0 : pedido.iva,
    total:    pedido.total,
    anticipo: pedido.anticipo,
    saldo:    pedido.saldo,
  }, { pageWidth: PW, pageHeight: PH, margin: M }, sinIva);

  dibujarPiePagina(doc, "PEDIDO", pedido.no_pedido, pedido.fecha, PW, PH);

  const sufijoFormato = formato === "membretado" ? "_EB" : "";
  const nombre = `Pedido_${pedido.no_pedido}${sufijoFormato}.pdf`;
  const blob = doc.output("blob");
  if (descargar) doc.save(nombre);
  if (guardarEnS3) {
    await subirPdfA3(blob, nombre, "pdfs", "pedidos");
  }
  return blob;
}