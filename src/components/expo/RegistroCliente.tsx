import { useState } from "react";
import {
  CLIENTE_VACIO, ESTADOS_MX, CORREO_EXT,
} from "../../types/expo/expo.types";
import type { ClienteExpo } from "../../types/expo/expo.types";

interface Props {
  clienteData:       ClienteExpo;
  setClienteData:    React.Dispatch<React.SetStateAction<ClienteExpo>>;
  clienteGuardado:   ClienteExpo | null;
  clientes:          ClienteExpo[];
  setClientes:       React.Dispatch<React.SetStateAction<ClienteExpo[]>>;
  mob:               boolean;
  onCotizar:         () => void;
  onCerrar:          () => void;
}

const LSR: React.CSSProperties = { display:"block", fontSize:10, fontWeight:700, color:"#666", letterSpacing:1, textTransform:"uppercase", marginBottom:5 };
const ISR: React.CSSProperties = { width:"100%", background:"#1A1A1A", border:"1px solid #2A2A2A", borderRadius:7, padding:"10px 12px", color:"#EEE", fontSize:13, outline:"none", fontFamily:"'Inter',sans-serif", marginBottom:4 };

const CLASE_COLOR: Record<string, string> = { AAA:"#C9922A", AA:"#C9922A", A:"#C9922A", "":"#444" };

// ─── Modal de prospectos guardados ────────────────────────────────────────────
interface ModalProspectosProps {
  clientes: ClienteExpo[];
  onEditar: (idx: number) => void;
  onEliminar: (idx: number) => void;
  onClose: () => void;
}

function correoCompleto(c: ClienteExpo) {
  if (!c.correoUsuario) return "—";
  const ext = c.correoExt === "__otro__" ? (c.correoExtCustom || "") : c.correoExt;
  return `${c.correoUsuario}@${ext}`;
}

function ModalProspectos({ clientes, onEditar, onEliminar, onClose }: ModalProspectosProps) {
  const [expandidoIdx, setExpandidoIdx] = useState<number | null>(null);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.82)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"#141414", border:"1px solid #2A2A2A", borderRadius:14, width:"100%", maxWidth:780, maxHeight:"88vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,.85)" }}>

        {/* Header */}
        <div style={{ background:"#0D0D0D", borderBottom:"2px solid #C9922A", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>👥</span>
            <div>
              <div style={{ color:"#FFF", fontSize:13, fontWeight:700, letterSpacing:.5 }}>Prospectos registrados</div>
              <div style={{ color:"#555", fontSize:9.5, marginTop:1 }}>{clientes.length} {clientes.length === 1 ? "prospecto" : "prospectos"} en total</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid #333", color:"#888", fontSize:11, fontWeight:600, padding:"6px 14px", borderRadius:6, cursor:"pointer" }}>
            ✕ Cerrar
          </button>
        </div>

        {/* Lista */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 20px 20px" }}>
          {clientes.length === 0 ? (
            <div style={{ textAlign:"center", padding:"50px 0", color:"#444" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>👤</div>
              <div style={{ fontSize:13 }}>Aún no hay prospectos guardados</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {clientes.map((c, idx) => {
                const abierto = expandidoIdx === idx;
                const claseColor = CLASE_COLOR[c.clase] || "#444";
                return (
                  <div key={idx} style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, overflow:"hidden" }}>
                    {/* Fila resumen — siempre visible */}
                    <div onClick={() => setExpandidoIdx(abierto ? null : idx)}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", cursor:"pointer" }}>
                      <div style={{ width:34, height:34, borderRadius:"50%", background:"#C9922A18", border:"1.5px solid #C9922A44", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ color:"#C9922A", fontSize:13, fontWeight:700 }}>{c.nombre.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ color:"#EEE", fontSize:13, fontWeight:700 }}>{c.nombre || "Sin nombre"}</span>
                          {c.clase && (
                            <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:8, background:`${claseColor}18`, color:claseColor, border:`1px solid ${claseColor}44`, letterSpacing:.5 }}>
                              {c.clase}
                            </span>
                          )}
                        </div>
                        <div style={{ color:"#555", fontSize:10, marginTop:2, display:"flex", gap:10, flexWrap:"wrap" }}>
                          {c.impresion && <span>🏢 {c.impresion}</span>}
                          {c.correoUsuario && <span>✉ {correoCompleto(c)}</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                        <button
                          onClick={e => { e.stopPropagation(); onEditar(idx); }}
                          style={{ background:"transparent", border:"1px solid #333", color:"#AAA", fontSize:10, fontWeight:600, padding:"5px 10px", borderRadius:6, cursor:"pointer" }}>
                          ✏ Editar
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); onEliminar(idx); }}
                          style={{ background:"transparent", border:"1px solid #EF444433", color:"#EF4444", fontSize:10, fontWeight:600, padding:"5px 10px", borderRadius:6, cursor:"pointer" }}>
                          🗑 Eliminar
                        </button>
                      </div>
                      <span style={{ color:"#555", fontSize:11, flexShrink:0 }}>{abierto ? "▲" : "▼"}</span>
                    </div>

                    {/* Detalle expandido */}
                    {abierto && (
                      <div style={{ borderTop:"1px solid #222", padding:"12px 14px", background:"#141414" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginBottom:10 }}>
                          <Campo label="Nombre"   value={c.nombre} />
                          <Campo label="Celular"  value={c.celular} />
                          <Campo label="Correo"   value={correoCompleto(c)} />
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginBottom:10 }}>
                          <Campo label="Empresa"  value={c.impresion} />
                          <Campo label="Ciudad"   value={c.ciudad} />
                          <Campo label="Estado"   value={c.estado} />
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:10, marginBottom: c.observaciones ? 10 : 0 }}>
                          <Campo label="Clasificación" value={c.clase || "—"} />
                          <Campo label="Le interesa"   value={c.intereses.length ? c.intereses.join(", ") : "—"} />
                        </div>
                        {c.observaciones && (
                          <div style={{ paddingTop:10, borderTop:"1px solid #222" }}>
                            <Campo label="Observaciones" value={c.observaciones} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color:"#555", fontSize:8.5, textTransform:"uppercase", letterSpacing:.5, marginBottom:1 }}>{label}</div>
      <div style={{ color:"#DDD", fontSize:10.5, fontWeight:600 }}>{value || "—"}</div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RegistroCliente({
  clienteData, setClienteData, clienteGuardado, clientes, setClientes,
  mob, onCotizar, onCerrar,
}: Props) {

  const [modalProspectos, setModalProspectos] = useState(false);
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);

  const setCF = (k: keyof ClienteExpo, v: unknown) =>
    setClienteData(prev => ({ ...prev, [k]: v }));

  const toggleInteres = (i: ClienteExpo["intereses"][number]) =>
    setClienteData(prev => ({
      ...prev,
      intereses: prev.intereses.includes(i)
        ? prev.intereses.filter(x => x !== i)
        : [...prev.intereses, i],
    }));

  const soloGuardar = () => {
    if (editandoIdx !== null) {
      // Guardar edición
      setClientes(prev => prev.map((c, i) => i === editandoIdx ? clienteData : c));
      setEditandoIdx(null);
      setClienteData(CLIENTE_VACIO);
      alert(`✅ Prospecto "${clienteData.nombre}" actualizado.`);
    } else {
      setClientes(prev => [...prev, clienteData]);
      setClienteData(CLIENTE_VACIO);
      alert(`✅ Cliente "${clienteData.nombre}" guardado correctamente.`);
    }
  };

  const editarProspecto = (idx: number) => {
    setClienteData(clientes[idx]);
    setEditandoIdx(idx);
    setModalProspectos(false);
  };

  const eliminarProspecto = (idx: number) => {
    const nombre = clientes[idx].nombre || "este prospecto";
    if (confirm(`¿Eliminar a "${nombre}"?`)) {
      setClientes(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const cancelarEdicion = () => {
    setEditandoIdx(null);
    setClienteData(CLIENTE_VACIO);
  };

  const puedeAvanzar = clienteData.nombre.trim().length > 0;

  return (
    <>
      <div
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding: mob ? 0 : 20 }}
        onClick={clienteGuardado ? onCerrar : undefined}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ background:"#141414", border:"1px solid #2A2A2A", borderRadius: mob ? 0 : 14, width:"100%", maxWidth: mob ? "100%" : 820, maxHeight: mob ? "100vh" : "92vh", height: mob ? "100vh" : undefined, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,.8)" }}
        >
          {/* Header */}
          <div style={{ background:"#0D0D0D", borderBottom:"2px solid #C9922A", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ color:"#C9922A", fontSize:22, fontWeight:700, fontFamily:"Georgia,serif" }}>EB</div>
              <div>
                <div style={{ color:"#FFF", fontSize:12, fontWeight:700, letterSpacing:1 }}>
                  {editandoIdx !== null ? `Editando: ${clientes[editandoIdx]?.nombre || "prospecto"}` : "Nuevo prospecto"}
                </div>
                <div style={{ color:"#555", fontSize:9, letterSpacing:.5 }}>Registra los datos antes de cotizar</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {/* Botón ver prospectos */}
              <button
                onClick={() => setModalProspectos(true)}
                style={{ background:"transparent", border:"1px solid #C9922A44", color:"#C9922A", fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                👥 Prospectos
                {clientes.length > 0 && (
                  <span style={{ background:"#C9922A", color:"#0D0D0D", fontSize:9, fontWeight:700, borderRadius:"50%", width:16, height:16, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                    {clientes.length}
                  </span>
                )}
              </button>
              {editandoIdx !== null && (
                <button onClick={cancelarEdicion} style={{ background:"transparent", border:"1px solid #555", color:"#AAA", fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:6, cursor:"pointer" }}>
                  ✕ Cancelar edición
                </button>
              )}
              {clienteGuardado && editandoIdx === null && (
                <button onClick={onCerrar} style={{ background:"transparent", border:"1px solid #333", color:"#888", fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:6, cursor:"pointer" }}>
                  ✕ Cerrar
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ flex:1, overflow:"auto", padding: mob ? "14px" : "20px 24px" }}>
            <div style={{ display:"grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 12 : 16 }}>

              {/* ── Col izquierda ── */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

                {/* Contacto */}
                <div style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, padding:14 }}>
                  <div style={{ color:"#C9922A", fontSize:9, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                    <span>👤</span> Datos de contacto
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <div>
                      <label style={LSR}>Nombre *</label>
                      <input style={ISR} value={clienteData.nombre} onChange={e => setCF("nombre", e.target.value)} placeholder="Juan García" />
                    </div>
                    <div>
                      <label style={LSR}>Celular</label>
                      <input style={ISR} value={clienteData.celular} onChange={e => setCF("celular", e.target.value)} placeholder="33 1234 5678" maxLength={15} />
                    </div>
                  </div>
                  <label style={LSR}>Correo</label>
                  <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                    <input style={{ ...ISR, flex:1, marginBottom:0 }} value={clienteData.correoUsuario} onChange={e => setCF("correoUsuario", e.target.value)} placeholder="nombre" />
                    <span style={{ color:"#555", fontSize:12, flexShrink:0 }}>@</span>
                    <select style={{ ...ISR, flex:1, marginBottom:0 }} value={clienteData.correoExt} onChange={e => setCF("correoExt", e.target.value)}>
                      {CORREO_EXT.map(ext => <option key={ext} value={ext}>{ext}</option>)}
                      <option value="__otro__">Otro...</option>
                    </select>
                  </div>
                  {clienteData.correoExt === "__otro__" && (
                    <input style={{ ...ISR, marginTop:6, marginBottom:0 }} value={clienteData.correoExtCustom || ""} onChange={e => setCF("correoExtCustom", e.target.value)} placeholder="empresa.com" autoFocus />
                  )}
                </div>

                {/* Empresa */}
                <div style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, padding:14 }}>
                  <div style={{ color:"#C9922A", fontSize:9, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                    <span>🏢</span> Empresa / Marca
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <div>
                      <label style={LSR}>Impresión *</label>
                      <input style={ISR} value={clienteData.impresion} onChange={e => setCF("impresion", e.target.value)} placeholder="Coca-Cola" />
                    </div>
                    <div>
                      <label style={LSR}>Ciudad</label>
                      <input style={ISR} value={clienteData.ciudad} onChange={e => setCF("ciudad", e.target.value)} placeholder="Guadalajara" />
                    </div>
                  </div>
                  <label style={LSR}>Estado</label>
                  <select style={{ ...ISR, marginBottom:0 }} value={clienteData.estado} onChange={e => setCF("estado", e.target.value)}>
                    {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Col derecha ── */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

                {/* Clasificación */}
                <div style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ color:"#555", fontSize:8, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ fontSize:9 }}>★</span> Clasificación
                  </div>
                  <div style={{ display:"flex", gap:5 }}>
                    {(["AAA", "AA", "A"] as const).map(c => {
                      const sel = clienteData.clase === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setCF("clase", sel ? "" : c)}
                          style={{
                            flex:1, padding:"4px 4px", borderRadius:5,
                            border:`1.5px solid ${sel ? "#C9922A88" : "#2A2A2A"}`,
                            background: sel ? "#C9922A14" : "#0D0D0D",
                            cursor:"pointer", transition:"all .15s",
                            display:"flex", alignItems:"center", justifyContent:"center",
                          }}
                          title={c === "AAA" ? "Alta prioridad" : c === "AA" ? "Media prioridad" : "Baja prioridad"}
                        >
                          <span style={{ fontSize:10, fontWeight:700, color: sel ? "#C9922A" : "#3A3A3A", fontFamily:"Georgia,serif", letterSpacing:.5 }}>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Intereses */}
                <div style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, padding:14 }}>
                  <div style={{ color:"#C9922A", fontSize:9, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                    <span>📦</span> Le interesa
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {([
                      ["papel",    "📄", "Bolsas papel"],
                      ["plastico", "🧴", "Bolsas plástico"],
                      ["cajas",    "📦", "Cajas"],
                      ["otros",    "✨", "Otros"],
                    ] as const).map(([key, emoji, label]) => {
                      const sel = clienteData.intereses.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleInteres(key)}
                          style={{ padding:"10px 8px", borderRadius:8, border:`2px solid ${sel ? "#C9922A" : "#2A2A2A"}`, background: sel ? "rgba(201,146,42,.1)" : "#0D0D0D", cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"all .15s" }}
                        >
                          <span style={{ fontSize:16 }}>{emoji}</span>
                          <span style={{ fontSize:11, fontWeight: sel ? 700 : 400, color: sel ? "#C9922A" : "#555", lineHeight:1.2 }}>{label}</span>
                          {sel && <span style={{ marginLeft:"auto", color:"#C9922A", fontSize:11 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Observaciones */}
                <div style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, padding:14, flex:1, display:"flex", flexDirection:"column" }}>
                  <div style={{ color:"#C9922A", fontSize:9, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                    <span>📝</span> Observaciones
                  </div>
                  <textarea
                    style={{ ...ISR, flex:1, resize:"none", marginBottom:0, minHeight:80 }}
                    value={clienteData.observaciones}
                    onChange={e => setCF("observaciones", e.target.value)}
                    placeholder="Ej. Contactar en 15 días, interesado en 5,000 bolsas..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop:"1px solid #222", padding:"14px 24px", display:"flex", gap:12, flexDirection: mob ? "column" : "row", flexShrink:0, background:"#0D0D0D" }}>
            <button
              onClick={soloGuardar}
              disabled={!puedeAvanzar}
              style={{ flex:1, padding:"11px", background:"transparent", border:`2px solid ${puedeAvanzar ? "#C9922A" : "#2A2A2A"}`, borderRadius:9, color: puedeAvanzar ? "#C9922A" : "#444", fontSize:13, fontWeight:700, cursor: puedeAvanzar ? "pointer" : "not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .15s" }}
            >
              {editandoIdx !== null ? "💾 Guardar cambios" : "💾 Guardar prospecto"}
            </button>
            <button
              onClick={onCotizar}
              disabled={!puedeAvanzar}
              style={{ flex:1, padding:"11px", background: puedeAvanzar ? "#C9922A" : "#1A1000", border:"none", borderRadius:9, color: puedeAvanzar ? "#1A1A1A" : "#444", fontSize:13, fontWeight:700, cursor: puedeAvanzar ? "pointer" : "not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .15s", boxShadow: puedeAvanzar ? "0 4px 20px rgba(201,146,42,.3)" : "none" }}
            >
              📋 Cotizar ahora →
            </button>
          </div>
        </div>
      </div>

      {/* Modal prospectos */}
      {modalProspectos && (
        <ModalProspectos
          clientes={clientes}
          onEditar={editarProspecto}
          onEliminar={eliminarProspecto}
          onClose={() => setModalProspectos(false)}
        />
      )}
    </>
  );
}
