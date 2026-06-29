import { useRef } from "react";
import { CATS } from "../../types/expo/expo.types";
import type { Producto } from "../../types/expo/expo.types";

// Store de búsqueda fuera del componente
export const busquedaStore: Record<string, string> = { papel: "", plastico: "", carton: "" };

interface Props {
  grid?: boolean;
  mob: boolean;
  tab: boolean;
  desk: boolean;
  // Productos propios del catálogo expo
  catalogo: Producto[];
  // Productos reales del sistema (plastico + papel)
  sistemaProductos: Producto[];
  loadingCatalogo: boolean;
  expanded: Record<string, boolean>;
  sistemaOpen: Record<string, boolean>;
  addedId: number | null;
  busquedaTick: number;
  setBusquedaTick: React.Dispatch<React.SetStateAction<number>>;
  toggleExp: (k: string) => void;
  setSistemaOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onDragStart: (e: React.DragEvent, id: number) => void;
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
  onDragStart, onDragEnd, addProd, abrirEditar, eliminarProd,
}: Props) {
  void busquedaTick;

  return (
    <div style={{ paddingBottom: mob ? 80 : 16 }}>

      {/* Loading */}
      {loadingCatalogo && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ color: "#444", fontSize: 12 }}>Cargando catálogo...</div>
        </div>
      )}

      {!loadingCatalogo && CATS.map(cat => {
        // Productos propios expo de esta categoría
        const ps = catalogo.filter(p => p.categoria === cat.key);

        // Productos del sistema de esta categoría
        const sysTotal = sistemaProductos.filter(p => p.categoria === cat.key);
        const busq = busquedaStore[cat.key]?.toLowerCase() || "";
        const sPs = sysTotal.filter(p =>
          !busq ||
          p.nombre.toLowerCase().includes(busq) ||
          p.medida.toLowerCase().includes(busq) ||
          p.material.toLowerCase().includes(busq)
        );

        const open  = expanded[cat.key];
        const sOpen = sistemaOpen[cat.key];

        return (
          <div key={cat.key} style={{ marginBottom: 2 }}>

            {/* Header categoría */}
            <button
              onClick={() => toggleExp(cat.key)}
              style={{ width: "100%", background: "#171717", border: "none", borderBottom: `1px solid ${cat.color}33`, cursor: "pointer", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                <span style={{ color: cat.color, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>{cat.label}</span>
                <span style={{ background: `${cat.color}22`, color: cat.color, fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 10, border: `1px solid ${cat.color}44` }}>{ps.length}</span>
              </div>
              <span style={{ color: cat.color, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
            </button>

            {/* Productos propios expo */}
            {open && (
              <div style={{ padding: "6px 8px", display: "grid", gridTemplateColumns: grid ? "1fr 1fr" : "1fr", gap: 6 }}>
                {ps.length === 0 && (
                  <div style={{ gridColumn: grid ? "1 / -1" : undefined, padding: "10px 8px", color: "#444", fontSize: 11, fontStyle: "italic", textAlign: "center" }}>
                    Sin productos en el catálogo expo
                  </div>
                )}
                {ps.map(p => (
                  <TarjetaProducto
                    key={p.id}
                    p={p}
                    catColor={cat.color}
                    grid={!!grid}
                    mob={mob}
                    tab={tab}
                    desk={desk}
                    addedId={addedId}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    addProd={addProd}
                    abrirEditar={abrirEditar}
                    eliminarProd={eliminarProd}
                    esPropio
                  />
                ))}
              </div>
            )}

            {/* Productos del sistema */}
            {open && (
              <div style={{ margin: "0 8px 8px", borderRadius: 8, border: "1px solid #222", overflow: "hidden" }}>
                <button
                  onClick={() => setSistemaOpen(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                  style={{ width: "100%", background: "#141414", border: "none", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 11 }}>🗂</span>
                    <span style={{ color: "#555", fontSize: 10, fontWeight: 600, letterSpacing: .8, textTransform: "uppercase" }}>Del sistema</span>
                    <span style={{ background: "#1E1E1E", color: "#555", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, border: "1px solid #2A2A2A" }}>{sysTotal.length}</span>
                  </div>
                  <span style={{ color: "#444", fontSize: 10 }}>{sOpen ? "▲" : "▼"}</span>
                </button>

                {sOpen && (
                  <div style={{ background: "#0D0D0D" }}>
                    {/* Buscador */}
                    <div style={{ padding: "8px 10px 4px" }}>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#444", pointerEvents: "none" }}>🔍</span>
                        <input
                          key={`busq-${cat.key}`}
                          defaultValue={busquedaStore[cat.key] || ""}
                          onChange={e => { busquedaStore[cat.key] = e.target.value; setBusquedaTick(t => t + 1); }}
                          placeholder="Buscar producto..."
                          style={{ width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 6, padding: "6px 28px 6px 26px", color: "#DDD", fontSize: 11, outline: "none", fontFamily: "'Inter',sans-serif" }}
                        />
                        {busquedaStore[cat.key] && (
                          <button
                            onClick={() => { busquedaStore[cat.key] = ""; setBusquedaTick(t => t + 1); }}
                            style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13 }}>✕</button>
                        )}
                      </div>
                    </div>

                    <div style={{ maxHeight: 260, overflowY: "auto", padding: "4px 8px 8px" }}>
                      {sPs.length === 0
                        ? <div style={{ color: "#444", fontSize: 11, textAlign: "center", padding: "16px 0" }}>
                            {busq ? "Sin resultados" : "Sin productos del sistema en esta categoría"}
                          </div>
                        : sPs.map(p => (
                          <TarjetaProducto
                            key={p.id}
                            p={p}
                            catColor={cat.color}
                            grid={false}
                            mob={mob}
                            tab={tab}
                            desk={desk}
                            addedId={addedId}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            addProd={addProd}
                            abrirEditar={abrirEditar}
                            eliminarProd={eliminarProd}
                            esPropio={false}
                            compacto
                          />
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tarjeta de producto reutilizable ─────────────────────────────────────────
interface TarjetaProps {
  p:            Producto;
  catColor:     string;
  grid:         boolean;
  mob:          boolean;
  tab:          boolean;
  desk:         boolean;
  addedId:      number | null;
  esPropio:     boolean;   // true = catálogo expo, false = del sistema
  compacto?:    boolean;
  onDragStart:  (e: React.DragEvent, id: number) => void;
  onDragEnd:    () => void;
  addProd:      (p: Producto) => void;
  abrirEditar:  (p: Producto) => void;
  eliminarProd: (id: number) => void;
}

function TarjetaProducto({
  p, catColor, grid, mob, tab, desk,
  addedId, esPropio, compacto = false,
  onDragStart, onDragEnd, addProd, abrirEditar, eliminarProd,
}: TarjetaProps) {
  const agregado = addedId === p.id;

  const preciosMostrar = p.precio500 || p.precio1000 || p.precio3000;

  if (compacto) {
    // Estilo compacto para "del sistema"
    return (
      <div
        className="pcard"
        style={{ background: "#171717", border: "1px solid #222", borderRadius: 7, padding: "7px 8px", display: "flex", gap: 8, cursor: mob ? "pointer" : "grab", userSelect: "none", position: "relative", marginBottom: 5 }}
        draggable={!mob}
        onDragStart={e => !mob && onDragStart(e, p.id)}
        onDragEnd={onDragEnd}
        onClick={() => (mob || tab) && addProd(p)}
      >
        {p.imagen
          ? <img src={p.imagen} alt={p.nombre} style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 4, flexShrink: 0, border: "1px solid #222" }} />
          : <div style={{ width: 38, height: 38, borderRadius: 4, flexShrink: 0, border: "1px solid #222", background: "#222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              {p.categoria === "papel" ? "📄" : p.categoria === "plastico" ? "🧴" : "📦"}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#BBB", fontSize: 10.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
          <div style={{ color: "#444", fontSize: 9, margin: "1px 0 3px" }}>
            {[p.medida, p.material].filter(Boolean).join(" · ")}
          </div>
          {preciosMostrar && (
            <div style={{ display: "flex", gap: 8 }}>
              {([["500", p.precio500], ["1k", p.precio1000], ["3k", p.precio3000]] as const).map(([l, v]) =>
                v ? (
                  <div key={l} style={{ display: "flex", gap: 3, alignItems: "baseline" }}>
                    <span style={{ color: "#444", fontSize: 7.5, textTransform: "uppercase" }}>{l}</span>
                    <span style={{ color: "#C9922A", fontSize: 10, fontWeight: 700 }}>{v}</span>
                  </div>
                ) : null
              )}
            </div>
          )}
          {!preciosMostrar && (
            <div style={{ color: "#444", fontSize: 9, fontStyle: "italic" }}>Sin precios expo</div>
          )}
        </div>
        {(mob || tab) && (
          <div style={{ position: "absolute", top: 5, right: 5, background: agregado ? "#22C55E" : "#2A2A2A", border: `1px solid ${agregado ? "#22C55E" : "#333"}`, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", color: agregado ? "#FFF" : "#C9922A", fontSize: agregado ? 10 : 12, fontWeight: 700, transition: "all .2s" }}>
            {agregado ? "✓" : "+"}
          </div>
        )}
        {desk && <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", color: "#333", fontSize: 11 }}>⠿</span>}
      </div>
    );
  }

  // Estilo normal para catálogo expo propio
  return (
    <div
      className="pcard"
      style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: 8, padding: 8, display: "flex", flexDirection: grid ? "column" : "row", gap: 8, cursor: mob ? "pointer" : "grab", userSelect: "none", position: "relative" }}
      draggable={!mob}
      onDragStart={e => !mob && onDragStart(e, p.id)}
      onDragEnd={onDragEnd}
      onClick={() => (mob || tab) && addProd(p)}
    >
      {p.imagen
        ? <img src={p.imagen} alt={p.nombre} style={{ width: grid ? "100%" : 46, height: grid ? 72 : 46, objectFit: "cover", borderRadius: 5, flexShrink: 0, border: "1px solid #333" }} />
        : <div style={{ width: grid ? "100%" : 46, height: grid ? 72 : 46, borderRadius: 5, flexShrink: 0, border: "1px solid #333", background: "#2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: grid ? 28 : 20 }}>
            {p.categoria === "papel" ? "📄" : p.categoria === "plastico" ? "🧴" : "📦"}
          </div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#EEE", fontSize: 11, fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: grid ? "normal" : "nowrap" }}>{p.nombre}</div>
        <div style={{ color: catColor, fontSize: 9, margin: "2px 0 4px" }}>{p.medida}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {([["500", p.precio500], ["1k", p.precio1000], ["3k", p.precio3000]] as const).map(([l, v]) =>
            v ? (
              <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ color: "#555", fontSize: 7.5, textTransform: "uppercase" }}>{l}</span>
                <span style={{ color: "#C9922A", fontSize: 10.5, fontWeight: 700 }}>{v}</span>
              </div>
            ) : null
          )}
        </div>
      </div>

      {(mob || tab) && (
        <div style={{ position: "absolute", top: 6, right: 6, background: agregado ? "#22C55E" : "#C9922A", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: agregado ? 12 : 14, fontWeight: 700, transition: "background .2s" }}>
          {agregado ? "✓" : "+"}
        </div>
      )}
      {desk && <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", color: "#444", fontSize: 13 }}>⠿</span>}

      {/* Acciones — solo para productos propios expo */}
      {esPropio && (
        <div className="pcard-actions" style={{ position: "absolute", bottom: 6, right: 6, display: "flex", gap: 4 }}>
          <button onClick={e => { e.stopPropagation(); abrirEditar(p); }}
            style={{ background: "#2A2A2A", border: "1px solid #444", color: "#C9922A", width: 22, height: 22, borderRadius: 4, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button>
          <button onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar "${p.nombre}"?`)) eliminarProd(p.id); }}
            style={{ background: "#2A2A2A", border: "1px solid #444", color: "#888", width: 22, height: 22, borderRadius: 4, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      )}
    </div>
  );
}