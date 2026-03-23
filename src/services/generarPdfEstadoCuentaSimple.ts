import jsPDF from "jspdf";
import { cargarLogoBase64 } from "./Pdfutils";
import type { EstadoCuenta } from "./estadoCuentaService";
import logoUrl from "../assets/logogrupeb.png";


// ── Paleta monocromática ─────────────────────────────────────
const BLACK:     [number, number, number] = [0,   0,   0  ];
const GRAY_DARK: [number, number, number] = [60,  60,  60 ];

const f = (v: any): string =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : String(v).trim();

const fmtMoney = (n: number): string =>
  Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtNum = (n: number): string =>
  Number(n).toLocaleString("es-MX");

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

export async function generarPdfEstadoCuentaSimple(
  datos: EstadoCuenta
): Promise<void> {
const logoBase64 = await cargarLogoBase64(logoUrl);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const M  = 14;
  const CW = PW - M * 2;
  let y = M;

  // ══════════════════════════════════════════════
  // ENCABEZADO
  // ══════════════════════════════════════════════
  const logoW = 38;
  const logoH = 22;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", M, y, logoW, logoH);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...BLACK);
      doc.text("EB", M + logoW / 2, y + logoH / 2 + 3, { align: "center" });
    }
  }

  // "Estado de Cuenta" subrayado arriba a la derecha
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BLACK);
  const titulo = "Estado de Cuenta";
  const tituX  = M + CW;
  doc.text(titulo, tituX, y + 6, { align: "right" });
  const tituW = doc.getTextWidth(titulo);
  doc.setLineWidth(0.4);
  doc.setDrawColor(...BLACK);
  doc.line(tituX - tituW, y + 7.5, tituX, y + 7.5);

  y += logoH + 9;

  // Ciudad y fecha
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(`Guadalajara, Jal     ${formatFecha(datos.fecha)}`, M + CW, y, { align: "right" });

  y += 11;

  // Atención
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("At'n: ", M, y);
  const atnLabelW = doc.getTextWidth("At'n: ");
  doc.setFont("helvetica", "bolditalic");
  doc.text(f(datos.cliente), M + atnLabelW, y);

  y += 13;

  // Introducción
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(
    "A continuación le informo como quedó su estado de cuenta con nosotros :",
    M, y
  );

  y += 11;

  // ══════════════════════════════════════════════
  // TABLA DE PRODUCTOS
  // ══════════════════════════════════════════════
  const colProducto = CW * 0.24;
  const colCantidad = CW * 0.11;
  const colMaterial = CW * 0.15;
  const colImpres   = CW * 0.20;
  const colPrecio   = CW * 0.13;
  const colTotal    = CW - colProducto - colCantidad - colMaterial - colImpres - colPrecio;

  const headers = [
    { label: "Producto / Medida", w: colProducto },
    { label: "Cantidad",          w: colCantidad },
    { label: "Material",          w: colMaterial },
    { label: "Impresión",         w: colImpres   },
    { label: "Precio",            w: colPrecio   },
    { label: "Total",             w: colTotal    },
  ];

  // Cabecera subrayada
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.35);

  let hx = M;
  headers.forEach(h => {
    const cx = hx + h.w / 2;
    doc.text(h.label, cx, y, { align: "center" });
    doc.line(hx, y + 1.8, hx + h.w, y + 1.8);
    hx += h.w;
  });

  y += 8;

  // Filas
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);

  const rowH = 10;
  datos.productos.forEach(prod => {
    const productoMedida = prod.medida
      ? `${prod.nombre.split(prod.medida)[0].trim()} ${f(prod.medida)}`.trim()
      : f(prod.nombre);

    const material  = f(prod.material);
    const impresion = f(prod.impresion);
    const cantidad  = fmtNum(prod.cantidad_original);

    const precioUnit: number =
      prod.cantidad_original > 0
        ? prod.precio_total_original / prod.cantidad_original
        : 0;

    const precioStr = fmtMoney(precioUnit);
    const totalStr  = fmtMoney(prod.precio_total_original);

    const cols = [
      { value: productoMedida, w: colProducto, left: true  },
      { value: cantidad,       w: colCantidad, left: false },
      { value: material,       w: colMaterial, left: false },
      { value: impresion,      w: colImpres,   left: false },
      { value: precioStr,      w: colPrecio,   left: false },
      { value: totalStr,       w: colTotal,    left: false },
    ];

    let rx = M;
    cols.forEach(col => {
      const cx    = col.left ? rx + 1 : rx + col.w / 2;
      const align = col.left ? "left" : "center";
      doc.text(col.value, cx, y, { align, maxWidth: col.w - 2 });
      rx += col.w;
    });

    y += rowH;
  });

  y += 5;

  // ══════════════════════════════════════════════
  // TOTALES — Sub-Total, IVA, Total y Saldo siempre
  // Sin línea de Anticipo
  // ══════════════════════════════════════════════
  const labelX   = M + CW - 65;
  const valueX   = M + CW;
  const totLineH = 8;

  const pagado = datos.saldo <= 0;

  const totales: { label: string; value: string; bold?: boolean; box?: boolean }[] = [
    { label: "Sub-Total", value: fmtMoney(datos.subtotal_original)                          },
    { label: "I.V.A.",    value: fmtMoney(datos.iva_original)                               },
    { label: "Total",     value: fmtMoney(datos.total_original), bold: true                 },
    { label: "Saldo",     value: pagado ? "LIQUIDADO" : fmtMoney(datos.saldo), bold: true, box: true },
  ];

  totales.forEach(tot => {
    doc.setFont("helvetica", tot.bold ? "bold" : "normal");
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    doc.text(tot.label, labelX, y);
    doc.text(tot.value, valueX, y, { align: "right" });

    if (tot.box) {
      const vw = doc.getTextWidth(tot.value) + 5;
      doc.setLineWidth(0.45);
      doc.rect(valueX - vw, y - 5.5, vw, 7.5);
    }

    y += totLineH;
  });

  y += 14;

  // ══════════════════════════════════════════════
  // DATOS BANCARIOS Y PIE
  // ══════════════════════════════════════════════
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text(
    "Favor de hacer su depósito a cualquiera de las siguientes cuentas y mandar ficha de depósito vía fax:",
    M, y, { maxWidth: CW }
  );
  y += 13;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Banamex", M + 10, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Cuenta # 70010708964", M + 10, y);
  y += 7;
  doc.text("Grupeb S.A. de C.V.", M + 10, y);
  y += 15;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Estamos a sus órdenes para cualquier duda o aclaración.", PW / 2, y, { align: "center" });
  y += 8;

  // doc.setFont("helvetica", "bold");
  // doc.setFontSize(11);
  // doc.text("Yesenia Zúñiga", PW / 2, y, { align: "center" });
  // y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("Departamento de Ventas", PW / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text("www.grupoeb.com.mx", PW / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
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