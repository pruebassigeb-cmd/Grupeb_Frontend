import { useState, useEffect, useRef } from "react";
import type { GrupoPapel, MaterialEntry, CatKey } from "../../types/papel/papel.types";
import  { newMaterial } from "../../types/papel/papel.types";
import SelConAlta from "./SelConAlta";

// ─── Helper: ordenar numéricamente ────────────────────────────────────────
const sortByNum = (arr: string[]) =>
  [...arr].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));

// ── Primitivos locales ─────────────────────────────────────────────────────
function Inp({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", height: 34, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

// ── CalibreInput (híbrido texto + dropdown) ────────────────────────────────
function CalibreInput({ value, onChange, options, onAdd }: {
  value: string; onChange: (v: string) => void;
  options: string[]; onAdd: (key: CatKey, nombre: string) => Promise<void>;
}) {
  const [open, setOpen]             = useState(false);
  const [adding, setAdding]         = useState(false);
  const [newVal, setNewVal]         = useState("");
  const [newValNum, setNewValNum]   = useState("");
  const [newValUnit, setNewValUnit] = useState<"pts" | "gms">("pts");
  const [saving, setSaving]         = useState(false);
  const ref    = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  // Separar y ordenar numéricamente
  const calPts   = sortByNum(options.filter(c => c.toLowerCase().endsWith("pts")));
  const calGms   = sortByNum(options.filter(c => c.toLowerCase().endsWith("gms")));
  const calOtros = sortByNum(options.filter(c => !c.toLowerCase().endsWith("pts") && !c.toLowerCase().endsWith("gms")));

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setAdding(false); setNewVal(""); setNewValNum("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);

  const handleAdd = async () => {
    const t = newVal.trim(); if (!t) return;
    setSaving(true);
    try {
      await onAdd("calibre", t);
      onChange(t);
      setNewVal(""); setNewValNum(""); setAdding(false); setOpen(false);
    } finally { setSaving(false); }
  };

  const resetAdding = () => { setAdding(false); setNewVal(""); setNewValNum(""); };

  const optBtn = (o: string) => (
    <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
      style={{ width: "100%", padding: "5px 12px", border: "none", background: value === o ? "#EFF6FF" : "transparent", color: value === o ? "#1D4ED8" : "#111827", fontSize: 13, cursor: "pointer", textAlign: "left", fontWeight: value === o ? 600 : 400 }}>{o}</button>
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex", height: 34, border: "1px solid #D1D5DB", borderRadius: 5, overflow: "hidden", background: "#fff" }}>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, padding: "0 8px", border: "none", fontSize: 13, color: "#111827", outline: "none", minWidth: 0, background: "transparent" }} />
        <button type="button" onClick={() => { setOpen(!open); setAdding(false); }}
          style={{ width: 28, flexShrink: 0, border: "none", borderLeft: "1px solid #E5E7EB", background: "#F9FAFB", cursor: "pointer", color: "#6B7280", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>▾</button>
      </div>
      {open && (
        <div style={{ position: "fixed", top: "auto", left: "auto", background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "4px 0", maxHeight: 220, overflowY: "auto" }}>
          {calPts.length > 0   && <><div style={{ padding: "4px 10px 2px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>Puntos</div>{calPts.map(optBtn)}</>}
          {calGms.length > 0   && <><div style={{ padding: "6px 10px 2px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", borderTop: "1px solid #F3F4F6", marginTop: 2 }}>Gramaje</div>{calGms.map(optBtn)}</>}
          {calOtros.length > 0 && <><div style={{ padding: "6px 10px 2px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", borderTop: "1px solid #F3F4F6", marginTop: 2 }}>Otros</div>{calOtros.map(optBtn)}</>}
          <div style={{ borderTop: "1px solid #F3F4F6", marginTop: 2, paddingTop: 2 }}>
            {adding ? (
              <div style={{ display: "flex", gap: 4, padding: "5px 8px", alignItems: "center" }}>
                <div style={{ flex: 1, display: "flex", height: 28, border: "1px solid #1D4ED8", borderRadius: 4, overflow: "hidden" }}>
                  <input
                    ref={addRef}
                    type="text"
                    inputMode="numeric"
                    value={newValNum}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setNewValNum(v);
                      setNewVal(v ? `${v}${newValUnit}` : "");
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleAdd();
                      if (e.key === "Escape") resetAdding();
                    }}
                    style={{ flex: 1, padding: "0 6px", border: "none", fontSize: 12, color: "#111827", outline: "none", background: "#fff" }}
                  />
                  <select
                    value={newValUnit}
                    onChange={e => {
                      const u = e.target.value as "pts" | "gms";
                      setNewValUnit(u);
                      setNewVal(newValNum ? `${newValNum}${u}` : "");
                    }}
                    style={{ border: "none", borderLeft: "1px solid #BFDBFE", background: "#EFF6FF", fontSize: 12, fontWeight: 700, color: "#1D4ED8", cursor: "pointer", outline: "none", padding: "0 4px" }}
                  >
                    <option value="pts">pts</option>
                    <option value="gms">gms</option>
                  </select>
                </div>
                <button onClick={handleAdd} disabled={saving} style={{ height: 28, padding: "0 8px", background: "#1D4ED8", border: "none", borderRadius: 4, cursor: saving ? "wait" : "pointer", color: "#fff", fontSize: 12, fontWeight: 700 }}>{saving ? "…" : "✓"}</button>
                <button onClick={resetAdding} style={{ height: 28, padding: "0 6px", background: "#F3F4F6", border: "none", borderRadius: 4, cursor: "pointer", color: "#6B7280", fontSize: 13 }}>✕</button>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)}
                style={{ width: "100%", padding: "6px 12px", border: "none", background: "transparent", color: "#1D4ED8", fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 14 }}>+</span> Agregar nuevo…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Material Card ──────────────────────────────────────────────────────────
function MaterialCard({ entry, index, onEdit, onRemove }: { entry: MaterialEntry; index: number; onEdit: () => void; onRemove: () => void }) {
  const chip = (lbl: string, val: string) => val ? <span key={lbl} style={{ fontSize: 11, color: "#374151" }}><span style={{ color: "#9CA3AF", fontSize: 10 }}>{lbl} </span>{val}</span> : null;
  const hFields = [["Bob.", entry.hojeado.bobina], ["Desarrollo", entry.hojeado.corte], ["Rend.", entry.hojeado.rendimiento], ["Guill.", entry.hojeado.guillotina], ["Hilo", entry.hojeado.hilo]].filter(([, v]) => v);
  return (
    <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "7px 10px", display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#1D4ED8", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{index + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px" }}>{chip("Tipo", entry.tipo)}{chip("Cal.", entry.calibre)}{chip("Pliego", entry.pliego)}{chip("Rend.", entry.rendimiento)}{chip("Corte", entry.corte)}</div>
        {hFields.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 3, paddingTop: 3, borderTop: "1px solid #BFDBFE" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", alignSelf: "center" }}>Hojeado:</span>
            {hFields.map(([lbl, val]) => chip(lbl, val))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button onClick={onEdit}   style={{ width: 24, height: 24, background: "#FEF3C7", border: "none", borderRadius: 4, cursor: "pointer", color: "#D97706", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button>
        <button onClick={onRemove} style={{ width: 24, height: 24, background: "#FEE2E2", border: "none", borderRadius: 4, cursor: "pointer", color: "#DC2626", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>
    </div>
  );
}

// ── Draft Form ─────────────────────────────────────────────────────────────
function DraftForm({ entry, onChange, onConfirm, isEditing, catTipoPapel, catCalibre, catTipoPapelItems, catCalibreItems, onAdd }: {
  entry: MaterialEntry; onChange: (e: MaterialEntry) => void; onConfirm: () => void; isEditing?: boolean;
  catTipoPapel: string[]; catCalibre: string[];
  catTipoPapelItems: { id: number; nombre: string }[];
  catCalibreItems:   { id: number; nombre: string }[];
  onAdd: (key: CatKey, nombre: string) => Promise<void>;
}) {
  const upd  = (k: keyof MaterialEntry, v: any) => onChange({ ...entry, [k]: v });
  const updH = (k: keyof MaterialEntry["hojeado"], v: string) => onChange({ ...entry, hojeado: { ...entry.hojeado, [k]: v } });

  const onTipoChange = (nombre: string) => {
    const item = catTipoPapelItems.find(i => i.nombre === nombre);
    onChange({ ...entry, tipo: nombre, idcat_tipo_papel: item?.id ?? null });
  };

  const onCalibreChange = (nombre: string) => {
    const item = catCalibreItems.find(i => i.nombre === nombre);
    onChange({ ...entry, calibre: nombre, idcat_calibre: item?.id ?? null });
  };

  return (
    <div style={{ background: isEditing ? "#FFFBEB" : "#F9FAFB", border: `1px ${isEditing ? "solid #FCD34D" : "dashed #D1D5DB"}`, borderRadius: 6, padding: "10px 12px" }}>
      {isEditing && <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#D97706", margin: "0 0 8px" }}>Editando material</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.8fr 1fr 0.7fr 1fr auto", gap: "6px 8px", alignItems: "end", marginBottom: 8 }}>
        <Field label="Tipo de papel">
          <SelConAlta
            catKey="tipo_papel"
            options={catTipoPapel}
            value={entry.tipo}
            onChange={onTipoChange}
            onAdd={onAdd}
          />
        </Field>
        <Field label="Calibre">
          <SelConAlta
            catKey="calibre"
            options={catCalibre}
            value={entry.calibre}
            onChange={onCalibreChange}
            onAdd={onAdd}
          />
        </Field>
        <Field label="Pliego"><Inp value={entry.pliego} onChange={(v) => upd("pliego", v)} /></Field>
        <Field label="Rend."><Inp value={entry.rendimiento} onChange={(v) => upd("rendimiento", v)} /></Field>
        <Field label="Corte"><Inp value={entry.corte} onChange={(v) => upd("corte", v)} /></Field>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button onClick={onConfirm} style={{ width: 32, height: 32, background: isEditing ? "#D97706" : "#1D4ED8", border: "none", borderRadius: 5, cursor: "pointer", color: "#fff", fontSize: isEditing ? 13 : 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
            {isEditing ? "✓" : "+"}
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto repeat(5, 1fr)", gap: "4px 8px", alignItems: "center", borderTop: "1px dashed #E5E7EB", paddingTop: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Hojeado</span>
        {([
          ["bobina",      "Bob."  ],
          ["corte",       "Desarrollo" ],
          ["rendimiento", "Rend." ],
          ["guillotina",  "Guill."],
          ["hilo",        "Hilo"  ],
        ] as [keyof MaterialEntry["hojeado"], string][]).map(([k, lbl]) => (
          <Field key={k} label={lbl}>
            <Inp value={entry.hojeado[k]} onChange={(v) => updH(k, v)} />
          </Field>
        ))}
      </div>
    </div>
  );
}

// ── GrupoBlock (export principal) ──────────────────────────────────────────
interface GrupoBlockProps {
  grupo:        GrupoPapel;
  grupoIndex:   number;
  totalGrupos:  number;
  onUpdate:     (g: GrupoPapel) => void;
  onRemove:     () => void;
  catTipoPapel:      string[];
  catCalibre:        string[];
  catTipoPapelItems: { id: number; nombre: string }[];
  catCalibreItems:   { id: number; nombre: string }[];
  onAdd:        (key: CatKey, nombre: string) => Promise<void>;
  collapsed:    boolean;
  onToggle:     () => void;
}

export default function GrupoBlock({ grupo, grupoIndex, totalGrupos, onUpdate, onRemove, catTipoPapel, catCalibre, catTipoPapelItems, catCalibreItems, onAdd, collapsed, onToggle }: GrupoBlockProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<MaterialEntry | null>(null);

  const confirmar = () => {
    if (!grupo.draft.tipo) return;
    onUpdate({ ...grupo, materiales: [...grupo.materiales, { ...grupo.draft }], draft: newMaterial() });
  };
  const startEdit = (e: MaterialEntry) => { setEditingId(e.id); setEditDraft({ ...e }); };
  const saveEdit  = () => {
    if (!editDraft) return;
    onUpdate({ ...grupo, materiales: grupo.materiales.map(m => m.id === editDraft.id ? editDraft : m) });
    setEditingId(null); setEditDraft(null);
  };
  const removeMat = (id: number) => {
    onUpdate({ ...grupo, materiales: grupo.materiales.filter(m => m.id !== id) });
    if (editingId === id) { setEditingId(null); setEditDraft(null); }
  };

  const color = "#94A3B8";
  const light = "#F8FAFC";

  return (
    <div style={{ border: `1.5px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: 8, marginBottom: 10, overflow: "visible", position: "relative" }}>
      {/* Header del grupo */}
      <div onClick={onToggle}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: light, borderBottom: collapsed ? "none" : `1px solid ${color}20`, borderRadius: collapsed ? 6 : undefined, cursor: "pointer", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: color, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{grupoIndex + 1}</div>
          <span style={{ fontSize: 11, fontWeight: 600, color }}>Grupo {grupoIndex + 1}</span>
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>— {grupo.materiales.length} mat.</span>
          {collapsed && grupo.materiales.length > 0 && (
            <span style={{ fontSize: 10, color: "#6B7280", marginLeft: 4 }}>
              {grupo.materiales.map(m => [m.tipo, m.calibre].filter(Boolean).join(" ")).join(" · ")}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Costo</span>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#6B7280", pointerEvents: "none" }}>$</span>
              <input type="text" inputMode="decimal" value={grupo.precioSugerido}
                onChange={(e) => onUpdate({ ...grupo, precioSugerido: e.target.value })}
                style={{ width: 90, height: 28, paddingLeft: 16, paddingRight: 6, border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 12, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>MXN</span>
          </div>
          {totalGrupos > 1 && (
            <button onClick={onRemove} style={{ padding: "1px 8px", height: 24, background: "#FEE2E2", border: "none", borderRadius: 4, cursor: "pointer", color: "#DC2626", fontSize: 11, fontWeight: 600 }}>Eliminar</button>
          )}
          <span style={{ fontSize: 10, color: "#9CA3AF", marginLeft: 2 }}>{collapsed ? "▸" : "▾"}</span>
        </div>
      </div>

      {/* Materiales */}
      {!collapsed && (
        <div style={{ padding: "10px 12px" }}>
          {grupo.materiales.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {grupo.materiales.map((m, i) => editingId === m.id ? (
                <div key={m.id} style={{ marginBottom: 6 }}>
                  <DraftForm entry={editDraft!} onChange={setEditDraft} onConfirm={saveEdit} isEditing catTipoPapel={catTipoPapel} catCalibre={catCalibre} catTipoPapelItems={catTipoPapelItems} catCalibreItems={catCalibreItems} onAdd={onAdd} />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button onClick={() => { setEditingId(null); setEditDraft(null); }} style={{ fontSize: 11, color: "#6B7280", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <MaterialCard key={m.id} entry={m} index={i} onEdit={() => startEdit(m)} onRemove={() => removeMat(m.id)} />
              ))}
            </div>
          )}
          {editingId === null && (
            <DraftForm entry={grupo.draft} onChange={(d) => onUpdate({ ...grupo, draft: d })} onConfirm={confirmar} catTipoPapel={catTipoPapel} catCalibre={catCalibre} catTipoPapelItems={catTipoPapelItems} catCalibreItems={catCalibreItems} onAdd={onAdd} />
          )}
        </div>
      )}
    </div>
  );
}