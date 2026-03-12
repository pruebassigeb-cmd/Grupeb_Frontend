// generarPdfCotizacion.ts — LANDSCAPE A4 — B&N

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  cargarLogoBase64,
  val, boolLabel, parsePantones, getMedida, formatFecha, formatCantidadCelda,
  dibujarEncabezado, dibujarCajasPie, dibujarPiePagina,
  GRAY_DARK, GRAY_MED, GRAY_LIGHT, GRAY_ROW, BLACK, WHITE,
} from "./Pdfutils";
import type { ProductoPdf } from "./Pdfutils";

interface CotizacionPdf {
  no_cotizacion: number;
  fecha:         string;
  cliente:       string;
  empresa:       string;
  telefono:      string;
  correo:        string;
  estado:        string;
  impresion?:    string | null;
  logoBase64?:   string;
  productos:     ProductoPdf[];
  total:         number;
}

export async function generarPdfCotizacion(cotizacion: CotizacionPdf): Promise<void> {
  const logoBase64 = cotizacion.logoBase64
    ?? await cargarLogoBase64("/src/assets/logogrupeb.png");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const PW  = 297;
  const M   = 8;

  const y = dibujarEncabezado({
    doc,
    logoBase64,
    labelDocumento: "COTIZACION",
    labelFolio:     "No F",
    folio:          cotizacion.no_cotizacion,
    fecha:          cotizacion.fecha,
    empresa:        cotizacion.empresa,
    impresion:      cotizacion.impresion,
    cliente:        cotizacion.cliente,
    telefono:       cotizacion.telefono,
    correo:         cotizacion.correo,
  });

  // ── Tabla de productos ────────────────────────────────────────────────────
  const maxDet      = Math.max(...cotizacion.productos.map(p => p.detalles.length), 1);
  const numCantCols = Math.min(maxDet, 3);

  const headFixed = [
    "Descripción", "Medida", "B/K", "Tintas", "Caras",
    "Material", "Calibre", "Foil", "Asa/Suaje", "Alto Rel",
    "Laminado", "UV/BR", "Pantones", "Pigmento",
  ];
  const headAll = [
    ...headFixed,
    ...Array.from({ length: numCantCols }, (_, i) => `Cant ${i + 1}`),
  ];

  const bodyRows: any[][] = [];

  cotizacion.productos.forEach(prod => {
    const row: any[] = [
      val(prod.nombre),
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
    ];

    for (let i = 0; i < numCantCols; i++) {
      const det = prod.detalles[i];
      row.push(det && det.cantidad > 0 ? formatCantidadCelda(det, prod.por_kilo) : "—");
    }

    bodyRows.push(row);

    const tieneKilo   = prod.detalles.some(d => d.modo_cantidad === "kilo");
    const tieneUnidad = prod.detalles.some(d => d.modo_cantidad !== "kilo");
    const modoLabel   = tieneKilo && tieneUnidad ? "Por kilo y por unidad"
                      : tieneKilo                ? "Cotizado por kilo"
                      :                            "Cotizado por unidad";
    const obsTexto    = prod.observacion?.trim()
      ? `Obs: ${modoLabel}  —  ${prod.observacion.trim()}`
      : `Obs: ${modoLabel}`;
    const obsRow = new Array(headAll.length).fill("");
    obsRow[0] = obsTexto;
    bodyRows.push(obsRow);
  });

  const availW = PW - M * 2;
  const colW: Record<number, number> = {
    0: 32, 1: 16, 2: 7, 3: 9, 4: 9,
    5: 16, 6: 11, 7: 9, 8: 14, 9: 11,
    10: 13, 11: 11, 12: 28, 13: 18,
  };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  const cantW      = Math.max((availW - fixedTotal) / numCantCols, 13);
  for (let i = 0; i < numCantCols; i++) colW[14 + i] = cantW;

  // Columnas de cantidad: fontSize 12 (8 * 1.5)
  const cantFontSize = 12;

  const columnStyles: Parameters<typeof autoTable>[1]["columnStyles"] = {
    0:  { cellWidth: colW[0],  halign: "left",   fontSize: 10.5 },  // Descripción  7 → 10.5
    1:  { cellWidth: colW[1],  halign: "center", fontSize: 12   },  // Medida       8 → 12
    2:  { cellWidth: colW[2],  halign: "center", fontSize: 9    },  // B/K          6 → 9
    3:  { cellWidth: colW[3],  halign: "center", fontSize: 9    },  // Tintas       6 → 9
    4:  { cellWidth: colW[4],  halign: "center", fontSize: 9    },  // Caras        6 → 9
    5:  { cellWidth: colW[5],  halign: "center", fontSize: 10.5 },  // Material     7 → 10.5
    6:  { cellWidth: colW[6],  halign: "center", fontSize: 9    },  // Calibre      6 → 9
    7:  { cellWidth: colW[7],  halign: "center", fontSize: 9    },  // Foil         6 → 9
    8:  { cellWidth: colW[8],  halign: "center", fontSize: 9    },  // Asa/Suaje    6 → 9
    9:  { cellWidth: colW[9],  halign: "center", fontSize: 9    },  // Alto Rel     6 → 9
    10: { cellWidth: colW[10], halign: "center", fontSize: 9    },  // Laminado     6 → 9
    11: { cellWidth: colW[11], halign: "center", fontSize: 9    },  // UV/BR        6 → 9
    12: { cellWidth: colW[12], halign: "left",   fontSize: 10.5 },  // Pantones     7 → 10.5
    13: { cellWidth: colW[13], halign: "center", fontSize: 10.5 },  // Pigmento     7 → 10.5
    ...(numCantCols >= 1 ? { 14: { cellWidth: colW[14], halign: "center" as const, fontSize: cantFontSize } } : {}),
    ...(numCantCols >= 2 ? { 15: { cellWidth: colW[15], halign: "center" as const, fontSize: cantFontSize } } : {}),
    ...(numCantCols >= 3 ? { 16: { cellWidth: colW[16], halign: "center" as const, fontSize: cantFontSize } } : {}),
  };

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head:   [headAll],
    body:   bodyRows,
    theme:  "grid",
    headStyles:         { fillColor: GRAY_DARK, textColor: WHITE, fontStyle: "bold", fontSize: 9, cellPadding: 1.2, halign: "center", valign: "middle" }, // 6 → 9
    bodyStyles:         { fontSize: 9, textColor: BLACK, cellPadding: 1.2, valign: "middle", minCellHeight: 7 }, // 6 → 9
    alternateRowStyles: { fillColor: GRAY_ROW },
    columnStyles,
    didParseCell(data) {
      if (data.section === "head" && data.column.index >= 14) {
        data.cell.styles.fillColor = GRAY_MED;
      }
      if (data.section === "body") {
        const raw0 = String((data.row.raw as any[])?.[0] ?? "");
        if (raw0.startsWith("Obs:")) {
          if (data.column.index === 0) {
            data.cell.colSpan          = headAll.length;
            data.cell.styles.fillColor = GRAY_LIGHT;
            data.cell.styles.fontStyle = "italic";
            data.cell.styles.fontSize  = 9; // 6 → 9
            data.cell.styles.textColor = [80, 80, 80];
            data.cell.styles.halign    = "left";
          } else {
            data.cell.styles.fillColor = GRAY_LIGHT;
            data.cell.text = [];
          }
        }
      }
    },
  });

  dibujarCajasPie(doc, cotizacion.productos, [
    "• Precios más IVA.",
    "• Tiempo de entrega: 30-35 días después de autorizado el diseño.",
    "• L.A.B. Guadalajara. EL FLETE VA POR CUENTA DEL CLIENTE.",
    "• Condiciones de Pago: 50% ANTICIPO, resto contra entrega.",
    "• Esta cotización puede variar +/- 10% en la cantidad final.",
    "• Precios sujetos a cambio sin previo aviso.",
  ]);

  dibujarPiePagina(doc, "COTIZACION", cotizacion.no_cotizacion, cotizacion.fecha);

  doc.save(`Cotizacion_${cotizacion.no_cotizacion}.pdf`);
}