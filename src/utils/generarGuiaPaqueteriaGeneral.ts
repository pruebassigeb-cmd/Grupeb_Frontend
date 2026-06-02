import jsPDF from "jspdf";
import type { GuiaPaqueteriaGeneral } from "../types/envios.types";
import { subirPdfA3 } from "../services/pdfS3.service";
import { blob } from "stream/consumers";

// Carta: 215.9mm x 279.4mm
// jsPDF: format:"letter", orientation:"portrait"

function txt(doc: jsPDF, text: string, x: number, y: number, size: number = 8) {
  if (!text) return;
  doc.setFontSize(size);
  doc.text(text, x, y);
}

function line(doc: jsPDF, x1: number, y1: number, x2: number, y2: number) {
  doc.line(x1, y1, x2, y2);
}

function rect(doc: jsPDF, x: number, y: number, w: number, h: number, style: "S" | "F" | "FD" = "S") {
  doc.rect(x, y, w, h, style);
}

export async function generarGuiaPaqueteriaGeneral(datos: GuiaPaqueteriaGeneral, guardarEnS3 = false): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit:        "mm",
    format:      "letter",
  });

  const PW = 215.9;
  const ML = 12;
  const MR = 12;
  const CW = PW - ML - MR;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  const folio = `ENV-${datos.no_pedido}`;

  // ══════════════════════════════════════════
  // ENCABEZADO — fondo negro, texto blanco
  // ══════════════════════════════════════════
  doc.setFillColor(30, 30, 30);
  rect(doc, ML, 10, CW, 18, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  txt(doc, "GUÍA DE ENVÍO", ML + 4, 18, 8);
  txt(doc, datos.paqueteria.toUpperCase(), ML + 4, 24, 14);

  doc.setFont("helvetica", "normal");
  txt(doc, "FOLIO", ML + CW - 40, 18, 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(210, 210, 210);
  txt(doc, folio, ML + CW - 40, 24, 12);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // ══════════════════════════════════════════
  // FILA 1: Pedido / Fecha / Bultos / Tipo cobro / Asegurado
  // ══════════════════════════════════════════
  const Y_INFO1 = 33;
  const COL_W   = CW / 5;

  for (let i = 0; i < 5; i++) {
    doc.setFillColor(240, 240, 240);
    rect(doc, ML + i * COL_W, Y_INFO1, COL_W - 1, 12, "FD");
  }

  doc.setTextColor(100, 100, 100);
  txt(doc, "NO. PEDIDO",     ML + 3,               Y_INFO1 + 4, 7);
  txt(doc, "FECHA DE ENVÍO", ML + COL_W + 3,       Y_INFO1 + 4, 7);
  txt(doc, "TOTAL BULTOS",   ML + COL_W * 2 + 3,   Y_INFO1 + 4, 7);
  txt(doc, "TIPO DE COBRO",  ML + COL_W * 3 + 3,   Y_INFO1 + 4, 7);
  txt(doc, "ASEGURADO",      ML + COL_W * 4 + 3,   Y_INFO1 + 4, 7);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);

  txt(doc, datos.no_pedido,            ML + 3,             Y_INFO1 + 9, 10);
  txt(doc, new Date(datos.fecha_envio).toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
  }),                                   ML + COL_W + 3,     Y_INFO1 + 9, 8);
  txt(doc, String(datos.total_bultos),  ML + COL_W * 2 + 3, Y_INFO1 + 9, 10);

  const cobroLabel = datos.tipo_cobro === "pagado"
    ? "Pagado"
    : datos.tipo_cobro === "por_cobrar"
      ? "Por cobrar"
      : "Cobrar al regreso";
  txt(doc, cobroLabel, ML + COL_W * 3 + 3, Y_INFO1 + 9, 8);

  doc.setFont("helvetica", "normal");
  txt(doc, datos.asegurado ? "Sí" : "No", ML + COL_W * 4 + 3, Y_INFO1 + 9, 10);

  // ══════════════════════════════════════════
  // FILA 2: Factura / Tipo de entrega
  // ══════════════════════════════════════════
  const Y_INFO2 = Y_INFO1 + 14;   // 47
  const HALF_CW = CW / 2;

  doc.setFillColor(248, 248, 248);
  rect(doc, ML,             Y_INFO2, HALF_CW - 1, 10, "FD");
  rect(doc, ML + HALF_CW,   Y_INFO2, HALF_CW - 1, 10, "FD");

  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  txt(doc, "FACTURA",         ML + 3,          Y_INFO2 + 3.5, 7);
  txt(doc, "TIPO DE ENTREGA", ML + HALF_CW + 3, Y_INFO2 + 3.5, 7);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  txt(doc, datos.requiere_factura ? "Con factura" : "Sin factura", ML + 3,           Y_INFO2 + 8.5, 9);
  txt(doc, datos.tipo_entrega === "domicilio" ? "A domicilio" : "Ocurre",
    ML + HALF_CW + 3, Y_INFO2 + 8.5, 9);

  doc.setFont("helvetica", "normal");

  // ══════════════════════════════════════════
  // REMITENTE / DESTINATARIO
  // ══════════════════════════════════════════
  const Y_PARTES = Y_INFO2 + 15;   // 62
  const HALF     = CW / 2 - 1;

  doc.setFillColor(200, 200, 200);
  rect(doc, ML,            Y_PARTES, HALF, 6, "FD");
  rect(doc, ML + HALF + 2, Y_PARTES, HALF, 6, "FD");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  txt(doc, "REMITENTE",    ML + 2,        Y_PARTES + 4, 7);
  txt(doc, "DESTINATARIO", ML + HALF + 4, Y_PARTES + 4, 7);

  const BOX_H = 38;
  doc.setDrawColor(160, 160, 160);
  rect(doc, ML, Y_PARTES + 6, HALF, BOX_H, "S");

  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.5);
  rect(doc, ML + HALF + 2, Y_PARTES + 6, HALF, BOX_H, "S");
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  txt(doc, datos.remitente.nombre_empresa, ML + 2, Y_PARTES + 12, 9);
  doc.setFont("helvetica", "normal");
  txt(doc, datos.remitente.razon_social,   ML + 2, Y_PARTES + 17, 8);
  txt(doc, datos.remitente.rfc,            ML + 2, Y_PARTES + 21, 8);
  txt(doc, datos.remitente.domicilio,      ML + 2, Y_PARTES + 25, 8);
  txt(doc, `${datos.remitente.colonia}, ${datos.remitente.ciudad}`, ML + 2, Y_PARTES + 29, 8);
  txt(doc, `${datos.remitente.estado}  C.P. ${datos.remitente.codigo_postal}`, ML + 2, Y_PARTES + 33, 8);
  txt(doc, datos.remitente.telefonos,      ML + 2, Y_PARTES + 38, 8);

  const DX = ML + HALF + 4;
  doc.setFont("helvetica", "bold");
  txt(doc, datos.destinatario.impresion || datos.destinatario.nombre, DX, Y_PARTES + 12, 10);
  doc.setFont("helvetica", "normal");
  if (datos.destinatario.impresion && datos.destinatario.impresion !== datos.destinatario.nombre) {
    txt(doc, datos.destinatario.nombre, DX, Y_PARTES + 17, 8);
  }
  txt(doc, datos.destinatario.rfc,       DX, Y_PARTES + 21, 8);
  txt(doc, datos.destinatario.domicilio,  DX, Y_PARTES + 25, 8);
  txt(doc, `${datos.destinatario.colonia}, ${datos.destinatario.ciudad}`, DX, Y_PARTES + 29, 8);
  doc.setFont("helvetica", "bold");
  txt(doc, `${datos.destinatario.estado}  C.P. ${datos.destinatario.codigo_postal}`, DX, Y_PARTES + 33, 9);
  doc.setFont("helvetica", "normal");
  txt(doc, datos.destinatario.telefonos,  DX, Y_PARTES + 38, 8);

  // ══════════════════════════════════════════
  // TABLA DE BULTOS
  // ══════════════════════════════════════════
  const Y_TABLA = Y_PARTES + 6 + BOX_H + 6;
  const ROW_H   = 9;
  const HEAD_H  = 7;

  doc.setFillColor(30, 30, 30);
  rect(doc, ML, Y_TABLA, CW, HEAD_H, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  txt(doc, "#",              ML + 2,   Y_TABLA + 4.5, 7);
  txt(doc, "PRODUCTO",       ML + 8,   Y_TABLA + 4.5, 7);
  txt(doc, "CLAVE PROD SAT", ML + 80,  Y_TABLA + 4.5, 7);
  txt(doc, "CLAVE UNID SAT", ML + 115, Y_TABLA + 4.5, 7);
  txt(doc, "CANTIDAD",       ML + 138, Y_TABLA + 4.5, 7);
  txt(doc, "PESO",           ML + 158, Y_TABLA + 4.5, 7);
  txt(doc, "MEDIDAS",        ML + 170, Y_TABLA + 4.5, 7);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  datos.bultos.forEach((bulto, idx) => {
    const Y = Y_TABLA + HEAD_H + idx * ROW_H;

    if (idx % 2 === 0) {
      doc.setFillColor(240, 240, 240);
      rect(doc, ML, Y, CW, ROW_H, "FD");
    } else {
      rect(doc, ML, Y, CW, ROW_H, "S");
    }

    const producto = [bulto.nombre_producto, bulto.medida].filter(Boolean).join(" ");

    txt(doc, String(idx + 1), ML + 2,  Y + 7, 8);
    txt(doc, producto,         ML + 8,  Y + 7, 8);

    doc.setFont("helvetica", "bold");
    doc.text(bulto.clave_producto_sat || "—", ML + 80,  Y + 7);
    doc.text(bulto.clave_unidad_sat   || "—", ML + 115, Y + 7);
    doc.setFont("helvetica", "normal");

    txt(doc,
      bulto.cantidad_unidades != null
        ? `${bulto.cantidad_unidades.toLocaleString("es-MX")} pzas`
        : "—",
      ML + 138, Y + 7, 8
    );
    txt(doc,
      bulto.peso != null ? `${bulto.peso} kg` : "—",
      ML + 158, Y + 7, 8
    );
    txt(doc,
      bulto.alto != null ? `${bulto.alto}×${bulto.largo}×${bulto.ancho}` : "—",
      ML + 170, Y + 7, 8
    );
  });

  // ══════════════════════════════════════════
  // OBSERVACIONES
  // ══════════════════════════════════════════
  const Y_OBS = Y_TABLA + HEAD_H + datos.bultos.length * ROW_H + 8;

  if (datos.observaciones) {
    doc.setFillColor(235, 235, 235);
    rect(doc, ML, Y_OBS, CW, 14, "FD");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    txt(doc, "OBSERVACIONES", ML + 3, Y_OBS + 5, 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    txt(doc, datos.observaciones, ML + 3, Y_OBS + 11, 8);
  }

  // ══════════════════════════════════════════
  // PIE DE PÁGINA
  // ══════════════════════════════════════════
  const Y_PIE = 274;
  doc.setDrawColor(150, 150, 150);
  line(doc, ML, Y_PIE, ML + CW, Y_PIE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  txt(doc, "Documento informativo — no tiene validez fiscal", ML, Y_PIE + 4, 7);
  txt(doc, folio, ML + CW - 25, Y_PIE + 4, 7);

  const nombre = `GuiaEnvio_${datos.paqueteria}_${datos.no_pedido}.pdf`;
  doc.save(nombre);
  if (guardarEnS3) {
        const blob = doc.output("blob");
    await subirPdfA3(blob, nombre, "pdfs", "formas-envio");
  }
}