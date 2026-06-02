// src/components/ModalCambiarProducto.tsx
import { useState, useEffect, useRef } from "react";
import ConfigurarProducto from "./ConfigurarProducto";
import {
  getCatalogosPlastico,
  searchProductosPlastico,
  crearOObtenerProducto,
} from "../services/productosPlasticoService";
import { calcularPorKiloStr, calcularCelofanBopp } from "../utils/calcularPorKilo";
import type {
  DatosProducto,
  CatalogosPlastico,
  ProductoBusqueda,
} from "../types/productos-plastico.types";

// ─── Tipos exportados ────────────────────────────────────────────────────────
export interface ProductoReemplazo {
  configuracion_plastico_id: number;
  nombre:                    string;
  por_kilo:                  string;
  material:                  string;
  calibre:                   string;
  medidasFormateadas:        string;
  medidas: {
    altura:         string;
    ancho:          string;
    fuelleFondo:    string;
    fuelleLateral1: string;
    fuelleLateral2: string;
    refuerzo:       string;
  };
}

interface DatosActuales {
  nombre:               string;
  material:             string;
  calibre:              string;
  medidasFormateadas:   string;
  tipo_producto_id:     number;
  tipo_producto_nombre: string;
  material_id:          number;
  calibre_id:           number;
  medidas: {
    altura:         string;
    ancho:          string;
    fuelleFondo:    string;
    fuelleLateral1: string;
    fuelleLateral2: string;
    refuerzo:       string;
  };
}

interface ModalCambiarProductoProps {
  abierto:        boolean;
  onCerrar:       () => void;
  onConfirmar:    (producto: ProductoReemplazo) => void;
  datosActuales?: DatosActuales | null;
}

type Tab = "buscar" | "crear";

// ─── Tab: Buscar existente ───────────────────────────────────────────────────
function TabBuscar({
  onSeleccionar,
}: {
  onSeleccionar: (p: ProductoBusqueda) => void;
}) {
  const [query,        setQuery]        = useState("");
  const [resultados,   setResultados]   = useState<ProductoBusqueda[]>([]);
  const [cargando,     setCargando]     = useState(false);
  const [seleccionado, setSeleccionado] = useState<ProductoBusqueda | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { buscar(""); }, []);

  const buscar = async (q: string) => {
    setCargando(true);
    try {
      const res = await searchProductosPlastico(q || undefined);
      setResultados(res);
    } catch {
      setResultados([]);
    } finally {
      setCargando(false);
    }
  };

  const handleQuery = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(v), 300);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Buscador */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => handleQuery(e.target.value)}
          placeholder="Buscar por tipo, material, calibre o medida..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none"
        />
        {cargando && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Lista */}
      <div className="max-h-[340px] overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
        {resultados.length === 0 && !cargando ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">Sin resultados para "{query}"</p>
          </div>
        ) : (
          resultados.map(prod => {
            const activo = seleccionado?.id === prod.id;
            return (
              <button
                key={prod.id}
                onClick={() => { setSeleccionado(prod); onSeleccionar(prod); }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition
                  ${activo
                    ? "bg-blue-50 border-l-2 border-blue-500"
                    : "hover:bg-gray-50/80 border-l-2 border-transparent"}`}
              >
                <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition
                  ${activo ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                  {activo && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${activo ? "text-blue-700" : "text-gray-800"}`}>
                    {prod.tipo_producto} {prod.medida}
                  </p>
                  <div className="flex flex-wrap gap-x-3 mt-0.5">
                    <span className="text-xs text-gray-400">{prod.material}</span>
                    <span className="text-xs text-gray-400">Cal. {prod.calibre}</span>
                    {prod.por_kilo && <span className="text-xs text-gray-400">{prod.por_kilo} pz/kg</span>}
                  </div>
                </div>
                <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-mono">
                  {prod.medida}
                </span>
              </button>
            );
          })
        )}
      </div>

      {resultados.length > 0 && (
        <p className="text-xs text-gray-400 text-center -mt-1">
          {resultados.length} producto{resultados.length !== 1 ? "s" : ""} encontrado{resultados.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// ─── Tab: Crear nuevo ────────────────────────────────────────────────────────
function TabCrear({
  catalogos,
  datosIniciales,
  onCambio,
  mountKey,
}: {
  catalogos:      CatalogosPlastico;
  datosIniciales: DatosProducto | null;
  onCambio:       (d: DatosProducto) => void;
  mountKey:       string;
}) {
  return (
    <ConfigurarProducto
      key={mountKey}
      catalogos={catalogos}
      onProductoChange={onCambio}
      mostrarFigura={true}
      datosIniciales={datosIniciales}
    />
  );
}

// ─── Modal principal ─────────────────────────────────────────────────────────
export default function ModalCambiarProducto({
  abierto,
  onCerrar,
  onConfirmar,
  datosActuales,
}: ModalCambiarProductoProps) {
  const [tab,         setTab]         = useState<Tab>("buscar");
  const [catalogos,   setCatalogos]   = useState<CatalogosPlastico | null>(null);
  const [cargandoCat, setCargandoCat] = useState(true);
  const [guardando,   setGuardando]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [mountKey,    setMountKey]    = useState(0);

  const [prodBuscado, setProdBuscado] = useState<ProductoBusqueda | null>(null);
  const [datosNuevos, setDatosNuevos] = useState<DatosProducto | null>(null);

  const datosIniciales: DatosProducto | null = datosActuales
    ? {
        tipoProducto:       datosActuales.tipo_producto_nombre,
        tipoProductoId:     datosActuales.tipo_producto_id,
        material:           datosActuales.material,
        materialId:         datosActuales.material_id,
        calibre:            datosActuales.calibre,
        calibreId:          datosActuales.calibre_id,
        medidas:            datosActuales.medidas,
        medidasFormateadas: datosActuales.medidasFormateadas,
        nombreCompleto:     datosActuales.nombre,
      }
    : null;

  // Cargar catálogos + incrementar mountKey cada vez que abre
  useEffect(() => {
    if (!abierto) return;
    setMountKey(k => k + 1);
    setCargandoCat(true);
    setError(null);
    (async () => {
      try {
        const cats = await getCatalogosPlastico();
        setCatalogos(cats);
      } catch {
        setError("Error al cargar catálogos");
      } finally {
        setCargandoCat(false);
      }
    })();
  }, [abierto]);

  // Reset al cerrar
  useEffect(() => {
    if (!abierto) {
      setTab("buscar");
      setProdBuscado(null);
      setDatosNuevos(null);
      setError(null);
      setGuardando(false);
    }
  }, [abierto]);

  const handleConfirmar = async () => {
    setError(null);

    if (tab === "buscar") {
      if (!prodBuscado) { setError("Selecciona un producto de la lista"); return; }
      onConfirmar({
        configuracion_plastico_id: prodBuscado.id,
        nombre:             `${prodBuscado.tipo_producto} ${prodBuscado.medida}`,
        por_kilo:           prodBuscado.por_kilo,
        material:           prodBuscado.material,
        calibre:            String(prodBuscado.calibre),
        medidasFormateadas: prodBuscado.medida,
        medidas: {
          altura:         String(prodBuscado.altura                    || ""),
          ancho:          String(prodBuscado.ancho                     || ""),
          fuelleFondo:    String(prodBuscado.fuelle_fondo              || ""),
          fuelleLateral1: String(prodBuscado.fuelle_lateral_izquierdo  || ""),
          fuelleLateral2: String(prodBuscado.fuelle_lateral_derecho    || ""),
          refuerzo:       String(prodBuscado.refuerzo                  || ""),
        },
      });
      return;
    }

    // Tab crear
    if (!datosNuevos?.tipoProductoId || !datosNuevos?.materialId || !datosNuevos?.calibreId) {
      setError("Selecciona tipo de producto, material y calibre");
      return;
    }
    if (!datosNuevos.medidas.altura || !datosNuevos.medidas.ancho) {
      setError("Ingresa al menos altura y ancho");
      return;
    }

    // Calcular por_kilo igual que Plastico.tsx
    const esCelofanBopp =
      datosNuevos.tipoProducto === "Bolsa celofán" &&
      datosNuevos.material.toUpperCase() === "BOPP";

    const porKiloCalculado = esCelofanBopp && datosNuevos.gramos
      ? calcularCelofanBopp(datosNuevos, datosNuevos.gramos)?.bolsasPorKilo.toFixed(3) ?? ""
      : calcularPorKiloStr(datosNuevos, catalogos?.materiales ?? []);

    if (!porKiloCalculado || parseFloat(porKiloCalculado) <= 0) {
      setError("No se pudo calcular las piezas por kilo. Verifica las medidas ingresadas.");
      return;
    }

    setGuardando(true);
    try {
      let productoId:   number;
      let porKiloFinal: string;

      try {
        const resultado = await crearOObtenerProducto({
          tipo_producto_plastico_id: datosNuevos.tipoProductoId,
          material_plastico_id:      datosNuevos.materialId,
          calibre_id:                datosNuevos.calibreId,
          altura:       parseFloat(datosNuevos.medidas.altura)         || 0,
          ancho:        parseFloat(datosNuevos.medidas.ancho)          || 0,
          fuelle_fondo: parseFloat(datosNuevos.medidas.fuelleFondo)    || 0,
          fuelle_latIz: parseFloat(datosNuevos.medidas.fuelleLateral1) || 0,
          fuelle_latDe: parseFloat(datosNuevos.medidas.fuelleLateral2) || 0,
          refuerzo:     parseFloat(datosNuevos.medidas.refuerzo)       || 0,
          medida:       datosNuevos.medidasFormateadas,
          por_kilo:     parseFloat(porKiloCalculado),
        });
        productoId   = resultado.producto.id;
        porKiloFinal = String(resultado.producto.por_kilo ?? porKiloCalculado);
      } catch (e: any) {
        if (e.response?.status === 409 && e.response?.data?.producto_existente?.id) {
          productoId   = e.response.data.producto_existente.id;
          const lista  = await searchProductosPlastico(datosNuevos.medidasFormateadas);
          const enc    = lista.find((p: any) => p.id === productoId);
          porKiloFinal = enc?.por_kilo ? String(enc.por_kilo) : porKiloCalculado;
        } else {
          throw e;
        }
      }

      onConfirmar({
        configuracion_plastico_id: productoId,
        nombre:             datosNuevos.nombreCompleto,
        por_kilo:           porKiloFinal,
        material:           datosNuevos.material,
        calibre:            datosNuevos.calibre,
        medidasFormateadas: datosNuevos.medidasFormateadas,
        medidas:            datosNuevos.medidas,
      });
    } catch (e: any) {
      setError(e.response?.data?.detalle || e.message || "Error al procesar producto");
    } finally {
      setGuardando(false);
    }
  };

  const nombrePreview = tab === "buscar"
    ? (prodBuscado ? `${prodBuscado.tipo_producto} ${prodBuscado.medida}` : null)
    : (datosNuevos?.nombreCompleto || null);

  const puedeConfirmar = tab === "buscar" ? !!prodBuscado : !!datosNuevos?.nombreCompleto;

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-3xl max-h-[95vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50/40 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔄</span>
              <h2 className="text-lg font-bold text-gray-900">Cambiar producto</h2>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed max-w-md">
              Las cantidades del pedido se conservarán. Los precios se recalcularán con el nuevo producto.
            </p>
          </div>
          <button onClick={onCerrar}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/80 transition flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Producto actual */}
        {datosActuales && (
          <div className="px-6 py-2.5 bg-amber-50/70 border-b border-amber-100 flex-shrink-0 flex items-center gap-3">
            <span className="text-xs text-amber-500 font-semibold flex-shrink-0">Actual:</span>
            <span className="text-xs text-gray-700 font-medium truncate">{datosActuales.nombre}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {datosActuales.material} · Cal.{datosActuales.calibre} · {datosActuales.medidasFormateadas}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0 px-6 pt-3 gap-1">
          {([
            { id: "buscar", label: "Seleccionar existente", icon: "🔍" },
            { id: "crear",  label: "Crear nuevo",           icon: "✨" },
          ] as { id: Tab; label: string; icon: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition
                ${tab === t.id
                  ? "border-blue-500 text-blue-600 bg-blue-50/60"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 min-h-0">
          {tab === "buscar" && (
            <TabBuscar onSeleccionar={setProdBuscado} />
          )}

          {tab === "crear" && (
            cargandoCat ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Cargando catálogos...</p>
              </div>
            ) : catalogos ? (
              <TabCrear
                catalogos={catalogos}
                datosIniciales={datosIniciales}
                onCambio={setDatosNuevos}
                mountKey={`${mountKey}-${datosActuales?.tipo_producto_id ?? 0}`}
              />
            ) : (
              <p className="text-center text-red-500 text-sm py-8">Error al cargar catálogos</p>
            )
          )}
        </div>

        {/* Preview */}
        {nombrePreview && (
          <div className="px-6 py-3 bg-green-50 border-t border-green-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-green-600 font-medium">
                  {tab === "buscar" ? "Producto seleccionado" : "Nuevo producto"}
                </p>
                <p className="text-sm font-semibold text-gray-800 truncate">{nombrePreview}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-6 py-2.5 bg-red-50 border-t border-red-100 flex-shrink-0">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
          <button onClick={onCerrar}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-white transition">
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={guardando || !puedeConfirmar}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold transition
              ${guardando || !puedeConfirmar
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"}`}
          >
            {guardando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Aplicar cambio
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}