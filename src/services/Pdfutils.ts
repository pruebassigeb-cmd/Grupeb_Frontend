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
  folio:          number;
  refTexto?:      string;
  fecha:          string;
  empresa:        string;
  impresion?:     string | null;
  cliente:        string;
  telefono:       string;
  correo:         string;
}

export function dibujarEncabezado(opts: OpcionesEncabezado): number {
  const { doc, logoBase64, labelDocumento, labelFolio, folio, refTexto,
          fecha, empresa, impresion, cliente, telefono, correo } = opts;

  const PW = 297; const M = 8;

  // ── Alturas de filas ajustadas para fuente ×1.5 ──
  const row1H = 24;   // logo + dirección (sin cambio)
  const row2H = 9;    // Empresa / Impresión  (era 6, +3 para que quepa fs 10.5)
  const row3H = 9;    // Atención / Tel / Email (igual)
  const totalHeaderH = row1H + row2H + row3H;
  const logoW  = 30;
  let y = M;

  // ── Logo ──────────────────────────────────────────────────────────────────
  const cotBoxW = 65;
  const centerW = PW - 2 * M - logoW - cotBoxW - 1;
  const centerX = M + logoW;

  doc.setDrawColor(...BLACK); doc.setLineWidth(0.3);

  // Una sola caja para logo + dirección (sin línea vertical interna)
  doc.rect(M, y, logoW + centerW, row1H);

  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", M + 2, y + 2, logoW - 4, row1H - 4); }
    catch {
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...BLACK);
      doc.text("GRUPO", M + logoW / 2, y + 10, { align: "center" });
      doc.setFontSize(18); doc.text("EB", M + logoW / 2, y + 18, { align: "center" });
    }
  }

  // fs 8 → 4 líneas × 5mm paso = 20mm, caben en 24mm sin encimarse
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...BLACK);
  let ty = y + 4.5;
  [
    "Rogelio Ledesma # 102  Col. Cruz Vieja  Tlajomulco de Zuñiga, Jalisco.",
    "Tel. :(33) 3180-3373, 3125-9595, 3180-1460",
    "www.grupoeb.com.mx",
    "E-mail: ventas@grupoeb.com.mx",
  ].forEach(line => { doc.text(line, centerX + 2, ty); ty += 5; });

  // ── Caja folio/fecha (derecha) ────────────────────────────────────────────
  const cotBoxX = PW - M - cotBoxW;
  const hH      = totalHeaderH / 3;

  doc.rect(cotBoxX, y, cotBoxW, totalHeaderH);

  // Fila 1 — label documento (COTIZACION / PEDIDO)
  doc.setFillColor(...GRAY_MED);
  doc.rect(cotBoxX, y, cotBoxW, hH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...BLACK); // 10→12 moderado
  doc.text(labelDocumento, cotBoxX + cotBoxW / 2, y + hH / 2 + 2, { align: "center" });

  doc.line(cotBoxX, y + hH,      cotBoxX + cotBoxW, y + hH);
  doc.line(cotBoxX + cotBoxW / 2, y + hH, cotBoxX + cotBoxW / 2, y + totalHeaderH);
  doc.line(cotBoxX, y + hH * 2,  cotBoxX + cotBoxW, y + hH * 2);

  // Fila 2 — No F / número folio
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...GRAY_DARK); // 6→7.5
  doc.text(labelFolio, cotBoxX + cotBoxW / 4, y + hH + 4.5, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...BLACK); // 9→12
  doc.text(String(folio), cotBoxX + cotBoxW * 0.75, y + hH + hH / 2 + 2, { align: "center" });

  // Fila 3 — FECHA / valor fecha
  const fecY = y + hH * 2;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...GRAY_DARK);
  doc.text("FECHA", cotBoxX + cotBoxW / 4, fecY + 4.5, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...BLACK); // 8→9.5
  doc.text(val(formatFecha(fecha)), cotBoxX + cotBoxW * 0.75, fecY + hH / 2 + 2, { align: "center" });

  y += row1H;

  // ── Fila Empresa / Impresión ──────────────────────────────────────────────
  const infoW = PW - 2 * M - cotBoxW - 1;
  const midY2 = row2H / 2 + 1; // centro vertical de la fila

  doc.rect(M, y, infoW, row2H);
  // "Empresa:" bold pequeño, valor normal — separados con espacio entre ellos
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BLACK);
  doc.text("Empresa:", M + 2, y + midY2 + 1.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.text(val(empresa), M + 20, y + midY2 + 1.5);

  const impX = M + 120;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("Impresión:", impX, y + midY2 + 1.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.text(val(impresion), impX + 21, y + midY2 + 1.5);
  y += row2H;

  // ── Fila Atención / Teléfono / E-mail ────────────────────────────────────
  const midY3 = row3H / 2 + 1;

  doc.rect(M, y, infoW, row3H);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("Atención:", M + 2, y + midY3 + 1.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.text(val(cliente), M + 21, y + midY3 + 1.5);

  const telX = M + 80;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("Teléfono:", telX, y + midY3 + 1.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.text(val(telefono), telX + 20, y + midY3 + 1.5);

  const emlX = M + 155;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("E-mail:", emlX, y + midY3 + 1.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.text(val(correo), emlX + 14, y + midY3 + 1.5);
  y += row3H;

  // ── Ref cotización (solo pedido) ──────────────────────────────────────────
  if (refTexto) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY_DARK);
    doc.text(refTexto, cotBoxX + cotBoxW / 2, y + 4, { align: "center" });
    doc.setTextColor(...BLACK);
    y += 6;
  } else {
    y += 3;
  }

  return y;
}

// ── Pie de página ─────────────────────────────────────────────────────────────
export function dibujarPiePagina(doc: jsPDF, labelDocumento: string, folio: number, fecha: string): void {
  const PW = 297; const PH = 210;
  const total = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 150, 150); // 6→8
    doc.text(
      `${labelDocumento} #${folio}  ·  ${val(formatFecha(fecha))}  ·  Página ${p} de ${total}`,
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
  const FOOTER_H      = 52;  // +2 para acomodar fuente más grande
  const fY            = PH - M - FOOTER_H;
  const footerHeaderH = 7;   // era 6, +1 para que quepa texto ×1.5
  const boxH          = FOOTER_H;

  doc.setDrawColor(...BLACK); doc.setLineWidth(0.3);
  doc.setTextColor(...BLACK);

  // ════════════════════════════════════════════════════════
  // COTIZACIÓN — Observaciones | Condiciones Venta
  // ════════════════════════════════════════════════════════
  if (!totales) {
    const obsText = productos
      .filter(p => p.observacion?.trim())
      .map(p => `• ${p.observacion}`)
      .join("\n");

    const totalW  = PW - M * 2;
    const halfW   = totalW / 2;
    // Altura dinámica basada en líneas de condiciones con fuente 9.75 → step 4.5mm
    const cotBoxH = footerHeaderH + condLines.length * 4.5 + 4;

    // Observaciones
    doc.rect(M, fY, halfW - 1, cotBoxH);
    doc.setFillColor(...GRAY_DARK);
    doc.rect(M, fY, halfW - 1, footerHeaderH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...WHITE); // 7→9
    doc.text("Observaciones", M + (halfW - 1) / 2, fY + footerHeaderH - 1.5, { align: "center" });
    doc.setTextColor(...BLACK); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); // 6.5→8.5
    if (obsText) {
      doc.text(doc.splitTextToSize(obsText, halfW - 5), M + 2, fY + footerHeaderH + 5);
    } else {
      doc.setTextColor(...GRAY_MED);
      doc.text("—", M + 2, fY + footerHeaderH + 5);
      doc.setTextColor(...BLACK);
    }

    // Condiciones de Venta
    const cvX = M + halfW;
    doc.rect(cvX, fY, halfW - 1, cotBoxH);
    doc.setFillColor(...GRAY_DARK);
    doc.rect(cvX, fY, halfW - 1, footerHeaderH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...WHITE);
    doc.text("Condiciones de Venta", cvX + (halfW - 1) / 2, fY + footerHeaderH - 1.5, { align: "center" });
    doc.setTextColor(...BLACK); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    let cvY = fY + footerHeaderH + 5;
    condLines.forEach(line => { doc.text(line, cvX + 2, cvY); cvY += 4.5; });
    return;
  }

  // ════════════════════════════════════════════════════════
  // PEDIDO — bloque bancario/firmas + Resumen
  // ════════════════════════════════════════════════════════
  const fmtN = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Altura extra para el pedido (más grande que cotización) ──
  const PED_FOOTER_H = 64;  // más alto que el boxH general (52)
  const pfY          = PH - M - PED_FOOTER_H;

  const RESUMEN_W = 78;   // un poco más ancho para que quepan los montos
  const LEFT_W    = PW - M * 2 - RESUMEN_W - 1;

  // ── RESUMEN (derecha) ──────────────────────────────────
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
    doc.setFontSize(11); doc.setTextColor(...WHITE);
    doc.text(row.label, tvX + etW / 2, ry + lineH / 2 + 2, { align: "center" });

    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setFontSize(14); doc.setTextColor(...BLACK);   // números más grandes
    doc.text(row.value, tvX + tvW - 2, ry + lineH / 2 + 2.5, { align: "right" });
  });

  // ── BLOQUE IZQUIERDA ───────────────────────────────────
  const lX = M;
  const lW = LEFT_W;

  const BANCO_H = 20;
  doc.rect(lX, pfY, lW, BANCO_H);
  // Línea 1 — etiqueta centrada
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...BLACK);
  doc.text("Favor de depositar en Banamex  —  A nombre de Grupeb S.A. de C.V.", lX + lW / 2, pfY + 5.5, { align: "center" });
  // Línea 2 — números grandes centrados
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("CTA: 7001070896964     CLABE: 002320 7001070896943", lX + lW / 2, pfY + 12, { align: "center" });
  // Línea 3 — aviso pequeño
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  doc.text("Enviar comprobante de depósito al recibir.", lX + lW / 2, pfY + 18, { align: "center" });

  const F2_Y   = pfY + BANCO_H;
  const F2_H   = PED_FOOTER_H - BANCO_H;
  const COL1_W = lW * 0.26;
  const COL2_W = lW * 0.47;
  const COL3_W = lW - COL1_W - COL2_W;

  // Columna 1 — Anticipo / Cheque / Banco / Firma
  doc.rect(lX, F2_Y, COL1_W, F2_H);
  const subH = F2_H / 4;
  ["Anticipo por $", "Cheque No.", "Banco", "Firma de Recibido"].forEach((label, i) => {
    const sy = F2_Y + i * subH;
    if (i > 0) doc.line(lX, sy, lX + COL1_W, sy);
    doc.setFont("helvetica", i === 3 ? "normal" : "bold");
    doc.setFontSize(8.5); doc.setTextColor(...BLACK);
    const textY = i === 3 ? sy + subH - 2.5 : sy + subH / 2 + 2;
    doc.text(label, lX + 2.5, textY);
  });

  // Columna 2 — texto legal
  const col2X = lX + COL1_W;
  doc.rect(col2X, F2_Y, COL2_W, F2_H);
  const legal = [
    "* Para su mayor comodidad en el pago de su anticipo y/o liquidación deberá cubrirlo con cheque nominativo a favor de GRUPEB S.A. de C.V. con la leyenda para depósito en cuenta.",
    "* No nos hacemos responsables por pagos en efectivo.",
    "* En Bolsas impresas, existen cargos adicionales (negativos, diseño, etc.) que deberán cubrirse a contra entrega.",
    "* Todo cheque devuelto causará un 20% por daños y perjuicios según el art. 193 de la Ley de Títulos y Operaciones de Crédito.",
    "* Flete por cuenta del Cliente.",
    "* Su pedido puede tener una variación de un 20% más o un 20% menos en la cantidad final.",
  ];
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...BLACK);
  const maxLy = F2_Y + F2_H - 2;
  let ly = F2_Y + 5;
  for (const line of legal) {
    const wrapped: string[] = doc.splitTextToSize(line, COL2_W - 4);
    for (const wl of wrapped) {
      if (ly + 3.8 > maxLy) break;
      doc.text(wl, col2X + 2, ly);
      ly += 3.8;
    }
    if (ly + 3.8 > maxLy) break;
  }

  // Columna 3 — Condiciones / Autorización / Cliente
  const col3X = col2X + COL2_W;
  doc.rect(col3X, F2_Y, COL3_W, F2_H);

  const CON_H = 9;
  doc.setFillColor(...GRAY_DARK);
  doc.rect(col3X, F2_Y, COL3_W, CON_H, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...WHITE);
  doc.text("Condiciones de Pago", col3X + COL3_W / 2, F2_Y + CON_H - 2, { align: "center" });
  doc.setTextColor(...BLACK);

  const AUT_H = (F2_H - CON_H) / 2;
  doc.rect(col3X, F2_Y + CON_H, COL3_W, AUT_H);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...GRAY_DARK);
  doc.text("Autorización", col3X + COL3_W / 2, F2_Y + CON_H + AUT_H - 2.5, { align: "center" });

  doc.rect(col3X, F2_Y + CON_H + AUT_H, COL3_W, AUT_H);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...GRAY_DARK);
  doc.text("Cliente", col3X + COL3_W / 2, F2_Y + CON_H + AUT_H * 2 - 2.5, { align: "center" });
  doc.setTextColor(...BLACK);
}