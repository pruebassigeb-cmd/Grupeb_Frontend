// src/components/papel/FormularioProductoPapel.tsx
import { useState, useEffect } from "react";
import ComboboxInsumo from "../ComboboxInsumo";
import {
  getProductosPapel,
  getProductoPapelDetalle,
  mapearOpciones,
  getFoils,
  getTexturas,
} from "../../services/papel/papelCotizacionService";
import type {
  ProductoPapelBusqueda,
  GrupoOpcion,
  AsaOpcion,
  LaminadoOpcion,
  FoilOpcion,
  TexturaOpcion,
  MaquinariaProducto,
  ProductoPapelCotizacion,
} from "../../types/papel/cotizacion-papel.types";

// Re-export para no romper imports existentes (FormularioSolicitud importa de aquí)
export type { ProductoPapelCotizacion };

// Etiquetas legibles para la maquinaria del producto (solo display)
const MAQ_LABELS: Record<string, string> = {
  hojeado_guillotina: "Hojeado / Guillotina",
  impresora: "Impresora",
  hs_ar: "HS / AR",
  suaje_maquina: "Suaje",
  uv: "UV",
  textura: "Textura",
  empalme: "Empalme",
  armado: "Armado",
  asas_maquina: "Asas",
  desbarbe: "Desbarbe",
};

interface Props {
  modo: "cotizacion" | "pedido";
  onAgregar: (producto: ProductoPapelCotizacion) => void;
  productoEditando?: ProductoPapelCotizacion | null;
  onCancelarEdicion?: () => void;
  tintas?: { id: number; cantidad: number }[];
  caras?: { id: number; cantidad: number }[];
  idTipoPanton?: number | null;
  onRegistrarPanton?: (nombre: string, indice: number) => void;
}

const nuevoSpecs = () => ({
  idgrupo_papel: null as number | null,
  grupo_descripcion: "",
  precio_sugerido: null as number | null,
  tintasId: null as number | null,
  tintas: 0,
  pantones: "",
  tintasDentroId: null as number | null,
  tintasDentro: 0,
  pantonesDentro: "",
  carasId: null as number | null,
  caras: 0,
  id_asa: null as number | null,
  idcat_laminado: null as number | null,
  idfoil: null as number | null,
  idcat_textura: null as number | null,
  uv: false,
  alto_relieve: false,
  observacion: "",
  descripcion: null as string | null,
  cantidades: [0, 0, 0] as [number, number, number],
  precios: [0, 0, 0] as [number, number, number],
});

export default function FormularioProductoPapel({
  modo, onAgregar, productoEditando, onCancelarEdicion,
  tintas = [], caras = [], idTipoPanton = null, onRegistrarPanton,
}: Props) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<ProductoPapelBusqueda[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  const [productoSel, setProductoSel] = useState<ProductoPapelBusqueda | null>(null);
  const [grupos, setGrupos] = useState<GrupoOpcion[]>([]);
  const [asas, setAsas] = useState<AsaOpcion[]>([]);
  const [laminados, setLaminados] = useState<LaminadoOpcion[]>([]);
  const [maquinaria, setMaquinaria] = useState<MaquinariaProducto>({});

  const [foils, setFoils] = useState<FoilOpcion[]>([]);
  const [texturas, setTexturas] = useState<TexturaOpcion[]>([]);

  const [specs, setSpecs] = useState(nuevoSpecs());
  const [inputsPantones, setInputsPantones] = useState<string[]>([]);
  const [usaTintasDentro, setUsaTintasDentro] = useState(false);
  const [inputsPantonesDentro, setInputsPantonesDentro] = useState<string[]>([]);
  const [cantidadesTexto, setCantidadesTexto] = useState<[string, string, string]>(["", "", ""]);
  const [preciosTexto, setPreciosTexto] = useState<[string, string, string]>(["", "", ""]);
  const [modoProductoPapel, setModoProductoPapel] =
    useState<"registrado" | "nuevo">("registrado");

  const indices = modo === "pedido" ? [0] : [0, 1, 2];

  useEffect(() => {
    (async () => {
      try {
        const [f, t] = await Promise.all([getFoils().catch(() => []), getTexturas().catch(() => [])]);
        setFoils(Array.isArray(f) ? f : []);
        setTexturas(Array.isArray(t) ? t : []);
      } catch { setFoils([]); setTexturas([]); }
    })();
  }, []);

  useEffect(() => {
    setInputsPantones(prev => Array(specs.tintas).fill("").map((_, i) => prev[i] || ""));
  }, [specs.tintas]);

  useEffect(() => {
    setInputsPantonesDentro(prev => Array(specs.tintasDentro).fill("").map((_, i) => prev[i] || ""));
  }, [specs.tintasDentro]);

  useEffect(() => {
    if (!productoEditando) return;
    setProductoSel({
      idproducto_papel: productoEditando.idproducto_papel,
      tipo_producto: productoEditando.nombre,
      descripcion_papel: productoEditando.descripcion_papel,
      medida: productoEditando.medida,
    });
    setSpecs({
      idgrupo_papel: productoEditando.idgrupo_papel,
      grupo_descripcion: productoEditando.grupo_descripcion,
      precio_sugerido: productoEditando.precio_sugerido,
      tintasId: productoEditando.tintasId,
      tintas: productoEditando.tintas,
      pantones: productoEditando.pantones,
      tintasDentroId: productoEditando.tintasDentroId,
      tintasDentro: productoEditando.tintasDentro,
      pantonesDentro: productoEditando.pantonesDentro,
      carasId: productoEditando.carasId,
      caras: productoEditando.caras,
      id_asa: productoEditando.id_asa,
      idcat_laminado: productoEditando.idcat_laminado,
      idfoil: productoEditando.idfoil,
      idcat_textura: productoEditando.idcat_textura,
      uv: productoEditando.uv,
      alto_relieve: productoEditando.alto_relieve,
      observacion: productoEditando.observacion,
      descripcion: productoEditando.descripcion,
      cantidades: productoEditando.cantidades,
      precios: productoEditando.precios,
    });
    setInputsPantones(productoEditando.pantones ? productoEditando.pantones.split(", ").map(s => s.trim()) : []);
    setUsaTintasDentro(!!productoEditando.tintasDentroId);
    setInputsPantonesDentro(productoEditando.pantonesDentro ? productoEditando.pantonesDentro.split(", ").map(s => s.trim()) : []);
    setCantidadesTexto([
      productoEditando.cantidades[0] > 0 ? String(productoEditando.cantidades[0]) : "",
      productoEditando.cantidades[1] > 0 ? String(productoEditando.cantidades[1]) : "",
      productoEditando.cantidades[2] > 0 ? String(productoEditando.cantidades[2]) : "",
    ]);
    setPreciosTexto([
      productoEditando.precios[0] > 0 ? productoEditando.precios[0].toFixed(4) : "",
      productoEditando.precios[1] > 0 ? productoEditando.precios[1].toFixed(4) : "",
      productoEditando.precios[2] > 0 ? productoEditando.precios[2].toFixed(4) : "",
    ]);
    cargarDetalleProducto(productoEditando.idproducto_papel);
  }, [productoEditando]);

  const cargarProductos = async (q = "") => {
    setLoadingProductos(true);
    try { setProductos(await getProductosPapel(q)); }
    catch { setProductos([]); }
    finally { setLoadingProductos(false); }
  };

  useEffect(() => {
    if (!mostrarModal) return;
    const t = setTimeout(() => cargarProductos(busqueda), 400);
    return () => clearTimeout(t);
  }, [busqueda, mostrarModal]);

  useEffect(() => {
    if (mostrarModal && productos.length === 0) cargarProductos();
  }, [mostrarModal]);

  const cargarDetalleProducto = async (id: number): Promise<GrupoOpcion[]> => {
    try {
      const det = await getProductoPapelDetalle(id);
      const { grupos: g, asas: a, laminados: l } = mapearOpciones(det);
      setGrupos(g); setAsas(a); setLaminados(l);
      setMaquinaria(det.maquinaria ?? {});
      return g;
    } catch {
      setGrupos([]); setAsas([]); setLaminados([]); setMaquinaria({});
      return [];
    }
  };

  const aplicarSugerido = (precio: number | null) => {
    if (precio == null) return;
    setPreciosTexto(prev => {
      const t = [...prev] as [string, string, string];
      indices.forEach(i => { t[i] = precio.toFixed(4); });
      return t;
    });
    setSpecs(prev => {
      const p = [...prev.precios] as [number, number, number];
      indices.forEach(i => { p[i] = precio; });
      return { ...prev, precios: p };
    });
  };

  const seleccionarProducto = async (p: ProductoPapelBusqueda) => {
    setProductoSel(p);
    setMostrarModal(false);
    setBusqueda("");
    setSpecs(nuevoSpecs());
    setInputsPantones([]);
    setUsaTintasDentro(false);
    setInputsPantonesDentro([]);
    setCantidadesTexto(["", "", ""]);
    setPreciosTexto(["", "", ""]);

    const gruposParsed = await cargarDetalleProducto(p.idproducto_papel);
    if (gruposParsed.length > 0) {
      const g = gruposParsed[0];
      setSpecs(prev => ({ ...prev, idgrupo_papel: g.idgrupo_papel, grupo_descripcion: g.etiqueta, precio_sugerido: g.precio_sugerido }));
      aplicarSugerido(g.precio_sugerido);
    }
  };

  const handleGrupo = (idStr: string) => {
    const g = grupos.find(x => x.idgrupo_papel === Number(idStr));
    if (!g) return;
    setSpecs(prev => ({ ...prev, idgrupo_papel: g.idgrupo_papel, grupo_descripcion: g.etiqueta, precio_sugerido: g.precio_sugerido }));
    aplicarSugerido(g.precio_sugerido);
  };

  const handleTintas = (idStr: string) => {
    const t = tintas.find(x => x.id === Number(idStr));
    setSpecs(prev => ({ ...prev, tintasId: t?.id ?? null, tintas: t?.cantidad ?? 0 }));
  };
  const handleTintasDentro = (idStr: string) => {
    const t = tintas.find(x => x.id === Number(idStr));
    setSpecs(prev => ({ ...prev, tintasDentroId: t?.id ?? null, tintasDentro: t?.cantidad ?? 0 }));
  };
  const handleCaras = (idStr: string) => {
    const c = caras.find(x => x.id === Number(idStr));
    setSpecs(prev => ({ ...prev, carasId: c?.id ?? null, caras: c?.cantidad ?? 0 }));
  };

  const handlePantone = (i: number, val: string) => {
    const nuevos = [...inputsPantones]; nuevos[i] = val;
    setInputsPantones(nuevos);
    setSpecs(prev => ({ ...prev, pantones: nuevos.join(", ").replace(/^[\s,]+|[\s,]+$/g, "") }));
  };
  const handlePantoneDentro = (i: number, val: string) => {
    const nuevos = [...inputsPantonesDentro]; nuevos[i] = val;
    setInputsPantonesDentro(nuevos);
    setSpecs(prev => ({ ...prev, pantonesDentro: nuevos.join(", ").replace(/^[\s,]+|[\s,]+$/g, "") }));
  };

  const handleCantidad = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const t = [...cantidadesTexto] as [string, string, string];
    t[i] = v; setCantidadesTexto(t);
    const c = [...specs.cantidades] as [number, number, number];
    c[i] = v === "" ? 0 : parseInt(v);
    setSpecs(prev => ({ ...prev, cantidades: c }));
  };

  const handlePrecio = (i: number, v: string) => {
    if (!/^\d*\.?\d{0,4}$/.test(v)) return;
    const t = [...preciosTexto] as [string, string, string];
    t[i] = v; setPreciosTexto(t);
    const p = [...specs.precios] as [number, number, number];
    p[i] = v === "" ? 0 : parseFloat(v);
    setSpecs(prev => ({ ...prev, precios: p }));
  };

  const handlePrecioBlur = (i: number) => {
    const v = parseFloat(preciosTexto[i]);
    const t = [...preciosTexto] as [string, string, string];
    t[i] = isNaN(v) ? "" : v.toFixed(4);
    setPreciosTexto(t);
  };

  const handleAgregar = () => {
    if (!productoSel) return;
    const tieneValido = indices.some(i => specs.cantidades[i] > 0 && specs.precios[i] > 0);
    if (!tieneValido) { alert("Ingresa al menos una cantidad y precio válidos"); return; }

    const asaSel = asas.find(a => a.idcat_tipo_asa === specs.id_asa);
    const lamSel = laminados.find(l => l.idcat_laminado === specs.idcat_laminado);
    const foilSel = foils.find(f => f.idfoil === specs.idfoil);
    const texSel = texturas.find(t => t.idcat_textura === specs.idcat_textura);

    const producto: ProductoPapelCotizacion = {
      tipoCotizacion: "papel",
      idproducto_papel: productoSel.idproducto_papel,
      nombre: productoSel.tipo_producto,
      descripcion_papel: productoSel.descripcion_papel,
      medida: productoSel.medida,
      idgrupo_papel: specs.idgrupo_papel,
      grupo_descripcion: specs.grupo_descripcion,
      precio_sugerido: specs.precio_sugerido,
      tintasId: specs.tintasId,
      tintas: specs.tintas,
      pantones: specs.pantones,
      tintasDentroId: specs.tintasDentroId,
      tintasDentro: specs.tintasDentro,
      pantonesDentro: specs.pantonesDentro,
      carasId: specs.carasId,
      caras: specs.caras,
      id_asa: specs.id_asa, asa_nombre: asaSel?.nombre ?? null,
      idcat_laminado: specs.idcat_laminado, laminado_nombre: lamSel?.nombre ?? null,
      idfoil: specs.idfoil, foil_nombre: foilSel ? `${foilSel.colorfoil}${foilSel.codigofoil ? " " + foilSel.codigofoil : ""}` : null,
      idcat_textura: specs.idcat_textura, textura_nombre: texSel?.nombre ?? null,
      uv: specs.uv,
      alto_relieve: specs.alto_relieve,
      observacion: specs.observacion,
      descripcion: specs.descripcion,
      cantidades: specs.cantidades,
      precios: specs.precios,
    };

    onAgregar(producto);

    setProductoSel(null);
    setGrupos([]); setAsas([]); setLaminados([]); setMaquinaria({});
    setSpecs(nuevoSpecs());
    setInputsPantones([]);
    setUsaTintasDentro(false);
    setInputsPantonesDentro([]);
    setCantidadesTexto(["", "", ""]);
    setPreciosTexto(["", "", ""]);
  };

  const hayProducto = !!productoSel;
  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400";
  const selectCls = inputCls + " cursor-pointer";
  const checkCls = "w-4 h-4 rounded border-gray-400 text-amber-600 focus:ring-amber-400 cursor-pointer";
  const hayMaquinaria = Object.values(maquinaria).some(arr => arr && arr.length > 0);

  // Celdas de pantone — una por fila (full width) para que el buscador respire
  const celdasPantone = (lista: string[], onChange: (i: number, v: string) => void) => (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
      {lista.map((valor, i) => (
        <div key={i} className="flex items-center gap-2 w-full">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <ComboboxInsumo
              tipoId={idTipoPanton}
              placeholder={`Tinta ${i + 1}...`}
              value={valor}
              onChange={(val: string) => onChange(i, val)}
              onSeleccionar={(item: any) => onChange(i, item.codigo ? `${item.nombre} (${item.codigo})` : item.nombre)}
              onRegistrarNuevo={(nombre: string) => onRegistrarPanton?.(nombre, i)}
            />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* ── Modal búsqueda ── */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Buscar Producto de Papel</h3>
                <button onClick={() => { setMostrarModal(false); setBusqueda(""); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="relative">
                <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por tipo, medida, descripción o material..."
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-amber-400" autoFocus />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            <div className="overflow-y-auto max-h-96">
              {loadingProductos ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent" />
                  <p className="mt-3 text-gray-500 text-sm">Cargando...</p>
                </div>
              ) : productos.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {productos.map(p => (
                    <div key={p.idproducto_papel} onClick={() => seleccionarProducto(p)} className="p-4 hover:bg-amber-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{p.tipo_producto}</span>
                        {p.descripcion_papel && <span className="text-xs text-gray-500">— {p.descripcion_papel}</span>}
                        <span className="ml-auto text-xs text-gray-400">#{p.idproducto_papel}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
                        {p.medida && <span>Medida: {p.medida}</span>}
                        {p.primer_tipo_papel && <span>Material: {p.primer_tipo_papel}</span>}
                        {p.primer_calibre && <span>Calibre: {p.primer_calibre}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">No se encontraron productos</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Banner edición ── */}
      {productoEditando && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-amber-600">✏️</span>
            <span className="text-sm font-semibold text-amber-800">Editando: {productoEditando.nombre}</span>
          </div>
          <button type="button" onClick={onCancelarEdicion} className="text-xs text-amber-500 hover:text-amber-700 underline">Cancelar edición</button>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setModoProductoPapel("registrado")}
          className={`px-3 py-2 rounded-lg ${modoProductoPapel === "registrado"
              ? "bg-amber-500 text-white"
              : "bg-gray-100"
            }`}
        >
          Existente
        </button>

        <button
          type="button"
          onClick={() => setModoProductoPapel("nuevo")}
          className={`px-3 py-2 rounded-lg ${modoProductoPapel === "nuevo"
              ? "bg-green-500 text-white"
              : "bg-gray-100"
            }`}
        >
          Nuevo
        </button>
      </div>

      {/* ── Selector de producto ── */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Producto de Papel</label>
        <button type="button" onClick={() => {
          if (modoProductoPapel === "registrado") {
            setMostrarModal(true);
          } else {
            // abrir modal de alta de producto papel
          }
        }}
          className="w-full px-4 py-3 border-2 border-dashed border-amber-300 rounded-lg text-gray-600 hover:border-amber-500 hover:text-amber-700 flex items-center justify-center gap-2 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {productoSel ? "Cambiar producto" : "Click para buscar producto de papel"}
        </button>
        {productoSel && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{productoSel.tipo_producto}</p>
                {productoSel.descripcion_papel && <p className="text-xs text-gray-500 mt-0.5">{productoSel.descripcion_papel}</p>}
                {productoSel.medida && <p className="text-xs text-gray-600 mt-1">Medida: {productoSel.medida}</p>}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">#{productoSel.idproducto_papel}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Specs ── */}
      {hayProducto && (
        <div className="space-y-4 border-t border-gray-200 pt-4">

          {/* Opción / grupo de materiales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de papel / Opción <span className="text-xs text-gray-400 font-normal">(materiales registrados)</span>
            </label>
            {grupos.length > 0 ? (
              <select value={specs.idgrupo_papel ?? ""} onChange={e => handleGrupo(e.target.value)} className={selectCls}>
                {grupos.map(g => (
                  <option key={g.idgrupo_papel} value={g.idgrupo_papel}>
                    {g.etiqueta}{g.precio_sugerido != null ? `  —  $${g.precio_sugerido.toFixed(2)}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-gray-400 italic">Este producto no tiene opciones de material registradas.</p>
            )}
            {specs.precio_sugerido != null && (
              <p className="text-xs text-amber-600 mt-1">💡 Precio sugerido aplicado: <strong>${specs.precio_sugerido.toFixed(2)}</strong> (puedes editarlo abajo)</p>
            )}
          </div>

          {/* Maquinaria del producto (solo informativo) */}
          {hayMaquinaria && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                🛠️ Maquinaria del producto <span className="text-xs text-gray-400 font-normal">(registrada previamente)</span>
              </p>
              <div className="space-y-1.5">
                {Object.entries(MAQ_LABELS).map(([key, label]) => {
                  const items = maquinaria[key] ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={key} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-500 w-36 flex-shrink-0">{label}:</span>
                      {items.map(it => (
                        <span key={it.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white border border-gray-300 text-gray-700">{it.nombre}</span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cantidades y precios */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {modo === "pedido" ? "Cantidad (piezas)" : "Cantidades (piezas — hasta 3 opciones)"}
            </label>
            <div className={`grid gap-3 ${modo === "pedido" ? "grid-cols-1 max-w-xs" : "grid-cols-3"}`}>
              {indices.map(i => (
                <div key={i} className="space-y-1">
                  {modo === "cotizacion" && <span className="text-xs text-gray-400">Opción {i + 1}</span>}
                  <input type="text" inputMode="numeric" value={cantidadesTexto[i]}
                    onChange={e => handleCantidad(i, e.target.value)}
                    placeholder={modo === "pedido" ? "Piezas" : `Piezas ${i + 1}`} className={inputCls} />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="text" inputMode="decimal" value={preciosTexto[i]}
                      onChange={e => handlePrecio(i, e.target.value)} onBlur={() => handlePrecioBlur(i)}
                      placeholder="Precio c/u" className={`${inputCls} pl-6`} />
                  </div>
                  {specs.cantidades[i] > 0 && specs.precios[i] > 0 && (
                    <p className="text-xs text-gray-400">
                      Total: ${(specs.cantidades[i] * specs.precios[i]).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tintas y Caras */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tintas</label>
              <select value={specs.tintasId ?? ""} onChange={e => handleTintas(e.target.value)} className={selectCls}>
                <option value="" disabled>Selecciona...</option>
                {tintas.map(t => <option key={t.id} value={t.id}>{t.cantidad} tinta{t.cantidad > 1 ? "s" : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caras</label>
              <select value={specs.carasId ?? ""} onChange={e => handleCaras(e.target.value)} className={selectCls}>
                <option value="" disabled>Selecciona...</option>
                {caras.map(c => <option key={c.id} value={c.id}>{c.cantidad} cara{c.cantidad > 1 ? "s" : ""}</option>)}
              </select>
            </div>
          </div>

          {/* Pantones exteriores */}
          {specs.tintas > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pantones <span className="text-xs text-gray-400 font-normal">({specs.tintas} tinta{specs.tintas > 1 ? "s" : ""})</span>
              </label>
              {celdasPantone(inputsPantones, handlePantone)}
              {specs.pantones && <p className="text-xs text-purple-500 mt-1">Guardado: <span className="font-medium">{specs.pantones}</span></p>}
            </div>
          )}

          {/* Tintas por dentro */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={usaTintasDentro}
                onChange={e => {
                  setUsaTintasDentro(e.target.checked);
                  if (!e.target.checked) {
                    setSpecs(prev => ({ ...prev, tintasDentroId: null, tintasDentro: 0, pantonesDentro: "" }));
                    setInputsPantonesDentro([]);
                  }
                }} className={checkCls} />
              <span className="text-sm font-medium text-gray-700">¿Tintas por dentro?</span>
            </label>

            {usaTintasDentro && (
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-amber-200">
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tintas (interior)</label>
                  <select value={specs.tintasDentroId ?? ""} onChange={e => handleTintasDentro(e.target.value)} className={selectCls}>
                    <option value="" disabled>Selecciona...</option>
                    {tintas.map(t => <option key={t.id} value={t.id}>{t.cantidad} tinta{t.cantidad > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
                {specs.tintasDentro > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pantones interior <span className="text-xs text-gray-400 font-normal">({specs.tintasDentro})</span>
                    </label>
                    {celdasPantone(inputsPantonesDentro, handlePantoneDentro)}
                    {specs.pantonesDentro && <p className="text-xs text-purple-500 mt-1">Guardado: <span className="font-medium">{specs.pantonesDentro}</span></p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Asa y Laminado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asa <span className="text-xs text-gray-400 font-normal">(opcional)</span></label>
              <select value={specs.id_asa ?? ""} onChange={e => setSpecs(prev => ({ ...prev, id_asa: e.target.value ? Number(e.target.value) : null }))}
                className={selectCls} disabled={asas.length === 0}>
                <option value="">{asas.length === 0 ? "Sin asas en el producto" : "Sin asa"}</option>
                {asas.map(a => <option key={a.idcat_tipo_asa} value={a.idcat_tipo_asa}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Laminado <span className="text-xs text-gray-400 font-normal">(opcional)</span></label>
              <select value={specs.idcat_laminado ?? ""} onChange={e => setSpecs(prev => ({ ...prev, idcat_laminado: e.target.value ? Number(e.target.value) : null }))}
                className={selectCls} disabled={laminados.length === 0}>
                <option value="">{laminados.length === 0 ? "Sin laminados en el producto" : "Sin laminado"}</option>
                {laminados.map(l => <option key={l.idcat_laminado} value={l.idcat_laminado}>{l.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Foil y Texturizado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foil <span className="text-xs text-gray-400 font-normal">(opcional)</span></label>
              <select value={specs.idfoil ?? ""} onChange={e => setSpecs(prev => ({ ...prev, idfoil: e.target.value ? Number(e.target.value) : null }))} className={selectCls}>
                <option value="">Sin foil</option>
                {foils.map(f => <option key={f.idfoil} value={f.idfoil}>{f.colorfoil}{f.codigofoil ? ` ${f.codigofoil}` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texturizado <span className="text-xs text-gray-400 font-normal">(opcional)</span></label>
              <select value={specs.idcat_textura ?? ""} onChange={e => setSpecs(prev => ({ ...prev, idcat_textura: e.target.value ? Number(e.target.value) : null }))} className={selectCls}>
                <option value="">Sin textura</option>
                {texturas.map(t => <option key={t.idcat_textura} value={t.idcat_textura}>{t.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* UV y Alto relieve */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Acabados especiales</label>
            <div className="grid grid-cols-2 gap-3">
              {([["uv", "🔆 UV"], ["alto_relieve", "🔳 Alto relieve"]] as [keyof typeof specs, string][]).map(([key, label]) => (
                <label key={key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-colors ${specs[key] ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200 hover:bg-gray-100"}`}>
                  <input type="checkbox" checked={!!specs[key]}
                    onChange={e => setSpecs(prev => ({ ...prev, [key]: e.target.checked }))} className={checkCls} />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span className="text-xs text-gray-400 font-normal">(opcional — ej: 1er Grado, Talla M...)</span>
            </label>
            <input type="text" value={specs.descripcion ?? ""}
              onChange={e => setSpecs(prev => ({ ...prev, descripcion: e.target.value || null }))}
              placeholder="Identificador del producto" className={inputCls} maxLength={150} />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones <span className="text-xs text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea value={specs.observacion}
              onChange={e => setSpecs(prev => ({ ...prev, observacion: e.target.value }))}
              rows={2} placeholder="Detalles adicionales del producto..." className={`${inputCls} resize-none`} />
          </div>

          {/* Botón agregar */}
          <button type="button" onClick={handleAgregar}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${productoEditando ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"}`}>
            {productoEditando ? "💾 Guardar cambios" : "+ Agregar Producto de Papel"}
          </button>
        </div>
      )}
    </div>
  );
}