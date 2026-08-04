// src/pages/cotizadorLibre/CotizadorLibre.tsx
import { useEffect, useMemo, useState } from "react";
import {
  getTiposCotizadorLibre,
  getMedidasPapelCotizadorLibre,
  getMedidasPlasticoCotizadorLibre,
  getDetalleProductoPapelCotizadorLibre,
  getDetalleProductoPlasticoCotizadorLibre,
} from "../../services/cotizadorLibre/cotizadorLibreCatalogo.service";
import { useCalcularPrecioCotizadorLibre } from "../../hooks/cotizadorLibre/useCalcularPrecioCotizadorLibre";
import IdentificacionCliente from "../../components/cotizadorLibre/IdentificacionCliente";
import type {
  CategoriaCotizadorLibre,
  TipoCatalogoItem,
  MedidaPapelItem,
  MedidaPlasticoItem,
  DetalleProductoPapelResponse,
  DetalleProductoPlasticoResponse,
} from "../../types/cotizadorLibre/cotizadorLibre.types";
import type { CalcularPrecioCotizadorLibrePayload } from "../../services/cotizadorLibre/cotizadorLibrePrecio.service";

type Vista = "landing" | "wizard";

// El cargo por asa solo aplica si el nombre de la opción contiene "listón"
// — misma regla de negocio ya usada en la herramienta interna
// (useCalculoPrecioPapel.ts). No es un booleano libre: depende del nombre.
const esAsaDeListon = (nombre: string | null): boolean =>
  String(nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("liston");

export default function CotizadorLibre() {
  const [vista, setVista] = useState<Vista>("landing");

  // ---- Paso 1: Categoría ----
  const [categoria, setCategoria] = useState<CategoriaCotizadorLibre | null>(null);

  // ---- Paso 2: Tipo ----
  const [tipos, setTipos] = useState<TipoCatalogoItem[]>([]);
  const [tiposLoading, setTiposLoading] = useState(false);
  const [tiposError, setTiposError] = useState<string | null>(null);
  const [idTipoSeleccionado, setIdTipoSeleccionado] = useState<number | null>(null);

  // ---- Paso 3: Medida ----
  const [medidas, setMedidas] = useState<(MedidaPapelItem | MedidaPlasticoItem)[]>([]);
  const [medidasLoading, setMedidasLoading] = useState(false);
  const [medidasError, setMedidasError] = useState<string | null>(null);
  const [idMedidaSeleccionada, setIdMedidaSeleccionada] = useState<number | null>(null);

  // ---- Paso 4: Detalle + Personalización ----
  const [detallePapel, setDetallePapel] = useState<DetalleProductoPapelResponse | null>(null);
  const [detallePlastico, setDetallePlastico] = useState<DetalleProductoPlasticoResponse | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);

  // Personalización — Papel
  const [idGrupoSeleccionado, setIdGrupoSeleccionado] = useState<number | null>(null);
  const [idAsaSeleccionada, setIdAsaSeleccionada] = useState<number | null>(null);
  const [idLaminadoSeleccionado, setIdLaminadoSeleccionado] = useState<number | null>(null);
  const [idTexturaSeleccionada, setIdTexturaSeleccionada] = useState<number | null>(null);
  const [idFoilSeleccionado, setIdFoilSeleccionado] = useState<number | null>(null);
  const [altoRelieve, setAltoRelieve] = useState(false);
  const [uv, setUv] = useState(false);
  const [tintasFrente, setTintasFrente] = useState(0);
  const [tintasDentro, setTintasDentro] = useState(0);

  // Personalización — Plástico
  const [idTintasPlastico, setIdTintasPlastico] = useState<number | null>(null);

  // ---- Paso 5: Cantidad ----
  const [cantidad, setCantidad] = useState<number | null>(null);

  // ---- Identificación de cliente (Fase 4.4) ----
  const [panelIdentificacionAbierto, setPanelIdentificacionAbierto] = useState(false);
  const [clienteIdentificado, setClienteIdentificado] = useState<{
    clienteId: number;
    verificado: boolean;
  } | null>(null);

  // ============================================================
  // Cargar tipos al elegir categoría
  // ============================================================
  useEffect(() => {
    if (!categoria) return;

    setTipos([]);
    setIdTipoSeleccionado(null);
    setMedidas([]);
    setIdMedidaSeleccionada(null);
    setTiposError(null);
    setTiposLoading(true);

    getTiposCotizadorLibre(categoria)
      .then(setTipos)
      .catch((err) => {
        console.error("Error al cargar tipos:", err);
        setTiposError("No se pudo cargar el catálogo. Intenta de nuevo.");
      })
      .finally(() => setTiposLoading(false));
  }, [categoria]);

  // ============================================================
  // Cargar medidas al elegir tipo
  // ============================================================
  useEffect(() => {
    if (!categoria || !idTipoSeleccionado) return;

    setMedidas([]);
    setIdMedidaSeleccionada(null);
    setMedidasError(null);
    setMedidasLoading(true);

    const promesa =
      categoria === "papel"
        ? getMedidasPapelCotizadorLibre(idTipoSeleccionado)
        : getMedidasPlasticoCotizadorLibre(idTipoSeleccionado);

    promesa
      .then(setMedidas)
      .catch((err) => {
        console.error("Error al cargar medidas:", err);
        setMedidasError("No se pudieron cargar las medidas. Intenta de nuevo.");
      })
      .finally(() => setMedidasLoading(false));
  }, [categoria, idTipoSeleccionado]);

  // ============================================================
  // Cargar detalle de producto al elegir medida (resetea personalización)
  // ============================================================
  useEffect(() => {
    if (!categoria || !idMedidaSeleccionada) return;

    setDetallePapel(null);
    setDetallePlastico(null);
    setDetalleError(null);
    setIdGrupoSeleccionado(null);
    setIdAsaSeleccionada(null);
    setIdLaminadoSeleccionado(null);
    setIdTexturaSeleccionada(null);
    setIdFoilSeleccionado(null);
    setAltoRelieve(false);
    setUv(false);
    setTintasFrente(0);
    setTintasDentro(0);
    setIdTintasPlastico(null);
    setCantidad(null);
    setDetalleLoading(true);

    if (categoria === "papel") {
      getDetalleProductoPapelCotizadorLibre(idMedidaSeleccionada)
        .then((data) => {
          setDetallePapel(data);
          if (data.grupos.length === 1) setIdGrupoSeleccionado(data.grupos[0].idgrupo_papel);
        })
        .catch((err) => {
          console.error("Error al cargar detalle:", err);
          setDetalleError("No se pudo cargar el detalle del producto.");
        })
        .finally(() => setDetalleLoading(false));
    } else {
      getDetalleProductoPlasticoCotizadorLibre(idMedidaSeleccionada)
        .then(setDetallePlastico)
        .catch((err) => {
          console.error("Error al cargar detalle:", err);
          setDetalleError("No se pudo cargar el detalle del producto.");
        })
        .finally(() => setDetalleLoading(false));
    }
  }, [categoria, idMedidaSeleccionada]);

  // ============================================================
  // Payload de precio — solo se arma cuando ya hay lo mínimo necesario
  // (grupo/material + cantidad para papel; porKilo + tintas + cantidad
  // para plástico). Mientras falte algo, es null y el hook no calcula nada.
  // ============================================================
  const payloadPrecio: CalcularPrecioCotizadorLibrePayload | null = useMemo(() => {
    if (!cantidad || cantidad <= 0) return null;

    if (categoria === "papel") {
      if (!idMedidaSeleccionada || !idGrupoSeleccionado) return null;

      const nombreAsa =
        detallePapel?.asas.find((a) => a.id === idAsaSeleccionada)?.nombre ?? null;

      return {
        categoria: "papel",
        cantidad,
        papel: {
          idproducto_papel: idMedidaSeleccionada,
          idgrupo_papel: idGrupoSeleccionado,
          acabados: {
            tintas_frente: tintasFrente,
            tintas_dentro: tintasDentro,
            laminado: idLaminadoSeleccionado !== null,
            hot_stamping: idFoilSeleccionado !== null,
            alto_relieve: altoRelieve,
            textura: idTexturaSeleccionada !== null,
            uv,
            asa: idAsaSeleccionada !== null && esAsaDeListon(nombreAsa),
          },
        },
      };
    }

    if (categoria === "plastico") {
      if (!detallePlastico || idTintasPlastico === null) return null;
      const porKilo = Number(detallePlastico.producto.por_kilo);
      if (!Number.isFinite(porKilo) || porKilo <= 0) return null;

      return {
        categoria: "plastico",
        cantidad,
        plastico: {
          porKilo,
          tintasId: idTintasPlastico,
        },
      };
    }

    return null;
  }, [
    categoria,
    cantidad,
    idMedidaSeleccionada,
    idGrupoSeleccionado,
    idAsaSeleccionada,
    idLaminadoSeleccionado,
    idFoilSeleccionado,
    idTexturaSeleccionada,
    altoRelieve,
    uv,
    tintasFrente,
    tintasDentro,
    detallePapel,
    detallePlastico,
    idTintasPlastico,
  ]);

  const { resultado: precio, loading: precioLoading, error: precioError } =
    useCalcularPrecioCotizadorLibre({ payload: payloadPrecio });

  const entrarAlCotizador = () => setVista("wizard");

  const volverAlInicio = () => {
    setVista("landing");
    setCategoria(null);
    setIdTipoSeleccionado(null);
    setIdMedidaSeleccionada(null);
  };

  // ============================================================
  // LANDING
  // ============================================================
  if (vista === "landing") {
    return (
      <div className="min-h-screen bg-[#f7f4ee] flex flex-col">
        <div className="bg-gradient-to-br from-[#1e3a2b] to-[#2d5540] text-white px-8 py-20 flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-11 h-11 rounded-lg bg-[#e8c99a] text-[#1e3a2b] font-extrabold flex items-center justify-center text-base mb-6">
            EB
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 max-w-xl">
            Diseña el empaque ideal para tu marca
          </h1>
          <p className="text-sm text-[#e8c99a] font-semibold mb-2">
            🌿 En menos de 2 minutos
          </p>
          <p className="text-sm text-white/80 mb-8 max-w-sm">
            Crea, personaliza y cotiza al instante el empaque perfecto para tu negocio.
          </p>
          <button
            onClick={entrarAlCotizador}
            className="bg-[#e8c99a] text-[#1e3a2b] font-bold px-8 py-4 rounded-xl hover:bg-white transition-colors"
          >
            Comenzar →
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // WIZARD
  // ============================================================
  return (
    <div className="min-h-screen bg-[#f7f4ee] pb-16">
      <div className="bg-white border-b border-[#e2ddd0] px-6 py-4 flex items-center justify-between">
        <button
          onClick={volverAlInicio}
          className="text-sm text-[#6b6f63] hover:text-[#1e3a2b] font-semibold"
        >
          ← Volver al inicio
        </button>
        <span className="text-sm text-[#6b6f63]">
          Cotizador / <b className="text-[#1e3a2b]">Nueva cotización</b>
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Paso 1: Categoría */}
        <div className="bg-white border border-[#e2ddd0] rounded-xl p-5">
          <h2 className="text-sm font-bold mb-3">1. ¿Qué tipo de producto buscas?</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setCategoria("papel")}
              className={`flex-1 border rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                categoria === "papel"
                  ? "border-[#b8894a] bg-[#fbf3e8] text-[#1e3a2b]"
                  : "border-[#e2ddd0] hover:border-[#b8894a]"
              }`}
            >
              🛍️ Papel
            </button>
            <button
              onClick={() => setCategoria("plastico")}
              className={`flex-1 border rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                categoria === "plastico"
                  ? "border-[#b8894a] bg-[#fbf3e8] text-[#1e3a2b]"
                  : "border-[#e2ddd0] hover:border-[#b8894a]"
              }`}
            >
              🧵 Plástico
            </button>
          </div>
        </div>

        {/* Paso 2: Tipo */}
        {categoria && (
          <div className="bg-white border border-[#e2ddd0] rounded-xl p-5">
            <h2 className="text-sm font-bold mb-3">2. Selecciona el tipo</h2>
            {tiposLoading && <p className="text-sm text-[#6b6f63]">Cargando opciones...</p>}
            {tiposError && <p className="text-sm text-red-600">{tiposError}</p>}
            {!tiposLoading && !tiposError && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tipos.map((tipo) => (
                  <button
                    key={tipo.id}
                    onClick={() => setIdTipoSeleccionado(tipo.id)}
                    className={`border rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                      idTipoSeleccionado === tipo.id
                        ? "border-[#b8894a] bg-[#fbf3e8] text-[#1e3a2b]"
                        : "border-[#e2ddd0] hover:border-[#b8894a]"
                    }`}
                  >
                    {tipo.nombre}
                  </button>
                ))}
                {tipos.length === 0 && (
                  <p className="text-sm text-[#6b6f63] col-span-full">
                    No hay opciones disponibles en este momento.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Paso 3: Medida */}
        {idTipoSeleccionado && (
          <div className="bg-white border border-[#e2ddd0] rounded-xl p-5">
            <h2 className="text-sm font-bold mb-3">3. Selecciona la medida</h2>
            {medidasLoading && <p className="text-sm text-[#6b6f63]">Cargando medidas...</p>}
            {medidasError && <p className="text-sm text-red-600">{medidasError}</p>}
            {!medidasLoading && !medidasError && (
              <div className="flex flex-col gap-2">
                {medidas.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setIdMedidaSeleccionada(m.id)}
                    disabled={!m.medida}
                    className={`border rounded-lg px-4 py-3 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      idMedidaSeleccionada === m.id
                        ? "border-[#b8894a] bg-[#fbf3e8]"
                        : "border-[#e2ddd0] hover:border-[#b8894a]"
                    }`}
                  >
                    <span className="font-semibold">{m.medida ?? "Medida sin datos"}</span>
                  </button>
                ))}
                {medidas.length === 0 && (
                  <p className="text-sm text-[#6b6f63]">
                    No hay medidas disponibles para este tipo todavía.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Paso 4: Personalización */}
        {idMedidaSeleccionada && (
          <div className="bg-white border border-[#e2ddd0] rounded-xl p-5">
            <h2 className="text-sm font-bold mb-3">4. Personaliza tu producto</h2>

            {detalleLoading && <p className="text-sm text-[#6b6f63]">Cargando opciones...</p>}
            {detalleError && <p className="text-sm text-red-600">{detalleError}</p>}

            {/* ---- PAPEL ---- */}
            {!detalleLoading && detallePapel && (
              <div className="flex flex-col gap-5">
                {/* Material */}
                <div>
                  <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                    Material
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {detallePapel.grupos.map((g) => (
                      <button
                        key={g.idgrupo_papel}
                        onClick={() => setIdGrupoSeleccionado(g.idgrupo_papel)}
                        className={`border rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                          idGrupoSeleccionado === g.idgrupo_papel
                            ? "border-[#b8894a] bg-[#fbf3e8]"
                            : "border-[#e2ddd0] hover:border-[#b8894a]"
                        }`}
                      >
                        {g.material ?? "Material"}
                      </button>
                    ))}
                    {detallePapel.grupos.length === 0 && (
                      <p className="text-sm text-[#6b6f63] col-span-full">
                        Este producto no tiene materiales configurados.
                      </p>
                    )}
                  </div>
                </div>

                {/* Asa */}
                {detallePapel.asas.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                      Tipo de asa
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => setIdAsaSeleccionada(null)}
                        className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                          idAsaSeleccionada === null
                            ? "border-[#b8894a] bg-[#fbf3e8]"
                            : "border-[#e2ddd0] hover:border-[#b8894a]"
                        }`}
                      >
                        🚫 Sin asa
                      </button>
                      {detallePapel.asas.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setIdAsaSeleccionada(a.id)}
                          className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                            idAsaSeleccionada === a.id
                              ? "border-[#b8894a] bg-[#fbf3e8]"
                              : "border-[#e2ddd0] hover:border-[#b8894a]"
                          }`}
                        >
                          {a.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Laminado */}
                {detallePapel.laminados.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                      Laminado
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => setIdLaminadoSeleccionado(null)}
                        className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                          idLaminadoSeleccionado === null
                            ? "border-[#b8894a] bg-[#fbf3e8]"
                            : "border-[#e2ddd0] hover:border-[#b8894a]"
                        }`}
                      >
                        Sin laminado
                      </button>
                      {detallePapel.laminados.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setIdLaminadoSeleccionado(l.id)}
                          className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                            idLaminadoSeleccionado === l.id
                              ? "border-[#b8894a] bg-[#fbf3e8]"
                              : "border-[#e2ddd0] hover:border-[#b8894a]"
                          }`}
                        >
                          {l.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Textura */}
                <div>
                  <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                    Textura (opcional)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => setIdTexturaSeleccionada(null)}
                      className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                        idTexturaSeleccionada === null
                          ? "border-[#b8894a] bg-[#fbf3e8]"
                          : "border-[#e2ddd0] hover:border-[#b8894a]"
                      }`}
                    >
                      Sin textura
                    </button>
                    {detallePapel.texturas.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setIdTexturaSeleccionada(t.id)}
                        className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                          idTexturaSeleccionada === t.id
                            ? "border-[#b8894a] bg-[#fbf3e8]"
                            : "border-[#e2ddd0] hover:border-[#b8894a]"
                        }`}
                      >
                        {t.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Foil (hot stamping) */}
                <div>
                  <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                    Hot stamping / Foil (opcional)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => setIdFoilSeleccionado(null)}
                      className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                        idFoilSeleccionado === null
                          ? "border-[#b8894a] bg-[#fbf3e8]"
                          : "border-[#e2ddd0] hover:border-[#b8894a]"
                      }`}
                    >
                      Sin foil
                    </button>
                    {detallePapel.foils.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setIdFoilSeleccionado(f.id)}
                        className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                          idFoilSeleccionado === f.id
                            ? "border-[#b8894a] bg-[#fbf3e8]"
                            : "border-[#e2ddd0] hover:border-[#b8894a]"
                        }`}
                      >
                        {f.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* UV / Alto relieve */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={uv} onChange={(e) => setUv(e.target.checked)} />
                    UV
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={altoRelieve}
                      onChange={(e) => setAltoRelieve(e.target.checked)}
                    />
                    Alto relieve
                  </label>
                </div>

                {/* Tintas */}
                <div className="flex gap-4">
                  <label className="text-sm flex flex-col gap-1">
                    Tintas frente (0-6)
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={tintasFrente}
                      onChange={(e) =>
                        setTintasFrente(Math.min(6, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="border border-[#e2ddd0] rounded-lg px-3 py-2 w-28"
                    />
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    Tintas dentro (0-6)
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={tintasDentro}
                      onChange={(e) =>
                        setTintasDentro(Math.min(6, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="border border-[#e2ddd0] rounded-lg px-3 py-2 w-28"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* ---- PLÁSTICO ---- */}
            {!detalleLoading && detallePlastico && (
              <div>
                <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                  Número de tintas
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {detallePlastico.tintas.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setIdTintasPlastico(t.id)}
                      className={`border rounded-lg px-3 py-2 text-sm font-semibold text-center transition-colors ${
                        idTintasPlastico === t.id
                          ? "border-[#b8894a] bg-[#fbf3e8]"
                          : "border-[#e2ddd0] hover:border-[#b8894a]"
                      }`}
                    >
                      {t.cantidad}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paso 5: Cantidad */}
        {idMedidaSeleccionada && (
          <div className="bg-white border border-[#e2ddd0] rounded-xl p-5">
            <h2 className="text-sm font-bold mb-3">5. Selecciona la cantidad</h2>
            <div className="flex gap-2 flex-wrap mb-3">
              {[500, 1000, 3000, 5000, 10000].map((c) => (
                <button
                  key={c}
                  onClick={() => setCantidad(c)}
                  className={`border rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    cantidad === c
                      ? "border-[#b8894a] bg-[#fbf3e8] text-[#1e3a2b]"
                      : "border-[#e2ddd0] hover:border-[#b8894a]"
                  }`}
                >
                  {c.toLocaleString()} pzas
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              placeholder="Cantidad personalizada"
              value={cantidad ?? ""}
              onChange={(e) => setCantidad(Number(e.target.value) || null)}
              className="border border-[#e2ddd0] rounded-lg px-4 py-2 text-sm w-56"
            />
          </div>
        )}

        {/* Precio en vivo */}
        {payloadPrecio && (
          <div className="bg-[#1e3a2b] text-white rounded-xl p-5">
            <p className="text-xs uppercase text-[#e8c99a] font-bold mb-1">Precio estimado</p>
            {precioLoading && <p className="text-2xl font-extrabold">Calculando...</p>}
            {!precioLoading && precioError && (
              <p className="text-sm text-red-300">{precioError}</p>
            )}
            {!precioLoading && !precioError && precio && (
              <>
                {precio.disponible && precio.precio_unitario !== null ? (
                  <>
                    <p className="text-3xl font-extrabold">
                      ${precio.precio_unitario.toFixed(2)}{" "}
                      <span className="text-sm font-medium text-white/70">MXN / pza</span>
                    </p>
                    <button
                      onClick={() => setPanelIdentificacionAbierto(true)}
                      className="mt-4 bg-[#e8c99a] text-[#1e3a2b] font-bold px-5 py-3 rounded-lg hover:bg-white transition-colors"
                    >
                      + Agregar a cotización
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-[#e8c99a]">
                    {precio.mensaje ?? "Precio no disponible por el momento."}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Confirmación tras identificación — placeholder hasta Fase 4.5,
            donde esto se conecta al guardado real de la solicitud. */}
        {clienteIdentificado && (
          <div className="bg-white border border-[#3f7a52] rounded-xl p-5 text-sm text-[#1e3a2b]">
            ✅ Cliente identificado (id: {clienteIdentificado.clienteId}
            {clienteIdentificado.verificado ? "" : ", pendiente de verificación"}). El
            guardado de la cotización se conecta en el siguiente paso.
          </div>
        )}
      </div>

      <IdentificacionCliente
        abierto={panelIdentificacionAbierto}
        onCerrar={() => setPanelIdentificacionAbierto(false)}
        onCompletado={(resultado) => setClienteIdentificado(resultado)}
      />
    </div>
  );
}