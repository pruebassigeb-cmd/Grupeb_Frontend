// generarPdfCotizacion.ts — LANDSCAPE CARTA — B&N
// Detección automática: solo plástico → tabla plástico, solo papel → tabla papel, mixto → tabla general

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  cargarLogoBase64,
  val, boolLabel, parsePantones, getMedida, tipoProducto, formatCantidadCelda,
  dibujarEncabezado, dibujarCajasPie, dibujarPiePagina,
  GRAY_DARK, GRAY_MED, GRAY_LIGHT, GRAY_ROW, BLACK, WHITE,
} from "./Pdfutils";
import type { ProductoPdf } from "./Pdfutils";
import logoUrl from "../assets/logogrupeb.png";
import { subirPdfA3 } from "./pdfS3.service";

interface CotizacionPdf {
  no_cotizacion: string;
  fecha: string;
  cliente: string;
  empresa: string;
  telefono: string;
  correo: string;
  estado: string;
  impresion?: string | null;
  logoBase64?: string;
  productos: ProductoPdf[];
  total: number;
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

// ── Detección de tipo de material ────────────────────────────────────────────
const esPapelProd = (p: ProductoPdf): boolean =>
  (p as any).tipo_material === "papel" ||
  (p as any).tipoCotizacion === "papel" ||
  (p as any).idproducto_papel != null ||
  (p as any).producto_papel_idproducto_papel != null;

const boolPdf = (value: unknown): string => boolLabel(value === true);


const textoPdf = (value: unknown): string => String(value ?? "").trim();

function obtenerAsaMostrar(prod: ProductoPdf): string {
  const asaNombre = textoPdf((prod as any).asa_nombre);
  if (asaNombre) return asaNombre;

  const tipoAsa = textoPdf((prod as any).asa_suaje);
  const colorAsa = textoPdf((prod as any).color_asa_nombre);
  const partes = [tipoAsa, colorAsa]
    .filter(Boolean)
    .filter((valor, indice, arreglo) => arreglo.indexOf(valor) === indice);

  return partes.length > 0 ? partes.join(" · ") : boolLabel((prod as any).asa_suaje);
}

function obtenerTipoPlastico(prod: ProductoPdf): string {
  return textoPdf((prod as any).tipo_producto || (prod as any).tipoProducto) || "—";
}

// ── Helper: separar material y calibre desde grupo_descripcion ────────────────
function parsearMaterialYCalibre(
  grupDesc: string,
  fallbackMaterial: string,
  fallbackCalibre: string
): { materialStr: string; calibreStr: string } {
  if (!grupDesc) return { materialStr: fallbackMaterial, calibreStr: fallbackCalibre };
  const partes = grupDesc.split("+").map((s: string) => s.trim());
  const materialStr =
    partes.map((p: string) => p.replace(/\s*\d+[\w.]*(?:pts|gms|ect)/gi, "").trim())
      .filter(Boolean).join(" + ") || fallbackMaterial;
  const calibreStr =
    partes.map((p: string) => { const m = p.match(/(\d+[\w.]*(?:pts|gms|ect))/i); return m ? m[1] : ""; })
      .filter(Boolean).join(" / ") || fallbackCalibre;
  return { materialStr, calibreStr };
}

// ── Helper: celda diagonal tintas ────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// TABLA SOLO PLÁSTICO
// Columnas: Descripción | Medida | Tintas E/I | Caras | Material | Calibre |
//           Asa/Suaje | Pantones | Pigmento | Perf. | Cant 1 | Cant 2 | Cant 3
// ═══════════════════════════════════════════════════════════════════════════════
function renderTablaPlastico(
  doc: jsPDF, productos: ProductoPdf[], startY: number,
  numCantCols: number, M: number, PW: number, footerH: number
): number {
  const headFixed = [
    "Descripción", "Medida", "Tintas", "Caras", "Material", "Calibre",
    "Tipo", "Asa/Suaje", "Pantones", "Pigmento", "Perf.",
  ];
  const headAll = [...headFixed, ...Array.from({ length: numCantCols }, (_, i) => `Cant ${i + 1}`)];

  const bodyRows: any[][] = [];

  productos.forEach(prod => {
    const descripcion = (prod as any).descripcion?.trim() || null;
    const tintasExt = prod.tintas != null ? String(prod.tintas) : "—";
    const tintasInt = (prod as any).tintasDentro != null && (prod as any).tintasDentro > 0
      ? String((prod as any).tintasDentro) : "—";

    const row: any[] = [
      descripcion ? `${tipoProducto(prod.nombre)}
${descripcion}` : tipoProducto(prod.nombre),
      getMedida(prod),
      `${tintasExt}x${tintasInt === "—" ? "0" : tintasInt}`,
      val(prod.caras),
      val(prod.material),
      val(prod.calibre),
      obtenerTipoPlastico(prod),
      obtenerAsaMostrar(prod),
      parsePantones(prod.pantones),
      prod.pigmentos ? String(prod.pigmentos).trim() || "—" : "—",
      prod.perforacion ? "SI" : "—",
    ];

    for (let i = 0; i < numCantCols; i++) {
      const det = prod.detalles[i];
      row.push(det && det.cantidad > 0 ? formatCantidadCelda(det, prod.por_kilo) : "—");
    }

    bodyRows.push(row);

    const hasHerr = prod.herramental_precio != null && prod.herramental_precio > 0;
    const hasObs = !!prod.observacion?.trim();

    if (hasObs || hasHerr) {
      const comboRow = new Array(headAll.length).fill("");
      if (hasObs) comboRow[0] = `Obs: ${prod.observacion!.trim()}`;
      if (hasHerr) {
        const nombreHerr = prod.herramental_descripcion?.trim() || "Herramental / molde";
        comboRow[1] = `Herramental: ${nombreHerr}  —  Cargo único.`;
        comboRow[headAll.length - 1] = `$${Number(prod.herramental_precio).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      bodyRows.push(comboRow);
    }
  });

  const availW = PW - M * 2;
  const colW: Record<number, number> = {
    0: 26, 1: 16, 2: 11, 3: 9, 4: 18, 5: 12,
    6: 20, 7: 18, 8: 18, 9: 14, 10: 7,
  };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  const cantW = Math.max((availW - fixedTotal) / numCantCols, 16);
  for (let i = 0; i < numCantCols; i++) colW[11 + i] = cantW;
  const totalColW = Object.values(colW).reduce((a, b) => a + b, 0);
  if (totalColW > availW) {
    const scale = availW / totalColW;
    Object.keys(colW).forEach(k => { colW[+k] = colW[+k] * scale; });
  }

  const MID_COL = Math.floor(headAll.length / 2);

  autoTable(doc, {
    startY,
    margin: { left: M, right: M, bottom: footerH + M },
    head: [headAll],
    body: bodyRows,
    theme: "grid",
    headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: "bold", fontSize: 7, cellPadding: 1.2, halign: "center", valign: "middle" },
    bodyStyles: { fontSize: 7, textColor: [0, 0, 0], cellPadding: 1.2, valign: "middle", minCellHeight: 7 },
    alternateRowStyles: { fillColor: WHITE },
    columnStyles: {
      0: { cellWidth: colW[0], halign: "left", fontSize: 7, overflow: "linebreak" },
      1: { cellWidth: colW[1], halign: "center", fontSize: 7 },
      2: { cellWidth: colW[2], halign: "center", fontSize: 7 },
      3: { cellWidth: colW[3], halign: "center", fontSize: 7 },
      4: { cellWidth: colW[4], halign: "center", fontSize: 7, overflow: "linebreak" },
      5: { cellWidth: colW[5], halign: "center", fontSize: 7 },
      6: { cellWidth: colW[6], halign: "center", fontSize: 7, overflow: "linebreak" },
      7: { cellWidth: colW[7], halign: "center", fontSize: 7, overflow: "linebreak" },
      8: { cellWidth: colW[8], halign: "left", fontSize: 7, overflow: "linebreak" },
      9: { cellWidth: colW[9], halign: "center", fontSize: 7, overflow: "linebreak" },
      10: { cellWidth: colW[10], halign: "center", fontSize: 7 },
      ...(numCantCols >= 1 ? { 11: { cellWidth: colW[11], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const, textColor: BLACK } } : {}),
      ...(numCantCols >= 2 ? { 12: { cellWidth: colW[12], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const, textColor: BLACK } } : {}),
      ...(numCantCols >= 3 ? { 13: { cellWidth: colW[13], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const, textColor: BLACK } } : {}),
    },
    didParseCell(data) {
      if (data.section === "head" && data.column.index >= 11) {
        data.cell.styles.fillColor = BLACK;
        data.cell.styles.textColor = WHITE;
      }
      if (data.section === "body") {
        const raw = data.row.raw as any[];
        const raw0 = String(raw?.[0] ?? "");
        const raw1 = String(raw?.[1] ?? "");
        const ci = data.column.index;
        const lastCol = headAll.length - 1;

        if (raw0.startsWith("Obs:")) {
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
            data.cell.styles.fontSize = 7;
            data.cell.styles.textColor = BLACK;
            data.cell.styles.halign = "center";
          } else {
            data.cell.styles.fillColor = WHITE;
            data.cell.text = [];
          }
        }
      }
    },
  });

  return (doc as any).lastAutoTable?.finalY ?? startY;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLA SOLO PAPEL
// Columnas: Descripción | Medida | Tintas E/I | Material |
//           Foil | Asa/Suaje | Alto Rel | Laminado | UV | Textura | Pantones | Cant 1/2/3
// ═══════════════════════════════════════════════════════════════════════════════
function renderTablaPapel(
  doc: jsPDF, productos: ProductoPdf[], startY: number,
  numCantCols: number, M: number, PW: number, footerH: number
): number {
  const headFixed = ["Descripción", "Medida", "Tintas", "Material", "HS", "Asa/Suaje", "AR", "Laminado", "UV", "Textura", "Pantones"];
  const headAll = [...headFixed, ...Array.from({ length: numCantCols }, (_, i) => `Cant ${i + 1}`)];

  const filasDiagonal: { rowIndex: number; exterior: string; interior: string }[] = [];
  const bodyRows: any[][] = [];
  let rowIdx = 0;

  productos.forEach(prod => {
    const descripcion = (prod as any).descripcion?.trim() || null;
    const grupDesc: string = (prod as any).grupo_descripcion ?? "";
    const { materialStr } = parsearMaterialYCalibre(grupDesc, val(prod.material), val(prod.calibre));

    const tintasExt = prod.tintas != null ? String(prod.tintas) : "—";
    const tintasInt = (prod as any).tintasDentro != null && (prod as any).tintasDentro > 0
      ? String((prod as any).tintasDentro) : "—";
    const tieneDiagonal = tintasInt !== "—";

    const foilMostrar = (prod as any).foil_nombre ? String((prod as any).foil_nombre).trim() : boolLabel(prod.foil);
    const asaMostrar = obtenerAsaMostrar(prod);
    const laminadoMostrar = (prod as any).laminado_nombre ? String((prod as any).laminado_nombre).trim() : boolLabel(prod.laminado);
    const texturaMostrar = (prod as any).textura_nombre ? String((prod as any).textura_nombre).trim() : "—";
    const altoRelMostrar = (prod as any).alto_relieve === true ? "SI" : boolLabel((prod as any).alto_rel);

    const row: any[] = [
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
    ];

    for (let i = 0; i < numCantCols; i++) {
      const det = prod.detalles[i];
      row.push(det && det.cantidad > 0 ? formatCantidadCelda(det, prod.por_kilo) : "—");
    }

    if (tieneDiagonal) filasDiagonal.push({ rowIndex: rowIdx, exterior: tintasExt, interior: tintasInt });
    bodyRows.push(row);
    rowIdx++;

    // Fila observaciones
    const hasHerr = prod.herramental_precio != null && prod.herramental_precio > 0;
    const MID_COL = Math.floor(headAll.length / 2);

    const obsPartes: string[] = [];
    if (prod.observacion?.trim()) obsPartes.push(prod.observacion.trim());
    const obsTexto = obsPartes.length ? `Obs: ${obsPartes.join("  —  ")}` : "";

    const comboRow = new Array(headAll.length).fill("");
    comboRow[0] = obsTexto;
    if (hasHerr) {
      const nombreHerr = prod.herramental_descripcion?.trim() || "Herramental / molde";
      comboRow[1] = `Herramental: ${nombreHerr}  —  Cargo único.`;
      comboRow[headAll.length - 1] = `$${Number(prod.herramental_precio).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    bodyRows.push(comboRow);
    rowIdx++;
  });

  const availW = PW - M * 2;
  const colW: Record<number, number> = { 0: 30, 1: 17, 2: 12, 3: 24, 4: 14, 5: 16, 6: 10, 7: 14, 8: 8, 9: 14, 10: 24 };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  const cantW = Math.max((availW - fixedTotal) / numCantCols, 16);
  for (let i = 0; i < numCantCols; i++) colW[11 + i] = cantW;
  const totalColW = Object.values(colW).reduce((a, b) => a + b, 0);
  if (totalColW > availW) {
    const scale = availW / totalColW;
    Object.keys(colW).forEach(k => { colW[+k] = colW[+k] * scale; });
  }

  const MID_COL = Math.floor(headAll.length / 2);

  autoTable(doc, {
    startY,
    margin: { left: M, right: M, bottom: footerH + M },
    head: [headAll],
    body: bodyRows,
    theme: "grid",
    headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: "bold", fontSize: 7, cellPadding: 1.2, halign: "center", valign: "middle" },
    bodyStyles: { fontSize: 7, textColor: [0, 0, 0], cellPadding: 1.2, valign: "middle", minCellHeight: 7 },
    alternateRowStyles: { fillColor: WHITE },
    columnStyles: {
      0: { cellWidth: colW[0], halign: "left", fontSize: 7, overflow: "linebreak" },
      1: { cellWidth: colW[1], halign: "center", fontSize: 7 },
      2: { cellWidth: colW[2], halign: "center", fontSize: 7 },
      3: { cellWidth: colW[3], halign: "center", fontSize: 7, overflow: "linebreak" },
      4: { cellWidth: colW[4], halign: "center", fontSize: 7, overflow: "linebreak" },
      5: { cellWidth: colW[5], halign: "center", fontSize: 7, overflow: "linebreak" },
      6: { cellWidth: colW[6], halign: "center", fontSize: 7 },
      7: { cellWidth: colW[7], halign: "center", fontSize: 7, overflow: "linebreak" },
      8: { cellWidth: colW[8], halign: "center", fontSize: 7 },
      9: { cellWidth: colW[9], halign: "center", fontSize: 7, overflow: "linebreak" },
      10: { cellWidth: colW[10], halign: "left", fontSize: 7, overflow: "linebreak" },
      ...(numCantCols >= 1 ? { 11: { cellWidth: colW[11], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const, textColor: BLACK } } : {}),
      ...(numCantCols >= 2 ? { 12: { cellWidth: colW[12], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const, textColor: BLACK } } : {}),
      ...(numCantCols >= 3 ? { 13: { cellWidth: colW[13], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const, textColor: BLACK } } : {}),
    },
    didParseCell(data) {
      if (data.section === "head" && data.column.index >= 11) {
        data.cell.styles.fillColor = BLACK;
        data.cell.styles.textColor = WHITE;
      }
      if (data.section === "body") {
        const raw = data.row.raw as any[];
        const raw0 = String(raw?.[0] ?? "");
        const raw1 = String(raw?.[1] ?? "");
        const ci = data.column.index;
        const lastCol = headAll.length - 1;

        if (ci === 2 && !raw0.startsWith("Obs:")) {
          if (String(raw?.[2] ?? "").startsWith("DIAG:")) data.cell.text = [];
        }

        if (raw0.startsWith("Obs:")) {
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
            data.cell.styles.fontSize = 7;
            data.cell.styles.textColor = BLACK;
            data.cell.styles.halign = "center";
          } else {
            data.cell.styles.fillColor = WHITE;
            data.cell.text = [];
          }
        }
      }
    },
    didDrawCell(data) {
      if (data.section !== "body" || data.column.index !== 2) return;
      const raw = data.row.raw as any[];
      const raw0 = String(raw?.[0] ?? "");
      if (raw0.startsWith("Obs:")) return;
      const cellVal = String(raw?.[2] ?? "");
      if (!cellVal.startsWith("DIAG:")) return;
      const partes = cellVal.replace("DIAG:", "").split("|");
      const bg: [number, number, number] = data.row.index % 2 === 0
        ? [255, 255, 255]
        : [(GRAY_ROW as number[])[0] ?? 245, (GRAY_ROW as number[])[1] ?? 245, (GRAY_ROW as number[])[2] ?? 245];
      dibujarCeldaTintasDiagonal(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, partes[0] ?? "—", partes[1] ?? "—", bg);
    },
  });

  return (doc as any).lastAutoTable?.finalY ?? startY;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLA MIXTA (plástico + papel) — tabla general con todas las columnas
// ═══════════════════════════════════════════════════════════════════════════════
function renderTablaMixta(
  doc: jsPDF, productos: ProductoPdf[], startY: number,
  numCantCols: number, M: number, PW: number, footerH: number
): number {
  const headFixed = [
    "Descripción", "Medida", "Tintas", "Caras",
    "Material", "Calibre", "HS", "Asa/Suaje", "AR",
    "Lam./Tipo", "UV", "Textura", "Pantones", "Pigmento", "Perf.",
  ];
  const headAll = [...headFixed, ...Array.from({ length: numCantCols }, (_, i) => `Cant ${i + 1}`)];
  const MID_COL = Math.floor(headAll.length / 2);

  const bodyRows: any[][] = [];
  let rowIdx = 0;

  productos.forEach(prod => {
    const esPapel = esPapelProd(prod);
    const descripcion = (prod as any).descripcion?.trim() || null;
    const tintasExt = prod.tintas != null ? String(prod.tintas) : "—";
    const tintasInt = (prod as any).tintasDentro != null && (prod as any).tintasDentro > 0
      ? String((prod as any).tintasDentro) : "—";
    const tieneDiagonal = tintasInt !== "—";

    const grupDesc: string = (prod as any).grupo_descripcion ?? "";
    const { materialStr, calibreStr } = parsearMaterialYCalibre(grupDesc, val(prod.material), val(prod.calibre));

    const altoRelMostrar = (prod as any).alto_relieve === true ? "SI" : boolLabel((prod as any).alto_rel);
    const foilMostrar = (prod as any).foil_nombre ? String((prod as any).foil_nombre).trim() : (esPapel ? "—" : boolLabel(prod.foil));
    const asaMostrar = obtenerAsaMostrar(prod);
    const laminadoOTipoMostrar = esPapel
      ? ((prod as any).laminado_nombre
          ? String((prod as any).laminado_nombre).trim()
          : boolLabel(prod.laminado))
      : obtenerTipoPlastico(prod);
    const texturaMostrar = (prod as any).textura_nombre ? String((prod as any).textura_nombre).trim() : "—";

    const row: any[] = [
      descripcion ? `${tipoProducto(prod.nombre)}\n${descripcion}` : tipoProducto(prod.nombre),
      getMedida(prod),
      `${tintasExt}x${tintasInt === "—" ? "0" : tintasInt}`,
      esPapel ? "—" : val(prod.caras),
      materialStr,
      esPapel ? "—" : calibreStr,
      foilMostrar,
      asaMostrar,
      altoRelMostrar,
      laminadoOTipoMostrar,
      boolPdf((prod as any).uv ?? (prod as any).uvBr),
      texturaMostrar,
      parsePantones(prod.pantones),
      esPapel ? "—" : (prod.pigmentos ? String(prod.pigmentos).trim() || "—" : "—"),
      esPapel ? "—" : (prod.perforacion ? "SI" : "—"),
    ];

    for (let i = 0; i < numCantCols; i++) {
      const det = prod.detalles[i];
      row.push(det && det.cantidad > 0 ? formatCantidadCelda(det, prod.por_kilo) : "—");
    }

    bodyRows.push(row);
    rowIdx++;

    // Fila observaciones
    // Fila observaciones
    const hasHerr = prod.herramental_precio != null && prod.herramental_precio > 0;

    const obsPartes: string[] = [];
    if (prod.observacion?.trim()) obsPartes.push(prod.observacion.trim());
    const obsTexto = obsPartes.length ? `Obs: ${obsPartes.join("  —  ")}` : "";

    const comboRow = new Array(headAll.length).fill("");
    comboRow[0] = obsTexto;
    if (hasHerr) {
      const nombreHerr = prod.herramental_descripcion?.trim() || "Herramental / molde";
      comboRow[1] = `Herramental: ${nombreHerr}  —  Cargo único.`;
      comboRow[headAll.length - 1] = `$${Number(prod.herramental_precio).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    bodyRows.push(comboRow);
    rowIdx++;
  });

  const availW = PW - M * 2;
  const colW: Record<number, number> = {
    0: 20, 1: 17, 2: 12, 3: 10, 4: 17, 5: 12, 6: 14, 7: 15,
    8: 10, 9: 14, 10: 8, 11: 14, 12: 22, 13: 14, 14: 8,
  };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  const cantW = Math.max((availW - fixedTotal) / numCantCols, 16);
  for (let i = 0; i < numCantCols; i++) colW[15 + i] = cantW;
  const totalColW = Object.values(colW).reduce((a, b) => a + b, 0);
  if (totalColW > availW) {
    const scale = availW / totalColW;
    Object.keys(colW).forEach(k => { colW[+k] = colW[+k] * scale; });
  }

  autoTable(doc, {
    startY,
    margin: { left: M, right: M, bottom: footerH + M },
    head: [headAll],
    body: bodyRows,
    theme: "grid",
    headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: "bold", fontSize: 7, cellPadding: 1.2, halign: "center", valign: "middle" },
    bodyStyles: { fontSize: 7, textColor: [0, 0, 0], cellPadding: 1.2, valign: "middle", minCellHeight: 7 },
    alternateRowStyles: { fillColor: WHITE },
    columnStyles: {
      0:  { cellWidth: colW[0],  halign: "left",   fontSize: 7, overflow: "linebreak" },
      1:  { cellWidth: colW[1],  halign: "center", fontSize: 7 },
      2:  { cellWidth: colW[2],  halign: "center", fontSize: 7 },
      3:  { cellWidth: colW[3],  halign: "center", fontSize: 7 },
      4:  { cellWidth: colW[4],  halign: "center", fontSize: 7, overflow: "linebreak" },
      5:  { cellWidth: colW[5],  halign: "center", fontSize: 7, overflow: "linebreak" },
      6:  { cellWidth: colW[6],  halign: "center", fontSize: 7, overflow: "linebreak" },
      7:  { cellWidth: colW[7],  halign: "center", fontSize: 7, overflow: "linebreak" },
      8:  { cellWidth: colW[8],  halign: "center", fontSize: 7 },
      9:  { cellWidth: colW[9],  halign: "center", fontSize: 7, overflow: "linebreak" },
      10: { cellWidth: colW[10], halign: "center", fontSize: 7 },
      11: { cellWidth: colW[11], halign: "center", fontSize: 7, overflow: "linebreak" },
      12: { cellWidth: colW[12], halign: "left",   fontSize: 7, overflow: "linebreak" },
      13: { cellWidth: colW[13], halign: "center", fontSize: 7, overflow: "linebreak" },
      14: { cellWidth: colW[14], halign: "center", fontSize: 7 },
      ...(numCantCols >= 1 ? { 15: { cellWidth: colW[15], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const, textColor: BLACK } } : {}),
      ...(numCantCols >= 2 ? { 16: { cellWidth: colW[16], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const, textColor: BLACK } } : {}),
      ...(numCantCols >= 3 ? { 17: { cellWidth: colW[17], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const, textColor: BLACK } } : {}),
    },
    didParseCell(data) {
      if (data.section === "head" && data.column.index >= 15) {
        data.cell.styles.fillColor = BLACK;
        data.cell.styles.textColor = WHITE;
      }
      if (data.section === "body") {
        const raw = data.row.raw as any[];
        const raw0 = String(raw?.[0] ?? "");
        const raw1 = String(raw?.[1] ?? "");
        const ci = data.column.index;
        const lastCol = headAll.length - 1;

        if (ci === 2 && !raw0.startsWith("Obs:")) {
          if (String(raw?.[2] ?? "").startsWith("DIAG:")) data.cell.text = [];
        }

        if (raw0.startsWith("Obs:")) {
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
            data.cell.styles.fontSize = 7;
            data.cell.styles.textColor = BLACK;
            data.cell.styles.halign = "center";
          } else {
            data.cell.styles.fillColor = WHITE;
            data.cell.text = [];
          }
        }
      }
    },
    didDrawCell(data) {
      if (data.section !== "body" || data.column.index !== 2) return;
      const raw = data.row.raw as any[];
      const raw0 = String(raw?.[0] ?? "");
      if (raw0.startsWith("Obs:")) return;
      const cellVal = String(raw?.[2] ?? "");
      if (!cellVal.startsWith("DIAG:")) return;
      const partes = cellVal.replace("DIAG:", "").split("|");
      const bg: [number, number, number] = data.row.index % 2 === 0
        ? [255, 255, 255]
        : [(GRAY_ROW as number[])[0] ?? 245, (GRAY_ROW as number[])[1] ?? 245, (GRAY_ROW as number[])[2] ?? 245];
      dibujarCeldaTintasDiagonal(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, partes[0] ?? "—", partes[1] ?? "—", bg);
    },
  });

  return (doc as any).lastAutoTable?.finalY ?? startY;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export async function generarPdfCotizacion(
  cotizacion: CotizacionPdf,
  guardarEnS3 = false,
  descargar = true
): Promise<Blob> {  const logoBase64 = cotizacion.logoBase64 ?? await cargarLogoBase64(logoUrl);
  const sinIva = cotizacion.sin_iva === true;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const PW = 274.9;
  const PH = 215.9;
  const M = 10;
  const COT_FOOTER_H = 55;

  const y = await dibujarEncabezado({
    doc, logoBase64,
    labelDocumento: "COTIZACION", labelFolio: "No F", folio: cotizacion.no_cotizacion,
    fecha: cotizacion.fecha, empresa: cotizacion.empresa, impresion: cotizacion.impresion,
    cliente: cotizacion.cliente, telefono: cotizacion.telefono, correo: cotizacion.correo,
    celular: cotizacion.celular ?? null, razon_social: cotizacion.razon_social ?? null,
    rfc: cotizacion.rfc ?? null, domicilio: cotizacion.domicilio ?? null,
    numero: cotizacion.numero ?? null, colonia: cotizacion.colonia ?? null,
    codigo_postal: cotizacion.codigo_postal ?? null, poblacion: cotizacion.poblacion ?? null,
    estado_cliente: cotizacion.estado_cliente ?? null, cliente_id: cotizacion.cliente_id ?? null,
    identificar: cotizacion.identificar ?? null,
  });

  // ── Detección de modo ──────────────────────────────────────────────────────
  const hayPapel = cotizacion.productos.some(esPapelProd);
  const hayPlastico = cotizacion.productos.some(p => !esPapelProd(p));
  const esMixto = hayPapel && hayPlastico;

  const maxDet = Math.max(...cotizacion.productos.map(p => p.detalles.length), 1);
  const numCantCols = Math.min(maxDet, 3);

  let finalY = y;

  if (esMixto) {
    // Tabla general con todos los productos
    finalY = renderTablaMixta(doc, cotizacion.productos, y, numCantCols, M, PW, COT_FOOTER_H);
  } else if (hayPapel) {
    // Solo papel
    finalY = renderTablaPapel(doc, cotizacion.productos, y, numCantCols, M, PW, COT_FOOTER_H);
  } else {
    // Solo plástico
    finalY = renderTablaPlastico(doc, cotizacion.productos, y, numCantCols, M, PW, COT_FOOTER_H);
  }

  if (finalY + COT_FOOTER_H + M > PH) doc.addPage();

  const condLines = sinIva
    ? [
      "• Precios SIN IVA (exento).",
      "• Tiempo de entrega: 30-35 días después de autorizado el diseño.",
      "• L.A.B. Guadalajara. EL FLETE VA POR CUENTA DEL CLIENTE.",
      "• Condiciones de Pago: 50% ANTICIPO, resto contra entrega.",
      "• Esta cotización puede variar +/- 10% en la cantidad final.",
      "• Precios sujetos a cambio sin previo aviso.",
    ]
    : [
      "• Precios más IVA.",
      "• Tiempo de entrega: 30-35 días hábiles después de autorizado el diseño.",
      "• L.A.B. Guadalajara. EL FLETE VA POR CUENTA DEL CLIENTE.",
      "• Condiciones de Pago: 50% ANTICIPO, resto contra entrega.",
      "• Esta cotización puede variar +/- 10% en la cantidad final.",
      "• Precios sujetos a cambio sin previo aviso.",
    ];

  dibujarCajasPie(doc, cotizacion.productos, condLines);
  dibujarPiePagina(doc, "COTIZACION", cotizacion.no_cotizacion, cotizacion.fecha);

const nombre = `Cotizacion_${cotizacion.no_cotizacion}.pdf`;
  const blob = doc.output("blob");
  if (descargar) doc.save(nombre);
  if (guardarEnS3) {
    await subirPdfA3(blob, nombre, "pdfs", "cotizaciones");
  }
  return blob;
}
