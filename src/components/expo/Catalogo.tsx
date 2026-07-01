import { useRef, useState } from "react";
import { CATS, claveProducto } from "../../types/expo/expo.types";
import type { Producto } from "../../types/expo/expo.types";

export const busquedaStore: Record<string, string> = { papel: "", plastico: "", carton: "" };

interface Props {
  grid?: boolean;
  mob: boolean;
  tab: boolean;
  desk: boolean;
  catalogo: Producto[];
  sistemaProductos: Producto[];
  loadingCatalogo: boolean;
  expanded: Record<string, boolean>;
  sistemaOpen: Record<string, boolean>;
  addedId: number | null;
  busquedaTick: number;
  setBusquedaTick: React.Dispatch<React.SetStateAction<number>>;
  toggleExp: (k: string) => void;
  setSistemaOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onDragStart: (e: React.DragEvent, p: Producto) => void;
  onDragEnd: () => void;
  addProd: (p: Producto) => void;
  abrirEditar: (p: Producto) => void;
  eliminarProd: (id: number) => void;
}

export default function Catalogo({
  grid, mob, tab, desk,
  catalogo, sistemaProductos, loadingCatalogo,
  expanded, sistemaOpen, addedId,
  busquedaTick, setBusquedaTick,
  toggleExp, setSistemaOpen,
  onDragStart, onDragEnd,
  addProd, abrirEditar, eliminarProd,
}: Props) {
  void busquedaTick;
  const [productoSeleccionadoKey, setProductoSeleccionadoKey] = useState<string | null>(null);
  const productoSeleccionadoRef = useRef<string | null>(null);

  const seleccionarProducto = (key: string | null) => {
    productoSeleccionadoRef.current = key;
    setProductoSeleccionadoKey(key);
  };

  return (
    <div style={{ paddingBottom: mob ? 80 : 16 }}>

      {loadingCatalogo && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ color: "#444", fontSize: 12 }}>Cargando catálogo...</div>
        </div>
      )}

      {!loadingCatalogo && CATS.map(cat => {
        const ps       = catalogo.filter(p => p.categoria === cat.key);
        const sysTotal = sistemaProductos.filter(p => p.categoria === cat.key);
        const busq     = busquedaStore[cat.key]?.toLowerCase() || "";
        const sPs      = sysTotal.filter(p =>
          !busq ||
          p.nombre.toLowerCase().includes(busq) ||
          p.medida.toLowerCase().includes(busq) ||
          p.material.toLowerCase().includes(busq)
        );
        const open     = expanded[cat.key];
        const expoOpen = sistemaOpen[cat.key];

        return (
          <div key={cat.key} style={{ marginBottom: 2 }}>

            <button
              onClick={() => toggleExp(cat.key)}
              style={{ width:"100%", background:"#171717", border:"none", borderBottom:`1px solid ${cat.color}33`, cursor:"pointer", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:14 }}>{cat.emoji}</span>
                <span style={{ color:cat.color, fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase" }}>{cat.label}</span>
                <span style={{ background:`${cat.color}22`, color:cat.color, fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:10, border:`1px solid ${cat.color}44` }}>{sysTotal.length}</span>
              </div>
              <span style={{ color:cat.color, fontSize:11 }}>{open ? "▲" : "▼"}</span>
            </button>

            {open && (
              <>
                <div style={{ margin:"8px 8px 8px", borderRadius:8, border:"1px solid #222", overflow:"hidden" }}>
                  <button
                    onClick={() => setSistemaOpen(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                    style={{ width:"100%", background:"#141414", border:"none", padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{ fontSize:11 }}>⭐</span>
                      <span style={{ color:"#C9922A", fontSize:10, fontWeight:600, letterSpacing:.8, textTransform:"uppercase" }}>Catálogo Expo</span>
                      <span style={{ background:"#C9922A22", color:"#C9922A", fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:8, border:"1px solid #C9922A44" }}>{ps.length}</span>
                    </div>
                    <span style={{ color:"#C9922A", fontSize:10 }}>{expoOpen ? "▲" : "▼"}</span>
                  </button>

                  {expoOpen && (
                    <div style={{ padding:"6px 8px 8px", display:"grid", gridTemplateColumns:grid?"1fr 1fr":"1fr", gap:6, background:"#111" }}>
                      {ps.length === 0 && (
                        <div style={{ gridColumn:grid?"1 / -1":undefined, padding:"10px 8px", color:"#444", fontSize:11, fontStyle:"italic", textAlign:"center" }}>
                          Sin productos en el catálogo expo
                        </div>
                      )}
                      {ps.map(p => (
                        <TarjetaProducto key={p.id} p={p} catColor={cat.color}
                          grid={!!grid} mob={mob} tab={tab} desk={desk} addedId={addedId}
                          onDragStart={onDragStart} onDragEnd={onDragEnd}
                          productoSeleccionadoKey={productoSeleccionadoKey}
                          productoSeleccionadoRef={productoSeleccionadoRef}
                          seleccionarProducto={seleccionarProducto}
                          addProd={addProd} abrirEditar={abrirEditar} eliminarProd={eliminarProd}
                          esPropio />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ background:"#0D0D0D" }}>
                  <div style={{ padding:"8px 10px 4px" }}>
                    <div style={{ position:"relative" }}>
                      <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", fontSize:11, color:"#444", pointerEvents:"none" }}>🔍</span>
                      <input
                        key={`busq-${cat.key}`}
                        defaultValue={busquedaStore[cat.key] || ""}
                        onChange={e => { busquedaStore[cat.key] = e.target.value; setBusquedaTick(t => t+1); }}
                        placeholder="Buscar producto del sistema..."
                        style={{ width:"100%", background:"#1A1A1A", border:"1px solid #2A2A2A", borderRadius:6, padding:"6px 28px 6px 26px", color:"#DDD", fontSize:11, outline:"none", fontFamily:"'Inter',sans-serif" }}
                      />
                      {busquedaStore[cat.key] && (
                        <button
                          onClick={() => { busquedaStore[cat.key] = ""; setBusquedaTick(t => t+1); }}
                          style={{ position:"absolute", right:7, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:13 }}>✕</button>
                      )}
                    </div>
                  </div>
                  <div style={{ maxHeight:300, overflowY:"auto", padding:"4px 8px 8px" }}>
                    {sPs.length === 0
                      ? <div style={{ color:"#444", fontSize:11, textAlign:"center", padding:"16px 0" }}>
                          {busq ? "Sin resultados" : "Sin productos del sistema en esta categoría"}
                        </div>
                      : sPs.map(p => (
                        <TarjetaProducto key={p.id} p={p} catColor={cat.color}
                          grid={false} mob={mob} tab={tab} desk={desk} addedId={addedId}
                          onDragStart={onDragStart} onDragEnd={onDragEnd}
                          productoSeleccionadoKey={productoSeleccionadoKey}
                          productoSeleccionadoRef={productoSeleccionadoRef}
                          seleccionarProducto={seleccionarProducto}
                          addProd={addProd} abrirEditar={abrirEditar} eliminarProd={eliminarProd}
                          esPropio={false} compacto />
                      ))
                    }
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tarjeta ──────────────────────────────────────────────────────────────────
interface TarjetaProps {
  p:            Producto;
  catColor:     string;
  grid:         boolean;
  mob:          boolean;
  tab:          boolean;
  desk:         boolean;
  addedId:      number | null;
  esPropio:     boolean;
  compacto?:    boolean;
  onDragStart:  (e: React.DragEvent,  p: Producto) => void;
  onDragEnd:    () => void;
  productoSeleccionadoKey: string | null;
  productoSeleccionadoRef: React.MutableRefObject<string | null>;
  seleccionarProducto: (key: string | null) => void;
  addProd:      (p: Producto) => void;
  abrirEditar:  (p: Producto) => void;
  eliminarProd: (id: number) => void;
}

function TarjetaProducto({
  p, catColor, grid, mob, tab, desk,
  addedId, esPropio, compacto = false,
  onDragStart, onDragEnd,
  productoSeleccionadoKey, productoSeleccionadoRef, seleccionarProducto,
  addProd, abrirEditar, eliminarProd,
}: TarjetaProps) {
  const productoKey    = claveProducto(p);
  const agregado       = addedId === p.id;
  const preciosMostrar = p.precio500 || p.precio1000 || p.precio3000;

  // Algunos iPad/tablets pueden caer como "desk" por el ancho de pantalla.
  // Por eso el doble toque se activa por tamaño tablet y también por pointer touch/pen.
  const esDispositivoTouch =
    typeof window !== "undefined" &&
    (("ontouchstart" in window) || (navigator.maxTouchPoints ?? 0) > 0);

  const seleccionado = !mob && (tab || esDispositivoTouch) && productoSeleccionadoKey === productoKey;
  const marcado      = seleccionado || agregado;

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const ignorarClickRef = useRef(false);

  const tocarProducto = () => {
    if (mob) {
      addProd(p);
      return;
    }

    // Tablet / pantalla touch en formato normal:
    // 1er toque selecciona, 2do toque sobre el mismo producto agrega.
    if (productoSeleccionadoRef.current === productoKey) {
      addProd(p);
      seleccionarProducto(null);
    } else {
      seleccionarProducto(productoKey);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const usarTap = mob || tab || e.pointerType === "touch" || e.pointerType === "pen";
    if (!usarTap) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const usarTap = mob || tab || e.pointerType === "touch" || e.pointerType === "pen";
    if (!usarTap) return;

    // Evita agregar/seleccionar si el toque fue sobre editar/eliminar.
    if ((e.target as HTMLElement).closest("button")) return;

    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (start) {
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx > 10 || dy > 10) return; // fue scroll, no tap
    }

    e.preventDefault();
    e.stopPropagation();
    tocarProducto();

    // React/browser puede disparar click después de pointerup.
    // Lo ignoramos para que el primer toque NO agregue de inmediato.
    ignorarClickRef.current = true;
    window.setTimeout(() => { ignorarClickRef.current = false; }, 450);
  };

  // Fallback para navegadores que disparan click pero no pointer events correctamente.
  const handleClick = (e: React.MouseEvent) => {
    if (ignorarClickRef.current) return;
    if (desk && !tab && !esDispositivoTouch) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    tocarProducto();
  };

  // Drag HTML5 solo en desktop con mouse.
  const handleDragStart = (e: React.DragEvent) => { if (desk) onDragStart(e, p); };

  const cardStyle: React.CSSProperties = {
    background: compacto ? "#171717" : "#1E1E1E",
    border: seleccionado ? "1px solid #C9922A" : "1px solid #222",
    borderRadius: compacto ? 7 : 8,
    padding: compacto ? "7px 8px" : 8,
    display: "flex",
    flexDirection: (!compacto && grid) ? "column" : "row",
    gap: 8,
    cursor: desk ? "grab" : "pointer",
    userSelect: "none",
    position: "relative",
    marginBottom: compacto ? 5 : 0,
    touchAction: mob || tab ? "manipulation" : "auto",
    boxShadow: seleccionado ? "0 0 0 1px rgba(201,146,42,.35)" : undefined,
  };

  const indicador = (mob || tab) && (
    <div style={{ position:"absolute", top: compacto?5:6, right: compacto?5:6, background:marcado?"#22C55E":"#C9922A", border:compacto?`1px solid ${marcado?"#22C55E":"#333"}`:"none", borderRadius:"50%", width:compacto?18:20, height:compacto?18:20, display:"flex", alignItems:"center", justifyContent:"center", color:"#FFF", fontSize:marcado?10:14, fontWeight:700, transition:"all .2s" }}>
      {marcado ? "✓" : "+"}
    </div>
  );

  const imagen = compacto ? (
    p.imagen
      ? <img src={p.imagen} alt={p.nombre} style={{ width:38, height:38, objectFit:"cover", borderRadius:4, flexShrink:0, border:"1px solid #222" }} />
      : <div style={{ width:38, height:38, borderRadius:4, flexShrink:0, border:"1px solid #222", background:"#222", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
          {p.categoria==="papel"?"📄":p.categoria==="plastico"?"🧴":"📦"}
        </div>
  ) : (
    p.imagen
      ? <img src={p.imagen} alt={p.nombre} style={{ width:grid?"100%":46, height:grid?72:46, objectFit:"cover", borderRadius:5, flexShrink:0, border:"1px solid #333" }} />
      : <div style={{ width:grid?"100%":46, height:grid?72:46, borderRadius:5, flexShrink:0, border:"1px solid #333", background:"#2A2A2A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:grid?28:20 }}>
          {p.categoria==="papel"?"📄":p.categoria==="plastico"?"🧴":"📦"}
        </div>
  );

  return (
    <div
      className="pcard"
      style={cardStyle}
      draggable={desk}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      {imagen}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color:compacto?"#BBB":"#EEE", fontSize:compacto?10.5:11, fontWeight:600, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:(!compacto&&grid)?"normal":"nowrap" }}>{p.nombre}</div>
        {compacto
          ? <div style={{ color:"#444", fontSize:9, margin:"1px 0 3px" }}>{[p.medida,p.material].filter(Boolean).join(" · ")}</div>
          : <div style={{ color:catColor, fontSize:9, margin:"2px 0 4px" }}>{p.medida}</div>
        }
        {compacto && !preciosMostrar && <div style={{ color:"#444", fontSize:9, fontStyle:"italic" }}>Sin precios expo</div>}
        <div style={{ display:"flex", gap:compacto?8:8, flexWrap:"wrap" }}>
          {([["500",p.precio500],["1k",p.precio1000],["3k",p.precio3000]] as const).map(([l,v]) =>
            v ? (
              <div key={l} style={{ display:"flex", flexDirection:compacto?"row":"column", alignItems:compacto?"baseline":"center", gap:compacto?3:0 }}>
                <span style={{ color:compacto?"#444":"#555", fontSize:7.5, textTransform:"uppercase" }}>{l}</span>
                <span style={{ color:"#C9922A", fontSize:compacto?10:10.5, fontWeight:700 }}>{v}</span>
              </div>
            ) : null
          )}
        </div>
      </div>

      {indicador}
      {desk && <span style={{ position:"absolute", right:compacto?6:7, top:"50%", transform:"translateY(-50%)", color:"#333", fontSize:compacto?11:13 }}>⠿</span>}

      {esPropio && (
        <div className="pcard-actions" style={{ position:"absolute", bottom:6, right:6, display:"flex", gap:4 }}>
          <button onPointerUp={e=>e.stopPropagation()} onClick={e=>{ e.stopPropagation(); abrirEditar(p); }}
            style={{ background:"#2A2A2A", border:"1px solid #444", color:"#C9922A", width:22, height:22, borderRadius:4, cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>✎</button>
          <button onPointerUp={e=>e.stopPropagation()} onClick={e=>{ e.stopPropagation(); if(confirm(`¿Eliminar "${p.nombre}"?`)) eliminarProd(p.id); }}
            style={{ background:"#2A2A2A", border:"1px solid #444", color:"#888", width:22, height:22, borderRadius:4, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}
    </div>
  );
}