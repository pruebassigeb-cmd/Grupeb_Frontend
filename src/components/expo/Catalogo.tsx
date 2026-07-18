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
  addedId: string | null;
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
  // grid/sistemaOpen/setSistemaOpen ya no se usan tras fusionar "Catálogo
  // Expo" y "Sistema" en una sola lista (ya no hay una tabla catalogo_expo
  // separada) — se dejan en la interfaz de Props por compatibilidad con
  // quien llama a este componente, sin tocar Expo.tsx en esta pasada.
  void grid; void sistemaOpen; void setSistemaOpen;
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
        // ── Fusión: ya no hay una tabla catalogo_expo separada — "catalogo"
        // (productos propios, origen_expo=true) y "sistemaProductos" (TODOS
        // los productos del sistema) ahora comparten la misma tabla real.
        // Un producto con origen_expo=true aparece en AMBOS arrays — se
        // fusiona en una sola lista sin duplicar, usando el id real como
        // clave de dedupe (no claveProducto, porque el `fuente` puede venir
        // distinto entre los dos arrays para el mismo producto).
        const propiosCat = catalogo.filter(p => p.categoria === cat.key);
        const sistemaCat = sistemaProductos.filter(p => p.categoria === cat.key);
        const claveVariante = (p: Producto) =>
          `${p.categoria}:${p.id}:${p.idgrupo_papel ?? 0}`;
        const variantesPropias = new Set(propiosCat.map(claveVariante));
        const variantesEnSistema = new Set(sistemaCat.map(claveVariante));
        // Los propios que por algún motivo no vinieron en sistemaProductos
        // (ej. carrera de red) igual se muestran — no se pierden.
        const soloEnPropios = propiosCat.filter(
          p => !variantesEnSistema.has(claveVariante(p))
        );
        const todosCat = [...sistemaCat, ...soloEnPropios];

        const busq = busquedaStore[cat.key]?.toLowerCase() || "";
        const listaFiltrada = todosCat.filter(p =>
          !busq ||
          p.nombre.toLowerCase().includes(busq) ||
          p.medida.toLowerCase().includes(busq) ||
          p.material.toLowerCase().includes(busq)
        );
        const open = expanded[cat.key];

        return (
          <div key={cat.key} style={{ marginBottom: 2 }}>

            <button
              onClick={() => toggleExp(cat.key)}
              style={{ width:"100%", background:"#171717", border:"none", borderBottom:`1px solid ${cat.color}33`, cursor:"pointer", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:14 }}>{cat.emoji}</span>
                <span style={{ color:cat.color, fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase" }}>{cat.label}</span>
                <span style={{ background:`${cat.color}22`, color:cat.color, fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:10, border:`1px solid ${cat.color}44` }}>{todosCat.length}</span>
              </div>
              <span style={{ color:cat.color, fontSize:11 }}>{open ? "▲" : "▼"}</span>
            </button>

            {open && (
              <div style={{ background:"#0D0D0D" }}>
                <div style={{ padding:"8px 10px 4px" }}>
                  <div style={{ position:"relative" }}>
                    <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", fontSize:11, color:"#444", pointerEvents:"none" }}>🔍</span>
                    <input
                      key={`busq-${cat.key}`}
                      defaultValue={busquedaStore[cat.key] || ""}
                      onChange={e => { busquedaStore[cat.key] = e.target.value; setBusquedaTick(t => t+1); }}
                      placeholder="Buscar producto..."
                      style={{ width:"100%", background:"#1A1A1A", border:"1px solid #2A2A2A", borderRadius:6, padding:"6px 28px 6px 26px", color:"#DDD", fontSize:11, outline:"none", fontFamily:"'Inter',sans-serif" }}
                    />
                    {busquedaStore[cat.key] && (
                      <button
                        onClick={() => { busquedaStore[cat.key] = ""; setBusquedaTick(t => t+1); }}
                        style={{ position:"absolute", right:7, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:13 }}>✕</button>
                    )}
                  </div>
                </div>
                <div style={{ maxHeight:420, overflowY:"auto", padding:"4px 8px 8px" }}>
                  {listaFiltrada.length === 0
                    ? <div style={{ color:"#444", fontSize:11, textAlign:"center", padding:"16px 0" }}>
                        {busq ? "Sin resultados" : "Sin productos en esta categoría"}
                      </div>
                    : listaFiltrada.map(p => (
                      <TarjetaProducto key={claveProducto(p)} p={p} catColor={cat.color}
                        grid={false} mob={mob} tab={tab} desk={desk} addedId={addedId}
                        onDragStart={onDragStart} onDragEnd={onDragEnd}
                        productoSeleccionadoKey={productoSeleccionadoKey}
                        productoSeleccionadoRef={productoSeleccionadoRef}
                        seleccionarProducto={seleccionarProducto}
                        addProd={addProd} abrirEditar={abrirEditar} eliminarProd={eliminarProd}
                        esPropio={variantesPropias.has(claveVariante(p))} compacto />
                    ))
                  }
                </div>
              </div>
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
  addedId:      string | null;
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
  // Editar/eliminar ya NO se hacen desde aquí (el sidebar de selección) —
  // esa función vive en el modal "Catálogo Expo" (ModalCatalogoExpo.tsx),
  // que ya la tenía duplicada. abrirEditar/eliminarProd se dejan en las
  // Props por compatibilidad con quien llama a este componente.
  void abrirEditar; void eliminarProd;
  // Para productos propios se separan por completo las referencias del
  // objeto que entra al cotizador. precio1000/precio3000 conservan su uso
  // histórico únicamente para productos del sistema; en Expo las referencias
  // viajan por precioReferencia500/precioReferencia1000.
  const productoParaCotizar: Producto = esPropio
    ? {
        ...p,
        fuente: "expo",
        origen: "expo",
        precio1000: "",
        precio3000: "",
      }
    : p;

  const productoKey = claveProducto(productoParaCotizar);
  const agregado = addedId === productoKey;

  const preciosTarjeta = esPropio
    ? [
        ...(p.categoria === "plastico" && p.precio500
          ? [{ key: "unitario", label: "Unit. Expo", value: p.precio500 }]
          : []),
        ...(p.precioReferencia500
          ? [{ key: "ref500", label: "500 pzas", value: p.precioReferencia500 }]
          : []),
        ...(p.precioReferencia1000
          ? [{ key: "ref1000", label: "1,000 pzas", value: p.precioReferencia1000 }]
          : []),
      ]
    : [
        ...(p.precio500 ? [{ key: "500", label: "500", value: p.precio500 }] : []),
        ...(p.precio1000 ? [{ key: "1k", label: "1k", value: p.precio1000 }] : []),
        ...(p.precio3000 ? [{ key: "3k", label: "3k", value: p.precio3000 }] : []),
      ];

  const preciosMostrar = preciosTarjeta.length > 0;

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
      addProd(productoParaCotizar);
      return;
    }

    // Tablet / pantalla touch en formato normal:
    // 1er toque selecciona, 2do toque sobre el mismo producto agrega.
    if (productoSeleccionadoRef.current === productoKey) {
      addProd(productoParaCotizar);
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
  const handleDragStart = (e: React.DragEvent) => {
    if (desk) onDragStart(e, productoParaCotizar);
  };

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
    // ── Aligerar memoria/render en listas largas ──────────────────────────
    // content-visibility le dice al navegador que no calcule layout/paint
    // de tarjetas fuera de pantalla hasta que estén cerca de hacerse
    // visibles — es una especie de virtualización "gratis" sin necesitar
    // una librería ni reescribir la lista en páginas.
    contentVisibility: "auto",
    containIntrinsicSize: compacto ? "0 62px" : (grid ? "0 150px" : "0 82px"),
  };

  const indicador = (mob || tab) && (
    <div style={{ position:"absolute", top: compacto?5:6, right: compacto?5:6, background:marcado?"#22C55E":"#C9922A", border:compacto?`1px solid ${marcado?"#22C55E":"#333"}`:"none", borderRadius:"50%", width:compacto?18:20, height:compacto?18:20, display:"flex", alignItems:"center", justifyContent:"center", color:"#FFF", fontSize:marcado?10:14, fontWeight:700, transition:"all .2s" }}>
      {marcado ? "✓" : "+"}
    </div>
  );

  // loading="lazy" + decoding="async": el navegador no descarga ni decodifica
  // estas imágenes hasta que están por entrar a pantalla. Con catálogos de
  // 18+ productos esto evita mantener decenas de imágenes decodificadas en
  // memoria a la vez, que es justo lo que puede hacer que Android mate la
  // pestaña más seguido en tablets con poca RAM.
  const imagen = compacto ? (
    p.imagen
      ? <img src={p.imagen} alt={p.nombre} loading="lazy" decoding="async" style={{ width:48, height:48, objectFit:"cover", borderRadius:4, flexShrink:0, border:"1px solid #222" }} />
      : <div style={{ width:48, height:48, borderRadius:4, flexShrink:0, border:"1px solid #222", background:"#222", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
          {p.categoria==="papel"?"📄":p.categoria==="plastico"?"🧴":"📦"}
        </div>
  ) : (
    p.imagen
      ? <img src={p.imagen} alt={p.nombre} loading="lazy" decoding="async" style={{ width:grid?"100%":64, height:grid?92:64, objectFit:"cover", borderRadius:5, flexShrink:0, border:"1px solid #333" }} />
      : <div style={{ width:grid?"100%":64, height:grid?92:64, borderRadius:5, flexShrink:0, border:"1px solid #333", background:"#2A2A2A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:grid?32:24 }}>
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
        <div style={{ display:"flex", alignItems:"center", gap:5, minWidth:0 }}>
          <span style={{ color:compacto?"#BBB":"#EEE", fontSize:compacto?10.5:11, fontWeight:600, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:(!compacto&&grid)?"normal":"nowrap" }}>{p.nombre}</span>
          {esPropio && (
            <span title="Creado desde Expo" style={{ flexShrink:0, display:"inline-flex", alignItems:"center", gap:2, padding:"0 5px", borderRadius:7, background:"#C9922A1E", border:"1px solid #C9922A44", color:"#C9922A", fontSize:8.5, fontWeight:700 }}>
              ⭐ Expo
            </span>
          )}
        </div>
        {compacto
          ? <div style={{ color:"#444", fontSize:10, margin:"1px 0 3px" }}>{[p.medida,p.material].filter(Boolean).join(" · ")}</div>
          : <div style={{ color:catColor, fontSize:10, margin:"2px 0 4px" }}>{p.medida}</div>
        }
        {compacto && !preciosMostrar && (
          <div style={{ color:"#444", fontSize:9, fontStyle:"italic" }}>
            {esPropio ? "Sin precios de referencia" : "Sin precios"}
          </div>
        )}
        <div style={{ display:"flex", gap:compacto?8:8, flexWrap:"wrap" }}>
          {preciosTarjeta.map(precio => (
            <div
              key={precio.key}
              style={{
                display:"flex",
                flexDirection:compacto?"row":"column",
                alignItems:compacto?"baseline":"center",
                gap:compacto?3:0,
              }}
            >
              <span
                style={{
                  color:compacto?"#555":"#666",
                  fontSize:7.5,
                  textTransform:"uppercase",
                }}
              >
                {precio.label}
              </span>
              <span style={{ color:"#C9922A", fontSize:compacto?10:10.5, fontWeight:700 }}>
                {precio.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {indicador}
      {desk && <span style={{ position:"absolute", right:compacto?6:7, top:"50%", transform:"translateY(-50%)", color:"#333", fontSize:compacto?11:13 }}>⠿</span>}
    </div>
  );
}