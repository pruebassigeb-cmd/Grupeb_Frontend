import { useState, useEffect, useCallback } from "react";
import Modal from "../Modal";
import {
  getBultosPorProduccion,
  updateEstadoEnvio,
  deleteEnvio,
  agregarAlCarrito,
  getOrCreateNotaRemision,
} from "../../services/enviosService";
import type { BultoPedido, Envio } from "../../types/envios.types";
import type { PedidoSeguimiento } from "../../types/seguimiento.types";
import FormularioEnvioIndividual from "./FormularioEnvioIndividual";
import { generarNotaRemision } from "../../utils/generarNotaRemision";
import { showAlert } from "../CustomAlert";
import { showConfirm } from "../CustomConfirm";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS LOCALES
// ─────────────────────────────────────────────────────────────────────────────
interface BultoConEnvio extends BultoPedido {
  nombre_producto: string;
  medida:          string;
}

interface EnvioDetallado extends Envio {
  bultos_ids: number[];
}

interface DatosProduccion {
  bultos: BultoConEnvio[];
  envios: EnvioDetallado[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS VISUALES
// ─────────────────────────────────────────────────────────────────────────────
const ESTADO_ENVIO_BADGE: Record<string, string> = {
  preparando: "bg-yellow-100 text-yellow-800 border-yellow-300",
  en_camino:  "bg-blue-100  text-blue-800  border-blue-300",
  entregado:  "bg-green-100 text-green-700 border-green-300",
};
const ESTADO_ENVIO_LABEL: Record<string, string> = {
  preparando: "Preparando",
  en_camino:  "En camino",
  entregado:  "Entregado",
};

const ESTADO_BULTO_BADGE: Record<string, string> = {
  sin_enviar: "bg-orange-100 text-orange-700",
  preparando: "bg-yellow-100 text-yellow-800",
  en_camino:  "bg-blue-100  text-blue-800",
  entregado:  "bg-green-100 text-green-700",
};
const ESTADO_BULTO_LABEL: Record<string, string> = {
  sin_enviar: "Sin enviar",
  preparando: "Preparando",
  en_camino:  "En camino",
  entregado:  "Entregado",
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTE — TARJETA DE ENVÍO
// ─────────────────────────────────────────────────────────────────────────────
function TarjetaEnvio({
  envio,
  todosBultos,
  onCambiarEstado,
  onEliminar,
  onGenerarNota,
}: {
  envio:           EnvioDetallado;
  todosBultos:     BultoConEnvio[];
  onCambiarEstado: (id: number, estado: string) => Promise<void>;
  onEliminar:      (id: number) => Promise<void>;
  onGenerarNota:   (id: number) => Promise<void>;
}) {
  const bultosDelEnvio = todosBultos.filter(b => envio.bultos_ids.includes(b.idbulto));

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">

      {/* ── Cabecera del envío ── */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 flex-wrap gap-2 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{envio.tipo === "local" ? "🚚" : "📦"}</span>

          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ESTADO_ENVIO_BADGE[envio.estado] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
            {ESTADO_ENVIO_LABEL[envio.estado] ?? envio.estado}
          </span>

          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            envio.es_parcialidad
              ? "bg-orange-100 text-orange-700"
              : "bg-emerald-100 text-emerald-700"
          }`}>
            {envio.es_parcialidad ? "Parcialidad" : "Completo"}
          </span>

          <span className="text-xs text-gray-500">
            {envio.tipo === "local"
              ? `${envio.chofer?.nombre ?? "—"}  ·  ${envio.unidad?.nombre ?? "—"}`
              : `${envio.paqueteria?.nombre ?? "—"}${envio.numero_guia ? `  ·  Guía: ${envio.numero_guia}` : ""}`
            }
          </span>

          <span className="text-xs text-gray-400">
            {new Date(envio.fecha_envio).toLocaleDateString("es-MX")}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          {envio.tipo === "local" && (
            <button
              onClick={() => onGenerarNota(envio.idenvio)}
              className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-medium transition-colors">
              📄 Nota de remisión
            </button>
          )}
          {envio.estado === "preparando" && (
            <>
              <button
                onClick={() => onCambiarEstado(envio.idenvio, "en_camino")}
                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors">
                En camino
              </button>
              <button
                onClick={() => onEliminar(envio.idenvio)}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                Cancelar
              </button>
            </>
          )}
          {envio.estado === "en_camino" && (
            <button
              onClick={() => onCambiarEstado(envio.idenvio, "entregado")}
              className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-medium transition-colors">
              ✓ Entregado
            </button>
          )}
        </div>
      </div>

      {/* ── Bultos de este envío ── */}
      {bultosDelEnvio.length > 0 && (
        <div className="divide-y divide-gray-50">
          {bultosDelEnvio.map((b, idx) => (
            <div key={b.idbulto} className="flex items-center gap-3 px-4 py-2.5 text-xs">
              <span className="text-gray-400 font-medium w-6 shrink-0">#{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-700 font-medium">{b.nombre_producto}</span>
                {b.medida && <span className="text-gray-400 ml-1">({b.medida})</span>}
              </div>
              <span className="text-gray-500 whitespace-nowrap">
                {b.cantidad_unidades != null
                  ? `${b.cantidad_unidades.toLocaleString("es-MX")} pzas`
                  : b.peso_producto != null
                    ? `${b.peso_producto} kg`
                    : "—"
                }
              </span>
              {b.alto != null && b.largo != null && b.ancho != null && (
                <span className="text-gray-400 whitespace-nowrap hidden sm:inline">
                  {b.alto}×{b.largo}×{b.ancho} cm
                </span>
              )}
              {b.peso != null && (
                <span className="text-gray-400 whitespace-nowrap">{b.peso} kg bulto</span>
              )}
            </div>
          ))}
        </div>
      )}

      {bultosDelEnvio.length === 0 && (
        <p className="px-4 py-3 text-xs text-gray-400 italic">
          No se encontraron bultos asociados a este envío para esta orden.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTE — TABLA DE BULTOS PENDIENTES
// ─────────────────────────────────────────────────────────────────────────────
function TablaBultosPendientes({
  bultos,
  bultosEnCarrito,
  seleccionados,
  onToggle,
  onSeleccionarTodos,
}: {
  bultos:          BultoConEnvio[];
  bultosEnCarrito: Set<number>;
  seleccionados:   number[];
  onToggle:        (id: number) => void;
  onSeleccionarTodos: () => void;
}) {
  const disponibles = bultos.filter(
    b => b.estado_bulto === "sin_enviar" && !bultosEnCarrito.has(b.idbulto)
  );

  if (bultos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Esta orden aún no tiene bultos registrados.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700">
          Bultos de esta orden
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({bultos.length} total · {disponibles.length} disponibles para envío)
          </span>
        </h4>
        {disponibles.length > 0 && (
          <button
            onClick={onSeleccionarTodos}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
            {seleccionados.length === disponibles.length && disponibles.length > 0
              ? "Deseleccionar todos"
              : "Seleccionar todos"
            }
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["", "Bulto", "Producto", "Unidades", "Kg prod.", "Peso bulto", "Dimensiones", "Estado"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bultos.map((b, idx) => {
              const enCarrito  = bultosEnCarrito.has(b.idbulto);
              const disponible = b.estado_bulto === "sin_enviar" && !enCarrito;
              const seleccionado = seleccionados.includes(b.idbulto);

              return (
                <tr
                  key={b.idbulto}
                  onClick={() => disponible && onToggle(b.idbulto)}
                  className={[
                    "transition-colors",
                    disponible ? "hover:bg-blue-50 cursor-pointer" : "opacity-60",
                    seleccionado ? "bg-blue-50" : "",
                  ].join(" ")}>

                  <td className="px-3 py-2.5 w-8">
                    {enCarrito && (
                      <span title="En carrito de envío">🛒</span>
                    )}
                    {disponible && (
                      <input
                        type="checkbox"
                        readOnly
                        checked={seleccionado}
                        className="w-4 h-4 text-blue-600 rounded pointer-events-none"
                      />
                    )}
                  </td>

                  <td className="px-3 py-2.5 font-medium text-gray-700">
                    #{idx + 1}
                  </td>

                  <td className="px-3 py-2.5 text-gray-700">
                    <span className="font-medium">{b.nombre_producto}</span>
                    {b.medida && <span className="text-gray-400 ml-1">({b.medida})</span>}
                  </td>

                  <td className="px-3 py-2.5 text-center text-gray-700">
                    {b.cantidad_unidades != null
                      ? b.cantidad_unidades.toLocaleString("es-MX")
                      : "—"
                    }
                  </td>

                  <td className="px-3 py-2.5 text-center text-gray-700">
                    {b.peso_producto != null ? `${b.peso_producto} kg` : "—"}
                  </td>

                  <td className="px-3 py-2.5 text-center text-gray-700">
                    {b.peso != null ? `${b.peso} kg` : "—"}
                  </td>

                  <td className="px-3 py-2.5 text-center text-gray-400">
                    {b.alto != null && b.largo != null && b.ancho != null
                      ? `${b.alto}×${b.largo}×${b.ancho} cm`
                      : "—"
                    }
                  </td>

                  <td className="px-3 py-2.5 text-center">
                    {enCarrito ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        En carrito
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BULTO_BADGE[b.estado_bulto] ?? "bg-gray-100 text-gray-500"}`}>
                        {ESTADO_BULTO_LABEL[b.estado_bulto] ?? b.estado_bulto}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  pedido:   PedidoSeguimiento;
  onClose:  () => void;
  onActualizar: () => void;
}

export default function ModalEnvioSeguimiento({ pedido, onClose, onActualizar }: Props) {

  const [datos,        setDatos]        = useState<DatosProduccion | null>(null);
  const [cargando,     setCargando]     = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [agregando,    setAgregando]    = useState(false);
  const [bultosEnCarrito, setBultosEnCarrito] = useState<Set<number>>(new Set());
  const [modalCrearEnvio, setModalCrearEnvio] = useState(false);

  // ── Construir objeto PedidoDisponible-like para pasar a FormularioEnvioIndividual ──
  // Necesitamos idsolicitud y datos de dirección; los tenemos en PedidoSeguimiento
  const pedidoParaFormulario = {
    idsolicitud:              pedido.idsolicitud,
    no_pedido:                pedido.no_pedido,
    fecha:                    pedido.fecha,
    idclientes:               0,
    empresa:                  (pedido as any).empresa ?? "",
    razon_social:             (pedido as any).razon_social ?? "",
    impresion:                pedido.impresion ?? "",
    telefono:                 (pedido as any).telefono ?? "",
    celular:                  (pedido as any).celular ?? "",
    calle:                    (pedido as any).calle ?? "",
    numero:                   (pedido as any).numero ?? "",
    colonia:                  (pedido as any).colonia ?? "",
    codigo_postal:            (pedido as any).codigo_postal ?? "",
    poblacion:                (pedido as any).poblacion ?? "",
    estado:                   (pedido as any).estado_cliente ?? "",
    referencia_envio:         null,
    total_bultos:             0,
    bultos_enviados:          0,
    bultos_pendientes:        0,
    estado_envio:             "sin_iniciar" as const,
    completado_recientemente: false,
  };

  const cargar = useCallback(async () => {
    if (!pedido.idproduccion) return;
    setCargando(true);
    setError(null);
    try {
      const data = await getBultosPorProduccion(pedido.idsolicitud, pedido.idproduccion);
      // Enriquecer envios con los ids de sus bultos
      const enviosEnriquecidos: EnvioDetallado[] = data.envios.map(e => ({
        ...e,
        bultos_ids: data.bultos
          .filter(b => b.idenvio === e.idenvio)
          .map(b => b.idbulto),
      }));
      setDatos({ bultos: data.bultos as BultoConEnvio[], envios: enviosEnriquecidos });
      // Detectar bultos en carrito (estado "preparando" y en algún envío con estado preparando)
      const enCarrito = new Set(
        data.bultos
          .filter(b => b.estado_bulto === "preparando")
          .map(b => b.idbulto)
      );
      setBultosEnCarrito(enCarrito);
    } catch {
      setError("No se pudo cargar la información de envíos para esta orden.");
    } finally {
      setCargando(false);
    }
  }, [pedido.idsolicitud, pedido.idproduccion]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Handlers ──
  const handleCambiarEstado = async (idenvio: number, estado: string) => {
    try {
      await updateEstadoEnvio(idenvio, estado);
      await cargar();
      onActualizar();
    } catch {
      showAlert("Error al cambiar estado del envío.");
    }
  };

  const handleEliminar = async (idenvio: number) => {
    if (!await showConfirm("¿Cancelar este envío? Esta acción no se puede deshacer.")) return;
    try {
      await deleteEnvio(idenvio);
      await cargar();
      onActualizar();
    } catch {
      showAlert("Error al cancelar el envío.");
    }
  };

  const handleGenerarNota = async (idenvio: number) => {
    try {
      const nota = await getOrCreateNotaRemision(idenvio);
      await generarNotaRemision(nota);
    } catch {
      showAlert("Error al generar nota de remisión.");
    }
  };

  const handleToggleBulto = (idbulto: number) => {
    setSeleccionados(prev =>
      prev.includes(idbulto) ? prev.filter(b => b !== idbulto) : [...prev, idbulto]
    );
  };

  const handleSeleccionarTodos = () => {
    if (!datos) return;
    const disponibles = datos.bultos
      .filter(b => b.estado_bulto === "sin_enviar" && !bultosEnCarrito.has(b.idbulto))
      .map(b => b.idbulto);
    setSeleccionados(prev =>
      prev.length === disponibles.length ? [] : disponibles
    );
  };

  const handleAgregarAlCarrito = async () => {
    if (seleccionados.length === 0) return;
    setAgregando(true);
    try {
      await agregarAlCarrito(seleccionados, pedido.idsolicitud);
      setSeleccionados([]);
      await cargar();
      showAlert("Bultos agregados al carrito de envío correctamente.");
    } catch {
      showAlert("Error al agregar los bultos al carrito.");
    } finally {
      setAgregando(false);
    }
  };

  // ── Resumen de estado ──
  const totalBultos     = datos?.bultos.length ?? 0;
  const bultosEntregados = datos?.bultos.filter(b => b.estado_bulto === "entregado").length ?? 0;
  const bultosEnCamino  = datos?.bultos.filter(b => b.estado_bulto === "en_camino").length ?? 0;
  const bultosPreparando = datos?.bultos.filter(b => b.estado_bulto === "preparando").length ?? 0;
  const bultosSinEnviar = datos?.bultos.filter(
    b => b.estado_bulto === "sin_enviar" && !bultosEnCarrito.has(b.idbulto)
  ).length ?? 0;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Envío — Orden ${pedido.no_produccion ?? pedido.no_pedido}`}>

      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

        {/* ── Info del pedido/orden ── */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-gray-800 text-sm">
                {pedido.cliente}
                {pedido.impresion && (
                  <span className="text-gray-500 font-normal ml-2 text-xs">({pedido.impresion})</span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Pedido: <span className="font-medium text-blue-600">{pedido.no_pedido}</span>
                {pedido.no_produccion && (
                  <> · Orden: <span className="font-medium text-gray-700">{pedido.no_produccion}</span></>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {pedido.nombre_producto}
                {pedido.medida && <span className="ml-1 text-gray-400">· {pedido.medida}</span>}
              </p>
            </div>

            {/* Resumen compacto de bultos */}
            {!cargando && datos && totalBultos > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {bultosEntregados > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium">
                    ✓ {bultosEntregados} entregado{bultosEntregados !== 1 ? "s" : ""}
                  </span>
                )}
                {bultosEnCamino > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 font-medium">
                    🚚 {bultosEnCamino} en camino
                  </span>
                )}
                {bultosPreparando > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 font-medium">
                    ⏳ {bultosPreparando} preparando
                  </span>
                )}
                {bultosSinEnviar > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-orange-100 text-orange-700 font-medium">
                    ○ {bultosSinEnviar} sin enviar
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Loading ── */}
        {cargando && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Cargando información de envíos...</p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && !cargando && (
          <div className="flex flex-col items-center py-8 gap-3">
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button
              onClick={cargar}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
              Reintentar
            </button>
          </div>
        )}

        {/* ── Orden sin producción ── */}
        {!cargando && !error && !pedido.idproduccion && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm font-medium text-gray-600">Esta orden aún no tiene producción generada.</p>
            <p className="text-xs text-gray-400 mt-1">Los envíos estarán disponibles cuando se genere la orden de producción.</p>
          </div>
        )}

        {/* ── CONTENIDO PRINCIPAL ── */}
        {!cargando && !error && datos && (

          <>
            {/* ────────────────────────────────────────────
                SECCIÓN 1 — Envíos registrados para esta orden
            ──────────────────────────────────────────── */}
            {datos.envios.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                    {datos.envios.length}
                  </span>
                  Envío{datos.envios.length !== 1 ? "s" : ""} registrado{datos.envios.length !== 1 ? "s" : ""} para esta orden
                </h3>
                <div className="space-y-3">
                  {datos.envios.map(envio => (
                    <TarjetaEnvio
                      key={envio.idenvio}
                      envio={envio}
                      todosBultos={datos.bultos}
                      onCambiarEstado={handleCambiarEstado}
                      onEliminar={handleEliminar}
                      onGenerarNota={handleGenerarNota}
                    />
                  ))}
                </div>
              </div>
            )}

            {datos.envios.length === 0 && totalBultos > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700 text-center">
                Esta orden tiene bultos registrados pero ningún envío creado aún.
              </div>
            )}

            {/* ────────────────────────────────────────────
                SECCIÓN 2 — Bultos (todos, con estado)
            ──────────────────────────────────────────── */}
            <TablaBultosPendientes
              bultos={datos.bultos}
              bultosEnCarrito={bultosEnCarrito}
              seleccionados={seleccionados}
              onToggle={handleToggleBulto}
              onSeleccionarTodos={handleSeleccionarTodos}
            />

            {/* ────────────────────────────────────────────
                SECCIÓN 3 — Barra de acciones cuando hay selección
            ──────────────────────────────────────────── */}
            {seleccionados.length > 0 && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 gap-3 flex-wrap">
                <span className="text-sm font-medium text-blue-700">
                  {seleccionados.length} bulto{seleccionados.length !== 1 ? "s" : ""} seleccionado{seleccionados.length !== 1 ? "s" : ""}
                </span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setModalCrearEnvio(true)}
                    className="px-3 py-1.5 border border-blue-600 text-blue-600 text-sm rounded-lg hover:bg-blue-100 font-medium transition-colors">
                    Enviar ahora
                  </button>
                  <button
                    onClick={handleAgregarAlCarrito}
                    disabled={agregando}
                    className="px-3 py-1.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                    {agregando
                      ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Agregando...</>
                      : <>🛒 Agregar al carrito</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────
                ESTADO VACÍO — sin bultos
            ──────────────────────────────────────────── */}
            {totalBultos === 0 && (
              <div className="text-center py-10 text-gray-400">
                <p className="text-4xl mb-3">📦</p>
                <p className="text-sm font-medium text-gray-600">
                  Aún no hay bultos registrados para esta orden.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Los bultos se registran al finalizar el proceso de bolseo o asa flexible.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-4">
        <button
          onClick={() => { cargar(); }}
          disabled={cargando}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors">
          <svg className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors">
          Cerrar
        </button>
      </div>

      {/* ── Modal de crear envío ── */}
      {modalCrearEnvio && (
        <Modal isOpen onClose={() => setModalCrearEnvio(false)} title="Registrar Envío">
          <FormularioEnvioIndividual
            pedido={pedidoParaFormulario as any}
            bultosIds={seleccionados}
            onSuccess={async (idenvioNuevo) => {
              setModalCrearEnvio(false);
              setSeleccionados([]);
              await cargar();
              onActualizar();
              if (idenvioNuevo) {
                try {
                  const nota = await getOrCreateNotaRemision(idenvioNuevo);
                  await generarNotaRemision(nota);
                } catch { /* silencioso */ }
              }
            }}
            onCancel={() => setModalCrearEnvio(false)}
          />
        </Modal>
      )}
    </Modal>
  );
}