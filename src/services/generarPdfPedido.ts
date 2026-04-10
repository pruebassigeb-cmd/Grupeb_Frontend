// generarPdfPedido.ts — LANDSCAPE CARTA

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

interface PedidoPdf {
  no_pedido:      string;
  no_cotizacion?: string | null;
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
  celular?:        string | null;
  razon_social?:   string | null;
  rfc?:            string | null;
  domicilio?:      string | null;
  numero?:         string | null;
  colonia?:        string | null;
  codigo_postal?:  string | null;
  poblacion?:      string | null;
  estado_cliente?: string | null;
  cliente_id?:     number | null;
}

export async function generarPdfPedido(pedido: PedidoPdf): Promise<void> {
  const logoBase64 = pedido.logoBase64 ?? await cargarLogoBase64(logoUrl);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const PW  = 279.4;
  const PH  = 215.9;
  const M   = 10;
  const PED_FOOTER_H = 55;

  const y = await dibujarEncabezado({
    doc,
    logoBase64,
    labelDocumento: "PEDIDO",
    labelFolio:     "No P",
    folio:          pedido.no_pedido,
    refTexto:       pedido.no_cotizacion ? `Ref. Cot. ${pedido.no_cotizacion}` : undefined,
    fecha:          pedido.fecha,
    empresa:        pedido.empresa,
    impresion:      pedido.impresion,
    cliente:        pedido.cliente,
    telefono:       pedido.telefono,
    correo:         pedido.correo,
    celular:        pedido.celular        ?? null,
    razon_social:   pedido.razon_social   ?? null,
    rfc:            pedido.rfc            ?? null,
    domicilio:      pedido.domicilio      ?? null,
    numero:         pedido.numero         ?? null,
    colonia:        pedido.colonia        ?? null,
    codigo_postal:  pedido.codigo_postal  ?? null,
    poblacion:      pedido.poblacion      ?? null,
    estado_cliente: pedido.estado_cliente ?? null,
    cliente_id:     pedido.cliente_id     ?? null,
  });

  const headAll = [
    "Descripción", "Medida", "B/K", "Tintas", "Caras",
    "Material", "Calibre", "Foil", "Asa/Suaje", "Alto Rel",
    "Laminado", "UV/BR", "Pantones", "Pigmento",
    "Cantidad / Precio", "Importe",
  ];

  // fontSize por columna para el header
  // General: 8  |  Tintas (3): 7.5  |  Asa/Suaje (8): 7.5  |  Laminado (10): 7
  const HEAD_FONT_SIZE_DEFAULT = 8;
  const headFontSizeMap: Record<number, number> = {
    3:  7.5, // Tintas
    8:  7.5, // Asa/Suaje
    9: 7,
    10: 7,   // Laminado
  };

  const bodyRows: any[][] = [];

  pedido.productos.forEach(prod => {
    const det = prod.detalles.find(d => d.cantidad > 0);

    bodyRows.push([
      tipoProducto(prod.nombre),
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
      det ? formatImporte(det, prod.por_kilo) : "—",
    ]);

    const tieneKilo = prod.detalles.some(d => d.modo_cantidad === "kilo");
    const modoLabel = tieneKilo ? "Por kilo" : "Por unidad";
    const obsTexto  = prod.observacion?.trim()
      ? `Obs: ${modoLabel}  —  ${prod.observacion.trim()}`
      : `Obs: ${modoLabel}`;

    const hasHerr =
      prod.herramental_precio != null &&
      prod.herramental_precio > 0 &&
      prod.herramental_aprobado === true;

    const comboRow = new Array(headAll.length).fill("");
    comboRow[0] = obsTexto;

    if (hasHerr) {
      const nombreHerr = prod.herramental_descripcion?.trim() || "Herramental / molde";
      comboRow[1] = `Herramental: ${nombreHerr}  —  Costo de fabricación del molde o troquel aprobado para este artículo. Cargo único, no incluido en el precio por pieza.`;
      comboRow[headAll.length - 1] = `$${Number(prod.herramental_precio).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    bodyRows.push(comboRow);
  });

  const availW = PW - M * 2;

  const colW: Record<number, number> = {
    0: 32, 1: 17, 2:  8, 3: 10, 4: 10,
    5: 17, 6: 12, 7: 10, 8: 15, 9: 12,
    10: 14, 11: 12, 12: 28, 13: 18,
  };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  const remaining  = Math.max(availW - fixedTotal, 30);
  colW[14] = Math.round(remaining * 0.60);
  colW[15] = Math.round(remaining * 0.40);

  const totalColW = Object.values(colW).reduce((a, b) => a + b, 0);
  if (totalColW > availW) {
    const scale = availW / totalColW;
    Object.keys(colW).forEach(k => { colW[+k] = colW[+k] * scale; });
  }

  const columnStyles: Parameters<typeof autoTable>[1]["columnStyles"] = {
    0:  { cellWidth: colW[0],  halign: "left",   fontSize: 9 },
    1:  { cellWidth: colW[1],  halign: "center", fontSize: 9 },
    2:  { cellWidth: colW[2],  halign: "center", fontSize: 9 },
    3:  { cellWidth: colW[3],  halign: "center", fontSize: 9 },
    4:  { cellWidth: colW[4],  halign: "center", fontSize: 9 },
    5:  { cellWidth: colW[5],  halign: "center", fontSize: 9 },
    6:  { cellWidth: colW[6],  halign: "center", fontSize: 9 },
    7:  { cellWidth: colW[7],  halign: "center", fontSize: 9 },
    8:  { cellWidth: colW[8],  halign: "center", fontSize: 9 },
    9:  { cellWidth: colW[9],  halign: "center", fontSize: 9 },
    10: { cellWidth: colW[10], halign: "center", fontSize: 9 },
    11: { cellWidth: colW[11], halign: "center", fontSize: 9 },
    12: { cellWidth: colW[12], halign: "left",   fontSize: 9 },
    13: { cellWidth: colW[13], halign: "center", fontSize: 9 },
    14: { cellWidth: colW[14], halign: "center", fontSize: 9 },
    15: { cellWidth: colW[15], halign: "center", fontSize: 9, fontStyle: "bold" },
  };

  const MID_COL = Math.floor(headAll.length / 2);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: PED_FOOTER_H + M },
    head:   [headAll],
    body:   bodyRows,
    theme:  "grid",
    headStyles:         { fillColor: GRAY_DARK, textColor: WHITE, fontStyle: "bold", fontSize: HEAD_FONT_SIZE_DEFAULT, cellPadding: 1.2, halign: "center", valign: "middle" },
    bodyStyles:         { fontSize: 10, textColor: BLACK, cellPadding: 1.2, valign: "middle", minCellHeight: 7 },
    alternateRowStyles: { fillColor: GRAY_ROW },
    columnStyles,
    didParseCell(data) {
      // ── Header ──
      if (data.section === "head") {
        // Color especial en columnas Cantidad/Precio e Importe
        if (data.column.index === 14 || data.column.index === 15) {
          data.cell.styles.fillColor = GRAY_MED;
        }
        // fontSize especial por columna: Tintas, Asa/Suaje, Laminado
        const customSize = headFontSizeMap[data.column.index];
        if (customSize !== undefined) {
          data.cell.styles.fontSize = customSize;
        }
      }

      // ── Body: filas combo (Obs / Herramental) ──
      if (data.section === "body") {
        const raw     = data.row.raw as any[];
        const raw0    = String(raw?.[0] ?? "");
        const raw1    = String(raw?.[1] ?? "");
        const isCombo = raw0.startsWith("Obs:");

        if (!isCombo) return;

        const hasHerr = raw1.startsWith("Herramental:");
        const ci      = data.column.index;
        const lastCol = headAll.length - 1;

        if (ci === 0) {
          data.cell.colSpan            = hasHerr ? MID_COL : headAll.length;
          data.cell.styles.fillColor   = GRAY_LIGHT;
          data.cell.styles.fontStyle   = "italic";
          data.cell.styles.fontSize    = 6.5;
          data.cell.styles.textColor   = [80, 80, 80] as [number, number, number];
          data.cell.styles.halign      = "left";
          data.cell.styles.cellPadding = 0.8;

        } else if (hasHerr && ci === MID_COL) {
          data.cell.colSpan            = lastCol - MID_COL;
          data.cell.styles.fillColor   = [250, 244, 230] as [number, number, number];
          data.cell.styles.fontStyle   = "italic";
          data.cell.styles.fontSize    = 8;
          data.cell.styles.textColor   = [130, 70, 0] as [number, number, number];
          data.cell.styles.halign      = "left";
          data.cell.styles.overflow    = "linebreak";
          data.cell.styles.cellPadding = 0.8;
          data.cell.text               = [raw1];

        } else if (hasHerr && ci === lastCol) {
          data.cell.styles.fillColor   = [250, 244, 230] as [number, number, number];
          data.cell.styles.fontStyle   = "bold";
          data.cell.styles.fontSize    = 9;
          data.cell.styles.textColor   = [130, 70, 0] as [number, number, number];
          data.cell.styles.halign      = "center";

        } else {
          data.cell.styles.fillColor =
            ci < MID_COL
              ? GRAY_LIGHT
              : [250, 244, 230] as [number, number, number];
          data.cell.text = [];
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 0;
  if (finalY + PED_FOOTER_H + M > PH) {
    doc.addPage();
  }

  dibujarCajasPie(doc, pedido.productos, [], {
    subtotal: pedido.subtotal,
    iva:      pedido.iva,
    total:    pedido.total,
    anticipo: pedido.anticipo,
  });

  dibujarPiePagina(doc, "PEDIDO", pedido.no_pedido, pedido.fecha);

  doc.save(`Pedido_${pedido.no_pedido}.pdf`);
}