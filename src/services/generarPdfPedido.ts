// generarPdfPedido.ts — LANDSCAPE A4 — mismo diseño que cotización

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  cargarLogoBase64,
  val, boolLabel, parsePantones, getMedida, formatCantidadCelda,
  dibujarEncabezado, dibujarCajasPie, dibujarPiePagina,
  GRAY_DARK, GRAY_MED, GRAY_LIGHT, GRAY_ROW, BLACK, WHITE,
} from "./Pdfutils";
import type { ProductoPdf, TotalesPdf } from "./Pdfutils";

interface PedidoPdf {
  no_pedido:      string;        // ← string: "P26001"
  no_cotizacion?: string | null; // ← string: "COT26001"
  fecha:          string;
  cliente:        string;
  empresa:        string;
  telefono:       string;
  correo:         string;
  impresion?:     string | null;
  logoBase64?:    string;
  productos:      ProductoPdf[];
  subtotal:       number;
  iva:            number;
  total:          number;
  anticipo:       number;
  saldo:          number;
}

export async function generarPdfPedido(pedido: PedidoPdf): Promise<void> {
  const logoBase64 = pedido.logoBase64
    ?? await cargarLogoBase64("/src/assets/logogrupeb.png");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const PW  = 297;
  const M   = 8;

  const y = dibujarEncabezado({
    doc,
    logoBase64,
    labelDocumento: "PEDIDO",
    labelFolio:     "No P",
    folio:          pedido.no_pedido,
    refTexto:       pedido.no_cotizacion
      ? `Ref. Cot. ${pedido.no_cotizacion}`
      : undefined,
    fecha:          pedido.fecha,
    empresa:        pedido.empresa,
    impresion:      pedido.impresion,
    cliente:        pedido.cliente,
    telefono:       pedido.telefono,
    correo:         pedido.correo,
  });

  const headAll = [
    "Descripción", "Medida", "B/K", "Tintas", "Caras",
    "Material", "Calibre", "Foil", "Asa/Suaje", "Alto Rel",
    "Laminado", "UV/BR", "Pantones", "Pigmento",
    "Cantidad",
  ];

  const bodyRows: any[][] = [];

  pedido.productos.forEach(prod => {
    const det = prod.detalles.find(d => d.cantidad > 0);

    bodyRows.push([
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
      det ? formatCantidadCelda(det, prod.por_kilo) : "—",
    ]);

    const tieneKilo = prod.detalles.some(d => d.modo_cantidad === "kilo");
    const modoLabel = tieneKilo ? "Por kilo" : "Por unidad";
    const obsTexto  = prod.observacion?.trim()
      ? `Obs: ${modoLabel}  —  ${prod.observacion.trim()}`
      : `Obs: ${modoLabel}`;
    const obsRow = new Array(headAll.length).fill("");
    obsRow[0] = obsTexto;
    bodyRows.push(obsRow);
  });

  const availW = PW - M * 2;

  // Anchos +25% proporcional
  const colW: Record<number, number> = {
    0: 36, 1: 18, 2:  9, 3: 11, 4: 11,
    5: 18, 6: 13, 7: 11, 8: 16, 9: 13,
    10: 15, 11: 13, 12: 32, 13: 20,
  };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  colW[14] = Math.max(availW - fixedTotal, 20);

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
    14: { cellWidth: colW[14], halign: "center", fontSize: 15   },
  };

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head:   [headAll],
    body:   bodyRows,
    theme:  "grid",
    // Header: 11pt  (antes 9pt)
    headStyles:         { fillColor: GRAY_DARK, textColor: WHITE, fontStyle: "bold", fontSize: 11, cellPadding: 1.5, halign: "center", valign: "middle" },
    // Body: 11pt, minCellHeight 9  (antes 9pt, 7)
    bodyStyles:         { fontSize: 11, textColor: BLACK, cellPadding: 1.5, valign: "middle", minCellHeight: 9 },
    alternateRowStyles: { fillColor: GRAY_ROW },
    columnStyles,
    didParseCell(data) {
      if (data.section === "head" && data.column.index === 14) {
        data.cell.styles.fillColor = GRAY_MED;
      }
      if (data.section === "body") {
        const raw0 = String((data.row.raw as any[])?.[0] ?? "");
        if (raw0.startsWith("Obs:")) {
          if (data.column.index === 0) {
            data.cell.colSpan          = headAll.length;
            data.cell.styles.fillColor = GRAY_LIGHT;
            data.cell.styles.fontStyle = "italic";
            // Obs: 11pt (antes 9pt)
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

  dibujarCajasPie(doc, pedido.productos, [], {
    subtotal: pedido.subtotal,
    iva:      pedido.iva,
    total:    pedido.total,
    anticipo: pedido.anticipo,
  });

  dibujarPiePagina(doc, "PEDIDO", pedido.no_pedido, pedido.fecha);

  doc.save(`Pedido_${pedido.no_pedido}.pdf`);
}