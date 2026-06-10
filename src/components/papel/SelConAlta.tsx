import { useState, useRef, useEffect } from "react";
import type { CatKey } from "../../types/papel/papel.types";

interface Props {
  catKey: CatKey;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  onAdd: (key: CatKey, nombre: string, medida?: string, numeroMaquina?: string) => Promise<void>;
  placeholder?: string;
}

const MAQUINARIA_KEYS: CatKey[] = [
  "hojeado_guillotina", "impresora", "hs_ar", "suaje_maquina",
  "uv", "textura", "empalme", "armado", "asas_maquina", "desbarbe",
];

// ─── Helper: ordenar numéricamente (10pts, 120gms, 5x5 cm, etc.) ─────────
const sortByNum = (arr: string[]) =>
  [...arr].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));

// ─── Input con sufijo fijo ────────────────────────────────────────────────
function SufijoInput({ value, onChange, sufijo, placeholder, permitirDecimal = false, permitirX = false, inputRef }: {
  value: string; onChange: (v: string) => void; sufijo: string;
  placeholder?: string; permitirDecimal?: boolean; permitirX?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const regex = permitirDecimal && permitirX ? /[^0-9.xX]/g : permitirDecimal ? /[^0-9.]/g : /[^0-9]/g;
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <input
        ref={inputRef}
        type="text"
        inputMode={permitirDecimal ? "decimal" : "numeric"}
        placeholder={placeholder}
        value={value}
        onChange={e => {
          let v = e.target.value.replace(regex, "");
          if (permitirX) v = v.toUpperCase();
          onChange(v);
        }}
        style={{ flex: 1, padding: "0 6px", border: "none", fontSize: 13, color: "#111827", outline: "none", background: "transparent", minWidth: 0 }}
      />
      <span style={{ padding: "0 7px", borderLeft: "1px solid #BFDBFE", background: "#DBEAFE", fontSize: 12, fontWeight: 700, color: "#1D4ED8", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
        {sufijo}
      </span>
    </div>
  );
}

// ─── Input calibre / refuerzo_material: número + selector pts/gms ─────────
function CalibreAddInput({ value, onChange, inputRef }: {
  value: string; onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const parseVal = (v: string) => {
    const m = v.match(/^(\d*)(\s*(gms|pts))?$/i);
    return { num: m?.[1] ?? "", unit: (m?.[3]?.toLowerCase() ?? "pts") as "pts" | "gms" };
  };
  const p = parseVal(value);
  const [num,  setNum]  = useState(p.num);
  const [unit, setUnit] = useState<"pts" | "gms">(p.unit);

  const update = (n: string, u: "pts" | "gms") => onChange(n ? `${n}${u}` : "");

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <input
        ref={inputRef}
        type="text" inputMode="numeric"
        value={num}
        onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ""); setNum(v); update(v, unit); }}
        style={{ flex: 1, padding: "0 6px", border: "none", fontSize: 13, color: "#111827", outline: "none", background: "transparent", minWidth: 0 }}
      />
      <select
        value={unit}
        onChange={e => { const u = e.target.value as "pts" | "gms"; setUnit(u); update(num, u); }}
        style={{ border: "none", borderLeft: "1px solid #BFDBFE", background: "#DBEAFE", fontSize: 12, fontWeight: 700, color: "#1D4ED8", cursor: "pointer", outline: "none", padding: "0 6px" }}
      >
        <option value="pts">pts</option>
        <option value="gms">gms</option>
      </select>
    </div>
  );
}

// ─── Input maquinaria: nombre + N° máquina ────────────────────────────────
function MaquinaAddInput({ nombre, onNombre, numMaquina, onNumMaquina, inputRef }: {
  nombre: string; onNombre: (v: string) => void;
  numMaquina: string; onNumMaquina: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div style={{ display: "flex", flex: 1, gap: 4, overflow: "hidden", alignItems: "center" }}>
      <input
        ref={inputRef}
        type="text"
        value={nombre}
        onChange={e => onNombre(e.target.value)}
        style={{ flex: 2, padding: "0 6px", border: "none", fontSize: 13, color: "#111827", outline: "none", background: "transparent", minWidth: 0 }}
      />
      <span style={{ fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap", flexShrink: 0 }}>N°</span>
      <input
        type="text"
        value={numMaquina}
        onChange={e => onNumMaquina(e.target.value)}
        style={{ flex: 1, padding: "0 6px", border: "none", borderLeft: "1px solid #BFDBFE", fontSize: 13, color: "#111827", outline: "none", background: "transparent", minWidth: 0 }}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════
export default function SelConAlta({ catKey, options, value, onChange, onAdd, placeholder }: Props) {
  const [adding,   setAdding]   = useState(false);
  const [newVal,   setNewVal]   = useState("");
  const [newExtra, setNewExtra] = useState("");
  const [saving,   setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const resetAdding = () => { setAdding(false); setNewVal(""); setNewExtra(""); };

  const handleAdd = async () => {
    const t = newVal.trim();
    if (!t) return;
    setSaving(true);
    try {
      if (catKey === "sacabocados") {
        const medida = t.endsWith(" mm") ? t : `${t} mm`;
        await onAdd(catKey, "Sacabocado", medida);
        onChange(`Sacabocado — ${medida}`);

      } else if (catKey === "perforado") {
        const medida = t.endsWith(" mm") ? t : `${t} mm`;
        await onAdd(catKey, "Perforación", medida);
        onChange(`Perforación — ${medida}`);

      } else if (catKey === "refuerzo_medidas") {
        const nombre = t.endsWith(" cm") ? t : `${t} cm`;
        await onAdd(catKey, nombre);
        onChange(nombre);

      } else if (catKey === "calibre" || catKey === "refuerzo_material") {
        await onAdd(catKey, t);
        onChange(t);

      } else if (MAQUINARIA_KEYS.includes(catKey)) {
        await onAdd(catKey, t, undefined, newExtra.trim() || undefined);
        onChange(t);

      } else {
        await onAdd(catKey, t);
        onChange(t);
      }
      resetAdding();
    } finally {
      setSaving(false);
    }
  };

  // ── Modo agregar ──────────────────────────────────────────────────────
  if (adding) {
    return (
      <div style={{ display: "flex", height: 34, border: "1px solid #1D4ED8", borderRadius: 5, overflow: "hidden", background: "#fff", boxShadow: "0 0 0 2px #BFDBFE" }}>

        {catKey === "sacabocados" ? (
          <SufijoInput value={newVal} onChange={setNewVal} sufijo="mm" inputRef={inputRef} />

        ) : catKey === "perforado" ? (
          <SufijoInput value={newVal} onChange={setNewVal} sufijo="mm" permitirDecimal permitirX inputRef={inputRef} />

        ) : catKey === "refuerzo_medidas" ? (
          <SufijoInput value={newVal} onChange={setNewVal} sufijo="cm" permitirDecimal permitirX inputRef={inputRef} />

        ) : catKey === "calibre" || catKey === "refuerzo_material" ? (
          <CalibreAddInput value={newVal} onChange={setNewVal} inputRef={inputRef} />

        ) : MAQUINARIA_KEYS.includes(catKey) ? (
          <MaquinaAddInput nombre={newVal} onNombre={setNewVal} numMaquina={newExtra} onNumMaquina={setNewExtra} inputRef={inputRef} />

        ) : (
          <input
            ref={inputRef}
            type="text"
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") resetAdding(); }}
            style={{ flex: 1, padding: "0 8px", border: "none", fontSize: 13, color: "#111827", outline: "none", background: "transparent" }}
          />
        )}

        <button onClick={handleAdd} disabled={saving}
          style={{ padding: "0 8px", border: "none", borderLeft: "1px solid #BFDBFE", background: "#EFF6FF", cursor: saving ? "wait" : "pointer", color: "#1D4ED8", fontSize: 12, fontWeight: 700 }}>
          {saving ? "…" : "✓"}
        </button>
        <button onClick={resetAdding}
          style={{ padding: "0 8px", border: "none", borderLeft: "1px solid #E5E7EB", background: "#F9FAFB", cursor: "pointer", color: "#9CA3AF", fontSize: 13 }}>
          ✕
        </button>
      </div>
    );
  }

  // ── Modo select con agrupación pts/gms ordenada numéricamente ────────
  const esCalibreKey = catKey === "calibre" || catKey === "refuerzo_material";

  // sortByNum: ordena de menor a mayor usando el valor numérico del inicio del string
  const optsPts   = esCalibreKey ? sortByNum(options.filter(o => o.toLowerCase().endsWith("pts"))) : [];
  const optsGms   = esCalibreKey ? sortByNum(options.filter(o => o.toLowerCase().endsWith("gms"))) : [];
  const optsOtros = esCalibreKey
    ? sortByNum(options.filter(o => !o.toLowerCase().endsWith("pts") && !o.toLowerCase().endsWith("gms")))
    : options;

  return (
    <select
      value={value}
      onChange={e => {
        if (e.target.value === "__add__") { setAdding(true); return; }
        onChange(e.target.value);
      }}
      style={{
        width: "100%", height: 34, padding: "0 8px",
        border: "1px solid #D1D5DB", borderRadius: 5,
        fontSize: 13, color: value ? "#111827" : "#9CA3AF",
        background: "#fff", outline: "none",
        boxSizing: "border-box", cursor: "pointer",
      }}
    >
      <option value="" disabled hidden>{placeholder ?? ""}</option>

      {esCalibreKey ? (
        <>
          {optsPts.length > 0 && (
            <optgroup label="Puntos">
              {optsPts.map(o => <option key={o} value={o} style={{ color: "#111827" }}>{o}</option>)}
            </optgroup>
          )}
          {optsGms.length > 0 && (
            <optgroup label="Gramaje">
              {optsGms.map(o => <option key={o} value={o} style={{ color: "#111827" }}>{o}</option>)}
            </optgroup>
          )}
          {optsOtros.length > 0 && (
            <optgroup label="Otros">
              {optsOtros.map(o => <option key={o} value={o} style={{ color: "#111827" }}>{o}</option>)}
            </optgroup>
          )}
        </>
      ) : (
        options.map(o => <option key={o} value={o} style={{ color: "#111827" }}>{o}</option>)
      )}

      <option value="__add__" style={{ color: "#1D4ED8", fontWeight: 600 }}>+ Agregar nuevo…</option>
    </select>
  );
}