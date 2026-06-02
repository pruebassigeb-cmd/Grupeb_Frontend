// src/components/ModalRepetirPedido.tsx
import { useState } from "react";
import { searchClientes } from "../services/clientesService";
import { getHistorialPedidosPorCliente } from "../services/pedidosService";
import type { ClienteBusqueda } from "../types/clientes.types";
import type { Pedido } from "../types/cotizaciones.types";

interface Props {
  onSeleccionar: (pedido: Pedido) => void;
  onClose:       () => void;
}

type Paso = "cliente" | "historial";

export default function ModalRepetirPedido({ onSeleccionar, onClose }: Props) {
  const [paso, setPaso]                     = useState<Paso>("cliente");
  const [busqueda, setBusqueda]             = useState("");
  const [clientes, setClientes]             = useState<ClienteBusqueda[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteBusqueda | null>(null);
  const [historial, setHistorial]           = useState<Pedido[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [expandidos, setExpandidos]         = useState<Set<string>>(new Set());

  // ── Buscar clientes ──────────────────────────────────────────────────────
  const buscarClientes = async (q: string) => {
    if (!q.trim()) { setClientes([]); return; }
    setLoadingClientes(true);
    try {
      setClientes(await searchClientes(q));
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusqueda(e.target.value);
    clearTimeout((handleBusquedaChange as any)._t);
    (handleBusquedaChange as any)._t = setTimeout(() => buscarClientes(e.target.value), 400);
  };

  // ── Seleccionar cliente y cargar historial ───────────────────────────────
  const seleccionarCliente = async (cliente: ClienteBusqueda) => {
    setClienteSeleccionado(cliente);
    setLoadingHistorial(true);
    setPaso("historial");
    try {
      const data = await getHistorialPedidosPorCliente(cliente.idclientes);
      setHistorial(data);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const toggleExpandido = (folio: string) => {
    setExpandidos(prev => {
      const s = new Set(prev);
      s.has(folio) ? s.delete(folio) : s.add(folio);
      return s;
    });
  };

  const formatFecha = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("es-MX", {
        day: "2-digit", month: "short", year: "numeric",
      });
    } catch { return iso; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {paso === "historial" && (
              <button onClick={() => { setPaso("cliente"); setHistorial([]); setClienteSeleccionado(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Repetir Pedido</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {paso === "cliente"
                  ? "Busca el cliente para ver su historial"
                  : `Historial de ${clienteSeleccionado?.empresa || clienteSeleccionado?.atencion}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── PASO 1: buscar cliente ── */}
          {paso === "cliente" && (
            <div className="p-6">
              <div className="relative mb-4">
                <input autoFocus type="text" value={busqueda} onChange={handleBusquedaChange}
                  placeholder="Buscar por nombre, empresa, teléfono..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {loadingClientes && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent" />
                </div>
              )}

              {!loadingClientes && clientes.length === 0 && busqueda.length > 1 && (
                <p className="text-center text-gray-400 py-8">No se encontraron clientes</p>
              )}

              {!loadingClientes && clientes.length === 0 && busqueda.length <= 1 && (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                  <p className="text-sm">Escribe para buscar un cliente</p>
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {clientes.map(c => (
                  <button key={c.idclientes} onClick={() => seleccionarCliente(c)}
                    className="w-full text-left px-4 py-3 hover:bg-purple-50 rounded-lg transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900 text-sm">
                        {c.atencion || c.empresa || "Sin nombre"}
                      </span>
                      {c.identificar && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          {c.identificar}
                        </span>
                      )}
                    </div>
                    {c.empresa && c.atencion && (
                      <p className="text-xs text-gray-500 mt-0.5">{c.empresa}</p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      {c.telefono && <span>{c.telefono}</span>}
                      {c.correo   && <span>{c.correo}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PASO 2: historial de pedidos ── */}
          {paso === "historial" && (
            <div className="p-6">
              {loadingHistorial && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
                  <p className="text-sm text-gray-500">Cargando historial...</p>
                </div>
              )}

              {!loadingHistorial && historial.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">Este cliente no tiene pedidos registrados</p>
                </div>
              )}

              <div className="space-y-3">
                {historial.map(ped => {
                  const expandido = expandidos.has(ped.no_pedido);
                  return (
                    <div key={ped.no_pedido}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:border-purple-300 transition-colors">

                      {/* Cabecera del pedido */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-bold text-gray-900 text-sm shrink-0">{ped.no_pedido}</span>
                          <span className="text-xs text-gray-400 shrink-0">{formatFecha(ped.fecha)}</span>
                          <span className="text-xs text-gray-500 truncate">
                            {ped.productos.length} producto{ped.productos.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-sm font-semibold text-gray-800 shrink-0">
                            ${ped.total.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {/* Toggle detalle */}
                          <button onClick={() => toggleExpandido(ped.no_pedido)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                            title="Ver detalle">
                            <svg className={`w-4 h-4 transition-transform ${expandido ? "rotate-180" : ""}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {/* Botón principal */}
                          <button onClick={() => onSeleccionar(ped)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Repetir
                          </button>
                        </div>
                      </div>

                      {/* Detalle expandible */}
                      {expandido && (
                        <div className="px-4 py-3 border-t border-gray-100 bg-white space-y-2">
                          {ped.productos.map((p: any, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                                <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-0.5">
                                  {p.material    && <span>{p.material}</span>}
                                  {p.calibre     && <span>Cal. {p.calibre}</span>}
                                  {p.tintas      && <span>{p.tintas} tinta{p.tintas > 1 ? "s" : ""}</span>}
                                  {p.asa_suaje   && <span>Suaje: {p.asa_suaje}</span>}
                                </div>
                                {p.detalles?.map((d: any, j: number) => (
                                  <p key={j} className="text-xs text-gray-500 mt-0.5">
                                    {d.modo_cantidad === "kilo"
                                      ? `${d.kilogramos} kg`
                                      : `${d.cantidad.toLocaleString()} bolsas`}
                                    {" — "}${d.precio_total.toFixed(2)}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}