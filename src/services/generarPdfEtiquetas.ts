import jsPDF from "jspdf";
import { cargarLogoBase64 } from "./Pdfutils";
import type { EtiquetaData } from "./seguimientoService";
import logoUrl from "../assets/grupeblanco.png";

// ── Paleta B/N ───────────────────────────────────────────────
const BLACK:      [number, number, number] = [0,   0,   0  ];
const WHITE:      [number, number, number] = [255, 255, 255];
const GRAY_DARK:  [number, number, number] = [80,  80,  80 ];
const GRAY_MED:   [number, number, number] = [136, 136, 136];
const GRAY_LIGHT: [number, number, number] = [240, 240, 240];

const f = (v: any) =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : String(v).trim();

function dibujarEtiqueta(
  doc: jsPDF,
  data: EtiquetaData,
  bultoIndex: number,
  logoBase64: string | null
) {
  const ML = 4;
  const MT = 4;
  const W  = 92;

  let y = MT;

  // ══════════════════════════════════════════
  // 1. HEADER EMPRESA
  // ══════════════════════════════════════════
  const HEADER_H = 28;
  doc.setFillColor(...BLACK);
  doc.rect(ML, y, W, HEADER_H, "F");

  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", ML + 2, y + 3, 22, 22); }
    catch { /* sin logo */ }
  }

  const txtX = logoBase64 ? ML + 27 : ML + 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...WHITE);
  doc.text("GRUPEB SA DE CV", txtX, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(200, 200, 200);
  doc.text(
    "RFC: GRU110205D55  ·  Rogelio Ledesma #102, Col. Cruz Vieja,",
    txtX, y + 17, { maxWidth: W - (txtX - ML) - 2 }
  );
  doc.text(
    "Tlajomulco de Zúñiga, Jal.  CP. 45644   Tel: (33) 31801460",
    txtX, y + 23, { maxWidth: W - (txtX - ML) - 2 }
  );

  doc.setTextColor(...BLACK);
  y += HEADER_H;

  // ══════════════════════════════════════════
  // 2. DESTINATARIO
  // ══════════════════════════════════════════
  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(ML, y, W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_DARK);
  doc.text("DESTINATARIO", ML + 3, y + 5);
  doc.setTextColor(...BLACK);
  y += 7;

  // Nombre
  const nombreDestinatario = data.cliente_impresion?.trim()
    ? data.cliente_impresion
    : data.cliente;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  const nombreLines = doc.splitTextToSize(f(nombreDestinatario), W - 6);
  doc.text(nombreLines, ML + 3, y + 8);
  y += nombreLines.length > 1 ? 18 : 12;

  // Dirección
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_DARK);

  const direccion = [data.calle, data.numero ? `#${data.numero}` : null]
    .filter(Boolean).join(" ");
  const coloniaCP = [
    data.colonia       ? `Col. ${data.colonia}`        : null,
    data.codigo_postal ? `C.P. ${data.codigo_postal}`  : null,
  ].filter(Boolean).join("  ·  ");
  const pobEdo = [data.poblacion, data.estado].filter(Boolean).join(", ");
  const contacto = [
    data.telefono ? `Tel: ${data.telefono}` : null,
    data.celular  ? `Cel: ${data.celular}`  : null,
  ].filter(Boolean).join("  ·  ");

  [direccion, coloniaCP, pobEdo, contacto].filter(Boolean).forEach(line => {
    const wrapped = doc.splitTextToSize(line, W - 6);
    doc.text(wrapped, ML + 3, y);
    y += wrapped.length * 6.5;
  });

  y += 3;

  // ══════════════════════════════════════════
  // 3. PEDIDO / PRODUCTO
  // ══════════════════════════════════════════
  doc.setDrawColor(...GRAY_MED);
  doc.setLineWidth(0.3);
  doc.line(ML, y, ML + W, y);

  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(ML, y, W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_DARK);
  doc.text("PEDIDO / PRODUCTO", ML + 3, y + 5);
  doc.setTextColor(...BLACK);
  y += 7;

  // Labels
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_MED);
  doc.text("PEDIDO",   ML + 3,  y + 5);
  doc.text("ORDEN",    ML + 34, y + 5);
  doc.text("PRODUCTO", ML + 62, y + 5);

  // Valores
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text(`PED-${f(data.no_pedido)}`,  ML + 3,  y + 13);
  doc.text(f(data.no_produccion),        ML + 34, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const prodLines = doc.splitTextToSize(f(data.nombre_producto), W - 65);
  doc.text(prodLines, ML + 62, y + 13);

  const cantDisplay = data.modo_cantidad === "kilo" && data.kilogramos
    ? `${data.kilogramos.toLocaleString("es-MX")} kg`
    : data.cantidad_total
      ? `${data.cantidad_total.toLocaleString("es-MX")} pzs`
      : "—";
  const detalle = [data.medida, data.material, cantDisplay].filter(Boolean).join("  ·  ");

  doc.setFontSize(8);
  doc.setTextColor(...GRAY_DARK);
  const detLines = doc.splitTextToSize(detalle, W - 65);
  doc.text(detLines, ML + 62, y + 21);
  doc.setTextColor(...BLACK);

  y += 30;

  // ══════════════════════════════════════════
  // 4. BULTO
  // ══════════════════════════════════════════
  doc.setDrawColor(...GRAY_MED);
  doc.setLineWidth(0.3);
  doc.line(ML, y, ML + W, y);
  y += 5;

  const bultoNum    = bultoIndex + 1;
  const totalBultos = data.total_bultos;
  const bulto       = data.bultos[bultoIndex];

  // Caja BULTO
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(ML + 3, y, 36, 24, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_DARK);
  doc.text("BULTO", ML + 3 + 18, y + 6, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BLACK);
  doc.text(String(bultoNum), ML + 3 + 18, y + 17, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_DARK);
  doc.text(`de ${totalBultos}`, ML + 3 + 18, y + 23, { align: "center" });

  // Unidades
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_MED);
  doc.text("UNIDADES EN ESTE BULTO", ML + 43, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...BLACK);
  doc.text(
    bulto.cantidad_unidades.toLocaleString("es-MX"),
    ML + 43, y + 21
  );

  // // ══════════════════════════════════════════
  // // 5. PIE
  // // ══════════════════════════════════════════
  // doc.setFont("helvetica", "normal");
  // doc.setFontSize(6.5);
  // doc.setTextColor(...GRAY_MED);
  // doc.text(
  //   `${f(data.no_produccion)}  ·  PED-${f(data.no_pedido)}  ·  Etiqueta ${bultoNum} de ${totalBultos}`,
  //   ML + W / 2, 146, { align: "center" }
  // );

  // Borde exterior
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.rect(ML, MT, W, 142);
  doc.setTextColor(...BLACK);
}

// ── Exportado principal ──────────────────────────────────────
export async function generarPdfEtiquetas(data: EtiquetaData): Promise<void> {
  const logoBase64 = await cargarLogoBase64(logoUrl);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [100, 150],
    putOnlyUsedFonts: true,
    floatPrecision: 16,
  });

  data.bultos.forEach((_, idx) => {
    if (idx > 0) doc.addPage();
    dibujarEtiqueta(doc, data, idx, logoBase64);
  });

  doc.setProperties({
    title: `Etiquetas_${data.no_produccion}`,
  });

  (doc.internal as any).scaleFactor = 1;

  doc.save(`Etiquetas_${data.no_produccion ?? `PED-${data.no_pedido}`}.pdf`);
}