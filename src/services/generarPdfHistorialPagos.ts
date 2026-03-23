import jsPDF from "jspdf";
import { cargarLogoBase64 } from "./Pdfutils";
import type { Venta, VentaPago } from "../types/ventas.types";
import logoUrl from "../assets/logogrupeb.png";


// ── Paleta monocromática ─────────────────────────────────────
const BLACK:      [number, number, number] = [0,   0,   0  ];
const WHITE:      [number, number, number] = [255, 255, 255];
const GRAY_DARK:  [number, number, number] = [60,  60,  60 ];
const GRAY_MED:   [number, number, number] = [140, 140, 140];
const GRAY_LIGHT: [number, number, number] = [240, 240, 240];
const GRAY_XDARK: [number, number, number] = [30,  30,  30 ];
const GRAY_SOFT:  [number, number, number] = [220, 220, 220];

const f = (v: any): string =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : String(v).trim();

const fmtMoney = (n: number): string =>
  `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function celda(
  doc: jsPDF,
  label: string,
  value: string,
  x: number, y: number, w: number, h: number,
  opts?: {
    bold?:      boolean;
    valueSize?: number;
    color?:     [number, number, number];
    fill?:      [number, number, number];
    alignLeft?: boolean;
  }
) {
  const { bold = false, valueSize = 11, color = BLACK, fill, alignLeft = false } = opts ?? {};
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.2);
  if (fill) {
    doc.setFillColor(...fill);
    doc.rect(x, y, w, h, "FD");
  } else {
    doc.rect(x, y, w, h);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_MED);
  doc.text(label, x + 1.5, y + 3.5);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(valueSize);
  doc.setTextColor(...color);
  if (alignLeft) {
    doc.text(value, x + 1.5, y + h - 2.5, { maxWidth: w - 3 });
  } else {
    doc.text(value, x + w / 2, y + h - 2.5, { align: "center" });
  }
  doc.setTextColor(...BLACK);
}

function seccionHeader(
  doc: jsPDF,
  label: string,
  x: number, y: number, w: number, h = 7
) {
  doc.setFillColor(...GRAY_XDARK);
  doc.rect(x, y, w, h, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text(label, x + w / 2, y + h / 2 + 1.5, { align: "center" });
  doc.setTextColor(...BLACK);
}

export async function generarPdfHistorialPagos(venta: Venta): Promise<void> {
const logoBase64 = await cargarLogoBase64(logoUrl);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const M  = 10;
  const CW = PW - M * 2;
  let y = M;

  // ════════════════════════════════════════════════════════════
  // ENCABEZADO
  // ════════════════════════════════════════════════════════════
  const logoW   = 28;
  const folioW  = 45;
  const tituW   = CW - logoW - folioW;
  const headerH = 22;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(M, y, logoW, headerH);
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", M + 1, y + 1, logoW - 2, headerH - 2); }
    catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...BLACK);
      doc.text("EB", M + logoW / 2, y + headerH / 2 + 2, { align: "center" });
    }
  }

  const tituX = M + logoW;
  doc.rect(tituX, y, tituW, headerH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text("Historial de Pagos", tituX + tituW / 2, y + 9, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("Registro de anticipos y abonos", tituX + tituW / 2, y + 15, { align: "center" });
  doc.setTextColor(...BLACK);

  const folioX = M + logoW + tituW;
  doc.rect(folioX, y, folioW, headerH);
  doc.setFillColor(...GRAY_XDARK);
  doc.rect(folioX, y, folioW, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text("PEDIDO", folioX + folioW / 2, y + 4.2, { align: "center" });
  doc.setTextColor(...BLACK);
  doc.setFontSize(15);
  doc.text(`#${venta.no_pedido}`, folioX + folioW / 2, y + 12, { align: "center" });
  doc.setDrawColor(...GRAY_MED);
  doc.line(folioX, y + 14, folioX + folioW, y + 14);
  doc.setDrawColor(...BLACK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("FECHA", folioX + 2, y + 17.5);
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(formatFecha(venta.fecha_pedido), folioX + folioW / 2, y + 21, { align: "center" });

  y += headerH + 3;

  // ════════════════════════════════════════════════════════════
  // DATOS DEL CLIENTE
  // ════════════════════════════════════════════════════════════
  seccionHeader(doc, "DATOS DEL CLIENTE", M, y, CW);
  y += 7;

  const clienteH = 10;
  const c1 = CW * 0.28;
  const c2 = CW * 0.20;
  const c3 = CW * 0.22;
  const c4 = CW - c1 - c2 - c3;

  celda(doc, "Cliente",  f(venta.cliente),  M,                y, c1, clienteH);
  celda(doc, "Empresa",  f(venta.empresa),  M + c1,           y, c2, clienteH);
  celda(doc, "Teléfono", f(venta.telefono), M + c1 + c2,      y, c3, clienteH);
  celda(doc, "Correo",   f(venta.correo),   M + c1 + c2 + c3, y, c4, clienteH, { valueSize: 8 });

  y += clienteH + 4;

  // ════════════════════════════════════════════════════════════
  // RESUMEN FINANCIERO
  // ════════════════════════════════════════════════════════════
  seccionHeader(doc, "RESUMEN FINANCIERO", M, y, CW);
  y += 7;

  const finH   = 10;
  const colFin = CW / 4;

  const anticipo = Number(venta.anticipo);
  const abono    = Number(venta.abono);
  const saldo    = Number(venta.saldo);
  const total    = Number(venta.total);

  const resumenCols: {
    label: string; value: string;
    bold?: boolean; color?: [number,number,number]; fill?: [number,number,number];
  }[] = [
    { label: "Total del Pedido",   value: fmtMoney(total),    bold: true, fill: WHITE                                   },
    { label: "Anticipo Requerido", value: fmtMoney(anticipo),             fill: GRAY_LIGHT                              },
    { label: "Total Abonado",      value: fmtMoney(abono),    bold: true, color: GRAY_XDARK, fill: GRAY_SOFT            },
    {
      label: "Saldo Pendiente",
      value: saldo <= 0 ? "LIQUIDADO" : fmtMoney(saldo),
      bold:  true,
      color: saldo <= 0 ? GRAY_DARK : BLACK,
      fill:  saldo <= 0 ? GRAY_LIGHT : GRAY_SOFT,
    },
  ];

  resumenCols.forEach((col, i) => {
    celda(doc, col.label, col.value, M + i * colFin, y, colFin, finH,
      { bold: col.bold, color: col.color ?? BLACK, fill: col.fill });
  });

  y += finH + 4;

  // ════════════════════════════════════════════════════════════
  // HISTORIAL DE PAGOS
  // ════════════════════════════════════════════════════════════
  seccionHeader(doc, "HISTORIAL DE PAGOS", M, y, CW);
  y += 7;

  const pColFecha  = CW * 0.18;
  const pColMonto  = CW * 0.20;
  const pColMetodo = CW * 0.22;
  const pColTipo   = CW * 0.14;
  const pColObs    = CW - pColFecha - pColMonto - pColMetodo - pColTipo;

  const pagoHeaders = [
    { label: "Fecha",       w: pColFecha  },
    { label: "Monto",       w: pColMonto  },
    { label: "Método",      w: pColMetodo },
    { label: "Tipo",        w: pColTipo   },
    { label: "Observación", w: pColObs    },
  ];

  const pagoHeaderH = 7;
  let phx = M;
  pagoHeaders.forEach(h => {
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(phx, y, h.w, pagoHeaderH, "FD");
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.2);
    doc.rect(phx, y, h.w, pagoHeaderH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_DARK);
    doc.text(h.label, phx + h.w / 2, y + pagoHeaderH / 2 + 1.5, { align: "center" });
    phx += h.w;
  });
  y += pagoHeaderH;
  doc.setTextColor(...BLACK);

  const pagos: VentaPago[] = venta.pagos ?? [];
  const pagoRowH = 9;
  let totalAcumulado = 0;

  if (pagos.length === 0) {
    doc.setFillColor(...WHITE);
    doc.rect(M, y, CW, pagoRowH, "FD");
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.15);
    doc.rect(M, y, CW, pagoRowH);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_MED);
    doc.text("Sin pagos registrados", M + CW / 2, y + pagoRowH / 2 + 1.5, { align: "center" });
    doc.setTextColor(...BLACK);
    y += pagoRowH;
  } else {
    pagos.forEach((pago, idx) => {
      const bg: [number,number,number] = idx % 2 === 0 ? WHITE : [248, 248, 248];

      const pagoVals = [
        { value: formatFecha(pago.fecha),                  w: pColFecha,  bold: false, color: BLACK      as [number,number,number], center: true  },
        { value: fmtMoney(pago.monto),                     w: pColMonto,  bold: true,  color: GRAY_XDARK as [number,number,number], center: true  },
        { value: pago.metodo_pago ?? "—",                  w: pColMetodo, bold: false, color: BLACK      as [number,number,number], center: true  },
        { value: pago.es_anticipo ? "Anticipo" : "Abono",  w: pColTipo,   bold: false, color: GRAY_DARK  as [number,number,number], center: true  },
        { value: pago.observacion ?? "—",                  w: pColObs,    bold: false, color: GRAY_DARK  as [number,number,number], center: false },
      ];

      let prx = M;
      pagoVals.forEach(pv => {
        doc.setFillColor(...bg);
        doc.rect(prx, y, pv.w, pagoRowH, "FD");
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.15);
        doc.rect(prx, y, pv.w, pagoRowH);
        doc.setFont("helvetica", pv.bold ? "bold" : "normal");
        doc.setFontSize(8);
        doc.setTextColor(...pv.color);
        if (pv.center) {
          doc.text(pv.value, prx + pv.w / 2, y + pagoRowH / 2 + 1.5, { align: "center" });
        } else {
          doc.text(pv.value, prx + 1.5, y + pagoRowH / 2 + 1.5, { maxWidth: pv.w - 3 });
        }
        prx += pv.w;
      });

      totalAcumulado += Number(pago.monto);
      doc.setTextColor(...BLACK);
      y += pagoRowH;
    });
  }

  // Fila total
  const totRowH = 9;
  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(M, y, CW, totRowH, "FD");
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.2);
  doc.rect(M, y, CW, totRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_DARK);
  doc.text(
    `Total pagado (${pagos.length} pago${pagos.length !== 1 ? "s" : ""})`,
    M + 3, y + totRowH / 2 + 1.5
  );
  doc.setTextColor(...GRAY_XDARK);
  doc.text(fmtMoney(totalAcumulado), M + CW - 3, y + totRowH / 2 + 1.5, { align: "right" });
  doc.setTextColor(...BLACK);
  y += totRowH;

  // ════════════════════════════════════════════════════════════
  // DATOS BANCARIOS Y CONTACTO
  // ════════════════════════════════════════════════════════════
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text(
    "Favor de hacer su depósito a cualquiera de las siguientes cuentas y mandar ficha de depósito vía fax:",
    PW / 2, y, { align: "center", maxWidth: CW }
  );
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text("Banamex", PW / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("Cuenta # 70010708964", PW / 2, y, { align: "center" });
  y += 5;
  doc.text("Grupeb S.A. de C.V.", PW / 2, y, { align: "center" });
  y += 9;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("Estamos a sus órdenes para cualquier duda o aclaración.", PW / 2, y, { align: "center" });
  y += 6;

  // doc.setFont("helvetica", "bold");
  // doc.setFontSize(10);
  // doc.setTextColor(...BLACK);
  // doc.text("Yesenia Zúñiga", PW / 2, y, { align: "center" });
  // y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text("Departamento de Ventas", PW / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("www.grupoeb.com.mx", PW / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_DARK);
  doc.text(
    "Rogelio Ledesma # 102   Col. Cruz Vieja   45644   Tlajomulco de Zuñiga, Jalisco. México",
    PW / 2, y, { align: "center" }
  );
  y += 5;
  doc.text("Tels. (33) 3180-3373, 3125-9595, 3180-1460", PW / 2, y, { align: "center" });
  y += 5;
  doc.text("ventas@grupoeb.com.mx", PW / 2, y, { align: "center" });

  doc.setTextColor(...BLACK);
  doc.save(`HistorialPagos_Pedido${venta.no_pedido}.pdf`);
}