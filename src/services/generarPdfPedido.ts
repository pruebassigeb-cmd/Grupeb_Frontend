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
  // ── Campos nuevos de cliente ──────────────────────────────────────────────
  celular?:        string | null;
  razon_social?:   string | null;
  rfc?:            string | null;
  domicilio?:      string | null;
  numero?:         string | null;
  colonia?:        string | null;
  codigo_postal?:  string | null;
  poblacion?:      string | null;
  estado_cliente?: string | null;
}

export async function generarPdfPedido(pedido: PedidoPdf): Promise<void> {
  const logoBase64 = pedido.logoBase64 ?? await cargarLogoBase64(logoUrl);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const PW  = 297;
  const M   = 8;

  const y = dibujarEncabezado({
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

    if (
      prod.herramental_precio != null &&
      prod.herramental_precio > 0 &&
      prod.herramental_aprobado === true
    ) {
      const herrRow    = new Array(headAll.length).fill("");
      const nombreHerr = prod.herramental_descripcion?.trim() || "Herramental / molde";
      herrRow[0] = `HERR: ${nombreHerr}  —  Costo de fabricación del molde o troquel aprobado para este artículo. Cargo único, no incluido en el precio por pieza.`;
      herrRow[headAll.length - 1] = `$${Number(prod.herramental_precio).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      bodyRows.push(herrRow);
    }
  });

  const availW = PW - M * 2;

  const colW: Record<number, number> = {
    0: 36, 1: 18, 2:  9, 3: 11, 4: 11,
    5: 18, 6: 13, 7: 11, 8: 16, 9: 13,
    10: 15, 11: 13, 12: 32, 13: 20,
  };
  const fixedTotal = Object.values(colW).reduce((a, b) => a + b, 0);
  colW[14] = Math.max(availW - fixedTotal, 20);

  const totalColW = Object.values(colW).reduce((a, b) => a + b, 0);
  if (totalColW > availW) {
    const scale = availW / totalColW;
    Object.keys(colW).forEach(k => { colW[+k] = colW[+k] * scale; });
  }

  const columnStyles: Parameters<typeof autoTable>[1]["columnStyles"] = {
    0:  { cellWidth: colW[0],  halign: "left",   fontSize: 11 },
    1:  { cellWidth: colW[1],  halign: "center", fontSize: 12 },
    2:  { cellWidth: colW[2],  halign: "center", fontSize: 11 },
    3:  { cellWidth: colW[3],  halign: "center", fontSize: 11 },
    4:  { cellWidth: colW[4],  halign: "center", fontSize: 11 },
    5:  { cellWidth: colW[5],  halign: "center", fontSize: 11 },
    6:  { cellWidth: colW[6],  halign: "center", fontSize: 11 },
    7:  { cellWidth: colW[7],  halign: "center", fontSize: 11 },
    8:  { cellWidth: colW[8],  halign: "center", fontSize: 11 },
    9:  { cellWidth: colW[9],  halign: "center", fontSize: 11 },
    10: { cellWidth: colW[10], halign: "center", fontSize: 11 },
    11: { cellWidth: colW[11], halign: "center", fontSize: 11 },
    12: { cellWidth: colW[12], halign: "left",   fontSize: 11 },
    13: { cellWidth: colW[13], halign: "center", fontSize: 11 },
    14: { cellWidth: colW[14], halign: "center", fontSize: 15 },
  };

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head:   [headAll],
    body:   bodyRows,
    theme:  "grid",
    headStyles:         { fillColor: GRAY_DARK, textColor: WHITE, fontStyle: "bold", fontSize: 11, cellPadding: 1.5, halign: "center", valign: "middle" },
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
            data.cell.styles.fontSize  = 11;
            data.cell.styles.textColor = [80, 80, 80];
            data.cell.styles.halign    = "left";
          } else {
            data.cell.styles.fillColor = GRAY_LIGHT;
            data.cell.text = [];
          }
        }

        if (raw0.startsWith("HERR:")) {
          if (data.column.index === 0) {
            data.cell.colSpan          = headAll.length - 1;
            data.cell.styles.fillColor = [250, 244, 230];
            data.cell.styles.fontStyle = "italic";
            data.cell.styles.fontSize  = 9;
            data.cell.styles.textColor = [130, 70, 0];
            data.cell.styles.halign    = "left";
            data.cell.styles.overflow  = "linebreak";
          } else if (data.column.index === headAll.length - 1) {
            data.cell.styles.fillColor = [250, 244, 230];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize  = 11;
            data.cell.styles.textColor = [130, 70, 0];
            data.cell.styles.halign    = "center";
          } else {
            data.cell.styles.fillColor = [250, 244, 230];
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