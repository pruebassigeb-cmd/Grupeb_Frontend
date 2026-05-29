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
const GRIS_L  = [248, 250, 252] as [number, number, number];

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtNum = (n: number) => n.toLocaleString("es-MX");
const fmtCant = (n: number) => 
  Number.isInteger(n) ? n.toLocaleString("es-MX") : n.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

const buildProd = (p: any) => {
  let s = p.nombre_producto || "";
  if (p.medida)      s += ` (${p.medida})`;
  if (p.descripcion) s += ` — ${p.descripcion}`;
  return s || "—";
};

const TIPO_LABEL: Record<string, string> = {
  local: "Local", paqueteria: "Paquetería", recoleccion: "Recolección",
};

const ESTADO_LABEL: Record<string, string> = {
  entregado: "Entregado", en_camino: "En camino", pendiente: "Pendiente",
  preparando: "Pendiente",
};

export interface ReporteRemisionesParams {
  cliente: string;
  pedidos: PedidoRemision[];
  historial: HistorialEntregasPedido[];
  pedidosSeleccionados: number[];
}

export async function generarReporteRemisiones(params: ReporteRemisionesParams): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

  const hoyStr  = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const horaStr = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const pedidoMap   = new Map(params.pedidos.map(p => [p.idsolicitud, p]));
  const historialMap = new Map(params.historial.map(h => [h.idsolicitud, h]));

  let primeraHoja = true;

  for (const idsolicitud of params.pedidosSeleccionados) {
    const pedido   = pedidoMap.get(idsolicitud);
    const historial = historialMap.get(idsolicitud);
    if (!pedido || !historial) continue;

    if (!primeraHoja) doc.addPage();
    primeraHoja = false;

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, 279, 20, "F");
    doc.setTextColor(...BLANCO);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Historial de Entregas / Remisiones", 10, 10);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${hoyStr} ${horaStr}`, 279 - 10, 10, { align: "right" });

    // ── Info pedido ─────────────────────────────────────────────────────────
    let y = 25;
    doc.setFillColor(...AZUL_L);
    doc.rect(10, y - 4, 259, 14, "F");
    doc.setTextColor(...NEGRO);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Cliente: ${params.cliente}`, 13, y + 1);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Pedido: ${pedido.no_pedido}   |   Fecha: ${fmtFecha(pedido.fecha)}   |   Entregas: ${historial.total_entregas}   |   Total bultos: ${fmtNum(historial.total_bultos)}`,
      13, y + 6
    );
    y += 16;

    // ── Tabla productos del pedido ──────────────────────────────────────────
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRIS);
    doc.text("PRODUCTOS DEL PEDIDO", 10, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [["Producto / Descripción", "Cantidad pedida", "Entregado", "% Avance"]],
      body: pedido.productos.map(p => {
        const total     = p.modo_cantidad === "kilo" ? (p.kg_total ?? 0) : (p.cantidad_total ?? 0);
        const entregado = p.cantidad_entregada;
        const pct       = total > 0 ? Math.round((entregado / total) * 100) : 0;
        const unidad    = p.modo_cantidad === "kilo" ? "kg" : "pzs";
        const nombre    = `${p.nombre_producto || "—"}${p.medida ? ` (${p.medida})` : ""}${p.descripcion ? ` — ${p.descripcion}` : ""}`;
        return [
          nombre,
          total > 0 ? `${fmtNum(total)} ${unidad}` : "—",
          `${fmtNum(entregado)} ${unidad}`,
          `${pct}%`,
        ];
      }),
      styles:             { fontSize: 7.5, cellPadding: 2, textColor: NEGRO },
      headStyles:         { fillColor: AZUL, textColor: BLANCO, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: GRIS_L },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 40, halign: "center" },
        2: { cellWidth: 40, halign: "center" },
        3: { cellWidth: 30, halign: "center" },
      },
      margin: { left: 10, right: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // ── Tabla entregas ──────────────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRIS);
    doc.text("ENTREGAS REALIZADAS", 10, y);
    y += 3;

    const body: any[] = [];

    historial.entregas.forEach((e, idx) => {
      const productos = (e as any).productos_detalle?.length > 0
        ? (e as any).productos_detalle
        : [{ nombre_producto: e.productos || "—", medida: "", descripcion: null, total_bultos: e.total_bultos, cantidad: e.cantidad_entregada, modo_cantidad: e.modo_cantidad }];

      // ── Celda Nota: solo el número de nota (las observaciones van en fila aparte)
      const notaObs = String((e as any).nota_observaciones || "").trim();
      const notaCell = e.nota_no || "—";

      // ── Celda Guía/Obs: guía de paquetería o descripción de entrega ────────
      const guiaCell = e.numero_guia || e.observaciones || "—";

      productos.forEach((p: any, pIdx: number) => {
        const esFirst = pIdx === 0;
        body.push([
          esFirst ? String(idx + 1) : "",
          esFirst ? fmtFecha(e.fecha_envio) : "",
          esFirst ? notaCell : "",
          esFirst ? (TIPO_LABEL[e.tipo] || e.tipo) : "",
          buildProd(p),
          String(p.total_bultos),
          `${fmtCant(p.cantidad)} ${p.modo_cantidad === "kilo" ? "kg" : "pzs"}`,
          esFirst ? guiaCell : "",
          esFirst ? (ESTADO_LABEL[e.estado] || e.estado) : "",
        ]);
      });

      // ── Fila adicional con observaciones de la nota (si existen) ──────────
      if (notaObs) {
        body.push([
          {
            content: `Observaciones de la remisión: ${notaObs}`,
            colSpan: 9,
            styles: {
              fontStyle: "italic",
              textColor: [80, 60, 0],
              fillColor: [255, 253, 230],
              halign: "left",
            },
          },
        ]);
      }
    });

    autoTable(doc, {
      startY: y,
      head: [["#", "Fecha", "Nota", "Tipo", "Producto", "Bultos", "Cantidad", "Guía / Obs.", "Estado"]],
      body,
      styles:             { fontSize: 7, cellPadding: 1.8, textColor: NEGRO },
      headStyles:         { fillColor: NEGRO, textColor: BLANCO, fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: GRIS_L },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center" },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20 },
        4: { cellWidth: 75 },
        5: { cellWidth: 13, halign: "center" },
        6: { cellWidth: 25, halign: "center" },
        7: { cellWidth: 40 },
        8: { cellWidth: 24, halign: "center" },
      },
      margin: { left: 10, right: 10 },
    });

    // ── Totales kg / pzs ────────────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 5;

    const totKg = historial.entregas.reduce((s, e) => {
      if ((e as any).productos_detalle?.length > 0)
        return s + (e as any).productos_detalle.filter((p: any) => p.modo_cantidad === "kilo").reduce((ss: number, p: any) => ss + p.cantidad, 0);
      return e.modo_cantidad === "kilo" ? s + e.cantidad_entregada : s;
    }, 0);

    const totPzs = historial.entregas.reduce((s, e) => {
      if ((e as any).productos_detalle?.length > 0)
        return s + (e as any).productos_detalle.filter((p: any) => p.modo_cantidad !== "kilo").reduce((ss: number, p: any) => ss + p.cantidad, 0);
      return e.modo_cantidad !== "kilo" ? s + e.cantidad_entregada : s;
    }, 0);

    const partes: string[] = [];
    if (totKg  > 0) partes.push(`${fmtCant(totKg)} kg`);
    if (totPzs > 0) partes.push(`${fmtCant(totPzs)} pzs`);

    doc.setFillColor(...VERDE);
    doc.rect(10, finalY - 3, 259, 10, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE_T);
    doc.text(
      `TOTAL ENTREGADO: ${partes.join(" / ")} — ${fmtNum(historial.total_bultos)} bultos en ${historial.total_entregas} entrega(s)`,
      14, finalY + 3
    );
  }

  // ── Pie de página ─────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(`Página ${i} de ${pageCount}`, 279 - 10, 210 - 5, { align: "right" });
  }

  doc.save(`historial_remisiones_${new Date().toISOString().slice(0, 10)}.pdf`);
}