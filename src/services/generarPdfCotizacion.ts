// generarPdfCotizacion.ts — LANDSCAPE CARTA — B&N

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

export async function generarPdfCotizacion(cotizacion: CotizacionPdf, guardarEnS3 = false): Promise<void> {
  const logoBase64 = cotizacion.logoBase64 ?? await cargarLogoBase64(logoUrl);
  const sinIva = cotizacion.sin_iva === true;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const PW = 274.9;
  const PH = 215.9;
  const M = 10;
  const COT_FOOTER_H = 55;

  const y = await dibujarEncabezado({
    doc,
    logoBase64,
    labelDocumento: "COTIZACION",
    labelFolio: "No F",
    folio: cotizacion.no_cotizacion,
    fecha: cotizacion.fecha,
    empresa: cotizacion.empresa,
    impresion: cotizacion.impresion,
    cliente: cotizacion.cliente,
    telefono: cotizacion.telefono,
    correo: cotizacion.correo,
    celular: cotizacion.celular ?? null,
    razon_social: cotizacion.razon_social ?? null,
    rfc: cotizacion.rfc ?? null,
    domicilio: cotizacion.domicilio ?? null,
    numero: cotizacion.numero ?? null,
    colonia: cotizacion.colonia ?? null,
    codigo_postal: cotizacion.codigo_postal ?? null,
    poblacion: cotizacion.poblacion ?? null,
    estado_cliente: cotizacion.estado_cliente ?? null,
    cliente_id: cotizacion.cliente_id ?? null,
    identificar: cotizacion.identificar ?? null,
  });

  const maxDet = Math.max(...cotizacion.productos.map(p => p.detalles.length), 1);
  const numCantCols = Math.min(maxDet, 3);

  // ── Columnas fijas — índices 0-14 (Perf. en 14) ──────────────────────────
  const headFixed = [
    "Descripción", "Medida", "B/K", "Tintas", "Caras",
    "Material", "Calibre", "Foil", "Asa/Suaje", "Alto Rel",
    "Laminado", "UV/BR", "Pantones", "Pigmento", "Perf.",
  ];
  const headAll = [
    ...headFixed,
    ...Array.from({ length: numCantCols }, (_, i) => `Cant ${i + 1}`),
  ];

  const MID_COL = Math.floor(headAll.length / 2);

  const bodyRows: any[][] = [];

  cotizacion.productos.forEach(prod => {
    const nombreBase = tipoProducto(prod.nombre);
    const descripcion = (prod as any).descripcion?.trim() || null;

    const row: any[] = [
      nombreBase, 
      getMedida(prod),
      boolLabel(prod.bk),
      val(prod.tintas),
      val(prod.caras),
      val(prod.material),
      val(prod.calibre),
      boolLabel(prod.foil),
      boolLabel(prod.asa_suaje),
      boolLabel(prod.alto_rel),
      boolLabel(prod.laminado),
      boolLabel(prod.uvBr),
      parsePantones(prod.pantones),
      prod.pigmentos ? String(prod.pigmentos).trim() || "—" : "—",
      prod.perforacion ? "SI" : "—",
    ];
    for (let i = 0; i < numCantCols; i++) {
      const det = prod.detalles[i];
      row.push(det && det.cantidad > 0 ? formatCantidadCelda(det, prod.por_kilo) : "—");
    }

    const tieneKilo = prod.detalles.some(d => d.modo_cantidad === "kilo");
    const tieneUnidad = prod.detalles.some(d => d.modo_cantidad !== "kilo");
    const modoLabel = tieneKilo && tieneUnidad ? "Por kilo y por unidad"
      : tieneKilo ? "Cotizado por kilo"
        : "Cotizado por unidad";
    const obsTexto = prod.observacion?.trim()
      ? `Obs: ${modoLabel}  —  ${prod.observacion.trim()}`
      : `Obs: ${modoLabel}`;

    const hasHerr = prod.herramental_precio != null && prod.herramental_precio > 0;

    // Igual que en pedido: obs y herramental van en la misma fila (comboRow)
    const comboRow = new Array(headAll.length).fill("");
    comboRow[0] = obsTexto;

    if (hasHerr) {
      const nombreHerr = prod.herramental_descripcion?.trim() || "Herramental / molde";
      comboRow[1] = `Herramental: ${nombreHerr}  —  Cargo único por fabricación del molde/troquel.`;
      comboRow[headAll.length - 1] = `$${Number(prod.herramental_precio).toLocaleString("es-MX", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })}`;
    }

    bodyRows.push(row);
    bodyRows.push(comboRow);

    // ── Fila descripción propia ───────────────────────────────────────────────
    if (descripcion) {
      const descRow = new Array(headAll.length).fill("");
      descRow[0] = `DESC:${descripcion}`;
      bodyRows.push(descRow);
    }
  });

  const availW = PW - M * 2;

  const colW: Record<number, number> = {
    0: 20, 1: 17, 2: 8, 3: 10, 4: 10,
    5: 17, 6: 12, 7: 10, 8: 15, 9: 12,
    10: 14, 11: 12, 12: 25, 13: 16, 14: 9,
  };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  const cantW = Math.max((availW - fixedTotal) / numCantCols, 16);
  for (let i = 0; i < numCantCols; i++) colW[15 + i] = cantW;

  const totalColW = Object.values(colW).reduce((a, b) => a + b, 0);
  if (totalColW > availW) {
    const scale = availW / totalColW;
    Object.keys(colW).forEach(k => { colW[+k] = colW[+k] * scale; });
  }

  const columnStyles: Parameters<typeof autoTable>[1]["columnStyles"] = {
    0: { cellWidth: colW[0], halign: "left", fontSize: 7, overflow: "linebreak" },
    1: { cellWidth: colW[1], halign: "center", fontSize: 7 },
    2: { cellWidth: colW[2], halign: "center", fontSize: 7 },
    3: { cellWidth: colW[3], halign: "center", fontSize: 7 },
    4: { cellWidth: colW[4], halign: "center", fontSize: 7 },
    5: { cellWidth: colW[5], halign: "center", fontSize: 7 },
    6: { cellWidth: colW[6], halign: "center", fontSize: 7 },
    7: { cellWidth: colW[7], halign: "center", fontSize: 7 },
    8: { cellWidth: colW[8], halign: "center", fontSize: 7 },
    9: { cellWidth: colW[9], halign: "center", fontSize: 7 },
    10: { cellWidth: colW[10], halign: "center", fontSize: 7 },
    11: { cellWidth: colW[11], halign: "center", fontSize: 7 },
    12: { cellWidth: colW[12], halign: "left", fontSize: 7 },
    13: { cellWidth: colW[13], halign: "center", fontSize: 7 },
    14: { cellWidth: colW[14], halign: "center", fontSize: 7 },
    ...(numCantCols >= 1 ? { 15: { cellWidth: colW[15], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const } } : {}),
    ...(numCantCols >= 2 ? { 16: { cellWidth: colW[16], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const } } : {}),
    ...(numCantCols >= 3 ? { 17: { cellWidth: colW[17], halign: "center" as const, fontSize: 8, fontStyle: "bold" as const } } : {}),
  };

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: COT_FOOTER_H + M },
    head: [headAll],
    body: bodyRows,
    theme: "grid",
    headStyles: {
      fillColor: GRAY_DARK, textColor: WHITE, fontStyle: "bold",
      fontSize: 7, cellPadding: 1.2, halign: "center", valign: "middle",
    },
    bodyStyles: { fontSize: 7, textColor: BLACK, cellPadding: 1.2, valign: "middle", minCellHeight: 7 },
    alternateRowStyles: { fillColor: GRAY_ROW },
    columnStyles,
    didParseCell(data) {
      if (data.section === "head" && data.column.index >= 15) {
        data.cell.styles.fillColor = GRAY_MED;
      }


      if (data.section === "body") {
        const raw = data.row.raw as any[];
        const raw0 = String(raw?.[0] ?? "");
        const raw1 = String(raw?.[1] ?? "");
        const ci = data.column.index;
        const lastCol = headAll.length - 1;

        // ── Fila descripción propia ──────────────────────────────────────────
         if (raw0.startsWith("DESC:")) {
           if (ci === 0) {
             data.cell.colSpan = headAll.length;
             data.cell.styles.fillColor = [235, 242, 255] as [number, number, number];
             data.cell.styles.fontStyle = "bold";
             data.cell.styles.fontSize = 7.5;
             data.cell.styles.textColor = [40, 80, 180] as [number, number, number];
             data.cell.styles.halign = "left";
             data.cell.styles.cellPadding = 1.2;
             data.cell.text = [`Desc: ${raw0.slice(5)}`];
           } else {
             data.cell.styles.fillColor = [235, 242, 255] as [number, number, number];
             data.cell.text = [];
           }
           return;
         }

        // ── Fila observaciones (+ herramental embebido igual que en pedido) ────
        if (raw0.startsWith("Obs:")) {
          const hasHerr = raw1.startsWith("Herramental:");

          if (ci === 0) {
            data.cell.colSpan = hasHerr ? MID_COL : headAll.length;
            data.cell.styles.fillColor = GRAY_LIGHT;
            data.cell.styles.fontStyle = "italic";
            data.cell.styles.fontSize = 6.5;
            data.cell.styles.textColor = [80, 80, 80] as [number, number, number];
            data.cell.styles.halign = "left";
            data.cell.styles.cellPadding = 0.8;

          } else if (hasHerr && ci === MID_COL) {
            data.cell.colSpan = lastCol - MID_COL;
            data.cell.styles.fillColor = [250, 244, 230] as [number, number, number];
            data.cell.styles.fontStyle = "italic";
            data.cell.styles.fontSize = 6.5;
            data.cell.styles.textColor = [130, 70, 0] as [number, number, number];
            data.cell.styles.halign = "left";
            data.cell.styles.overflow = "linebreak";
            data.cell.styles.cellPadding = 0.8;
            data.cell.text = [raw1];

          } else if (hasHerr && ci === lastCol) {
            data.cell.styles.fillColor = [250, 244, 230] as [number, number, number];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 7;
            data.cell.styles.textColor = [130, 70, 0] as [number, number, number];
            data.cell.styles.halign = "center";

          } else {
            data.cell.styles.fillColor =
              ci < MID_COL
                ? GRAY_LIGHT
                : [250, 244, 230] as [number, number, number];
            data.cell.text = [];
          }
          return;
        }


      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 0;
  if (finalY + COT_FOOTER_H + M > PH) {
    doc.addPage();
  }

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
  doc.save(nombre);
  if (guardarEnS3) {
    const blob = doc.output("blob");
    await subirPdfA3(blob, nombre, "pdfs", "cotizaciones");
  }
}