import { useState, useEffect, useRef } from "react";
import type React from "react";
import { useAuth } from "../../context/AuthContext";
import Dashboard from "../../layouts/Sidebar";
import {
  newProductoForm,
  newGrupo,
  newMaterial,
} from "../../types/papel/papel.types";
import type {
  ProductoPapelForm,
  ProductoPapelListItem,
  GrupoPapel,
  CatKey,
} from "../../types/papel/papel.types";
import { useCatalogosPapel } from "../../hooks/papel/useCatalogosPapel";
import { fetchProductoPapelById } from "../../services/papel/papel.service";
import { useProductosPapel } from "../../hooks/papel/useProductosPapel";
import SelConAlta from "../../components/papel/SelConAlta";
import GrupoBlock from "../../components/papel/GrupoBlock";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const calcBase = (ancho: string, fuelle: string) => {
  const a = parseFloat(ancho), f = parseFloat(fuelle);
  return (!isNaN(a) && !isNaN(f)) ? `${(a - 0.5).toFixed(1)}x${(f - 0.5).toFixed(1)} cm` : "";
};

const ICON_PDF = "\uD83D\uDCC4";
const ICON_IMG = "\uD83D\uDDBC\uFE0F";
const ICON_CHART = "\uD83D\uDCCA";

const CATEGORIA_A_SUBCARPETA: Record<string, string> = {
  "catalogo-suaje-papel": "catalogo",
  "imagen-suaje-papel": "imagen",
  "rendimiento-suaje-papel": "rendimiento",
};

// ═══════════════════════════════════════════════════════════════════════════
// PALETA DE SECCIONES — sutil, no arcoíris
// Tipo producto  → azul pizarra
// Tipo de papel  → índigo suave
// Suaje          → verde azulado (teal)
// Pegado/Acabados→ ámbar apagado
// Refuerzo/Base  → mismo ámbar
// Empaque        → mismo ámbar
// Maquinaria     → gris azulado
// Archivos       → gris neutro
// ═══════════════════════════════════════════════════════════════════════════
const SEC_COLORS: Record<string, { border: string; headerBg: string; headerText: string; leftBar: string }> = {
  tipo: { border: "#CBD5E1", headerBg: "#F1F5F9", headerText: "#334155", leftBar: "#64748B" },
  papel: { border: "#CBD5E1", headerBg: "#F1F5F9", headerText: "#334155", leftBar: "#64748B" },
  suaje: { border: "#CBD5E1", headerBg: "#F1F5F9", headerText: "#334155", leftBar: "#64748B" },
  acabados: { border: "#CBD5E1", headerBg: "#F1F5F9", headerText: "#334155", leftBar: "#64748B" },
  maquinaria: { border: "#E2E8F0", headerBg: "#F8FAFC", headerText: "#475569", leftBar: "#94A3B8" },
  archivos: { border: "#E5E7EB", headerBg: "#F9FAFB", headerText: "#6B7280", leftBar: "#9CA3AF" },
};

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVOS UI
// ═══════════════════════════════════════════════════════════════════════════
function Inp({ value, onChange, style, readOnly }: {
  value: string; onChange?: (v: string) => void;
  style?: React.CSSProperties; readOnly?: boolean;
}) {
  return (
    <input type="text" value={value} readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: readOnly ? "#6B7280" : "#111827", background: readOnly ? "#F3F4F6" : "#fff", outline: "none", boxSizing: "border-box", ...style }} />
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function FG({ children, cols = 2, gap = "8px 10px", style }: { children: React.ReactNode; cols?: number; gap?: string; style?: React.CSSProperties }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, ...style }}>{children}</div>;
}

function Sec({ title, children, action, colorKey = "archivos" }: {
  title: string; children: React.ReactNode; action?: React.ReactNode; colorKey?: keyof typeof SEC_COLORS;
}) {
  const c = SEC_COLORS[colorKey];
  return (
    <div style={{ border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.leftBar}`, borderRadius: 8, overflow: "visible", marginBottom: 10, background: "#fff" }}>
      <div style={{ padding: "7px 14px", background: c.headerBg, borderBottom: `1px solid ${c.border}`, borderTopLeftRadius: 6, borderTopRightRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.headerText }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HYBRID INPUT CON ALTA
// ═══════════════════════════════════════════════════════════════════════════
function HybridInputConAlta({ catKey, options, value, onChange, onAdd }: {
  catKey: CatKey; options: string[]; value: string; onChange: (v: string) => void;
  onAdd: (key: CatKey, nombre: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAdding(false); setNewVal(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);

  const handleAdd = async () => {
    const t = newVal.trim();
    if (!t) return;
    const nombre = catKey === "refuerzo_medidas"
      ? (t.endsWith(" cm") ? t : `${t} cm`)
      : t;
    setSaving(true);
    try {
      await onAdd(catKey, nombre);
      onChange(nombre);
      setNewVal(""); setAdding(false); setOpen(false);
    } finally { setSaving(false); }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex", height: 34, border: "1px solid #D1D5DB", borderRadius: 5, overflow: "hidden", background: "#fff" }}>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, padding: "0 8px", border: "none", fontSize: 13, color: "#111827", outline: "none", minWidth: 0, background: "transparent" }} />
        <button type="button" onClick={() => { setOpen(!open); setAdding(false); }}
          style={{ width: 28, flexShrink: 0, border: "none", borderLeft: "1px solid #E5E7EB", background: "#F9FAFB", cursor: "pointer", color: "#6B7280", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{">"}</button>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "4px 0", maxHeight: 220, overflowY: "auto" }}>
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              style={{ width: "100%", padding: "5px 12px", border: "none", background: value === o ? "#EFF6FF" : "transparent", color: value === o ? "#1D4ED8" : "#111827", fontSize: 13, cursor: "pointer", textAlign: "left", fontWeight: value === o ? 600 : 400 }}>{o}</button>
          ))}
          <div style={{ borderTop: "1px solid #F3F4F6", marginTop: 2, paddingTop: 2 }}>
            {adding ? (
              <div style={{ display: "flex", gap: 4, padding: "5px 8px", alignItems: "center" }}>
                <div style={{ flex: 1, display: "flex", height: 28, border: "1px solid #1D4ED8", borderRadius: 4, overflow: "hidden" }}>
                  <input ref={addRef} type="text" inputMode="decimal" value={newVal}
                    onChange={e => setNewVal(e.target.value.replace(/[^0-9.xX]/g, "").toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewVal(""); } }}
                    style={{ flex: 1, padding: "0 6px", border: "none", fontSize: 12, color: "#111827", outline: "none", background: "#fff" }} />
                  <span style={{ padding: "0 8px", borderLeft: "1px solid #BFDBFE", background: "#EFF6FF", fontSize: 12, fontWeight: 700, color: "#1D4ED8", display: "flex", alignItems: "center" }}>cm</span>
                </div>
                <button onClick={handleAdd} disabled={saving} style={{ height: 28, padding: "0 8px", background: "#1D4ED8", border: "none", borderRadius: 4, cursor: saving ? "wait" : "pointer", color: "#fff", fontSize: 12, fontWeight: 700 }}>{saving ? "..." : "OK"}</button>
                <button onClick={() => { setAdding(false); setNewVal(""); }} style={{ height: 28, padding: "0 6px", background: "#F3F4F6", border: "none", borderRadius: 4, cursor: "pointer", color: "#6B7280", fontSize: 13 }}>X</button>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)}
                style={{ width: "100%", padding: "6px 12px", border: "none", background: "transparent", color: "#1D4ED8", fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: 600 }}>
                + Agregar nuevo...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ASA MULTI-SELECT CON ALTA
// ═══════════════════════════════════════════════════════════════════════════
function AsaMultiSelect({ selectedIds, selectedNames, catItems, onChange, onAdd, catKeyForAdd = "tipo_asa" }: {
  selectedIds: number[];
  selectedNames: string[];
  catItems: { id: number; nombre: string }[];
  onChange: (ids: number[], nombres: string[]) => void;
  onAdd: (key: CatKey, nombre: string) => Promise<void>;
  catKeyForAdd?: CatKey;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAdding(false); setNewVal(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);

  const toggle = (item: { id: number; nombre: string }) => {
    const exists = selectedIds.includes(item.id);
    onChange(
      exists ? selectedIds.filter(i => i !== item.id) : [...selectedIds, item.id],
      exists ? selectedNames.filter(n => n !== item.nombre) : [...selectedNames, item.nombre],
    );
  };

  const handleAdd = async () => {
    const t = newVal.trim(); if (!t) return;
    setSaving(true);
    try { await onAdd(catKeyForAdd, t); setNewVal(""); setAdding(false); }
    finally { setSaving(false); }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => { setOpen(!open); setAdding(false); }}
        style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: selectedIds.length ? "#111827" : "#9CA3AF", background: "#fff", outline: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedIds.length === 0 ? "" : selectedNames.join(", ")}</span>
        <span style={{ fontSize: 11, color: "#6B7280", flexShrink: 0, marginLeft: 4, userSelect: "none" }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "4px 0", maxHeight: 220, overflowY: "auto" }}>
          {catItems.map(item => (
            <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#111827", background: selectedIds.includes(item.id) ? "#EFF6FF" : "transparent" }}>
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item)} style={{ width: 14, height: 14, accentColor: "#1D4ED8", cursor: "pointer", flexShrink: 0 }} />
              {item.nombre}
            </label>
          ))}
          <div style={{ borderTop: "1px solid #F3F4F6", marginTop: 2, paddingTop: 2 }}>
            {adding ? (
              <div style={{ display: "flex", gap: 4, padding: "5px 8px", alignItems: "center" }}>
                <input ref={addRef} type="text" value={newVal} onChange={(e) => setNewVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewVal(""); } }}
                  style={{ flex: 1, height: 28, padding: "0 8px", border: "1px solid #1D4ED8", borderRadius: 4, fontSize: 12, outline: "none", color: "#111827" }} />
                <button onClick={handleAdd} disabled={saving} style={{ height: 28, padding: "0 8px", background: "#1D4ED8", border: "none", borderRadius: 4, cursor: saving ? "wait" : "pointer", color: "#fff", fontSize: 12, fontWeight: 700 }}>{saving ? "..." : "OK"}</button>
                <button onClick={() => { setAdding(false); setNewVal(""); }} style={{ height: 28, padding: "0 6px", background: "#F3F4F6", border: "none", borderRadius: 4, cursor: "pointer", color: "#6B7280", fontSize: 13 }}>X</button>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)}
                style={{ width: "100%", padding: "6px 12px", border: "none", background: "transparent", color: "#1D4ED8", fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: 600 }}>
                + Agregar nuevo...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAQUINARIA MULTI-SELECT CON ALTA — igual que AsaMultiSelect
// ═══════════════════════════════════════════════════════════════════════════
function MaquinariaMultiSelect({ catKey, selectedIds, selectedNames, catItems, onChange, onAdd }: {
  catKey: CatKey;
  selectedIds: number[];
  selectedNames: string[];
  catItems: { id: number; nombre: string }[];
  onChange: (ids: number[], nombres: string[]) => void;
  onAdd: (key: CatKey, nombre: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAdding(false); setNewVal(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);

  const toggle = (item: { id: number; nombre: string }) => {
    const exists = selectedIds.includes(item.id);
    onChange(
      exists ? selectedIds.filter(i => i !== item.id) : [...selectedIds, item.id],
      exists ? selectedNames.filter(n => n !== item.nombre) : [...selectedNames, item.nombre],
    );
  };

  const handleAdd = async () => {
    const t = newVal.trim(); if (!t) return;
    setSaving(true);
    try { await onAdd(catKey, t); setNewVal(""); setAdding(false); }
    finally { setSaving(false); }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => { setOpen(!open); setAdding(false); }}
        style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: selectedIds.length ? "#111827" : "#9CA3AF", background: "#fff", outline: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedIds.length === 0 ? "" : selectedNames.join(", ")}</span>
        <span style={{ fontSize: 11, color: "#6B7280", flexShrink: 0, marginLeft: 4, userSelect: "none" }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "4px 0", maxHeight: 220, overflowY: "auto" }}>
          {catItems.map(item => (
            <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#111827", background: selectedIds.includes(item.id) ? "#F1F5F9" : "transparent" }}>
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item)} style={{ width: 14, height: 14, accentColor: "#64748B", cursor: "pointer", flexShrink: 0 }} />
              {item.nombre}
            </label>
          ))}
          <div style={{ borderTop: "1px solid #F3F4F6", marginTop: 2, paddingTop: 2 }}>
            {adding ? (
              <div style={{ display: "flex", gap: 4, padding: "5px 8px", alignItems: "center" }}>
                <input ref={addRef} type="text" value={newVal} onChange={(e) => setNewVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewVal(""); } }}
                  style={{ flex: 1, height: 28, padding: "0 8px", border: "1px solid #64748B", borderRadius: 4, fontSize: 12, outline: "none", color: "#111827" }} />
                <button onClick={handleAdd} disabled={saving} style={{ height: 28, padding: "0 8px", background: "#64748B", border: "none", borderRadius: 4, cursor: saving ? "wait" : "pointer", color: "#fff", fontSize: 12, fontWeight: 700 }}>{saving ? "..." : "OK"}</button>
                <button onClick={() => { setAdding(false); setNewVal(""); }} style={{ height: 28, padding: "0 6px", background: "#F3F4F6", border: "none", borderRadius: 4, cursor: "pointer", color: "#6B7280", fontSize: 13 }}>X</button>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)}
                style={{ width: "100%", padding: "6px 12px", border: "none", background: "transparent", color: "#64748B", fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: 600 }}>
                + Agregar nuevo...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


interface ArchivoGuardado {
  id_archivo: number;
  nombre: string;
  url: string;
  categoria: string;
  tipo: string;
  pendiente: false;
}

interface ArchivoPendiente {
  uid: string;
  file: File;
  categoria: string;
  previewUrl: string;
  nombre: string;
  tipo: "pdf" | "image" | "document";
  pendiente: true;
}

type ArchivoItem = ArchivoGuardado | ArchivoPendiente;

const getTipoDeFile = (file: File): "pdf" | "image" | "document" => {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return "document";
};

const ICONOS_CATEGORIA: Record<string, string> = {
  "catalogo-suaje-papel": ICON_PDF,
  "imagen-suaje-papel": ICON_IMG,
  "rendimiento-suaje-papel": ICON_CHART,
};

// ═══════════════════════════════════════════════════════════════════════════
// SEC ARCHIVOS
// ═══════════════════════════════════════════════════════════════════════════
function SecArchivos({
  idproducto,
  isEdit,
  archivosIniciales,
  onPendientesChange,
}: {
  idproducto: number | null;
  isEdit: boolean;
  archivosIniciales: ArchivoGuardado[];
  onPendientesChange: (pendientes: ArchivoPendiente[]) => void;
}) {
  const [archivosGuardados, setArchivosGuardados] = useState<ArchivoGuardado[]>(archivosIniciales);
  const [archivosPendientes, setArchivosPendientes] = useState<ArchivoPendiente[]>([]);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    if (!isEdit || !idproducto) return;
    const BASE = (import.meta as any).env.VITE_API_URL;
    fetch(`${BASE}/productos-papel/${idproducto}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    })
      .then(r => r.json())
      .then(d => setArchivosGuardados((d.archivos ?? []).map((a: any) => ({ ...a, pendiente: false }))))
      .catch(() => { });
  }, [idproducto, isEdit]);

  useEffect(() => {
    onPendientesChange(archivosPendientes);
  }, [archivosPendientes]);

  useEffect(() => {
    return () => {
      archivosPendientes.forEach(p => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const handleFile = async (file: File, categoria: string) => {
    if (!isEdit) {
      const pendiente: ArchivoPendiente = {
        uid: `${Date.now()}-${Math.random()}`,
        file,
        categoria,
        previewUrl: URL.createObjectURL(file),
        nombre: file.name,
        tipo: getTipoDeFile(file),
        pendiente: true,
      };
      setArchivosPendientes(prev => [...prev, pendiente]);
      return;
    }

    if (!idproducto) return;
    setSubiendo(true);
    try {
      const subcarpeta = CATEGORIA_A_SUBCARPETA[categoria] ?? "catalogo";
      const formData = new FormData();
      formData.append("archivo", file);
      formData.append("carpeta", "suaje");
      formData.append("subcarpeta", subcarpeta);
      formData.append("categoria", categoria);
      formData.append("idproducto_papel", String(idproducto));

      const BASE = (import.meta as any).env.VITE_API_URL;
      const res = await fetch(`${BASE}/archivos/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Error al subir: ${err.error ?? res.statusText}`);
        return;
      }

      const r2 = await fetch(`${BASE}/productos-papel/${idproducto}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      const d = await r2.json();
      setArchivosGuardados((d.archivos ?? []).map((a: any) => ({ ...a, pendiente: false })));
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarGuardado = async (idArchivo: number) => {
    if (!confirm("Eliminar este archivo?")) return;
    try {
      const BASE = (import.meta as any).env.VITE_API_URL;
      await fetch(`${BASE}/archivos/${idArchivo}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      setArchivosGuardados(prev => prev.filter(a => a.id_archivo !== idArchivo));
    } catch { }
  };

  const eliminarPendiente = (uid: string) => {
    setArchivosPendientes(prev => {
      const item = prev.find(p => p.uid === uid);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.uid !== uid);
    });
  };

  const UploadBtn = ({ label, categoria, accept, icon }: {
    label: string; categoria: string; accept: string; icon: string;
  }) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
      <div>
        <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0], categoria);
            e.target.value = "";
          }}
        />
        <button type="button" onClick={() => ref.current?.click()} disabled={subiendo}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 34, background: "#fff", border: "1.5px dashed #D1D5DB", borderRadius: 6, cursor: subiendo ? "wait" : "pointer", fontSize: 12, color: "#374151", fontWeight: 500, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          {subiendo ? "Subiendo..." : label}
        </button>
      </div>
    );
  };

  const todosLosArchivos: ArchivoItem[] = [...archivosGuardados, ...archivosPendientes];

  return (
    <Sec title="Archivos" colorKey="archivos">
      {!isEdit && archivosPendientes.length === 0 && (
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 10px" }}>
          Los archivos se subiran al servidor cuando guardes el producto.
        </p>
      )}
      {!isEdit && archivosPendientes.length > 0 && (
        <p style={{ fontSize: 12, color: "#D97706", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 5 }}>
          <span>⏳</span>
          {archivosPendientes.length} archivo{archivosPendientes.length !== 1 ? "s" : ""} pendiente{archivosPendientes.length !== 1 ? "s" : ""} — se subirán al guardar el producto.
        </p>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: todosLosArchivos.length > 0 ? 12 : 0 }}>
        <UploadBtn label="Catalogo" categoria="catalogo-suaje-papel" accept=".pdf,.doc,.docx,.xls,.xlsx" icon={ICON_PDF} />
        <UploadBtn label="Imagen" categoria="imagen-suaje-papel" accept="image/*" icon={ICON_IMG} />
        <UploadBtn label="Rendimiento" categoria="rendimiento-suaje-papel" accept=".pdf,.xlsx,.xls,image/*" icon={ICON_CHART} />
      </div>
      {todosLosArchivos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {todosLosArchivos.map((a) => {
            const icono = ICONOS_CATEGORIA[a.categoria]
              ?? (a.tipo === "image" ? ICON_IMG : a.tipo === "pdf" ? ICON_PDF : ICON_CHART);

            if (a.pendiente) {
              return (
                <div key={a.uid}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFBEB", border: "1px dashed #D97706", borderRadius: 6, padding: "5px 10px" }}>
                  <span style={{ fontSize: 13 }}>{icono}</span>
                  <span style={{ fontSize: 12, color: "#92400E", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={a.nombre}>{a.nombre}</span>
                  <span style={{ fontSize: 10, color: "#D97706", flexShrink: 0, fontWeight: 600 }}>pendiente</span>
                  <button onClick={() => eliminarPendiente(a.uid)}
                    style={{ width: 18, height: 18, border: "none", borderRadius: 3, background: "#FEF3C7", color: "#D97706", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}
                    title="Quitar archivo">x</button>
                </div>
              );
            }

            return (
              <div key={a.id_archivo}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 10px" }}>
                <span style={{ fontSize: 13 }}>{icono}</span>
                <a href={a.url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: "#1D4ED8", textDecoration: "none", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={a.nombre}>{a.nombre}</a>
                <span style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>{a.categoria}</span>
                <button onClick={() => eliminarGuardado(a.id_archivo)}
                  style={{ width: 18, height: 18, border: "none", borderRadius: 3, background: "#FEE2E2", color: "#DC2626", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}
                  title="Eliminar archivo">x</button>
              </div>
            );
          })}
        </div>
      )}
    </Sec>
  );
}

async function subirArchivoPendiente(pendiente: ArchivoPendiente, idproducto_papel: number): Promise<void> {
  const subcarpeta = CATEGORIA_A_SUBCARPETA[pendiente.categoria] ?? "catalogo";
  const formData = new FormData();
  formData.append("archivo", pendiente.file);
  formData.append("carpeta", "suaje");
  formData.append("subcarpeta", subcarpeta);
  formData.append("categoria", pendiente.categoria);
  formData.append("idproducto_papel", String(idproducto_papel));

  const BASE = (import.meta as any).env.VITE_API_URL;
  const res = await fetch(`${BASE}/archivos/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? res.statusText);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════
interface ProductoPapelFormConId extends ProductoPapelForm {
  idproducto_papel?: number;
  archivosIniciales?: ArchivoGuardado[];
}

function FormularioProducto({ initial, onSave, onCancel, saving }: {
  initial?: ProductoPapelFormConId;
  onSave: (form: ProductoPapelForm, pendientes: ArchivoPendiente[]) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const isEdit = !!initial;
  const { catalogs, names, addItem } = useCatalogosPapel();
  const [form, setForm] = useState<ProductoPapelForm>(initial ?? newProductoForm());
  const [expandedGrupoId, setExpandedGrupoId] = useState<number | null>(form.grupos[0]?.id ?? null);
  const pendientesRef = useRef<ArchivoPendiente[]>([]);

  const upd = (patch: Partial<ProductoPapelForm>) => setForm(prev => ({ ...prev, ...patch }));
  const updSuaje = (patch: any) => upd({ suaje: { ...form.suaje, ...patch } });
  const updAcabados = (patch: any) => upd({ acabados: { ...form.acabados, ...patch } });
  const updMaq = (patch: any) => upd({ maquinaria: { ...form.maquinaria, ...patch } });

  useEffect(() => {
    const b = calcBase(form.ancho, form.fuelle);
    if (b) updAcabados({ base_medida: b });
    const ancho = form.ancho.trim();
    const fuelle = form.fuelle.trim();
    const altura = form.altura.trim();
    let medida = "";
    if (ancho || altura) {
      medida = fuelle && fuelle !== "0" ? `${ancho}+${fuelle}x${altura}` : `${ancho}x${altura}`;
    }
    upd({ medida });
  }, [form.ancho, form.fuelle, form.altura]);

  const addGrupo = () => {
    const ultimo = form.grupos[form.grupos.length - 1];
    if (ultimo && ultimo.materiales.length === 0) return;
    const nuevoGrupo = newGrupo();
    upd({ grupos: [...form.grupos, nuevoGrupo] });
    setExpandedGrupoId(nuevoGrupo.id);
  };
  const updateGrupo = (g: GrupoPapel) => upd({ grupos: form.grupos.map(x => x.id === g.id ? g : x) });
  const removeGrupo = (id: number) => {
    upd({ grupos: form.grupos.filter(x => x.id !== id) });
    if (expandedGrupoId === id) setExpandedGrupoId(form.grupos.find(x => x.id !== id)?.id ?? null);
  };

  const handleSubmit = async () => {
    if (!form.idcat_tipo_producto_papel) { alert("Selecciona el tipo de producto"); return; }
    await onSave(form, pendientesRef.current);
  };

  const nombrePor = (key: CatKey, id: number | null) =>
    id ? (catalogs[key] as any[]).find((i: any) => i.id === id)?.nombre ?? "" : "";

  const labelConMedida = (item: { nombre: string; medida?: string }) =>
    item.medida ? `${item.nombre} -- ${item.medida}` : item.nombre;

  const namesMedida = (key: CatKey) =>
    (catalogs[key] as any[]).map((i: any) => labelConMedida(i));

  const sublbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#9CA3AF", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase", paddingBottom: 4, borderBottom: "1px dashed #E5E7EB" };

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto", padding: "20px 16px 48px", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#111827" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 3, padding: 0 }}>
            {"<"} Regresar
          </button>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9CA3AF", margin: 0, fontWeight: 600 }}>{isEdit ? "Editar" : "Alta de producto"}</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827", lineHeight: 1.2 }}>Producto de papel</h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ height: 36, padding: "0 16px", border: "1px solid #D1D5DB", borderRadius: 7, background: "#fff", color: "#374151", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ height: 36, padding: "0 20px", border: "none", borderRadius: 7, background: saving ? "#93C5FD" : "#1D4ED8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Registrar producto"}
          </button>
        </div>
      </div>

      {/* Tipo de producto + Grupos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, marginBottom: 10 }}>
        <Sec title="Tipo de producto" colorKey="tipo">
          <FG cols={2} gap="6px 8px">
            <Field label="Tipo" style={{ gridColumn: "span 2" }}>
              <SelConAlta catKey="tipo_producto" options={names("tipo_producto")} value={form.tipoProductoNombre}
                onChange={(v) => { const item = catalogs.tipo_producto.find(i => i.nombre === v); upd({ tipoProductoNombre: v, idcat_tipo_producto_papel: item?.id ?? null }); }}
                onAdd={addItem} />
            </Field>
            <Field label="Descripción" style={{ gridColumn: "span 2" }}>
              <Inp value={form.descripcion} onChange={v => upd({ descripcion: v })} />
            </Field>
            <Field label="Ancho">  <Inp value={form.ancho} onChange={v => upd({ ancho: v })} /></Field>
            <Field label="Fuelle"> <Inp value={form.fuelle} onChange={v => upd({ fuelle: v })} /></Field>
            <Field label="Altura"> <Inp value={form.altura} onChange={v => upd({ altura: v })} /></Field>
            <Field label="Medida"> <Inp value={form.medida} readOnly /></Field>
          </FG>
        </Sec>

        <Sec title="Tipo de papel" colorKey="papel" action={
          <button onClick={addGrupo} disabled={form.grupos[form.grupos.length - 1]?.materiales.length === 0}
            title={form.grupos[form.grupos.length - 1]?.materiales.length === 0 ? "Agrega al menos un material al grupo actual" : ""}
            style={{ padding: "0 12px", height: 28, background: form.grupos[form.grupos.length - 1]?.materiales.length === 0 ? "#E5E7EB" : "#1D4ED8", border: "none", borderRadius: 5, cursor: form.grupos[form.grupos.length - 1]?.materiales.length === 0 ? "not-allowed" : "pointer", color: form.grupos[form.grupos.length - 1]?.materiales.length === 0 ? "#9CA3AF" : "#fff", fontSize: 13, fontWeight: 600 }}>+ Grupo</button>
        }>
          {form.grupos.map((g, i) => (
            <GrupoBlock key={g.id} grupo={g} grupoIndex={i} totalGrupos={form.grupos.length}
              onUpdate={updateGrupo} onRemove={() => removeGrupo(g.id)}
              catTipoPapel={names("tipo_papel")} catCalibre={names("calibre")}
              catTipoPapelItems={catalogs.tipo_papel} catCalibreItems={catalogs.calibre}
              onAdd={addItem}
              collapsed={expandedGrupoId !== g.id}
              onToggle={() => setExpandedGrupoId(expandedGrupoId === g.id ? null : g.id)} />
          ))}
        </Sec>
      </div>

      {/* Suaje */}
      <Sec title="Suaje" colorKey="suaje">
        {/* Renglón 1: Numero, PZS, Tamano, Metros, Matrix, Corte */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: "6px 8px", marginBottom: 8, alignItems: "end" }}>
          <Field label="Numero">  <Inp value={form.suaje.numero} onChange={v => updSuaje({ numero: v })} /></Field>
          <Field label="PZS">     <Inp value={form.suaje.pzs} onChange={v => updSuaje({ pzs: v })} /></Field>
          <Field label="Tamano">  <Inp value={form.suaje.tamano} onChange={v => updSuaje({ tamano: v })} /></Field>
          <Field label="Metros">  <Inp value={form.suaje.metros} onChange={v => updSuaje({ metros: v })} /></Field>
          <Field label="Matrix">
            <SelConAlta
              catKey="matrix"
              options={names("matrix")}
              value={form.suaje.matrix}
              onChange={(v) => {
                const item = catalogs.matrix.find(i => i.nombre === v);
                updSuaje({ matrix: v, idcat_matrix: item?.id ?? null });
              }}
              onAdd={addItem}
            />
          </Field>          <Field label="Corte tipo">  <Inp value={form.suaje.corte1Tipo} onChange={v => updSuaje({ corte1Tipo: v })} /></Field>
          <Field label="Corte medida"><Inp value={form.suaje.corte1Medida} onChange={v => updSuaje({ corte1Medida: v })} /></Field>
        </div>
        {/* Renglón 2: Dobles, T.Arreglo, Sacabocado, Perforado */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr 56px 2fr 56px", gap: "6px 8px", alignItems: "end" }}>
          <Field label="Dobles tipo">  <Inp value={form.suaje.dobles1Tipo} onChange={v => updSuaje({ dobles1Tipo: v })} /></Field>
          <Field label="Dobles medida"><Inp value={form.suaje.dobles1Medida} onChange={v => updSuaje({ dobles1Medida: v })} /></Field>
          <Field label="T. arreglo (min)"><Inp value={form.suaje.tiempoArreglo} onChange={v => updSuaje({ tiempoArreglo: v })} /></Field>
          <Field label="Sacabocado">
            <SelConAlta catKey="sacabocados" options={namesMedida("sacabocados")} value={form.suaje.sacabocadoNombre}
              onChange={(v) => { const item = (catalogs.sacabocados as any[]).find((i: any) => labelConMedida(i) === v); updSuaje({ sacabocadoNombre: v, idcat_sacabocados: item?.id ?? null }); }}
              onAdd={addItem} placeholder="" />
          </Field>
          <Field label="Cant.">
            <input type="text" inputMode="numeric" value={form.suaje.cantidad_sacabocado}
              onChange={e => updSuaje({ cantidad_sacabocado: e.target.value })}
              style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
          </Field>
          <Field label="Perforado">
            <SelConAlta catKey="perforado" options={namesMedida("perforado")} value={form.suaje.perforadoNombre}
              onChange={(v) => { const item = (catalogs.perforado as any[]).find((i: any) => labelConMedida(i) === v); updSuaje({ perforadoNombre: v, idcat_perforado: item?.id ?? null }); }}
              onAdd={addItem} placeholder="" />
          </Field>
          <Field label="Cant.">
            <input type="text" inputMode="numeric" value={form.suaje.cantidad_perforado}
              onChange={e => updSuaje({ cantidad_perforado: e.target.value })}
              style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
          </Field>
        </div>
      </Sec>

      {/* Pegado | Refuerzo+Base | Empaque */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.4fr 1fr", gap: 10, marginBottom: 10 }}>
        <Sec title="Pegado y acabados" colorKey="acabados">
          <FG cols={2} gap="6px 8px">
            <Field label="Tipo de pegado">
              <SelConAlta catKey="tipo_pegado" options={names("tipo_pegado")}
                value={nombrePor("tipo_pegado", form.acabados.idcat_tipo_pegado)}
                onChange={(v) => { const item = catalogs.tipo_pegado.find(i => i.nombre === v); updAcabados({ idcat_tipo_pegado: item?.id ?? null }); }}
                onAdd={addItem} />
            </Field>
            <Field label="Pegamento">
              <SelConAlta catKey="pegamento" options={names("pegamento")}
                value={nombrePor("pegamento", form.acabados.idcat_pegamento)}
                onChange={(v) => { const item = catalogs.pegamento.find(i => i.nombre === v); updAcabados({ idcat_pegamento: item?.id ?? null }); }}
                onAdd={addItem} />
            </Field>
            <Field label="Asa">
              <AsaMultiSelect selectedIds={form.acabados.asas} selectedNames={form.acabados.asasNombres}
                catItems={catalogs.tipo_asa}
                onChange={(ids, nombres) => updAcabados({ asas: ids, asasNombres: nombres })}
                onAdd={addItem} />
            </Field>
            <Field label="Laminado">
              <AsaMultiSelect
                selectedIds={form.acabados.laminados}
                selectedNames={form.acabados.laminadosNombres}
                catItems={catalogs.laminado}
                onChange={(ids, nombres) => updAcabados({ laminados: ids, laminadosNombres: nombres })}
                onAdd={addItem}
                catKeyForAdd={"laminado" as CatKey}
              />
            </Field>
          </FG>
        </Sec>

        <Sec title="Refuerzo y base" colorKey="acabados">
          <div style={{ marginBottom: 10 }}>
            <label style={sublbl}>Refuerzo</label>
            <FG cols={2} gap="5px 6px">
              <Field label="Material">
                <SelConAlta catKey="refuerzo_material" options={names("refuerzo_material")}
                  value={nombrePor("refuerzo_material", form.acabados.idcat_refuerzo_material)}
                  onChange={(v) => { const item = catalogs.refuerzo_material.find(i => i.nombre === v); updAcabados({ idcat_refuerzo_material: item?.id ?? null }); }}
                  onAdd={addItem} placeholder="" />
              </Field>
              <Field label="Medida">
                <SelConAlta catKey="refuerzo_medidas" options={names("refuerzo_medidas")}
                  value={form.acabados.refuerzoMedidaNombre}
                  onChange={(v) => { const item = catalogs.refuerzo_medidas.find(i => i.nombre === v); updAcabados({ refuerzoMedidaNombre: v, idcat_refuerzo_medidas: item?.id ?? null }); }}
                  onAdd={addItem} placeholder="" />
              </Field>
            </FG>
          </div>
          <div>
            <label style={sublbl}>Base</label>
            <FG cols={2} gap="5px 6px">
              <Field label="Material">
                <SelConAlta catKey="refuerzo_material" options={names("refuerzo_material")}
                  value={nombrePor("refuerzo_material", form.acabados.idcat_base_material)}
                  onChange={(v) => { const item = catalogs.refuerzo_material.find(i => i.nombre === v); updAcabados({ idcat_base_material: item?.id ?? null }); }}
                  onAdd={addItem} placeholder="" />
              </Field>
              <Field label="Medida (auto)">
                <Inp value={form.acabados.base_medida} readOnly />
              </Field>
            </FG>
          </div>
        </Sec>

        <Sec title="Empaque" colorKey="acabados">
          <FG cols={1} gap="6px 0">
            <Field label="Tipo de empaque">
              <SelConAlta catKey="empaque" options={names("empaque")}
                value={nombrePor("empaque", form.acabados.idcat_empaque)}
                onChange={(v) => { const item = catalogs.empaque.find(i => i.nombre === v); updAcabados({ idcat_empaque: item?.id ?? null }); }}
                onAdd={addItem} />
            </Field>
            <Field label="Piezas por caja">
              <Inp value={form.acabados.pzs_caja} onChange={v => updAcabados({ pzs_caja: v })} />
            </Field>
          </FG>
        </Sec>
      </div>

      {/* Maquinaria */}
      <Sec title="Maquinaria" colorKey="maquinaria">
        <FG cols={5} gap="6px 10px" style={{ marginBottom: 8 }}>
          {([
            ["hojeado_guillotina", "Hojeado / Guill."],
            ["impresora", "Impresora"],
            ["hs_ar", "Hs y AR"],
            ["suaje_maquina", "Suaje"],
            ["uv", "UV"],
          ] as [string, string][]).map(([key, label]) => (
            <Field key={key} label={label}>
              <MaquinariaMultiSelect
                catKey={key as CatKey}
                selectedIds={(form.maquinaria as any)[key] ?? []}
                selectedNames={(form.maquinaria as any)[`${key}_nombres`] ?? []}
                catItems={catalogs[key as CatKey] as { id: number; nombre: string }[]}
                onChange={(ids, nombres) => updMaq({ [key]: ids, [`${key}_nombres`]: nombres })}
                onAdd={addItem}
              />
            </Field>
          ))}
        </FG>
        <FG cols={5} gap="6px 10px">
          {([
            ["textura", "Textura"],
            ["empalme", "Empalme"],
            ["armado", "Armado"],
            ["asas_maquina", "Asas"],
            ["desbarbe", "Desbarbe"],
          ] as [string, string][]).map(([key, label]) => (
            <Field key={key} label={label}>
              <MaquinariaMultiSelect
                catKey={key as CatKey}
                selectedIds={(form.maquinaria as any)[key] ?? []}
                selectedNames={(form.maquinaria as any)[`${key}_nombres`] ?? []}
                catItems={catalogs[key as CatKey] as { id: number; nombre: string }[]}
                onChange={(ids, nombres) => updMaq({ [key]: ids, [`${key}_nombres`]: nombres })}
                onAdd={addItem}
              />
            </Field>
          ))}
        </FG>
      </Sec>

      <SecArchivos
        idproducto={initial?.idproducto_papel ?? null}
        isEdit={isEdit}
        archivosIniciales={initial?.archivosIniciales ?? []}
        onPendientesChange={(p) => { pendientesRef.current = p; }}
      />
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

  if (loading) return (
    <div style={{ padding: "16px", background: "#F9FAFB", borderTop: "1px solid #E5E7EB", fontSize: 12, color: "#9CA3AF" }}>Cargando detalle...</div>
  );
  if (!detalle) return (
    <div style={{ padding: "16px", background: "#F9FAFB", borderTop: "1px solid #E5E7EB", fontSize: 12, color: "#DC2626" }}>Error al cargar el detalle.</div>
  );

  const COLORS = ["#7C3AED", "#0891B2", "#059669", "#D97706", "#DC2626", "#DB2777"];
  const LIGHTS = ["#EDE9FE", "#CFFAFE", "#D1FAE5", "#FEF3C7", "#FEE2E2", "#FCE7F3"];

  return (
    <div style={{ padding: "14px 16px", background: "#F9FAFB", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3px 32px", marginBottom: 14 }}>
        {row("Tipo", detalle.tipo_producto)}
        {row("Descripción", detalle.descripcion_papel)}
        {row("Ancho", detalle.ancho)}
        {row("Fuelle", detalle.fuelle)}
        {row("Altura", detalle.altura)}
        {row("Medida", detalle.medida)}
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
            {row("Corte", [detalle.suaje.corte1_tipo, detalle.suaje.corte1_medida].filter(Boolean).join(" / "))}
            {row("Dobles", [detalle.suaje.dobles1_tipo, detalle.suaje.dobles1_medida].filter(Boolean).join(" / "))}
            {detalle.suaje.sacabocado_nombre && row("Sacabocado", `${detalle.suaje.sacabocado_nombre}${detalle.suaje.sacabocado_medida ? " -- " + detalle.suaje.sacabocado_medida : ""} x ${detalle.suaje.cantidad_sacabocado ?? "--"}`)}
            {detalle.suaje.perforado_nombre && row("Perforado", `${detalle.suaje.perforado_nombre}${detalle.suaje.perforado_medida ? " -- " + detalle.suaje.perforado_medida : ""} x ${detalle.suaje.cantidad_perforado ?? "--"}`)}
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
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3730A3", margin: "0 0 8px" }}>Opciones de material</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {detalle.grupos.map((g: any, gi: number) => {
              const c = COLORS[gi % COLORS.length], l = LIGHTS[gi % LIGHTS.length];
              return (
                <div key={g.idgrupo_papel} style={{ border: `1px solid ${c}30`, borderLeft: `3px solid ${c}`, borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ background: l, padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: c }}>Grupo {gi + 1} -- {g.materiales.length} mat.</span>
                    {g.precio_sugerido && <span style={{ fontSize: 12, fontWeight: 700, color: c }}>${parseFloat(g.precio_sugerido).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</span>}
                  </div>
                  <div style={{ padding: "8px 12px" }}>
                    {g.materiales.map((m: any, mi: number) => (
                      <div key={m.iddetalle_material} style={{ paddingBottom: mi < g.materiales.length - 1 ? 8 : 0, marginBottom: mi < g.materiales.length - 1 ? 8 : 0, borderBottom: mi < g.materiales.length - 1 ? "1px dashed #E5E7EB" : "none" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", minWidth: 14 }}>{mi + 1}.</span>
                          {[["Tipo", m.tipo_papel], ["Cal.", m.calibre], ["Pliego", m.pliego], ["Rend.", m.rendimiento], ["Corte", m.corte]].filter(([, v]) => v).map(([lbl, val]) => (
                            <span key={lbl as string} style={{ fontSize: 11 }}>
                              <span style={{ color: "#9CA3AF" }}>{lbl}: </span>
                              <span style={{ color: "#111827", fontWeight: 500 }}>{val}</span>
                            </span>
                          ))}
                        </div>
                        {(m.hojeado?.bobina || m.hojeado?.corte || m.hojeado?.rendimiento || m.hojeado?.guillotina || m.hojeado?.hilo) && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", paddingTop: 3, paddingLeft: 20, borderTop: "1px dashed #F3F4F6" }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", alignSelf: "center" }}>Hojeado:</span>
                            {[["Bob.", m.hojeado?.bobina], ["Corte", m.hojeado?.corte], ["Rend.", m.hojeado?.rendimiento], ["Guill.", m.hojeado?.guillotina], ["Hilo", m.hojeado?.hilo]].filter(([, v]) => v).map(([lbl, val]) => (
                              <span key={lbl as string} style={{ fontSize: 11 }}>
                                <span style={{ color: "#9CA3AF" }}>{lbl}: </span>
                                <span style={{ color: "#111827", fontWeight: 500 }}>{val}</span>
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
                  {a.categoria === "imagen-suaje-papel" ? ICON_IMG
                    : a.categoria === "rendimiento-suaje-papel" ? ICON_CHART
                      : ICON_PDF}
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

  const filtered = productos.filter(p =>
    p.tipo_producto.toLowerCase().includes(search.toLowerCase()) ||
    (p.medida ?? "").toLowerCase().includes(search.toLowerCase()) ||
    ((p as any).descripcion_papel ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto", padding: "15px 5px 50px", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#111827" }}>
      {deleteId !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px 28px", maxWidth: 340, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <p style={{ fontSize: 14, color: "#111827", margin: "0 0 5px", fontWeight: 600 }}>Eliminar producto?</p>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 18px" }}>Esta accion no se puede deshacer.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setDeleteId(null)} style={{ height: 34, padding: "0 14px", border: "1px solid #E5E7EB", borderRadius: 6, background: "#fff", color: "#6B7280", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => { onEliminar(deleteId!); setDeleteId(null); }} style={{ height: 34, padding: "0 14px", border: "none", borderRadius: 6, background: "#DC2626", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9CA3AF", margin: "0 0 2px", fontWeight: 600 }}>Alta de productos</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#111827" }}>Catalogo de papel</h1>
        </div>
        <button onClick={onNuevo} style={{ height: 38, padding: "0 18px", border: "none", borderRadius: 7, background: "#1D4ED8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Registrar nuevo producto</button>
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9CA3AF" }}>&#128269;</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", height: 36, paddingLeft: 32, paddingRight: 12, border: "1px solid #D1D5DB", borderRadius: 7, fontSize: 12, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
      </div>

      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1fr auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["Tipo de producto", "Descripción", "Medida", "Ancho x Fuelle", "Creado por", ""].map(h => (
            <div key={h} style={{ padding: "8px 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>{h}</div>
          ))}
        </div>
        {loading ? (
          <div style={{ padding: "36px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "36px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{search ? "Sin resultados." : "No hay productos registrados."}</div>
        ) : filtered.map((p, idx) => (
          <div key={p.idproducto_papel}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1fr auto", padding: "0 16px", alignItems: "center", minHeight: 48, background: expandedId === p.idproducto_papel ? "#EFF6FF" : idx % 2 === 0 ? "#fff" : "#FAFAFA", borderBottom: expandedId === p.idproducto_papel ? "none" : "1px solid #F3F4F6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setExpandedId(expandedId === p.idproducto_papel ? null : p.idproducto_papel)}
                  style={{ width: 20, height: 20, borderRadius: 4, background: "#EFF6FF", border: "1px solid #BFDBFE", cursor: "pointer", fontSize: 11, color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {expandedId === p.idproducto_papel ? "^" : "v"}
                </button>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: "#111827" }}>{p.tipo_producto}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF" }}>ID #{p.idproducto_papel}</p>
                </div>
              </div>
              <span style={{ fontSize: 12, color: "#374151" }}>{(p as any).descripcion_papel || "--"}</span>
              <span style={{ fontSize: 12, color: "#374151" }}>{p.medida || "--"}</span>
              <span style={{ fontSize: 12, color: "#374151" }}>{p.ancho && p.fuelle ? `${p.ancho} x ${p.fuelle}` : "--"}</span>
              <span style={{ fontSize: 12, color: "#374151" }}>{p.creado_por || "--"}</span>
              <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                <button onClick={() => onEditar(p)} style={{ height: 28, padding: "0 10px", background: "#F3F4F6", border: "1px solid #D1D5DB", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#374151" }}>Editar</button>
                <button onClick={() => setDeleteId(p.idproducto_papel)} style={{ height: 28, padding: "0 8px", background: "#FEE2E2", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#DC2626" }}>x</button>
              </div>
            </div>
            {expandedId === p.idproducto_papel && <DetalleProducto id={p.idproducto_papel} />}
          </div>
        ))}
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
  const [editForm, setEditForm] = useState<ProductoPapelForm | undefined>(undefined);
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
      form.ancho = d.ancho ? String(d.ancho) : "";
      form.fuelle = d.fuelle ? String(d.fuelle) : "";
      form.altura = d.altura ? String(d.altura) : "";
      form.medida = d.medida ?? "";

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
        form.suaje.dobles1Tipo = d.suaje.dobles1_tipo ?? "";
        form.suaje.dobles1Medida = d.suaje.dobles1_medida ?? "";
        form.suaje.metros = d.suaje.metros ?? "";
        form.suaje.matrix = d.suaje.matrix_nombre ?? "";
        form.suaje.idcat_matrix = d.suaje.idcat_matrix ?? null; form.suaje.tiempoArreglo = d.suaje.tiempo_arreglo ? String(d.suaje.tiempo_arreglo) : "";
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
      } as any);
    } catch {
      setEditForm(newProductoForm());
    }
  };

  const handleSave = async (form: ProductoPapelForm, pendientes: ArchivoPendiente[]) => {
    let ok: number | boolean | null;

    if (vista === "editar" && editId) {
      ok = await actualizar(editId, form);
    } else {
      const idNuevo = await crear(form);
      if (idNuevo && pendientes.length > 0) {
        await Promise.allSettled(
          pendientes.map(p => subirArchivoPendiente(p, idNuevo))
        );
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
        <FormularioProducto
          initial={editForm}
          onSave={handleSave}
          onCancel={() => { setVista("tabla"); setEditForm(undefined); setEditId(undefined); }}
          saving={saving}
        />
      )}
    </Dashboard>
  );
}