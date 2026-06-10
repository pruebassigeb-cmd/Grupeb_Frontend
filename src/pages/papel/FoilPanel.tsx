import { useState, useEffect } from "react";
import type { Foil, FoilForm } from "../../types/papel/foil.types";
import { newFoilForm } from "../../types/papel/foil.types";
import {
  fetchFoils, crearFoil, actualizarFoil, eliminarFoil,
} from "../../services/papel/foil.service";

// ── Primitivos ────────────────────────────────────────────────────────────
function Inp({ label, value, onChange, placeholder, type = "text" }: {
  label?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>}
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", height: 36, padding: "0 10px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

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

// ── Presentaciones manager ────────────────────────────────────────────────
function PresentacionesInput({ value, onChange }: {
  value: string[]; onChange: (v: string[]) => void;
}) {
  const [nueva, setNueva] = useState("");

  const agregar = () => {
    const t = nueva.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setNueva("");
  };

  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Presentaciones</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          type="text" value={nueva}
          onChange={e => setNueva(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }}
          placeholder="ej: Rollo 500m, Hoja A4…"
          style={{ flex: 1, height: 34, padding: "0 10px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 13, outline: "none" }}
        />
        <button type="button" onClick={agregar}
          style={{ height: 34, padding: "0 12px", background: "#1D4ED8", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          +
        </button>
      </div>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {value.map((p, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#1D4ED8", fontWeight: 500 }}>
              {p}
              <button onClick={() => onChange(value.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#93C5FD", fontSize: 14, lineHeight: 1, padding: 0, display: "flex", alignItems: "center" }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Formulario ────────────────────────────────────────────────────────────
function FoilFormPanel({ initial, proveedores, onSave, onCancel, saving }: {
  initial?: Foil;
  proveedores: { idproveedor: number; nombre: string }[];
  onSave: (form: FoilForm) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FoilForm>(
    initial ? {
      colorfoil:            initial.colorfoil,
      codigofoil:           initial.codigofoil ?? "",
      precio:               initial.precio != null ? String(initial.precio) : "",
      notas:                initial.notas ?? "",
      minimo_compra:        initial.minimo_compra != null ? String(initial.minimo_compra) : "",
      unidad:               initial.unidad ?? "",
      proveedor_idproveedor: initial.idproveedor ?? null,
      presentaciones:       initial.presentaciones.map(p => p.presentacion),
    } : newFoilForm()
  );

  const upd = (patch: Partial<FoilForm>) => setForm(prev => ({ ...prev, ...patch }));

  // Preview de clave
  const prov = proveedores.find(p => p.idproveedor === form.proveedor_idproveedor);
  const clavePreview = prov && form.colorfoil
    ? `${prov.nombre.substring(0, 2).toUpperCase()}${form.colorfoil.substring(0, 3).toUpperCase()}${form.codigofoil}`
    : "";

  return (
    <div style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 16px" }}>
        {initial ? "Editar foil" : "Agregar foil"}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px", marginBottom: 12 }}>
        {/* Proveedor */}
        <div style={{ gridColumn: "span 3" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Proveedor</label>
          <select
            value={form.proveedor_idproveedor ?? ""}
            onChange={e => upd({ proveedor_idproveedor: Number(e.target.value) || null })}
            style={{ width: "100%", height: 36, padding: "0 10px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 13, color: "#111827", background: "#fff", outline: "none" }}
          >
            <option value="">Seleccionar proveedor…</option>
            {proveedores.map(p => (
              <option key={p.idproveedor} value={p.idproveedor}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <Inp label="Color" value={form.colorfoil} onChange={v => upd({ colorfoil: v })} placeholder="ej: Dorado" />
        <Inp label="Código" value={form.codigofoil} onChange={v => upd({ codigofoil: v })} placeholder="ej: FOI-001" />

        {/* Clave preview */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Clave (auto)</label>
          <div style={{ height: 36, padding: "0 10px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, color: "#6B7280", background: "#F3F4F6", display: "flex", alignItems: "center", fontFamily: "monospace" }}>
            {clavePreview || "—"}
          </div>
        </div>

        <Inp label="Precio" value={form.precio} onChange={v => upd({ precio: v })} placeholder="0.00" type="number" />
        <Inp label="Mínimo compra" value={form.minimo_compra} onChange={v => upd({ minimo_compra: v })} placeholder="ej: 100" />
        <Inp label="Unidad" value={form.unidad} onChange={v => upd({ unidad: v })} placeholder="ej: metros" />

        <div style={{ gridColumn: "span 3" }}>
          <Inp label="Notas" value={form.notas} onChange={v => upd({ notas: v })} placeholder="Observaciones opcionales…" />
        </div>

        <div style={{ gridColumn: "span 3" }}>
          <PresentacionesInput value={form.presentaciones} onChange={v => upd({ presentaciones: v })} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => onSave(form)} disabled={saving}>
          {saving ? "Guardando…" : initial ? "✓ Guardar cambios" : "+ Agregar"}
        </Btn>
      </div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────
export default function FoilPanel() {
  const [foils, setFoils]           = useState<Foil[]>([]);
  const [proveedores, setProveedores] = useState<{ idproveedor: number; nombre: string }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState("");
  const [vista, setVista]           = useState<"tabla" | "nuevo" | "editar">("tabla");
  const [editTarget, setEditTarget] = useState<Foil | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Foil | null>(null);
  const BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [foilsData, provData] = await Promise.all([
        fetchFoils(),
        fetch(`${BASE}/proveedores`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
        }).then(r => r.json()),
      ]);
      setFoils(foilsData);
      setProveedores(provData.map((p: any) => ({ idproveedor: p.idproveedor, nombre: p.nombre })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (form: FoilForm) => {
    if (!form.proveedor_idproveedor) { alert("Selecciona un proveedor"); return; }
    if (!form.colorfoil.trim()) { alert("El color es requerido"); return; }
    setSaving(true);
    try {
      if (vista === "editar" && editTarget) {
        await actualizarFoil(editTarget.idproveedor!, editTarget.idfoil, form);
      } else {
        await crearFoil(form.proveedor_idproveedor, form);
      }
      await cargarDatos();
      setVista("tabla");
      setEditTarget(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!deleteTarget) return;
    try {
      await eliminarFoil(deleteTarget.idproveedor!, deleteTarget.idfoil);
      await cargarDatos();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = foils.filter(f =>
    f.colorfoil.toLowerCase().includes(search.toLowerCase()) ||
    (f.codigofoil ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (f.clavefoil ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (f.proveedor_nombre ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Cargando foils…</div>
  );

  return (
    <div>
      {/* Modal eliminar */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 360, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <p style={{ fontSize: 15, color: "#111827", margin: "0 0 6px", fontWeight: 600 }}>¿Eliminar foil?</p>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 20px" }}>{deleteTarget.clavefoil} — {deleteTarget.colorfoil}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={handleEliminar}>Eliminar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Formulario nuevo/editar */}
      {(vista === "nuevo" || vista === "editar") && (
        <FoilFormPanel
          initial={editTarget ?? undefined}
          proveedores={proveedores}
          onSave={handleSave}
          onCancel={() => { setVista("tabla"); setEditTarget(null); }}
          saving={saving}
        />
      )}

      {/* Header */}
      {vista === "tabla" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 140px 1fr auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["Color / Clave", "Código", "Proveedor", "Presentaciones", ""].map((h, i) => (
            <div key={i} style={{ padding: "10px 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            {search ? "Sin resultados." : "No hay foils registrados."}
          </div>
        ) : filtered.map((f, idx) => (
          <div key={f.idfoil} style={{ display: "grid", gridTemplateColumns: "1fr 100px 140px 1fr auto", padding: "0 16px", alignItems: "center", minHeight: 52, background: idx % 2 === 0 ? "#fff" : "#FAFAFA", borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none" }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{f.colorfoil}</p>
              {f.clavefoil && <p style={{ margin: 0, fontSize: 11, color: "#6B7280", fontFamily: "monospace" }}>{f.clavefoil}</p>}
            </div>
            <span style={{ fontSize: 12, color: "#374151" }}>{f.codigofoil ?? "—"}</span>
            <span style={{ fontSize: 12, color: "#374151" }}>{f.proveedor_nombre ?? "—"}</span>
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
              <Btn variant="danger" small onClick={() => setDeleteTarget(f)}>× Eliminar</Btn>
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