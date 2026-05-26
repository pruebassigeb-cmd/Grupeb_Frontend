import { useState, useEffect, useCallback } from "react";
import {
  getHistorialLocal, getHistorialPaqueteria,
  getUnidades, getConductores, getPaqueterias,
  getClientesRemisiones, getPedidosClienteRemisiones, getHistorialEntregas,
} from "../services/enviosService";
import { generarReporteEnviosPDF } from "../utils/generarReporteEnviosPDF";
import { generarReporteRemisiones } from "../utils/generarReporteRemisiones";
import {
  ESTADO_BADGE, ESTADO_LABEL, formatFechaHora,
} from "./enviosConstants";
import type {
  HistorialLocalItem, HistorialPaqueteriaItem,
  FiltrosHistorialLocal, FiltrosHistorialPaqueteria,
  Unidad, Conductor, Paqueteria,
  ClienteRemision, PedidoRemision, HistorialEntregasPedido,
} from "../types/envios.types";
import { showAlert } from "./CustomAlert";

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtHora = (iso: string | null) => {
  if (!iso) return "—";
  return formatFechaHora ? formatFechaHora(iso) : new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
};

const fmtNum = (n: number) => n.toLocaleString("es-MX");

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const labelCls = "block text-xs font-medium text-gray-600 mb-1";

const OBSERVACION_LABEL: Record<string, string> = {
  E: "Entregado", RA: "Rechazado (A)", RD: "Rechazado (D)", PD: "Pendiente",
};

// ── Tarjeta totales ──────────────────────────────────────────
function TarjetaTotales({ totalPedidos, totalBultos, totalFlete, mostrarFlete }: {
  totalPedidos: number; totalBultos: number; totalFlete: number | null; mostrarFlete: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="flex-1 min-w-[120px] bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center">
        <p className="text-2xl font-bold text-blue-700">{totalPedidos}</p>
        <p className="text-xs text-blue-600 mt-0.5">Pedidos</p>
      </div>
      <div className="flex-1 min-w-[120px] bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-center">
        <p className="text-2xl font-bold text-indigo-700">{totalBultos}</p>
        <p className="text-xs text-indigo-600 mt-0.5">Bultos</p>
      </div>
      {mostrarFlete && totalFlete !== null && (
        <div className="flex-1 min-w-[120px] bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-700">${totalFlete.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-green-600 mt-0.5">Flete total</p>
        </div>
      )}
    </div>
  );
}

// ── Sección LOCAL ────────────────────────────────────────────
function SeccionLocal({ unidades, conductores }: { unidades: Unidad[]; conductores: Conductor[] }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [filtros, setFiltros] = useState<FiltrosHistorialLocal>({ fecha_inicio: hoy, fecha_fin: hoy });
  const [datos, setDatos] = useState<HistorialLocalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { const res = await getHistorialLocal(filtros); setDatos(res); setBuscado(true); }
    catch { showAlert("Error al cargar historial local"); }
    finally { setLoading(false); }
  }, [filtros]);

  const totalPedidos = new Set(datos.map(d => d.no_pedido)).size;
  const totalBultos = datos.reduce((s, d) => s + d.total_bultos, 0);

  const handlePDF = async () => {
    if (!datos.length) { showAlert("No hay datos para exportar"); return; }
    await generarReporteEnviosPDF({ tipo: "local", datos, filtros, unidades, conductores });
  };

  const set = (key: keyof FiltrosHistorialLocal, val: any) =>
    setFiltros(prev => ({ ...prev, [key]: val || undefined }));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filtros</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div><label className={labelCls}>Fecha inicio</label>
            <input type="date" value={filtros.fecha_inicio || ""} onChange={e => set("fecha_inicio", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Fecha fin</label>
            <input type="date" value={filtros.fecha_fin || ""} onChange={e => set("fecha_fin", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Unidad</label>
            <select value={filtros.idunidad || ""} onChange={e => set("idunidad", e.target.value ? Number(e.target.value) : undefined)} className={inputCls}>
              <option value="">Todas</option>
              {unidades.map(u => <option key={u.idunidad} value={u.idunidad}>{u.marca} {u.modelo} — {u.placa}</option>)}
            </select></div>
          <div><label className={labelCls}>Chofer</label>
            <select value={filtros.idusuario || ""} onChange={e => set("idusuario", e.target.value ? Number(e.target.value) : undefined)} className={inputCls}>
              <option value="">Todos</option>
              {conductores.map(c => <option key={c.idusuario} value={c.idusuario}>{c.nombre} {c.apellido}</option>)}
            </select></div>
          <div><label className={labelCls}>N° Pedido</label>
            <input type="text" value={filtros.no_pedido || ""} onChange={e => set("no_pedido", e.target.value)} placeholder="P-0001..." className={inputCls} /></div>
          <div><label className={labelCls}>Cliente</label>
            <input type="text" value={filtros.cliente || ""} onChange={e => set("cliente", e.target.value)} placeholder="Nombre..." className={inputCls} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={() => { setFiltros({ fecha_inicio: hoy, fecha_fin: hoy }); setDatos([]); setBuscado(false); }}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">Limpiar</button>
          <button onClick={cargar} disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Buscando..." : "Buscar"}</button>
        </div>
      </div>

      {buscado && (
        <>
          <TarjetaTotales totalPedidos={totalPedidos} totalBultos={totalBultos} totalFlete={null} mostrarFlete={false} />
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{datos.length} registro(s) encontrado(s)</p>
            <button onClick={handlePDF} disabled={!datos.length}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
              Descargar PDF
            </button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{["Fecha", "N° Pedido", "Cliente", "Unidad", "Chofer", "Bultos", "Salida", "Llegada", "Obs.", "Firma", "Tipo", "Estado"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {datos.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">Sin resultados</td></tr>
                  ) : datos.map(r => (
                    <tr key={r.idbitacora} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{fmtFecha(r.fecha)}</td>
                      <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">{r.no_pedido}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap max-w-[160px] truncate">{r.cliente}</td>
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{r.unidad.nombre}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{r.chofer.nombre}</td>
                      <td className="px-3 py-3 text-center text-gray-600 font-medium">{r.total_bultos}</td>
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtHora(r.hora_salida)}</td>
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtHora(r.hora_llegada)}</td>
                      <td className="px-3 py-3 text-center">
                        {r.observacion ? <span title={OBSERVACION_LABEL[r.observacion]} className="font-bold text-gray-700 text-xs">{r.observacion}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{r.firma || "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                          {r.es_parcialidad ? "Parcialidad" : "Completo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(ESTADO_BADGE as any)[r.estado] ?? "bg-gray-100 text-gray-600"}`}>
                          {(ESTADO_LABEL as any)[r.estado] ?? r.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sección PAQUETERÍA ───────────────────────────────────────
function SeccionPaqueteria({ paqueterias }: { paqueterias: Paqueteria[] }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [filtros, setFiltros] = useState<FiltrosHistorialPaqueteria>({ fecha_inicio: hoy, fecha_fin: hoy });
  const [datos, setDatos] = useState<HistorialPaqueteriaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { const res = await getHistorialPaqueteria(filtros); setDatos(res); setBuscado(true); }
    catch { showAlert("Error al cargar historial paquetería"); }
    finally { setLoading(false); }
  }, [filtros]);

  const totalPedidos = new Set(datos.map(d => d.no_pedido)).size;
  const totalBultos = datos.reduce((s, d) => s + d.total_bultos, 0);
  const totalFlete = datos.reduce((s, d) => s + (d.costo_flete ?? 0), 0);

  const handlePDF = async () => {
    if (!datos.length) { showAlert("No hay datos para exportar"); return; }
    await generarReporteEnviosPDF({ tipo: "paqueteria", datos, filtros, paqueterias });
  };

  const set = (key: keyof FiltrosHistorialPaqueteria, val: any) =>
    setFiltros(prev => ({ ...prev, [key]: val || undefined }));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filtros</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div><label className={labelCls}>Fecha inicio</label>
            <input type="date" value={filtros.fecha_inicio || ""} onChange={e => set("fecha_inicio", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Fecha fin</label>
            <input type="date" value={filtros.fecha_fin || ""} onChange={e => set("fecha_fin", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Paquetería</label>
            <select value={filtros.idpaqueteria || ""} onChange={e => set("idpaqueteria", e.target.value ? Number(e.target.value) : undefined)} className={inputCls}>
              <option value="">Todas</option>
              {paqueterias.map(p => <option key={p.idpaqueteria} value={p.idpaqueteria}>{p.nombre}</option>)}
            </select></div>
          <div><label className={labelCls}>N° Guía</label>
            <input type="text" value={filtros.numero_guia || ""} onChange={e => set("numero_guia", e.target.value)} placeholder="Guía..." className={inputCls} /></div>
          <div><label className={labelCls}>N° Pedido</label>
            <input type="text" value={filtros.no_pedido || ""} onChange={e => set("no_pedido", e.target.value)} placeholder="P-0001..." className={inputCls} /></div>
          <div><label className={labelCls}>Cliente</label>
            <input type="text" value={filtros.cliente || ""} onChange={e => set("cliente", e.target.value)} placeholder="Nombre..." className={inputCls} /></div>
          <div><label className={labelCls}>Estado</label>
            <select value={filtros.estado || ""} onChange={e => set("estado", e.target.value as any)} className={inputCls}>
              <option value="">Todos</option>
              <option value="preparando">Preparando</option>
              <option value="en_camino">En camino</option>
              <option value="entregado">Entregado</option>
            </select></div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={() => { setFiltros({ fecha_inicio: hoy, fecha_fin: hoy }); setDatos([]); setBuscado(false); }}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">Limpiar</button>
          <button onClick={cargar} disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Buscando..." : "Buscar"}</button>
        </div>
      </div>

      {buscado && (
        <>
          <TarjetaTotales totalPedidos={totalPedidos} totalBultos={totalBultos} totalFlete={totalFlete} mostrarFlete={true} />
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{datos.length} registro(s) encontrado(s)</p>
            <button onClick={handlePDF} disabled={!datos.length}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
              Descargar PDF
            </button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{["Fecha", "N° Pedido", "Cliente", "Paquetería", "N° Guía", "Bultos", "Tipo", "Flete", "Estado"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {datos.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Sin resultados</td></tr>
                  ) : datos.map(r => (
                    <tr key={r.idenvio} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{fmtFecha(r.fecha_envio)}</td>
                      <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">{r.no_pedido}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap max-w-[160px] truncate">{r.cliente}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{r.paqueteria.nombre}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {r.numero_guia ? <span className="font-mono text-xs text-gray-700">{r.numero_guia}</span> : <span className="text-orange-500 text-xs font-medium">Sin guía</span>}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 font-medium">{r.total_bultos}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                          {r.es_parcialidad ? "Parcialidad" : "Completo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {r.costo_flete != null ? `$${Number(r.costo_flete).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(ESTADO_BADGE as any)[r.estado] ?? "bg-gray-100 text-gray-600"}`}>
                          {(ESTADO_LABEL as any)[r.estado] ?? r.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sección REMISIONES ───────────────────────────────────────
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

  useEffect(() => {
    getClientesRemisiones()
      .then(setClientes)
      .catch(() => showAlert("Error al cargar clientes"))
      .finally(() => setLoadingClientes(false));
  }, []);

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
      const pedidos = await getPedidosClienteRemisiones(cliente.idclientes);
      setPedidosCliente(pedidos);
    } catch {
      showAlert("Error al cargar pedidos del cliente");
    } finally {
      setLoadingPedidos(false);
    }
  };

  const togglePedido = (idsolicitud: number) => {
    setPedidosSeleccionados(prev =>
      prev.includes(idsolicitud)
        ? prev.filter(id => id !== idsolicitud)
        : [...prev, idsolicitud]
    );
  };

  const seleccionarTodos = () => {
    if (pedidosSeleccionados.length === pedidosCliente.length)
      setPedidosSeleccionados([]);
    else
      setPedidosSeleccionados(pedidosCliente.map(p => p.idsolicitud));
  };

  const verHistorial = async () => {
    if (!pedidosSeleccionados.length) { showAlert("Selecciona al menos un pedido"); return; }
    setLoadingHistorial(true);
    try {
      const data = await getHistorialEntregas(pedidosSeleccionados);
      setHistorial(data);
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

  const volverSeleccion = () => {
    setVistaHistorial(false);
    setHistorial([]);
  };

  if (loadingClientes) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Vista historial ──────────────────────────────────────
  if (vistaHistorial && clienteActivo) {
    const pedidosMap = new Map(pedidosCliente.map(p => [p.idsolicitud, p]));
    const historialMap = new Map(historial.map(h => [h.idsolicitud, h]));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={volverSeleccion} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1">
              ← Volver a selección
            </button>
            <h3 className="font-semibold text-gray-800">{clienteActivo.nombre}</h3>
            <p className="text-xs text-gray-500">{pedidosSeleccionados.length} pedido(s) seleccionado(s)</p>
          </div>
          <button onClick={handlePDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
            Descargar PDF
          </button>
        </div>

        {pedidosSeleccionados.map(idsolicitud => {
          const pedido = pedidosMap.get(idsolicitud);
          const hEntregas = historialMap.get(idsolicitud);
          if (!pedido || !hEntregas) return null;

          return (
            <div key={idsolicitud} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Encabezado pedido */}
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

              {/* Productos */}
              <div className="p-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {pedido.productos.map(p => {
                    const total = p.modo_cantidad === "kilo" ? (p.kg_total ?? 0) : (p.cantidad_total ?? 0);
                    const entregado = p.cantidad_entregada;
                    const pct = total > 0 ? Math.round((entregado / total) * 100) : 0;
                    const unidad = p.modo_cantidad === "kilo" ? "kg" : "pzs";
                    return (
                      <div key={p.idsolicitud_producto} className="bg-gray-50 rounded-lg p-3 text-xs">
  <p className="font-semibold text-gray-800 truncate">
    {p.nombre_producto} {p.medida && `(${p.medida})`}
    {p.descripcion && (
      <span className="ml-1 font-bold text-blue-700">— {p.descripcion}</span>
    )}
  </p>
  <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-gray-600 font-medium">{pct}%</span>
                        </div>
                        <p className="mt-1 text-gray-500">
                          {fmtNum(entregado)} / {total > 0 ? fmtNum(total) : "—"} {unidad}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Entregas */}
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
                    ) : hEntregas.entregas.map((e, idx) => (
                      <tr key={e.idenvio} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500 font-medium">{idx + 1}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{fmtFecha(e.fecha_envio)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {e.nota_no
                            ? <span className="font-bold text-emerald-700">{e.nota_no}</span>
                            : <span className="text-gray-400">—</span>}
                          {e.es_multi && <span className="ml-1 text-xs text-blue-500">(multi)</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full font-medium ${e.tipo === "local" ? "bg-blue-100 text-blue-700"
                              : e.tipo === "recoleccion" ? "bg-purple-100 text-purple-700"
                                : "bg-indigo-100 text-indigo-700"
                            }`}>
                            {e.tipo === "local" ? "Local" : e.tipo === "recoleccion" ? "Recolección" : "Paquetería"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">{e.productos || "—"}</td>
                        <td className="px-3 py-2 text-center font-medium text-gray-700">{e.total_bultos}</td>
                        <td className="px-3 py-2 text-center font-semibold text-gray-800">
                          {fmtNum(e.cantidad_entregada)} {e.modo_cantidad === "kilo" ? "kg" : "pzs"}
                        </td>
                        <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate">{e.numero_guia || e.observaciones || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full font-medium ${e.estado === "entregado" ? "bg-green-100 text-green-700"
                              : e.estado === "en_camino" ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                            {e.estado === "entregado" ? "Entregado" : e.estado === "en_camino" ? "En camino" : "Preparando"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {hEntregas.entregas.length > 0 && (
                    <tfoot>
                      <tr className="bg-green-50 border-t-2 border-green-200">
                        <td colSpan={5} className="px-3 py-2 text-right text-xs font-bold text-green-800">TOTAL:</td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-green-800">{fmtNum(hEntregas.total_bultos)}</td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-green-800">
                          {fmtNum(hEntregas.total_entregado)} {hEntregas.entregas[0]?.modo_cantidad === "kilo" ? "kg" : "pzs"}
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

  // ── Vista selección ──────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
        📋 Selecciona un cliente para ver sus pedidos activos, luego selecciona los pedidos y genera el historial de entregas.
      </div>

      {clientes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          No hay clientes con pedidos activos en producción.
        </div>
      ) : clientes.map(cliente => (
        <div key={cliente.idclientes} className="bg-white rounded-lg shadow overflow-hidden">
          {/* Cabecera cliente */}
          <div
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
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
              <span className="text-gray-400 text-sm">
                {clienteExpandido === cliente.idclientes ? "▲" : "▼"}
              </span>
            </div>
          </div>

          {/* Pedidos del cliente */}
          {clienteExpandido === cliente.idclientes && (
            <div className="border-t border-gray-100 p-4">
              {loadingPedidos ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pedidosCliente.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-sm">Sin pedidos activos</p>
              ) : (
                <div className="space-y-3">
                  {/* Controles selección */}
                  <div className="flex items-center justify-between">
                    <button onClick={seleccionarTodos} className="text-xs text-blue-600 hover:text-blue-800">
                      {pedidosSeleccionados.length === pedidosCliente.length ? "Deseleccionar todos" : "Seleccionar todos"}
                    </button>
                    <button
                      onClick={verHistorial}
                      disabled={!pedidosSeleccionados.length || loadingHistorial}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                      {loadingHistorial ? "Cargando..." : `Ver historial (${pedidosSeleccionados.length})`}
                    </button>
                  </div>

                  {/* Lista pedidos */}
                  {pedidosCliente.map(pedido => {
                    const seleccionado = pedidosSeleccionados.includes(pedido.idsolicitud);
                    return (
                      <div key={pedido.idsolicitud}
                        onClick={() => togglePedido(pedido.idsolicitud)}
                        className={`rounded-lg border-2 p-3 cursor-pointer transition-colors ${seleccionado ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                          }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${seleccionado ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                            }`}>
                            {seleccionado && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
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
    {p.descripcion && (
      <span className="font-semibold text-blue-700">— {p.descripcion}</span>
    )}
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
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function TabHistorialReportes() {
  const [seccion, setSeccion] = useState<"local" | "paqueteria" | "remisiones">("local");
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [paqueterias, setPaqueterias] = useState<Paqueteria[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);

  useEffect(() => {
    Promise.all([getUnidades(), getConductores(), getPaqueterias()])
      .then(([u, c, p]) => { setUnidades(u); setConductores(c); setPaqueterias(p); })
      .catch(() => showAlert("Error al cargar catálogos"))
      .finally(() => setLoadingCat(false));
  }, []);

  if (loadingCat) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Historial / Reportes</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Consulta envíos, historial de paquetería y reporte de remisiones por cliente.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {([
          { key: "local", label: "🚚 Reparto Local" },
          { key: "paqueteria", label: "📦 Paquetería" },
          { key: "remisiones", label: "📋 Remisiones" },
        ] as { key: typeof seccion; label: string }[]).map(s => (
          <button key={s.key} onClick={() => setSeccion(s.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${seccion === s.key
                ? s.key === "remisiones" ? "bg-emerald-600 text-white shadow-sm" : "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
            {s.label}
          </button>
        ))}
      </div>

      {seccion === "local" && <SeccionLocal unidades={unidades} conductores={conductores} />}
      {seccion === "paqueteria" && <SeccionPaqueteria paqueterias={paqueterias} />}
      {seccion === "remisiones" && <SeccionRemisiones />}
    </div>
  );
}