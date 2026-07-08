// src/pages/papel/Papel.tsx
// FormularioProducto ahora vive en components/papel/FormularioProductoPapelAlta.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Dashboard from "../../layouts/Sidebar";
import { newProductoForm, newMaterial, newGrupo } from "../../types/papel/papel.types";
import type {
  ProductoPapelForm,
  ProductoPapelListItem,
} from "../../types/papel/papel.types";
import { fetchProductoPapelById } from "../../services/papel/papel.service";
import { useProductosPapel } from "../../hooks/papel/useProductosPapel";
import FormularioProductoPapelAlta, {
  subirArchivoPendiente,
} from "../../components/papel/FormularioProductoPapelAlta";
import type {
  ArchivoPendiente,
  ProductoPapelFormConId,
} from "../../components/papel/FormularioProductoPapelAlta";
import CargaMasivaPapel from "../../components/papel/CargaMasivaPapel";

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS EXTENDIDOS PARA LA TABLA
// ══════════════════════╗
interface ArchivoPreview {
  id_archivo: number;
  url: string;
  categoria: string;
  nombre: string;
  tipo?: string;
}

interface ProductoPapelListItemEx extends ProductoPapelListItem {
  primer_tipo_papel?: string;
  primer_calibre?: string;
  primer_pliego?: string;
  archivos_preview?: ArchivoPreview[];
}

const ICON_PDF = "\uD83D\uDCC4";
const ICON_IMG = "\uD83D\uDDBC\uFE0F";
const ICON_CHART = "\uD83D\uDCCA";

// ═══════════════════════════════════════════════════════════════════════════
// MINI ARCHIVOS EN TABLA
// ═══════════════════════════════════════════════════════════════════════════
function ArchivosMini({ archivos }: { archivos?: ArchivoPreview[] }) {
  if (!archivos || archivos.length === 0)
    return <span style={{ color: "#D1D5DB", fontSize: 11 }}>—</span>;

  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "nowrap" }}>
      {archivos.slice(0, 3).map((a) => {
        const esImagen = a.categoria === "imagen-suaje-papel";
        const esPDF = a.nombre?.toLowerCase().endsWith(".pdf");

        if (esImagen) {
          return (
            <a key={a.id_archivo} href={a.url} target="_blank" rel="noreferrer" title={a.nombre}
              style={{ display: "block", flexShrink: 0 }}
              onClick={e => e.stopPropagation()}>
              <img src={a.url} alt={a.nombre}
                style={{ width: 42, height: 42, objectFit: "cover", borderRadius: 5, border: "1.5px solid #E5E7EB", background: "#F3F4F6", display: "block" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </a>
          );
        }

        const isRendimiento = a.categoria === "rendimiento-suaje-papel";
        const icon = isRendimiento ? "📊" : esPDF ? "📄" : "📎";
        const bg = isRendimiento ? "#F0FDF4" : "#EFF6FF";
        const border = isRendimiento ? "#BBF7D0" : "#BFDBFE";
        const ext = a.nombre?.split(".").pop()?.toUpperCase() ?? "";

        return (
          <a key={a.id_archivo} href={a.url} target="_blank" rel="noreferrer" title={a.nombre}
            onClick={e => e.stopPropagation()}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 5, border: `1.5px solid ${border}`, background: bg, textDecoration: "none", flexShrink: 0 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 8, color: "#6B7280", marginTop: 2, maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{ext}</span>
          </a>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE EXPANDIBLE
// ═══════════════════════════════════════════════════════════════════════════
function DetalleProducto({ id }: { id: number }) {
  const [detalle, setDetalle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductoPapelById(id)
      .then(setDetalle)
      .catch(() => setDetalle(null))
      .finally(() => setLoading(false));
  }, [id]);

  const row = (label: string, val: string | null | number | undefined) => val ? (
    <div key={label} style={{ display: "flex", gap: 6, fontSize: 12, marginBottom: 2 }}>
      <span style={{ color: "#6B7280", minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#111827", fontWeight: 500 }}>{String(val)}</span>
    </div>
  ) : null;

  if (loading) return <div style={{ padding: "16px", background: "#F9FAFB", borderTop: "1px solid #E5E7EB", fontSize: 12, color: "#9CA3AF" }}>Cargando detalle...</div>;
  if (!detalle) return <div style={{ padding: "16px", background: "#F9FAFB", borderTop: "1px solid #E5E7EB", fontSize: 12, color: "#DC2626" }}>Error al cargar el detalle.</div>;

  const COLORS = ["#A08060", "#7A9BAE", "#7A9E88", "#9E8E7A", "#8A7AAE", "#9E7A8A"];
  const LIGHTS = ["#FDF6EE", "#EEF3F7", "#EEF7F1", "#F7F3EE", "#F2EFF7", "#F7EEF2"];

  const corteTxt = detalle.suaje
    ? [detalle.suaje.corte1_tipo, detalle.suaje.corte1_medida].filter(Boolean).join(" — ") +
      (detalle.suaje.puntos_corte != null ? ` (${detalle.suaje.puntos_corte} pts)` : "")
    : "";
  const doblesTxt = detalle.suaje
    ? [detalle.suaje.dobles1_tipo, detalle.suaje.dobles1_medida].filter(Boolean).join(" — ") +
      (detalle.suaje.puntos_doble != null ? ` (${detalle.suaje.puntos_doble} pts)` : "")
    : "";

  return (
    <div style={{ padding: "14px 16px", background: "#F9FAFB", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3px 32px", marginBottom: 14 }}>
        {row("Tipo", detalle.tipo_producto)}
        {row("Tamaño", detalle.tamano_prod)}
        {row("Descripción", detalle.descripcion_papel)}
        {row("Ancho", detalle.ancho)}
        {row("Fuelle", detalle.fuelle)}
        {row("Altura", detalle.altura)}
        {row("Medida", detalle.medida)}
        {row("Tamaño de asa sugerido", detalle.tamano_asa_default)}
        {row("Creado por", detalle.creado_por_nombre)}
      </div>

      {detalle.suaje && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0F766E", margin: "0 0 6px" }}>Suaje</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3px 32px" }}>
            {row("Numero", detalle.suaje.numero)}
            {row("PZS", detalle.suaje.pzs)}
            {row("Tamano", detalle.suaje.tamano)}
            {row("Metros", detalle.suaje.metros)}
            {row("Matrix", detalle.suaje.matrix_nombre)}
            {row("T. arreglo", detalle.suaje.tiempo_arreglo ? `${detalle.suaje.tiempo_arreglo} min` : null)}
            {row("Corte", corteTxt)}
            {row("Dobles", doblesTxt)}
            {detalle.suaje.sacabocado_nombre && row("Sacabocado", `${detalle.suaje.sacabocado_nombre}${detalle.suaje.sacabocado_medida ? " -- " + detalle.suaje.sacabocado_medida : ""} x ${detalle.suaje.cantidad_sacabocado ?? "--"}`)}
            {detalle.suaje.perforado_nombre && row("Perforado", `${detalle.suaje.perforado_nombre}${detalle.suaje.perforado_medida ? " -- " + detalle.suaje.perforado_medida : ""} x ${detalle.suaje.cantidad_perforado ?? "--"}`)}
            {detalle.suaje.herramental_desbarbe === true && row("Herramental desbarbe", detalle.suaje.no_desbarbe != null ? `Sí — No. ${detalle.suaje.no_desbarbe}` : "Sí")}
          </div>
        </div>
      )}

      {detalle.acabados && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#92400E", margin: "0 0 6px" }}>Acabados</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3px 32px" }}>
            {row("Tipo de pegado", detalle.acabados.tipo_pegado)}
            {row("Pegamento", detalle.acabados.pegamento)}
            {detalle.acabados.laminados?.length > 0 && row("Laminado", detalle.acabados.laminados.map((l: any) => l.nombre).join(", "))}
            {row("Refuerzo material", detalle.acabados.refuerzo_material)}
            {row("Refuerzo medida", detalle.acabados.refuerzo_medida)}
            {row("Base material", detalle.acabados.base_material)}
            {row("Base medida", detalle.acabados.base_medida)}
            {row("Empaque", detalle.acabados.empaque)}
            {row("Pzs / caja", detalle.acabados.pzs_caja)}
            {detalle.acabados.asas?.length > 0 && row("Asas", detalle.acabados.asas.map((a: any) => a.tipo_asa).join(", "))}
          </div>
        </div>
      )}

      {detalle.maquinaria && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#334155", margin: "0 0 6px" }}>Maquinaria</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3px 32px" }}>
            {([
              ["hojeado_guillotina", "Hojeado / Guill."],
              ["impresora", "Impresora"],
              ["hs_ar", "Hs y AR"],
              ["suaje_maquina", "Suaje"],
              ["uv", "UV"],
              ["textura", "Textura"],
              ["empalme", "Empalme"],
              ["armado", "Armado"],
              ["asas_maquina", "Asas"],
              ["desbarbe", "Desbarbe"],
            ] as [string, string][]).map(([key, label]) => {
              const items: { id: number; nombre: string }[] = detalle.maquinaria[key] ?? [];
              return items.length > 0 ? row(label, items.map((i: any) => i.nombre).join(", ")) : null;
            })}
          </div>
        </div>
      )}

      {detalle.grupos?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3730A3", margin: "0 0 6px" }}>Opciones de material</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {detalle.grupos.map((g: any, gi: number) => {
              const c = COLORS[gi % COLORS.length], l = LIGHTS[gi % LIGHTS.length];
              const cols = Math.min(g.materiales.length, 4);
              return (
                <div key={g.idgrupo_papel} style={{ border: `1px solid ${c}30`, borderLeft: `3px solid ${c}`, borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ background: l, padding: "4px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      Grupo {gi + 1} — {g.materiales.length} mat.
                    </span>
                    {g.precio_sugerido && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: c }}>
                        ${parseFloat(g.precio_sugerido).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 0, padding: "6px 8px" }}>
                    {g.materiales.map((m: any, mi: number) => (
                      <div key={m.iddetalle_material} style={{ padding: "4px 6px", borderLeft: mi > 0 ? `1px dashed ${c}40` : "none" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: c, minWidth: 12 }}>{mi + 1}.</span>
                          {m.tipo_papel && <span style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{m.tipo_papel}</span>}
                          {m.calibre && <span style={{ fontSize: 10, background: `${c}18`, color: c, borderRadius: 3, padding: "0 4px", fontWeight: 600 }}>{m.calibre}</span>}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "1px 8px", marginBottom: 3 }}>
                          {[["Pliego", m.pliego], ["Rend.", m.rendimiento], ["Corte", m.corte]].filter(([, v]) => v).map(([lbl, val]) => (
                            <span key={lbl as string} style={{ fontSize: 10 }}>
                              <span style={{ color: "#9CA3AF" }}>{lbl}: </span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{val}</span>
                            </span>
                          ))}
                        </div>
                        {(m.hojeado?.bobina || m.hojeado?.corte || m.hojeado?.rendimiento || m.hojeado?.guillotina || m.hojeado?.hilo || m.hojeado?.bobina_extra) && (
                          <div style={{ borderTop: "1px dashed #F0F0F0", paddingTop: 3, marginTop: 1 }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginRight: 4 }}>Hoj:</span>
                            {[["Bob", m.hojeado?.bobina], ["B+", m.hojeado?.bobina_extra], ["Cte", m.hojeado?.corte], ["Rnd", m.hojeado?.rendimiento], ["Gll", m.hojeado?.guillotina], ["Hlo", m.hojeado?.hilo]].filter(([, v]) => v).map(([lbl, val]) => (
                              <span key={lbl as string} style={{ fontSize: 10, marginRight: 6 }}>
                                <span style={{ color: "#9CA3AF" }}>{lbl}: </span>
                                <span style={{ color: "#374151", fontWeight: 500 }}>{val}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detalle.archivos?.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 8px" }}>Archivos</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {detalle.archivos.map((a: any) => (
              <a key={a.id_archivo} href={a.url} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#1D4ED8", textDecoration: "none" }}>
                <span style={{ fontSize: 13 }}>
                  {a.categoria === "imagen-suaje-papel" ? ICON_IMG : a.categoria === "rendimiento-suaje-papel" ? ICON_CHART : ICON_PDF}
                </span>
                <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.nombre}>{a.nombre}</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>{a.categoria}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLA LISTADO
// ═══════════════════════════════════════════════════════════════════════════
function TablaCatalogo({ productos, loading, onNuevo, onEditar, onEliminar }: {
  productos: ProductoPapelListItem[];
  loading: boolean;
  onNuevo: () => void;
  onEditar: (p: ProductoPapelListItem) => void;
  onEliminar: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const COLS = "1.2fr 1fr 0.8fr 1fr 0.7fr 0.75fr 0.9fr 140px auto";

  const filtered = (productos as ProductoPapelListItemEx[]).filter(p =>
    p.tipo_producto.toLowerCase().includes(search.toLowerCase()) ||
    (p.medida ?? "").toLowerCase().includes(search.toLowerCase()) ||
    ((p as any).descripcion_papel ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.primer_tipo_papel ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpanded = (id: number) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto", padding: "0 5px 50px", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#111827" }}>

      {deleteId !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px 28px", maxWidth: 340, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <p style={{ fontSize: 14, color: "#111827", margin: "0 0 5px", fontWeight: 600 }}>¿Eliminar producto?</p>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 18px" }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setDeleteId(null)} style={{ height: 34, padding: "0 14px", border: "1px solid #E5E7EB", borderRadius: 6, background: "#fff", color: "#6B7280", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => { onEliminar(deleteId!); setDeleteId(null); }} style={{ height: 34, padding: "0 14px", border: "none", borderRadius: 6, background: "#DC2626", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado fijo: título, acciones y buscador */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 15,
        background: "#fff",
        padding: "15px 0 12px",
        marginBottom: 8,
        borderBottom: "1px solid #F3F4F6",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9CA3AF", margin: "0 0 2px", fontWeight: 600 }}>Alta de productos</p>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#111827" }}>Productos de papel</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginLeft: "auto", flexShrink: 0 }}>
            <button onClick={onNuevo} style={{ height: 38, padding: "0 18px", border: "none", borderRadius: 7, background: "#1D4ED8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Registrar nuevo producto</button>
            <CargaMasivaPapel />
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9CA3AF" }}>&#128269;</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por tipo, descripción o material..."
            style={{ width: "100%", height: 36, paddingLeft: 32, paddingRight: 12, border: "1px solid #D1D5DB", borderRadius: 7, fontSize: 12, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["Tipo de producto", "Descripción", "Medida", "Tipo de papel", "Gramaje", "Pliego", "Creado por", "Archivos", ""].map(h => (
            <div key={h} style={{ padding: "8px 0 8px 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "36px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "36px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            {search ? "Sin resultados." : "No hay productos registrados."}
          </div>
        ) : filtered.map((p, idx) => {
          const px = p as ProductoPapelListItemEx;
          const isExpanded = expandedId === p.idproducto_papel;
          const rowBg = isExpanded ? "#EFF6FF" : idx % 2 === 0 ? "#fff" : "#FAFAFA";
          return (
            <div key={p.idproducto_papel}>
              <div onClick={() => toggleExpanded(p.idproducto_papel)}
                style={{ display: "grid", gridTemplateColumns: COLS, padding: "0 16px", alignItems: "center", minHeight: 58, background: rowBg, borderBottom: isExpanded ? "none" : "1px solid #F3F4F6", cursor: "pointer", userSelect: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={e => { e.stopPropagation(); toggleExpanded(p.idproducto_papel); }}
                    style={{ width: 20, height: 20, borderRadius: 4, background: "#EFF6FF", border: "1px solid #BFDBFE", cursor: "pointer", fontSize: 11, color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isExpanded ? "^" : "v"}
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.tipo_producto}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF" }}>ID #{p.idproducto_papel}</p>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 6 }}>{(p as any).descripcion_papel || "—"}</span>
                <span style={{ fontSize: 12, color: "#374151" }}>{p.medida || "—"}</span>
                <span style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 6 }}>{px.primer_tipo_papel || "—"}</span>
                <span>
                  {px.primer_calibre
                    ? <span style={{ display: "inline-block", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 6px", fontSize: 11, color: "#475569", fontWeight: 500, whiteSpace: "nowrap" }}>{px.primer_calibre}</span>
                    : <span style={{ fontSize: 12, color: "#374151" }}>—</span>
                  }
                </span>
                <span style={{ fontSize: 12, color: "#374151" }}>{px.primer_pliego || "—"}</span>
                <span style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.creado_por || "—"}</span>
                <ArchivosMini archivos={px.archivos_preview} />
                <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => onEditar(p)} style={{ height: 28, padding: "0 10px", background: "#F3F4F6", border: "1px solid #D1D5DB", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#374151" }}>Editar</button>
                  <button onClick={() => setDeleteId(p.idproducto_papel)} style={{ height: 28, padding: "0 8px", background: "#FEE2E2", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#DC2626" }}>x</button>
                </div>
              </div>
              {isExpanded && <DetalleProducto id={p.idproducto_papel} />}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, textAlign: "right", fontSize: 11, color: "#9CA3AF" }}>
        {filtered.length} de {productos.length} producto{productos.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
type Vista = "tabla" | "nuevo" | "editar";

export default function Papel() {
  useAuth();
  const { productos, loading, saving, crear, actualizar, eliminar } = useProductosPapel();
  const [vista, setVista] = useState<Vista>("tabla");
  const [editForm, setEditForm] = useState<ProductoPapelFormConId | undefined>(undefined);
  const [editId, setEditId] = useState<number | undefined>(undefined);

  const handleEditar = async (p: ProductoPapelListItem) => {
    setEditId(p.idproducto_papel);
    setEditForm(undefined);
    setVista("editar");
    try {
      const d = await fetchProductoPapelById(p.idproducto_papel);
      const form = newProductoForm();
      form.idcat_tipo_producto_papel = d.idcat_tipo_producto_papel;
      form.tipoProductoNombre = d.tipo_producto ?? "";
      form.descripcion = d.descripcion_papel ?? "";
      // El backend ya regresa ancho/fuelle/altura/medida limpios (sin
      // ".00" sobrante) desde productoPapel.controller.ts, así que aquí
      // solo se usan tal cual vienen.
      form.ancho = d.ancho ? String(d.ancho) : "";
      form.fuelle = d.fuelle ? String(d.fuelle) : "";
      form.altura = d.altura ? String(d.altura) : "";
      form.medida = d.medida ?? "";
      form.tamanoAsaDefault = d.tamano_asa_default ?? "";
      // NUEVO: precargar el tamaño del producto (Mini/Chico/Mediano/Grande/Extragrande)
      form.tamanoProd = d.tamano_prod ?? "";

      form.grupos = (d.grupos ?? []).map((g: any, gi: number) => ({
        id: Date.now() + gi,
        idgrupo_papel: g.idgrupo_papel,
        precioSugerido: g.precio_sugerido ? String(g.precio_sugerido) : "",
        draft: newMaterial(),
        materiales: (g.materiales ?? []).map((m: any, mi: number) => ({
          id: Date.now() + gi * 100 + mi,
          idcat_tipo_papel: m.idcat_tipo_papel,
          idcat_calibre: m.idcat_calibre,
          tipo: m.tipo_papel ?? "",
          calibre: m.calibre ?? "",
          pliego: m.pliego ?? "",
          rendimiento: m.rendimiento ?? "",
          corte: m.corte ?? "",
          hojeado: {
            bobina: m.hojeado?.bobina ?? "",
            corte: m.hojeado?.corte ?? "",
            rendimiento: m.hojeado?.rendimiento ?? "",
            guillotina: m.hojeado?.guillotina ?? "",
            hilo: m.hojeado?.hilo ?? "",
            bobinaExtra: m.hojeado?.bobina_extra ?? "",
          },
        })),
      }));
      if (form.grupos.length === 0) form.grupos = [newGrupo()];

      if (d.suaje) {
        form.suaje.numero = d.suaje.numero ?? "";
        form.suaje.pzs = d.suaje.pzs ? String(d.suaje.pzs) : "";
        form.suaje.tamano = d.suaje.tamano ?? "";
        form.suaje.corte1Tipo = d.suaje.corte1_tipo ?? "";
        form.suaje.corte1Medida = d.suaje.corte1_medida ?? "";
        form.suaje.idcat_corte = d.suaje.idcat_corte ?? null;
        form.suaje.idcat_punto_corte = d.suaje.idcat_punto_corte ?? null;
        form.suaje.puntosCorte = d.suaje.puntos_corte != null ? String(d.suaje.puntos_corte) : "";
        form.suaje.dobles1Tipo = d.suaje.dobles1_tipo ?? "";
        form.suaje.dobles1Medida = d.suaje.dobles1_medida ?? "";
        form.suaje.idcat_doble = d.suaje.idcat_doble ?? null;
        form.suaje.idcat_punto_doble = d.suaje.idcat_punto_doble ?? null;
        form.suaje.puntosDoble = d.suaje.puntos_doble != null ? String(d.suaje.puntos_doble) : "";
        form.suaje.metros = d.suaje.metros ?? "";
        form.suaje.matrix = d.suaje.matrix_nombre ?? "";
        form.suaje.idcat_matrix = d.suaje.idcat_matrix ?? null;
        form.suaje.tiempoArreglo = d.suaje.tiempo_arreglo ? String(d.suaje.tiempo_arreglo) : "";
        form.suaje.idcat_sacabocados = d.suaje.idcat_sacabocados ?? null;
        form.suaje.sacabocadoNombre = d.suaje.sacabocado_nombre
          ? (d.suaje.sacabocado_medida ? `${d.suaje.sacabocado_nombre} -- ${d.suaje.sacabocado_medida}` : d.suaje.sacabocado_nombre)
          : "";
        form.suaje.cantidad_sacabocado = d.suaje.cantidad_sacabocado ? String(d.suaje.cantidad_sacabocado) : "";
        form.suaje.idcat_perforado = d.suaje.idcat_perforado ?? null;
        form.suaje.perforadoNombre = d.suaje.perforado_nombre
          ? (d.suaje.perforado_medida ? `${d.suaje.perforado_nombre} -- ${d.suaje.perforado_medida}` : d.suaje.perforado_nombre)
          : "";
        form.suaje.cantidad_perforado = d.suaje.cantidad_perforado ? String(d.suaje.cantidad_perforado) : "";
        form.suaje.herramentalDesbarbe = d.suaje.herramental_desbarbe === true;
        form.suaje.noDesbarbe = d.suaje.no_desbarbe != null ? String(d.suaje.no_desbarbe) : "";
      }

      if (d.acabados) {
        form.acabados.idcat_tipo_pegado = d.acabados.idcat_tipo_pegado ?? null;
        form.acabados.idcat_pegamento = d.acabados.idcat_pegamento ?? null;
        form.acabados.laminados = (d.acabados.laminados ?? []).map((l: any) => l.id);
        form.acabados.laminadosNombres = (d.acabados.laminados ?? []).map((l: any) => l.nombre);
        form.acabados.idcat_refuerzo_material = d.acabados.idcat_refuerzo_material ?? null;
        form.acabados.idcat_refuerzo_medidas = d.acabados.idcat_refuerzo_medidas ?? null;
        form.acabados.refuerzoMedidaNombre = d.acabados.refuerzo_medida ?? "";
        form.acabados.idcat_base_material = d.acabados.idcat_base_material ?? null;
        form.acabados.base_medida = d.acabados.base_medida ?? "";
        form.acabados.idcat_empaque = d.acabados.idcat_empaque ?? null;
        form.acabados.pzs_caja = d.acabados.pzs_caja ? String(d.acabados.pzs_caja) : "";
        form.acabados.asas = (d.acabados.asas ?? []).map((a: any) => a.idcat_tipo_asa);
        form.acabados.asasNombres = (d.acabados.asas ?? []).map((a: any) => a.tipo_asa);
      }

      if (d.maquinaria) {
        const maq = d.maquinaria;
        const keys = ["hojeado_guillotina", "impresora", "hs_ar", "suaje_maquina", "uv", "textura", "empalme", "armado", "asas_maquina", "desbarbe"];
        for (const key of keys) {
          form.maquinaria[key] = (maq[key] ?? []).map((i: any) => i.id);
          form.maquinaria[`${key}_nombres`] = (maq[key] ?? []).map((i: any) => i.nombre);
        }
      }

      setEditForm({
        ...form,
        idproducto_papel: p.idproducto_papel,
        archivosIniciales: (d.archivos ?? []).map((a: any) => ({ ...a, pendiente: false })),
      } as ProductoPapelFormConId);
    } catch {
      setEditForm(newProductoForm() as ProductoPapelFormConId);
    }
  };

  const handleSave = async (form: ProductoPapelForm, pendientes: ArchivoPendiente[]) => {
    let ok: number | boolean | null;
    if (vista === "editar" && editId) {
      ok = await actualizar(editId, form);
    } else {
      const idNuevo = await crear(form);
      if (idNuevo && pendientes.length > 0) {
        await Promise.allSettled(pendientes.map(p => subirArchivoPendiente(p, idNuevo)));
      }
      ok = idNuevo;
    }
    if (ok) { setVista("tabla"); setEditForm(undefined); setEditId(undefined); }
  };

  return (
    <Dashboard>
      {vista === "tabla" ? (
        <TablaCatalogo
          productos={productos}
          loading={loading}
          onNuevo={() => { setEditForm(undefined); setEditId(undefined); setVista("nuevo"); }}
          onEditar={handleEditar}
          onEliminar={eliminar}
        />
      ) : vista === "editar" && editId && editForm === undefined ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", fontSize: 14, color: "#9CA3AF" }}>
          Cargando producto...
        </div>
      ) : (
        <FormularioProductoPapelAlta
          initial={editForm}
          onSave={handleSave}
          onCancel={() => { setVista("tabla"); setEditForm(undefined); setEditId(undefined); }}
          saving={saving}
        />
      )}
    </Dashboard>
  );
}