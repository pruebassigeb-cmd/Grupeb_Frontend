import jsPDF from "jspdf";
import { cargarLogoBase64 } from "./Pdfutils";
import type { EtiquetaData } from "./seguimientoService";

// ── Paleta B/N ───────────────────────────────────────────────
const BLACK:      [number, number, number] = [0,   0,   0  ];
const WHITE:      [number, number, number] = [255, 255, 255];
const GRAY_DARK:  [number, number, number] = [80,  80,  80 ];
const GRAY_MED:   [number, number, number] = [136, 136, 136];
const GRAY_LIGHT: [number, number, number] = [240, 240, 240];

const f = (v: any) =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : String(v).trim();

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

// ── Dibuja una etiqueta completa en la posición Y indicada ───
function dibujarEtiqueta(
  doc: jsPDF,
  data: EtiquetaData,
  bultoIndex: number,
  offsetY: number,         // 0 = etiqueta superior, ~148 = etiqueta inferior
  logoBase64: string | null
) {
  const M  = 10;           // margen izquierdo
  const W  = 190;          // ancho total (A4 = 210, margen 10 c/lado)
  const Y  = offsetY;

  // ════════════════════════════════════════════
  // BORDE EXTERIOR
  // ════════════════════════════════════════════
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.4);
  doc.rect(M, Y, W, 128);

  // ════════════════════════════════════════════
  // BLOQUE EMPRESA (superior) — fondo negro
  // ════════════════════════════════════════════
  doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.rect(M, Y, W, 24, "F");

  // Logo (pequeño, lado izquierdo)
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", M + 2, Y + 2, 18, 18); }
    catch { /* sin logo */ }
  }

  // Nombre empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text("GRUPEB SA DE CV", M + 23, Y + 9);

  // RFC + dirección + teléfono
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(200, 200, 200);
  doc.text(
    "RFC: GRU110205D55   ·   Rogelio Ledesma #102, Col. Cruz Vieja, Tlajomulco de Zúñiga, Jalisco  CP. 45644",
    M + 23, Y + 16,
    { maxWidth: W - 26 }
  );
  doc.text("Tel: (33) 31801460", M + 23, Y + 21);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  // ════════════════════════════════════════════
  // BLOQUE DESTINATARIO (medio) — fondo gris claro
  // ════════════════════════════════════════════
  doc.setFillColor(GRAY_LIGHT[0], GRAY_LIGHT[1], GRAY_LIGHT[2]);
  doc.rect(M, Y + 24, W, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("DESTINATARIO", M + 3, Y + 28.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  // Nombre de impresión (con fallback a razón social)
  const nombreDestinatario = data.cliente_impresion?.trim()
    ? data.cliente_impresion
    : data.cliente;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text(f(nombreDestinatario), M + 3, Y + 38);

  // Dirección
  const direccion = [data.calle, data.numero].filter(Boolean).join(" #");
  const coloniaCP = [`Col. ${data.colonia}`, `C.P. ${data.codigo_postal}`].filter(v => v !== "Col. " && v !== "C.P. ").join("  ·  ");
  const pobEdo    = [data.poblacion, data.estado].filter(Boolean).join(", ");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  if (direccion.trim()) doc.text(direccion, M + 3, Y + 46);
  if (coloniaCP.trim()) doc.text(coloniaCP,  M + 3, Y + 52);
  if (pobEdo.trim())    doc.text(pobEdo,     M + 3, Y + 58);

  // Teléfono / celular
  const contacto = [
    data.telefono ? `Tel: ${data.telefono}` : "",
    data.celular  ? `Cel: ${data.celular}`  : "",
  ].filter(Boolean).join("  ·  ");
  if (contacto) doc.text(contacto, M + 3, Y + 64);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  // ════════════════════════════════════════════
  // BLOQUE PEDIDO / PRODUCTO (inferior) — fondo gris claro
  // ════════════════════════════════════════════
  doc.setDrawColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.setLineWidth(0.3);
  doc.line(M, Y + 70, M + W, Y + 70);

  doc.setFillColor(GRAY_LIGHT[0], GRAY_LIGHT[1], GRAY_LIGHT[2]);
  doc.rect(M, Y + 70, W, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("PEDIDO / PRODUCTO", M + 3, Y + 74.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  // Labels: Pedido | Orden | Producto
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.text("PEDIDO",   M + 3,  Y + 83);
  doc.text("ORDEN",    M + 55, Y + 83);
  doc.text("PRODUCTO", M + 110, Y + 83);

  // Valores
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text(`PED-${f(data.no_pedido)}`,  M + 3,  Y + 90);
  doc.text(f(data.no_produccion),        M + 55, Y + 90);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(f(data.nombre_producto),      M + 110, Y + 90, { maxWidth: W - 113 });

  // Medida / material / cantidad
  const cantDisplay = data.modo_cantidad === "kilo" && data.kilogramos
    ? `${data.kilogramos.toLocaleString("es-MX")} kg`
    : data.cantidad_total
      ? `${data.cantidad_total.toLocaleString("es-MX")} pzs`
      : "—";
  const detalle = [data.medida, data.material, cantDisplay].filter(Boolean).join("  ·  ");
  doc.setFontSize(7.5);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text(detalle, M + 110, Y + 97, { maxWidth: W - 113 });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  // ── Separador antes del bulto ──
  doc.setDrawColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.setLineWidth(0.3);
  doc.line(M, Y + 103, M + W, Y + 103);

  // ── Caja BULTO (izquierda) ──
  const bultoNum    = bultoIndex + 1;
  const totalBultos = data.total_bultos;
  const bulto       = data.bultos[bultoIndex];

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.5);
  doc.setFillColor(GRAY_LIGHT[0], GRAY_LIGHT[1], GRAY_LIGHT[2]);
  doc.rect(M + 3, Y + 107, 34, 16, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("BULTO", M + 20, Y + 112, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text(String(bultoNum), M + 20, Y + 121, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text(`de ${totalBultos}`, M + 20, Y + 126, { align: "center" });

  // ── Unidades (derecha de la caja) ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.text("UNIDADES EN ESTE BULTO", M + 42, Y + 113);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text(
    bulto.cantidad_unidades.toLocaleString("es-MX"),
    M + 42, Y + 125
  );

  // ── Pie ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY_MED[0], GRAY_MED[1], GRAY_MED[2]);
  doc.text(
    `${f(data.no_produccion)}  ·  PED-${f(data.no_pedido)}  ·  Etiqueta ${bultoNum} de ${totalBultos}`,
    M + W / 2, Y + 126, { align: "center" }
  );
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

// ── Función principal exportada ──────────────────────────────
export async function generarPdfEtiquetas(data: EtiquetaData): Promise<void> {
  const logoBase64 = await cargarLogoBase64("/src/assets/logogrupeb.png");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // 2 etiquetas por hoja — offsetY: 10 (superior) y 152 (inferior)
  const OFFSET_TOP    = 10;
  const OFFSET_BOTTOM = 152;

  data.bultos.forEach((_, idx) => {
    const esSegundo = idx % 2 === 1;
    const esPrimero = idx % 2 === 0;

    // Nueva página cuando empieza un par (0, 2, 4...)
    if (esPrimero && idx > 0) doc.addPage();

    const offsetY = esSegundo ? OFFSET_BOTTOM : OFFSET_TOP;
    dibujarEtiqueta(doc, data, idx, offsetY, logoBase64);
  });

  // Si hay número impar de bultos, la segunda posición queda vacía — está bien

  doc.save(`Etiquetas_${data.no_produccion ?? `PED-${data.no_pedido}`}.pdf`);
}