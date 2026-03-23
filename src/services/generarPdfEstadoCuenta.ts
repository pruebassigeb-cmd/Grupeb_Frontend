import jsPDF from "jspdf";
import { cargarLogoBase64 } from "./Pdfutils";
import type { EstadoCuenta } from "./estadoCuentaService";
import type { VentaPago } from "../types/ventas.types";

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

const fmtNum = (n: number): string =>
  Number(n).toLocaleString("es-MX");

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
  // valueSize por defecto: 13pt (antes 11pt)
  const { bold = false, valueSize = 13, color = BLACK, fill, alignLeft = false } = opts ?? {};
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.2);
  if (fill) {
    doc.setFillColor(...fill);
    doc.rect(x, y, w, h, "FD");
  } else {
    doc.rect(x, y, w, h);
  }
  doc.setFont("helvetica", "normal");
  // Label: 9.5pt (antes 7.5pt)
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY_MED);
  doc.text(label, x + 1.5, y + 4.5);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(valueSize);
  doc.setTextColor(...color);
  if (alignLeft) {
    doc.text(value, x + 1.5, y + h - 3, { maxWidth: w - 3 });
  } else {
    doc.text(value, x + w / 2, y + h - 3, { align: "center" });
  }
  doc.setTextColor(...BLACK);
}

function seccionHeader(
  doc: jsPDF,
  label: string,
  x: number, y: number, w: number, h = 9  // antes 7
) {
  doc.setFillColor(...GRAY_XDARK);
  doc.rect(x, y, w, h, "FD");
  doc.setFont("helvetica", "bold");
  // Header sección: 11pt (antes 9pt)
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text(label, x + w / 2, y + h / 2 + 2, { align: "center" });
  doc.setTextColor(...BLACK);
}

export async function generarPdfEstadoCuenta(
  datos: EstadoCuenta,
  pagos: VentaPago[]
): Promise<void> {
  const logoBase64 = await cargarLogoBase64("/src/assets/logogrupeb.png");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const M  = 10;
  const CW = PW - M * 2;
  let y = M;

  // ════════════════════════════════════════════════════════════
  // ENCABEZADO
  // ════════════════════════════════════════════════════════════
  const logoW   = 32;
  const folioW  = 52;
  const tituW   = CW - logoW - folioW;
  // headerH: 28 (antes 22)
  const headerH = 28;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(M, y, logoW, headerH);
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", M + 1, y + 1, logoW - 2, headerH - 2); }
    catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...BLACK);
      doc.text("EB", M + logoW / 2, y + headerH / 2 + 3, { align: "center" });
    }
  }

  const tituX = M + logoW;
  doc.rect(tituX, y, tituW, headerH);
  doc.setFont("helvetica", "bold");
  // Título principal: 17pt (antes 14pt)
  doc.setFontSize(17);
  doc.setTextColor(...BLACK);
  doc.text("Estado de Cuenta", tituX + tituW / 2, y + 11, { align: "center" });
  doc.setFont("helvetica", "normal");
  // Subtítulo: 10.5pt (antes 8.5pt)
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("Resumen financiero de producción real", tituX + tituW / 2, y + 19, { align: "center" });
  doc.setTextColor(...BLACK);

  const folioX = M + logoW + tituW;
  doc.rect(folioX, y, folioW, headerH);
  doc.setFillColor(...GRAY_XDARK);
  // Banda "PEDIDO": altura 8 (antes 6)
  doc.rect(folioX, y, folioW, 8, "FD");
  doc.setFont("helvetica", "bold");
  // "PEDIDO" label: 10.5pt (antes 8.5pt)
  doc.setFontSize(10.5);
  doc.setTextColor(...WHITE);
  doc.text("PEDIDO", folioX + folioW / 2, y + 5.5, { align: "center" });
  doc.setTextColor(...BLACK);
  // Número pedido: 18pt (antes 15pt)
  doc.setFontSize(18);
  doc.text(`#${datos.no_pedido}`, folioX + folioW / 2, y + 15, { align: "center" });
  doc.setDrawColor(...GRAY_MED);
  doc.line(folioX, y + 17, folioX + folioW, y + 17);
  doc.setDrawColor(...BLACK);
  doc.setFont("helvetica", "normal");
  // "FECHA" label: 9.5pt (antes 7.5pt)
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("FECHA", folioX + 2, y + 21.5);
  // Fecha valor: 11pt (antes 9pt)
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(formatFecha(datos.fecha), folioX + folioW / 2, y + 26, { align: "center" });

  y += headerH + 4;

  // ════════════════════════════════════════════════════════════
  // DATOS DEL CLIENTE
  // ════════════════════════════════════════════════════════════
  seccionHeader(doc, "DATOS DEL CLIENTE", M, y, CW);
  y += 9;

  // clienteH: 13 (antes 10)
  const clienteH = 13;
  const c1 = CW * 0.28;
  const c2 = CW * 0.20;
  const c3 = CW * 0.22;
  const c4 = CW - c1 - c2 - c3;

  celda(doc, "Cliente",  f(datos.cliente),  M,                y, c1, clienteH);
  celda(doc, "Empresa",  f(datos.empresa),  M + c1,           y, c2, clienteH);
  celda(doc, "Teléfono", f(datos.telefono), M + c1 + c2,      y, c3, clienteH);
  celda(doc, "Correo",   f(datos.correo),   M + c1 + c2 + c3, y, c4, clienteH, { valueSize: 10 });

  y += clienteH + 5;

  // ════════════════════════════════════════════════════════════
  // TABLA COMPARATIVA DE PRODUCTOS
  // ════════════════════════════════════════════════════════════
  seccionHeader(doc, "COMPARATIVA POR PRODUCTO — CANTIDAD Y PRECIO", M, y, CW);
  y += 9;

  const colNom    = CW * 0.24;
  const colOrden  = CW * 0.12;
  const colCantO  = CW * 0.10;
  const colCantR  = CW * 0.10;
  const colDifPzs = CW * 0.09;
  const colPreO   = CW * 0.11;
  const colPreR   = CW * 0.11;
  const colDifPre = CW - colNom - colOrden - colCantO - colCantR - colDifPzs - colPreO - colPreR;

  const tabHeaders = [
    { label: "Producto",       w: colNom    },
    { label: "N° Orden",       w: colOrden  },
    { label: "Cant. Original", w: colCantO  },
    { label: "Cant. Real",     w: colCantR  },
    { label: "Dif. Pzas",      w: colDifPzs },
    { label: "Precio Orig.",   w: colPreO   },
    { label: "Precio Real",    w: colPreR   },
    { label: "Dif. Precio",    w: colDifPre },
  ];

  // tabHeaderH: 10 (antes 8)
  const tabHeaderH = 10;
  let hx = M;
  tabHeaders.forEach(h => {
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(hx, y, h.w, tabHeaderH, "FD");
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.2);
    doc.rect(hx, y, h.w, tabHeaderH);
    doc.setFont("helvetica", "bold");
    // Header tabla: 9pt (antes 7pt)
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_DARK);
    doc.text(h.label, hx + h.w / 2, y + tabHeaderH / 2 + 2, { align: "center" });
    hx += h.w;
  });
  y += tabHeaderH;
  doc.setTextColor(...BLACK);

  // rowH: 11 (antes 9)
  const rowH = 11;
  datos.productos.forEach((prod, idx) => {
    const diffPzas   = prod.diferencia_piezas;
    const diffPrecio = prod.diferencia_precio;
    const bgRow: [number, number, number] = idx % 2 === 0 ? WHITE : [248, 248, 248];
    const difPzasColor:   [number, number, number] = diffPzas   !== 0 ? GRAY_XDARK : GRAY_MED;
    const difPrecioColor: [number, number, number] = diffPrecio !== 0 ? GRAY_XDARK : GRAY_MED;

    const cols = [
      { value: prod.nombre,                                          w: colNom,    bold: false, color: BLACK      as [number,number,number], left: true  },
      { value: prod.no_produccion ?? "—",                            w: colOrden,  bold: false, color: GRAY_DARK  as [number,number,number], left: false },
      { value: fmtNum(prod.cantidad_original),                       w: colCantO,  bold: false, color: BLACK      as [number,number,number], left: false },
      { value: fmtNum(prod.cantidad_real),                           w: colCantR,  bold: true,  color: GRAY_XDARK as [number,number,number], left: false },
      { value: (diffPzas > 0 ? "+" : "") + fmtNum(diffPzas),        w: colDifPzs, bold: true,  color: difPzasColor,                         left: false },
      { value: fmtMoney(prod.precio_total_original),                 w: colPreO,   bold: false, color: BLACK      as [number,number,number], left: false },
      { value: fmtMoney(prod.precio_total_real),                     w: colPreR,   bold: true,  color: GRAY_XDARK as [number,number,number], left: false },
      { value: (diffPrecio > 0 ? "+" : "") + fmtMoney(diffPrecio),  w: colDifPre, bold: true,  color: difPrecioColor,                       left: false },
    ];

    let rx = M;
    cols.forEach(col => {
      doc.setFillColor(...bgRow);
      doc.rect(rx, y, col.w, rowH, "FD");
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.15);
      doc.rect(rx, y, col.w, rowH);
      doc.setFont("helvetica", col.bold ? "bold" : "normal");
      // Texto filas: nombre 9pt, resto 10pt  (antes 7/8pt)
      doc.setFontSize(col.left ? 9 : 10);
      doc.setTextColor(...col.color);
      if (col.left) {
        doc.text(col.value, rx + 1.5, y + rowH / 2 + 2, { maxWidth: col.w - 3 });
      } else {
        doc.text(col.value, rx + col.w / 2, y + rowH / 2 + 2, { align: "center" });
      }
      rx += col.w;
    });

    doc.setTextColor(...BLACK);
    y += rowH;
  });

  y += 5;

  // ════════════════════════════════════════════════════════════
  // RESUMEN FINANCIERO
  // ════════════════════════════════════════════════════════════
  seccionHeader(doc, "RESUMEN FINANCIERO", M, y, CW);
  y += 9;

  // finH: 13 (antes 10)
  const finH   = 13;
  const colFin = CW / 6;

  const finCols: {
    label: string; value: string;
    bold?: boolean; color?: [number,number,number]; fill?: [number,number,number];
  }[] = [
    { label: "Subtotal Original", value: fmtMoney(datos.subtotal_original), fill: WHITE },
    { label: "IVA 16% Original",  value: fmtMoney(datos.iva_original),      fill: WHITE },
    { label: "Total Original",    value: fmtMoney(datos.total_original),    bold: true, fill: WHITE },
    { label: "Subtotal Real",     value: fmtMoney(datos.subtotal_real),     color: GRAY_XDARK, fill: GRAY_LIGHT },
    { label: "IVA 16% Real",      value: fmtMoney(datos.iva_real),          color: GRAY_XDARK, fill: GRAY_LIGHT },
    { label: "Total Real",        value: fmtMoney(datos.total_real),        bold: true, color: BLACK, fill: GRAY_SOFT },
  ];

  finCols.forEach((col, i) => {
    celda(doc, col.label, col.value, M + i * colFin, y, colFin, finH,
      { bold: col.bold, color: col.color ?? BLACK, fill: col.fill });
  });
  y += finH;

  const difVal  = datos.diferencia_total;
  const difStr  = (difVal > 0 ? "+" : "") + fmtMoney(difVal);
  const difFill:  [number,number,number] = difVal !== 0 ? GRAY_SOFT  : GRAY_LIGHT;
  const difColor: [number,number,number] = difVal !== 0 ? GRAY_XDARK : GRAY_MED;

  const difW   = colFin * 2;
  const anticW = colFin;
  const abonoW = colFin;
  const saldoW = CW - difW - anticW - abonoW;

  celda(doc, "Diferencia Total",   difStr,                   M,                       y, difW,   finH, { bold: true, color: difColor, fill: difFill });
  celda(doc, "Anticipo Requerido", fmtMoney(datos.anticipo), M + difW,                y, anticW, finH, { fill: GRAY_LIGHT });
  celda(doc, "Total Abonado",      fmtMoney(datos.abono),    M + difW + anticW,       y, abonoW, finH, { bold: true, color: GRAY_XDARK, fill: GRAY_SOFT });
  celda(
    doc, "Saldo Pendiente",
    datos.saldo <= 0 ? "LIQUIDADO" : fmtMoney(datos.saldo),
    M + difW + anticW + abonoW, y, saldoW, finH,
    { bold: true, color: datos.saldo <= 0 ? GRAY_DARK : BLACK, fill: datos.saldo <= 0 ? GRAY_LIGHT : GRAY_SOFT }
  );

  y += finH + 5;

  // ════════════════════════════════════════════════════════════
  // HISTORIAL DE PAGOS
  // ════════════════════════════════════════════════════════════
  if (pagos && pagos.length > 0) {
    seccionHeader(doc, "HISTORIAL DE PAGOS", M, y, CW);
    y += 9;

    const pColFecha  = CW * 0.18;
    const pColMonto  = CW * 0.18;
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

    // pagoHeaderH: 9 (antes 7)
    const pagoHeaderH = 9;
    let phx = M;
    pagoHeaders.forEach(h => {
      doc.setFillColor(...GRAY_LIGHT);
      doc.rect(phx, y, h.w, pagoHeaderH, "FD");
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.2);
      doc.rect(phx, y, h.w, pagoHeaderH);
      doc.setFont("helvetica", "bold");
      // Header pagos: 9.5pt (antes 7.5pt)
      doc.setFontSize(9.5);
      doc.setTextColor(...GRAY_DARK);
      doc.text(h.label, phx + h.w / 2, y + pagoHeaderH / 2 + 2, { align: "center" });
      phx += h.w;
    });
    y += pagoHeaderH;
    doc.setTextColor(...BLACK);

    // pagoRowH: 10 (antes 8)
    const pagoRowH = 10;
    let totalAcumulado = 0;

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
        // Texto filas pagos: 10pt (antes 8pt)
        doc.setFontSize(10);
        doc.setTextColor(...pv.color);
        if (pv.center) {
          doc.text(pv.value, prx + pv.w / 2, y + pagoRowH / 2 + 2, { align: "center" });
        } else {
          doc.text(pv.value, prx + 1.5, y + pagoRowH / 2 + 2, { maxWidth: pv.w - 3 });
        }
        prx += pv.w;
      });

      totalAcumulado += Number(pago.monto);
      doc.setTextColor(...BLACK);
      y += pagoRowH;
    });

    // totRowH: 11 (antes 9)
    const totRowH = 11;
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(M, y, CW, totRowH, "FD");
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.2);
    doc.rect(M, y, CW, totRowH);
    doc.setFont("helvetica", "bold");
    // Total pagado: 11pt (antes 9pt)
    doc.setFontSize(11);
    doc.setTextColor(...GRAY_DARK);
    doc.text(`Total pagado (${pagos.length} pago${pagos.length !== 1 ? "s" : ""})`, M + 3, y + totRowH / 2 + 2);
    doc.setTextColor(...GRAY_XDARK);
    doc.text(fmtMoney(totalAcumulado), M + CW - 3, y + totRowH / 2 + 2, { align: "right" });
    doc.setTextColor(...BLACK);
    y += totRowH;
  }

  // ════════════════════════════════════════════════════════════
  // DATOS BANCARIOS Y CONTACTO
  // ════════════════════════════════════════════════════════════
  y += 12;

  // Texto depósito: 10.5pt (antes 8.5pt)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text(
    "Favor de hacer su depósito a cualquiera de las siguientes cuentas:",
    PW / 2, y, { align: "center", maxWidth: CW }
  );
  y += 10;

  // Nombre banco: 12pt (antes 9.5pt)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text("Banamex", PW / 2, y, { align: "center" });
  y += 6;

  // Número cuenta: 11pt (antes 9pt)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("Cuenta # 70010708964", PW / 2, y, { align: "center" });
  y += 6;
  doc.text("Grupeb S.A. de C.V.", PW / 2, y, { align: "center" });
  y += 11;

  // Frase aclaración: 10.5pt (antes 8.5pt)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text("Estoy a sus órdenes para cualquier duda o aclaración.", PW / 2, y, { align: "center" });
  y += 7;

  // Nombre vendedora: 12.5pt (antes 10pt)
  // doc.setFont("helvetica", "bold");
  // doc.setFontSize(12.5);
  // doc.setTextColor(...BLACK);
  // doc.text("Yesenia Zúñiga", PW / 2, y, { align: "center" });
  // y += 6;

  // Dept. ventas: 10pt (antes 8pt)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...BLACK);
  doc.text("Departamento de Ventas", PW / 2, y, { align: "center" });
  y += 6;

  // Web: 11pt (antes 9pt)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("www.grupoeb.com.mx", PW / 2, y, { align: "center" });
  y += 6;

  // Dirección/teléfono/correo: 10pt (antes 8pt)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY_DARK);
  doc.text(
    "Rogelio Ledesma # 102   Col. Cruz Vieja   45644   Tlajomulco de Zuñiga, Jalisco. México",
    PW / 2, y, { align: "center" }
  );
  y += 6;
  doc.text("Tels. (33) 3180-3373, 3125-9595, 3180-1460", PW / 2, y, { align: "center" });
  y += 6;
  doc.text("ventas@grupoeb.com.mx", PW / 2, y, { align: "center" });

  doc.setTextColor(...BLACK);
  doc.save(`EstadoCuenta_Pedido${datos.no_pedido}.pdf`);
}