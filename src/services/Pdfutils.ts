// pdfUtils.ts — Utilidades compartidas entre generadores de PDF

import jsPDF from "jspdf";

// ── Paleta B&N ────────────────────────────────────────────────────────────────
export const GRAY_DARK  = [80,  80,  80]  as [number, number, number];
export const GRAY_MED   = [160, 160, 160] as [number, number, number];
export const GRAY_LIGHT = [220, 220, 220] as [number, number, number];
export const GRAY_ROW   = [240, 240, 240] as [number, number, number];
export const BLACK      = [0,   0,   0]   as [number, number, number];
export const WHITE      = [255, 255, 255] as [number, number, number];

// ── Tipos compartidos ─────────────────────────────────────────────────────────
export interface DetallePdf {
  cantidad:       number;
  precio_total:   number;
  kilogramos?:    number | null;
  modo_cantidad?: "unidad" | "kilo";
}

export interface ProductoPdf {
  nombre:              string;
  tintas:              number | string;
  caras:               number | string;
  calibre?:            string;
  material?:           string;
  medidasFormateadas?: string;
  medidas?: {
    altura?:         string;
    ancho?:          string;
    fuelleFondo?:    string;
    fuelleLateral1?: string;
    fuelleLateral2?: string;
    refuerzo?:       string;
  };
  bk?:          boolean | string | null;
  foil?:        boolean | string | null;
  laminado?:    boolean | string | null;
  uvBr?:        boolean | string | null;
  pigmentos?:   string | null;
  pantones?:    string | string[] | null;
  asa_suaje?:   boolean | string | null;
  alto_rel?:    boolean | string | null;
  observacion?: string | null;
  por_kilo?:    string | number | null;
  detalles:     DetallePdf[];
  herramental_descripcion?: string | null;
  herramental_precio?:      number | null;
  herramental_aprobado?:    boolean | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export async function cargarLogoBase64(ruta: string): Promise<string | null> {
  try {
    const r = await fetch(ruta);
    const b = await r.blob();
    return await new Promise<string>((res, rej) => {
      const reader   = new FileReader();
      reader.onload  = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(b);
    });
  } catch { return null; }
}

export function val(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s === "" ? "—" : s;
}

export function boolLabel(v: boolean | string | null | undefined): string {
  if (v === true  || v === "true"  || v === "1") return "SI";
  if (v === false || v === "false" || v === "0") return "—";
  const s = v ? String(v).trim() : "";
  return s !== "" ? s : "—";
}

export function parsePantones(p: string | string[] | null | undefined): string {
  if (!p) return "—";
  if (Array.isArray(p)) { const f = p.filter(Boolean); return f.length ? f.join(", ") : "—"; }
  const s = String(p).trim();
  return s || "—";
}

export function getMedida(prod: ProductoPdf): string {
  if (prod.medidasFormateadas?.trim()) return prod.medidasFormateadas;
  if (!prod.medidas) return "—";
  const ps = [prod.medidas.altura, prod.medidas.ancho, prod.medidas.fuelleFondo]
    .filter(v => v?.trim());
  return ps.length ? ps.join("X") : "—";
}

export function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

export function formatCantidadCelda(det: DetallePdf, porKilo?: string | number | null): string {
  const precioUnit = det.precio_total / det.cantidad;

  if (det.modo_cantidad === "kilo" && det.kilogramos && det.kilogramos > 0) {
    const pk    = Number(porKilo || 1);
    const kgStr = Number.isInteger(det.kilogramos)
      ? det.kilogramos.toString()
      : Number(det.kilogramos).toFixed(2);
    return `${kgStr} kg\n$${(precioUnit * pk).toFixed(2)}/kg`;
  }

  return `${det.cantidad.toLocaleString("es-MX")}\n$${precioUnit.toFixed(2)}/pza`;
}

// ── Encabezado compartido ─────────────────────────────────────────────────────
export interface OpcionesEncabezado {
  doc:            jsPDF;
  logoBase64:     string | null;
  labelDocumento: string;
  labelFolio:     string;
  folio:          string | number;
  refTexto?:      string;
  fecha:          string;
  empresa:        string;
  impresion?:     string | null;
  cliente:        string;
  telefono:       string;
  correo:         string;
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

export function dibujarEncabezado(opts: OpcionesEncabezado): number {
  const {
    doc, logoBase64, labelDocumento, labelFolio, folio, refTexto,
    fecha, empresa, impresion, cliente, telefono, correo,
    celular, razon_social, rfc,
    domicilio, numero, colonia, codigo_postal, poblacion, estado_cliente,
  } = opts;

  const PW = 297; const M = 8;

  const row1H = 30;
  const row2H = 8;
  const row3H = 8;
  const row4H = 8;
  const row5H = 8;
  const totalHeaderH = row1H + row2H + row3H + row4H + row5H;
  const logoW  = 38;
  let y = M;

  const cotBoxW = 78;
  const centerW = PW - 2 * M - logoW - cotBoxW - 1;
  const centerX = M + logoW;

  doc.setDrawColor(...BLACK); doc.setLineWidth(0.3);

  // ── Fila 1: logo + datos empresa ─────────────────────────────────────────
  //doc.rect(M, y, logoW + centerW, row1H);

  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", M + 2, y + 2, logoW - 4, row1H - 4); }
    catch {
      doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...BLACK);
      doc.text("GRUPO", M + logoW / 2, y + 12, { align: "center" });
      doc.setFontSize(22); doc.text("EB", M + logoW / 2, y + 22, { align: "center" });
    }
  }

  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...BLACK);
  let ty = y + 6;
  [
    "Rogelio Ledesma # 102  Col. Cruz Vieja  Tlajomulco de Zuñiga, Jalisco.",
    "Tel. :(33) 3180-3373, 3125-9595, 3180-1460",
    "www.grupoeb.com.mx",
    "E-mail: ventas@grupoeb.com.mx",
  ].forEach(line => { doc.text(line, centerX + 2, ty); ty += 6; });

  // ── Caja folio ────────────────────────────────────────────────────────────
  const cotBoxX = PW - M - cotBoxW;
  const hH      = totalHeaderH / 3;

  doc.setDrawColor(...BLACK); doc.setLineWidth(0.3);
  doc.rect(cotBoxX, y, cotBoxW, row1H);

  // Encabezado gris: label documento (ocupa mitad superior)
  const labelH = row1H * 0.40;
  doc.setFillColor(...GRAY_MED);
  doc.rect(cotBoxX, y, cotBoxW, labelH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...BLACK);
  doc.text(labelDocumento, cotBoxX + cotBoxW / 2, y + labelH / 2 + 2.5, { align: "center" });

  // Línea divisora horizontal
  doc.line(cotBoxX, y + labelH, cotBoxX + cotBoxW, y + labelH);

  // Línea divisora vertical (separa Folio | Fecha)
  const halfBox = cotBoxW / 2;
  doc.line(cotBoxX + halfBox, y + labelH, cotBoxX + halfBox, y + row1H);

  // Celda izquierda: Folio
  const dataY   = y + labelH;
  const dataH   = row1H - labelH;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...GRAY_DARK);
  doc.text(labelFolio, cotBoxX + halfBox / 2, dataY + 4.5, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...BLACK);
  doc.text(String(folio), cotBoxX + halfBox / 2, dataY + dataH / 2 + 4, { align: "center" });

  // Celda derecha: Fecha
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...GRAY_DARK);
  doc.text("FECHA", cotBoxX + halfBox + halfBox / 2, dataY + 4.5, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...BLACK);
  doc.text(val(formatFecha(fecha)), cotBoxX + halfBox + halfBox / 2, dataY + dataH / 2 + 4, { align: "center" });

  y += row1H;

  const infoW = PW - 2 * M - cotBoxW - 1;

  // helper: centra texto verticalmente en fila de altura h
  const mid = (h: number) => h / 2 + 2.5;

  // ── Fila 2: Empresa | Impresión ───────────────────────────────────────────
  // doc.rect(M, y, infoW, row2H);  ← ELIMINADO
 const col2X = M + 65;   // columna derecha
 const col3X = M + 140;  // ← tercera columna

  const mid2  = (h: number) => h / 2 + 2.5;

   // Fila 2: Empresa | Impresión | Atención
  doc.setFont("helvetica", "bold");   doc.setFontSize(9);   doc.setTextColor(...BLACK);
  doc.text("Empresa:",     M + 2,         y + mid2(row2H));
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(val(empresa),   M + 20,        y + mid2(row2H));

  doc.setFont("helvetica", "bold");   doc.setFontSize(9);
  doc.text("Impresión:",   col2X,         y + mid2(row2H));
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(val(impresion), col2X + 20,    y + mid2(row2H));

  doc.setFont("helvetica", "bold");   doc.setFontSize(9);
  doc.text("Atención:",    col3X,         y + mid2(row2H));  // ← col3X separado
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(val(cliente),   col3X + 18,    y + mid2(row2H));
  y += row2H;

  // Fila 3: Teléfono | E-mail | Celular
  doc.setFont("helvetica", "bold");   doc.setFontSize(9);   doc.setTextColor(...BLACK);
  doc.text("Teléfono:",    M + 2,         y + mid2(row3H));
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(val(telefono),  M + 19,        y + mid2(row3H));

  doc.setFont("helvetica", "bold");   doc.setFontSize(9);
  doc.text("E-mail:",      col2X,         y + mid2(row3H));
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(val(correo),    col2X + 12,    y + mid2(row3H));

  doc.setFont("helvetica", "bold");   doc.setFontSize(9);
  doc.text("Celular:",     col3X,         y + mid2(row3H));  // ← col3X
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(val(celular),   col3X + 14,    y + mid2(row3H));
  y += row3H;

  // Fila 4: Razón Social | RFC  (sin celular duplicado)
  doc.setFont("helvetica", "bold");   doc.setFontSize(9);   doc.setTextColor(...BLACK);
  doc.text("Razón Social:", M + 2,        y + mid2(row4H));
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(val(razon_social), M + 26,     y + mid2(row4H));

  doc.setFont("helvetica", "bold");   doc.setFontSize(9);
  doc.text("RFC:",          col2X,        y + mid2(row4H));
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(val(rfc),        col2X + 10,   y + mid2(row4H));
  y += row4H;

  // Fila 5: Domicilio (fila completa)
  doc.setFont("helvetica", "bold");   doc.setFontSize(9);   doc.setTextColor(...BLACK);
  doc.text("Domicilio:",   M + 2,         y + mid2(row5H));
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);

  const domParts = [
    domicilio && numero ? `${domicilio} #${numero}` : domicilio || null,
    colonia,
    codigo_postal ? `C.P. ${codigo_postal}` : null,
    poblacion,
    estado_cliente,
  ].filter(Boolean);
  const domStr = domParts.length ? domParts.join(", ") : null;

  doc.text(val(domStr),    M + 20,        y + mid2(row5H));
  y += row5H;

  // ── Ref texto opcional ────────────────────────────────────────────────────
  if (refTexto) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...GRAY_DARK);
    doc.text(refTexto, cotBoxX + cotBoxW / 2, y + 5, { align: "center" });
    doc.setTextColor(...BLACK);
    y += 7;
  } else {
    y += 4;
  }

  return y;
}

// ── Pie de página ─────────────────────────────────────────────────────────────
export function dibujarPiePagina(
  doc:            jsPDF,
  labelDocumento: string,
  folio:          string | number,
  fecha:          string
): void {
  const PW = 297; const PH = 210;
  const total = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(150, 150, 150);
    doc.text(
      `${labelDocumento} ${folio}  ·  ${val(formatFecha(fecha))}  ·  Página ${p} de ${total}`,
      PW / 2, PH - 3, { align: "center" }
    );
  }
}

// ── Cajas de pie ──────────────────────────────────────────────────────────────
export interface TotalesPdf {
  subtotal:  number;
  iva:       number;
  total:     number;
  anticipo?: number;
  saldo?:    number;
}

export function dibujarCajasPie(
  doc:       jsPDF,
  productos: ProductoPdf[],
  condLines: string[],
  totales?:  TotalesPdf
): void {
  const PW = 297; const PH = 210; const M = 8;
  const FOOTER_H      = 65;
  const fY            = PH - M - FOOTER_H;
  const footerHeaderH = 9;

  doc.setDrawColor(...BLACK); doc.setLineWidth(0.3);
  doc.setTextColor(...BLACK);

  const fmtN = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!totales) {
    const obsText = productos
      .filter(p => p.observacion?.trim())
      .map(p => `• ${p.observacion}`)
      .join("\n");

    const totalW  = PW - M * 2;
    const halfW   = totalW / 2;
    const cotBoxH = footerHeaderH + condLines.length * 5.5 + 5;

    doc.rect(M, fY, halfW - 1, cotBoxH);
    doc.setFillColor(...GRAY_DARK);
    doc.rect(M, fY, halfW - 1, footerHeaderH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...WHITE);
    doc.text("Observaciones", M + (halfW - 1) / 2, fY + footerHeaderH - 2, { align: "center" });
    doc.setTextColor(...BLACK); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
    if (obsText) {
      doc.text(doc.splitTextToSize(obsText, halfW - 5), M + 2, fY + footerHeaderH + 6);
    } else {
      doc.setTextColor(...GRAY_MED);
      doc.text("—", M + 2, fY + footerHeaderH + 6);
      doc.setTextColor(...BLACK);
    }

    const prodConHerr = productos.filter(
      p => p.herramental_precio != null && p.herramental_precio > 0
    );
    if (prodConHerr.length > 0) {
      let herrY = fY + footerHeaderH + 6 + (obsText ? (obsText.split("\n").length) * 5 + 4 : 5);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(100, 60, 0);
      doc.text("Herramental:", M + 2, herrY);
      herrY += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      prodConHerr.forEach(p => {
        const desc   = p.herramental_descripcion?.trim() || p.nombre;
        const precio = fmtN(p.herramental_precio!);
        doc.text(`• ${desc}: ${precio}`, M + 4, herrY);
        herrY += 5;
      });
      doc.setTextColor(...BLACK);
    }

    const cvX = M + halfW;
    doc.rect(cvX, fY, halfW - 1, cotBoxH);
    doc.setFillColor(...GRAY_DARK);
    doc.rect(cvX, fY, halfW - 1, footerHeaderH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...WHITE);
    doc.text("Condiciones de Venta", cvX + (halfW - 1) / 2, fY + footerHeaderH - 2, { align: "center" });
    doc.setTextColor(...BLACK); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
    let cvY = fY + footerHeaderH + 6;
    condLines.forEach(line => { doc.text(line, cvX + 2, cvY); cvY += 5.5; });
    return;
  }

  // ── Footer pedido ─────────────────────────────────────────────────────────
  const PED_FOOTER_H = 80;
  const pfY          = PH - M - PED_FOOTER_H;

  const RESUMEN_W = 70;
  const LEFT_W    = PW - M * 2 - RESUMEN_W - 1;

  const tvX = M + LEFT_W + 1;
  const tvW = RESUMEN_W;

  const resumenRows: { label: string; value: string; bold: boolean }[] = [
    { label: "Sub-Total", value: fmtN(totales.subtotal),      bold: false },
    { label: "I.V.A.",    value: fmtN(totales.iva),           bold: false },
    { label: "Total",     value: fmtN(totales.total),         bold: true  },
    { label: "Anticipo",  value: fmtN(totales.anticipo ?? 0), bold: false },
  ];

  const etW   = tvW * 0.42;
  const lineH = PED_FOOTER_H / resumenRows.length;

  doc.rect(tvX, pfY, tvW, PED_FOOTER_H);

  resumenRows.forEach((row, i) => {
    const ry = pfY + i * lineH;
    if (i > 0) {
      doc.setDrawColor(...GRAY_MED);
      doc.line(tvX, ry, tvX + tvW, ry);
      doc.setDrawColor(...BLACK);
    }
    if (row.bold) {
      doc.setFillColor(...GRAY_LIGHT);
      doc.rect(tvX, ry, tvW, lineH, "F");
    }
    doc.setFillColor(...GRAY_DARK);
    doc.rect(tvX, ry, etW, lineH, "F");
    doc.line(tvX + etW, ry, tvX + etW, ry + lineH);
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setFontSize(13); doc.setTextColor(...WHITE);
    doc.text(row.label, tvX + etW / 2, ry + lineH / 2 + 2.5, { align: "center" });
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setFontSize(17);
    doc.setTextColor(...BLACK);
    doc.text(row.value, tvX + tvW - 2, ry + lineH / 2 + 3.5, { align: "right" });
    doc.setTextColor(...BLACK);
  });

  const lX = M;
  const lW = LEFT_W;

  const BANCO_H = 25;
  doc.rect(lX, pfY, lW, BANCO_H);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...BLACK);
  doc.text("Favor de depositar en Banamex  —  A nombre de Grupeb S.A. de C.V.", lX + lW / 2, pfY + 7, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("CTA: 70010708964     CLABE: 002320 700107089643", lX + lW / 2, pfY + 15, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text("Enviar comprobante de depósito.", lX + lW / 2, pfY + 22, { align: "center" });

  const F2_Y   = pfY + BANCO_H;
  const F2_H   = PED_FOOTER_H - BANCO_H;
  const COL1_W = lW * 0.20;
  const COL2_W = lW * 0.60;
  const COL3_W = lW - COL1_W - COL2_W;

  doc.rect(lX, F2_Y, COL1_W, F2_H);
  const subH = F2_H / 4;
  ["Anticipo por $", "Cheque No.", "Banco", "Firma de Recibido"].forEach((label, i) => {
    const sy = F2_Y + i * subH;
    if (i > 0) doc.line(lX, sy, lX + COL1_W, sy);
    doc.setFont("helvetica", i === 3 ? "normal" : "bold");
    doc.setFontSize(10.5); doc.setTextColor(...BLACK);
    const textY = i === 3 ? sy + subH - 3 : sy + subH / 2 + 2.5;
    doc.text(label, lX + 2.5, textY);
  });

  const col2X = lX + COL1_W;
  doc.rect(col2X, F2_Y, COL2_W, F2_H);
  const legal = [
    "* Para su mayor comodidad en el pago de su anticipo y/o liquidación deberá cubrirlo con cheque nominativo a favor de GRUPEB S.A. de C.V. con la leyenda para depósito en cuenta.",
    "* No nos hacemos responsables por pagos en efectivo.",
    "* En Bolsas impresas, existen cargos adicionales (negativos, diseño, etc.) que deberán cubrirse a contra entrega.",
    "* Todo cheque devuelto causará un 20% por daños y perjuicios según el art. 193 de la Ley de Títulos y Operaciones de Crédito.",
    "* Flete por cuenta del Cliente.",
    "* Su pedido puede tener una variación de un 20% más o un 20% menos en la cantidad final.",
    "* Tiempo de entrega: 30-35 días después de autorizado el diseño.",
  ];
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...BLACK);
  const maxLy = F2_Y + F2_H - 2;
  let ly = F2_Y + 6;
  for (const line of legal) {
    const wrapped: string[] = doc.splitTextToSize(line, COL2_W - 4);
    for (const wl of wrapped) {
      if (ly + 4.5 > maxLy) break;
      doc.text(wl, col2X + 2, ly);
      ly += 4.5;
    }
    if (ly + 4.5 > maxLy) break;
  }

  const col3X = col2X + COL2_W;
  doc.rect(col3X, F2_Y, COL3_W, F2_H);

  const CON_H = 11;
  doc.setFillColor(...GRAY_DARK);
  doc.rect(col3X, F2_Y, COL3_W, CON_H, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...WHITE);
  doc.text("Condiciones de Pago", col3X + COL3_W / 2, F2_Y + CON_H - 2.5, { align: "center" });
  doc.setTextColor(...BLACK);

  const AUT_H = (F2_H - CON_H) / 2;
  doc.rect(col3X, F2_Y + CON_H, COL3_W, AUT_H);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...GRAY_DARK);
  doc.text("Autorización", col3X + COL3_W / 2, F2_Y + CON_H + AUT_H - 3, { align: "center" });

  doc.rect(col3X, F2_Y + CON_H + AUT_H, COL3_W, AUT_H);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...GRAY_DARK);
  doc.text("Cliente", col3X + COL3_W / 2, F2_Y + CON_H + AUT_H * 2 - 3, { align: "center" });
  doc.setTextColor(...BLACK);
}