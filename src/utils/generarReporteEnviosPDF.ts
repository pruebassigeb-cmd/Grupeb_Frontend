// ============================================================
// generarReporteEnviosPDF.ts
// Colocar en: src/utils/generarReporteEnviosPDF.ts
//
// Dependencia: jsPDF + jsPDF-AutoTable
//   npm install jspdf jspdf-autotable
// ============================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  HistorialLocalItem,
  HistorialPaqueteriaItem,
  FiltrosHistorialLocal,
  FiltrosHistorialPaqueteria,
  Unidad,
  Conductor,
  Paqueteria,
} from "../types/envios.types";

// ── Tipos de entrada ─────────────────────────────────────────

type ParamsLocal = {
  tipo:       "local";
  datos:      HistorialLocalItem[];
  filtros:    FiltrosHistorialLocal;
  unidades?:  Unidad[];
  conductores?: Conductor[];
  paqueterias?: never;
};

type ParamsPaqueteria = {
  tipo:        "paqueteria";
  datos:       HistorialPaqueteriaItem[];
  filtros:     FiltrosHistorialPaqueteria;
  paqueterias?: Paqueteria[];
  unidades?:   never;
  conductores?: never;
};

export type GenerarReporteParams = ParamsLocal | ParamsPaqueteria;

// ── Helpers ──────────────────────────────────────────────────

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

const fmtHora = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const fmtFiltroFecha = (f?: string) => (f ? fmtFecha(f) : "—");

// ── Generador principal ───────────────────────────────────────

export async function generarReporteEnviosPDF(params: GenerarReporteParams): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

  const AZUL   = [37, 99, 235]  as [number, number, number];
  const GRIS   = [107, 114, 128] as [number, number, number];
  const NEGRO  = [17, 24, 39]   as [number, number, number];
  const BLANCO = [255, 255, 255] as [number, number, number];

  const hoyStr  = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const horaStr = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  // ── Encabezado ───────────────────────────────────────────────
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, 279, 18, "F");

  doc.setTextColor(...BLANCO);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const titulo = params.tipo === "local"
    ? "Reporte de Reparto Local"
    : "Reporte de Envíos por Paquetería";
  doc.text(titulo, 10, 11);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado: ${hoyStr} ${horaStr}`, 279 - 10, 11, { align: "right" });

  // ── Filtros aplicados ────────────────────────────────────────
  let yPos = 22;
  doc.setTextColor(...GRIS);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("FILTROS APLICADOS:", 10, yPos);

  doc.setFont("helvetica", "normal");
  const filtroTextos: string[] = [];

  if (params.tipo === "local") {
    const f = params.filtros as FiltrosHistorialLocal;
    if (f.fecha_inicio || f.fecha_fin)
      filtroTextos.push(`Fechas: ${fmtFiltroFecha(f.fecha_inicio)} → ${fmtFiltroFecha(f.fecha_fin)}`);
    if (f.idunidad && params.unidades) {
      const u = params.unidades.find(x => x.idunidad === f.idunidad);
      if (u) filtroTextos.push(`Unidad: ${u.marca} ${u.modelo} — ${u.placa}`);
    }
    if (f.idusuario && params.conductores) {
      const c = params.conductores.find(x => x.idusuario === f.idusuario);
      if (c) filtroTextos.push(`Chofer: ${c.nombre} ${c.apellido}`);
    }
    if (f.no_pedido) filtroTextos.push(`N° Pedido: ${f.no_pedido}`);
    if (f.cliente)   filtroTextos.push(`Cliente: ${f.cliente}`);
  } else {
    const f = params.filtros as FiltrosHistorialPaqueteria;
    if (f.fecha_inicio || f.fecha_fin)
      filtroTextos.push(`Fechas: ${fmtFiltroFecha(f.fecha_inicio)} → ${fmtFiltroFecha(f.fecha_fin)}`);
    if (f.idpaqueteria && params.paqueterias) {
      const p = params.paqueterias.find(x => x.idpaqueteria === f.idpaqueteria);
      if (p) filtroTextos.push(`Paquetería: ${p.nombre}`);
    }
    if (f.numero_guia) filtroTextos.push(`Guía: ${f.numero_guia}`);
    if (f.no_pedido)   filtroTextos.push(`N° Pedido: ${f.no_pedido}`);
    if (f.cliente)     filtroTextos.push(`Cliente: ${f.cliente}`);
    if (f.estado)      filtroTextos.push(`Estado: ${f.estado}`);
  }

  if (filtroTextos.length === 0) filtroTextos.push("Sin filtros (todos los registros)");

  doc.setTextColor(...NEGRO);
  doc.text(filtroTextos.join("   |   "), 55, yPos);

  yPos += 7;

  // ── Tabla ────────────────────────────────────────────────────
  if (params.tipo === "local") {
    const rows = (params.datos as HistorialLocalItem[]).map(r => [
      fmtFecha(r.fecha),
      r.no_pedido,
      r.cliente.length > 22 ? r.cliente.slice(0, 22) + "…" : r.cliente,
      r.unidad.nombre.length > 28 ? r.unidad.nombre.slice(0, 28) + "…" : r.unidad.nombre,
      r.chofer.nombre,
      String(r.total_bultos),
      fmtHora(r.hora_salida),
      fmtHora(r.hora_llegada),
      r.observacion ?? "—",
      r.firma ?? "—",
      r.es_parcialidad ? "Parcialidad" : "Completo",
      r.estado,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Fecha", "N° Pedido", "Cliente", "Unidad", "Chofer", "Bultos", "Salida", "Llegada", "Obs.", "Firma", "Tipo", "Estado"]],
      body: rows,
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: NEGRO },
      headStyles: { fillColor: [37, 99, 235], textColor: BLANCO, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 18 },
        2: { cellWidth: 36 },
        3: { cellWidth: 42 },
        4: { cellWidth: 28 },
        5: { cellWidth: 12, halign: "center" },
        6: { cellWidth: 16, halign: "center" },
        7: { cellWidth: 16, halign: "center" },
        8: { cellWidth: 10, halign: "center" },
        9: { cellWidth: 14 },
        10: { cellWidth: 18, halign: "center" },
        11: { cellWidth: 18, halign: "center" },
      },
      margin: { left: 10, right: 10 },
    });

    // ── Totales ──────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 6;
    const totalPedidos = new Set((params.datos as HistorialLocalItem[]).map(d => d.no_pedido)).size;
    const totalBultos  = (params.datos as HistorialLocalItem[]).reduce((s, d) => s + d.total_bultos, 0);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NEGRO);
    doc.text(
      `Total pedidos: ${totalPedidos}   |   Total bultos: ${totalBultos}   |   Registros: ${params.datos.length}`,
      10, finalY
    );

  } else {
    const rows = (params.datos as HistorialPaqueteriaItem[]).map(r => [
      fmtFecha(r.fecha_envio),
      r.no_pedido,
      r.cliente.length > 22 ? r.cliente.slice(0, 22) + "…" : r.cliente,
      r.paqueteria.nombre,
      r.numero_guia ?? "Sin guía",
      String(r.total_bultos),
      r.es_parcialidad ? "Parcialidad" : "Completo",
      r.costo_flete != null
        ? `$${Number(r.costo_flete).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
        : "—",
      r.estado,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Fecha", "N° Pedido", "Cliente", "Paquetería", "N° Guía", "Bultos", "Tipo", "Flete", "Estado"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2.5, textColor: NEGRO },
      headStyles: { fillColor: [37, 99, 235], textColor: BLANCO, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 22 },
        2: { cellWidth: 50 },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 },
        5: { cellWidth: 14, halign: "center" },
        6: { cellWidth: 22, halign: "center" },
        7: { cellWidth: 22, halign: "right" },
        8: { cellWidth: 22, halign: "center" },
      },
      margin: { left: 10, right: 10 },
    });

    // ── Totales ──────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 6;
    const totalPedidos = new Set((params.datos as HistorialPaqueteriaItem[]).map(d => d.no_pedido)).size;
    const totalBultos  = (params.datos as HistorialPaqueteriaItem[]).reduce((s, d) => s + d.total_bultos, 0);
    const totalFlete   = (params.datos as HistorialPaqueteriaItem[])
      .reduce((s, d) => s + (d.costo_flete ?? 0), 0);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NEGRO);
    doc.text(
      `Total pedidos: ${totalPedidos}   |   Total bultos: ${totalBultos}   |   Flete total: $${totalFlete.toLocaleString("es-MX", { minimumFractionDigits: 2 })}   |   Registros: ${params.datos.length}`,
      10, finalY
    );
  }

  // ── Pie de página ────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(`Página ${i} de ${pageCount}`, 279 - 10, 210 - 5, { align: "right" });
  }

  // ── Descargar ────────────────────────────────────────────────
  const nombreArchivo = params.tipo === "local"
    ? `reporte_reparto_local_${new Date().toISOString().slice(0, 10)}.pdf`
    : `reporte_paqueteria_${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(nombreArchivo);
}