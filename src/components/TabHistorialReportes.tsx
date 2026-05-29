import { useState, useEffect } from "react";
import {
  getClientesRemisiones, getPedidosClienteRemisiones, getHistorialEntregas,
  getOrCreateNotaRemision, getNotaRemisionMulti,
} from "../services/enviosService";
import { generarReporteRemisiones } from "../utils/generarReporteRemisiones";
import { generarNotaRemision, generarNotaRemisionMulti } from "../utils/generarNotaRemision";
import type {
  ClienteRemision, PedidoRemision, HistorialEntregasPedido,
} from "../types/envios.types";
import { showAlert } from "./CustomAlert";

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtNum = (n: number) => n.toLocaleString("es-MX");

// Función para formatear cantidades con decimales (sin redondear)
const fmtCant = (n: number) =>
  Number.isInteger(n)
    ? n.toLocaleString("es-MX")
    : n.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function SeccionRemisiones() {
  const [clientes, setClientes] = useState<ClienteRemision[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [clienteExpandido, setClienteExpandido] = useState<number | null>(null);
  const [pedidosCliente, setPedidosCliente] = useState<PedidoRemision[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState<number[]>([]);
  const [historial, setHistorial] = useState<HistorialEntregasPedido[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [vistaHistorial, setVistaHistorial] = useState(false);
  const [clienteActivo, setClienteActivo] = useState<ClienteRemision | null>(null);
  const [descargandoNota, setDescargandoNota] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    getClientesRemisiones()
      .then(setClientes)
      .catch(() => showAlert("Error al cargar clientes"))
      .finally(() => setLoadingClientes(false));
  }, []);

  const clientesFiltrados = clientes.filter(c => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return c.nombre.toLowerCase().includes(q) || (c.empresa ?? "").toLowerCase().includes(q);
  });

  const expandirCliente = async (cliente: ClienteRemision) => {
    if (clienteExpandido === cliente.idclientes) {
      setClienteExpandido(null);
      setPedidosCliente([]);
      setPedidosSeleccionados([]);
      setVistaHistorial(false);
      setHistorial([]);
      setClienteActivo(null);
      return;
    }
    setClienteExpandido(cliente.idclientes);
    setClienteActivo(cliente);
    setPedidosSeleccionados([]);
    setVistaHistorial(false);
    setHistorial([]);
    setLoadingPedidos(true);
    try {
      setPedidosCliente(await getPedidosClienteRemisiones(cliente.idclientes));
    } catch {
      showAlert("Error al cargar pedidos del cliente");
    } finally {
      setLoadingPedidos(false);
    }
  };

  const togglePedido = (idsolicitud: number) =>
    setPedidosSeleccionados(prev =>
      prev.includes(idsolicitud) ? prev.filter(id => id !== idsolicitud) : [...prev, idsolicitud]
    );

  const seleccionarTodos = () =>
    setPedidosSeleccionados(
      pedidosSeleccionados.length === pedidosCliente.length ? [] : pedidosCliente.map(p => p.idsolicitud)
    );

  const verHistorial = async () => {
    const ids = pedidosSeleccionados.length > 0 ? pedidosSeleccionados : pedidosCliente.map(p => p.idsolicitud);
    setLoadingHistorial(true);
    try {
      const data = await getHistorialEntregas(ids);
      setHistorial(data);
      if (pedidosSeleccionados.length === 0) setPedidosSeleccionados(ids);
      setVistaHistorial(true);
    } catch {
      showAlert("Error al cargar historial de entregas");
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handlePDF = async () => {
    if (!historial.length || !clienteActivo) return;
    await generarReporteRemisiones({
      cliente: clienteActivo.nombre,
      pedidos: pedidosCliente,
      historial,
      pedidosSeleccionados,
    });
  };

  const descargarNota = async (entrega: any) => {
    if (!entrega?.nota_no) { showAlert("Esta entrega no tiene nota de remisión"); return; }
    const loadingKey = `${entrega.es_multi ? "multi" : "simple"}-${entrega.idnota ?? entrega.id_nota ?? entrega.nota_id ?? entrega.idenvio}`;
    setDescargandoNota(loadingKey);
    try {
      if (entrega.es_multi) {
        const idnota = entrega.idnota ?? entrega.id_nota ?? entrega.nota_id ?? entrega.nota_idnota;
        if (!idnota) { showAlert("No se encontró el ID de la nota multi."); return; }
        await generarNotaRemisionMulti(await getNotaRemisionMulti(Number(idnota)));
        return;
      }
      if (!entrega.idenvio) { showAlert("No se encontró el ID del envío"); return; }
      await generarNotaRemision(await getOrCreateNotaRemision(Number(entrega.idenvio)));
    } catch (error: any) {
      showAlert(error?.response?.data?.error || "Error al descargar nota de remisión");
    } finally {
      setDescargandoNota(null);
    }
  };

  if (loadingClientes) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── VISTA HISTORIAL ──
  if (vistaHistorial && clienteActivo) {
    const pedidosMap = new Map(pedidosCliente.map(p => [p.idsolicitud, p]));
    const historialMap = new Map(historial.map(h => [h.idsolicitud, h]));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => { setVistaHistorial(false); setHistorial([]); }}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1">
              ← Volver a selección
            </button>
            <h3 className="font-semibold text-gray-800">{clienteActivo.nombre}</h3>
            <p className="text-xs text-gray-500">{pedidosSeleccionados.length} pedido(s) seleccionado(s)</p>
          </div>
          <button onClick={handlePDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
            Descargar reporte
          </button>
        </div>

        {pedidosSeleccionados.map(idsolicitud => {
          const pedido = pedidosMap.get(idsolicitud);
          const hEntregas = historialMap.get(idsolicitud);
          if (!pedido || !hEntregas) return null;

          // Calcular totales fuera del JSX para mayor claridad
          const totKg = hEntregas.entregas.reduce((s, e: any) => {
            if (e.productos_detalle?.length > 0)
              return s + e.productos_detalle.filter((p: any) => p.modo_cantidad === "kilo").reduce((ss: number, p: any) => ss + p.cantidad, 0);
            return e.modo_cantidad === "kilo" ? s + e.cantidad_entregada : s;
          }, 0);
          const totPzs = hEntregas.entregas.reduce((s, e: any) => {
            if (e.productos_detalle?.length > 0)
              return s + e.productos_detalle.filter((p: any) => p.modo_cantidad !== "kilo").reduce((ss: number, p: any) => ss + p.cantidad, 0);
            return e.modo_cantidad !== "kilo" ? s + e.cantidad_entregada : s;
          }, 0);

          return (
            <div key={idsolicitud} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold text-sm">{pedido.no_pedido}</span>
                  <span className="text-blue-200 text-xs ml-3">{fmtFecha(pedido.fecha)}</span>
                </div>
                <div className="flex gap-4 text-xs text-blue-100">
                  <span>{hEntregas.total_entregas} entrega(s)</span>
                  <span>{fmtNum(hEntregas.total_bultos)} bultos</span>
                </div>
              </div>

              <div className="p-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {pedido.productos.map(p => {
                    const total = p.modo_cantidad === "kilo" ? (p.kg_total ?? 0) : (p.cantidad_total ?? 0);
                    const pct = total > 0 ? Math.round((p.cantidad_entregada / total) * 100) : 0;
                    const unidad = p.modo_cantidad === "kilo" ? "kg" : "pzs";
                    return (
                      <div key={p.idsolicitud_producto} className="bg-gray-50 rounded-lg p-3 text-xs">
                        <p className="font-semibold text-gray-800 truncate">
                          {p.nombre_producto} {p.medida && `(${p.medida})`}
                          {p.descripcion && <span className="ml-1 font-bold text-blue-700">— {p.descripcion}</span>}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-gray-600 font-medium">{pct}%</span>
                        </div>
                        <p className="mt-1 text-gray-500">
                          {fmtCant(p.cantidad_entregada)} / {total > 0 ? fmtCant(total) : "—"} {unidad}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {["#", "Fecha", "Nota / Remisión", "Tipo", "Producto(s)", "Bultos", "Cantidad", "Guía / Obs.", "Estado"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {hEntregas.entregas.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-400">Sin entregas registradas</td></tr>
                    ) : (
                      hEntregas.entregas.flatMap((e: any, idx: number) => {
                        const loadingKey = `${e.es_multi ? "multi" : "simple"}-${e.idnota ?? e.id_nota ?? e.nota_id ?? e.idenvio}`;
                        const prods = e.productos_detalle?.length > 0
                          ? e.productos_detalle
                          : [{ nombre_producto: e.productos || "—", medida: "", descripcion: null, total_bultos: e.total_bultos, cantidad: e.cantidad_entregada, modo_cantidad: e.modo_cantidad }];

                        return prods.map((p: any, pIdx: number) => {
                          const esFirst = pIdx === 0;
                          return (
                            <tr key={`${e.idenvio}-${idx}-${pIdx}`} className={`hover:bg-gray-50 ${!esFirst ? "border-t-0" : ""}`}>
                              <td className="px-3 py-2 text-gray-500 font-medium">{esFirst ? idx + 1 : ""}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{esFirst ? fmtFecha(e.fecha_envio) : ""}</td>
                              <td className="px-3 py-2">
                                {esFirst ? (
                                  e.nota_no ? (
                                    <>
                                      <button onClick={() => descargarNota(e)} disabled={descargandoNota === loadingKey}
                                        title="Descargar nota de remisión PDF"
                                        className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-900 hover:underline underline-offset-2 disabled:opacity-50 transition-colors group">
                                        {descargandoNota === loadingKey ? (
                                          <span className="text-xs text-gray-400 font-normal">Descargando...</span>
                                        ) : (
                                          <>
                                            <svg className="w-3.5 h-3.5 text-red-400 opacity-70 group-hover:opacity-100 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                              <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                            </svg>
                                            {e.nota_no}
                                            {e.es_multi && <span className="ml-0.5 text-xs text-blue-500 font-normal">(multi)</span>}
                                          </>
                                        )}
                                      </button>
                                      {e.nota_observaciones && (
                                        <p className="text-xs text-amber-700 italic mt-0.5 leading-tight" style={{maxWidth:"190px"}}>
                                          {e.nota_observaciones}
                                        </p>
                                      )}
                                    </>
                                  ) : <span className="text-gray-400">—</span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {esFirst ? (
                                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                                    e.tipo === "local" ? "bg-blue-100 text-blue-700"
                                    : e.tipo === "recoleccion" ? "bg-purple-100 text-purple-700"
                                    : "bg-indigo-100 text-indigo-700"
                                  }`}>
                                    {e.tipo === "local" ? "Local" : e.tipo === "recoleccion" ? "Recolección" : "Paquetería"}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-800">
                                <span className="font-medium">{p.nombre_producto}</span>
                                {p.medida && <span className="text-gray-500"> ({p.medida})</span>}
                                {p.descripcion && <span className="text-blue-700 font-medium"> — {p.descripcion}</span>}
                              </td>
                              <td className="px-3 py-2 text-center font-medium text-gray-700">{p.total_bultos}</td>
                              <td className="px-3 py-2 text-center font-semibold text-gray-800">
                                {fmtCant(p.cantidad)} {p.modo_cantidad === "kilo" ? "kg" : "pzs"}
                              </td>
                              <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate">
                                {esFirst ? (e.numero_guia || e.observaciones || "—") : ""}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {esFirst ? (
                                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                                    e.estado === "entregado" ? "bg-green-100 text-green-700"
                                    : e.estado === "en_camino" ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-600"
                                  }`}>
                                    {e.estado === "entregado" ? "Entregado" : e.estado === "en_camino" ? "En camino" : "Pendiente"}
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          );
                        });
                      })
                    )}
                  </tbody>
                  {hEntregas.entregas.length > 0 && (
                    <tfoot>
                      <tr className="bg-green-50 border-t-2 border-green-200">
                        <td colSpan={5} className="px-3 py-2 text-right text-xs font-bold text-green-800">TOTAL:</td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-green-800">{fmtNum(hEntregas.total_bultos)}</td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-green-800">
                          <div className="flex flex-col items-center gap-0.5">
                            {totKg  > 0 && <span>{fmtCant(totKg)} kg</span>}
                            {totPzs > 0 && <span>{fmtCant(totPzs)} pzs</span>}
                          </div>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── VISTA LISTA DE CLIENTES ──
  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
        📋 Selecciona un cliente para ver sus pedidos activos, luego selecciona los pedidos y genera el historial de entregas.
      </div>

      {/* Buscador */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o empresa..."
          className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
        {busqueda && (
          <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {busqueda.trim() && (
        <p className="text-xs text-gray-500 px-1">
          {clientesFiltrados.length === 0 ? `Sin resultados para "${busqueda}"` : `${clientesFiltrados.length} cliente(s) encontrado(s)`}
        </p>
      )}

      {clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          {busqueda.trim()
            ? <>No se encontraron clientes con "<span className="font-medium text-gray-500">{busqueda}</span>"</>
            : "No hay clientes con pedidos activos en producción."}
        </div>
      ) : clientesFiltrados.map(cliente => (
        <div key={cliente.idclientes} className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
            onClick={() => expandirCliente(cliente)}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                {cliente.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{cliente.nombre}</p>
                {cliente.empresa && cliente.empresa !== cliente.nombre && (
                  <p className="text-xs text-gray-500">{cliente.empresa}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {cliente.total_pedidos} pedido(s) activo(s)
              </span>
              <span className="text-gray-400">{clienteExpandido === cliente.idclientes ? "▲" : "▼"}</span>
            </div>
          </div>

          {clienteExpandido === cliente.idclientes && (
            <div className="border-t border-gray-100 p-4">
              {loadingPedidos ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pedidosCliente.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">No hay pedidos activos para este cliente.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{pedidosCliente.length} pedido(s) disponible(s)</p>
                      {pedidosSeleccionados.length > 0 && (
                        <p className="text-xs text-emerald-600 mt-1 font-medium">{pedidosSeleccionados.length} pedido(s) seleccionado(s)</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={seleccionarTodos} className="text-xs text-blue-600 hover:text-blue-800">
                        {pedidosSeleccionados.length === pedidosCliente.length ? "Deseleccionar todos" : "Seleccionar todos"}
                      </button>
                      <button onClick={verHistorial} disabled={loadingHistorial}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                        {loadingHistorial ? "Cargando..."
                          : pedidosSeleccionados.length > 0 ? `Ver historial (${pedidosSeleccionados.length})`
                          : "Ver historial de todos"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pedidosCliente.map(pedido => {
                      const seleccionado = pedidosSeleccionados.includes(pedido.idsolicitud);
                      return (
                        <div key={pedido.idsolicitud} onClick={() => togglePedido(pedido.idsolicitud)}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${seleccionado ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${seleccionado ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                              {seleccionado && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-600 text-sm">{pedido.no_pedido}</span>
                                <span className="text-xs text-gray-400">{fmtFecha(pedido.fecha)}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {pedido.productos.map(p => {
                                  const total = p.modo_cantidad === "kilo" ? (p.kg_total ?? 0) : (p.cantidad_total ?? 0);
                                  const pct = total > 0 ? Math.round((p.cantidad_entregada / total) * 100) : 0;
                                  return (
                                    <span key={p.idsolicitud_producto}
                                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full inline-flex items-center gap-1 flex-wrap">
                                      {p.nombre_producto} {p.medida && `(${p.medida})`}
                                      {p.descripcion && <span className="font-semibold text-blue-700">— {p.descripcion}</span>}
                                      <span className="text-gray-500">— {pct}% entregado</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function TabHistorialReportes() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-800">Historial / Reportes</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Consulta el historial de entregas y remisiones por cliente.
        </p>
      </div>
      <SeccionRemisiones />
    </div>
  );
}