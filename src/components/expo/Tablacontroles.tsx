import { useState, useRef, useCallback, memo, useEffect } from "react";
import {
  OPCIONES_TINTAS, OPCIONES_TINTAS_PLASTICO,
  MEDIDAS_CAT, CATS,
} from "../../types/expo/expo.types";
import type { FilaProducto, Producto, AsaPermitida, LaminadoPermitido } from "../../types/expo/expo.types";
import type { Catalogs } from "../../types/papel/papel.types";
import type { FoilOpcion, TexturaOpcion } from "../../types/papel/cotizacion-papel.types";

// ─── Tipos catálogos plástico ─────────────────────────────────────────────────
export interface CatalogoPlasticoItem { id: number; nombre: string; }
export interface CalibreItem          { id: number; valor: string; gramos?: number | null; calibre_bopp?: number | null; }
export interface CatalogosPlastico {
  tiposProducto: CatalogoPlasticoItem[];
  materiales:    CatalogoPlasticoItem[];
  calibres:      CalibreItem[];
}

// ─── Tipo pigmento DB ─────────────────────────────────────────────────────────
export interface PigmentoDB { id: number; nombre: string; codigo: string | null; }

// ─── Estilos tabla ────────────────────────────────────────────────────────────
export const TH: React.CSSProperties = { background: "#1A1A1A", color: "#EEE", padding: "6px 4px 2px", textAlign: "center", fontSize: 9, fontWeight: 600, letterSpacing: .3 };
export const TH2: React.CSSProperties = { background: "#1A1A1A", color: "#AAA", padding: "2px 4px 6px", textAlign: "center", fontSize: 8, fontWeight: 500 };
export const THD: React.CSSProperties = { ...TH2, color: "#C9922A", fontWeight: 700, fontSize: 9.5 };
export const TD: React.CSSProperties = { padding: "4px 3px", textAlign: "center", verticalAlign: "middle", color: "#1A1A1A", borderBottom: "1px solid #EDE5D5", fontSize: 9 };
export const TDL: React.CSSProperties = { ...TD, textAlign: "left", paddingLeft: 8, fontWeight: 600, fontSize: 9.5 };
export const TDP: React.CSSProperties = { ...TD, color: "#C9922A", fontWeight: 700, fontSize: 11 };

export const iP: React.CSSProperties = {
  background: "transparent", border: "none", borderBottom: "1px solid #C9922A",
  color: "#C9922A", fontSize: 11, fontWeight: 700, width: "100%", textAlign: "center",
  outline: "none", fontFamily: "'Inter',sans-serif", padding: "1px 0",
};
export const iC: React.CSSProperties = {
  background: "transparent", border: "none", borderBottom: "1px solid #C9922A",
  color: "#C9922A", fontSize: 10, fontWeight: 700, width: "100%", textAlign: "center",
  outline: "none", fontFamily: "'Inter',sans-serif",
};
export const iSel: React.CSSProperties = {
  background: "#F0E8D8", border: "1px solid #D4C9B8", borderRadius: 3,
  color: "#1A1A1A", fontSize: 8, fontWeight: 600, width: "100%", textAlign: "center",
  outline: "none", fontFamily: "'Inter',sans-serif", padding: "2px 1px", cursor: "pointer",
};
export const pill = (active: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 22, height: 22, borderRadius: "50%",
  border: `1.5px solid ${active ? "#22C55E" : "#B8A88055"}`,
  background: active ? "#22C55E22" : "transparent",
  cursor: "pointer", userSelect: "none", fontSize: 11,
  color: active ? "#22C55E" : "#C9922A44", transition: "all .15s",
});

export const CANT_OPCIONES = ["500", "1,000", "1,500", "2,000", "3,000", "5,000", "10,000", "20,000", "50,000"];
const TINTAS_DEFAULT = ["1x0", "1x1", "2x0", "2x1", "2x2", "3x0", "4x0", "4x4"];
const TIPOS_PLASTICO = ["Bolsa plana", "Bolsa troquelada", "Bolsa celofán", "Bolsa envíos", "Bolsa asa flexible"];

// ─── Estado global: solo un dropdown abierto a la vez ─────────────────────────
let _openId = "";
const _listeners: Set<() => void> = new Set();
export function openDrop(id: string) { _openId = id; _listeners.forEach(f => f()); }
export function closeDrop() { _openId = ""; _listeners.forEach(f => f()); }
export function useOpenId() {
  const [id, setId] = useState(_openId);
  useEffect(() => {
    const fn = () => setId(_openId);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);
  return id;
}

interface DropPos { top: number; left: number; width: number; }
function calcPos(el: HTMLElement): DropPos {
  const r = el.getBoundingClientRect();
  return { top: r.bottom + 4, left: r.left, width: Math.max(r.width, 110) };
}

// ─── BuscadorProductoModal ────────────────────────────────────────────────────
interface BuscadorProps {
  catalogoPropio: Producto[];
  onElegir: (p: Producto) => void;
  onClose: () => void;
  catalogs: Catalogs;
}
export function BuscadorProductoModal({ catalogoPropio, onElegir, onClose, catalogs }: BuscadorProps) {
  const [busq,           setBusq]           = useState("");
  const [nombreNuevo,    setNombreNuevo]    = useState("");
  const [catSeleccionada,setCatSeleccionada]= useState<"papel" | "plastico" | "carton">("papel");
  const [tipoSeleccionado,setTipoSeleccionado] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const todos = [...catalogoPropio];
  const filtrados = busq.trim()
    ? todos.filter(p =>
        p.nombre.toLowerCase().includes(busq.toLowerCase()) ||
        p.medida.toLowerCase().includes(busq.toLowerCase()) ||
        p.material.toLowerCase().includes(busq.toLowerCase()))
    : todos;

  const seleccionarCat = (cat: "papel" | "plastico" | "carton") => {
    setCatSeleccionada(cat);
    setTipoSeleccionado("");
  };

  const confirmarNuevo = () => {
    if (!nombreNuevo.trim()) return;
    const vacio: Producto = {
      id:           Date.now(),
      nombre:       nombreNuevo.trim(),
      categoria:    catSeleccionada,
      tipo:         tipoSeleccionado || undefined,
      tipoProducto: tipoSeleccionado || undefined,
      medida: "", material: "", calibre: "", tintas: "",
      laminacion: false, hs: false, ar: false, textura: false, uv: false, asa: false, otro: "",
      precio500: "", precio1000: "", precio3000: "", imagen: "",
    };
    onElegir(vacio);
    onClose();
  };

  const catColor = CATS.find(c => c.key === catSeleccionada)?.color ?? "#C9922A";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: "14px 16px", borderBottom: "2px solid #C9922A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#C9922A", fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Elegir producto</div>
            <div style={{ color: "#666", fontSize: 10, marginTop: 2 }}>Busca por nombre, medida o material</div>
          </div>
          <button onClick={onClose} style={{ background: "#2A2A2A", border: "none", color: "#AAA", width: 26, height: 26, borderRadius: "50%", cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #2A2A2A" }}>
          <div style={{ color: "#666", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>O crear desde cero</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {CATS.map(c => (
              <button key={c.key} onClick={() => seleccionarCat(c.key as "papel" | "plastico" | "carton")}
                style={{
                  flex: 1, fontSize: 10, fontWeight: 700, padding: "7px 4px", borderRadius: 6, cursor: "pointer",
                  background:    catSeleccionada === c.key ? `${c.color}28` : `${c.color}10`,
                  border:        `1.5px solid ${catSeleccionada === c.key ? c.color : c.color + "44"}`,
                  color:         c.color,
                  boxShadow:     catSeleccionada === c.key ? `0 0 0 1px ${c.color}44` : "none",
                }}>
                {c.emoji} {c.label} en blanco
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <input
              value={nombreNuevo}
              onChange={e => setNombreNuevo(e.target.value)}
              placeholder="Nombre del producto *"
              onKeyDown={e => { if (e.key === "Enter" && nombreNuevo.trim()) confirmarNuevo(); }}
              style={{
                flex: 2, background: "#111", border: `1px solid ${nombreNuevo.trim() ? catColor : "#333"}`,
                borderRadius: 6, padding: "7px 10px", color: "#EEE", fontSize: 12,
                outline: "none", fontFamily: "'Inter',sans-serif", transition: "border-color .15s",
              }}
            />
            <select
              value={tipoSeleccionado}
              onChange={e => setTipoSeleccionado(e.target.value)}
              style={{
                flex: 1, background: "#111", border: "1px solid #333", borderRadius: 6,
                padding: "7px 8px", color: tipoSeleccionado ? "#EEE" : "#555",
                fontSize: 11, outline: "none", fontFamily: "'Inter',sans-serif", cursor: "pointer",
              }}>
              <option value="">Tipo (opc.)</option>
              {catSeleccionada === "plastico"
                ? TIPOS_PLASTICO.map(t => <option key={t} value={t}>{t}</option>)
                : catalogs.tipo_producto.map(item => <option key={item.id} value={item.nombre}>{item.nombre}</option>)
              }
            </select>
            <button
              onClick={confirmarNuevo}
              disabled={!nombreNuevo.trim()}
              style={{
                background: nombreNuevo.trim() ? catColor : "#2A2A2A",
                border: "none", borderRadius: 6, padding: "7px 14px",
                color: nombreNuevo.trim() ? "#1A1A1A" : "#555",
                fontSize: 13, fontWeight: 700,
                cursor: nombreNuevo.trim() ? "pointer" : "not-allowed",
                transition: "all .15s", flexShrink: 0,
              }}>
              ✓
            </button>
          </div>
        </div>

        <div style={{ padding: "10px 16px 0" }}>
          <input ref={inputRef} value={busq} onChange={e => setBusq(e.target.value)} placeholder="Buscar producto..."
            style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", color: "#EEE", fontSize: 13, outline: "none", fontFamily: "'Inter',sans-serif" }} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 10px" }}>
          {CATS.map(cat => {
            const ps = filtrados.filter(p => p.categoria === cat.key);
            if (ps.length === 0) return null;
            return (
              <div key={cat.key} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 6px 4px" }}>
                  <span style={{ fontSize: 12 }}>{cat.emoji}</span>
                  <span style={{ color: cat.color, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{cat.label}</span>
                </div>
                {ps.map(p => (
                  <div key={p.id} onClick={() => { onElegir(p); onClose(); }}
                    style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 8, cursor: "pointer", border: "1px solid transparent" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#222"; e.currentTarget.style.borderColor = "#333"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                    <img src={p.imagen} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 5, border: "1px solid #333", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#EEE", fontSize: 12, fontWeight: 600 }}>{p.nombre}</div>
                      <div style={{ color: "#666", fontSize: 10 }}>{p.medida} · {p.material}</div>
                    </div>
                    <div style={{ color: "#C9922A", fontSize: 11, fontWeight: 700 }}>{p.precio500}</div>
                  </div>
                ))}
              </div>
            );
          })}
          {filtrados.length === 0 && (
            <div style={{ textAlign: "center", color: "#555", fontSize: 12, padding: "30px 0" }}>Sin resultados para "{busq}"</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MedidaSelect ─────────────────────────────────────────────────────────────
interface MedidaSelectProps { id: string; value: string; categoria: string; onChange: (v: string) => void; }
export function MedidaSelect({ id, value, categoria, onChange }: MedidaSelectProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<DropPos | null>(null);
  const openId = useOpenId();
  const isOpen = openId === id;
  const abrir = () => { if (isOpen) { closeDrop(); return; } if (triggerRef.current) setPos(calcPos(triggerRef.current)); openDrop(id); };
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: MouseEvent) => {
      const el = document.getElementById(`drop-${id}`);
      if (el && !el.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) closeDrop();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [isOpen, id]);
  const seleccionar = (v: string) => { onChange(v); closeDrop(); };
  const opciones = MEDIDAS_CAT[categoria] || MEDIDAS_CAT["papel"];
  return (
    <>
      <div ref={triggerRef} onClick={abrir} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer" }}>
        <span style={{ fontSize: 9, color: "#1A1A1A", fontWeight: 600 }}>{value}</span>
        <span style={{ fontSize: 7, color: "#AAA" }}>▾</span>
      </div>
      {isOpen && pos && (
        <div id={`drop-${id}`} style={{ position: "fixed", top: pos.top, left: pos.left, width: 150, background: "#1A1A1A", border: "1px solid #444", borderRadius: 8, zIndex: 9999, boxShadow: "0 8px 28px rgba(0,0,0,.7)", overflow: "hidden" }}>
          {opciones.map(o => (
            <div key={o} onMouseDown={() => seleccionar(o)}
              style={{ padding: "7px 12px", cursor: "pointer", fontSize: 11, color: value === o ? "#C9922A" : "#CCC", fontWeight: value === o ? 700 : 400, background: value === o ? "#C9922A18" : "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2A2A2A")}
              onMouseLeave={e => (e.currentTarget.style.background = value === o ? "#C9922A18" : "transparent")}>
              {o}
            </div>
          ))}
          <div style={{ borderTop: "1px solid #2A2A2A", padding: "5px 8px" }}>
            <input placeholder="Otra medida..."
              style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: 4, padding: "5px 7px", color: "#EEE", fontSize: 11, outline: "none", fontFamily: "'Inter',sans-serif" }}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Enter") seleccionar((e.target as HTMLInputElement).value || value); }}
              onBlur={e => { if (e.target.value) seleccionar(e.target.value); }} />
          </div>
        </div>
      )}
    </>
  );
}

// ─── TintasSelect ─────────────────────────────────────────────────────────────
interface TintasProps { id: string; value: string; onChange: (v: string) => void; }
export function TintasSelect({ id, value, onChange }: TintasProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busq, setBusq] = useState("");
  const [pos, setPos] = useState<DropPos | null>(null);
  const openId = useOpenId();
  const isOpen = openId === id;
  const abrir = () => {
    if (isOpen) { closeDrop(); return; }
    if (triggerRef.current) setPos(calcPos(triggerRef.current));
    openDrop(id);
    setTimeout(() => inputRef.current?.focus(), 30);
  };
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: MouseEvent) => {
      const el = document.getElementById(`drop-${id}`);
      if (el && !el.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) closeDrop();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [isOpen, id]);
  const lista = busq.trim() ? OPCIONES_TINTAS.filter(o => o.includes(busq.trim())) : TINTAS_DEFAULT;
  const seleccionar = (v: string) => { onChange(v); closeDrop(); setBusq(""); };
  return (
    <>
      <div ref={triggerRef} onClick={abrir}
        style={{ ...iSel, display: "flex", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", padding: "2px 4px" }}>
        <span>{value}</span><span style={{ fontSize: 7 }}>▾</span>
      </div>
      {isOpen && pos && (
        <div id={`drop-${id}`} style={{ position: "fixed", top: pos.top, left: pos.left, width: 100, background: "#1A1A1A", border: "1px solid #444", borderRadius: 8, zIndex: 9999, boxShadow: "0 8px 28px rgba(0,0,0,.7)", overflow: "hidden" }}>
          <div style={{ padding: "5px 6px 3px", borderBottom: "1px solid #2A2A2A" }}>
            <input ref={inputRef} value={busq} onChange={e => setBusq(e.target.value)} placeholder="ej: 3"
              style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: 4, padding: "4px 6px", color: "#EEE", fontSize: 10, outline: "none", fontFamily: "'Inter',sans-serif" }} />
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto" }}>
            {lista.length === 0
              ? <div style={{ padding: "8px", color: "#555", fontSize: 10, textAlign: "center" }}>Sin resultados</div>
              : lista.map(o => (
                <div key={o} onMouseDown={() => seleccionar(o)}
                  style={{ padding: "5px 10px", cursor: "pointer", fontSize: 11, color: value === o ? "#C9922A" : "#CCC", fontWeight: value === o ? 700 : 400, background: value === o ? "#C9922A18" : "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#2A2A2A")}
                  onMouseLeave={e => (e.currentTarget.style.background = value === o ? "#C9922A18" : "transparent")}>
                  {o}
                </div>
              ))
            }
            {!busq && <div style={{ padding: "4px 10px 6px", color: "#444", fontSize: 9, textAlign: "center" }}>Escribe para buscar más</div>}
          </div>
        </div>
      )}
    </>
  );
}

// ─── TintasPlasticoSelect ─────────────────────────────────────────────────────
interface TintasPlasticoProps { id: string; value: string; onChange: (v: string) => void; }
export function TintasPlasticoSelect({ id, value, onChange }: TintasPlasticoProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<DropPos | null>(null);
  const openId = useOpenId();
  const isOpen = openId === id;
  const abrir = () => { if (isOpen) { closeDrop(); return; } if (triggerRef.current) setPos(calcPos(triggerRef.current)); openDrop(id); };
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: MouseEvent) => {
      const el = document.getElementById(`drop-${id}`);
      if (el && !el.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) closeDrop();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [isOpen, id]);
  const seleccionar = (v: string) => { onChange(v); closeDrop(); };
  return (
    <>
      <div ref={triggerRef} onClick={abrir}
        style={{ ...iSel, display: "flex", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", padding: "2px 4px" }}>
        <span>{value}</span><span style={{ fontSize: 7 }}>▾</span>
      </div>
      {isOpen && pos && (
        <div id={`drop-${id}`} style={{ position: "fixed", top: pos.top, left: pos.left, width: 60, background: "#1A1A1A", border: "1px solid #444", borderRadius: 8, zIndex: 9999, boxShadow: "0 8px 28px rgba(0,0,0,.7)", overflow: "hidden" }}>
          {OPCIONES_TINTAS_PLASTICO.map(o => (
            <div key={o} onMouseDown={() => seleccionar(o)}
              style={{ padding: "6px 0", textAlign: "center", cursor: "pointer", fontSize: 11, color: value === o ? "#C9922A" : "#CCC", fontWeight: value === o ? 700 : 400, background: value === o ? "#C9922A18" : "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2A2A2A")}
              onMouseLeave={e => (e.currentTarget.style.background = value === o ? "#C9922A18" : "transparent")}>
              {o}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── CantidadSelect ───────────────────────────────────────────────────────────
interface CantidadProps { id: string; value: string; onChange: (v: string) => void; }
export function CantidadSelect({ id, value, onChange }: CantidadProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<DropPos | null>(null);
  const openId = useOpenId();
  const isOpen = openId === id;
  const abrir = () => { if (isOpen) { closeDrop(); return; } if (triggerRef.current) setPos(calcPos(triggerRef.current)); openDrop(id); };
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: MouseEvent) => {
      const el = document.getElementById(`drop-${id}`);
      if (el && !el.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) closeDrop();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [isOpen, id]);
  const seleccionar = (v: string) => { onChange(v); closeDrop(); };
  return (
    <>
      <div ref={triggerRef} onClick={abrir} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", borderBottom: "1px solid #C9922A", padding: "1px 2px" }}>
        <span style={{ color: "#C9922A", fontSize: 10, fontWeight: 700 }}>{value}</span>
        <span className="no-print-show" style={{ color: "#C9922A88", fontSize: 8 }}>▾</span>
      </div>
      {isOpen && pos && (
        <div id={`drop-${id}`} style={{ position: "fixed", top: pos.top, left: pos.left, width: 110, background: "#1A1A1A", border: "1px solid #444", borderRadius: 8, zIndex: 9999, boxShadow: "0 8px 28px rgba(0,0,0,.7)", overflow: "hidden" }}>
          {CANT_OPCIONES.map(o => (
            <div key={o} onMouseDown={() => seleccionar(o)}
              style={{ padding: "7px 14px", cursor: "pointer", fontSize: 11, color: value === o ? "#C9922A" : "#CCC", fontWeight: value === o ? 700 : 400, background: value === o ? "#C9922A18" : "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2A2A2A")}
              onMouseLeave={e => (e.currentTarget.style.background = value === o ? "#C9922A18" : "transparent")}>
              {o}
            </div>
          ))}
          <div style={{ borderTop: "1px solid #2A2A2A", padding: "5px 8px" }}>
            <input placeholder="Otra cantidad..."
              style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: 4, padding: "5px 7px", color: "#EEE", fontSize: 11, outline: "none", fontFamily: "'Inter',sans-serif" }}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Enter") { seleccionar((e.target as HTMLInputElement).value || value); } }}
              onBlur={e => { if (e.target.value) seleccionar(e.target.value); }} />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helpers precio ───────────────────────────────────────────────────────────
export const parsePrecio = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
export const fmtPrecio = (n: number) => `$${n.toFixed(2)}`;
export const conExtra = (base: string, extra: number) => extra ? fmtPrecio(parsePrecio(base) + extra) : base;

// ─── ExtraOPigmentoCell ───────────────────────────────────────────────────────
interface ExtraPigmentoProps {
  id: string; esPlastico: boolean;
  modo: "precio" | "pigmento"; setModo: (m: "precio" | "pigmento") => void;
  extra: string; setExtra: (v: string) => void;
  pigmento: string; setPigmento: (v: string) => void;
  pigmentosDB: PigmentoDB[];
}
export function ExtraOPigmentoCell({ id, esPlastico, modo, setModo, extra, setExtra, pigmento, setPigmento, pigmentosDB }: ExtraPigmentoProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<DropPos | null>(null);
  const openId = useOpenId();
  const isOpen = openId === id;
  const [eligioOtro, setEligioOtro] = useState(false);
  const abrirModo = () => { if (isOpen) { closeDrop(); return; } if (triggerRef.current) setPos(calcPos(triggerRef.current)); openDrop(id); };
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: MouseEvent) => {
      const el = document.getElementById(`drop-${id}`);
      if (el && !el.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) closeDrop();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [isOpen, id]);
  const extraNum = parsePrecio(extra);

  const esColorDB = pigmentosDB.some(p => {
    const label = p.codigo ? `${p.nombre} (${p.codigo})` : p.nombre;
    return label === pigmento || p.nombre === pigmento;
  });
  const mostrarComoOtro = eligioOtro || (pigmento !== "" && !esColorDB);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", width: "100%", boxSizing: "border-box" }}>
      <div ref={triggerRef} onClick={abrirModo} title={modo === "pigmento" ? "Pigmento" : "Precio extra"}
        style={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", fontSize: 10 }}>
        <span>{modo === "pigmento" ? "🎨" : "💲"}</span>
        <span style={{ fontSize: 6, color: "#999" }}>▾</span>
      </div>
      {isOpen && pos && (
        <div id={`drop-${id}`} style={{ position: "fixed", top: pos.top, left: pos.left, width: 130, background: "#1A1A1A", border: "1px solid #444", borderRadius: 8, zIndex: 9999, boxShadow: "0 8px 28px rgba(0,0,0,.7)", overflow: "hidden" }}>
          <div onMouseDown={() => { setModo("precio"); closeDrop(); }}
            style={{ padding: "7px 12px", cursor: "pointer", fontSize: 11, color: modo === "precio" ? "#C9922A" : "#CCC", fontWeight: modo === "precio" ? 700 : 400, background: modo === "precio" ? "#C9922A18" : "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#2A2A2A")}
            onMouseLeave={e => (e.currentTarget.style.background = modo === "precio" ? "#C9922A18" : "transparent")}>
            💲 Precio extra
          </div>
          {esPlastico && (
            <div onMouseDown={() => { setModo("pigmento"); closeDrop(); }}
              style={{ padding: "7px 12px", cursor: "pointer", fontSize: 11, color: modo === "pigmento" ? "#C9922A" : "#CCC", fontWeight: modo === "pigmento" ? 700 : 400, background: modo === "pigmento" ? "#C9922A18" : "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2A2A2A")}
              onMouseLeave={e => (e.currentTarget.style.background = modo === "pigmento" ? "#C9922A18" : "transparent")}>
              🎨 Pigmento
            </div>
          )}
          {!esPlastico && <div style={{ padding: "6px 12px", fontSize: 9, color: "#444", fontStyle: "italic" }}>Pigmento solo aplica a plástico</div>}
        </div>
      )}

      {modo === "precio" ? (
        <>
          <input style={{ ...iC, fontSize: 8, color: extraNum ? "#22C55E" : "#999", width: "100%", boxSizing: "border-box" }}
            value={extra} placeholder="+$" title="Cargo extra por pieza"
            onChange={e => setExtra(e.target.value.replace(/[^0-9.]/g, ""))} />
          {extraNum > 0 && <div style={{ fontSize: 6, color: "#22C55E", lineHeight: 1 }}>+${extraNum}/pz</div>}
        </>
      ) : mostrarComoOtro ? (
        <input autoFocus value={pigmento} onChange={e => setPigmento(e.target.value)}
          onBlur={() => { if (!pigmento) setEligioOtro(false); }} placeholder="Color..."
          style={{ width: "100%", boxSizing: "border-box", background: "#F0E8D8", border: "1px solid #D4C9B8", borderRadius: 3, color: "#1A1A1A", fontSize: 7.5, padding: "2px 3px", outline: "none", fontFamily: "'Inter',sans-serif" }} />
      ) : (
        <select style={{ ...iSel, fontSize: 7.5, width: "100%", boxSizing: "border-box" }} value={pigmento}
          onChange={e => {
            if (e.target.value === "__otro__") { setEligioOtro(true); setPigmento(""); }
            else { setEligioOtro(false); setPigmento(e.target.value); }
          }}>
          <option value="">— Color —</option>
          {pigmentosDB.map(o => {
            const label = o.codigo ? `${o.nombre} (${o.codigo})` : o.nombre;
            return <option key={o.id} value={label}>{label}</option>;
          })}
          <option value="__otro__">Otro...</option>
        </select>
      )}
    </div>
  );
}

// ─── FilaVacia ────────────────────────────────────────────────────────────────
interface FilaVaciaProps {
  onElegir: (p: Producto) => void;
  catalogoPropio: Producto[];
  catalogs: Catalogs;
}
export function FilaVacia({ onElegir, catalogoPropio, catalogs }: FilaVaciaProps) {
  const [open, setOpen] = useState(false);
  const vaciarYElegir = (p: Producto) => {
    const soloIdentidad: Producto = {
      id: p.id, fuente: p.fuente, nombre: p.nombre, categoria: p.categoria, imagen: p.imagen,
      medida: "", material: "", calibre: "", tintas: "",
      laminacion: false, hs: false, ar: false, textura: false, uv: false, asa: false, otro: "",
      precio500: "", precio1000: "", precio3000: "",
      tipo:         p.tipo,
      tipoProducto: p.tipoProducto,
    };
    onElegir(soloIdentidad);
    setOpen(false);
  };
  return (
    <>
      <tr onClick={() => setOpen(true)} style={{ cursor: "pointer" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#EFE6D3")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
        {Array.from({ length: 15 }).map((_, j) => (
          <td key={j} style={{ ...TD, height: 22 }}>
            {j === 0 && <span style={{ color: "#B8A880", fontSize: 8, fontStyle: "italic" }}>+ elegir producto</span>}
          </td>
        ))}
      </tr>
      {open && (
        <BuscadorProductoModal
          catalogoPropio={catalogoPropio}
          onClose={() => setOpen(false)}
          onElegir={vaciarYElegir}
          catalogs={catalogs}
        />
      )}
    </>
  );
}

// ─── FilaTabla ────────────────────────────────────────────────────────────────
interface FilaProps {
  fila:           FilaProducto;
  rowIdx:         number;
  onDel:          (uid: string) => void;
  onEdit:         (uid: string, k: keyof FilaProducto, v: string | boolean | number | null) => void;
  onEditNombre:   (uid: string, nuevoNombre: string) => void;
  catalogs:       Catalogs;
  foils:          FoilOpcion[];
  texturas:       TexturaOpcion[];
  catalogosPlast: CatalogosPlastico;
  pigmentosDB:    PigmentoDB[];
  coloresAsa:     { id: number; nombre: string }[];
  suajesPlast:    { id: number; tipo: string }[];
  // Opciones filtradas del producto de papel del sistema
  // Si vienen, se usan en lugar del catálogo completo
  asasPermitidas?:      AsaPermitida[]      | null;
  laminadosPermitidos?: LaminadoPermitido[] | null;
}

export const FilaTabla = memo(function FilaTabla({
  fila, rowIdx, onDel, onEdit, onEditNombre,
  catalogs, foils, texturas, catalogosPlast, pigmentosDB, coloresAsa, suajesPlast,
  asasPermitidas, laminadosPermitidos,
}: FilaProps) {
  const { uid, producto: p } = fila;
  const pre = `r${rowIdx}`;
  const esPlastico = p.categoria === "plastico";

  const [nombre,     setNombre]     = useState(p.nombre);
  const [medida,     setMedida]     = useState(fila.medida || p.medida);
  const [precio1,    setPrecio1]    = useState(fila.precio1);
  const [precio2,    setPrecio2]    = useState(fila.precio2);
  const [precio3,    setPrecio3]    = useState(fila.precio3);
  const [extra,      setExtra]      = useState(fila.extra || "");
  const [tintas,     setTintas]     = useState(fila.tintas);
  const [laminacion, setLaminacion] = useState(fila.laminacion);
  const [tipoLam,    setTipoLam]    = useState(fila.tipoLaminado);
  const [hs,         setHs]         = useState(fila.hs);
  const [tipoHs,     setTipoHs]     = useState(fila.tipoHs);
  const [ar,         setAr]         = useState(fila.ar);
  const [textura,    setTextura]    = useState(fila.textura);
  const [tipoTex,    setTipoTex]    = useState(fila.tipoTextura);
  const [uv,         setUv]         = useState(fila.uv);
  const [asa,        setAsa]        = useState(fila.asa);
  const [tipoAsa,    setTipoAsa]    = useState(fila.tipoAsa);
  const [idSuaje,    setIdSuaje]    = useState<number | null>(fila.idSuaje ?? null);
  const [modoExtra,  setModoExtra]  = useState<"precio" | "pigmento">(fila.modoExtra || "precio");
  const [pigmento,   setPigmento]   = useState(fila.pigmento || "");

  const [matPlastNom, setMatPlastNom] = useState(esPlastico ? (fila.material || p.material || "") : "");
  const [calPlastNom, setCalPlastNom] = useState(esPlastico ? (fila.calibre || p.calibre || "") : "");
  const [tipoPlastNom,setTipoPlastNom]= useState(fila.tipoPlastico || p.tipoProducto || "");

  const esBopp = matPlastNom.toUpperCase() === "BOPP";
  const calibresFila = esPlastico
    ? catalogosPlast.calibres
        .filter(c => esBopp ? c.calibre_bopp != null : c.calibre_bopp == null)
        .map(c => ({ ...c, valor: esBopp ? String(c.calibre_bopp!) : String(c.valor) }))
    : [];

  const [matPapelNom, setMatPapelNom] = useState(!esPlastico ? (fila.material || p.material || "") : "");
  const [calPapelNom, setCalPapelNom] = useState(!esPlastico ? (fila.calibre || p.calibre || "") : "");

  const propagar = useCallback((k: keyof FilaProducto, v: string | boolean | number | null) => onEdit(uid, k, v), [uid, onEdit]);
  const extraNum = parsePrecio(extra);

  const chkPill = (active: boolean, toggle: () => void) => (
    <span role="checkbox" aria-checked={active} tabIndex={0} style={pill(active)}
      onClick={toggle} onKeyDown={e => e.key === " " && toggle()}>
      {active ? "✓" : ""}
    </span>
  );

  // ── Opciones de catálogo ──────────────────────────────────────────────────
  // Para papel del sistema: usar las opciones filtradas si existen.
  // Para papel expo propio o plástico: usar el catálogo completo.
  const laminadoOpts = (laminadosPermitidos && laminadosPermitidos.length > 0)
    ? laminadosPermitidos.map(l => ({ id: l.idcat_laminado, nombre: l.nombre }))
    : (catalogs.laminado ?? []);

  const asaOpts = (asasPermitidas && asasPermitidas.length > 0)
    ? asasPermitidas.map(a => ({ id: a.idcat_tipo_asa, nombre: a.nombre }))
    : (catalogs.tipo_asa ?? []);

  const foilOpts     = foils                 ?? [];
  const texturaOpts  = texturas              ?? [];
  const matPapelOpts = catalogs.tipo_papel   ?? [];
  const calPapelOpts = catalogs.calibre      ?? [];
  const matPlastOpts = catalogosPlast.materiales    ?? [];
  const tipoPlastOpts= catalogosPlast.tiposProducto ?? [];

  const matCalPrint  = esPlastico
    ? [matPlastNom, calPlastNom].filter(Boolean).join(" · ") || "—"
    : [matPapelNom, calPapelNom].filter(Boolean).join(" · ") || "—";
  const lamTipoPrint = esPlastico ? (tipoPlastNom || "—") : (laminacion ? tipoLam : "—");
  const hsPrint      = !esPlastico && hs ? tipoHs : "—";
  const arPrint      = !esPlastico && ar ? "✓" : "—";
  const texturaPrint = !esPlastico && textura ? tipoTex : "—";
  const uvPrint      = !esPlastico && uv ? "✓" : "—";
  const asaSuajePrint = esPlastico && idSuaje
    ? (suajesPlast.find(s => s.id === idSuaje)?.tipo || "—")
    : "—";
  const asaColorPrint = esPlastico && tipoAsa ? tipoAsa : "";
  const asaPrint = esPlastico
    ? (asaSuajePrint !== "—" ? `${asaSuajePrint}${asaColorPrint ? " · " + asaColorPrint : ""}` : "—")
    : (asa ? tipoAsa : "—");
  const extraPrint   = modoExtra === "pigmento" ? (pigmento || "—") : (extraNum > 0 ? `+$${extraNum}` : "—");

  const precio1ConExtra = extraNum > 0 && modoExtra === "precio" ? conExtra(precio1, extraNum) : precio1;
  const precio2ConExtra = extraNum > 0 && modoExtra === "precio" ? conExtra(precio2, extraNum) : precio2;
  const precio3ConExtra = extraNum > 0 && modoExtra === "precio" ? conExtra(precio3, extraNum) : precio3;

  return (
    <tr>
      {/* Nombre */}
      <td style={TDL}>
        <input className="no-print-show" value={nombre}
          onChange={e => setNombre(e.target.value)}
          onBlur={() => { if (nombre.trim()) onEditNombre(uid, nombre.trim()); else setNombre(p.nombre); }}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="Nombre del producto"
          style={{ background: "transparent", border: "none", borderBottom: "1px dashed #C9922A66", color: "#1A1A1A", fontWeight: 600, fontSize: 9.5, width: "100%", outline: "none", fontFamily: "'Inter',sans-serif", padding: "1px 0" }} />
        <span className="print-only">{nombre}</span>
      </td>

      {/* Medida */}
      <td style={{ ...TD, cursor: "pointer" }}>
        <span className="no-print-show">
          <MedidaSelect id={`${pre}-med`} value={medida} categoria={p.categoria} onChange={v => { setMedida(v); propagar("medida", v); }} />
        </span>
        <span className="print-only">{medida || "—"}</span>
      </td>

      {/* Material / Calibre */}
      <td style={{ ...TD, lineHeight: 1.4 }}>
        <div className="no-print-show">
          {esPlastico ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <select style={{ ...iSel, fontSize: 8 }} value={matPlastNom}
                onChange={e => {
                  const nom = e.target.value;
                  setMatPlastNom(nom); setCalPlastNom("");
                  propagar("material", nom); propagar("calibre", "");
                }}>
                <option value="">Material</option>
                {matPlastOpts.map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
              </select>
              <select style={{ ...iSel, fontSize: 7.5 }} value={calPlastNom} disabled={!matPlastNom}
                onChange={e => { setCalPlastNom(e.target.value); propagar("calibre", e.target.value); }}>
                <option value="">{matPlastNom ? "Calibre" : "—"}</option>
                {calibresFila.map(o => (
                  <option key={o.id} value={String(o.valor)}>
                    {o.valor}{o.gramos ? ` (${o.gramos}g)` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <select style={{ ...iSel, fontSize: 8 }} value={matPapelNom}
                onChange={e => { setMatPapelNom(e.target.value); propagar("material", e.target.value); }}>
                <option value="">Material</option>
                {matPapelOpts.map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
              </select>
              <select style={{ ...iSel, fontSize: 7.5 }} value={calPapelNom}
                onChange={e => { setCalPapelNom(e.target.value); propagar("calibre", e.target.value); }}>
                <option value="">Calibre</option>
                {calPapelOpts.map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
        <span className="print-only">{matCalPrint}</span>
      </td>

      {/* Tintas */}
      <td style={TD}>
        <span className="no-print-show">
          {esPlastico
            ? <TintasPlasticoSelect id={`${pre}-tin`} value={tintas} onChange={v => { setTintas(v); propagar("tintas", v); }} />
            : <TintasSelect id={`${pre}-tin`} value={tintas} onChange={v => { setTintas(v); propagar("tintas", v); }} />
          }
        </span>
        <span className="print-only">{tintas || "—"}</span>
      </td>

      {esPlastico ? (
        <>
          <td style={{ ...TD, fontSize: 8 }}>
            <select className="no-print-show" style={{ ...iSel, maxWidth: 90 }} value={tipoPlastNom}
              onChange={e => {
                const nom = e.target.value;
                setTipoPlastNom(nom);
                propagar("otro", nom); propagar("tipoPlastico", nom);
              }}>
              <option value="">Sin tipo</option>
              {tipoPlastOpts.map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
            </select>
            <span className="print-only">{lamTipoPrint}</span>
          </td>
          <td style={TD}><span style={{ color: "#CCC", fontSize: 8 }}>—</span></td>
          <td style={TD}><span style={{ color: "#CCC", fontSize: 8 }}>—</span></td>
          <td style={TD}><span style={{ color: "#CCC", fontSize: 8 }}>—</span></td>
          <td style={TD}><span style={{ color: "#CCC", fontSize: 8 }}>—</span></td>
        </>
      ) : (
        <>
          {/* Laminado — usa opciones filtradas si el producto es del sistema */}
          <td style={{ ...TD, fontSize: 8 }}>
            <select className="no-print-show" style={{ ...iSel, maxWidth: 82 }} value={laminacion ? tipoLam : ""}
              onChange={e => {
                const v = e.target.value;
                const item = laminadoOpts.find(x => x.nombre === v);
                setLaminacion(v !== ""); setTipoLam(v);
                propagar("laminacion", v !== ""); propagar("tipoLaminado", v);
                propagar("idLaminado", item?.id ?? null);
              }}>
              <option value="">Sin laminado</option>
              {laminadoOpts.map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
            </select>
            <span className="print-only">{lamTipoPrint}</span>
          </td>
          {/* Foil */}
          <td style={{ ...TD, fontSize: 8 }}>
            <select className="no-print-show" style={iSel} value={hs ? tipoHs : ""}
              onChange={e => {
                const v = e.target.value;
                const item = foilOpts.find(x => `${x.colorfoil}${x.codigofoil ? " " + x.codigofoil : ""}` === v);
                setHs(v !== ""); setTipoHs(v);
                propagar("hs", v !== ""); propagar("tipoHs", v);
                propagar("idFoil", item?.idfoil ?? null);
              }}>
              <option value="">Sin foil</option>
              {foilOpts.map(o => {
                const label = `${o.colorfoil}${o.codigofoil ? " " + o.codigofoil : ""}`;
                return <option key={o.idfoil} value={label}>{label}</option>;
              })}
            </select>
            <span className="print-only">{hsPrint}</span>
          </td>
          {/* AR */}
          <td style={TD}>
            <span className="no-print-show">{chkPill(ar, () => { setAr(v => { propagar("ar", !v); return !v; }); })}</span>
            <span className="print-only">{arPrint}</span>
          </td>
          {/* Textura */}
          <td style={{ ...TD, fontSize: 8 }}>
            <select className="no-print-show" style={iSel} value={textura ? tipoTex : ""}
              onChange={e => {
                const v = e.target.value;
                const item = texturaOpts.find(x => x.nombre === v);
                setTextura(v !== ""); setTipoTex(v);
                propagar("textura", v !== ""); propagar("tipoTextura", v);
                propagar("idTextura", item?.idcat_textura ?? null);
              }}>
              <option value="">Sin textura</option>
              {texturaOpts.map(o => <option key={o.idcat_textura} value={o.nombre}>{o.nombre}</option>)}
            </select>
            <span className="print-only">{texturaPrint}</span>
          </td>
          {/* UV */}
          <td style={TD}>
            <span className="no-print-show">{chkPill(uv, () => { setUv(v => { propagar("uv", !v); return !v; }); })}</span>
            <span className="print-only">{uvPrint}</span>
          </td>
        </>
      )}

      {/* Asa — plástico: tipo (idsuaje) + color; papel: tipo de asa filtrado si es del sistema */}
      <td style={{ ...TD, fontSize: 8 }}>
        {esPlastico ? (
          <div className="no-print-show" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <select style={{ ...iSel, fontSize: 7.5 }} value={idSuaje ?? ""}
              onChange={e => {
                const v = e.target.value;
                const id = v !== "" ? Number(v) : null;
                setIdSuaje(id);
                setAsa(id !== null);
                propagar("idSuaje", id);
                propagar("asa", id !== null);
                setTipoAsa("");
                propagar("tipoAsa", "");
                propagar("idAsa", null);
              }}>
              <option value="">Sin asa</option>
              {suajesPlast.map(s => (
                <option key={s.id} value={s.id}>{s.tipo}</option>
              ))}
            </select>
            {idSuaje !== null && (
              <select style={{ ...iSel, fontSize: 7.5 }} value={tipoAsa}
                onChange={e => {
                  const v = e.target.value;
                  const colorItem = coloresAsa.find(c => c.nombre === v);
                  setTipoAsa(v);
                  propagar("tipoAsa", v);
                  propagar("idAsa", colorItem?.id ?? null);
                }}>
                <option value="">Color (opc.)</option>
                {coloresAsa.map(o => (
                  <option key={o.id} value={o.nombre}>{o.nombre}</option>
                ))}
              </select>
            )}
          </div>
        ) : (
          // Papel: usa asaOpts (filtradas o catálogo completo según fuente del producto)
          <select className="no-print-show" style={iSel} value={asa ? tipoAsa : ""}
            onChange={e => {
              const v = e.target.value;
              const item = asaOpts.find(x => x.nombre === v);
              setAsa(v !== ""); setTipoAsa(v);
              propagar("asa", v !== ""); propagar("tipoAsa", v);
              propagar("idAsa", item?.id ?? null);
              propagar("idSuaje", null);
            }}>
            <option value="">Sin asa</option>
            {asaOpts.map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
          </select>
        )}
        <span className="print-only">{asaPrint}</span>
      </td>

      {/* Extra / Pigmento */}
      <td style={TD}>
        <span className="no-print-show">
          <ExtraOPigmentoCell
            id={`${pre}-extra`} esPlastico={esPlastico}
            modo={modoExtra} setModo={v => { setModoExtra(v); propagar("modoExtra", v); }}
            extra={extra} setExtra={v => { setExtra(v); propagar("extra", v); }}
            pigmento={pigmento} setPigmento={v => { setPigmento(v); propagar("pigmento", v); }}
            pigmentosDB={pigmentosDB}
          />
        </span>
        <span className="print-only">{extraPrint}</span>
      </td>

      {/* Precios */}
      <td style={TDP}>
        <input className="no-print-show" style={iP} value={precio1} placeholder="$0.00"
          onChange={e => setPrecio1(e.target.value)} onBlur={() => propagar("precio1", precio1)} />
        {extraNum > 0 && modoExtra === "precio" && (
          <div className="no-print-show" style={{ fontSize: 7, color: "#22C55E", lineHeight: 1 }}>{precio1ConExtra}</div>
        )}
        <span className="print-only">{precio1ConExtra}</span>
      </td>
      <td style={TDP}>
        <input className="no-print-show" style={iP} value={precio2} placeholder="$0.00"
          onChange={e => setPrecio2(e.target.value)} onBlur={() => propagar("precio2", precio2)} />
        {extraNum > 0 && modoExtra === "precio" && (
          <div className="no-print-show" style={{ fontSize: 7, color: "#22C55E", lineHeight: 1 }}>{precio2ConExtra}</div>
        )}
        <span className="print-only">{precio2ConExtra}</span>
      </td>
      <td style={TDP}>
        <input className="no-print-show" style={iP} value={precio3} placeholder="$0.00"
          onChange={e => setPrecio3(e.target.value)} onBlur={() => propagar("precio3", precio3)} />
        {extraNum > 0 && modoExtra === "precio" && (
          <div className="no-print-show" style={{ fontSize: 7, color: "#22C55E", lineHeight: 1 }}>{precio3ConExtra}</div>
        )}
        <span className="print-only">{precio3ConExtra}</span>
      </td>

      {/* Eliminar */}
      <td style={TD} className="no-print">
        <button onClick={() => onDel(uid)}
          style={{ background: "transparent", border: "1px solid #CCC", color: "#CCC", width: 18, height: 18, borderRadius: "50%", cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0 }}>×</button>
      </td>
    </tr>
  );
});