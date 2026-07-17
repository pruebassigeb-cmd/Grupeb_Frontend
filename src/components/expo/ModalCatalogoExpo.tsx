import { useState, useEffect } from "react";
import api from "../../services/api";
import ModalProducto from "./ModalProducto";
import {
  getCatalogoPropio, crearProductoCatalogo, actualizarProductoCatalogo,
  eliminarProductoCatalogo as eliminarProductoCatalogoAPI,
  getCatalogoSistema,
} from "../../services/expo/expoService";
import { mapearCatalogoExpoAProducto, CATS } from "../../types/expo/expo.types";
import type { Producto } from "../../types/expo/expo.types";
import { useCatalogosPapel } from "../../hooks/papel/useCatalogosPapel";
import { getFoils, getTexturas } from "../../services/papel/papelCotizacionService";
import type { FoilOpcion, TexturaOpcion } from "../../types/papel/cotizacion-papel.types";

interface Props {
  onClose: () => void;
}

// Mismo helper que en Expo.tsx — duplicado a propósito porque son dos
// archivos/entradas distintas al mismo modal (ModalProducto), no vale la
// pena crear un módulo compartido solo para esta función chica.
const subirImagenProductoExpo = async (
  file: File,
  categoria: "papel" | "plastico" | "carton",
  idReal: number,
) => {
  const formData = new FormData();
  formData.append("archivo", file);
  if (categoria === "plastico") {
    formData.append("carpeta", "suaje");
    formData.append("subcarpeta", "plastico-producto");
    formData.append("categoria", "imagen-producto-plastico");
    formData.append("idconfiguracion_plastico", String(idReal));
  } else {
    formData.append("carpeta", "suaje");
    formData.append("subcarpeta", "imagen");
    formData.append("categoria", "imagen-suaje-papel");
    formData.append("idproducto_papel", String(idReal));
  }
  await api.post("/archivos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export default function ModalCatalogoExpo({ onClose }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busq, setBusq] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<"todas" | "papel" | "plastico" | "carton">("todas");
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [catInicial, setCatInicial] = useState<"papel" | "plastico" | "carton">("papel");
  const [saving, setSaving] = useState(false);

  const { catalogs } = useCatalogosPapel();
  const [foils, setFoils] = useState<FoilOpcion[]>([]);
  const [texturas, setTexturas] = useState<TexturaOpcion[]>([]);
  const [coloresAsa, setColoresAsa] = useState<{ id: number; nombre: string }[]>([]);

  useEffect(() => { cargar(); }, []);
  useEffect(() => {
    getFoils().then(setFoils).catch(console.error);
    getTexturas().then(setTexturas).catch(console.error);
    getCatalogoSistema().then(s => { if (s.coloresAsa) setColoresAsa(s.coloresAsa); }).catch(console.error);
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await getCatalogoPropio();
      setProductos(data.map(mapearCatalogoExpoAProducto));
    } catch {
      console.error("No se pudo cargar el catálogo expo");
    } finally {
      setLoading(false);
    }
  };

  const abrirNuevo = (cat: "papel" | "plastico" | "carton") => {
    setEditando(null);
    setCatInicial(cat);
    setModalOpen(true);
  };

  const abrirEditar = (p: Producto) => {
    setEditando(p);
    setCatInicial(p.categoria);
    setModalOpen(true);
  };

  const guardarProd = async (p: Producto, imagenPendiente: File | null) => {
    setSaving(true);
    try {
      const parseN = (v: string | undefined) => parseFloat(v || "0") || null;
      const esPapel = p.categoria === "papel" || p.categoria === "carton";
      const esPlastico = p.categoria === "plastico";
     const payload = {
  nombre: p.nombre,

  descripcion:
    p.categoria === "plastico"
      ? (p.nombre?.trim() || null)
      : null,

  categoria: p.categoria,
  medida: p.medida || null,
  material: p.material || null,
  calibre: p.calibre || null,

  // Tamaño normalizado para papel/cartón.
  id_tamano_producto: esPapel ? (p.idTamanoProducto ?? null) : null,
  tamano_prod: esPapel ? (p.tamanoProd || null) : null,
  idgrupo_papel: esPapel ? (p.idgrupo_papel ?? null) : null,

  tintas: p.tintas || null,
  tipo_producto: p.tipoProducto || p.tipo || null,

  laminacion: p.laminacion,
  tipo_laminado: p.tipoLaminado || null,

  hs: p.hs,
  tipo_hs: p.tipoHs || null,

  ar: p.ar,
  textura: p.textura,
  tipo_textura: p.tipoTextura || null,

  uv: p.uv,
  asa: p.asa,
  tipo_asa: p.tipoAsa || null,
  otro: p.otro || null,

  pigmento: esPlastico ? (p.pigmento || null) : null,

  precio_base: esPapel
    ? (parseFloat((p.precioBase || "").replace(/[^0-9.]/g, "")) || null)
    : null,
  precio_500: esPlastico
    ? (parseFloat(p.precio500.replace(/[^0-9.]/g, "")) || null)
    : null,
  precio_1000: esPlastico
    ? (parseFloat(p.precio1000.replace(/[^0-9.]/g, "")) || null)
    : null,
  precio_3000: esPlastico
    ? (parseFloat(p.precio3000.replace(/[^0-9.]/g, "")) || null)
    : null,

  origen: "expo",

  altura: parseN(p.altura),
  ancho: parseN(p.ancho),
  fuelle: esPapel ? parseN(p.fuelle) : null,
  fuelle_fondo: esPlastico ? parseN(p.fuelFondo) : null,
  fuelle_lateral_iz: esPlastico ? parseN(p.fuelLateral) : null,
  fuelle_lateral_de: esPlastico ? parseN(p.fuelLateral2) : null,
  refuerzo: esPlastico ? parseN(p.refuerzo) : null,

  tintas_frente_default: p.tintasFrenteDefault ?? null,
  tintas_dentro_default: esPapel
    ? (p.tintasDentroDefault ?? null)
    : null,
};

let idReal: number;
      if (editando) {
        const actualizado = await actualizarProductoCatalogo(editando.id, payload as any);
        const mapeado = mapearCatalogoExpoAProducto(actualizado);
        idReal = actualizado.idcatalogo_expo;
        setProductos(prev => prev.map(x =>
          x.id === editando.id &&
          (x.idgrupo_papel ?? null) === (editando.idgrupo_papel ?? null)
            ? mapeado
            : x
        ));
      } else {
        const creado = await crearProductoCatalogo(payload as any);
        const mapeado = mapearCatalogoExpoAProducto(creado);
        idReal = creado.idcatalogo_expo;
        setProductos(prev => [...prev, mapeado]);
      }

      // Foto de producto NUEVO: se guardó como "pendiente" en el modal (no
      // había id todavía). Se sube y vincula ahora que ya existe. Si era
      // edición, ya se subió de inmediato dentro del modal.
      if (imagenPendiente) {
        try {
          await subirImagenProductoExpo(imagenPendiente, p.categoria, idReal);
        } catch (e) {
          console.error("No se pudo subir la imagen del producto:", e);
          alert("El producto se guardó, pero la imagen no se pudo subir. Puedes agregarla editando el producto.");
        }
      }

      await cargar();
      setModalOpen(false);
      setEditando(null);
    } catch (err: any) {
      alert("No se pudo guardar: " + (err?.response?.data?.error || err.message));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const eliminarProd = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}" del catálogo expo?`)) return;
    // NUEVO: hay que mandar la categoría — el backend ya no tiene una sola
    // tabla catalogo_expo, necesita saber si busca en producto_papel o
    // configuracion_plastico.
    const prod = productos.find(p => p.id === id);
    if (!prod) return;
    setEliminandoId(id);
    try {
      await eliminarProductoCatalogoAPI(id, prod.categoria);
      setProductos(prev => prev.filter(p => p.id !== id));
    } catch {
      alert("No se pudo eliminar el producto");
    } finally {
      setEliminandoId(null);
    }
  };

  const filtrados = productos.filter(p => {
    if (filtroCategoria !== "todas" && p.categoria !== filtroCategoria) return false;
    if (busq.trim() && !p.nombre.toLowerCase().includes(busq.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 14, width: "90vw", maxWidth: 1000, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.85)" }}>

        <div style={{ background: "#0D0D0D", borderBottom: "2px solid #C9922A", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🛠</span>
            <div>
              <div style={{ color: "#FFF", fontSize: 13, fontWeight: 700, letterSpacing: .5 }}>Catálogo Expo</div>
              <div style={{ color: "#555", fontSize: 9.5, marginTop: 1 }}>
                {productos.length} producto{productos.length !== 1 ? "s" : ""} propio{productos.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #333", color: "#888", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>
            ✕ Cerrar
          </button>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1A1A1A", flexShrink: 0, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input value={busq} onChange={e => setBusq(e.target.value)}
            placeholder="Buscar producto..."
            style={{ flex: 1, minWidth: 200, background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 7, padding: "8px 12px", color: "#EEE", fontSize: 12, outline: "none", fontFamily: "'Inter',sans-serif" }} />
          <div style={{ display: "flex", gap: 6 }}>
            {(["todas", "papel", "plastico", "carton"] as const).map(c => (
              <button key={c} onClick={() => setFiltroCategoria(c)}
                style={{ background: filtroCategoria === c ? "#C9922A22" : "transparent", border: `1px solid ${filtroCategoria === c ? "#C9922A" : "#2A2A2A"}`, color: filtroCategoria === c ? "#C9922A" : "#777", fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 20, cursor: "pointer", textTransform: "capitalize" }}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {CATS.map(c => (
              <button key={c.key} onClick={() => abrirNuevo(c.key as "papel" | "plastico" | "carton")}
                style={{ background: `${c.color}18`, border: `1px solid ${c.color}44`, color: c.color, fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>
                {c.emoji} +{c.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px" }}>
          {loading && <div style={{ textAlign: "center", padding: "40px 0", color: "#444", fontSize: 13 }}>Cargando catálogo...</div>}

          {!loading && filtrados.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
              <div style={{ fontSize: 13 }}>{busq ? `Sin resultados para "${busq}"` : "Aún no hay productos en el catálogo expo"}</div>
            </div>
          )}

          {!loading && filtrados.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {filtrados.map(p => (
                <div key={`${p.categoria}:${p.id}:${p.idgrupo_papel ?? 0}`} style={{ background: "#1A1A1A", border: "1px solid #222", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>

                  <div style={{ width: "100%", height: 110, background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <span style={{ color: "#333", fontSize: 28 }}>📦</span>
                    )}
                  </div>

                  <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "#EEE", fontSize: 12.5, fontWeight: 700 }}>{p.nombre}</span>
                      <span style={{ background: "#2A2A2A", color: "#888", fontSize: 8.5, padding: "2px 6px", borderRadius: 4, textTransform: "capitalize", flexShrink: 0 }}>{p.categoria}</span>
                    </div>
                    {p.medida && <div style={{ color: "#666", fontSize: 10.5 }}>{p.medida}</div>}
                    <div style={{ display: "flex", gap: 10, fontSize: 10.5, color: "#C9922A", fontWeight: 700 }}>
                      {p.categoria === "plastico" ? (
                        <>
                          {p.precio500 && <span>{p.precio500}</span>}
                          {p.precio1000 && <span>{p.precio1000}</span>}
                          {p.precio3000 && <span>{p.precio3000}</span>}
                        </>
                      ) : (
                        p.precioBase && <span>Base: {p.precioBase}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button onClick={() => abrirEditar(p)}
                        style={{ flex: 1, background: "transparent", border: "1px solid #C9922A55", color: "#C9922A", fontSize: 10.5, fontWeight: 600, padding: "5px", borderRadius: 6, cursor: "pointer" }}>
                        ✎ Editar
                      </button>
                      <button onClick={() => eliminarProd(p.id, p.nombre)} disabled={eliminandoId === p.id}
                        style={{ flex: 1, background: "transparent", border: "1px solid #EF444433", color: "#EF4444", fontSize: 10.5, fontWeight: 600, padding: "5px", borderRadius: 6, cursor: "pointer", opacity: eliminandoId === p.id ? .5 : 1 }}>
                        {eliminandoId === p.id ? "..." : "🗑 Eliminar"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <ModalProducto
          editando={editando}
          catInicial={catInicial}
          onClose={() => { setModalOpen(false); setEditando(null); }}
          onGuardar={guardarProd}
          saving={saving}
          catalogs={catalogs}
          foils={foils}
          texturas={texturas}
          coloresAsa={coloresAsa}
        />
      )}
    </div>
  );
}