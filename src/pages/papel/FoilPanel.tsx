import { useState, useEffect } from "react";
import type { Foil, FoilForm } from "../../types/papel/foil.types";
import { newFoilForm } from "../../types/papel/foil.types";
import {
  fetchFoils, crearFoil, actualizarFoil, eliminarFoil,
} from "../../services/papel/foil.service";
import FormularioProveedor from "../../components/FormularioProveedor";
import { showAlert } from "../../components/CustomAlert";
import { getProductosSat, type ProductoSat } from "../../services/proveedoresService";

// ── Primitivos de la TABLA (se mantienen igual — solo el form se rediseñó) ──
function Btn({ children, onClick, variant = "primary", small, disabled }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  small?: boolean; disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: "#1D4ED8", color: "#fff",    border: "none" },
    secondary: { background: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB" },
    danger:    { background: "#FEE2E2", color: "#DC2626", border: "none" },
    ghost:     { background: "none",   color: "#6B7280",  border: "1px solid #E5E7EB" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      height: small ? 30 : 36, padding: small ? "0 12px" : "0 16px",
      borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
      fontSize: small ? 12 : 13, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 5,
      opacity: disabled ? 0.6 : 1, ...styles[variant],
    }}>
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO — ahora es un MODAL, mismo diseño que ModalRegistrarInsumo.tsx:
// overlay centrado, header con ícono + título + subtítulo + cerrar, body con
// grid Tailwind, footer con Cancelar / Agregar. Mismos campos de siempre
// (Proveedores, Color, Código, Clave auto, Precio, Mínimo, Unidad, Notas,
// Presentaciones) — solo cambia el empaque visual.
// ═══════════════════════════════════════════════════════════════════════════
function FoilFormModal({ initial, proveedores, productosSat, onSave, onCancel, saving }: {
  initial?: Foil;
  proveedores: { idproveedor: number; nombre: string }[];
  productosSat: ProductoSat[];
  onSave: (form: FoilForm) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FoilForm>(
    initial ? {
      colorfoil:        initial.colorfoil,
      codigofoil:       initial.codigofoil ?? "",
      precio:           initial.proveedores[0]?.precio != null ? String(initial.proveedores[0].precio) : "",
      notas:            initial.proveedores[0]?.notas ?? "",
      minimo_compra:    initial.proveedores[0]?.minimo_compra != null ? String(initial.proveedores[0].minimo_compra) : "",
      unidad:           initial.proveedores[0]?.unidad ?? "",
      producto_sat_idproducto_sat: initial.producto_sat_idproducto_sat ?? null,
      proveedores_ids:  initial.proveedores.map(p => p.idproveedor),
      presentaciones:   initial.presentaciones.map(p => p.presentacion),
    } : newFoilForm()
  );
  const [nuevaPresentacion, setNuevaPresentacion] = useState("");

  const upd = (patch: Partial<FoilForm>) => setForm(prev => ({ ...prev, ...patch }));

  const toggleProveedor = (idproveedor: number) => {
    setForm(prev => ({
      ...prev,
      proveedores_ids: prev.proveedores_ids.includes(idproveedor)
        ? prev.proveedores_ids.filter(id => id !== idproveedor)
        : [...prev.proveedores_ids, idproveedor],
    }));
  };

  const handlePrecioChange = (v: string) => {
    if (!/^\d*\.?\d{0,4}$/.test(v)) return;
    upd({ precio: v });
  };
  const handleMinimoChange = (v: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(v)) return;
    upd({ minimo_compra: v });
  };

  const agregarPresentacion = () => {
    const t = nuevaPresentacion.trim();
    if (!t || form.presentaciones.includes(t)) return;
    upd({ presentaciones: [...form.presentaciones, t] });
    setNuevaPresentacion("");
  };
  const quitarPresentacion = (p: string) => upd({ presentaciones: form.presentaciones.filter(x => x !== p) });

  const prov = proveedores.find(p => p.idproveedor === form.proveedores_ids[0]);
  const clavePreview = prov && form.colorfoil
    ? `${prov.nombre.substring(0, 2).toUpperCase()}${form.colorfoil.substring(0, 3).toUpperCase()}${form.codigofoil}`
    : "";

  const handleGuardar = () => onSave(form);

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 my-8">

        {/* Header — mismo patrón que ModalRegistrarInsumo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-6.714 2.143L12 21l-2.286-6.857L3 12l6.714-2.143L12 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{initial ? "Editar foil" : "Nuevo foil"}</h3>
              <p className="text-xs text-gray-400">Se guardará en el catálogo de foils</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Proveedores */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Proveedores <span className="text-xs text-gray-400 font-normal">(puedes marcar varios)</span>
            </label>
            <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
              {proveedores.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-3">No hay proveedores registrados.</p>
              ) : proveedores.map(p => (
                <label key={p.idproveedor}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer select-none">
                  <input type="checkbox" checked={form.proveedores_ids.includes(p.idproveedor)}
                    onChange={() => toggleProveedor(p.idproveedor)}
                    className="w-4 h-4 rounded border-gray-400 text-purple-600 focus:ring-purple-400" />
                  {p.nombre}
                </label>
              ))}
            </div>
            {form.proveedores_ids.length > 0 && (
              <p className="text-xs text-purple-600 mt-1 font-medium">
                ✓ {form.proveedores_ids.length} proveedor{form.proveedores_ids.length > 1 ? "es" : ""} seleccionado{form.proveedores_ids.length > 1 ? "s" : ""}
              </p>
            )}
            {form.proveedores_ids.length > 1 && (
              <p className="text-xs text-gray-400 mt-1">
                Precio, código, mínimo de compra y unidad se guardarán igual para los {form.proveedores_ids.length} proveedores marcados.
              </p>
            )}
          </div>

          {/* Color + Código */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Color <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.colorfoil} onChange={e => upd({ colorfoil: e.target.value })}
                placeholder="Ej: Dorado" className={inputClass} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Código <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" value={form.codigofoil} onChange={e => upd({ codigofoil: e.target.value })}
                placeholder="Ej: FOI-001" className={inputClass} />
            </div>
          </div>

          {/* Clave (auto) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Clave (auto)</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-100 font-mono">
              {clavePreview || "—"}
            </div>
          </div>

          {/* Precio + Notas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Precio <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="text" inputMode="decimal" value={form.precio} onChange={e => handlePrecioChange(e.target.value)}
                  placeholder="0.00" className={`${inputClass} pl-7`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Notas <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" value={form.notas} onChange={e => upd({ notas: e.target.value })}
                placeholder="Observaciones..." className={inputClass} />
            </div>
          </div>

          {/* Mínimo de compra + Unidad + Clave producto SAT */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Mínimo de compra <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" inputMode="decimal" value={form.minimo_compra} onChange={e => handleMinimoChange(e.target.value)}
                placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Unidad <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <select value={form.unidad ?? ""} onChange={e => upd({ unidad: e.target.value })}
                className={`${inputClass} cursor-pointer`}>
                <option value="">Sin especificar</option>
                <option value="kilos">Kilos</option>
                <option value="pzas">Piezas</option>
                <option value="litros">Litros</option>
                <option value="metros">Metros</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Clave producto SAT <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                value={form.producto_sat_idproducto_sat ?? ""}
                onChange={e => upd({ producto_sat_idproducto_sat: e.target.value ? Number(e.target.value) : null })}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">Sin especificar</option>
                {productosSat.map(s => (
                  <option key={s.idproducto_sat} value={s.idproducto_sat}>
                    {s.clave} — {s.pdft}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Presentaciones */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Presentaciones</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={nuevaPresentacion} onChange={e => setNuevaPresentacion(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); agregarPresentacion(); } }}
                placeholder="ej: Rollo 500m, Hoja A4..." className={inputClass} />
              <button type="button" onClick={agregarPresentacion}
                className="h-[38px] px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold flex-shrink-0">
                +
              </button>
            </div>
            {form.presentaciones.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.presentaciones.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full px-3 py-1 text-xs text-purple-700 font-medium">
                    {p}
                    <button onClick={() => quitarPresentacion(p)} className="text-purple-300 hover:text-purple-600 text-sm leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors">
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
            ) : initial ? "Guardar cambios" : "Agregar foil"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL PRINCIPAL — tabla/listado se mantiene igual, solo cambia cómo se
// invoca el formulario (ahora modal en vez de tarjeta inline).
// ═══════════════════════════════════════════════════════════════════════════
interface Props {
  onCambio?: (count: number) => void;
}

export default function FoilPanel({ onCambio }: Props) {
  const [foils, setFoils]           = useState<Foil[]>([]);
  const [proveedores, setProveedores] = useState<{ idproveedor: number; nombre: string }[]>([]);
  const [productosSat, setProductosSat] = useState<ProductoSat[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState("");
  const [vista, setVista]           = useState<"tabla" | "nuevo" | "editar">("tabla");
  const [editTarget, setEditTarget] = useState<Foil | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ foil: Foil; idproveedor: number } | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false);
  const BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setErrorCarga(null);
    try {
      const [foilsData, provData, satData] = await Promise.all([
        fetchFoils(),
        fetch(`${BASE}/proveedores`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
        }).then(r => r.json()),
        getProductosSat().catch(() => []),
      ]);
      setFoils(foilsData);
      setProveedores(provData.map((p: any) => ({ idproveedor: p.idproveedor, nombre: p.nombre })));
      setProductosSat(satData);
      onCambio?.(foilsData.length);
    } catch (e: any) {
      console.error(e);
      setErrorCarga("No se pudieron cargar los foils. Revisa la consola para más detalle.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (form: FoilForm) => {
    if (form.proveedores_ids.length === 0) { showAlert("Selecciona al menos un proveedor", "warning"); return; }
    if (!form.colorfoil.trim()) { showAlert("El color es requerido", "warning"); return; }
    setSaving(true);
    try {
      if (vista === "editar" && editTarget) {
        const idProveedorRuta = editTarget.proveedores[0]?.idproveedor ?? form.proveedores_ids[0];
        await actualizarFoil(idProveedorRuta, editTarget.idfoil, form);
      } else {
        await crearFoil(form);
      }
      await cargarDatos();
      setVista("tabla");
      setEditTarget(null);
    } catch (e: any) {
      showAlert(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!deleteTarget) return;
    try {
      await eliminarFoil(deleteTarget.idproveedor, deleteTarget.foil.idfoil);
      await cargarDatos();
    } catch (e: any) {
      showAlert(e.message, "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleProveedorCreado = (nuevo: { idproveedor: number; nombre: string }) => {
    setProveedores((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setMostrarNuevoProveedor(false);
    showAlert(`Proveedor "${nuevo.nombre}" registrado`, "success");
  };

  const filtered = foils.filter(f =>
    f.colorfoil.toLowerCase().includes(search.toLowerCase()) ||
    (f.codigofoil ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (f.clavefoil ?? "").toLowerCase().includes(search.toLowerCase()) ||
    f.proveedores.some(p => p.proveedor_nombre.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return (
    <div style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Cargando foils…</div>
  );

  return (
    <div>
      {errorCarga && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#DC2626" }}>
          ⚠️ {errorCarga}
        </div>
      )}

      {/* Modal de registro de proveedor */}
      {mostrarNuevoProveedor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 11000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto" }}>
          <FormularioProveedor
            proveedor={null}
            onGuardado={handleProveedorCreado}
            onCancel={() => setMostrarNuevoProveedor(false)}
          />
        </div>
      )}

      {/* Modal eliminar */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <p style={{ fontSize: 15, color: "#111827", margin: "0 0 6px", fontWeight: 600 }}>¿Desvincular este proveedor del foil?</p>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 20px" }}>
              {deleteTarget.foil.clavefoil} — {deleteTarget.foil.colorfoil}
              {deleteTarget.foil.proveedores.length > 1 && (
                <> · El foil seguirá disponible para los otros {deleteTarget.foil.proveedores.length - 1} proveedor(es).</>
              )}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={handleEliminar}>Desvincular</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Formulario nuevo/editar — ahora modal */}
      {(vista === "nuevo" || vista === "editar") && (
        <FoilFormModal
          initial={editTarget ?? undefined}
          proveedores={proveedores}
          productosSat={productosSat}
          onSave={handleSave}
          onCancel={() => { setVista("tabla"); setEditTarget(null); }}
          saving={saving}
        />
      )}

      {/* Header */}
      {vista === "tabla" && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
          <Btn variant="secondary" onClick={() => setMostrarNuevoProveedor(true)}>+ Nuevo proveedor</Btn>
          <Btn variant="primary" onClick={() => { setEditTarget(null); setVista("nuevo"); }}>+ Agregar foil</Btn>
        </div>
      )}

      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}>🔍</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por color, código, clave o proveedor…"
          style={{ width: "100%", height: 36, paddingLeft: 32, paddingRight: 12, border: "1px solid #D1D5DB", borderRadius: 7, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* Tabla */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1.3fr 1fr auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["Color / Clave", "Código", "Proveedores", "Presentaciones", ""].map((h, i) => (
            <div key={i} style={{ padding: "10px 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            {search ? "Sin resultados." : "No hay foils registrados."}
          </div>
        ) : filtered.map((f, idx) => (
          <div key={f.idfoil} style={{ display: "grid", gridTemplateColumns: "1fr 100px 1.3fr 1fr auto", padding: "0 16px", alignItems: "center", minHeight: 52, background: idx % 2 === 0 ? "#fff" : "#FAFAFA", borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none" }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{f.colorfoil}</p>
              {f.clavefoil && <p style={{ margin: 0, fontSize: 11, color: "#6B7280", fontFamily: "monospace" }}>{f.clavefoil}</p>}
            </div>
            <span style={{ fontSize: 12, color: "#374151" }}>{f.codigofoil ?? "—"}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {f.proveedores.length === 0
                ? <span style={{ fontSize: 11, color: "#9CA3AF" }}>Sin proveedor</span>
                : f.proveedores.map(p => (
                  <span key={p.idfoil_proveedor} style={{ fontSize: 11, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "2px 8px", color: "#1D4ED8", fontWeight: 500 }}>
                    {p.proveedor_nombre}
                  </span>
                ))
              }
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {f.presentaciones.length === 0
                ? <span style={{ fontSize: 11, color: "#9CA3AF" }}>—</span>
                : f.presentaciones.map((p, i) => (
                  <span key={i} style={{ fontSize: 11, background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 10, padding: "2px 8px", color: "#475569" }}>{p.presentacion}</span>
                ))
              }
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <Btn variant="secondary" small onClick={() => { setEditTarget(f); setVista("editar"); }}>✎ Editar</Btn>
              {f.proveedores.length > 0 && (
                <Btn variant="danger" small onClick={() => setDeleteTarget({ foil: f, idproveedor: f.proveedores[0].idproveedor })}>× Quitar</Btn>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, textAlign: "right", fontSize: 12, color: "#9CA3AF" }}>
        {filtered.length} de {foils.length} foil{foils.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}