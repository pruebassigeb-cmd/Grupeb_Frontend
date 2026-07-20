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

const textoValor = (valor: unknown): string => {
  if (valor === true) return "Sí";
  if (valor === false) return "No";
  if (valor == null || valor === "") return "—";

  if (Array.isArray(valor)) {
    if (valor.length === 0) return "—";
    return valor
      .map(item => {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return String(
            obj.nombre ??
            obj.label ??
            obj.tipo ??
            obj.idcat_tipo_asa ??
            obj.idcat_laminado ??
            obj.id ??
            "—"
          );
        }
        return String(item);
      })
      .join(", ");
  }

  return String(valor);
};

function SeccionDetalle({
  titulo,
  icono,
  datos,
}: {
  titulo: string;
  icono: string;
  datos: Array<[string, unknown]>;
}) {
  return (
    <section
      style={{
        background: "#151515",
        border: "1px solid #252525",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "9px 11px",
          background: "#111",
          borderBottom: "1px solid #252525",
          color: "#C9922A",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {icono} {titulo}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 1,
          background: "#252525",
        }}
      >
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta} style={{ background: "#171717", padding: "9px 10px", minWidth: 0 }}>
            <div
              style={{
                color: "#666",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: .6,
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {etiqueta}
            </div>
            <div
              style={{
                color: textoValor(valor) === "—" ? "#444" : "#DDD",
                fontSize: 10.5,
                fontWeight: 600,
                overflowWrap: "anywhere",
              }}
            >
              {textoValor(valor)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModalDetalleProducto({
  producto,
  onClose,
  onEditar,
}: {
  producto: Producto;
  onClose: () => void;
  onEditar: (producto: Producto) => void;
}) {
  const esPlastico = producto.categoria === "plastico";
  const categoriaLabel =
    producto.categoria === "plastico"
      ? "Plástico"
      : producto.categoria === "carton"
        ? "Cartón"
        : "Papel";

  const acabadosDisponibles = [
    producto.laminacion && `Laminado${producto.tipoLaminado ? `: ${producto.tipoLaminado}` : ""}`,
    producto.hs && `Hot stamping / foil${producto.tipoHs ? `: ${producto.tipoHs}` : ""}`,
    producto.ar && "Alto relieve",
    producto.textura && `Textura${producto.tipoTextura ? `: ${producto.tipoTextura}` : ""}`,
    producto.uv && "UV",
    producto.asa && `Asa / suaje${producto.tipoAsa ? `: ${producto.tipoAsa}` : ""}`,
    producto.pigmento && `Pigmento: ${producto.pigmento}`,
  ].filter(Boolean) as string[];

  const laminadosPermitidos = (producto.laminadosPermitidos || [])
    .map(item => item.nombre)
    .filter(Boolean);

  const asasPermitidas = (producto.asasPermitidas || [])
    .map(item => item.nombre)
    .filter(Boolean);

  const chipsAcabados = [
    ...acabadosDisponibles,
    ...laminadosPermitidos.map(nombre => `Laminado disponible: ${nombre}`),
    ...asasPermitidas.map(nombre => `Asa disponible: ${nombre}`),
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 380,
        background: "rgba(0,0,0,.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(1180px, 97vw)",
          maxHeight: "94vh",
          background: "#101010",
          border: "1px solid #303030",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 30px 90px rgba(0,0,0,.9)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "13px 16px",
            background: "#0B0B0B",
            borderBottom: "2px solid #C9922A",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: "#FFF", fontSize: 16, fontWeight: 800 }}>
                {producto.nombre}
              </span>
              <span
                style={{
                  background: "#262626",
                  color: "#AAA",
                  borderRadius: 5,
                  padding: "2px 7px",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {categoriaLabel}
              </span>
              <span
                style={{
                  background: "#C9922A18",
                  color: "#C9922A",
                  border: "1px solid #C9922A44",
                  borderRadius: 5,
                  padding: "2px 7px",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                ⭐ Expo
              </span>
            </div>
            <div style={{ color: "#555", fontSize: 9.5, marginTop: 3 }}>
              Vista rápida del producto
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#AAA",
              borderRadius: 7,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            ✕ Cerrar
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(360px, 1.35fr) minmax(320px, .9fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div
              style={{
                background: "#090909",
                border: "1px solid #252525",
                borderRadius: 12,
                overflow: "hidden",
                minHeight: 620,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#080808",
                  padding: 14,
                }}
              >
                {producto.imagen ? (
                  <img
                    src={producto.imagen}
                    alt={producto.nombre}
                    style={{
                      width: "100%",
                      height: "100%",
                      maxHeight: 610,
                      objectFit: "contain",
                      borderRadius: 8,
                    }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span style={{ fontSize: 82, opacity: .45 }}>
                    {producto.categoria === "papel" ? "📄" : producto.categoria === "plastico" ? "🧴" : "📦"}
                  </span>
                )}
              </div>

              <div style={{ padding: 14, borderTop: "1px solid #222" }}>
                <div style={{ color: "#FFF", fontSize: 16, fontWeight: 800 }}>
                  {producto.nombre}
                </div>
                <div style={{ color: "#777", fontSize: 11, marginTop: 5 }}>
                  {[producto.medida, producto.material, producto.calibre]
                    .filter(Boolean)
                    .join(" · ") || "Sin descripción corta"}
                </div>
                <button
                  onClick={() => onEditar(producto)}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    background: "#C9922A18",
                    color: "#C9922A",
                    border: "1px solid #C9922A66",
                    borderRadius: 8,
                    padding: "9px 10px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  ✎ Editar producto
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SeccionDetalle
                titulo="Precios de referencia"
                icono="💰"
                datos={[
                  ["Base unitario", producto.precioBase],
                  ["Unitario Expo", esPlastico ? producto.precio500 : "No aplica"],
                  ["Referencia 500 piezas", producto.precioReferencia500],
                  ["Referencia 1,000 piezas", producto.precioReferencia1000],
                ]}
              />

              <SeccionDetalle
                titulo="Medidas, material y tamaño"
                icono="📐"
                datos={[
                  ["Medida", producto.medida],
                  ["Tamaño", producto.tamanoProd],
                  ["Material", producto.material],
                  ["Tipo de papel", producto.tipoPapel],
                  ["Calibre", producto.calibre],
                  ["Ancho", producto.ancho],
                  ["Altura", producto.altura],
                  ["Fuelle", producto.fuelle],
                  ["Fuelle fondo", producto.fuelFondo],
                  ["Fuelle lateral", producto.fuelLateral],
                  ["Refuerzo", producto.refuerzo],
                ]}
              />

              <section
                style={{
                  background: "#151515",
                  border: "1px solid #252525",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "9px 11px",
                    background: "#111",
                    borderBottom: "1px solid #252525",
                    color: "#C9922A",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  ✨ Acabados disponibles
                </div>

                <div style={{ padding: 11 }}>
                  {chipsAcabados.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {chipsAcabados.map((acabado, index) => (
                        <span
                          key={`${acabado}-${index}`}
                          style={{
                            background: "#C9922A12",
                            color: "#D9B36B",
                            border: "1px solid #C9922A44",
                            borderRadius: 999,
                            padding: "5px 9px",
                            fontSize: 9.5,
                            fontWeight: 700,
                          }}
                        >
                          {acabado}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#555", fontSize: 10.5, fontStyle: "italic" }}>
                      Sin acabados disponibles registrados
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 11,
                      paddingTop: 10,
                      borderTop: "1px solid #242424",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ color: "#666", fontSize: 8, textTransform: "uppercase" }}>
                        Tintas frente
                      </div>
                      <div style={{ color: "#DDD", fontSize: 11, fontWeight: 700, marginTop: 3 }}>
                        {textoValor(producto.tintasFrenteDefault)}
                      </div>
                    </div>

                    {producto.categoria !== "plastico" && (
                      <div>
                        <div style={{ color: "#666", fontSize: 8, textTransform: "uppercase" }}>
                          Tintas interiores
                        </div>
                        <div style={{ color: "#DDD", fontSize: 11, fontWeight: 700, marginTop: 3 }}>
                          {textoValor(producto.tintasDentroDefault)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModalCatalogoExpo({ onClose }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busq, setBusq] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<"todas" | "papel" | "plastico" | "carton">("todas");
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [detalleProducto, setDetalleProducto] = useState<Producto | null>(null);

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
  // precio_500 conserva su uso actual como precio unitario Expo de
  // plástico. precio_1000 y precio_3000 almacenan referencias totales
  // de 500 y 1,000 piezas para cualquier producto Expo; son informativas
  // y nunca se usan como precios de la cotización.
  precio_500: esPlastico
    ? (parseFloat((p.precio500 || "").replace(/[^0-9.]/g, "")) || null)
    : null,
  precio_1000:
    parseFloat((p.precioReferencia500 || "").replace(/[^0-9.]/g, "")) || null,
  precio_3000:
    parseFloat((p.precioReferencia1000 || "").replace(/[^0-9.]/g, "")) || null,

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
                <div
                  key={`${p.categoria}:${p.id}:${p.idgrupo_papel ?? 0}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetalleProducto(p)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetalleProducto(p);
                    }
                  }}
                  style={{
                    background: "#1A1A1A",
                    border: "1px solid #222",
                    borderRadius: 10,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "border-color .18s, transform .18s",
                  }}
                >

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
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {p.categoria === "plastico" && p.precio500 && (
                        <div style={{ background:"#111", border:"1px solid #2A2A2A", borderRadius:6, padding:"4px 7px" }}>
                          <div style={{ color:"#666", fontSize:7.5, textTransform:"uppercase" }}>Unitario Expo</div>
                          <div style={{ color:"#C9922A", fontSize:10.5, fontWeight:700 }}>{p.precio500}</div>
                        </div>
                      )}

                      {p.categoria !== "plastico" && p.precioBase && (
                        <div style={{ background:"#111", border:"1px solid #2A2A2A", borderRadius:6, padding:"4px 7px" }}>
                          <div style={{ color:"#666", fontSize:7.5, textTransform:"uppercase" }}>Base unitario</div>
                          <div style={{ color:"#C9922A", fontSize:10.5, fontWeight:700 }}>{p.precioBase}</div>
                        </div>
                      )}

                      {p.precioReferencia500 && (
                        <div style={{ background:"#111", border:"1px solid #2A2A2A", borderRadius:6, padding:"4px 7px" }}>
                          <div style={{ color:"#666", fontSize:7.5, textTransform:"uppercase" }}>Ref. 500 pzas</div>
                          <div style={{ color:"#C9922A", fontSize:10.5, fontWeight:700 }}>{p.precioReferencia500}</div>
                        </div>
                      )}

                      {p.precioReferencia1000 && (
                        <div style={{ background:"#111", border:"1px solid #2A2A2A", borderRadius:6, padding:"4px 7px" }}>
                          <div style={{ color:"#666", fontSize:7.5, textTransform:"uppercase" }}>Ref. 1,000 pzas</div>
                          <div style={{ color:"#C9922A", fontSize:10.5, fontWeight:700 }}>{p.precioReferencia1000}</div>
                        </div>
                      )}

                      {!p.precioReferencia500 && !p.precioReferencia1000 && (
                        <span style={{ color:"#555", fontSize:9.5, fontStyle:"italic" }}>
                          Sin precios de referencia
                        </span>
                      )}
                    </div>
                    <div style={{ color:"#555", fontSize:9, marginTop:2 }}>
                      Toca o haz clic para ver la ficha completa
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button onClick={e => { e.stopPropagation(); abrirEditar(p); }}
                        style={{ flex: 1, background: "transparent", border: "1px solid #C9922A55", color: "#C9922A", fontSize: 10.5, fontWeight: 600, padding: "5px", borderRadius: 6, cursor: "pointer" }}>
                        ✎ Editar
                      </button>
                      <button onClick={e => { e.stopPropagation(); eliminarProd(p.id, p.nombre); }} disabled={eliminandoId === p.id}
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

      {detalleProducto && (
        <ModalDetalleProducto
          producto={detalleProducto}
          onClose={() => setDetalleProducto(null)}
          onEditar={producto => {
            setDetalleProducto(null);
            abrirEditar(producto);
          }}
        />
      )}

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