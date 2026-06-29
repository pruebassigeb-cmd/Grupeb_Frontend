import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import Dashboard from "../../layouts/Sidebar";
import type { CatKey, CatItem } from "../../types/papel/papel.types";
import { useCatalogosPapel } from "../../hooks/papel/useCatalogosPapel";
import FoilPanel from "./FoilPanel";

type TipoMaquinaHojeado = "hojeadora" | "guillotina";
type CatalogMap = Partial<Record<CatKey, CatItem[]>>;

type AddCatalogoFn = (
  key: CatKey,
  nombre: string,
  medida?: string,
  numeroMaquina?: string,
  altura?: string,
  idcatPunto?: number | null,
  tipoMaquina?: string | null
) => Promise<unknown>;

type EditCatalogoFn = (
  key: CatKey,
  id: number,
  nombre: string,
  medida?: string,
  numeroMaquina?: string,
  altura?: string,
  idcatPunto?: number | null,
  tipoMaquina?: string | null
) => Promise<unknown>;

interface TabConfig {
  key: CatKey | "refuerzoBase" | "foil";
  label: string;
  hasMedida: boolean;
  tieneNumMaquina?: boolean;
  icon: string;
  combined?: boolean;
  esCorte?: boolean;
  esDoble?: boolean;
  usaTipoMaquina?: boolean;
}

interface TabGroup { groupLabel: string; tabs: TabConfig[]; }

const TAB_GROUPS: TabGroup[] = [
  {
    groupLabel: "Producto",
    tabs: [
      { key: "tipo_producto", label: "Tipo de producto", hasMedida: false, icon: "📦" },
      { key: "tipo_papel", label: "Tipo de papel", hasMedida: false, icon: "📄" },
      { key: "calibre", label: "Calibre", hasMedida: false, icon: "📐" },
      { key: "tipo_pegado", label: "Tipo de pegado", hasMedida: false, icon: "🔧" },
      { key: "pegamento", label: "Pegamento", hasMedida: false, icon: "🧴" },
      { key: "tipo_asa", label: "Tipo de asa", hasMedida: false, icon: "🪢" },
      { key: "laminado", label: "Laminado", hasMedida: false, icon: "✨" },
      { key: "textura", label: "Textura", hasMedida: false, icon: "🟫" },
      { key: "refuerzoBase", label: "Refuerzo y base", hasMedida: false, icon: "🔩", combined: true },
      { key: "empaque", label: "Empaque", hasMedida: false, icon: "📫" },
      { key: "foil", label: "Foil", hasMedida: false, icon: "🌟" },
    ],
  },
  {
    groupLabel: "Especiales",
    tabs: [
      { key: "sacabocados", label: "Sacabocados", hasMedida: true, icon: "⭕" },
      { key: "perforado", label: "Perforado", hasMedida: true, icon: "🔵" },
      { key: "matrix", label: "Matrix", hasMedida: false, icon: "🔲" },
      { key: "cortes", label: "Cortes", hasMedida: false, icon: "✂️", esCorte: true },
      { key: "dobles", label: "Dobles", hasMedida: false, icon: "〰️", esDoble: true },
    ],
  },
  {
    groupLabel: "Maquinaria",
    tabs: [
      { key: "hojeado_guillotina", label: "Hojeado / Guillotina", hasMedida: false, tieneNumMaquina: true, usaTipoMaquina: true, icon: "✂️" },
      { key: "impresora", label: "Impresora", hasMedida: false, tieneNumMaquina: true, icon: "🖨️" },
      { key: "hs_ar", label: "HS y AR", hasMedida: false, tieneNumMaquina: true, icon: "⚙️" },
      { key: "suaje_maquina", label: "Suaje (máquina)", hasMedida: false, tieneNumMaquina: true, icon: "🗜️" },
      { key: "uv", label: "UV", hasMedida: false, tieneNumMaquina: true, icon: "🔆" },
      { key: "texturizadora" as CatKey, label: "Texturizadora", hasMedida: false, tieneNumMaquina: true, icon: "🧵" },
      { key: "laminado_maquina" as CatKey, label: "Laminadora", hasMedida: false, tieneNumMaquina: true, icon: "✨" },
      { key: "empalme", label: "Empalme", hasMedida: false, tieneNumMaquina: true, icon: "🔗" },
      { key: "armado", label: "Armado", hasMedida: false, tieneNumMaquina: true, icon: "🏗️" },
      { key: "asas_maquina", label: "Asas (máquina)", hasMedida: false, tieneNumMaquina: true, icon: "🔄" },
      { key: "desbarbe", label: "Desbarbe", hasMedida: false, tieneNumMaquina: true, icon: "🪚" },
      { key: "empaque_maquina" as CatKey, label: "Empaque (máquina)", hasMedida: false, tieneNumMaquina: true, icon: "📦" },
    ],
  },
];

const ALL_TABS: TabConfig[] = TAB_GROUPS.flatMap(g => g.tabs);

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#6B7280",
  marginBottom: 4,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const asText = (v: unknown): string => String(v ?? "");
const getItems = (catalogs: CatalogMap, key: CatKey): CatItem[] => catalogs?.[key] ?? [];

function Inp({ placeholder, value, onChange, style }: {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  style?: CSSProperties;
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%",
        height: 38,
        padding: "0 12px",
        border: "1px solid #D1D5DB",
        borderRadius: 7,
        fontSize: 13,
        color: "#111827",
        background: "#fff",
        outline: "none",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}

function Btn({ children, onClick, variant = "primary", small, disabled }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  small?: boolean;
  disabled?: boolean;
}) {
  const styles: Record<string, CSSProperties> = {
    primary: { background: "#1D4ED8", color: "#fff", border: "none" },
    secondary: { background: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB" },
    danger: { background: "#FEE2E2", color: "#DC2626", border: "none" },
    ghost: { background: "none", color: "#6B7280", border: "1px solid #E5E7EB" },
  };

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        height: small ? 30 : 38,
        padding: small ? "0 12px" : "0 18px",
        borderRadius: 7,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 360, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <p style={{ fontSize: 15, color: "#111827", margin: "0 0 20px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn variant="danger" onClick={onConfirm}>Eliminar</Btn>
        </div>
      </div>
    </div>
  );
}

function SacabocadosInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [num, setNum] = useState(value.replace(/ mm$/i, "").trim());
  const update = (n: string) => onChange(n ? `${n} mm` : "");

  return (
    <div style={{ display: "flex", height: 38, border: "1px solid #D1D5DB", borderRadius: 7, overflow: "hidden", background: "#fff" }}>
      <input type="text" inputMode="numeric" placeholder="ej: 3" value={num}
        onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ""); setNum(val); update(val); }}
        style={{ flex: 1, height: "100%", padding: "0 10px", border: "none", fontSize: 13, color: "#111827", outline: "none", background: "transparent" }} />
      <span style={{ height: "100%", padding: "0 10px", borderLeft: "1px solid #D1D5DB", background: "#F3F4F6", fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center" }}>mm</span>
    </div>
  );
}

function PerforadoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [val, setVal] = useState(value.replace(/ mm$/i, "").trim());
  const update = (v: string) => onChange(v ? `${v} mm` : "");

  return (
    <div style={{ display: "flex", height: 38, border: "1px solid #D1D5DB", borderRadius: 7, overflow: "hidden", background: "#fff" }}>
      <input type="text" inputMode="decimal" placeholder="ej: 6.35x6.35" value={val}
        onChange={e => { const cleaned = e.target.value.replace(/[^0-9.xX]/g, "").toUpperCase(); setVal(cleaned); update(cleaned); }}
        style={{ flex: 1, height: "100%", padding: "0 10px", border: "none", fontSize: 13, color: "#111827", outline: "none", background: "transparent" }} />
      <span style={{ height: "100%", padding: "0 10px", borderLeft: "1px solid #D1D5DB", background: "#F3F4F6", fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center" }}>mm</span>
    </div>
  );
}

function CalibreInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parseVal = (v: string) => {
    const m = v.match(/^([\d.,]*)(\s*(gms|pts|ect))?$/i);
    return { num: m?.[1] ?? "", unit: (m?.[3]?.toLowerCase() ?? "pts") as "pts" | "gms" | "ect" };
  };
  const parsed = parseVal(value);
  const [num, setNum] = useState(parsed.num);
  const [unit, setUnit] = useState<"pts" | "gms" | "ect">(parsed.unit);
  const update = (n: string, u: "pts" | "gms" | "ect") => onChange(n ? `${n}${u}` : "");

  return (
    <div style={{ display: "flex", height: 38, border: "1px solid #D1D5DB", borderRadius: 7, overflow: "hidden", background: "#fff" }}>
      <input type="text" inputMode="numeric" placeholder="ej: 14" value={num}
        onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ""); setNum(val); update(val, unit); }}
        style={{ flex: 1, height: "100%", padding: "0 10px", border: "none", fontSize: 13, color: "#111827", outline: "none", background: "transparent" }} />
      <select value={unit} onChange={e => { const u = e.target.value as "pts" | "gms" | "ect"; setUnit(u); update(num, u); }}
        style={{ height: "100%", padding: "0 8px", border: "none", borderLeft: "1px solid #D1D5DB", background: "#F3F4F6", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", outline: "none" }}>
        <option value="pts">pts</option>
        <option value="gms">gms</option>
        <option value="ect">ect</option>
      </select>
    </div>
  );
}

function TipoMaquinaSelect({ value, onChange }: { value: TipoMaquinaHojeado; onChange: (v: TipoMaquinaHojeado) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as TipoMaquinaHojeado)}
      style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid #D1D5DB", borderRadius: 7, fontSize: 13, color: "#111827", background: "#fff", outline: "none" }}>
      <option value="hojeadora">Hojeadora</option>
      <option value="guillotina">Guillotina</option>
    </select>
  );
}

function PulgadasInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const raw = value.replace(/"$/, "");
  return (
    <div style={{ display: "flex", height: 38, border: "1px solid #D1D5DB", borderRadius: 7, overflow: "hidden", background: "#fff" }}>
      <input type="text" inputMode="decimal" placeholder={placeholder ?? "ej: 0.937"} value={raw}
        onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ""); onChange(v ? `${v}"` : ""); }}
        style={{ flex: 1, height: "100%", padding: "0 10px", border: "none", fontSize: 13, color: "#111827", outline: "none", background: "transparent" }} />
      <span style={{ height: "100%", padding: "0 10px", borderLeft: "1px solid #D1D5DB", background: "#F3F4F6", fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center" }}>"</span>
    </div>
  );
}

function MmInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const raw = value.replace(/ mm$/, "");
  return (
    <div style={{ display: "flex", height: 38, border: "1px solid #D1D5DB", borderRadius: 7, overflow: "hidden", background: "#fff" }}>
      <input type="text" inputMode="decimal" placeholder={placeholder ?? "ej: 23.8"} value={raw}
        onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ""); onChange(v ? `${v} mm` : ""); }}
        style={{ flex: 1, height: "100%", padding: "0 10px", border: "none", fontSize: 13, color: "#111827", outline: "none", background: "transparent" }} />
      <span style={{ height: "100%", padding: "0 10px", borderLeft: "1px solid #D1D5DB", background: "#F3F4F6", fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center" }}>mm</span>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14, position: "relative" }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9CA3AF" }}>🔍</span>
      <input type="text" placeholder="Buscar…" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", height: 38, paddingLeft: 36, paddingRight: 12, border: "1px solid #D1D5DB", borderRadius: 7, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return <div style={{ padding: "10px 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>{children}</div>;
}

function EmptyRows({ search }: { search: string }) {
  return <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{search ? "Sin resultados." : "No hay registros aún."}</div>;
}

function Counter({ filtered, total }: { filtered: number; total: number }) {
  return <div style={{ marginTop: 10, textAlign: "right", fontSize: 12, color: "#9CA3AF" }}>{filtered} de {total} registro{total !== 1 ? "s" : ""}</div>;
}

function Actions({ verInactivos, editando, saving, onReactivar, onGuardar, onCancelar, onEditar, onEliminar }: {
  verInactivos?: boolean;
  editando: boolean;
  saving: boolean;
  onReactivar?: () => void;
  onGuardar: () => void;
  onCancelar: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", padding: "6px 0" }}>
      {verInactivos ? (
        <Btn variant="primary" small onClick={onReactivar}>↩ Reactivar</Btn>
      ) : editando ? (
        <>
          <Btn variant="primary" small onClick={onGuardar} disabled={saving}>{saving ? "…" : "✓ Guardar"}</Btn>
          <Btn variant="ghost" small onClick={onCancelar}>Cancelar</Btn>
        </>
      ) : (
        <>
          <Btn variant="secondary" small onClick={onEditar}>✎ Editar</Btn>
          <Btn variant="danger" small onClick={onEliminar}>× Eliminar</Btn>
        </>
      )}
    </div>
  );
}

function CorteDoblePanel({ tab, items, onAdd, onEdit, onDelete, onReactivar, verInactivos, loadingInactivos }: {
  tab: TabConfig & { key: CatKey };
  items: any[];
  onAdd?: (nombre: string, altura?: string) => Promise<unknown>;
  onEdit?: (id: number, nombre: string, altura?: string) => Promise<unknown>;
  onDelete?: (id: number) => Promise<unknown>;
  onReactivar?: (id: number) => Promise<unknown>;
  verInactivos?: boolean;
  loadingInactivos?: boolean;
}) {
  const campoLabel = tab.esCorte ? "Corte" : "Doble";
  const [search, setSearch] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newAltura, setNewAltura] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editAltura, setEditAltura] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = items.filter(it =>
    asText(it.nombre).toLowerCase().includes(search.toLowerCase()) ||
    asText(it.altura).toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!onAdd || !newNombre.trim()) return;
    setSaving(true);
    try {
      await onAdd(newNombre.trim(), newAltura.trim() || undefined);
      setNewNombre("");
      setNewAltura("");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (editId === null || !onEdit || !editNombre.trim()) return;
    setSaving(true);
    try {
      await onEdit(editId, editNombre.trim(), editAltura || undefined);
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null || !onDelete) return;
    await onDelete(deleteId);
    setDeleteId(null);
  };

  const startEdit = (item: any) => {
    setEditId(item.id);
    setEditNombre(item.nombre);
    setEditAltura(item.altura ?? "");
  };

  return (
    <div>
      {deleteId !== null && <ConfirmModal message="¿Eliminar este registro?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}

      {!verInactivos && (
        <div style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 9, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 12px" }}>Agregar nuevo</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0 10px", alignItems: "end" }}>
            <div><label style={labelStyle}>{campoLabel} (pulgadas)</label><PulgadasInput value={newNombre} onChange={setNewNombre} /></div>
            <div><label style={labelStyle}>Altura (mm)</label><MmInput value={newAltura} onChange={setNewAltura} /></div>
            <Btn variant="primary" onClick={handleAdd} disabled={saving}>{saving ? "…" : "+ Agregar"}</Btn>
          </div>
        </div>
      )}

      {verInactivos && (
        <div style={{ background: "#FEF2F2", border: "1px dashed #FECACA", borderRadius: 9, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 12, color: "#DC2626", fontWeight: 500 }}>{loadingInactivos ? "Cargando inactivos…" : "Registros desactivados — puedes reactivarlos."}</p>
        </div>
      )}

      <SearchBox value={search} onChange={setSearch} />
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["#", campoLabel, "Altura", ""].map((h, i) => <HeaderCell key={i}>{h}</HeaderCell>)}
        </div>
        {filtered.length === 0 ? <EmptyRows search={search} /> : filtered.map((item, idx) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr auto", padding: "0 16px", borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none", background: editId === item.id ? "#FFFBEB" : idx % 2 === 0 ? "#fff" : "#FAFAFA", alignItems: "center", minHeight: 48 }}>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{idx + 1}</span>
            {editId === item.id ? <div style={{ paddingRight: 8 }}><PulgadasInput value={editNombre} onChange={setEditNombre} /></div> : <span style={{ fontSize: 13, color: "#111827", fontFamily: "monospace" }}>{item.nombre}</span>}
            {editId === item.id ? <div style={{ paddingRight: 8 }}><MmInput value={editAltura} onChange={setEditAltura} /></div> : <span style={{ fontSize: 13, color: "#6B7280" }}>{item.altura ?? "—"}</span>}
            <Actions verInactivos={verInactivos} editando={editId === item.id} saving={saving} onReactivar={() => onReactivar?.(item.id)} onGuardar={handleEdit} onCancelar={() => setEditId(null)} onEditar={() => startEdit(item)} onEliminar={() => setDeleteId(item.id)} />
          </div>
        ))}
      </div>
      <Counter filtered={filtered.length} total={items.length} />
    </div>
  );
}

function CatPanel({ tab, items, onAdd, onEdit, onDelete, onReactivar, verInactivos, loadingInactivos }: {
  tab: TabConfig & { key: CatKey };
  items: CatItem[];
  onAdd?: (nombre: string, medida?: string, numeroMaquina?: string, tipoMaquina?: TipoMaquinaHojeado) => Promise<unknown>;
  onEdit?: (id: number, nombre: string, medida?: string, numeroMaquina?: string, tipoMaquina?: TipoMaquinaHojeado) => Promise<unknown>;
  onDelete?: (id: number) => Promise<unknown>;
  onReactivar?: (id: number) => Promise<unknown>;
  verInactivos?: boolean;
  loadingInactivos?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newMedida, setNewMedida] = useState("");
  const [newNumMaquina, setNewNumMaquina] = useState("");
  const [newTipoMaquina, setNewTipoMaquina] = useState<TipoMaquinaHojeado>("hojeadora");
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editMedida, setEditMedida] = useState("");
  const [editNumMaquina, setEditNumMaquina] = useState("");
  const [editTipoMaquina, setEditTipoMaquina] = useState<TipoMaquinaHojeado>("hojeadora");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [addKey, setAddKey] = useState(0);

  const usaTipoMaquina = tab.usaTipoMaquina === true || tab.key === "hojeado_guillotina";

  const filtered = (() => {
    const base = items.filter((it: any) =>
      asText(it.nombre).toLowerCase().includes(search.toLowerCase()) ||
      asText(it.medida).toLowerCase().includes(search.toLowerCase()) ||
      asText(it.numero_maquina).toLowerCase().includes(search.toLowerCase()) ||
      asText(it.tipo_maquina).toLowerCase().includes(search.toLowerCase())
    );
    if (tab.key !== "calibre") return base;
    const pts = base.filter(it => asText(it.nombre).toLowerCase().endsWith("pts")).sort((a, b) => parseInt(asText(a.nombre)) - parseInt(asText(b.nombre)));
    const gms = base.filter(it => asText(it.nombre).toLowerCase().endsWith("gms")).sort((a, b) => parseInt(asText(a.nombre)) - parseInt(asText(b.nombre)));
    const ect = base.filter(it => asText(it.nombre).toLowerCase().endsWith("ect")).sort((a, b) => parseInt(asText(a.nombre)) - parseInt(asText(b.nombre)));
    const otros = base.filter(it => { const l = asText(it.nombre).toLowerCase(); return !l.endsWith("pts") && !l.endsWith("gms") && !l.endsWith("ect"); });
    return [...pts, ...gms, ...ect, ...otros];
  })();

  const limpiarNuevo = () => {
    setNewNombre("");
    setNewMedida("");
    setNewNumMaquina("");
    setNewTipoMaquina("hojeadora");
    setAddKey(k => k + 1);
  };

  const handleAdd = async () => {
    if (!onAdd) return;
    const esFijo = tab.key === "sacabocados" || tab.key === "perforado";
    if (esFijo) {
      if (!newNombre.trim()) return;
      const nombreFinal = tab.key === "sacabocados" ? "Sacabocado" : "Perforación";
      setSaving(true);
      try { await onAdd(nombreFinal, newNombre.trim()); limpiarNuevo(); }
      finally { setSaving(false); }
      return;
    }
    const nombreFinal = newNombre.trim();
    if (!nombreFinal) return;
    setSaving(true);
    try {
      await onAdd(nombreFinal, tab.hasMedida ? newMedida.trim() : undefined, tab.tieneNumMaquina ? newNumMaquina.trim() : undefined, usaTipoMaquina ? newTipoMaquina : undefined);
      limpiarNuevo();
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (editId === null || !onEdit) return;
    const esFijo = tab.key === "sacabocados" || tab.key === "perforado";
    if (esFijo) {
      if (!editMedida.trim()) return;
      const medidaFinal = editMedida.trim().toLowerCase().endsWith("mm") ? editMedida.trim() : `${editMedida.trim()} mm`;
      setSaving(true);
      try { await onEdit(editId, editNombre.trim(), medidaFinal); setEditId(null); }
      finally { setSaving(false); }
      return;
    }
    if (!editNombre.trim()) return;
    setSaving(true);
    try {
      await onEdit(editId, editNombre.trim(), tab.hasMedida ? editMedida.trim() : undefined, tab.tieneNumMaquina ? editNumMaquina.trim() : undefined, usaTipoMaquina ? editTipoMaquina : undefined);
      setEditId(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (deleteId === null || !onDelete) return;
    await onDelete(deleteId);
    setDeleteId(null);
  };

  const startEdit = (item: CatItem) => {
    const itemAny = item as any;
    setEditId(item.id);
    setEditNombre(item.nombre);
    setEditNumMaquina(item.numero_maquina ?? "");
    const medida = item.medida ?? "";
    setEditMedida((tab.key === "sacabocados" || tab.key === "perforado") && medida && !medida.toLowerCase().endsWith(" mm") ? `${medida} mm` : medida);
    setEditTipoMaquina(itemAny.tipo_maquina === "guillotina" ? "guillotina" : "hojeadora");
  };

  const placeholderMedida = tab.key === "sacabocados" ? "ej: 3 mm" : tab.key === "perforado" ? "ej: 6.35x6.35 mm" : "Medida…";
  const colLabel = tab.key === "refuerzo_medidas" ? "Medida" : tab.key === "sacabocados" ? "Sacabocado" : tab.key === "perforado" ? "Perforación" : "Nombre";
  const esFijoTab = tab.key === "sacabocados" || tab.key === "perforado";
  const formCols = esFijoTab ? "1fr auto" : tab.tieneNumMaquina && usaTipoMaquina ? "1fr 120px 140px auto" : tab.tieneNumMaquina ? "1fr 120px auto" : tab.hasMedida ? "1fr 1fr auto" : "1fr auto";
  const gridCols = tab.hasMedida ? "40px 1fr 1fr auto" : tab.tieneNumMaquina && usaTipoMaquina ? "40px 1fr 100px 120px auto" : tab.tieneNumMaquina ? "40px 1fr 100px auto" : "40px 1fr auto";
  const headers = ["#", colLabel, ...(tab.hasMedida ? ["Medida"] : []), ...(tab.tieneNumMaquina ? ["N° Máquina"] : []), ...(usaTipoMaquina ? ["Tipo"] : []), ""];

  return (
    <div>
      {deleteId !== null && <ConfirmModal message="¿Eliminar este registro? Esta acción no se puede deshacer." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}

      {!verInactivos && (
        <div key={addKey} style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 9, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 12px" }}>Agregar nuevo</p>
          <div style={{ display: "grid", gridTemplateColumns: formCols, gap: "0 10px", alignItems: "end" }}>
            {!esFijoTab && (
              <div>
                <label style={labelStyle}>{colLabel}</label>
                {tab.key === "calibre" ? <CalibreInput value={newNombre} onChange={setNewNombre} /> : <Inp placeholder={tab.key === "refuerzo_medidas" ? "ej: 10x10 cm" : tab.key === "matrix" ? "ej: 0.5 x 1.5" : "Nombre…"} value={newNombre} onChange={setNewNombre} />}
              </div>
            )}
            {(esFijoTab || tab.hasMedida) && (
              <div>
                <label style={labelStyle}>Medida</label>
                {tab.key === "sacabocados" ? <SacabocadosInput value={newNombre} onChange={setNewNombre} /> : tab.key === "perforado" ? <PerforadoInput value={newNombre} onChange={setNewNombre} /> : <Inp placeholder={placeholderMedida} value={newMedida} onChange={setNewMedida} />}
              </div>
            )}
            {tab.tieneNumMaquina && <div><label style={labelStyle}>N° Máquina</label><Inp placeholder="ej: 1.2" value={newNumMaquina} onChange={setNewNumMaquina} /></div>}
            {usaTipoMaquina && <div><label style={labelStyle}>Tipo</label><TipoMaquinaSelect value={newTipoMaquina} onChange={setNewTipoMaquina} /></div>}
            <Btn variant="primary" onClick={handleAdd} disabled={saving}>{saving ? "…" : "+ Agregar"}</Btn>
          </div>
        </div>
      )}

      {verInactivos && (
        <div style={{ background: "#FEF2F2", border: "1px dashed #FECACA", borderRadius: 9, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 12, color: "#DC2626", fontWeight: 500 }}>{loadingInactivos ? "Cargando inactivos…" : "Registros desactivados — puedes reactivarlos."}</p>
        </div>
      )}

      <SearchBox value={search} onChange={setSearch} />
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {headers.map((h, i) => <HeaderCell key={i}>{h}</HeaderCell>)}
        </div>
        {filtered.length === 0 ? <EmptyRows search={search} /> : filtered.map((item: CatItem, idx: number) => {
          const itemAny = item as any;
          const tipoActual: TipoMaquinaHojeado = itemAny.tipo_maquina === "guillotina" ? "guillotina" : "hojeadora";
          return (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: gridCols, padding: "0 16px", borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none", background: editId === item.id ? "#FFFBEB" : idx % 2 === 0 ? "#fff" : "#FAFAFA", alignItems: "center", minHeight: 48 }}>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{idx + 1}</span>
              {editId === item.id ? <div style={{ paddingRight: 8 }}>{tab.key === "calibre" ? <CalibreInput value={editNombre} onChange={setEditNombre} /> : <Inp value={editNombre} onChange={setEditNombre} />}</div> : <span style={{ fontSize: 13, color: "#111827" }}>{item.nombre}</span>}
              {tab.hasMedida && (editId === item.id ? <div style={{ paddingRight: 8 }}><Inp value={editMedida} onChange={setEditMedida} /></div> : <span style={{ fontSize: 13, color: "#6B7280" }}>{item.medida ?? "—"}</span>)}
              {tab.tieneNumMaquina && (editId === item.id ? <div style={{ paddingRight: 8 }}><Inp value={editNumMaquina} onChange={setEditNumMaquina} /></div> : <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "monospace" }}>{item.numero_maquina ?? "—"}</span>)}
              {usaTipoMaquina && (editId === item.id ? <div style={{ paddingRight: 8 }}><TipoMaquinaSelect value={editTipoMaquina} onChange={setEditTipoMaquina} /></div> : <span style={{ display: "inline-flex", width: "fit-content", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: tipoActual === "guillotina" ? "#FEF3C7" : "#DBEAFE", color: tipoActual === "guillotina" ? "#92400E" : "#1E40AF", textTransform: "capitalize" }}>{tipoActual === "guillotina" ? "Guillotina" : "Hojeadora"}</span>)}
              <Actions verInactivos={verInactivos} editando={editId === item.id} saving={saving} onReactivar={() => onReactivar?.(item.id)} onGuardar={handleEdit} onCancelar={() => setEditId(null)} onEditar={() => startEdit(item)} onEliminar={() => setDeleteId(item.id)} />
            </div>
          );
        })}
      </div>
      <Counter filtered={filtered.length} total={items.length} />
    </div>
  );
}

function RefuerzoBasePanel({ catalogs, addItem, editItem, deleteItem, reactivarItem, verInactivos, loadingInactivos }: {
  catalogs: CatalogMap;
  addItem: AddCatalogoFn;
  editItem: EditCatalogoFn;
  deleteItem: (key: CatKey, id: number) => Promise<unknown>;
  reactivarItem: (key: CatKey, id: number) => Promise<unknown>;
  verInactivos: boolean;
  loadingInactivos?: boolean;
}) {
  const [activeSection, setActiveSection] = useState<"medidas" | "material">("medidas");
  const sections = [
    { key: "medidas" as const, label: "Medidas", icon: "📏", catKey: "refuerzo_medidas" as CatKey, count: getItems(catalogs, "refuerzo_medidas" as CatKey).length },
    { key: "material" as const, label: "Material", icon: "🧱", catKey: "refuerzo_material" as CatKey, count: getItems(catalogs, "refuerzo_material" as CatKey).length },
  ];
  const active = sections.find(s => s.key === activeSection)!;
  const tab: TabConfig & { key: CatKey } = { key: active.catKey, label: active.label, hasMedida: false, icon: active.icon };

  return (
    <div>
      <div style={{ display: "flex", border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden", marginBottom: 18 }}>
        {sections.map(s => {
          const selected = activeSection === s.key;
          return (
            <button key={s.key} type="button" onClick={() => setActiveSection(s.key)}
              style={{ flex: 1, height: 42, border: "none", borderRight: s.key === "medidas" ? "1px solid #E5E7EB" : "none", background: selected ? "#1D4ED8" : "#F9FAFB", color: selected ? "#fff" : "#6B7280", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <span style={{ fontSize: 15 }}>{s.icon}</span>{s.label}
              <span style={{ fontSize: 11, fontWeight: 700, background: selected ? "rgba(255,255,255,0.25)" : "#E5E7EB", color: selected ? "#fff" : "#6B7280", borderRadius: 10, padding: "1px 7px" }}>{s.count}</span>
            </button>
          );
        })}
      </div>

      <CatPanel
        key={activeSection + (verInactivos ? "-inactivos" : "")}
        tab={tab}
        items={getItems(catalogs, active.catKey)}
        onAdd={verInactivos ? undefined : async (nombre, medida) => { await addItem(active.catKey, nombre, medida); }}
        onEdit={verInactivos ? undefined : async (id, nombre, medida) => { await editItem(active.catKey, id, nombre, medida); }}
        onDelete={verInactivos ? undefined : id => deleteItem(active.catKey, id)}
        onReactivar={verInactivos ? id => reactivarItem(active.catKey, id) : undefined}
        verInactivos={verInactivos}
        loadingInactivos={loadingInactivos}
      />
    </div>
  );
}

export default function Catalogos() {
  useAuth();
  const {
    catalogs,
    catalogsInactivos,
    loading,
    loadingInactivos,
    addItem: agregarCatalogo,
    editItem: editarCatalogo,
    deleteItem,
    reactivarItem,
    loadInactivos,
  } = useCatalogosPapel();

  const [verInactivos, setVerInactivos] = useState(false);
  const [activeTab, setActiveTab] = useState<CatKey | "refuerzoBase" | "foil">("tipo_producto");
  const activeCatalogs = (verInactivos ? catalogsInactivos : catalogs) as CatalogMap;

  const handleToggleInactivos = () => {
    if (!verInactivos) loadInactivos();
    setVerInactivos(v => !v);
  };

  const refuerzoBaseCount = getItems(catalogs as CatalogMap, "refuerzo_medidas" as CatKey).length + getItems(catalogs as CatalogMap, "refuerzo_material" as CatKey).length;
  const activeTabConfig = ALL_TABS.find(t => t.key === activeTab);
  const isCorteDoble = activeTab === "cortes" || activeTab === "dobles";

  if (loading) {
    return <Dashboard><div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", fontSize: 14, color: "#9CA3AF" }}>Cargando catálogos…</div></Dashboard>;
  }

  return (
    <Dashboard>
      <div style={{ width: "100%", margin: "0", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#111827" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827" }}>Catálogos de papel</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Administra catálogos comerciales, acabados, herramentales y maquinaria.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }}>
          <aside style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {TAB_GROUPS.map(group => (
              <div key={group.groupLabel} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ padding: "12px 16px 6px", fontSize: 10, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color: "#9CA3AF" }}>{group.groupLabel}</div>
                {group.tabs.map(tab => {
                  const active = activeTab === tab.key;
                  const count = tab.key === "refuerzoBase" ? refuerzoBaseCount : tab.key === "foil" ? null : getItems(catalogs as CatalogMap, tab.key as CatKey).length;
                  return (
                    <button key={String(tab.key)} type="button" onClick={() => { setActiveTab(tab.key); setVerInactivos(false); }}
                      style={{ width: "100%", minHeight: 42, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 14px", border: "none", borderLeft: active ? "4px solid #1D4ED8" : "4px solid transparent", background: active ? "#EFF6FF" : "#fff", color: active ? "#1D4ED8" : "#374151", cursor: "pointer", textAlign: "left" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: active ? 700 : 500 }}><span style={{ fontSize: 15 }}>{tab.icon}</span>{tab.label}</span>
                      {count !== null && <span style={{ fontSize: 11, color: active ? "#1D4ED8" : "#9CA3AF", background: active ? "#DBEAFE" : "#F3F4F6", borderRadius: 999, padding: "1px 7px", fontWeight: 700 }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </aside>

          <main style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{activeTab === "refuerzoBase" ? "🔩" : activeTab === "foil" ? "🌟" : activeTabConfig?.icon}</span>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#111827" }}>{activeTab === "refuerzoBase" ? "Refuerzo y base" : activeTab === "foil" ? "Foil" : activeTabConfig?.label}</h2>
                  {activeTab === "hojeado_guillotina" && <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Clasifica cada máquina como Hojeadora o Guillotina para filtrar correctamente en producción.</p>}
                  {activeTab === "cortes" && <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Medida en pulgadas, altura en mm.</p>}
                  {activeTab === "dobles" && <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Medida en pulgadas, altura se puede editar después.</p>}
                </div>
              </div>

              {activeTab !== "foil" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{verInactivos ? "Mostrando inactivos" : "Mostrar inactivos"}</span>
                  <button type="button" onClick={handleToggleInactivos}
                    style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: verInactivos ? "#DC2626" : "#D1D5DB", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 2, left: verInactivos ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </button>
                </div>
              )}
            </div>

            {activeTab === "refuerzoBase" ? (
              <RefuerzoBasePanel catalogs={activeCatalogs} addItem={agregarCatalogo as AddCatalogoFn} editItem={editarCatalogo as EditCatalogoFn} deleteItem={deleteItem} reactivarItem={reactivarItem} verInactivos={verInactivos} loadingInactivos={loadingInactivos} />
            ) : activeTab === "foil" ? (
              <FoilPanel />
            ) : isCorteDoble && activeTabConfig ? (
              <CorteDoblePanel
                tab={activeTabConfig as TabConfig & { key: CatKey }}
                items={getItems(activeCatalogs, activeTab as CatKey)}
                onAdd={verInactivos ? undefined : async (nombre, altura) => { await agregarCatalogo(activeTab as CatKey, nombre, undefined, undefined, altura); }}
                onEdit={verInactivos ? undefined : async (id, nombre, altura) => { await editarCatalogo(activeTab as CatKey, id, nombre, undefined, undefined, altura); }}
                onDelete={verInactivos ? undefined : id => deleteItem(activeTab as CatKey, id)}
                onReactivar={verInactivos ? id => reactivarItem(activeTab as CatKey, id) : undefined}
                verInactivos={verInactivos}
                loadingInactivos={loadingInactivos}
              />
            ) : activeTabConfig ? (
              <CatPanel
                key={String(activeTab) + (verInactivos ? "-inactivos" : "")}
                tab={activeTabConfig as TabConfig & { key: CatKey }}
                items={getItems(activeCatalogs, activeTab as CatKey)}
                onAdd={verInactivos ? undefined : async (nombre, medida, numeroMaquina, tipoMaquina) => { await agregarCatalogo(activeTab as CatKey, nombre, medida, numeroMaquina, undefined, undefined, tipoMaquina ?? null); }}
                onEdit={verInactivos ? undefined : async (id, nombre, medida, numeroMaquina, tipoMaquina) => { await editarCatalogo(activeTab as CatKey, id, nombre, medida, numeroMaquina, undefined, undefined, tipoMaquina ?? null); }}
                onDelete={verInactivos ? undefined : id => deleteItem(activeTab as CatKey, id)}
                onReactivar={verInactivos ? id => reactivarItem(activeTab as CatKey, id) : undefined}
                verInactivos={verInactivos}
                loadingInactivos={loadingInactivos}
              />
            ) : null}
          </main>
        </div>
      </div>
    </Dashboard>
  );
}
