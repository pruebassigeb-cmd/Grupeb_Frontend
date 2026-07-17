// src/pages/EditarPedidoPapel.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Dashboard from "../layouts/Sidebar";
import { getPedidos, actualizarPedido } from "../services/pedidosService";
import type {
  ProductoPapelActualizar,
  ProductoNuevoPapel,
} from "../services/pedidosService";
import type { Pedido } from "../types/cotizaciones.types";
import {
  getProductosPapel,
  getOpcionesProductoPapel,
  getFoils,
  getTexturas,
  getColoresAsa,
} from "../services/papel/papelCotizacionService";
import type {
  ProductoPapelBusqueda,
  GrupoOpcion,
  AsaOpcion,
  LaminadoOpcion,
  FoilOpcion,
  TexturaOpcion,
} from "../types/papel/cotizacion-papel.types";
import { getTiposInsumo } from "../services/proveedoresService";
import type { Insumo } from "../services/proveedoresService";
import ComboboxInsumo from "../components/ComboboxInsumo";
import ModalRegistrarInsumo from "../components/ModalRegistrarInsumo";
import FormularioProductoPapelAlta, {
  subirArchivoPendiente,
} from "../components/papel/FormularioProductoPapelAlta";
import type { ArchivoPendiente } from "../components/papel/FormularioProductoPapelAlta";
import type { ProductoPapelForm } from "../types/papel/papel.types";
import { crearProductoPapel } from "../services/papel/papel.service";
import ModalMaquinariaPedidoPapel from "../components/papel/ModalMaquinariaPedidoPapel";
import type { MaquinariaProductoPedidoPapel } from "../types/papel/maquinaria-pedido.types";
import api from "../services/api";
import { coincideBusquedaProductoPapel } from "../utils/papel/buscarProductoPapel";

// ─── Tipos internos ───────────────────────────────────────────────────────────
interface DetalleEdit {
  iddetalle: number | null;
  cantidad: string;
  precio_unitario: string;
  precio_total: string;
  modo_cantidad: "unidad";
}

type MetodoHojeadoPapel = "hojeado" | "guillotina";

interface ProductoPapelEdit {
  idsolicitud_producto: number;
  tipo_material: "papel";
  _eliminado: boolean;
  // Marca productos agregados en esta sesión de edición (aún no existen en BD)
  _esNuevo?: boolean;

  // Producto
  idproducto_papel: number;
  nombre: string;
  medida: string;

  // Grupo
  idgrupo_papel: number | null;
  grupo_descripcion: string;

  // Opciones
  opcionesGrupos: GrupoOpcion[];
  opcionesAsas: AsaOpcion[];
  opcionesLaminados: LaminadoOpcion[];
  opcionesFoils: FoilOpcion[];
  opcionesTexturas: TexturaOpcion[];

  // Tintas exteriores
  tintasId: number | null;
  tintas: number;
  pantones: string;   // CSV: "AZU-009, ROJ-990"

  // Tintas interiores
  tintasDentroId: number | null;
  tintasDentro: number;
  pantonesDentro: string;

  carasId: number | null;
  caras: number;

  id_asa: number | null;

  idcat_laminado: number | null; id_color: number | null;
  color_asa_nombre: string | null;
  idfoil: number | null;
  idcat_textura: number | null;
  uv: boolean;
  alto_relieve: boolean;
  // DEPRECATED: ya no se deriva ni se pide (Hojeado/Guillotina se decide
  // físicamente en producción, no en el sistema). Se deja opcional para no
  // romper el payload que aún viaja al backend.
  metodo_hojeado?: MetodoHojeadoPapel | null;
  lleva_armado: boolean;
  maquinaria_seleccionada: Record<
    string,
    { id: number; nombre: string } | null
  >;

  observacion: string;
  descripcion: string;

  herramental_descripcion: string;
  herramental_precio: string;
  herramental_aprobado: boolean | null;

  detalles: DetalleEdit[];
}

interface CatItem { id: number; cantidad: number; }

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseSafe = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const esDecimal = (v: string) => /^\d*\.?\d{0,4}$/.test(v);
const esEntero = (v: string) => /^\d*$/.test(v);
const tintasPapel = (items: CatItem[]) =>
  items.filter(t => t.cantidad >= 0).sort((a, b) => a.cantidad - b.cantidad);

const numeroONull = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const normalizarGrupo = (v: unknown): string =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const resolverGrupoSeleccionado = (
  productoPedido: any,
  opcionesGrupos: GrupoOpcion[]
): { idgrupo_papel: number | null; grupo_descripcion: string } => {
  const idGuardado = numeroONull(
    productoPedido.idgrupo_papel ??
    productoPedido.grupo_papel_idgrupo_papel ??
    productoPedido.idgrupoPapel ??
    productoPedido.idgrupo_papel_pedido ??
    productoPedido.idgrupo ??
    productoPedido.grupo_id
  );

  const descripcionGuardada = String(
    productoPedido.grupo_descripcion ??
    productoPedido.grupo_papel_descripcion ??
    productoPedido.material ??
    productoPedido.primer_tipo_papel ??
    ""
  ).trim();

  const grupoPorId = idGuardado != null
    ? opcionesGrupos.find(g => Number(g.idgrupo_papel) === idGuardado)
    : undefined;

  const descNorm = normalizarGrupo(descripcionGuardada);
  const grupoPorDescripcion = descNorm
    ? opcionesGrupos.find(g => {
      const etiquetaNorm = normalizarGrupo(g.etiqueta);
      return etiquetaNorm === descNorm || etiquetaNorm.includes(descNorm) || descNorm.includes(etiquetaNorm);
    })
    : undefined;

  // Si el pedido viejo no trae id de grupo, usamos el primer grupo real del producto.
  // Esto evita que al editar aparezca "Sin grupo" aunque el producto sí tenga material.
  const grupoFallback = opcionesGrupos[0];
  const grupo = grupoPorId ?? grupoPorDescripcion ?? grupoFallback;

  return {
    idgrupo_papel: grupo?.idgrupo_papel ?? idGuardado ?? null,
    grupo_descripcion: grupo?.etiqueta ?? descripcionGuardada,
  };
};

// ─── Subcomponente: buscador/creador de producto papel ───────────────────────
function BuscadorProductoPapel({
  onSeleccionar,
  onCreado,
  onCerrar,
}: {
  onSeleccionar: (prod: ProductoPapelBusqueda) => void;
  onCreado: (idproducto_papel: number, nombre: string, medida: string) => void;
  onCerrar: () => void;
}) {
  const [vista, setVista] = useState<"buscar" | "crear">("buscar");
  const [query, setQuery] = useState("");
  const [lista, setLista] = useState<ProductoPapelBusqueda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorAlt, setErrorAlt] = useState<string | null>(null);

  useEffect(() => {
    getProductosPapel().then(data => { setLista(data); setCargando(false); });
  }, []);

  const filtrados = lista.filter(p =>
    coincideBusquedaProductoPapel(p, query)
  );

  const handleGuardarNuevo = async (form: ProductoPapelForm, pendientes: ArchivoPendiente[]) => {
    setSaving(true);
    setErrorAlt(null);
    try {
      const resp = await crearProductoPapel(form);
      const nuevoId: number = resp.idproducto_papel;

      // Subir archivos pendientes si los hay
      for (const p of pendientes) {
        try { await subirArchivoPendiente(p, nuevoId); }
        catch { /* no bloquear si falla un archivo */ }
      }

      const nombre = form.tipoProductoNombre || "Producto papel";
      const medida = form.medida || "";
      onCreado(nuevoId, nombre, medida);
    } catch (e: any) {
      setErrorAlt(e.response?.data?.error || e.message || "Error al crear el producto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full flex flex-col ${vista === "crear" ? "max-w-5xl max-h-[95vh]" : "max-w-2xl max-h-[80vh]"}`}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            {vista === "crear" && (
              <button
                onClick={() => { setVista("buscar"); setErrorAlt(null); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
                title="Volver a búsqueda"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h3 className="font-bold text-gray-900">
              {vista === "buscar" ? "Cambiar producto de papel" : "Crear nuevo producto de papel"}
            </h3>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        {/* Vista: buscar */}
        {vista === "buscar" && (
          <>
            <div className="p-3 border-b flex-shrink-0">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por tipo, descripción, medida..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cargando ? (
                <div className="text-center py-8 text-gray-400">Cargando productos...</div>
              ) : filtrados.length === 0 && !query ? (
                <div className="text-center py-8 text-gray-400">Sin productos registrados</div>
              ) : filtrados.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-gray-400 text-sm">No se encontró "{query}"</p>
                  <button
                    onClick={() => setVista("crear")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear "{query}" como nuevo producto
                  </button>
                </div>
              ) : (
                <>
                  {filtrados.map(p => (
                    <button
                      key={p.idproducto_papel}
                      onClick={() => onSeleccionar(p)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition"
                    >
                      <p className="text-sm font-semibold text-gray-900">{p.tipo_producto}</p>
                      <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-gray-400">
                        {p.descripcion_papel && <span>{p.descripcion_papel}</span>}
                        {p.medida && <span>📐 {p.medida}</span>}
                        {p.primer_tipo_papel && <span>📄 {p.primer_tipo_papel}</span>}
                        {p.primer_calibre && <span>Cal. {p.primer_calibre}</span>}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Footer con botón crear */}
            <div className="p-3 border-t flex-shrink-0 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setVista("crear")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 rounded-lg text-sm font-semibold transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                No encuentro el producto — Crear nuevo
              </button>
            </div>
          </>
        )}

        {/* Vista: crear nuevo */}
        {vista === "crear" && (
          <div className="flex-1 overflow-y-auto">
            {errorAlt && (
              <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                ❌ {errorAlt}
              </div>
            )}
            <FormularioProductoPapelAlta
              onSave={handleGuardarNuevo}
              onCancel={() => { setVista("buscar"); setErrorAlt(null); }}
              saving={saving}
            />
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Subcomponente: un producto editable ──────────────────────────────────────
function ProductoPapelEditable({
  prod,
  pi,
  displayIndex,
  catalogoTintas,
  catalogoCaras,
  idTipoPanton,
  idTipoPantonesDentro,
  coloresAsa,
  onChange,
  onDetalleChange,
  onEliminar,
  onCambiarProducto,
  onAbrirModalInsumo,
}: {
  prod: ProductoPapelEdit;
  pi: number;
  displayIndex: number;
  catalogoTintas: CatItem[];
  catalogoCaras: CatItem[];
  idTipoPanton: number | null;
  idTipoPantonesDentro: number | null;
  coloresAsa: { id_color: number; color: string }[];  // ← agregar aquí
  onChange: (pi: number, k: keyof ProductoPapelEdit, v: any) => void;
  onDetalleChange: (pi: number, di: number, k: keyof DetalleEdit, v: string) => void;
  onEliminar: (pi: number) => void;
  onCambiarProducto: (pi: number) => void;
  onAbrirModalInsumo: (tipoId: number, nombre: string, pi: number, campo: "ext" | "int", indice: number) => void;
}) {
  const catalogoTintasValidas = tintasPapel(catalogoTintas);
  const catalogoTintasInterior = catalogoTintasValidas.filter(t => t.cantidad >= 1);
  const subtotal =
    prod.detalles.reduce((s, d) => s + parseSafe(d.precio_total), 0)
    + parseSafe(prod.herramental_precio);

  const recalcularTotal = (di: number, cantidad: string, precioUnit: string) => {
    const c = parseSafe(cantidad);
    const pu = parseSafe(precioUnit);
    if (c > 0 && pu > 0) {
      onDetalleChange(pi, di, "precio_total", (Math.round(c * pu * 100) / 100).toFixed(2));
    }
  };

  // Pantones exteriores como array
  const pantonesArr = prod.pantones
    ? prod.pantones.split(",").map((s: string) => s.trim())
    : [];

  // Pantones interiores como array
  const pantonesDentroArr = prod.pantonesDentro
    ? prod.pantonesDentro.split(",").map((s: string) => s.trim())
    : [];

  const setPantonExt = (i: number, val: string) => {
    const arr = [...pantonesArr];
    arr[i] = val;
    onChange(pi, "pantones", arr.filter(Boolean).join(", "));
  };

  const setPantonInt = (i: number, val: string) => {
    const arr = [...pantonesDentroArr];
    arr[i] = val;
    onChange(pi, "pantonesDentro", arr.filter(Boolean).join(", "));
  };

  const opcionesGruposSelect: GrupoOpcion[] = (() => {
    if (prod.idgrupo_papel == null) return prod.opcionesGrupos;

    const existeEnOpciones = prod.opcionesGrupos.some(
      g => Number(g.idgrupo_papel) === Number(prod.idgrupo_papel)
    );

    if (existeEnOpciones || !prod.grupo_descripcion) return prod.opcionesGrupos;

    // Fallback visual para pedidos antiguos: el pedido puede tener descripción
    // del grupo pero no tener ya el id dentro del catálogo actual del producto.
    return [
      {
        idgrupo_papel: prod.idgrupo_papel,
        etiqueta: prod.grupo_descripcion,
        precio_sugerido: null,
      } as GrupoOpcion,
      ...prod.opcionesGrupos,
    ];
  })();

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50/40 border-b border-amber-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
              {displayIndex}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">{prod.nombre}</p>
                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">📄 Papel</span>
                {prod._esNuevo && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    Nuevo
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-gray-400">
                {prod.medida && <span>📐 {prod.medida}</span>}
                {prod.grupo_descripcion && <span>{prod.grupo_descripcion}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-sm font-bold text-gray-700 mr-2">${fmt(subtotal)}</span>
            <button
              onClick={() => onCambiarProducto(pi)}
              title="Cambiar producto"
              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            <button
              onClick={() => onEliminar(pi)}
              title="Eliminar"
              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Grupo / Material */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Grupo / Material
          </label>
          <select
            value={prod.idgrupo_papel ?? ""}
            onChange={e => {
              const id = e.target.value ? Number(e.target.value) : null;
              const grupo = opcionesGruposSelect.find(g => Number(g.idgrupo_papel) === id);
              onChange(pi, "idgrupo_papel", id);
              onChange(pi, "grupo_descripcion", grupo?.etiqueta ?? "");
            }}
            className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Sin grupo</option>
            {opcionesGruposSelect.map(g => (
              <option key={g.idgrupo_papel} value={g.idgrupo_papel}>{g.etiqueta}</option>
            ))}
          </select>
        </div>

        {/* Tintas exteriores / Caras */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Tintas (frente)
            </label>
            <select
              value={prod.tintas}
              onChange={e => {
                const n = Number(e.target.value);
                const cat = catalogoTintasValidas.find(t => t.cantidad === n);
                onChange(pi, "tintas", n);
                onChange(pi, "tintasId", cat?.id ?? null);
                // Limpiar pantones que sobren
                const arr = prod.pantones
                  ? prod.pantones.split(",").map(s => s.trim()).slice(0, n)
                  : [];
                onChange(pi, "pantones", arr.join(", "));
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {(catalogoTintasValidas.length > 0
                ? catalogoTintasValidas
                : [1, 2, 3, 4, 5, 6].map(n => ({ id: n, cantidad: n }))
              ).map(t => (
                <option key={t.id} value={t.cantidad}>{t.cantidad === 0 ? "Sin tintas" : `${t.cantidad} tinta${t.cantidad > 1 ? "s" : ""}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Caras
            </label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-gray-50 flex items-center justify-between">
              <span>{prod.caras} cara{prod.caras > 1 ? "s" : ""}</span>
              <span className="text-xs text-gray-400">automático</span>
            </div>
          </div>
        </div>

        {/* Pantones exteriores */}
        {prod.tintas > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Pantones exteriores{" "}
            <span className="font-normal text-gray-300">(opcional — {prod.tintas} tinta{prod.tintas > 1 ? "s" : ""})</span>
          </label>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 space-y-2">
            {Array(prod.tintas).fill("").map((_, ti) => (
              <div key={ti} className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center">
                  {ti + 1}
                </span>
                <ComboboxInsumo
                  tipoId={idTipoPanton}
                  placeholder={`Tinta ${ti + 1}...`}
                  value={pantonesArr[ti] || ""}
                  onChange={val => setPantonExt(ti, val)}
                  onSeleccionar={item => {
                    const codigo = item.proveedores[0]?.codigo;
                    const texto = codigo ? `${item.nombre} (${codigo})` : item.nombre;
                    setPantonExt(ti, texto);
                  }}
                  onRegistrarNuevo={nombre =>
                    onAbrirModalInsumo(idTipoPanton!, nombre, pi, "ext", ti)
                  }
                  className="flex-1"
                />
              </div>
            ))}
            {prod.pantones && (
              <p className="text-xs text-purple-500 pt-1">
                Guardado: <span className="font-medium">{prod.pantones}</span>
              </p>
            )}
          </div>
        </div>
        )}

        {/* Tintas interiores */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Tintas interiores
          </label>
          <select
            value={prod.tintasDentro}
            onChange={e => {
              const n = Number(e.target.value);
              const cat = catalogoTintasValidas.find(t => t.cantidad === n);
              onChange(pi, "tintasDentro", n);
              onChange(pi, "tintasDentroId", n > 0 ? (cat?.id ?? null) : null);
              if (n === 0) onChange(pi, "pantonesDentro", "");

              // Caras es automático en papel: 1 si solo hay tintas al frente,
              // 2 si además hay tintas interiores.
              const carasCalculadas = n > 0 ? 2 : 1;
              const catCara = catalogoCaras.find(c => c.cantidad === carasCalculadas);
              onChange(pi, "caras", carasCalculadas);
              onChange(pi, "carasId", catCara?.id ?? null);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>Sin tintas interiores</option>
            {(catalogoTintasInterior.length > 0
              ? catalogoTintasInterior
              : [1, 2, 3, 4, 5, 6].map(n => ({ id: n, cantidad: n }))
            ).map(t => (
              <option key={t.id} value={t.cantidad}>{t.cantidad} tinta{t.cantidad > 1 ? "s" : ""}</option>
            ))}
          </select>

          {/* Pantones interiores */}
          {prod.tintasDentro > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Pantones interiores{" "}
                <span className="font-normal text-gray-300">(opcional)</span>
              </label>
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 space-y-2">
                {Array(prod.tintasDentro).fill("").map((_, ti) => (
                  <div key={ti} className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-300 text-purple-900 text-xs font-bold flex items-center justify-center">
                      {ti + 1}
                    </span>
                    <ComboboxInsumo
                      tipoId={idTipoPantonesDentro}
                      placeholder={`Interior ${ti + 1}...`}
                      value={pantonesDentroArr[ti] || ""}
                      onChange={val => setPantonInt(ti, val)}
                      onSeleccionar={item => {
                        const codigo = item.proveedores[0]?.codigo;
                        const texto = codigo ? `${item.nombre} (${codigo})` : item.nombre;
                        setPantonInt(ti, texto);
                      }}
                      onRegistrarNuevo={nombre =>
                        onAbrirModalInsumo(idTipoPantonesDentro!, nombre, pi, "int", ti)
                      }
                      className="flex-1"
                    />
                  </div>
                ))}
                {prod.pantonesDentro && (
                  <p className="text-xs text-purple-500 pt-1">
                    Guardado: <span className="font-medium">{prod.pantonesDentro}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Acabados */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Asa</label>
            <select
              value={prod.id_asa ?? ""}
              onChange={e => onChange(pi, "id_asa", e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Sin asa</option>
              {prod.opcionesAsas.map(a => (
                <option key={a.idcat_tipo_asa} value={a.idcat_tipo_asa}>{a.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Color de Asa
            </label>
            <select
              value={prod.id_color ?? ""}
              onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null;
                const color = coloresAsa.find((c: any) => c.id_color === id)?.color ?? null;
                onChange(pi, "id_color", id);
                onChange(pi, "color_asa_nombre", color);
              }}
              disabled={!prod.id_asa}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Sin color</option>
              {coloresAsa.map((c: any) => (
                <option key={c.id_color} value={c.id_color}>{c.color}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Laminado</label>
            <select
              value={prod.idcat_laminado ?? ""}
              onChange={e => onChange(pi, "idcat_laminado", e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Sin laminado</option>
              {prod.opcionesLaminados.map(l => (
                <option key={l.idcat_laminado} value={l.idcat_laminado}>{l.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Foil</label>
            <select
              value={prod.idfoil ?? ""}
              onChange={e => onChange(pi, "idfoil", e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Sin foil</option>
              {prod.opcionesFoils.map(f => (
                <option key={f.idfoil} value={f.idfoil}>
                  {f.colorfoil}{f.codigofoil ? ` ${f.codigofoil}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Textura</label>
            <select
              value={prod.idcat_textura ?? ""}
              onChange={e => onChange(pi, "idcat_textura", e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Sin textura</option>
              {prod.opcionesTexturas.map(t => (
                <option key={t.idcat_textura} value={t.idcat_textura}>{t.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* UV / Alto relieve */}
        <div className="flex gap-4">
          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer select-none transition ${prod.uv ? "bg-yellow-50 border-yellow-300" : "bg-gray-50 border-gray-200"}`}>
            <input type="checkbox" checked={prod.uv} onChange={e => onChange(pi, "uv", e.target.checked)}
              className="w-4 h-4 rounded border-yellow-400 text-yellow-500 focus:ring-yellow-400" />
            <span className={`text-sm font-medium ${prod.uv ? "text-yellow-700" : "text-gray-600"}`}>UV</span>
          </label>
          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer select-none transition ${prod.alto_relieve ? "bg-purple-50 border-purple-300" : "bg-gray-50 border-gray-200"}`}>
            <input type="checkbox" checked={prod.alto_relieve} onChange={e => onChange(pi, "alto_relieve", e.target.checked)}
              className="w-4 h-4 rounded border-purple-400 text-purple-500 focus:ring-purple-400" />
            <span className={`text-sm font-medium ${prod.alto_relieve ? "text-purple-700" : "text-gray-600"}`}>Alto relieve</span>
          </label>
        </div>

        {/* Descripción / Observación */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Descripción <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <input type="text" value={prod.descripcion}
              onChange={e => onChange(pi, "descripcion", e.target.value)}
              placeholder="Ej: 1er Grado..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Observaciones <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <input type="text" value={prod.observacion}
              onChange={e => onChange(pi, "observacion", e.target.value)}
              placeholder="Notas..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Herramental */}
        <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-orange-800">Herramental</h4>
              <p className="text-xs text-orange-600">Costo adicional ligado a este producto de papel.</p>
            </div>
            {parseSafe(prod.herramental_precio) > 0 && (
              <span className="text-sm font-bold text-orange-700">
                +${fmt(parseSafe(prod.herramental_precio))}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={prod.herramental_descripcion}
                onChange={e => onChange(pi, "herramental_descripcion", e.target.value)}
                placeholder="Ej: Suaje, molde, placa..."
                className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Precio
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={prod.herramental_precio}
                  onChange={e => {
                    if (esDecimal(e.target.value)) onChange(pi, "herramental_precio", e.target.value);
                  }}
                  placeholder="0.00"
                  className="w-full pl-6 py-2 border border-orange-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cantidades y precios */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cantidad y precio
            </label>
          </div>
          <div className="space-y-3">
            {prod.detalles.map((det, di) => (
              <div key={di} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex gap-2">
                  {/* Cantidad */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Cantidad (pzas)</label>
                    <input type="text" inputMode="numeric" value={det.cantidad}
                      onChange={e => {
                        if (!esEntero(e.target.value)) return;
                        onDetalleChange(pi, di, "cantidad", e.target.value);
                        recalcularTotal(di, e.target.value, det.precio_unitario);
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* Precio unitario */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Precio/pieza</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input type="text" inputMode="decimal" value={det.precio_unitario}
                        onChange={e => {
                          if (!esDecimal(e.target.value)) return;
                          onDetalleChange(pi, di, "precio_unitario", e.target.value);
                          recalcularTotal(di, det.cantidad, e.target.value);
                        }}
                        placeholder="0.0000"
                        className="w-full pl-6 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Total calculado */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Total</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input type="text" readOnly
                        value={parseSafe(det.precio_total) > 0 ? parseSafe(det.precio_total).toFixed(2) : ""}
                        placeholder="—"
                        className="w-full pl-6 py-2 border border-gray-100 rounded-lg text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">Calculado</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-end px-3 py-2 bg-amber-50/60 rounded-lg">
            <span className="text-sm font-bold text-amber-700">${fmt(subtotal)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EditarPedidoPapel() {
  const [coloresAsa, setColoresAsa] = useState<{ id_color: number; color: string }[]>([]);
  const { noPedido } = useParams<{ noPedido: string }>();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [pedidoOrig, setPedidoOrig] = useState<Pedido | null>(null);
  const [productos, setProductos] = useState<ProductoPapelEdit[]>([]);

  // Refs por producto (indexadas por posición en `productos`) para poder
  // hacer scroll automático al producto que falla una validación al guardar.
  const productRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [productoResaltado, setProductoResaltado] = useState<number | null>(null);

  const irAProducto = (pi: number) => {
    setProductoResaltado(pi);
    productRefs.current[pi]?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setProductoResaltado(prev => (prev === pi ? null : prev)), 2500);
  };

  const [catalogoTintas, setCatalogoTintas] = useState<CatItem[]>([]);
  const [catalogoCaras, setCatalogoCaras] = useState<CatItem[]>([]);
  const [foilsGlobales, setFoilsGlobales] = useState<FoilOpcion[]>([]);
  const [texturasGlobal, setTexturasGlobal] = useState<TexturaOpcion[]>([]);

  // Tipos de insumo para pantones
  const [idTipoPanton, setIdTipoPanton] = useState<number | null>(null);

  // Modal registrar insumo
  const [modalInsumo, setModalInsumo] = useState<{
    abierto: boolean;
    tipoId: number;
    nombre: string;
    piOrigen: number;
    campo: "ext" | "int";
    indice: number;
  }>({ abierto: false, tipoId: 0, nombre: "", piOrigen: -1, campo: "ext", indice: 0 });

  // Modal cambiar/agregar producto
  // modo "cambiar": reemplaza el producto en piOrigen
  // modo "agregar": crea un producto nuevo al final de la lista
  const [modalBuscador, setModalBuscador] = useState<{
    abierto: boolean;
    piOrigen: number;
    modo: "cambiar" | "agregar";
  }>({ abierto: false, piOrigen: -1, modo: "cambiar" });

  // Modal de procesos y maquinaria por producto de papel
  const [modalMaquinaria, setModalMaquinaria] = useState<{ abierto: boolean; piOrigen: number }>({
    abierto: false, piOrigen: -1,
  });

  useEffect(() => {
    if (!noPedido) return;
    (async () => {
      try {
        const [catalogosRes, foilsRes, texturasRes, tiposInsumo, todos, coloresRes] = await Promise.all([
          api.get("/catalogos-produccion"),
          getFoils(),
          getTexturas(),
          getTiposInsumo(),
          getPedidos() as Promise<Pedido[]>,
          getColoresAsa(),
        ]);

        setCatalogoTintas(
          tintasPapel(
            (catalogosRes.data.tintas || []).map((t: any) => ({ id: t.id, cantidad: t.cantidad }))
          )
        );
        setCatalogoCaras(
          (catalogosRes.data.caras || []).map((c: any) => ({ id: c.id, cantidad: c.cantidad }))
        );
        setFoilsGlobales(foilsRes);
        setTexturasGlobal(texturasRes);
        setColoresAsa(coloresRes);

        const panton = tiposInsumo.find((t: any) => t.nombre === "Pantón");
        if (panton) setIdTipoPanton(panton.idtipo_insumo);

        const ped = (todos as Pedido[]).find(p => p.no_pedido === noPedido);
        if (!ped) { setError("Pedido no encontrado"); return; }
        setPedidoOrig(ped);

        const prodsPapel = (ped.productos as any[]).filter(
          p => p.tipo_material === "papel" || p.tipoCotizacion === "papel"
        );

        const prodsEdit: ProductoPapelEdit[] = await Promise.all(
          prodsPapel.map(async (p: any) => {
            let opcionesGrupos: GrupoOpcion[] = [];
            let opcionesAsas: AsaOpcion[] = [];
            let opcionesLaminados: LaminadoOpcion[] = [];

            try {
              const opciones = await getOpcionesProductoPapel(p.idproducto_papel);
              opcionesGrupos = opciones.grupos;
              opcionesAsas = opciones.asas;
              opcionesLaminados = opciones.laminados;
            } catch { /* sin opciones */ }

            const tintasNum = typeof p.tintas === "number" ? p.tintas : 1;
            const tintasDentroN = typeof p.tintasDentro === "number" ? p.tintasDentro : 0;
            // Caras es automático en papel: 1 si solo hay tintas al frente,
            // 2 si además hay tintas interiores. Se recalcula siempre al cargar
            // por si el pedido viene de datos antiguos con un valor distinto.
            const carasNum = tintasDentroN > 0 ? 2 : 1;
            const catalogoTintasPapel = tintasPapel(catalogosRes.data.tintas || []);

            const catTinta = catalogoTintasPapel.find((t: any) => t.cantidad === tintasNum);
            const catTintaDentro = catalogoTintasPapel.find((t: any) => t.cantidad === tintasDentroN);
            const catCara = catalogosRes.data.caras?.find((c: any) => c.cantidad === carasNum);
            const grupoSeleccionado = resolverGrupoSeleccionado(p, opcionesGrupos);

            return {
              idsolicitud_producto: p.idsolicitud_producto ?? p.idcotizacion_producto,
              tipo_material: "papel" as const,
              _eliminado: false,

              idproducto_papel: p.idproducto_papel,
              nombre: p.nombre || "Producto papel",
              medida: p.medida || "",

              idgrupo_papel: grupoSeleccionado.idgrupo_papel,
              grupo_descripcion: grupoSeleccionado.grupo_descripcion,

              opcionesGrupos,
              opcionesAsas,
              opcionesLaminados,
              opcionesFoils: foilsRes,
              opcionesTexturas: texturasRes,

              tintasId: p.tintasId ?? catTinta?.id ?? null,
              tintas: tintasNum,
              pantones: typeof p.pantones === "string"
                ? p.pantones
                : Array.isArray(p.pantones) ? p.pantones.join(", ") : "",

              tintasDentroId: p.tintasDentroId ?? catTintaDentro?.id ?? null,
              tintasDentro: tintasDentroN,
              pantonesDentro: p.pantonesDentro ?? "",

              carasId: catCara?.id ?? p.carasId ?? null,
              caras: carasNum,

              id_asa: p.id_asa ?? null,
              id_color: p.id_color ?? null,
              color_asa_nombre: p.color_asa_nombre ?? null,
              idcat_laminado: p.idcat_laminado ?? null,
              idfoil: p.idfoil ?? null,
              idcat_textura: p.idcat_textura ?? null,
              uv: p.uv === true,
              alto_relieve: p.alto_relieve === true,
              metodo_hojeado: p.metodo_hojeado ?? null,
              lleva_armado: p.lleva_armado ?? true,
              maquinaria_seleccionada: p.maquinaria_seleccionada ?? {},

              observacion: p.observacion ?? "",
              descripcion: p.descripcion ?? "",
              herramental_descripcion: p.herramental_descripcion ?? "",
              herramental_precio: p.herramental_precio != null ? String(p.herramental_precio) : "",
              herramental_aprobado: p.herramental_aprobado ?? null,

              // Un pedido de papel maneja una sola cantidad. Si el dato viene con
              // más de un detalle (p. ej. arrastrado de una cotización antigua),
              // solo se conserva el primero.
              detalles: (p.detalles || []).slice(0, 1).map((d: any) => {
                const precioUnit = d.precio_unitario != null
                  ? String(d.precio_unitario)
                  : d.cantidad > 0
                    ? String(Math.round((d.precio_total / d.cantidad) * 10000) / 10000)
                    : "";
                return {
                  iddetalle: d.iddetalle ?? null,
                  cantidad: String(d.cantidad ?? ""),
                  precio_unitario: precioUnit,
                  precio_total: String(d.precio_total ?? ""),
                  modo_cantidad: "unidad" as const,
                };
              }),
            };
          })
        );

        setProductos(prodsEdit);
      } catch (e: any) {
        setError(e.message || "Error al cargar pedido");
      } finally {
        setCargando(false);
      }
    })();
  }, [noPedido]);

  // ─── Helpers de estado ───────────────────────────────────────────────────────
  const onChange = (pi: number, k: keyof ProductoPapelEdit, v: any) =>
    setProductos(prev => prev.map((p, i) => i === pi ? { ...p, [k]: v } : p));

  const onDetalleChange = (pi: number, di: number, k: keyof DetalleEdit, v: string) =>
    setProductos(prev => prev.map((p, i) => {
      if (i !== pi) return p;
      return { ...p, detalles: p.detalles.map((d, j) => j === di ? { ...d, [k]: v } : d) };
    }));

  const onEliminar = (pi: number) => onChange(pi, "_eliminado", true);

  // ─── Modal insumo ────────────────────────────────────────────────────────────
  const handleAbrirModalInsumo = (
    tipoId: number, nombre: string, pi: number, campo: "ext" | "int", indice: number
  ) => setModalInsumo({ abierto: true, tipoId, nombre, piOrigen: pi, campo, indice });

  const handleInsumoRegistrado = (item: Insumo) => {
    const codigo = item.proveedores[0]?.codigo;
    const texto = codigo ? `${item.nombre} (${codigo})` : item.nombre;
    const { piOrigen, campo, indice } = modalInsumo;

    setProductos(prev => prev.map((p, i) => {
      if (i !== piOrigen) return p;
      if (campo === "ext") {
        const arr = p.pantones ? p.pantones.split(",").map(s => s.trim()) : [];
        arr[indice] = texto;
        return { ...p, pantones: arr.filter(Boolean).join(", ") };
      } else {
        const arr = p.pantonesDentro ? p.pantonesDentro.split(",").map(s => s.trim()) : [];
        arr[indice] = texto;
        return { ...p, pantonesDentro: arr.filter(Boolean).join(", ") };
      }
    }));

    setModalInsumo({ abierto: false, tipoId: 0, nombre: "", piOrigen: -1, campo: "ext", indice: 0 });
  };

  // ─── Cambiar / Agregar producto ──────────────────────────────────────────────
  const handleCambiarProducto = (pi: number) =>
    setModalBuscador({ abierto: true, piOrigen: pi, modo: "cambiar" });

  const handleAgregarProducto = () =>
    setModalBuscador({ abierto: true, piOrigen: -1, modo: "agregar" });

  const aplicarProductoAlPi = async (
    pi: number,
    idproducto_papel: number,
    nombre: string,
    medida: string
  ) => {
    try {
      const opciones = await getOpcionesProductoPapel(idproducto_papel);
      setProductos(prev => prev.map((p, i) => {
        if (i !== pi) return p;
        return {
          ...p,
          idproducto_papel,
          nombre,
          medida,
          idgrupo_papel: opciones.grupos[0]?.idgrupo_papel ?? null,
          grupo_descripcion: opciones.grupos[0]?.etiqueta ?? "",
          opcionesGrupos: opciones.grupos,
          opcionesAsas: opciones.asas,
          opcionesLaminados: opciones.laminados,
          opcionesFoils: foilsGlobales,
          opcionesTexturas: texturasGlobal,
          id_asa: null, idcat_laminado: null, idfoil: null, idcat_textura: null,
          uv: false, alto_relieve: false,
          metodo_hojeado: null, lleva_armado: true,
          maquinaria_seleccionada: {},
          pantones: "", pantonesDentro: "",
          detalles: p.detalles.map(d => ({ ...d, precio_unitario: "", precio_total: "" })),
        };
      }));
    } catch { /* mantener producto anterior */ }
  };

  // Construye un ProductoPapelEdit nuevo desde cero, listo para agregarse al pedido.
  const crearProductoPapelDesdeSeleccion = async (
    idproducto_papel: number,
    nombre: string,
    medida: string
  ): Promise<ProductoPapelEdit> => {
    let opcionesGrupos: GrupoOpcion[] = [];
    let opcionesAsas: AsaOpcion[] = [];
    let opcionesLaminados: LaminadoOpcion[] = [];

    try {
      const opciones = await getOpcionesProductoPapel(idproducto_papel);
      opcionesGrupos = opciones.grupos;
      opcionesAsas = opciones.asas;
      opcionesLaminados = opciones.laminados;
    } catch { /* sin opciones */ }

    // id temporal negativo: identifica en la UI a un producto que aún no existe en BD
    const tempId = -Date.now();

    return {
      idsolicitud_producto: tempId,
      tipo_material: "papel",
      _eliminado: false,
      _esNuevo: true,

      idproducto_papel,
      nombre,
      medida,

      idgrupo_papel: opcionesGrupos[0]?.idgrupo_papel ?? null,
      grupo_descripcion: opcionesGrupos[0]?.etiqueta ?? "",

      opcionesGrupos,
      opcionesAsas,
      opcionesLaminados,
      opcionesFoils: foilsGlobales,
      opcionesTexturas: texturasGlobal,

      // Arranca en 1 tinta (frente) y resuelve su id real del catálogo, no null.
      // Si dejamos tintasId en null, el select ya muestra "1 tinta" por defecto
      // y si el usuario no lo toca, nunca dispara el onChange que lo llenaría.
      tintasId: catalogoTintas.find(t => t.cantidad === 1)?.id ?? null,
      tintas: 1,
      pantones: "",

      tintasDentroId: null,
      tintasDentro: 0,
      pantonesDentro: "",

      // Caras es automático: producto nuevo arranca sin tintas interiores → 1 cara.
      carasId: catalogoCaras.find(c => c.cantidad === 1)?.id ?? null,
      caras: 1,

      id_asa: null,
      id_color: null,
      color_asa_nombre: null,
      idcat_laminado: null,
      idfoil: null,
      idcat_textura: null,
      uv: false,
      alto_relieve: false,
      metodo_hojeado: null,
      lleva_armado: true,
      maquinaria_seleccionada: {},

      observacion: "",
      descripcion: "",
      herramental_descripcion: "",
      herramental_precio: "",
      herramental_aprobado: null,

      detalles: [{
        iddetalle: null,
        cantidad: "",
        precio_unitario: "",
        precio_total: "",
        modo_cantidad: "unidad" as const,
      }],
    };
  };

// Al agregar un producto nuevo al pedido, el catálogo de maquinaria del
  // producto (definido al darlo de alta) NO es lo mismo que la selección de
  // maquinaria específica de ESTE pedido (metodo_hojeado, lleva_armado,
  // maquinaria_seleccionada). Por eso, en cuanto se agrega, abrimos de
  // inmediato el modal de "Procesos y maquinaria" para completar ese paso
  // sin que el usuario tenga que acordarse de bajar a buscarlo.
  const handleSeleccionarProducto = async (prod: ProductoPapelBusqueda) => {
    const { piOrigen, modo } = modalBuscador;
    setModalBuscador({ abierto: false, piOrigen: -1, modo: "cambiar" });

    if (modo === "agregar") {
      const nuevo = await crearProductoPapelDesdeSeleccion(
        prod.idproducto_papel, prod.tipo_producto, prod.medida ?? ""
      );
      setProductos(prev => {
        const actualizados = [...prev, nuevo];
        const piNuevo = actualizados.length - 1;
        setTimeout(() => abrirMaquinariaProducto(piNuevo), 0);
        return actualizados;
      });
    } else {
      await aplicarProductoAlPi(piOrigen, prod.idproducto_papel, prod.tipo_producto, prod.medida ?? "");
    }
  };

  const handleProductoCreado = async (
    idproducto_papel: number,
    nombre: string,
    medida: string
  ) => {
    const { piOrigen, modo } = modalBuscador;
    setModalBuscador({ abierto: false, piOrigen: -1, modo: "cambiar" });

    if (modo === "agregar") {
      const nuevo = await crearProductoPapelDesdeSeleccion(idproducto_papel, nombre, medida);
      setProductos(prev => {
        const actualizados = [...prev, nuevo];
        const piNuevo = actualizados.length - 1;
        setTimeout(() => abrirMaquinariaProducto(piNuevo), 0);
        return actualizados;
      });
    } else {
      await aplicarProductoAlPi(piOrigen, idproducto_papel, nombre, medida);
    }
  };

  // ─── Procesos y maquinaria ───────────────────────────────────────────────────
  const abrirMaquinariaProducto = (pi: number) =>
    setModalMaquinaria({ abierto: true, piOrigen: pi });

  const productoParaModalMaquinaria = (p: ProductoPapelEdit) => ({
    ...p,
    idcotizacion_producto: p.idsolicitud_producto,
    idsolicitud_producto: p.idsolicitud_producto,
    tipoCotizacion: "papel" as const,
    tipo_material: "papel" as const,
    detalles: p.detalles.map(d => ({
      ...d,
      cantidad: parseSafe(d.cantidad),
      precio_total: parseSafe(d.precio_total),
      precio_unitario: parseSafe(d.precio_unitario),
      aprobado: true,
      modo_cantidad: "unidad" as const,
    })),
  });

  const productosModalMaquinaria = modalMaquinaria.abierto && modalMaquinaria.piOrigen >= 0
    ? [productoParaModalMaquinaria(productos[modalMaquinaria.piOrigen])]
    : [];

  const handleConfirmarMaquinaria = (selecciones: MaquinariaProductoPedidoPapel[]) => {
    setProductos(prev => prev.map(p => {
      const seleccion = selecciones.find(s => Number(s.idsolicitud_producto) === Number(p.idsolicitud_producto));
      if (!seleccion) return p;
      return {
        ...p,
        lleva_armado: seleccion.lleva_armado,
        maquinaria_seleccionada: seleccion.maquinaria_seleccionada ?? {},
      };
    }));
    setModalMaquinaria({ abierto: false, piOrigen: -1 });
  };

  const totalMaquinasSeleccionadas = (p: ProductoPapelEdit) =>
    Object.values(p.maquinaria_seleccionada ?? {}).filter(Boolean).length;

  // ─── Guardar ─────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!pedidoOrig) return;
    setErrorGuardar(null);

    // NUEVO: ya no se bloquea el guardado por "falta elegir Hojeado o
    // Guillotina" — eso se decide físicamente en producción, no en el
    // sistema. Lo único que sigue siendo obligatorio es que el producto
    // tenga su maquinaria registrada (validado por el backend al guardar).

    const productoSinTintas = productos.find(
      p => !p._eliminado && !p.tintasId
    );
    if (productoSinTintas) {
      const pi = productos.indexOf(productoSinTintas);
      setErrorGuardar(
        `Selecciona una opción de Impresión (frente) para "${productoSinTintas.nombre}" — puede ser "Sin tintas".`
      );
      irAProducto(pi);
      return;
    }

    setGuardando(true);
    try {
      const productosExistentes: ProductoPapelActualizar[] = productos
        .filter(p => !p._esNuevo)
        .map(p => ({
          idsolicitud_producto: p.idsolicitud_producto,
          eliminado: p._eliminado,
          tipo_material: "papel" as const,
          tipoCotizacion: "papel" as const,
          idproducto_papel: p.idproducto_papel,
          idgrupo_papel: p.idgrupo_papel ?? null,
          grupo_descripcion: p.grupo_descripcion || null,
          tintasId: p.tintasId,
          carasId: p.carasId,
          pantones: p.pantones || null,
          pantonesDentro: p.pantonesDentro || null,
          tintasDentroId: p.tintasDentro > 0 ? p.tintasDentroId : null,
          id_asa: p.id_asa ?? null,
          id_color: p.id_color ?? null,
          idcat_laminado: p.idcat_laminado ?? null,
          idfoil: p.idfoil ?? null,
          idcat_textura: p.idcat_textura ?? null,
          uv: p.uv,
          alto_relieve: p.alto_relieve,
          metodo_hojeado: p.metodo_hojeado,
          lleva_armado: p.lleva_armado,
          maquinaria_seleccionada: p.maquinaria_seleccionada,
          observacion: p.observacion || null,
          descripcion: p.descripcion || null,
          herramental_descripcion: p.herramental_descripcion || null,
          herramental_precio: p.herramental_precio !== "" ? parseSafe(p.herramental_precio) : null,
          herramental_aprobado: p.herramental_aprobado ?? null,
          detalles: p.detalles
            .map(d => ({
              iddetalle: d.iddetalle,
              cantidad: parseSafe(d.cantidad),
              precio_total: parseSafe(d.precio_total),
              precio_unitario: parseSafe(d.precio_unitario) || null,
              kilogramos: null,
              modo_cantidad: "unidad" as const,
            }))
            .filter(d => d.cantidad > 0),
        }));

      const productosNuevos: ProductoNuevoPapel[] = productos
        .filter(p => !!p._esNuevo && !p._eliminado)
        .map(p => ({
          tipo_material: "papel" as const,
          tipoCotizacion: "papel" as const,
          idproducto_papel: p.idproducto_papel,
          idgrupo_papel: p.idgrupo_papel ?? null,
          grupo_descripcion: p.grupo_descripcion || null,
          tintasId: p.tintasId,
          carasId: p.carasId,
          pantones: p.pantones || null,
          pantonesDentro: p.pantonesDentro || null,
          tintasDentroId: p.tintasDentro > 0 ? p.tintasDentroId : null,
          id_asa: p.id_asa ?? null,
          id_color: p.id_color ?? null,
          idcat_laminado: p.idcat_laminado ?? null,
          idfoil: p.idfoil ?? null,
          idcat_textura: p.idcat_textura ?? null,
          uv: p.uv,
          alto_relieve: p.alto_relieve,
          metodo_hojeado: p.metodo_hojeado,
          lleva_armado: p.lleva_armado,
          maquinaria_seleccionada: p.maquinaria_seleccionada,
          observacion: p.observacion || null,
          descripcion: p.descripcion || null,
          herramental_descripcion: p.herramental_descripcion || null,
          herramental_precio: p.herramental_precio !== "" ? parseSafe(p.herramental_precio) : null,
          herramental_aprobado: p.herramental_aprobado ?? null,
          detalles: p.detalles
            .map(d => ({
              iddetalle: null,
              cantidad: parseSafe(d.cantidad),
              precio_total: parseSafe(d.precio_total),
              precio_unitario: parseSafe(d.precio_unitario) || null,
              kilogramos: null,
              modo_cantidad: "unidad" as const,
            }))
            .filter(d => d.cantidad > 0),
        }));

      const payload = {
        productos: productosExistentes,
        productos_nuevos: productosNuevos,
      };

      await actualizarPedido(pedidoOrig.no_pedido, payload);
      setExito(true);
      setTimeout(() => navigate("/pedido"), 1500);
    } catch (e: any) {
      setErrorGuardar(e.response?.data?.error || e.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const totalGeneral = productos
    .filter(p => !p._eliminado)
    .reduce(
      (s, p) =>
        s
        + p.detalles.reduce((sd, d) => sd + parseSafe(d.precio_total), 0)
        + parseSafe(p.herramental_precio),
      0
    );

  // ─── Renders especiales ──────────────────────────────────────────────────────
  if (cargando) return (
    <Dashboard>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Cargando pedido de papel...</p>
      </div>
    </Dashboard>
  );

  if (error) return (
    <Dashboard>
      <div className="max-w-md mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <p className="text-red-700 font-semibold mb-4">{error}</p>
        <button onClick={() => navigate("/pedido")} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          ← Volver a Pedidos
        </button>
      </div>
    </Dashboard>
  );

  if (exito) return (
    <Dashboard>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-green-700 font-semibold text-lg">Pedido actualizado correctamente</p>
        <p className="text-gray-400 text-sm">Redirigiendo...</p>
      </div>
    </Dashboard>
  );

  const productosActivos = productos.filter(p => !p._eliminado);
  const pedidoMixto = Boolean(
    pedidoOrig?.productos?.some(
      (p: any) => p.tipo_material !== "papel" && p.tipoCotizacion !== "papel"
    )
  );

  return (
    <Dashboard>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/pedido")}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Pedido — Papel</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="font-semibold text-amber-600">{noPedido}</span>
              {pedidoOrig?.no_cotizacion && (
                <span className="ml-2 text-purple-500">• De {pedidoOrig.no_cotizacion}</span>
              )}
              {pedidoOrig && (
                <span className="ml-2 text-gray-400">
                  — {pedidoOrig.impresion || pedidoOrig.cliente || pedidoOrig.empresa || ""}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-xs text-amber-500 font-medium">Total estimado</span>
          <span className="text-lg font-bold text-amber-700">${fmt(totalGeneral)}</span>
        </div>
      </div>

      {pedidoMixto && (
        <div className="mb-5 p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-3 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-gray-800">Pedido mixto</p>
            <p className="text-xs text-gray-400">Edita cada material del mismo pedido desde este selector.</p>
          </div>
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => navigate(`/pedido/${noPedido}/editar`)}
              className="px-4 py-1.5 rounded-md text-gray-600 hover:text-blue-700 hover:bg-white text-sm font-semibold transition"
            >
              Plástico
            </button>
            <button
              type="button"
              className="px-4 py-1.5 rounded-md bg-amber-500 text-white text-sm font-semibold shadow-sm"
            >
              Papel
            </button>
          </div>
        </div>
      )}

      {/* Error guardar */}
      {errorGuardar && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-red-700 text-sm">{errorGuardar}</p>
        </div>
      )}

      <div className="space-y-5">
        {(() => {
          let activeIndex = 0;
          return productos.map((prod, pi) => {
            if (prod._eliminado) return (
              <div key={`${prod.idsolicitud_producto}-${pi}`}
                className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl opacity-70">
                <div>
                  <p className="text-sm font-semibold text-red-700 line-through">{prod.nombre}</p>
                  <p className="text-xs text-red-400 mt-0.5">Marcado para eliminar al guardar</p>
                </div>
                <button
                  onClick={() => onChange(pi, "_eliminado", false)}
                  className="text-xs px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-100 transition"
                >
                  Restaurar
                </button>
              </div>
            );

            const currentIndex = ++activeIndex;
            return (
              <div
                key={`${prod.idsolicitud_producto}-${pi}`}
                ref={el => { productRefs.current[pi] = el; }}
                className={
                  productoResaltado === pi
                    ? "rounded-xl ring-2 ring-red-400 ring-offset-2 transition-shadow"
                    : ""
                }
              >
                <ProductoPapelEditable
                  prod={prod}
                  pi={pi}
                  displayIndex={currentIndex}
                  catalogoTintas={catalogoTintas}
                  catalogoCaras={catalogoCaras}
                  idTipoPanton={idTipoPanton}
                  idTipoPantonesDentro={idTipoPanton}
                  coloresAsa={coloresAsa}
                  onChange={onChange}
                  onDetalleChange={onDetalleChange}
                  onEliminar={onEliminar}
                  onCambiarProducto={handleCambiarProducto}
                  onAbrirModalInsumo={handleAbrirModalInsumo}
                />
              </div>
            );
          });
        })()}

        {/* Agregar nuevo producto al pedido */}
        <button
          type="button"
          onClick={handleAgregarProducto}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 rounded-xl text-sm font-semibold transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar producto de papel al pedido
        </button>

        {/* Procesos y maquinaria */}
        <section className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50/40 border-b border-amber-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Procesos y maquinaria de papel</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Edita por producto el método de preparación, armado y las máquinas seleccionadas para este pedido.
                </p>
              </div>
              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-white border border-amber-200 text-xs font-semibold text-amber-700">
                {productosActivos.length} producto{productosActivos.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {productosActivos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No hay productos activos de papel.</p>
            ) : (
              productosActivos.map((p, index) => {
                const piReal = productos.findIndex(x => x.idsolicitud_producto === p.idsolicitud_producto);
                const maquinasSeleccionadas = totalMaquinasSeleccionadas(p);
                const configurado = maquinasSeleccionadas > 0;

                return (
                  <div key={p.idsolicitud_producto} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${configurado ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {configurado ? "Configurado" : "Pendiente"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        {p.medida && <span>📐 {p.medida}</span>}
                        {p.grupo_descripcion && <span>{p.grupo_descripcion}</span>}
                        <span>{p.lleva_armado ? "Con armado" : "Sin armado"}</span>
                        <span>{maquinasSeleccionadas} máquina{maquinasSeleccionadas !== 1 ? "s" : ""} seleccionada{maquinasSeleccionadas !== 1 ? "s" : ""}</span>
                      </div>
                       {p._esNuevo && !configurado && (
                        <p className="mt-1 text-xs text-amber-600 font-medium">
                          ⚠️ Producto nuevo — la maquinaria del catálogo no aplica automáticamente aquí, configura el proceso específico de este pedido antes de guardar.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirMaquinariaProducto(piReal)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Editar procesos y maquinaria
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Resumen */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Resumen</h3>
            <span className="text-xs text-gray-400">{productosActivos.length} producto(s) activo(s)</span>
          </div>
          <div className="space-y-1.5 mb-4">
            {productosActivos.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 truncate flex-1 mr-2">
                  <span className="text-gray-300 mr-1">{i + 1}.</span>
                  {p.nombre}
                  {p._esNuevo && <span className="ml-1.5 text-xs text-green-500">● nuevo</span>}
                </span>
                <span className="font-medium text-gray-800 flex-shrink-0">
                  ${fmt(
                    p.detalles.reduce((s, d) => s + parseSafe(d.precio_total), 0)
                    + parseSafe(p.herramental_precio)
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Total sin IVA</p>
            <p className="text-2xl font-bold text-gray-900">${fmt(totalGeneral)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              + IVA 16%: ${fmt(totalGeneral * 0.16)} →{" "}
              <span className="font-semibold text-gray-600">${fmt(totalGeneral * 1.16)}</span>
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-between gap-3 pb-4">
          <button onClick={() => navigate("/pedido")}
            className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || productosActivos.length === 0}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold text-sm transition
              ${guardando || productosActivos.length === 0
                ? "bg-gray-300 text-gray-400 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200"}`}
          >
            {guardando
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
              : <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardar cambios
              </>
            }
          </button>
        </div>
      </div>

      {/* Modal procesos y maquinaria */}
      {modalMaquinaria.abierto && (
        <ModalMaquinariaPedidoPapel
          productos={productosModalMaquinaria as any}
          onCancel={() => setModalMaquinaria({ abierto: false, piOrigen: -1 })}
          onConfirm={handleConfirmarMaquinaria}
        />
      )}

      {/* Modal buscador */}
      {modalBuscador.abierto && (
        <BuscadorProductoPapel
          onSeleccionar={handleSeleccionarProducto}
          onCreado={handleProductoCreado}
          onCerrar={() => setModalBuscador({ abierto: false, piOrigen: -1, modo: "cambiar" })}
        />
      )}

      {/* Modal registrar insumo */}
      {modalInsumo.abierto && (
        <ModalRegistrarInsumo
          tipoInsumoInicial={modalInsumo.tipoId}
          nombreInicial={modalInsumo.nombre}
          onRegistrado={handleInsumoRegistrado}
          onCancelar={() =>
            setModalInsumo({ abierto: false, tipoId: 0, nombre: "", piOrigen: -1, campo: "ext", indice: 0 })
          }
        />
      )}
    </Dashboard>
  );
}