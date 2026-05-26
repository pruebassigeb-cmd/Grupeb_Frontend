import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PedidoRemision, HistorialEntregasPedido } from "../types/envios.types";

const AZUL   = [37, 99, 235]   as [number, number, number];
const AZUL_L = [219, 234, 254] as [number, number, number];
const GRIS   = [107, 114, 128] as [number, number, number];
const NEGRO  = [17, 24, 39]    as [number, number, number];
const BLANCO = [255, 255, 255] as [number, number, number];
const VERDE  = [220, 252, 231] as [number, number, number];
const VERDE_T = [21, 128, 61]  as [number, number, number];

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtNum = (n: number) => n.toLocaleString("es-MX");

export interface ReporteRemisionesParams {
  cliente:       string;
  pedidos:       PedidoRemision[];
  historial:     HistorialEntregasPedido[];
  pedidosSeleccionados: number[]; // idsolicitud seleccionados
}

export async function generarReporteRemisiones(params: ReporteRemisionesParams): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

  const hoyStr  = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const horaStr = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  // Mapa pedido por idsolicitud
  const pedidoMap = new Map(params.pedidos.map(p => [p.idsolicitud, p]));
  const historialMap = new Map(params.historial.map(h => [h.idsolicitud, h]));

  let primeraHoja = true;

  for (const idsolicitud of params.pedidosSeleccionados) {
    const pedido   = pedidoMap.get(idsolicitud);
    const historial = historialMap.get(idsolicitud);
    if (!pedido || !historial) continue;

    if (!primeraHoja) doc.addPage();
    primeraHoja = false;

    let y = 0;

    // ── Encabezado ───────────────────────────────────────────
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, 279, 20, "F");

    doc.setTextColor(...BLANCO);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Historial de Entregas / Remisiones", 10, 10);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${hoyStr} ${horaStr}`, 279 - 10, 10, { align: "right" });

    // ── Info pedido ──────────────────────────────────────────
    y = 25;
    doc.setFillColor(...AZUL_L);
    doc.rect(10, y - 4, 259, 14, "F");

    doc.setTextColor(...NEGRO);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Cliente: ${params.cliente}`, 13, y + 1);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Pedido: ${pedido.no_pedido}   |   Fecha: ${fmtFecha(pedido.fecha)}   |   Entregas: ${historial.total_entregas}   |   Total bultos: ${fmtNum(historial.total_bultos)}`, 13, y + 6);

    y += 16;

    // ── Productos del pedido ─────────────────────────────────
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRIS);
    doc.text("PRODUCTOS DEL PEDIDO", 10, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [["Producto", "Medida", "Cantidad total pedida", "Entregado", "Pendiente", "% Avance"]],
      body: pedido.productos.map(p => {
        const total = p.modo_cantidad === "kilo" ? (p.kg_total ?? 0) : (p.cantidad_total ?? 0);
        const entregado = p.cantidad_entregada;
        const pendiente = Math.max(0, total - entregado);
        const pct = total > 0 ? Math.round((entregado / total) * 100) : 0;
        const unidad = p.modo_cantidad === "kilo" ? "kg" : "pzs";
        return [
          p.nombre_producto || "—",
          p.medida || "—",
          total > 0 ? `${fmtNum(total)} ${unidad}` : "—",
          `${fmtNum(entregado)} ${unidad}`,
          `${fmtNum(pendiente)} ${unidad}`,
          `${pct}%`,
        ];
      }),
      styles: { fontSize: 7.5, cellPadding: 2, textColor: NEGRO },
      headStyles: { fillColor: [37, 99, 235], textColor: BLANCO, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25 },
        2: { cellWidth: 40, halign: "center" },
        3: { cellWidth: 35, halign: "center" },
        4: { cellWidth: 35, halign: "center" },
        5: { cellWidth: 20, halign: "center" },
      },
      margin: { left: 10, right: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // ── Entregas / Remisiones ────────────────────────────────
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRIS);
    doc.text("ENTREGAS REALIZADAS", 10, y);
    y += 3;

    const TIPO_LABEL: Record<string, string> = {
      local:       "Local",
      paqueteria:  "Paquetería",
      recoleccion: "Recolección",
    };

    autoTable(doc, {
      startY: y,
      head: [["#", "Fecha", "Nota / Remisión", "Tipo", "Producto(s)", "Bultos", "Cantidad", "Guía / Obs.", "Estado"]],
      body: historial.entregas.map((e, idx) => [
        String(idx + 1),
        fmtFecha(e.fecha_envio),
        e.nota_no || "—",
        TIPO_LABEL[e.tipo] || e.tipo,
        e.productos || "—",
        String(e.total_bultos),
        e.modo_cantidad === "kilo"
          ? `${fmtNum(e.cantidad_entregada)} kg`
          : `${fmtNum(e.cantidad_entregada)} pzs`,
        e.numero_guia || e.observaciones || "—",
        e.estado === "entregado" ? "Entregado" : e.estado === "en_camino" ? "En camino" : "Preparando",
      ]),
      styles: { fontSize: 7.5, cellPadding: 2, textColor: NEGRO },
      headStyles: { fillColor: [17, 24, 39], textColor: BLANCO, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center" },
        1: { cellWidth: 20 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 55 },
        5: { cellWidth: 14, halign: "center" },
        6: { cellWidth: 28, halign: "center" },
        7: { cellWidth: 40 },
        8: { cellWidth: 22, halign: "center" },
      },
      margin: { left: 10, right: 10 },
    });

    // ── Total acumulado ──────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    doc.setFillColor(...VERDE);
    doc.rect(10, finalY - 3, 259, 10, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE_T);
    doc.text(
      `TOTAL ENTREGADO: ${fmtNum(historial.total_entregado)} — ${fmtNum(historial.total_bultos)} bultos en ${historial.total_entregas} entrega(s)`,
      14, finalY + 3
    );
  }

  // ── Pie de página ────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(`Página ${i} de ${pageCount}`, 279 - 10, 210 - 5, { align: "right" });
  }

  doc.save(`historial_remisiones_${new Date().toISOString().slice(0, 10)}.pdf`);
}