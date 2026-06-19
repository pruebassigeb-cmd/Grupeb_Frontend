/**
 * ListaCotizaciones.tsx
 * Vista de seguimiento de cotizaciones guardadas desde el cotizador Expo.
 *
 * CAMBIOS:
 * 1. Total cotizado ahora suma correctamente todas las filas.
 * 2. Bloque "Totales cotizados" eliminado del detalle expandido.
 * 3. Paleta de colores alineada con EB: se eliminó el verde #22C55E,
 *    reemplazado por dorado #C9922A (aprobado) y rojo #EF4444 (rechazado).
 */

import { useState } from "react";
import type { CotizacionGuardada, FilaProducto, ItemPedidoAprobado, ClienteExpo } from "../../types/expo/expo.types";
import { folioAPedido } from "../../types/expo/expo.types";

interface Props {
  cotizaciones: CotizacionGuardada[];
  onAprobar: (id: string, items: ItemPedidoAprobado[]) => void;
  onClose: () => void;
}

type CantidadKey = "precio1" | "precio2" | "precio3";
const CANT_LABEL: Record<CantidadKey, string> = { precio1:"500", precio2:"1,000", precio3:"3,000" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const _num = (s: string): number => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
const fmt$ = (n: number) => `$${n.toFixed(2)}`;

// Recalcula los totales directamente desde las filas del snapshot para
// asegurarse de que reflejen los precios guardados (incluso si el usuario
// editó precios en tabla sin hacer blur antes de guardar).
const calcularTotales = (filas: FilaProducto[]) => ({
  precio1: filas.reduce((acc, f) => acc + _num(f.precio1), 0),
  precio2: filas.reduce((acc, f) => acc + _num(f.precio2), 0),
  precio3: filas.reduce((acc, f) => acc + _num(f.precio3), 0),
});

const LS: React.CSSProperties = { color:"#555", fontSize:8.5, textTransform:"uppercase", letterSpacing:.5, marginBottom:1 };
const VAL: React.CSSProperties = { color:"#DDD", fontSize:10.5, fontWeight:600 };

// ─── Bloque de un dato individual (label + valor) ─────────────────────────────
function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={LS}>{label}</div>
      <div style={VAL}>{value || "—"}</div>
    </div>
  );
}

// ─── Selector de cantidad a aprobar — sin preselección, una sola opción ───────
interface SelectorCantidadProps {
  precios: Record<CantidadKey, string>;
  valor: CantidadKey | null;
  onChange: (v: CantidadKey | null) => void;
  soloLectura?: boolean;
}
function SelectorCantidad({ precios, valor, onChange, soloLectura }: SelectorCantidadProps) {
  const elegir = (k: CantidadKey) => {
    if (soloLectura) return;
    onChange(valor === k ? null : k);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
      {(["precio1","precio2","precio3"] as const).map(key => {
        const activo = valor === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => elegir(key)}
            disabled={soloLectura && !activo}
            style={{
              display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              padding:"8px 6px", borderRadius:8,
              border:`1.5px solid ${activo ? "#C9922A" : "#2A2A2A"}`,
              background: activo ? "#C9922A18" : "#0D0D0D",
              cursor: soloLectura ? (activo ? "default" : "not-allowed") : "pointer",
              opacity: soloLectura && !activo ? .4 : 1,
            }}
          >
            <span style={{ color: activo ? "#C9922A" : "#888", fontSize:10, fontWeight:700 }}>{CANT_LABEL[key]} pzs</span>
            <span style={{ color: activo ? "#C9922A" : "#666", fontSize:12, fontWeight:700 }}>{precios[key]}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Detalle completo de UNA fila/producto ────────────────────────────────────
interface DetalleFilaProps {
  f: FilaProducto;
  seleccionCantidad?: CantidadKey | null;
  onCambiarCantidad?: (v: CantidadKey | null) => void;
  cantidadAprobada?: CantidadKey | null;
}
function DetalleFilaCompleto({ f, seleccionCantidad, onCambiarCantidad, cantidadAprobada }: DetalleFilaProps) {
  const p = f.producto;
  const esPlastico = p.categoria === "plastico";
  const precios: Record<CantidadKey, string> = { precio1: f.precio1, precio2: f.precio2, precio3: f.precio3 };

  const mostrarSelectorEditable = onCambiarCantidad !== undefined;
  const mostrarSoloResultado = cantidadAprobada !== undefined;

  return (
    <div style={{ background:"#1A1A1A", border:"1px solid #262626", borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div>
          <div style={{ color:"#EEE", fontSize:12.5, fontWeight:700 }}>{p.nombre}</div>
          <div style={{ color:"#666", fontSize:9.5, marginTop:1, textTransform:"capitalize" }}>{p.categoria}</div>
        </div>
        {mostrarSoloResultado && (
          <span style={{
            fontSize:8.5, fontWeight:700, padding:"2px 8px", borderRadius:8, flexShrink:0,
            background: cantidadAprobada ? "#C9922A22" : "#EF444422",
            color: cantidadAprobada ? "#C9922A" : "#EF4444",
            border:`1px solid ${cantidadAprobada ? "#C9922A55" : "#EF444455"}`,
          }}>
            {cantidadAprobada ? `✓ Pedido — ${CANT_LABEL[cantidadAprobada]} pzs` : "✕ No incluido"}
          </span>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginBottom:8 }}>
        <Dato label="Medida"  value={f.medida || p.medida} />
        <Dato label="Material" value={f.material || p.material} />
        <Dato label="Calibre"  value={f.calibre || p.calibre} />
        <Dato label="Tintas"   value={f.tintas} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginBottom:8, paddingTop:8, borderTop:"1px solid #222" }}>
        {esPlastico ? (
          <>
            <Dato label="Tipo" value={f.tipoPlastico || "—"} />
            <Dato label="Asa"  value={f.asa ? f.tipoAsa : "Sin asa"} />
            <Dato
              label={f.modoExtra === "pigmento" ? "Pigmento" : "Cargo extra"}
              value={f.modoExtra === "pigmento" ? (f.pigmento || "—") : (f.extra ? `+$${f.extra}/pz` : "—")}
            />
          </>
        ) : (
          <>
            <Dato label="Laminación" value={f.laminacion ? f.tipoLaminado : "Sin laminado"} />
            <Dato label="HS"         value={f.hs ? f.tipoHs : "Sin HS"} />
            <Dato label="AR"         value={f.ar ? "Sí" : "No"} />
            <Dato label="Textura"    value={f.textura ? f.tipoTextura : "Sin textura"} />
          </>
        )}
      </div>

      {!esPlastico && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginBottom:8 }}>
          <Dato label="UV"  value={f.uv ? "Sí" : "No"} />
          <Dato label="Asa" value={f.asa ? f.tipoAsa : "Sin asa"} />
          <Dato
            label={f.modoExtra === "pigmento" ? "Pigmento" : "Cargo extra"}
            value={f.modoExtra === "pigmento" ? (f.pigmento || "—") : (f.extra ? `+$${f.extra}/pz` : "—")}
          />
        </div>
      )}

      {f.otro && !esPlastico && (
        <div style={{ marginBottom:8 }}><Dato label="Otro" value={f.otro} /></div>
      )}

      {/* Precios: en cotización muestra las 3 columnas; en pedido solo la cantidad aprobada */}
      <div style={{ display:"flex", gap:18, paddingTop:8, paddingBottom: (mostrarSelectorEditable || mostrarSoloResultado) ? 10 : 0, borderTop:"1px solid #222" }}>
        {mostrarSoloResultado ? (
          cantidadAprobada ? (
            <div>
              <div style={LS}>{CANT_LABEL[cantidadAprobada]} pzs</div>
              <div style={{ ...VAL, color:"#C9922A" }}>{precios[cantidadAprobada]}</div>
            </div>
          ) : null
        ) : (
          <>
            <div><div style={LS}>500 pzs</div><div style={{ ...VAL, color:"#C9922A" }}>{f.precio1}</div></div>
            <div><div style={LS}>1,000 pzs</div><div style={{ ...VAL, color:"#C9922A" }}>{f.precio2}</div></div>
            <div><div style={LS}>3,000 pzs</div><div style={{ ...VAL, color:"#C9922A" }}>{f.precio3}</div></div>
          </>
        )}
      </div>

      {/* Selector de cantidad a aprobar — solo si la cotización está pendiente */}
      {mostrarSelectorEditable && (
        <div style={{ paddingTop:4 }}>
          <div style={{ ...LS, marginBottom:6 }}>Cantidad que aprueba el cliente (opcional)</div>
          <SelectorCantidad precios={precios} valor={seleccionCantidad ?? null} onChange={onCambiarCantidad}/>
        </div>
      )}
    </div>
  );
}

// ─── Detalle completo del cliente ─────────────────────────────────────────────
function DetalleCliente({ c }: { c: ClienteExpo }) {
  const correo = c.correoUsuario ? `${c.correoUsuario}@${c.correoExt === "__otro__" ? c.correoExtCustom : c.correoExt}` : "—";
  return (
    <div style={{ background:"#1A1A1A", border:"1px solid #262626", borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
      <div style={{ color:"#C9922A", fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>👤 Datos del cliente</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginBottom:8 }}>
        <Dato label="Nombre"   value={c.nombre} />
        <Dato label="Celular"  value={c.celular} />
        <Dato label="Correo"   value={correo} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginBottom:8 }}>
        <Dato label="Empresa/Marca" value={c.impresion} />
        <Dato label="Ciudad"        value={c.ciudad} />
        <Dato label="Estado"        value={c.estado} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:10 }}>
        <Dato label="Clasificación" value={c.clase || "—"} />
        <Dato label="Le interesa"   value={c.intereses.length ? c.intereses.join(", ") : "—"} />
      </div>
      {c.observaciones && (
        <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #222" }}>
          <Dato label="Observaciones" value={c.observaciones} />
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function ListaCotizaciones({ cotizaciones, onAprobar, onClose }: Props) {
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [filtro, setFiltro]           = useState<"todas" | "cotizacion" | "pedido">("todas");

  const [selecciones, setSelecciones] = useState<Record<string, Record<string, CantidadKey | null>>>({});

  const filtradas = cotizaciones.filter(c => filtro === "todas" || c.estado === filtro);
  const ordenadas  = [...filtradas].sort((a, b) => b.id.localeCompare(a.id));
  const totalCotizaciones = cotizaciones.filter(c => c.estado === "cotizacion").length;
  const totalPedidos      = cotizaciones.filter(c => c.estado === "pedido").length;

  const setCantidadFila = (cotId: string, filaUid: string, v: CantidadKey | null) => {
    setSelecciones(prev => ({
      ...prev,
      [cotId]: { ...(prev[cotId] || {}), [filaUid]: v },
    }));
  };

  const confirmarAprobacion = (cot: CotizacionGuardada) => {
    const sel = selecciones[cot.id] || {};
    const items: ItemPedidoAprobado[] = Object.entries(sel)
      .filter((entry): entry is [string, CantidadKey] => entry[1] !== null && entry[1] !== undefined)
      .map(([filaUid, cantidadElegida]) => ({ filaUid, cantidadElegida }));

    if (items.length === 0) {
      alert("Selecciona al menos una cantidad en algún producto para aprobar el pedido.");
      return;
    }
    onAprobar(cot.id, items);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.78)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"#141414", border:"1px solid #2A2A2A", borderRadius:14, width:"100%", maxWidth:920, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,.8)" }}>

        {/* Header */}
        <div style={{ background:"#0D0D0D", borderBottom:"2px solid #C9922A", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ color:"#C9922A", fontSize:22, fontWeight:700, fontFamily:"Georgia,serif" }}>📋</div>
            <div>
              <div style={{ color:"#FFF", fontSize:13, fontWeight:700, letterSpacing:.5 }}>Cotizaciones — Expo</div>
              <div style={{ color:"#555", fontSize:9.5, marginTop:2 }}>{totalCotizaciones} en cotización · {totalPedidos} aprobadas como pedido</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid #333", color:"#888", fontSize:11, fontWeight:600, padding:"6px 14px", borderRadius:6, cursor:"pointer" }}>
            ✕ Cerrar
          </button>
        </div>

        {/* Filtros */}
        <div style={{ padding:"12px 20px 0", display:"flex", gap:8, flexShrink:0 }}>
          {([
            ["todas", `Todas (${cotizaciones.length})`],
            ["cotizacion", `Cotización (${totalCotizaciones})`],
            ["pedido", `Pedido (${totalPedidos})`],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFiltro(key)}
              style={{ background: filtro===key ? "#C9922A22" : "transparent", border:`1px solid ${filtro===key?"#C9922A":"#2A2A2A"}`, color: filtro===key?"#C9922A":"#777", fontSize:11, fontWeight:600, padding:"6px 14px", borderRadius:20, cursor:"pointer" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 20px 20px" }}>
          {ordenadas.length === 0 ? (
            <div style={{ textAlign:"center", padding:"50px 0", color:"#444" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🗂</div>
              <div style={{ fontSize:13 }}>
                {filtro === "todas" ? "Aún no hay cotizaciones guardadas" : `No hay registros en "${filtro}"`}
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {ordenadas.map(cot => {
                const abierto = expandidoId === cot.id;
                const esPedido = cot.estado === "pedido";
                const itemsAprobados = cot.itemsAprobados || [];
                const aprobadosPorUid = new Map(itemsAprobados.map(i => [i.filaUid, i.cantidadElegida]));
                const seleccionCot = selecciones[cot.id] || {};
                const algunaSeleccionada = Object.values(seleccionCot).some(v => v !== null && v !== undefined);

                // Cotización: suma de las 3 columnas de todas las filas (total global).
                // Pedido: suma solo los productos aprobados usando la cantidad elegida por el cliente.
                const totalMostrado = esPedido
                  ? itemsAprobados.reduce((acc, item) => {
                      const fila = cot.filas.find(f => f.uid === item.filaUid);
                      if (!fila) return acc;
                      return acc + _num(fila[item.cantidadElegida]);
                    }, 0)
                  : (() => { const t = calcularTotales(cot.filas); return t.precio1 + t.precio2 + t.precio3; })();

                return (
                  <div key={cot.id} style={{ background:"#1A1A1A", border:`1px solid ${esPedido?"#C9922A44":"#222"}`, borderRadius:10, overflow:"hidden" }}>
                    {/* Fila resumen */}
                    <div onClick={() => setExpandidoId(abierto ? null : cot.id)}
                      style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px", cursor:"pointer" }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background: esPedido?"#C9922A":"#666", flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ color:"#EEE", fontSize:13, fontWeight:700 }}>{cot.cliente || "Sin nombre"}</span>
                          <span style={{ color:"#555", fontSize:10, fontFamily:"monospace" }}>{esPedido ? folioAPedido(cot.folio) : cot.folio}</span>
                          <span style={{
                            fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:10, letterSpacing:.5, textTransform:"uppercase",
                            background: esPedido ? "#C9922A22" : "#C9922A11",
                            color: "#C9922A",
                            border:`1px solid ${esPedido?"#C9922A55":"#C9922A33"}`,
                          }}>
                            {esPedido ? "✓ Pedido" : "Cotización"}
                          </span>
                        </div>
                        <div style={{ color:"#666", fontSize:10, marginTop:3 }}>
                          {cot.fecha} · {cot.filas.length} {cot.filas.length === 1 ? "producto cotizado" : "productos cotizados"}
                          {esPedido && ` · ${itemsAprobados.length} aprobados`}
                        </div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ color:"#C9922A", fontSize:13, fontWeight:700 }}>{fmt$(totalMostrado)}</div>
                        <div style={{ color:"#555", fontSize:9 }}>{esPedido ? "total pedido" : "total cotizado"}</div>
                      </div>
                      <span style={{ color:"#555", fontSize:11, flexShrink:0 }}>{abierto ? "▲" : "▼"}</span>
                    </div>

                    {/* Detalle expandido */}
                    {abierto && (
                      <div style={{ borderTop:"1px solid #222", padding:"14px", background:"#141414" }}>

                        {/* Cliente completo */}
                        {cot.clienteData && <DetalleCliente c={cot.clienteData} />}

                        {/* Productos — en pedido solo los aprobados; en cotización todos */}
                        <div style={{ color:"#C9922A", fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>
                          📦 {esPedido ? "Productos del pedido" : "Productos cotizados"}
                        </div>

                        {(esPedido
                          ? cot.filas.filter(f => aprobadosPorUid.has(f.uid))
                          : cot.filas
                        ).map(f => (
                          <DetalleFilaCompleto
                            key={f.uid}
                            f={f}
                            seleccionCantidad={!esPedido ? (seleccionCot[f.uid] ?? null) : undefined}
                            onCambiarCantidad={!esPedido ? (v => setCantidadFila(cot.id, f.uid, v)) : undefined}
                            cantidadAprobada={esPedido ? (aprobadosPorUid.get(f.uid) ?? null) : undefined}
                          />
                        ))}

                        {cot.comentarios && (
                          <div style={{ marginBottom:12, padding:"8px 10px", background:"#1A1A1A", borderRadius:6, color:"#999", fontSize:10.5, fontStyle:"italic" }}>
                            "{cot.comentarios}"
                          </div>
                        )}

                        {/* Acción aprobar */}
                        {!esPedido ? (
                          <button
                            onClick={() => confirmarAprobacion(cot)}
                            disabled={!algunaSeleccionada}
                            style={{
                              width:"100%", border:"none", borderRadius:8, padding:"10px",
                              fontSize:12.5, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                              background: algunaSeleccionada ? "#C9922A" : "#C9922A33",
                              color: algunaSeleccionada ? "#0D0D0D" : "#0D0D0D88",
                              cursor: algunaSeleccionada ? "pointer" : "not-allowed",
                            }}>
                            ✓ Aprobar y convertir en pedido
                          </button>
                        ) : (
                          <div style={{ width:"100%", background:"#C9922A15", border:"1px solid #C9922A44", borderRadius:8, padding:"10px", color:"#C9922A", fontSize:11.5, fontWeight:600, textAlign:"center" }}>
                            ✓ Pedido aprobado — folio {folioAPedido(cot.folio)}
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