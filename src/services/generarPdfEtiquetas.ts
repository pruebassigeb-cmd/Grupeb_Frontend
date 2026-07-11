import jsPDF from "jspdf";
import { cargarLogoBase64 } from "./Pdfutils";
import type { EtiquetaData } from "./seguimientoService";
import logoUrl from "../assets/grupeblanco.png";
import { subirPdfA3 } from "./pdfS3.service";

// ── Paleta B/N ───────────────────────────────────────────────
const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY_DARK: [number, number, number] = [80, 80, 80];
const GRAY_MED: [number, number, number] = [136, 136, 136];
const GRAY_LIGHT: [number, number, number] = [240, 240, 240];
const PARCIAL_TX: [number, number, number] = [255, 255, 255];

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
  // 1. HEADER EMPRESA  (más alto para texto legible)
  // ══════════════════════════════════════════
  const HEADER_H = 32;                       // ← era 28, ahora 32
  doc.setFillColor(...BLACK);
  doc.rect(ML, y, W, HEADER_H, "F");

  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", ML + 2, y + 4, 22, 22); }
    catch { /* sin logo */ }
  }

  const txtX = logoBase64 ? ML + 27 : ML + 3;
  const maxW  = W - (txtX - ML) - 3;

  // Nombre empresa — grande y visible
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text("GRUPEB SA DE CV", txtX, y + 10);

  // RFC + dirección — más grande y legible
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);                      // ← era 7.5, ahora 8.5
  doc.setTextColor(210, 210, 210);
  doc.text(
    "RFC: GRU110205D55  ·  Rogelio Ledesma #102, Col. Cruz Vieja,",
    txtX, y + 19, { maxWidth: maxW }
  );
  doc.text(
    "Tlajomulco de Zúñiga, Jal.  CP. 45644   Tel: (33) 31801460",
    txtX, y + 27, { maxWidth: maxW }         // ← era y+26
  );

  doc.setTextColor(...BLACK);
  y += HEADER_H;

  // ══════════════════════════════════════════
  // 2. DESTINATARIO — 2 columnas
  // ══════════════════════════════════════════
  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(ML, y, W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BLACK);
  doc.text("DESTINATARIO", ML + 3, y + 5);
  doc.setTextColor(...BLACK);
  y += 7;

  const COL_GAP = 2;
  const COL_W   = (W - COL_GAP) / 2;
  const colIzqX = ML;
  const colDerX = ML + COL_W + COL_GAP;
  const colIzqW = COL_W - 2;
  const colDerW = COL_W - 2;

  const nombreDestinatario = data.cliente_impresion?.trim()
    ? data.cliente_impresion
    : data.cliente;

  // Columna izquierda — Nombre + Atención
  let yIzq = y + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  const nombreLines = doc.splitTextToSize(f(nombreDestinatario), colIzqW);
  doc.text(nombreLines, colIzqX + 2, yIzq);
  yIzq += nombreLines.length * 5.5;

  if (data.atencion?.trim()) {
    yIzq += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...BLACK);
    doc.text("ATENCIÓN", colIzqX + 2, yIzq);
    yIzq += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    const atencionLines = doc.splitTextToSize(data.atencion.trim(), colIzqW);
    doc.text(atencionLines, colIzqX + 2, yIzq);
    yIzq += atencionLines.length * 5;
  }

  // Columna derecha — Dirección + Contacto
  let yDer = y + 5;

  const direccion  = [data.calle, data.numero ? `#${data.numero}` : null].filter(Boolean).join(" ");
  const coloniaCP  = [
    data.colonia    ? `Col. ${data.colonia}`          : null,
    data.codigo_postal ? `C.P. ${data.codigo_postal}` : null,
  ].filter(Boolean).join("  ·  ");
  const pobEdo  = [data.poblacion, data.estado].filter(Boolean).join(", ");
  const contacto = [
    data.telefono ? `Tel: ${data.telefono}` : null,
    data.celular  ? `Cel: ${data.celular}`  : null,
  ].filter(Boolean).join("  ·  ");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLACK);

  [direccion, coloniaCP, pobEdo, contacto].filter(Boolean).forEach(line => {
    const wrapped = doc.splitTextToSize(line, colDerW);
    doc.text(wrapped, colDerX, yDer);
    yDer += wrapped.length * 5;
  });

  const yColBottom = Math.max(yIzq, yDer) + 2;
  doc.setDrawColor(...GRAY_MED);
  doc.setLineWidth(0.2);
  doc.line(colDerX - 1, y, colDerX - 1, yColBottom);

  y = yColBottom + 2;

  // ══════════════════════════════════════════
  // 3. PEDIDO / PRODUCTO
  // ══════════════════════════════════════════
  doc.setDrawColor(...GRAY_MED);
  doc.setLineWidth(0.3);
  doc.line(ML, y, ML + W, y);

  // ── Encabezado gris con "PEDIDO / PRODUCTO" + badge descripción ──
  const HEADER_PP_H = 8;
  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(ML, y, W, HEADER_PP_H, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BLACK);
  doc.text("PEDIDO / PRODUCTO", ML + 3, y + 5.5);

  // Badge descripción — a la derecha del encabezado gris
  // Recorta si el texto es muy largo para que no se salga
  const descripcionRaw = (data as any).descripcion as string | null | undefined;
  const descripcion    = descripcionRaw?.trim() || null;

  if (descripcion) {
    const MAX_DESC_W = 45;                    // máx mm disponibles a la derecha

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);

    // Truncar si no cabe
    let descTexto = descripcion;
    while (doc.getTextWidth(descTexto) > MAX_DESC_W && descTexto.length > 3) {
      descTexto = descTexto.slice(0, -1);
    }
    if (descTexto !== descripcion) descTexto = descTexto.slice(0, -1) + "…";

    // Alinear a la derecha del encabezado, centrado verticalmente
    const textW = doc.getTextWidth(descTexto);
    const textX = ML + W - textW - 3;
    const textY = y + 5.5;                    // misma línea base que "PEDIDO / PRODUCTO"

    doc.setTextColor(...BLACK);
    doc.text(descTexto, textX, textY);
  }

  doc.setTextColor(...BLACK);
  y += HEADER_PP_H;

  // Sub-etiquetas de columnas
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...BLACK);
  doc.text("PEDIDO",   ML + 3,  y + 5);
  doc.text("ORDEN",    ML + 34, y + 5);
  doc.text("PRODUCTO", ML + 62, y + 5);

  // Valores principales
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(f(data.no_pedido),     ML + 3,  y + 13);
  doc.text(f(data.no_produccion), ML + 34, y + 13);

  // Dimensiones del bulto
  const bulto  = data.bultos[bultoIndex];
  const campos = [
    { label: "Peso",  valor: bulto.peso,  unidad: "kg" },
    { label: "Alto",  valor: bulto.alto,  unidad: "cm" },
    { label: "Largo", valor: bulto.largo, unidad: "cm" },
    { label: "Ancho", valor: bulto.ancho, unidad: "cm" },
  ].filter(c => c.valor != null);

  if (campos.length > 0) {
    const dimColW = 58 / campos.length;
    doc.setFont("helvetica", "normal");
    campos.forEach((c, i) => {
      const cx = ML + 3 + dimColW * i;
      doc.setFontSize(6);
      doc.setTextColor(...BLACK);
      doc.text(`${c.label}:`, cx, y + 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      doc.text(`${c.valor} ${c.unidad}`, cx, y + 26);
      doc.setFont("helvetica", "normal");
    });
  }

  // Nombre producto (columna derecha)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  const prodLines = doc.splitTextToSize(f(data.nombre_producto), W - 65);
  doc.text(prodLines, ML + 62, y + 13);

  // Detalle: medida · material · cantidad
  // Prioridad: kg si modo_cantidad === "kilo", pzs si no
  const esKilo    = data.modo_cantidad === "kilo";
  const cantDisplay = esKilo && data.kilogramos
    ? `${data.kilogramos.toLocaleString("es-MX")} kg`
    : data.cantidad_total
      ? `${data.cantidad_total.toLocaleString("es-MX")} pzs`
      : "—";
  const detalle = [data.medida, data.material, cantDisplay].filter(Boolean).join("  ·  ");

  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
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
  y += 2;

  const bultoNum   = bultoIndex + 1;
  const totalBultos = data.total_bultos;

  // Badge ENVÍO PARCIAL
  if (data.es_parcialidad) {
    const numParcial  = data.numero_envio_parcial ?? 1;
    const badgeLabel  = `ENVÍO PARCIAL ${numParcial}`;
    const badgeW      = 52;
    const badgeH      = 7;
    const badgeX      = ML + 3;
    const badgeY      = y;

    doc.setFillColor(...BLACK);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PARCIAL_TX);
    doc.text(badgeLabel, badgeX + badgeW / 2, badgeY + 5, { align: "center" });

    doc.setTextColor(...BLACK);
    y += badgeH + 3;
  }

  // Recuadro número de bulto
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(ML + 3, y, 26, 18, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...BLACK);
  doc.text("BULTO", ML + 3 + 13, y + 5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text(String(bultoNum), ML + 3 + 13, y + 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...BLACK);
  doc.text(`de ${totalBultos}`, ML + 3 + 13, y + 17, { align: "center" });

  // Unidades / KG en este bulto
  const esKiloBulto    = data.modo_cantidad === "kilo" && bulto.peso_producto != null;
  const labelUnidades  = esKiloBulto ? "KG EN ESTE BULTO" : "UNIDADES EN ESTE BULTO";
  const valorUnidades  = esKiloBulto
    ? `${bulto.peso_producto!.toLocaleString("es-MX")} kg`
    : bulto.cantidad_unidades.toLocaleString("es-MX");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLACK);
  doc.text(labelUnidades, ML + 33, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BLACK);
  doc.text(valorUnidades, ML + 33, y + 17);

  // Referencia en pzas si el modo es kilo
  if (esKiloBulto && bulto.cantidad_unidades > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...BLACK);
    doc.text(
      `(${bulto.cantidad_unidades.toLocaleString("es-MX")} pzs ref.)`,
      ML + 33, y + 22
    );
  }

  y += 24;

  // ══════════════════════════════════════════
  // 5. PIE
  // ══════════════════════════════════════════
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...BLACK);

  const pieTexto = data.es_parcialidad
    ? `${f(data.no_produccion)}  ·  ${f(data.no_pedido)}  ·  Envío parcial ${data.numero_envio_parcial ?? 1}  ·  Bulto ${bultoNum} de ${totalBultos}`
    : `${f(data.no_produccion)}  ·  ${f(data.no_pedido)}  ·  Etiqueta ${bultoNum} de ${totalBultos}`;

  doc.text(pieTexto, ML + W / 2, y + 5, { align: "center", maxWidth: W - 4 });

  // ══════════════════════════════════════════
  // BORDE EXTERIOR
  // ══════════════════════════════════════════
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.rect(ML, MT, W, 142);
  doc.setTextColor(...BLACK);
}

// ── Exportado principal ──────────────────────────────────────
export async function generarPdfEtiquetas(data: EtiquetaData, guardarEnS3 = false): Promise<void> {
  const logoBase64 = await cargarLogoBase64(logoUrl);

  const doc = new jsPDF({
    orientation: "portrait",
    unit:         "mm",
    format:       [100, 150],
    putOnlyUsedFonts: true,
    floatPrecision:   16,
  });

  data.bultos.forEach((_, idx) => {
    if (idx > 0) doc.addPage();
    dibujarEtiqueta(doc, data, idx, logoBase64);
  });

  doc.setProperties({ title: `Etiquetas_${data.no_produccion}` });
  (doc.internal as any).scaleFactor = 1;

  const sufijo = data.es_parcialidad ? `_parcial${data.numero_envio_parcial ?? 1}` : "";
  const nombre = `Etiquetas_${data.no_produccion ?? data.no_pedido}${sufijo}.pdf`;
  doc.save(nombre);
  if (guardarEnS3) {
    const blob = doc.output("blob");
    await subirPdfA3(blob, nombre, "pdfs", "etiquetas");
  }
}