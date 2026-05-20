import { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import {
  getPedidosDisponibles, getBultosPedido, getEnviosPedido,
  agregarAlCarrito, updateEstadoEnvio, deleteEnvio,
  getOrCreateNotaRemision,
} from "../services/enviosService";
import { generarNotaRemision } from "../utils/generarNotaRemision";
import {
  ESTADO_ENVIO_BADGE, ESTADO_ENVIO_LABEL,
  ESTADO_BULTO_BADGE, ESTADO_BULTO_LABEL,
  ESTADO_BADGE, ESTADO_LABEL,
  buildMapsUrl, copiarLink,
} from "./enviosConstants";
import FormularioEnvioIndividual from "./FormularioEnvioIndividual";
import type { PedidoDisponible, BultoPedido, Envio, CarritoPedido } from "../types/envios.types";
import { showAlert } from './CustomAlert';
import { showConfirm } from './CustomConfirm';



interface Props {
  carrito: CarritoPedido[];
  onCarritoChange: () => Promise<void>;
}

/** Devuelve el texto descriptivo del envío para mostrarlo en la lista */
const getDescripcionEnvio = (envio: Envio): string => {
  if (envio.tipo === "recoleccion") return "Recolección en planta";
  if (envio.tipo === "local")
    return `${envio.chofer?.nombre ?? "-"} — ${envio.unidad?.nombre ?? "-"}`;
  return `${envio.paqueteria?.nombre ?? "-"}${envio.numero_guia ? ` · Guía: ${envio.numero_guia}` : ""}`;
};

/** Devuelve true cuando aplica mostrar la nota de remisión */
const mostrarNota = (envio: Envio): boolean =>
  envio.tipo === "local" || envio.tipo === "recoleccion";

export default function TabEnvios({ carrito, onCarritoChange }: Props) {
  const [pedidos, setPedidos] = useState<PedidoDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [pedidoExpandido, setPedidoExpandido] = useState<number | null>(null);
  const [bultos, setBultos] = useState<BultoPedido[]>([]);
  const [enviosPedido, setEnviosPedido] = useState<Envio[]>([]);
  const [loadingBultos, setLoadingBultos] = useState(false);
  const [bultosSeleccionados, setBultosSeleccionados] = useState<number[]>([]);
  const [modalCrearEnvio, setModalCrearEnvio] = useState<PedidoDisponible | null>(null);
  const [agregando, setAgregando] = useState(false);

  const bultosEnCarrito = new Set(carrito.flatMap(p => p.bultos.map(b => b.idbulto)));

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try { setPedidos(await getPedidosDisponibles()); }
    catch { showAlert("Error al cargar pedidos"); }
    finally { setLoading(false); }
  };

  const recargarDetalle = useCallback(async (idsolicitud: number) => {
    const [b, e] = await Promise.all([
      getBultosPedido(idsolicitud),
      getEnviosPedido(idsolicitud),
    ]);
    setBultos(b);
    setEnviosPedido(e);
  }, []);

  const expandirPedido = async (pedido: PedidoDisponible) => {
    if (pedidoExpandido === pedido.idsolicitud) {
      setPedidoExpandido(null);
      setBultos([]);
      setEnviosPedido([]);
      setBultosSeleccionados([]);
      return;
    }
    setPedidoExpandido(pedido.idsolicitud);
    setBultosSeleccionados([]);
    setLoadingBultos(true);
    try { await recargarDetalle(pedido.idsolicitud); }
    catch { showAlert("Error al cargar bultos"); }
    finally { setLoadingBultos(false); }
  };

  const toggleBulto = (idbulto: number) => {
    setBultosSeleccionados(prev =>
      prev.includes(idbulto) ? prev.filter(b => b !== idbulto) : [...prev, idbulto]
    );
  };

  const seleccionarTodos = () => {
    const disponibles = bultos
      .filter(b => b.estado_bulto === "sin_enviar" && !bultosEnCarrito.has(b.idbulto))
      .map(b => b.idbulto);
    setBultosSeleccionados(prev =>
      prev.length === disponibles.length ? [] : disponibles
    );
  };

  const handleAgregarAlCarrito = async (pedido: PedidoDisponible) => {
    if (bultosSeleccionados.length === 0) return;
    setAgregando(true);
    try {
      await agregarAlCarrito(bultosSeleccionados, pedido.idsolicitud);
      await onCarritoChange();
      setBultosSeleccionados([]);
      await recargarDetalle(pedido.idsolicitud);
    } catch { showAlert("Error al agregar al carrito"); }
    finally { setAgregando(false); }
  };

  const handleCambiarEstado = async (idenvio: number, estado: string) => {
    try {
      await updateEstadoEnvio(idenvio, estado);
      if (pedidoExpandido) await recargarDetalle(pedidoExpandido);
      await cargar();
    } catch { showAlert("Error al cambiar estado"); }
  };

  const handleEliminarEnvio = async (idenvio: number) => {
    if (!await showConfirm("¿Cancelar este envío?")) return;
    try {
      await deleteEnvio(idenvio);
      if (pedidoExpandido) await recargarDetalle(pedidoExpandido);
      await cargar();
    } catch { showAlert("Error al cancelar envío"); }
  };

  const handleGenerarNota = async (idenvio: number) => {
    try {
      const nota = await getOrCreateNotaRemision(idenvio);
      await generarNotaRemision(nota);
    } catch { showAlert("Error al generar nota de remisión"); }
  };

  const numeroBulto = (idbulto: number) => bultos.findIndex(b => b.idbulto === idbulto) + 1;

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{pedidos.length} pedido(s) disponible(s) para envío</p>
        <button onClick={cargar} className="text-sm text-blue-600 hover:text-blue-800">Actualizar</button>
      </div>

      {pedidos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No hay pedidos disponibles para envío en este momento.
        </div>
      ) : pedidos.map(pedido => (
        <div key={pedido.idsolicitud} className="bg-white rounded-lg shadow overflow-hidden">

          {/* CABECERA */}
          <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => expandirPedido(pedido)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-blue-600 font-bold text-sm">{pedido.no_pedido}</span>
                <span className="text-gray-900 font-medium">{pedido.impresion || pedido.empresa}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_ENVIO_BADGE[pedido.estado_envio]}`}>
                  {ESTADO_ENVIO_LABEL[pedido.estado_envio]}
                </span>
                {pedido.completado_recientemente && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                    Completado recientemente
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{pedido.total_bultos} bultos</span>
                <span className="text-yellow-600">{pedido.bultos_pendientes} pendientes</span>
                <span className="text-green-600">{pedido.bultos_enviados} enviados</span>
                <span className="text-gray-400">{pedidoExpandido === pedido.idsolicitud ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Dirección */}
            <div className="mt-2 flex items-center gap-3 flex-wrap" onClick={e => e.stopPropagation()}>
              <span className="text-xs text-gray-500">
                {[pedido.calle, pedido.numero, pedido.colonia, pedido.poblacion, pedido.estado]
                  .filter(Boolean).join(", ")}
                {pedido.referencia_envio && (
                  <span className="ml-2 text-indigo-500">({pedido.referencia_envio})</span>
                )}
              </span>
              <a href={buildMapsUrl(pedido.calle, pedido.numero, pedido.colonia, pedido.poblacion, pedido.estado, pedido.codigo_postal)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 whitespace-nowrap">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Maps
              </a>
              <button
                onClick={() => copiarLink(buildMapsUrl(pedido.calle, pedido.numero, pedido.colonia, pedido.poblacion, pedido.estado, pedido.codigo_postal))}
                className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 whitespace-nowrap">
                Copiar link
              </button>
            </div>
          </div>

          {/* DETALLE EXPANDIDO */}
          {pedidoExpandido === pedido.idsolicitud && (
            <div className="border-t border-gray-100 p-4">
              {loadingBultos ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">

                  {/* Envíos existentes */}
                  {enviosPedido.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Envíos registrados</h4>
                      <div className="space-y-2">
                        {enviosPedido.map(envio => (
                          <div key={envio.idenvio}
                            className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm gap-3 flex-wrap">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[envio.estado]}`}>
                                {ESTADO_LABEL[envio.estado]}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                envio.es_parcialidad
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-green-100 text-green-700"
                              }`}>
                                {envio.es_parcialidad ? "Parcialidad" : "Completo"}
                              </span>
                              {/* Badge tipo recolección */}
                              {envio.tipo === "recoleccion" && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                  📦 Recolección
                                </span>
                              )}
                              <span className="text-gray-700">
                                {getDescripcionEnvio(envio)}
                              </span>
                              <span className="text-gray-400 text-xs">{envio.total_bultos} bulto(s)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {mostrarNota(envio) && (
                                <button onClick={() => handleGenerarNota(envio.idenvio)}
                                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium">
                                  Nota de remisión
                                </button>
                              )}
                              {/* Cancelar SOLO mientras sigue preparando */}
                              {envio.estado === "preparando" && (
                                <button
                                  onClick={() => handleEliminarEnvio(envio.idenvio)}
                                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tabla bultos */}
                  {pedido.bultos_pendientes > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">Bultos</h4>
                        <button onClick={seleccionarTodos}
                          className="text-xs text-blue-600 hover:text-blue-800">
                          {bultosSeleccionados.length ===
                            bultos.filter(b => b.estado_bulto === "sin_enviar" && !bultosEnCarrito.has(b.idbulto)).length
                            ? "Deseleccionar todos"
                            : "Seleccionar todos disponibles"
                          }
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              {["", "Bulto", "Producto", "Unidades", "Kg prod.", "Peso bulto", "Dimensiones", "Estado"].map(h => (
                                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {bultos.map(bulto => {
                              const enCarrito = bultosEnCarrito.has(bulto.idbulto);
                              const disponible = bulto.estado_bulto === "sin_enviar" && !enCarrito;
                              return (
                                <tr key={bulto.idbulto}
                                  className={disponible ? "hover:bg-blue-50 cursor-pointer" : "opacity-60"}
                                  onClick={() => disponible && toggleBulto(bulto.idbulto)}>
                                  <td className="px-3 py-2">
                                    {disponible && (
                                      <input type="checkbox" readOnly
                                        checked={bultosSeleccionados.includes(bulto.idbulto)}
                                        className="w-4 h-4 text-blue-600 rounded" />
                                    )}
                                    {enCarrito && <span title="En carrito" className="text-orange-400">🛒</span>}
                                  </td>
                                  <td className="px-3 py-2 font-medium text-gray-700">#{numeroBulto(bulto.idbulto)}</td>
                                  <td className="px-3 py-2 text-gray-600">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span>{bulto.nombre_producto} {bulto.medida && `(${bulto.medida})`}</span>
                                      {(bulto as any).descripcion && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                          {(bulto as any).descripcion}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700">
                                    {bulto.cantidad_unidades != null ? bulto.cantidad_unidades.toLocaleString("es-MX") : "-"}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700">
                                    {bulto.peso_producto != null ? `${bulto.peso_producto} kg` : "-"}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700">
                                    {bulto.peso != null ? `${bulto.peso} kg` : "-"}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-500">
                                    {[bulto.alto, bulto.largo, bulto.ancho].every(v => v != null)
                                      ? `${bulto.alto}×${bulto.largo}×${bulto.ancho} cm`
                                      : "-"
                                    }
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {enCarrito
                                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">En carrito</span>
                                      : <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BULTO_BADGE[bulto.estado_bulto]}`}>
                                        {ESTADO_BULTO_LABEL[bulto.estado_bulto]}
                                      </span>
                                    }
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {bultosSeleccionados.length > 0 && (
                        <div className="mt-3 flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3">
                          <span className="text-sm text-blue-700 font-medium">
                            {bultosSeleccionados.length} bulto(s) seleccionado(s)
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => setModalCrearEnvio(pedido)}
                              className="px-3 py-2 border border-blue-600 text-blue-600 text-sm rounded-lg hover:bg-blue-50">
                              Enviar ahora
                            </button>
                            <button onClick={() => handleAgregarAlCarrito(pedido)} disabled={agregando}
                              className="px-3 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {agregando ? "Agregando..." : "Agregar al carrito"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {modalCrearEnvio && (
        <Modal isOpen={!!modalCrearEnvio} onClose={() => setModalCrearEnvio(null)} title="Registrar Envío">
          <FormularioEnvioIndividual
            pedido={modalCrearEnvio}
            bultosIds={bultosSeleccionados}
            onSuccess={async (idenvioNuevo) => {
              setModalCrearEnvio(null);
              setBultosSeleccionados([]);
              await cargar();
              if (pedidoExpandido) await recargarDetalle(pedidoExpandido);
              if (idenvioNuevo) {
                try {
                  const nota = await getOrCreateNotaRemision(idenvioNuevo);
                  await generarNotaRemision(nota);
                } catch { /* silencioso */ }
              }
            }}
            onCancel={() => setModalCrearEnvio(null)}
          />
        </Modal>
      )}
    </div>
  );
}