// src/components/papel/FormularioProductoPapelAlta.tsx
// Extraído de pages/papel/Papel.tsx para ser reutilizable
import { useState, useEffect, useMemo, useRef } from "react";
import type React from "react";
import {
  newProductoForm,
  newGrupo,
  newMaterial,
} from "../../types/papel/papel.types";
import type {
  ProductoPapelForm,
  GrupoPapel,
  CatKey,
} from "../../types/papel/papel.types";
import { useCatalogosPapel } from "../../hooks/papel/useCatalogosPapel";
import { fetchTamanosProducto, type TamanoProductoOpcion } from "../../services/papel/papel.service";
import { getCostoMetroLaminado } from "../../services/papel/preciosAcabadosPapel.service";
import {
  calcularCostoLaminado,
  formatearCostoLaminado,
} from "../../utils/papel/costoLaminado.utils";
import SelConAlta from "./SelConAlta";
import GrupoBlock from "./GrupoBlock";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const calcBase = (ancho: string, fuelle: string) => {
  const a = parseFloat(ancho), f = parseFloat(fuelle);
  return (!isNaN(a) && !isNaN(f)) ? `${(a - 0.5).toFixed(1)}x${(f - 0.5).toFixed(1)} cm` : "";
};

const labelCorteDoble = (i: { nombre: string; altura?: string }) =>
  i.altura ? `${i.nombre} — ${i.altura}` : i.nombre;

const ICON_PDF = "\uD83D\uDCC4";
const ICON_IMG = "\uD83D\uDDBC\uFE0F";
const ICON_CHART = "\uD83D\uDCCA";

const CATEGORIA_A_SUBCARPETA: Record<string, string> = {
  "catalogo-suaje-papel": "catalogo",
  "imagen-suaje-papel": "imagen",
  "rendimiento-suaje-papel": "rendimiento",
};

const SEC_COLORS = {
  tipo: { border: "#94A3B8", headerBg: "#CBD5E1", headerText: "#0F172A", leftBar: "#334155" },
  suaje: { border: "#94A3B8", headerBg: "#CBD5E1", headerText: "#0F172A", leftBar: "#334155" },
  acabados: { border: "#94A3B8", headerBg: "#CBD5E1", headerText: "#0F172A", leftBar: "#334155" },
  maquinaria: { border: "#94A3B8", headerBg: "#CBD5E1", headerText: "#0F172A", leftBar: "#334155" },
  archivos: { border: "#94A3B8", headerBg: "#CBD5E1", headerText: "#0F172A", leftBar: "#334155" },
  papel: { border: "#E2E8F0", headerBg: "#F8FAFC", headerText: "#475569", leftBar: "#94A3B8" },
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
    <div style={{ minWidth: 0, ...style }}>
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
// SELECT DE PUNTOS
// ═══════════════════════════════════════════════════════════════════════════
function PuntosSelect({ idSel, items, onSel }: {
  idSel: number | null;
  items: { id: number; nombre: string; puntos?: number }[];
  onSel: (id: number | null, txt: string) => void;
}) {
  return (
    <select
      value={idSel ?? ""}
      onChange={e => {
        const idP = e.target.value ? Number(e.target.value) : null;
        const item = items.find(p => p.id === idP);
        onSel(idP, item ? String(item.puntos ?? item.nombre) : "");
      }}
      style={{ width: "100%", height: 34, padding: "0 6px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: idSel ? "#111827" : "#9CA3AF", background: "#fff", outline: "none", boxSizing: "border-box", cursor: "pointer" }}
    >
      <option value=""></option>
      {items.map(p => (
        <option key={p.id} value={p.id} style={{ color: "#111827" }}>{p.puntos ?? p.nombre}</option>
      ))}
    </select>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ASA MULTI-SELECT CON ALTA
// ═══════════════════════════════════════════════════════════════════════════
function AsaMultiSelect({
  selectedIds = [],
  selectedNames = [],
  catItems = [],
  onChange,
  onAdd,
  catKeyForAdd = "tipo_asa",
}: {
  selectedIds: number[];
  selectedNames: string[];
  catItems: { id: number; nombre: string }[];
  onChange: (ids: number[], nombres: string[]) => void;
  onAdd: (key: CatKey, nombre: string) => Promise<unknown>;
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

  const todosSeleccionados = catItems.length > 0 && catItems.every(item => selectedIds.includes(item.id));
  const handleToggleTodos = () => {
    if (todosSeleccionados) onChange([], []);
    else onChange(catItems.map(i => i.id), catItems.map(i => i.nombre));
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ height: 34, overflow: "hidden", borderRadius: 5 }}>
        <button type="button" onClick={() => { setOpen(!open); setAdding(false); }}
          style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: selectedIds.length ? "#111827" : "#9CA3AF", background: "#fff", outline: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box", overflow: "hidden" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
            {selectedIds.length === 0 ? "" : selectedNames.join(", ")}
          </span>
          <span style={{ fontSize: 11, color: "#6B7280", flexShrink: 0, marginLeft: 4, userSelect: "none" }}>▾</span>
        </button>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "4px 0", maxHeight: 220, overflowY: "auto" }}>
          {catItems.length > 0 && (
            <div style={{ borderBottom: "1px solid #F3F4F6", padding: "3px 8px 5px" }}>
              <button type="button" onClick={handleToggleTodos}
                style={{ width: "100%", padding: "3px 4px", border: "none", background: "transparent", color: todosSeleccionados ? "#DC2626" : "#374151", fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: 600 }}>
                {todosSeleccionados ? "✕ Deseleccionar todo" : "✓ Seleccionar todo"}
              </button>
            </div>
          )}
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
// HOJEADO/GUILLOTINA — dos selects independientes (uno por tipo de máquina),
// pero ambos leen/escriben el MISMO arreglo `hojeado_guillotina` (0 a 2
// elementos: como mucho una Hojeadora + una Guillotina). Antes era un solo
// MaquinariaSelectUnica que forzaba elegir UNA máquina para todo el proceso;
// ahora ambas quedan disponibles siempre en producción (se decide
// físicamente en piso), así que el producto necesita poder registrar una
// máquina de cada tipo.
// ═══════════════════════════════════════════════════════════════════════════
function MaquinariaSelectPorTipo({
  tipoMaquina,
  label,
  selectedIds,
  selectedNames,
  catItems,
  onChange,
}: {
  tipoMaquina: "hojeadora" | "guillotina";
  label: string;
  selectedIds: number[];
  selectedNames: string[];
  catItems: { id: number; nombre: string; tipo_maquina?: string | null; numero_maquina?: string | null }[];
  onChange: (ids: number[], nombres: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const itemsDeEsteTipo = catItems.filter(i => i.tipo_maquina === tipoMaquina);

  // Cuál de los ids ya seleccionados (0 a 2 en total) pertenece a ESTE tipo
  const idDeEsteTipo = selectedIds.find(id =>
    catItems.find(i => i.id === id)?.tipo_maquina === tipoMaquina
  ) ?? null;
  const indiceEnArreglo = idDeEsteTipo != null ? selectedIds.indexOf(idDeEsteTipo) : -1;
  const nombreDeEsteTipo = indiceEnArreglo >= 0 ? selectedNames[indiceEnArreglo] : null;

  const reemplazarSeleccionDeEsteTipo = (nuevoId: number | null, nuevoNombre: string | null) => {
    // Quita cualquier id previo de ESTE tipo (si había), sin tocar el del
    // otro tipo, y agrega el nuevo (o nada, si se deselecciona).
    const pares = selectedIds.map((id, i) => ({ id, nombre: selectedNames[i] }));
    const sinEsteTipo = pares.filter(p => p.id !== idDeEsteTipo);
    const siguiente = nuevoId != null
      ? [...sinEsteTipo, { id: nuevoId, nombre: nuevoNombre ?? "" }]
      : sinEsteTipo;
    onChange(siguiente.map(p => p.id), siguiente.map(p => p.nombre));
  };

  const etiquetaMaquina = (item: { nombre: string; numero_maquina?: string | null }) =>
    item.numero_maquina ? `${item.nombre} (${item.numero_maquina})` : item.nombre;

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 0, maxWidth: "100%" }}>
      <div style={{ height: 34, overflow: "hidden", borderRadius: 5 }}>
        <button type="button" onClick={() => setOpen(!open)}
          style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: idDeEsteTipo != null ? "#111827" : "#9CA3AF", background: "#fff", outline: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box", overflow: "hidden" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
            {nombreDeEsteTipo ?? ""}
          </span>
          <span style={{ fontSize: 11, color: "#6B7280", flexShrink: 0, marginLeft: 4, userSelect: "none" }}>▾</span>
        </button>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "4px 0", maxHeight: 220, overflowY: "auto" }}>
          {idDeEsteTipo != null && (
            <button type="button" onClick={() => { reemplazarSeleccionDeEsteTipo(null, null); setOpen(false); }}
              style={{ width: "100%", padding: "5px 12px", border: "none", background: "transparent", color: "#DC2626", fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #F3F4F6" }}>
              ✕ Quitar selección
            </button>
          )}
          {itemsDeEsteTipo.length === 0 && (
            <div style={{ padding: "6px 12px", color: "#9CA3AF", fontSize: 12 }}>
              Sin máquinas tipo {label} en el catálogo.
            </div>
          )}
          {itemsDeEsteTipo.map(item => (
            <button key={item.id} type="button"
              onClick={() => { reemplazarSeleccionDeEsteTipo(item.id, item.nombre); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: idDeEsteTipo === item.id ? "#1D4ED8" : "#111827", background: idDeEsteTipo === item.id ? "#F1F5F9" : "transparent", fontWeight: idDeEsteTipo === item.id ? 600 : 400 }}>
              {idDeEsteTipo === item.id ? "● " : ""}{etiquetaMaquina(item)}
            </button>
          ))}
          <div style={{ padding: "6px 12px", color: "#9CA3AF", fontSize: 11, borderTop: "1px solid #F3F4F6", marginTop: 2 }}>
            Para agregar una máquina nueva, ve a Catálogos y márcala como {label}.
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAQUINARIA MULTI-SELECT CON ALTA
// ═══════════════════════════════════════════════════════════════════════════
function MaquinariaSelectUnica({
  catKey,
  selectedIds = [],
  selectedNames = [],
  catItems = [],
  onChange,
  onAdd,
}: {
  catKey: CatKey;
  selectedIds: number[];
  selectedNames: string[];
  catItems: { id: number; nombre: string; tipo_maquina?: string | null; numero_maquina?: string | null }[];
  onChange: (ids: number[], nombres: string[]) => void;
  onAdd: (key: CatKey, nombre: string) => Promise<unknown>;
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

  // NUEVO: selección única — antes este componente (MaquinariaMultiSelect)
  // dejaba marcar varias máquinas por proceso (checkboxes). Ahora la
  // máquina que se elige aquí ES la máquina con la que se hará el proceso
  // en producción, no una opción entre varias a decidir después en el
  // pedido. Se sigue mandando como array de 0 o 1 elemento (ids/nombres)
  // para no tener que tocar el tipo Maquinaria, el backend, ni
  // papel.service.ts / Papel.tsx — todos ya soportan arrays de cualquier
  // longitud, incluyendo 0 o 1.
  const seleccionar = (item: { id: number; nombre: string }) => {
    const yaSeleccionado = selectedIds[0] === item.id;
    onChange(yaSeleccionado ? [] : [item.id], yaSeleccionado ? [] : [item.nombre]);
    setOpen(false);
  };

  const handleAdd = async () => {
    const t = newVal.trim(); if (!t || catKey === "hojeado_guillotina") return;
    setSaving(true);
    try { await onAdd(catKey, t); setNewVal(""); setAdding(false); }
    finally { setSaving(false); }
  };

  const etiquetaMaquina = (item: { nombre: string; tipo_maquina?: string | null; numero_maquina?: string | null }) => {
    const numero = item.numero_maquina ? ` (${item.numero_maquina})` : "";
    const tipo = item.tipo_maquina === "hojeadora" ? " — Hojeadora" : item.tipo_maquina === "guillotina" ? " — Guillotina" : "";
    return `${item.nombre}${numero}${tipo}`;
  };

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 0, maxWidth: "100%" }}>
      <div style={{ height: 34, overflow: "hidden", borderRadius: 5 }}>
        <button type="button" onClick={() => { setOpen(!open); setAdding(false); }}
          style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: selectedIds.length ? "#111827" : "#9CA3AF", background: "#fff", outline: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box", overflow: "hidden" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
            {selectedIds.length === 0 ? "" : selectedNames[0]}
          </span>
          <span style={{ fontSize: 11, color: "#6B7280", flexShrink: 0, marginLeft: 4, userSelect: "none" }}>▾</span>
        </button>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "4px 0", maxHeight: 220, overflowY: "auto" }}>
          {selectedIds.length > 0 && (
            <button type="button" onClick={() => onChange([], [])}
              style={{ width: "100%", padding: "5px 12px", border: "none", background: "transparent", color: "#DC2626", fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #F3F4F6" }}>
              ✕ Quitar selección
            </button>
          )}
          {catItems.map(item => (
            <button key={item.id} type="button" onClick={() => seleccionar(item)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: selectedIds[0] === item.id ? "#1D4ED8" : "#111827", background: selectedIds[0] === item.id ? "#F1F5F9" : "transparent", fontWeight: selectedIds[0] === item.id ? 600 : 400 }}>
              {selectedIds[0] === item.id ? "● " : ""}{etiquetaMaquina(item)}
            </button>
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
            ) : catKey === "hojeado_guillotina" ? (
              <div style={{ padding: "6px 12px", color: "#9CA3AF", fontSize: 12 }}>
                Agrega nuevas máquinas desde Catálogos para indicar si son Hojeadora o Guillotina.
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

// ═══════════════════════════════════════════════════════════════════════════
// ARCHIVOS
// ═══════════════════════════════════════════════════════════════════════════
interface ArchivoGuardado {
  id_archivo: number;
  nombre: string;
  url: string;
  categoria: string;
  tipo: string;
  pendiente: false;
}

export interface ArchivoPendiente {
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

function SecArchivos({ idproducto, isEdit, archivosIniciales, onPendientesChange }: {
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

  useEffect(() => { onPendientesChange(archivosPendientes); }, [archivosPendientes]);
  useEffect(() => { return () => { archivosPendientes.forEach(p => URL.revokeObjectURL(p.previewUrl)); }; }, []);

  const handleFile = async (file: File, categoria: string) => {
    if (!isEdit) {
      const pendiente: ArchivoPendiente = {
        uid: `${Date.now()}-${Math.random()}`, file, categoria,
        previewUrl: URL.createObjectURL(file), nombre: file.name,
        tipo: getTipoDeFile(file), pendiente: true,
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
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(`Error al subir: ${err.error ?? res.statusText}`); return; }
      const r2 = await fetch(`${BASE}/productos-papel/${idproducto}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` } });
      const d = await r2.json();
      setArchivosGuardados((d.archivos ?? []).map((a: any) => ({ ...a, pendiente: false })));
    } finally { setSubiendo(false); }
  };

  const eliminarGuardado = async (idArchivo: number) => {
    if (!confirm("¿Eliminar este archivo?")) return;
    try {
      const BASE = (import.meta as any).env.VITE_API_URL;
      await fetch(`${BASE}/archivos/${idArchivo}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` } });
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

  const UploadBtn = ({ label, categoria, accept, icon }: { label: string; categoria: string; accept: string; icon: string }) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
      <div>
        <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0], categoria); e.target.value = ""; }} />
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
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 10px" }}>Los archivos se subirán al servidor cuando guardes el producto.</p>
      )}
      {!isEdit && archivosPendientes.length > 0 && (
        <p style={{ fontSize: 12, color: "#D97706", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 5 }}>
          <span>⏳</span>
          {archivosPendientes.length} archivo{archivosPendientes.length !== 1 ? "s" : ""} pendiente{archivosPendientes.length !== 1 ? "s" : ""} — se subirán al guardar.
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
            const icono = ICONOS_CATEGORIA[a.categoria] ?? (a.tipo === "image" ? ICON_IMG : a.tipo === "pdf" ? ICON_PDF : ICON_CHART);
            if (a.pendiente) {
              return (
                <div key={a.uid} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFBEB", border: "1px dashed #D97706", borderRadius: 6, padding: "5px 10px" }}>
                  <span style={{ fontSize: 13 }}>{icono}</span>
                  <span style={{ fontSize: 12, color: "#92400E", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.nombre}>{a.nombre}</span>
                  <span style={{ fontSize: 10, color: "#D97706", flexShrink: 0, fontWeight: 600 }}>pendiente</span>
                  <button onClick={() => eliminarPendiente(a.uid)} style={{ width: 18, height: 18, border: "none", borderRadius: 3, background: "#FEF3C7", color: "#D97706", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>x</button>
                </div>
              );
            }
            return (
              <div key={a.id_archivo} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 10px" }}>
                <span style={{ fontSize: 13 }}>{icono}</span>
                <a href={a.url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: "#1D4ED8", textDecoration: "none", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.nombre}>{a.nombre}</a>
                <span style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>{a.categoria}</span>
                <button onClick={() => eliminarGuardado(a.id_archivo)} style={{ width: 18, height: 18, border: "none", borderRadius: 3, background: "#FEE2E2", color: "#DC2626", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>x</button>
              </div>
            );
          })}
        </div>
      )}
    </Sec>
  );
}

export async function subirArchivoPendiente(pendiente: ArchivoPendiente, idproducto_papel: number): Promise<void> {
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
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? res.statusText); }
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════
export interface ProductoPapelFormConId extends ProductoPapelForm {
  idproducto_papel?: number;
  archivosIniciales?: ArchivoGuardado[];
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL EXPORTADO
// ═══════════════════════════════════════════════════════════════════════════
export default function FormularioProductoPapelAlta({ initial, onSave, onCancel, saving, topOffset = 0 }: {
  initial?: ProductoPapelFormConId;
  onSave: (form: ProductoPapelForm, pendientes: ArchivoPendiente[]) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  topOffset?: number;
}) {
  const isEdit = !!initial;
  const { catalogs, names, addItem } = useCatalogosPapel();
  const [tamanosProducto, setTamanosProducto] = useState<TamanoProductoOpcion[]>([]);
  useEffect(() => {
    fetchTamanosProducto().then(setTamanosProducto).catch(() => setTamanosProducto([]));
  }, []);
  const [form, setForm] = useState<ProductoPapelForm>(initial ?? newProductoForm());
  const [expandedGrupoId, setExpandedGrupoId] = useState<number | null>(form.grupos[0]?.id ?? null);
  const [costoMetroLaminado, setCostoMetroLaminado] = useState<number | null>(null);
  const [cargandoCostoMetro, setCargandoCostoMetro] = useState(true);
  const [errorCostoLaminado, setErrorCostoLaminado] = useState("");
  const pendientesRef = useRef<ArchivoPendiente[]>([]);

  const upd = (patch: Partial<ProductoPapelForm>) => setForm(prev => ({ ...prev, ...patch }));
  const updSuaje = (patch: any) => upd({ suaje: { ...form.suaje, ...patch } });
  const updAcabados = (patch: any) => upd({ acabados: { ...form.acabados, ...patch } });
  const updMaq = (patch: any) => upd({ maquinaria: { ...form.maquinaria, ...patch } });

  const contRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let activo = true;

    setCargandoCostoMetro(true);
    getCostoMetroLaminado()
      .then((data) => {
        if (!activo) return;
        const costo = Number(data.costo);
        if (!Number.isFinite(costo) || costo < 0) {
          throw new Error("El costo del laminado no es válido");
        }
        setCostoMetroLaminado(costo);
        setErrorCostoLaminado("");
      })
      .catch((error: any) => {
        if (!activo) return;
        setCostoMetroLaminado(null);
        setErrorCostoLaminado(
          error?.response?.data?.error ||
          error?.message ||
          "No se pudo cargar el costo del laminado"
        );
      })
      .finally(() => {
        if (activo) setCargandoCostoMetro(false);
      });

    return () => {
      activo = false;
    };
  }, []);

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

  // ── Validación de duplicados (descripción + medida) delegada al backend ──
  // El backend (crearProductoPapel / actualizarProductoPapel) responde 409
  // cuando ya existe un producto activo con la misma descripción y medida.
  // Aquí solo se captura ese error y se muestra al usuario sin tronar la app.
  const [errorDuplicado, setErrorDuplicado] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorDuplicado(null);
    try {
      const costoParaGuardar = tieneDatosLaminado
        ? costoLaminadoCalculado ?? form.costoLaminado ?? null
        : null;

      await onSave(
        {
          ...form,
          costoLaminado: costoParaGuardar,
        },
        pendientesRef.current
      );
    } catch (err: any) {
      const msg = err?.message || "Ya existe un producto registrado con esa descripción y medida.";
      setErrorDuplicado(msg);
    }
  };


  // En useCatalogosPapel, `names` es un Record<CatKey, string[]>;
  // no es una función. Este helper evita el error:
  // "Record<CatKey, string[]> has no call signatures".
  const namesOf = (key: CatKey): string[] => {
    const lista = (names as any)?.[key];
    return Array.isArray(lista) ? lista : [];
  };

  const catalogItems = <T = any,>(key: CatKey): T[] => {
    const lista = (catalogs as any)?.[key];
    return Array.isArray(lista) ? lista : [];
  };

  const nombrePor = (key: CatKey, id: number | null) =>
    id ? catalogItems<any>(key).find((i: any) => i.id === id)?.nombre ?? "" : "";

  const labelConMedida = (item: { nombre: string; medida?: string }) =>
    item.medida ? `${item.nombre} -- ${item.medida}` : item.nombre;

  const namesMedida = (key: CatKey) =>
    catalogItems<any>(key).map((i: any) => labelConMedida(i));

  const puntosItems = catalogItems<{ id: number; nombre: string; puntos?: number }>("puntos" as CatKey);

  const rolloLaminadoSeleccionado = catalogItems<{
    id: number;
    nombre: string;
    medida_ancho?: number;
  }>("rollo_lam" as CatKey).find(
    item => item.id === form.acabados.idrollo_lam
  );

  const anchoRolloLaminadoCm = useMemo(() => {
    const medida = Number(rolloLaminadoSeleccionado?.medida_ancho);
    return Number.isFinite(medida) && medida > 0 ? medida : null;
  }, [rolloLaminadoSeleccionado?.medida_ancho]);

  const costoLaminadoCalculado = useMemo(
    () => calcularCostoLaminado({
      rolloCentimetros: anchoRolloLaminadoCm,
      desarrolloCentimetros: form.acabados.desarrolloLaminado,
      costoMetro: costoMetroLaminado,
    }),
    [
      anchoRolloLaminadoCm,
      form.acabados.desarrolloLaminado,
      costoMetroLaminado,
    ]
  );

  const desarrolloLaminadoNumero = Number(
    form.acabados.desarrolloLaminado.replace(",", ".")
  );

  const tieneDatosLaminado =
    anchoRolloLaminadoCm !== null &&
    Number.isFinite(desarrolloLaminadoNumero) &&
    desarrolloLaminadoNumero > 0;

  const costoLaminadoMostrado = tieneDatosLaminado
    ? costoLaminadoCalculado ?? form.costoLaminado ?? null
    : null;

  const sublbl: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, color: "#9CA3AF",
    marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase",
    paddingBottom: 4, borderBottom: "1px dashed #E5E7EB",
  };


  return (
    <div ref={contRef} style={{ maxWidth: "100%", margin: "0 auto", padding: "16px", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#111827" }}>

      {/* Barra de acciones fija — arriba a la izquierda */}
      <div style={{
        position: "sticky",
        top: topOffset,
        zIndex: 20,
        display: "flex",
        justifyContent: "flex-start",
        gap: 8,
        background: "#fff",
        padding: "10px 16px",
        margin: "-16px -16px 16px -16px",
        borderBottom: "1px solid #E5E7EB",
        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
      }}>

        <button onClick={onCancel} disabled={saving} style={{ height: 36, padding: "0 18px", border: "1px solid #D1D5DB", borderRadius: 7, background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
          ← Regresar
        </button>
        <button onClick={handleSubmit} disabled={saving} style={{ height: 36, padding: "0 20px", border: "none", borderRadius: 7, background: saving ? "#93C5FD" : "#1D4ED8", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>
          {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Registrar producto"}
        </button>
        {errorDuplicado && (
          <span style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 600, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "0 10px", height: 36 }}>
            {errorDuplicado}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, marginBottom: 10 }}>
        <Sec title="Tipo de producto" colorKey="tipo">
          <FG cols={2} gap="6px 8px">
            <Field label="Tipo">
              <SelConAlta catKey="tipo_producto" options={namesOf("tipo_producto")} value={form.tipoProductoNombre}
                onChange={(v) => { const item = catalogItems<any>("tipo_producto" as CatKey).find(i => i.nombre === v); upd({ tipoProductoNombre: v, idcat_tipo_producto_papel: item?.id ?? null }); }}
                onAdd={addItem} />
            </Field>
            {/* NUEVO: Tamaño del producto — ahora es FK a cat_tamano_producto
                (mismo catálogo que la matriz de costos en Precios/Acabados).
                Se guarda en form.idcat_tamano_producto y viaja a
                producto_papel.tamano_prod. Ya no es un desplegable fijo. */}
            <Field label="Tamaño">
              <select
                value={form.idcat_tamano_producto ?? ""}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const item = tamanosProducto.find(t => t.id === id);
                  upd({ idcat_tamano_producto: id, tamanoProdNombre: item?.nombre ?? "" });
                }}
                style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: form.idcat_tamano_producto ? "#111827" : "#9CA3AF", background: "#fff", outline: "none", boxSizing: "border-box", cursor: "pointer" }}
              >
                <option value="" style={{ color: "#9CA3AF" }}>Selecciona...</option>
                {tamanosProducto.filter(t => t.activo).map(t => (
                  <option key={t.id} value={t.id} style={{ color: "#111827" }}>{t.nombre}</option>
                ))}
              </select>
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

        <Sec title="Tipo de papel" colorKey="tipo" action={
          <button onClick={addGrupo} disabled={form.grupos[form.grupos.length - 1]?.materiales.length === 0}
            title={form.grupos[form.grupos.length - 1]?.materiales.length === 0 ? "Agrega al menos un material al grupo actual" : ""}
            style={{ padding: "0 12px", height: 28, background: form.grupos[form.grupos.length - 1]?.materiales.length === 0 ? "#E5E7EB" : "#1D4ED8", border: "none", borderRadius: 5, cursor: form.grupos[form.grupos.length - 1]?.materiales.length === 0 ? "not-allowed" : "pointer", color: form.grupos[form.grupos.length - 1]?.materiales.length === 0 ? "#9CA3AF" : "#fff", fontSize: 13, fontWeight: 600 }}>+ Opciones</button>
        }>
          {form.grupos.map((g, i) => (
            <GrupoBlock key={g.id} grupo={g} grupoIndex={i} totalGrupos={form.grupos.length}
              onUpdate={updateGrupo} onRemove={() => removeGrupo(g.id)}
              catTipoPapel={namesOf("tipo_papel")} catCalibre={namesOf("calibre")}
              catTipoPapelItems={catalogItems("tipo_papel")} catCalibreItems={catalogItems("calibre")}
              onAdd={addItem}
              collapsed={expandedGrupoId !== g.id}
              onToggle={() => setExpandedGrupoId(expandedGrupoId === g.id ? null : g.id)} />
          ))}
        </Sec>
      </div>

      <Sec title="Suaje" colorKey="suaje">
        <FG cols={5} gap="6px 8px" style={{ marginBottom: 8 }}>
          <Field label="Numero">  <Inp value={form.suaje.numero} onChange={v => updSuaje({ numero: v })} /></Field>
          <Field label="PZS">     <Inp value={form.suaje.pzs} onChange={v => updSuaje({ pzs: v })} /></Field>
          <Field label="Tamaño">  <Inp value={form.suaje.tamano} onChange={v => updSuaje({ tamano: v })} /></Field>
          <Field label="mm (Corte y doblez)"><Inp value={form.suaje.metros} onChange={v => updSuaje({ metros: v })} /></Field>
          <Field label="Matrix">
            <SelConAlta catKey="matrix" options={namesOf("matrix")} value={form.suaje.matrix}
              onChange={(v) => { const item = catalogItems<any>("matrix" as CatKey).find(i => i.nombre === v); updSuaje({ matrix: v, idcat_matrix: item?.id ?? null }); }}
              onAdd={addItem} />
          </Field>
        </FG>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 1fr 72px 1fr", gap: "0 10px", marginBottom: 10 }}>
          <Field label="Corte">
            <SelConAlta catKey={"cortes" as CatKey}
              options={((catalogs as any).cortes ?? []).map((i: any) => labelCorteDoble(i))}
              value={form.suaje.corte1Tipo ? labelCorteDoble({ nombre: form.suaje.corte1Tipo, altura: form.suaje.corte1Medida }) : ""}
              onChange={(v) => {
                const item = ((catalogs as any).cortes ?? []).find((i: any) => labelCorteDoble(i) === v);
                const punto = item?.idcat_punto ? puntosItems.find(p => p.id === item.idcat_punto) : undefined;
                updSuaje({ corte1Tipo: item?.nombre ?? v, corte1Medida: item?.altura ?? "", idcat_corte: item?.id ?? null, idcat_punto_corte: punto?.id ?? null, puntosCorte: punto ? String(punto.puntos ?? punto.nombre) : "" });
              }}
              onAdd={addItem} placeholder="" />
          </Field>
          <Field label="Puntos">
            <PuntosSelect idSel={form.suaje.idcat_punto_corte} items={puntosItems}
              onSel={(idP, txt) => updSuaje({ idcat_punto_corte: idP, puntosCorte: txt })} />
          </Field>
          <Field label="Dobles">
            <SelConAlta catKey={"dobles" as CatKey}
              options={((catalogs as any).dobles ?? []).map((i: any) => labelCorteDoble(i))}
              value={form.suaje.dobles1Tipo ? labelCorteDoble({ nombre: form.suaje.dobles1Tipo, altura: form.suaje.dobles1Medida }) : ""}
              onChange={(v) => {
                const item = ((catalogs as any).dobles ?? []).find((i: any) => labelCorteDoble(i) === v);
                const punto = item?.idcat_punto ? puntosItems.find(p => p.id === item.idcat_punto) : undefined;
                updSuaje({ dobles1Tipo: item?.nombre ?? v, dobles1Medida: item?.altura ?? "", idcat_doble: item?.id ?? null, idcat_punto_doble: punto?.id ?? null, puntosDoble: punto ? String(punto.puntos ?? punto.nombre) : "" });
              }}
              onAdd={addItem} placeholder="" />
          </Field>
          <Field label="Puntos">
            <PuntosSelect idSel={form.suaje.idcat_punto_doble} items={puntosItems}
              onSel={(idP, txt) => updSuaje({ idcat_punto_doble: idP, puntosDoble: txt })} />
          </Field>
          <Field label="T. arreglo (min)">
            <Inp value={form.suaje.tiempoArreglo} onChange={v => updSuaje({ tiempoArreglo: v })} />
          </Field>
        </div>

        <div>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", display: "block", marginBottom: 6 }}>Especiales</span>
          <div style={{ display: "grid", gridTemplateColumns: "auto minmax(120px, 1fr) 64px auto minmax(120px, 1fr) 64px", gap: "0 8px", alignItems: "end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", whiteSpace: "nowrap", paddingBottom: 10 }}>Sacabocado</span>
            <div>
              <SelConAlta catKey="sacabocados" options={namesMedida("sacabocados")} value={form.suaje.sacabocadoNombre}
                onChange={(v) => { const item = catalogItems<any>("sacabocados").find((i: any) => labelConMedida(i) === v); updSuaje({ sacabocadoNombre: v, idcat_sacabocados: item?.id ?? null }); }}
                onAdd={addItem} placeholder="" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#9CA3AF", marginBottom: 3, letterSpacing: "0.05em", textTransform: "uppercase" }}>Cant.</label>
              <input type="text" inputMode="numeric" value={form.suaje.cantidad_sacabocado}
                onChange={e => updSuaje({ cantidad_sacabocado: e.target.value })}
                style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", whiteSpace: "nowrap", marginLeft: 8, paddingBottom: 10 }}>Perforado</span>
            <div>
              <SelConAlta catKey="perforado" options={namesMedida("perforado")} value={form.suaje.perforadoNombre}
                onChange={(v) => { const item = catalogItems<any>("perforado").find((i: any) => labelConMedida(i) === v); updSuaje({ perforadoNombre: v, idcat_perforado: item?.id ?? null }); }}
                onAdd={addItem} placeholder="" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#9CA3AF", marginBottom: 3, letterSpacing: "0.05em", textTransform: "uppercase" }}>Cant.</label>
              <input type="text" inputMode="numeric" value={form.suaje.cantidad_perforado}
                onChange={e => updSuaje({ cantidad_perforado: e.target.value })}
                style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "8px 12px", background: form.suaje.herramentalDesbarbe ? "#EFF6FF" : "#F9FAFB", border: `1px solid ${form.suaje.herramentalDesbarbe ? "#BFDBFE" : "#E5E7EB"}`, borderRadius: 6, transition: "all 0.15s ease" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={form.suaje.herramentalDesbarbe}
              onChange={e => updSuaje({ herramentalDesbarbe: e.target.checked, noDesbarbe: e.target.checked ? form.suaje.noDesbarbe : "" })}
              style={{ width: 16, height: 16, accentColor: "#1D4ED8", cursor: "pointer", margin: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: form.suaje.herramentalDesbarbe ? "#1D4ED8" : "#374151", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Herramental desbarbe
            </span>
          </label>
          {form.suaje.herramentalDesbarbe && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>No. desbarbe</label>
              <input type="text" value={form.suaje.noDesbarbe}
                onChange={e => updSuaje({ noDesbarbe: e.target.value.toUpperCase() })}
                style={{ width: 120, height: 30, padding: "0 8px", border: "1px solid #BFDBFE", borderRadius: 5, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>
          )}
        </div>
      </Sec>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.4fr 1fr", gap: 10, marginBottom: 10 }}>
        <Sec title="Pegado y acabados" colorKey="acabados">
          <FG cols={2} gap="6px 8px" style={{ alignItems: "start" }}>
            <Field label="Tipo de pegado">
              <SelConAlta catKey="tipo_pegado" options={namesOf("tipo_pegado")}
                value={nombrePor("tipo_pegado", form.acabados.idcat_tipo_pegado)}
                onChange={(v) => { const item = catalogItems<any>("tipo_pegado" as CatKey).find(i => i.nombre === v); updAcabados({ idcat_tipo_pegado: item?.id ?? null }); }}
                onAdd={addItem} />
            </Field>
            <Field label="Pegamento">
              <SelConAlta catKey="pegamento" options={namesOf("pegamento")}
                value={nombrePor("pegamento", form.acabados.idcat_pegamento)}
                onChange={(v) => { const item = catalogItems<any>("pegamento" as CatKey).find(i => i.nombre === v); updAcabados({ idcat_pegamento: item?.id ?? null }); }}
                onAdd={addItem} />
            </Field>
            <Field label="Asa">
              <AsaMultiSelect selectedIds={form.acabados.asas} selectedNames={form.acabados.asasNombres}
                catItems={catalogs?.tipo_asa ?? []}
                onChange={(ids, nombres) => updAcabados({ asas: ids, asasNombres: nombres })}
                onAdd={addItem} />
            </Field>
            <Field label="Laminado">
              <AsaMultiSelect selectedIds={form.acabados.laminados} selectedNames={form.acabados.laminadosNombres}
                catItems={catalogs?.laminado ?? []}
                onChange={(ids, nombres) => updAcabados({ laminados: ids, laminadosNombres: nombres })}
                onAdd={addItem} catKeyForAdd={"laminado" as CatKey} />
            </Field>
            {/* NUEVO: Rollo de laminado a utilizar — selección única (no
                multi-select como Laminado), porque se usa como base para
                los cálculos de rendimiento/corte. Guarda idrollo_lam en acabados_papel y toma el ancho numérico
                desde rollo_lam.medida_ancho. El usuario captura solo el ancho (ej.
                "38.5") al dar de alta uno nuevo; el backend arma el
                nombre final ("38.5 cm") — ver catalogos_papel.controller.ts. */}
            <Field label="Rollo de laminado">
              <SelConAlta catKey={"rollo_lam" as CatKey} options={namesOf("rollo_lam" as CatKey)}
                value={nombrePor("rollo_lam" as CatKey, form.acabados.idrollo_lam)}
                onChange={(v) => { const item = catalogItems<any>("rollo_lam" as CatKey).find(i => i.nombre === v); updAcabados({ idrollo_lam: item?.id ?? null, rolloLamNombre: v }); }}
                onAdd={addItem} placeholder="" />
            </Field>
            {/* NUEVO: Desarrollo para laminado — captura libre (no viene de
                catálogo), lo escribe quien da de alta el producto. Se usa
                después en el cálculo de la orden de producción. Viaja como
                acabados_papel.desarrollo_laminado. */}
            <Field label="Desarrollo de laminado">
              <input type="text" inputMode="decimal" value={form.acabados.desarrolloLaminado}
                onChange={e => {
                  // Solo dígitos y un único punto decimal — se limpia
                  // cualquier otro carácter antes de guardarlo en el form.
                  let v = e.target.value.replace(/[^0-9.]/g, "");
                  const partes = v.split(".");
                  if (partes.length > 2) v = `${partes[0]}.${partes.slice(1).join("")}`;
                  updAcabados({ desarrolloLaminado: v });
                }}
                style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
            </Field>
            <Field label="Costo de laminado" style={{ gridColumn: "span 2" }}>
              <div style={{
                height: 34,
                padding: "0 10px",
                border: `1px solid ${errorCostoLaminado ? "#FCA5A5" : "#BFDBFE"}`,
                borderRadius: 6,
                background: errorCostoLaminado ? "#FEF2F2" : "#EFF6FF",
                display: "flex",
                alignItems: "center",
                boxSizing: "border-box",
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: errorCostoLaminado ? "#B91C1C" : "#1E3A8A" }}>
                  {cargandoCostoMetro
                    ? "Cargando..."
                    : errorCostoLaminado
                      ? errorCostoLaminado
                      : costoLaminadoMostrado !== null
                        ? formatearCostoLaminado(costoLaminadoMostrado)
                        : "—"}
                </span>
              </div>
            </Field>
            {/* NUEVO: Tamaño de asa — se captura UNA sola vez, aquí, al dar
                de alta el producto. Este valor es el que se usará como
                default en pedidos/cotizaciones (ya NO se vuelve a pedir
                en FormularioProductoPapel.tsx). Viaja en form.tamanoAsaDefault,
                que ya se envía a crearProductoPapel/actualizarProductoPapel
                y ya se lee del lado del pedido como tamano_asa_default. */}
            <Field label="Tamaño de asa" style={{ gridColumn: "span 2" }}>
              <Inp
                value={form.tamanoAsaDefault ?? ""}
                onChange={v => upd({ tamanoAsaDefault: v })}
              />
            </Field>
          </FG>
        </Sec>

        <Sec title="Refuerzo y base" colorKey="acabados">
          <div style={{ marginBottom: 10 }}>
            <label style={sublbl}>Refuerzo</label>
            <FG cols={2} gap="5px 6px">
              <Field label="Material">
                <SelConAlta catKey="refuerzo_material" options={namesOf("refuerzo_material")}
                  value={nombrePor("refuerzo_material", form.acabados.idcat_refuerzo_material)}
                  onChange={(v) => { const item = catalogItems<any>("refuerzo_material" as CatKey).find(i => i.nombre === v); updAcabados({ idcat_refuerzo_material: item?.id ?? null }); }}
                  onAdd={addItem} placeholder="" />
              </Field>
              <Field label="Medida">
                <SelConAlta catKey="refuerzo_medidas" options={namesOf("refuerzo_medidas")}
                  value={form.acabados.refuerzoMedidaNombre}
                  onChange={(v) => { const item = catalogItems<any>("refuerzo_medidas" as CatKey).find(i => i.nombre === v); updAcabados({ refuerzoMedidaNombre: v, idcat_refuerzo_medidas: item?.id ?? null }); }}
                  onAdd={addItem} placeholder="" />
              </Field>
            </FG>
          </div>
          <div>
            <label style={sublbl}>Base</label>
            <FG cols={2} gap="5px 6px">
              <Field label="Material">
                <SelConAlta catKey="refuerzo_material" options={namesOf("refuerzo_material")}
                  value={nombrePor("refuerzo_material", form.acabados.idcat_base_material)}
                  onChange={(v) => { const item = catalogItems<any>("refuerzo_material" as CatKey).find(i => i.nombre === v); updAcabados({ idcat_base_material: item?.id ?? null }); }}
                  onAdd={addItem} placeholder="" />
              </Field>
              <Field label="Medida (auto)"><Inp value={form.acabados.base_medida} readOnly /></Field>
            </FG>
          </div>
        </Sec>

        <Sec title="Empaque" colorKey="acabados">
          <FG cols={1} gap="6px 0">
            <Field label="Tipo de empaque">
              <SelConAlta catKey="empaque" options={namesOf("empaque")}
                value={nombrePor("empaque", form.acabados.idcat_empaque)}
                onChange={(v) => { const item = catalogItems<any>("empaque" as CatKey).find(i => i.nombre === v); updAcabados({ idcat_empaque: item?.id ?? null }); }}
                onAdd={addItem} />
            </Field>
            <Field label="Piezas por caja">
              <Inp value={form.acabados.pzs_caja} onChange={v => updAcabados({ pzs_caja: v })} />
            </Field>
          </FG>
        </Sec>
      </div>

      <Sec title="Maquinaria" colorKey="maquinaria">
        <FG cols={6} gap="6px 10px" style={{ marginBottom: 8, alignItems: "start" }}>
          <Field label="Hojeadora">
            <MaquinariaSelectPorTipo
              tipoMaquina="hojeadora"
              label="Hojeadora"
              selectedIds={(form.maquinaria as any).hojeado_guillotina ?? []}
              selectedNames={(form.maquinaria as any).hojeado_guillotina_nombres ?? []}
              catItems={(catalogs?.["hojeado_guillotina" as CatKey] ?? []) as { id: number; nombre: string; tipo_maquina?: string | null; numero_maquina?: string | null }[]}
              onChange={(ids, nombres) => updMaq({ hojeado_guillotina: ids, hojeado_guillotina_nombres: nombres })}
            />
          </Field>
          <Field label="Guillotina">
            <MaquinariaSelectPorTipo
              tipoMaquina="guillotina"
              label="Guillotina"
              selectedIds={(form.maquinaria as any).hojeado_guillotina ?? []}
              selectedNames={(form.maquinaria as any).hojeado_guillotina_nombres ?? []}
              catItems={(catalogs?.["hojeado_guillotina" as CatKey] ?? []) as { id: number; nombre: string; tipo_maquina?: string | null; numero_maquina?: string | null }[]}
              onChange={(ids, nombres) => updMaq({ hojeado_guillotina: ids, hojeado_guillotina_nombres: nombres })}
            />
          </Field>
          {([
            ["impresora", "Impresora"],
            ["hs_ar", "Hs y AR"],
            ["suaje_maquina", "Suaje"],
            ["uv", "UV"],
          ] as [string, string][]).map(([key, label]) => (
            <Field key={key} label={label}>
              <MaquinariaSelectUnica catKey={key as CatKey}
                selectedIds={(form.maquinaria as any)[key] ?? []}
                selectedNames={(form.maquinaria as any)[`${key}_nombres`] ?? []}
                catItems={(catalogs?.[key as CatKey] ?? []) as { id: number; nombre: string; tipo_maquina?: string | null; numero_maquina?: string | null }[]}
                onChange={(ids, nombres) => updMaq({ [key]: ids, [`${key}_nombres`]: nombres })}
                onAdd={addItem} />
            </Field>
          ))}
        </FG>
        <FG cols={6} gap="6px 10px" style={{ alignItems: "start" }}>
          {([
            ["laminado_maquina", "Laminadora"],
            ["texturizadora", "Texturizadora"],
            ["empaque_maquina", "Empaque"],
            ["empalme", "Empalme"],
            ["armado", "Armado"],
            ["asas_maquina", "Fabricacion de asas"],
            ["desbarbe", "Desbarbe"],
          ] as [string, string][]).map(([key, label]) => (
            <Field key={key} label={label}>
              <MaquinariaSelectUnica catKey={key as CatKey}
                selectedIds={(form.maquinaria as any)[key] ?? []}
                selectedNames={(form.maquinaria as any)[`${key}_nombres`] ?? []}
                catItems={(catalogs?.[key as CatKey] ?? []) as { id: number; nombre: string; tipo_maquina?: string | null; numero_maquina?: string | null }[]}
                onChange={(ids, nombres) => updMaq({ [key]: ids, [`${key}_nombres`]: nombres })}
                onAdd={addItem} />
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