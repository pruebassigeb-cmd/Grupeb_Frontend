import jsPDF from "jspdf";
import { cargarLogoBase64 } from "./Pdfutils";
import type { EstadoCuenta } from "./estadoCuentaService";
import logoUrl from "../assets/grupeblanco.png"; // ✅ logo blanco

// ─── Paleta estrictamente blanco y negro ────────────────────
const BLACK:   [number, number, number] = [0,   0,   0  ];
const WHITE:   [number, number, number] = [255, 255, 255];
const GRAY_90: [number, number, number] = [25,  25,  25 ];
const GRAY_60: [number, number, number] = [80,  80,  80 ];
const GRAY_30: [number, number, number] = [180, 180, 180];
const GRAY_10: [number, number, number] = [235, 235, 235];
const GRAY_05: [number, number, number] = [248, 248, 248];

// ─── Helpers ────────────────────────────────────────────────
const f = (v: any): string =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : String(v).trim();

const fmtMoney = (n: number): string =>
  `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtNum = (n: number): string => Number(n).toLocaleString("es-MX");

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

// ─── Fila de totales ─────────────────────────────────────────
// totX  = borde izquierdo del bloque totales (para que la caja del saldo sea exacta)
// totW  = ancho total del bloque totales
function filaTotales(
  doc:    jsPDF,
  label:  string,
  value:  string,
  y:      number,
  labelX: number,   // X donde empieza el texto de la etiqueta
  valueX: number,   // X del valor (right-aligned)
  totX:   number,   // borde izquierdo del bloque (para la caja destacado)
  totW:   number,   // ancho total del bloque (para la caja destacado)
  opts?: {
    bold?:      boolean;
    gris?:      boolean;
    destacado?: boolean;
    separador?: boolean;
  }
) {
  const { bold = false, gris = false, destacado = false, separador = false } = opts ?? {};

  if (separador) {
    doc.setDrawColor(...GRAY_30);
    doc.setLineWidth(0.25);
    doc.line(totX, y - 3.5, totX + totW, y - 3.5);
  }

  if (destacado) {
    // ✅ Caja que cubre exactamente el ancho del bloque (de totX a totX+totW)
    const boxH = 9;
    doc.setFillColor(...GRAY_90);
    doc.rect(totX, y - 6, totW, boxH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...WHITE);
    doc.text(label, labelX, y - 0.5);
    doc.text(value, valueX, y - 0.5, { align: "right" });
    doc.setTextColor(...BLACK);
    return;
  }

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(10);
  doc.setTextColor(
    gris ? GRAY_60[0] : GRAY_90[0],
    gris ? GRAY_60[1] : GRAY_90[1],
    gris ? GRAY_60[2] : GRAY_90[2],
  );
  doc.text(label, labelX, y);
  doc.text(value, valueX, y, { align: "right" });
  doc.setTextColor(...BLACK);
}

export async function generarPdfEstadoCuentaSimple(
  datos: EstadoCuenta
): Promise<void> {
  const logoBase64 = await cargarLogoBase64(logoUrl);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW  = 210;
  const PH  = 297;
  const M   = 13;
  const CW  = PW - M * 2; // 184mm

  // ══════════════════════════════════════════════════════════
  // BANDA SUPERIOR NEGRA
  // ══════════════════════════════════════════════════════════
  const bandaH = 28;
  const logoW  = 30;
  const logoH  = bandaH - 6;
  const logoX  = M;
  const logoY  = 3;

  doc.setFillColor(...GRAY_90);
  doc.rect(0, 0, PW, bandaH, "F");

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", logoX, logoY, logoW, logoH);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...WHITE);
      doc.text("EB", logoX + logoW / 2, bandaH / 2 + 3, { align: "center" });
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text("ESTADO DE CUENTA", PW / 2, bandaH / 2 - 2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_10);
  doc.text("Grupeb S.A. de C.V.", PW / 2, bandaH / 2 + 5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY_10);
  doc.text(`Pedido #${datos.no_pedido}`, M + CW, bandaH / 2 - 2, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_10);
  doc.text(formatFecha(datos.fecha), M + CW, bandaH / 2 + 5, { align: "right" });

  let y = bandaH + 9;

  // ══════════════════════════════════════════════════════════
  // BLOQUE DESTINATARIO
  // ══════════════════════════════════════════════════════════
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_60);
  doc.text("Guadalajara, Jalisco", M, y);
  doc.text(formatFecha(datos.fecha), M + CW, y, { align: "right" });

  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY_60);
  doc.text("At'n:", M, y);
  const atnLabelW = doc.getTextWidth("At'n: ");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GRAY_90);
  doc.text(f(datos.cliente), M + atnLabelW, y);

  y += 6;

  doc.setDrawColor(...GRAY_30);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + CW, y);

  y += 7;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY_60);
  doc.text(
    "A continuación le informamos el estado de cuenta correspondiente a su pedido:",
    M, y, { maxWidth: CW }
  );

  y += 11;

  // ══════════════════════════════════════════════════════════
  // TABLA DE PRODUCTOS
  // ══════════════════════════════════════════════════════════
  doc.setFillColor(...GRAY_90);
  doc.rect(M, y, CW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text("DETALLE DE PRODUCTOS", M + 3, y + 5.5);
  doc.setTextColor(...BLACK);

  y += 8;

  const colProd = CW * 0.26;
  const colCant = CW * 0.10;
  const colMat  = CW * 0.15;
  const colImp  = CW * 0.19;
  const colPre  = CW * 0.14;
  const colTot  = CW - colProd - colCant - colMat - colImp - colPre;

  interface TabHeader { label: string; w: number; right?: boolean }
  const tabHeaders: TabHeader[] = [
    { label: "Producto / Medida", w: colProd              },
    { label: "Cantidad",          w: colCant, right: true },
    { label: "Material",          w: colMat               },
    { label: "Impresión",         w: colImp               },
    { label: "Precio unit.",      w: colPre,  right: true },
    { label: "Total",             w: colTot,  right: true },
  ];

  const thH = 7;
  doc.setFillColor(...GRAY_10);
  doc.rect(M, y, CW, thH, "F");
  doc.setDrawColor(...GRAY_30);
  doc.setLineWidth(0.2);
  doc.rect(M, y, CW, thH);

  let hx = M;
  tabHeaders.forEach(h => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_60);
    const tx = h.right ? hx + h.w - 2 : hx + 2;
    doc.text(h.label, tx, y + thH / 2 + 1.5, {
      align: h.right ? "right" : "left",
    });
    hx += h.w;
  });

  y += thH;

  const rowH      = 9;
  const tabYStart = y;

  datos.productos.forEach((prod, idx) => {
    const bg: [number, number, number] = idx % 2 === 0 ? WHITE : GRAY_05;

    const productoMedida = prod.medida
      ? `${prod.nombre.split(prod.medida)[0].trim()} ${f(prod.medida)}`.trim()
      : f(prod.nombre);

    const precioUnit = prod.cantidad_real > 0
      ? prod.precio_total_real / prod.cantidad_real
      : 0;

    interface Col { value: string; w: number; right?: boolean; bold?: boolean }
    const cols: Col[] = [
      { value: productoMedida,                   w: colProd                          },
      { value: fmtNum(prod.cantidad_real),        w: colCant, right: true            },
      { value: f(prod.material),                 w: colMat                          },
      { value: f(prod.impresion),                w: colImp                          },
      { value: fmtMoney(precioUnit),             w: colPre,  right: true            },
      { value: fmtMoney(prod.precio_total_real), w: colTot,  right: true, bold: true },
    ];

    doc.setFillColor(...bg);
    doc.rect(M, y, CW, rowH, "F");
    doc.setDrawColor(...GRAY_30);
    doc.setLineWidth(0.15);
    doc.line(M, y + rowH, M + CW, y + rowH);

    let rx = M;
    cols.forEach(col => {
      doc.setFont("helvetica", col.bold ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY_90);
      const tx = col.right ? rx + col.w - 2 : rx + 2;
      doc.text(col.value, tx, y + rowH / 2 + 1.8, {
        align:    col.right ? "right" : "left",
        maxWidth: col.w - 4,
      });
      rx += col.w;
    });

    y += rowH;
  });

  doc.setDrawColor(...GRAY_30);
  doc.setLineWidth(0.3);
  doc.rect(M, tabYStart - thH, CW, thH + rowH * datos.productos.length);

  y += 12;

  // ══════════════════════════════════════════════════════════
  // BLOQUE TOTALES
  // ══════════════════════════════════════════════════════════
  const totW         = 76;
  const totX         = M + CW - totW;  // borde izquierdo exacto del bloque
  const totLX        = totX + 4;       // X etiqueta (padding 4mm del borde izq)
  const totVX        = totX + totW - 4; // X valor (padding 4mm del borde der)
  const totalesLineH = 7.5;
  // header(8) + padding(4) + 5 filas(37.5) + padding bottom(8)
  const totBlockH    = 8 + 4 + totalesLineH * 5 + 8;

  // Marco exterior
  doc.setDrawColor(...GRAY_30);
  doc.setLineWidth(0.3);
  doc.rect(totX, y, totW, totBlockH);

  // Header del bloque
  doc.setFillColor(...GRAY_90);
  doc.rect(totX, y, totW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text("RESUMEN DE CUENTA", totX + totW / 2, y + 5.5, { align: "center" });
  doc.setTextColor(...BLACK);

  let ty = y + 8 + 4 + totalesLineH;

  // Pasamos totX y totW para que la caja del destacado sea exacta
  filaTotales(doc, "Sub-Total",     fmtMoney(datos.subtotal_real), ty, totLX, totVX, totX, totW);
  ty += totalesLineH;

  filaTotales(doc, "I.V.A. (16%)",  fmtMoney(datos.iva_real),      ty, totLX, totVX, totX, totW, { gris: true });
  ty += totalesLineH;

  filaTotales(doc, "Total",         fmtMoney(datos.total_real),    ty, totLX, totVX, totX, totW, { bold: true, separador: true });
  ty += totalesLineH;

  filaTotales(doc, "Anticipo req.", fmtMoney(datos.anticipo),      ty, totLX, totVX, totX, totW, { gris: true });
  ty += totalesLineH + 2;

  filaTotales(
    doc,
    "Saldo",
    datos.saldo <= 0 ? "LIQUIDADO" : fmtMoney(datos.saldo),
    ty, totLX, totVX, totX, totW,
    { destacado: true }
  );

  // Nota a la izquierda del bloque totales
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_60);
  doc.text(
    "Los montos reflejan la cantidad\ny producción real entregada.",
    M, y + 8 + 8, { maxWidth: totX - M - 4 }
  );

  y += totBlockH + 14;

  // ══════════════════════════════════════════════════════════
  // SEPARADOR
  // ══════════════════════════════════════════════════════════
  doc.setDrawColor(...GRAY_30);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + CW, y);

  y += 10;

  // ══════════════════════════════════════════════════════════
  // PIE — DATOS BANCARIOS + CONTACTO
  // ══════════════════════════════════════════════════════════
  const colBancoW    = CW * 0.52;
  const colContactoX = M + colBancoW + 8;
  const yPieStart    = y; // guarda el y de inicio del pie para alinear col derecha

  // ── Columna izquierda ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_90);
  doc.text("Datos para transferencia", M, y);

  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_60);
  doc.text(
    "Favor de realizar su depósito a cualquiera de las siguientes cuentas y enviar comprobante por WhatsApp.",
    M, y, { maxWidth: colBancoW }
  );

  y += 13;

  // Badge banco
  doc.setFillColor(...GRAY_90);
  doc.rect(M, y - 1.5, 24, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text("Banamex", M + 12, y + 3.2, { align: "center" });
  doc.setTextColor(...BLACK);

  y += 9;

  const datoBancario = (label: string, value: string, yy: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_60);
    doc.text(`${label}:`, M, yy);
    const lw = doc.getTextWidth(`${label}:  `);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY_90);
    doc.text(value, M + lw, yy);
    doc.setTextColor(...BLACK);
  };

  datoBancario("Cuenta",       "70010708964",          y); y += 6;
  datoBancario("CLABE",        "002320700107089643",   y); y += 6;
  datoBancario("A nombre de",  "Grupeb S.A. de C.V.", y);

  // ── Columna derecha — arranca exactamente al mismo y que la columna izquierda ──
  let yc = yPieStart;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_90);
  doc.text("Contacto", colContactoX, yc);
  yc += 7;

  const contactoItems = [
    "Departamento de Ventas",
    "ventas@grupoeb.com.mx",
    "Tels. (33) 3180-3373 · 3125-9595 · 3180-1460",
    "www.grupoeb.com.mx",
  ];
  contactoItems.forEach(item => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_60);
    doc.text(item, colContactoX, yc, { maxWidth: CW - colBancoW - 8 });
    yc += 5.5;
  });

  // ══════════════════════════════════════════════════════════
  // BANDA INFERIOR NEGRA
  // ══════════════════════════════════════════════════════════
  const pieH = 14;
  const pieY = PH - pieH;

  doc.setFillColor(...GRAY_90);
  doc.rect(0, pieY, PW, pieH, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_10);
  doc.text(
    "Rogelio Ledesma #102  ·  Col. Cruz Vieja  ·  45644 Tlajomulco de Zuñiga, Jalisco. México",
    PW / 2, pieY + 5.5, { align: "center" }
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text("www.grupoeb.com.mx", PW / 2, pieY + 10.5, { align: "center" });

  doc.setTextColor(...BLACK);
  doc.save(`EstadoCuenta_Pedido${datos.no_pedido}.pdf`);
}