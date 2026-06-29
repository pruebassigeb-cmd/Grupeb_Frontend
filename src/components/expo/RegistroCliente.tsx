import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CLIENTE_VACIO, ESTADOS_MX, CORREO_EXT } from "../../types/expo/expo.types";
import type { ClienteExpo } from "../../types/expo/expo.types";
import {
  crearClienteExpo, getClientesExpo, actualizarClienteExpo,
  eliminarClienteExpo as eliminarClienteExpoAPI,
} from "../../services/expo/expoService";
import type { ClienteExpoAPI } from "../../services/expo/expoService";

interface Props {
  clienteData:    ClienteExpo;
  setClienteData: React.Dispatch<React.SetStateAction<ClienteExpo>>;
  clienteGuardado: ClienteExpo | null;
  mob:            boolean;
  onCotizar:      (clienteId?: number, nombre?: string) => void;
  onCerrar:       () => void;
  cotizacionesCount: number;
  onAbrirLista:      () => void;
}

const LSR: React.CSSProperties = {
  display:"block", fontSize:10, fontWeight:700, color:"#666",
  letterSpacing:1, textTransform:"uppercase", marginBottom:5,
};
const ISR: React.CSSProperties = {
  width:"100%", background:"#1A1A1A", border:"1px solid #2A2A2A",
  borderRadius:7, padding:"10px 12px", color:"#EEE", fontSize:13,
  outline:"none", fontFamily:"'Inter',sans-serif", marginBottom:4,
};
const CLASE_COLOR: Record<string,string> = { AAA:"#C9922A", AA:"#C9922A", A:"#C9922A", "":"#444" };

function correoCompleto(correo: string|null): string {
  if (!correo) return "—";
  return correo;
}

function Campo({ label, value }: { label:string; value:string }) {
  return (
    <div>
      <div style={{ color:"#555", fontSize:8.5, textTransform:"uppercase", letterSpacing:.5, marginBottom:1 }}>{label}</div>
      <div style={{ color:"#DDD", fontSize:10.5, fontWeight:600 }}>{value||"—"}</div>
    </div>
  );
}

// ─── Form de edición inline ───────────────────────────────────────────────────
interface FormEdicionProps {
  inicial: ClienteExpoAPI;
  onGuardar: (data: ClienteExpo) => Promise<void>;
  onCancelar: () => void;
  guardando: boolean;
}

function FormEdicion({ inicial, onGuardar, onCancelar, guardando }: FormEdicionProps) {
  const parsearCorreo = (correo: string|null) => {
    if (!correo) return { usuario:"", ext:"gmail.com", extCustom:"" };
    const idx = correo.lastIndexOf("@");
    if (idx < 0) return { usuario:correo, ext:"gmail.com", extCustom:"" };
    const usuario = correo.slice(0, idx);
    const ext = correo.slice(idx+1);
    const extConocida = CORREO_EXT.includes(ext as any);
    return { usuario, ext: extConocida ? ext : "__otro__", extCustom: extConocida ? "" : ext };
  };

  const { usuario, ext, extCustom } = parsearCorreo(inicial.correo);

  const [form, setForm] = useState<ClienteExpo>({
    nombre:           inicial.nombre || "",
    celular:          inicial.celular || "",
    correoUsuario:    usuario,
    correoExt:        ext,
    correoExtCustom:  extCustom,
    impresion:        inicial.impresion || "",
    ciudad:           inicial.ciudad || "",
    estado:           inicial.estado || "Jalisco",
    clase:            (inicial.clase || "") as ClienteExpo["clase"],
    intereses:        (inicial.intereses || []) as ClienteExpo["intereses"],
    observaciones:    inicial.observaciones || "",
  });

  const setF = (k: keyof ClienteExpo, v: unknown) => setForm(p => ({ ...p, [k]: v }));
  const toggleInteres = (i: ClienteExpo["intereses"][number]) =>
    setForm(p => ({
      ...p,
      intereses: p.intereses.includes(i) ? p.intereses.filter(x=>x!==i) : [...p.intereses,i],
    }));

  return (
    <div style={{ padding:"12px 14px", background:"#141414", borderTop:"1px solid #222" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <label style={LSR}>Nombre *</label>
          <input style={ISR} value={form.nombre} onChange={e=>setF("nombre",e.target.value)} placeholder="Nombre" />
        </div>
        <div>
          <label style={LSR}>Celular</label>
          <input style={ISR} value={form.celular} onChange={e=>setF("celular",e.target.value)} placeholder="33 1234 5678" />
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={LSR}>Correo</label>
        <div style={{ display:"flex", gap:5 }}>
          <input style={{ ...ISR, flex:1, marginBottom:0 }} value={form.correoUsuario} onChange={e=>setF("correoUsuario",e.target.value)} placeholder="nombre" />
          <span style={{ color:"#555", fontSize:12, alignSelf:"center" }}>@</span>
          <select style={{ ...ISR, flex:1, marginBottom:0 }} value={form.correoExt} onChange={e=>setF("correoExt",e.target.value)}>
            {CORREO_EXT.map(e=><option key={e} value={e}>{e}</option>)}
            <option value="__otro__">Otro...</option>
          </select>
        </div>
        {form.correoExt==="__otro__" && (
          <input style={{ ...ISR, marginTop:6, marginBottom:0 }} value={form.correoExtCustom||""} onChange={e=>setF("correoExtCustom",e.target.value)} placeholder="empresa.com" />
        )}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <label style={LSR}>Impresión</label>
          <input style={ISR} value={form.impresion} onChange={e=>setF("impresion",e.target.value)} placeholder="Empresa" />
        </div>
        <div>
          <label style={LSR}>Ciudad</label>
          <input style={ISR} value={form.ciudad} onChange={e=>setF("ciudad",e.target.value)} placeholder="Guadalajara" />
        </div>
        <div>
          <label style={LSR}>Estado</label>
          <select style={{ ...ISR, marginBottom:0 }} value={form.estado} onChange={e=>setF("estado",e.target.value)}>
            {ESTADOS_MX.map(e=><option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <label style={LSR}>Clasificación</label>
          <div style={{ display:"flex", gap:5 }}>
            {(["AAA","AA","A"] as const).map(c=>{
              const sel = form.clase===c;
              return (
                <button key={c} onClick={()=>setF("clase",sel?"":c)}
                  style={{ flex:1, padding:"5px", borderRadius:5, border:`1.5px solid ${sel?"#C9922A88":"#2A2A2A"}`, background:sel?"#C9922A14":"#0D0D0D", cursor:"pointer" }}>
                  <span style={{ fontSize:10, fontWeight:700, color:sel?"#C9922A":"#3A3A3A" }}>{c}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ flex:2 }}>
          <label style={LSR}>Le interesa</label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {([["papel","📄"],["plastico","🧴"],["cajas","📦"],["otros","✨"]] as const).map(([k,e])=>{
              const sel = form.intereses.includes(k);
              return (
                <button key={k} onClick={()=>toggleInteres(k)}
                  style={{ padding:"4px 8px", borderRadius:6, border:`1.5px solid ${sel?"#C9922A":"#2A2A2A"}`, background:sel?"#C9922A14":"#0D0D0D", cursor:"pointer", fontSize:11, color:sel?"#C9922A":"#666" }}>
                  {e} {k}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={LSR}>Observaciones</label>
        <textarea style={{ ...ISR, resize:"none", minHeight:50, marginBottom:0 }}
          value={form.observaciones} onChange={e=>setF("observaciones",e.target.value)} />
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <button onClick={onCancelar} style={{ background:"transparent", border:"1px solid #444", color:"#888", fontSize:11, fontWeight:600, padding:"6px 14px", borderRadius:6, cursor:"pointer" }}>
          Cancelar
        </button>
        <button onClick={()=>onGuardar(form)} disabled={!form.nombre.trim()||guardando}
          style={{ background:form.nombre.trim()&&!guardando?"#C9922A":"#4A3A1A", border:"none", color:form.nombre.trim()&&!guardando?"#1A1A1A":"#666", fontSize:11, fontWeight:700, padding:"6px 18px", borderRadius:6, cursor:"pointer" }}>
          {guardando ? "Guardando..." : "✓ Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

// ─── Modal de prospectos ──────────────────────────────────────────────────────
interface ModalProspectosProps {
  onSeleccionar: (cliente: ClienteExpoAPI) => void;
  onClose:       () => void;
}

function ModalProspectos({ onSeleccionar, onClose }: ModalProspectosProps) {
  const [prospectos,    setProspectos]    = useState<ClienteExpoAPI[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [expandidoId,   setExpandidoId]   = useState<number|null>(null);
  const [editandoId,    setEditandoId]    = useState<number|null>(null);
  const [guardandoId,   setGuardandoId]   = useState<number|null>(null);
  const [eliminandoId,  setEliminandoId]  = useState<number|null>(null);
  const [busq,          setBusq]          = useState("");
  const [error,         setError]         = useState<string|null>(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await getClientesExpo();
      setProspectos(data);
    } catch {
      setError("No se pudieron cargar los prospectos");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async (id: number, data: ClienteExpo) => {
    setGuardandoId(id);
    try {
      await actualizarClienteExpo(id, data);
      await cargar();
      setEditandoId(null);
    } catch {
      alert("No se pudo actualizar el prospecto");
    } finally {
      setGuardandoId(null);
    }
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar a "${nombre}" del directorio expo?`)) return;
    setEliminandoId(id);
    try {
      await eliminarClienteExpoAPI(id);
      setProspectos(prev => prev.filter(p => p.idclientes !== id));
      if (expandidoId === id) setExpandidoId(null);
    } catch {
      alert("No se pudo eliminar el prospecto");
    } finally {
      setEliminandoId(null);
    }
  };

  const filtrados = busq.trim()
    ? prospectos.filter(p =>
        p.nombre.toLowerCase().includes(busq.toLowerCase()) ||
        (p.impresion||"").toLowerCase().includes(busq.toLowerCase()) ||
        (p.celular||"").includes(busq) ||
        (p.ciudad||"").toLowerCase().includes(busq.toLowerCase())
      )
    : prospectos;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.82)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"#141414", border:"1px solid #2A2A2A", borderRadius:14, width:"100%", maxWidth:820, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,.85)" }}>

        <div style={{ background:"#0D0D0D", borderBottom:"2px solid #C9922A", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>👥</span>
            <div>
              <div style={{ color:"#FFF", fontSize:13, fontWeight:700, letterSpacing:.5 }}>Prospectos registrados</div>
              <div style={{ color:"#555", fontSize:9.5, marginTop:1 }}>{prospectos.length} prospecto{prospectos.length!==1?"s":""} en total</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid #333", color:"#888", fontSize:11, fontWeight:600, padding:"6px 14px", borderRadius:6, cursor:"pointer" }}>
            ✕ Cerrar
          </button>
        </div>

        <div style={{ padding:"10px 16px", borderBottom:"1px solid #1A1A1A", flexShrink:0 }}>
          <input value={busq} onChange={e=>setBusq(e.target.value)}
            placeholder="Buscar por nombre, empresa, celular o ciudad..."
            style={{ width:"100%", background:"#1A1A1A", border:"1px solid #2A2A2A", borderRadius:7, padding:"8px 12px", color:"#EEE", fontSize:12, outline:"none", fontFamily:"'Inter',sans-serif" }}
          />
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"10px 16px 16px" }}>
          {error && <div style={{ color:"#EF4444", fontSize:12, padding:"8px 0" }}>⚠ {error}</div>}

          {loading && (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#444" }}>
              <div style={{ fontSize:13 }}>Cargando prospectos...</div>
            </div>
          )}

          {!loading && filtrados.length === 0 && (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#444" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>👤</div>
              <div style={{ fontSize:13 }}>{busq ? `Sin resultados para "${busq}"` : "Aún no hay prospectos registrados"}</div>
            </div>
          )}

          {!loading && (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {filtrados.map(p => {
                const abierto  = expandidoId === p.idclientes;
                const editando = editandoId  === p.idclientes;
                const claseColor = CLASE_COLOR[p.clase||""] || "#444";

                return (
                  <div key={p.idclientes} style={{ background:"#1A1A1A", border:`1px solid ${abierto?"#333":"#222"}`, borderRadius:10, overflow:"hidden" }}>
                    <div onClick={()=>{ setExpandidoId(abierto?null:p.idclientes); setEditandoId(null); }}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", cursor:"pointer" }}>
                      <div style={{ width:34, height:34, borderRadius:"50%", background:"#C9922A18", border:"1.5px solid #C9922A44", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ color:"#C9922A", fontSize:13, fontWeight:700 }}>{(p.nombre||"?").charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ color:"#EEE", fontSize:12, fontWeight:700 }}>{p.nombre||"Sin nombre"}</span>
                          {p.clase && (
                            <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:8, background:`${claseColor}18`, color:claseColor, border:`1px solid ${claseColor}44` }}>
                              {p.clase}
                            </span>
                          )}
                          <span style={{ color:"#444", fontSize:9, fontFamily:"monospace" }}>#{p.identificar}</span>
                        </div>
                        <div style={{ color:"#555", fontSize:10, marginTop:2, display:"flex", gap:10, flexWrap:"wrap" }}>
                          {p.impresion && <span>🏢 {p.impresion}</span>}
                          {p.celular   && <span>📱 {p.celular}</span>}
                          {p.ciudad    && <span>📍 {p.ciudad}</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:6, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                        <button
                          onClick={()=>onSeleccionar(p)}
                          style={{ background:"#C9922A", border:"none", color:"#0D0D0D", fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:6, cursor:"pointer" }}>
                          Cotizar
                        </button>
                      </div>
                      <span style={{ color:"#555", fontSize:11, flexShrink:0 }}>{abierto?"▲":"▼"}</span>
                    </div>

                    {abierto && !editando && (
                      <div style={{ borderTop:"1px solid #222", padding:"12px 14px", background:"#141414" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:10 }}>
                          <Campo label="Nombre"  value={p.nombre||""} />
                          <Campo label="Celular" value={p.celular||""} />
                          <Campo label="Correo"  value={correoCompleto(p.correo)} />
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:10 }}>
                          <Campo label="Empresa" value={p.impresion||""} />
                          <Campo label="Ciudad"  value={p.ciudad||""} />
                          <Campo label="Estado"  value={p.estado||""} />
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:10 }}>
                          <Campo label="Clasificación" value={p.clase||"—"} />
                          <Campo label="Le interesa"   value={p.intereses?.join(", ")||"—"} />
                        </div>
                        {p.observaciones && <Campo label="Observaciones" value={p.observaciones} />}
                        <div style={{ display:"flex", gap:8, marginTop:12, justifyContent:"flex-end" }}>
                          <button
                            onClick={()=>handleEliminar(p.idclientes, p.nombre||"")}
                            disabled={eliminandoId===p.idclientes}
                            style={{ background:"transparent", border:"1px solid #EF444433", color:"#EF4444", fontSize:11, fontWeight:600, padding:"5px 12px", borderRadius:6, cursor:"pointer", opacity:eliminandoId===p.idclientes?.5:1 }}>
                            {eliminandoId===p.idclientes ? "Eliminando..." : "🗑 Eliminar"}
                          </button>
                          <button
                            onClick={()=>setEditandoId(p.idclientes)}
                            style={{ background:"transparent", border:"1px solid #C9922A55", color:"#C9922A", fontSize:11, fontWeight:600, padding:"5px 12px", borderRadius:6, cursor:"pointer" }}>
                            ✎ Editar
                          </button>
                        </div>
                      </div>
                    )}

                    {abierto && editando && (
                      <FormEdicion
                        inicial={p}
                        onGuardar={(data)=>handleGuardar(p.idclientes, data)}
                        onCancelar={()=>setEditandoId(null)}
                        guardando={guardandoId===p.idclientes}
                      />
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

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════

export default function RegistroCliente({
  clienteData, setClienteData, clienteGuardado,
  mob, onCotizar, onCerrar,
  cotizacionesCount,
  onAbrirLista,
}: Props) {
  const navigate = useNavigate();  // ← NUEVO

  const [modalProspectos, setModalProspectos] = useState(false);
  const [guardando,       setGuardando]       = useState(false);
  const [error,           setError]           = useState<string|null>(null);

  const setCF = (k: keyof ClienteExpo, v: unknown) =>
    setClienteData(prev => ({ ...prev, [k]: v }));

  const toggleInteres = (i: ClienteExpo["intereses"][number]) =>
    setClienteData(prev => ({
      ...prev,
      intereses: prev.intereses.includes(i)
        ? prev.intereses.filter(x=>x!==i)
        : [...prev.intereses, i],
    }));

  const guardarYCotizar = async () => {
    if (!clienteData.nombre.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const resultado = await crearClienteExpo(clienteData);
      onCotizar(resultado.id, clienteData.nombre.trim());
    } catch (err: any) {
      setError(err?.response?.data?.error || "No se pudo registrar el prospecto.");
    } finally {
      setGuardando(false);
    }
  };

  const soloGuardar = async () => {
    if (!clienteData.nombre.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const resultado = await crearClienteExpo(clienteData);
      setClienteData(CLIENTE_VACIO);
      alert(`✅ Prospecto "${clienteData.nombre}" registrado (#${resultado.id})`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "No se pudo registrar el prospecto.");
    } finally {
      setGuardando(false);
    }
  };

  const seleccionarProspecto = (p: ClienteExpoAPI) => {
    const parsearCorreo = (correo: string|null) => {
      if (!correo) return { usuario:"", ext:"gmail.com", extCustom:"" };
      const idx = correo.lastIndexOf("@");
      if (idx < 0) return { usuario:correo, ext:"gmail.com", extCustom:"" };
      const usuario = correo.slice(0,idx);
      const ext = correo.slice(idx+1);
      const extConocida = CORREO_EXT.includes(ext as any);
      return { usuario, ext:extConocida?ext:"__otro__", extCustom:extConocida?"":ext };
    };
    const { usuario, ext, extCustom } = parsearCorreo(p.correo);

    setClienteData({
      nombre:          p.nombre || "",
      celular:         p.celular || "",
      correoUsuario:   usuario,
      correoExt:       ext,
      correoExtCustom: extCustom,
      impresion:       p.impresion || "",
      ciudad:          p.ciudad || "",
      estado:          p.estado || "Jalisco",
      clase:           (p.clase || "") as ClienteExpo["clase"],
      intereses:       (p.intereses || []) as ClienteExpo["intereses"],
      observaciones:   p.observaciones || "",
    });
    setModalProspectos(false);
    onCotizar(p.idclientes, p.nombre || "");
  };

  const puedeAvanzar = clienteData.nombre.trim().length > 0 && !guardando;

  return (
    <>
      <div
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:mob?0:20 }}
        onClick={clienteGuardado ? onCerrar : undefined}
      >
        <div
          onClick={e=>e.stopPropagation()}
          style={{ background:"#141414", border:"1px solid #2A2A2A", borderRadius:mob?0:14, width:"100%", maxWidth:mob?"100%":820, maxHeight:mob?"100vh":"92vh", height:mob?"100vh":undefined, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,.8)" }}
        >
          {/* Header */}
          <div style={{ background:"#0D0D0D", borderBottom:"2px solid #C9922A", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ color:"#C9922A", fontSize:22, fontWeight:700, fontFamily:"Georgia,serif" }}>EB</div>
              <div>
                <div style={{ color:"#FFF", fontSize:12, fontWeight:700, letterSpacing:1 }}>Nuevo prospecto</div>
                <div style={{ color:"#555", fontSize:9, letterSpacing:.5 }}>Registra los datos antes de cotizar</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {/* ← NUEVO: botón regresar a SIGEB */}
              <button
                onClick={() => navigate("/home")}
                style={{ background:"transparent", border:"1px solid #333", color:"#666", fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}
                title="Regresar a SIGEB"
              >
                🏠 SIGEB
              </button>
              <button
                onClick={()=>setModalProspectos(true)}
                style={{ background:"transparent", border:"1px solid #C9922A44", color:"#C9922A", fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                👥 Prospectos
              </button>
              <button
                onClick={onAbrirLista}
                style={{ background:"transparent", border:"1px solid #C9922A44", color:"#C9922A", fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", gap:5, position:"relative" }}>
                📋 Cotizaciones
                {cotizacionesCount > 0 && (
                  <span style={{ background:"#C9922A", color:"#0D0D0D", fontSize:9, fontWeight:700, borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {cotizacionesCount}
                  </span>
                )}
              </button>
              {clienteGuardado && (
                <button onClick={onCerrar} style={{ background:"transparent", border:"1px solid #333", color:"#888", fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:6, cursor:"pointer" }}>
                  ✕ Cerrar
                </button>
              )}
            </div>
          </div>

          {error && (
            <div style={{ background:"#2A0A0A", border:"1px solid #EF4444", borderRadius:6, margin:"12px 20px 0", padding:"8px 12px", color:"#EF4444", fontSize:12 }}>
              ⚠ {error}
            </div>
          )}

          {/* Body */}
          <div style={{ flex:1, overflow:"auto", padding:mob?"14px":"20px 24px" }}>
            <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:mob?12:16 }}>

              {/* Col izquierda */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, padding:14 }}>
                  <div style={{ color:"#C9922A", fontSize:9, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                    <span>👤</span> Datos de contacto
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <div>
                      <label style={LSR}>Nombre *</label>
                      <input style={ISR} value={clienteData.nombre} onChange={e=>setCF("nombre",e.target.value)} placeholder="Juan García" />
                    </div>
                    <div>
                      <label style={LSR}>Celular</label>
                      <input style={ISR} value={clienteData.celular} onChange={e=>setCF("celular",e.target.value)} placeholder="33 1234 5678" maxLength={15} />
                    </div>
                  </div>
                  <label style={LSR}>Correo</label>
                  <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                    <input style={{ ...ISR, flex:1, marginBottom:0 }} value={clienteData.correoUsuario} onChange={e=>setCF("correoUsuario",e.target.value)} placeholder="nombre" />
                    <span style={{ color:"#555", fontSize:12, flexShrink:0 }}>@</span>
                    <select style={{ ...ISR, flex:1, marginBottom:0 }} value={clienteData.correoExt} onChange={e=>setCF("correoExt",e.target.value)}>
                      {CORREO_EXT.map(ext=><option key={ext} value={ext}>{ext}</option>)}
                      <option value="__otro__">Otro...</option>
                    </select>
                  </div>
                  {clienteData.correoExt==="__otro__" && (
                    <input style={{ ...ISR, marginTop:6, marginBottom:0 }} value={clienteData.correoExtCustom||""} onChange={e=>setCF("correoExtCustom",e.target.value)} placeholder="empresa.com" autoFocus />
                  )}
                </div>

                <div style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, padding:14 }}>
                  <div style={{ color:"#C9922A", fontSize:9, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                    <span>🏢</span> Empresa / Marca
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <div>
                      <label style={LSR}>Impresión</label>
                      <input style={ISR} value={clienteData.impresion} onChange={e=>setCF("impresion",e.target.value)} placeholder="Coca-Cola" />
                    </div>
                    <div>
                      <label style={LSR}>Ciudad</label>
                      <input style={ISR} value={clienteData.ciudad} onChange={e=>setCF("ciudad",e.target.value)} placeholder="Guadalajara" />
                    </div>
                  </div>
                  <label style={LSR}>Estado</label>
                  <select style={{ ...ISR, marginBottom:0 }} value={clienteData.estado} onChange={e=>setCF("estado",e.target.value)}>
                    {ESTADOS_MX.map(e=><option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              {/* Col derecha */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ color:"#555", fontSize:8, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>★ Clasificación</div>
                  <div style={{ display:"flex", gap:5 }}>
                    {(["AAA","AA","A"] as const).map(c=>{
                      const sel = clienteData.clase===c;
                      return (
                        <button key={c} onClick={()=>setCF("clase",sel?"":c)}
                          style={{ flex:1, padding:"4px", borderRadius:5, border:`1.5px solid ${sel?"#C9922A88":"#2A2A2A"}`, background:sel?"#C9922A14":"#0D0D0D", cursor:"pointer", transition:"all .15s" }}>
                          <span style={{ fontSize:10, fontWeight:700, color:sel?"#C9922A":"#3A3A3A", fontFamily:"Georgia,serif" }}>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, padding:14 }}>
                  <div style={{ color:"#C9922A", fontSize:9, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                    <span>📦</span> Le interesa
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {([["papel","📄","Bolsas papel"],["plastico","🧴","Bolsas plástico"],["cajas","📦","Cajas"],["otros","✨","Otros"]] as const).map(([key,emoji,label])=>{
                      const sel = clienteData.intereses.includes(key);
                      return (
                        <button key={key} onClick={()=>toggleInteres(key)}
                          style={{ padding:"10px 8px", borderRadius:8, border:`2px solid ${sel?"#C9922A":"#2A2A2A"}`, background:sel?"rgba(201,146,42,.1)":"#0D0D0D", cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"all .15s" }}>
                          <span style={{ fontSize:16 }}>{emoji}</span>
                          <span style={{ fontSize:11, fontWeight:sel?700:400, color:sel?"#C9922A":"#555", lineHeight:1.2 }}>{label}</span>
                          {sel && <span style={{ marginLeft:"auto", color:"#C9922A", fontSize:11 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ background:"#1A1A1A", border:"1px solid #222", borderRadius:10, padding:14, flex:1, display:"flex", flexDirection:"column" }}>
                  <div style={{ color:"#C9922A", fontSize:9, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                    <span>📝</span> Observaciones
                  </div>
                  <textarea
                    style={{ ...ISR, flex:1, resize:"none", marginBottom:0, minHeight:80 }}
                    value={clienteData.observaciones}
                    onChange={e=>setCF("observaciones",e.target.value)}
                    placeholder="Ej. Contactar en 15 días, interesado en 5,000 bolsas..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop:"1px solid #222", padding:"14px 24px", display:"flex", gap:12, flexDirection:mob?"column":"row", flexShrink:0, background:"#0D0D0D" }}>
            <button onClick={soloGuardar} disabled={!puedeAvanzar}
              style={{ flex:1, padding:"11px", background:"transparent", border:`2px solid ${puedeAvanzar?"#C9922A":"#2A2A2A"}`, borderRadius:9, color:puedeAvanzar?"#C9922A":"#444", fontSize:13, fontWeight:700, cursor:puedeAvanzar?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {guardando?"Registrando...":"💾 Solo guardar prospecto"}
            </button>
            <button onClick={guardarYCotizar} disabled={!puedeAvanzar}
              style={{ flex:1, padding:"11px", background:puedeAvanzar?"#C9922A":"#1A1000", border:"none", borderRadius:9, color:puedeAvanzar?"#1A1A1A":"#444", fontSize:13, fontWeight:700, cursor:puedeAvanzar?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:puedeAvanzar?"0 4px 20px rgba(201,146,42,.3)":"none" }}>
              {guardando?"Registrando...":"📋 Registrar y cotizar →"}
            </button>
          </div>
        </div>
      </div>

      {modalProspectos && (
        <ModalProspectos
          onSeleccionar={seleccionarProspecto}
          onClose={()=>setModalProspectos(false)}
        />
      )}
    </>
  );
}