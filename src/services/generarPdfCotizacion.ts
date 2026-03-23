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
import logoUrl from "../assets/logogrupeb.png";


interface CotizacionPdf {
  no_cotizacion: string;       // ← string: "COT26001"
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
  ?? await cargarLogoBase64(logoUrl);

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

  // Anchos de columna +25% para las columnas más angostas, recalculando proporcionalmente
  const colW: Record<number, number> = {
    0: 36, 1: 18, 2:  9, 3: 11, 4: 11,
    5: 18, 6: 13, 7: 11, 8: 16, 9: 13,
    10: 15, 11: 13, 12: 32, 13: 20,
  };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  const cantW      = Math.max((availW - fixedTotal) / numCantCols, 16);
  for (let i = 0; i < numCantCols; i++) colW[14 + i] = cantW;

  // Fuentes tabla: header 11pt, body 11pt, cant 15pt  (antes 9/9/12)
  const cantFontSize = 15;

  const columnStyles: Parameters<typeof autoTable>[1]["columnStyles"] = {
    0:  { cellWidth: colW[0],  halign: "left",   fontSize: 11   },
    1:  { cellWidth: colW[1],  halign: "center", fontSize: 12   },
    2:  { cellWidth: colW[2],  halign: "center", fontSize: 11   },
    3:  { cellWidth: colW[3],  halign: "center", fontSize: 11   },
    4:  { cellWidth: colW[4],  halign: "center", fontSize: 11   },
    5:  { cellWidth: colW[5],  halign: "center", fontSize: 11   },
    6:  { cellWidth: colW[6],  halign: "center", fontSize: 11   },
    7:  { cellWidth: colW[7],  halign: "center", fontSize: 11   },
    8:  { cellWidth: colW[8],  halign: "center", fontSize: 11   },
    9:  { cellWidth: colW[9],  halign: "center", fontSize: 11   },
    10: { cellWidth: colW[10], halign: "center", fontSize: 11   },
    11: { cellWidth: colW[11], halign: "center", fontSize: 11   },
    12: { cellWidth: colW[12], halign: "left",   fontSize: 11   },
    13: { cellWidth: colW[13], halign: "center", fontSize: 11   },
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
    // Header tabla: 11pt bold  (antes 9pt)
    headStyles:         { fillColor: GRAY_DARK, textColor: WHITE, fontStyle: "bold", fontSize: 11, cellPadding: 1.5, halign: "center", valign: "middle" },
    // Body: 11pt, altura mínima 9  (antes 9pt, 7)
    bodyStyles:         { fontSize: 11, textColor: BLACK, cellPadding: 1.5, valign: "middle", minCellHeight: 9 },
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
            // Obs row: 11pt (antes 9pt)
            data.cell.styles.fontSize  = 11;
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