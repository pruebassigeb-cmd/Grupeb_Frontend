import { useState, useEffect, useCallback } from "react";
import { getHistorialLocal, getHistorialPaqueteria } from "../services/enviosService";
import { getUnidades, getConductores, getPaqueterias } from "../services/enviosService";
import { generarReporteEnviosPDF } from "../utils/generarReporteEnviosPDF";
import {
  ESTADO_BADGE, ESTADO_LABEL,
  formatFechaHora,
} from "./enviosConstants";
import type {
  HistorialLocalItem,
  HistorialPaqueteriaItem,
  FiltrosHistorialLocal,
  FiltrosHistorialPaqueteria,
  Unidad,
  Conductor,
  Paqueteria,
} from "../types/envios.types";
import { showAlert } from "./CustomAlert";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtHora = (iso: string | null) => {
  if (!iso) return "—";
  return formatFechaHora ? formatFechaHora(iso) : new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
};

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const labelCls = "block text-xs font-medium text-gray-600 mb-1";

const OBSERVACION_LABEL: Record<string, string> = {
  E:  "Entregado",
  RA: "Rechazado (A)",
  RD: "Rechazado (D)",
  PD: "Pendiente",
};

// ────────────────────────────────────────────────────────────
// Sub-componente: Totales
// ────────────────────────────────────────────────────────────
function TarjetaTotales({
  totalPedidos,
  totalBultos,
  totalFlete,
  mostrarFlete,
}: {
  totalPedidos: number;
  totalBultos:  number;
  totalFlete:   number | null;
  mostrarFlete: boolean;
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
          <p className="text-2xl font-bold text-green-700">
            ${totalFlete.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-green-600 mt-0.5">Flete total</p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sección LOCAL
// ────────────────────────────────────────────────────────────
function SeccionLocal({
  unidades,
  conductores,
}: {
  unidades:   Unidad[];
  conductores: Conductor[];
}) {
  const hoy = new Date().toISOString().slice(0, 10);

  const [filtros, setFiltros] = useState<FiltrosHistorialLocal>({
    fecha_inicio: hoy,
    fecha_fin:    hoy,
  });
  const [datos,     setDatos]     = useState<HistorialLocalItem[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [buscado,   setBuscado]   = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHistorialLocal(filtros);
      setDatos(res);
      setBuscado(true);
    } catch {
      showAlert("Error al cargar historial local");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  // Totales
  const totalPedidos = new Set(datos.map(d => d.no_pedido)).size;
  const totalBultos  = datos.reduce((s, d) => s + d.total_bultos, 0);

  const handlePDF = async () => {
    if (!datos.length) { showAlert("No hay datos para exportar"); return; }
    await generarReporteEnviosPDF({
      tipo:     "local",
      datos,
      filtros,
      unidades,
      conductores,
    });
  };

  const set = (key: keyof FiltrosHistorialLocal, val: any) =>
    setFiltros(prev => ({ ...prev, [key]: val || undefined }));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filtros</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className={labelCls}>Fecha inicio</label>
            <input
              type="date"
              value={filtros.fecha_inicio || ""}
              onChange={e => set("fecha_inicio", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Fecha fin</label>
            <input
              type="date"
              value={filtros.fecha_fin || ""}
              onChange={e => set("fecha_fin", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Unidad</label>
            <select
              value={filtros.idunidad || ""}
              onChange={e => set("idunidad", e.target.value ? Number(e.target.value) : undefined)}
              className={inputCls}
            >
              <option value="">Todas</option>
              {unidades.map(u => (
                <option key={u.idunidad} value={u.idunidad}>
                  {u.marca} {u.modelo} — {u.placa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Chofer</label>
            <select
              value={filtros.idusuario || ""}
              onChange={e => set("idusuario", e.target.value ? Number(e.target.value) : undefined)}
              className={inputCls}
            >
              <option value="">Todos</option>
              {conductores.map(c => (
                <option key={c.idusuario} value={c.idusuario}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>N° Pedido</label>
            <input
              type="text"
              value={filtros.no_pedido || ""}
              onChange={e => set("no_pedido", e.target.value)}
              placeholder="P-0001..."
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Cliente</label>
            <input
              type="text"
              value={filtros.cliente || ""}
              onChange={e => set("cliente", e.target.value)}
              placeholder="Nombre..."
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={() => {
              setFiltros({ fecha_inicio: hoy, fecha_fin: hoy });
              setDatos([]);
              setBuscado(false);
            }}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            Limpiar
          </button>
          <button
            onClick={cargar}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {buscado && (
        <>
          <TarjetaTotales
            totalPedidos={totalPedidos}
            totalBultos={totalBultos}
            totalFlete={null}
            mostrarFlete={false}
          />

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{datos.length} registro(s) encontrado(s)</p>
            <button
              onClick={handlePDF}
              disabled={!datos.length}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              Descargar PDF
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      "Fecha", "N° Pedido", "Cliente", "Unidad", "Chofer",
                      "Bultos", "Salida", "Llegada", "Obs.", "Firma", "Tipo", "Estado",
                    ].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {datos.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-gray-400">
                        Sin resultados para los filtros aplicados
                      </td>
                    </tr>
                  ) : datos.map(r => (
                    <tr key={r.idbitacora} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">
                        {fmtFecha(r.fecha)}
                      </td>
                      <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">
                        {r.no_pedido}
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                        {r.cliente}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {r.unidad.nombre}
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                        {r.chofer.nombre}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 font-medium">
                        {r.total_bultos}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {fmtHora(r.hora_salida)}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {fmtHora(r.hora_llegada)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {r.observacion ? (
                          <span
                            title={OBSERVACION_LABEL[r.observacion]}
                            className="font-bold text-gray-700 text-xs"
                          >
                            {r.observacion}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {r.firma || "—"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.es_parcialidad
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {r.es_parcialidad ? "Parcialidad" : "Completo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          (ESTADO_BADGE as any)[r.estado] ?? "bg-gray-100 text-gray-600"
                        }`}>
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

// ────────────────────────────────────────────────────────────
// Sección PAQUETERÍA
// ────────────────────────────────────────────────────────────
function SeccionPaqueteria({ paqueterias }: { paqueterias: Paqueteria[] }) {
  const hoy = new Date().toISOString().slice(0, 10);

  const [filtros, setFiltros] = useState<FiltrosHistorialPaqueteria>({
    fecha_inicio: hoy,
    fecha_fin:    hoy,
  });
  const [datos,   setDatos]   = useState<HistorialPaqueteriaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHistorialPaqueteria(filtros);
      setDatos(res);
      setBuscado(true);
    } catch {
      showAlert("Error al cargar historial paquetería");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const totalPedidos = new Set(datos.map(d => d.no_pedido)).size;
  const totalBultos  = datos.reduce((s, d) => s + d.total_bultos, 0);
  const totalFlete   = datos.reduce((s, d) => s + (d.costo_flete ?? 0), 0);

  const handlePDF = async () => {
    if (!datos.length) { showAlert("No hay datos para exportar"); return; }
    await generarReporteEnviosPDF({
      tipo:       "paqueteria",
      datos,
      filtros,
      paqueterias,
    });
  };

  const set = (key: keyof FiltrosHistorialPaqueteria, val: any) =>
    setFiltros(prev => ({ ...prev, [key]: val || undefined }));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filtros</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div>
            <label className={labelCls}>Fecha inicio</label>
            <input
              type="date"
              value={filtros.fecha_inicio || ""}
              onChange={e => set("fecha_inicio", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Fecha fin</label>
            <input
              type="date"
              value={filtros.fecha_fin || ""}
              onChange={e => set("fecha_fin", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Paquetería</label>
            <select
              value={filtros.idpaqueteria || ""}
              onChange={e => set("idpaqueteria", e.target.value ? Number(e.target.value) : undefined)}
              className={inputCls}
            >
              <option value="">Todas</option>
              {paqueterias.map(p => (
                <option key={p.idpaqueteria} value={p.idpaqueteria}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>N° Guía</label>
            <input
              type="text"
              value={filtros.numero_guia || ""}
              onChange={e => set("numero_guia", e.target.value)}
              placeholder="Guía..."
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>N° Pedido</label>
            <input
              type="text"
              value={filtros.no_pedido || ""}
              onChange={e => set("no_pedido", e.target.value)}
              placeholder="P-0001..."
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Cliente</label>
            <input
              type="text"
              value={filtros.cliente || ""}
              onChange={e => set("cliente", e.target.value)}
              placeholder="Nombre..."
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select
              value={filtros.estado || ""}
              onChange={e => set("estado", e.target.value)}
              className={inputCls}
            >
              <option value="">Todos</option>
              <option value="preparando">Preparando</option>
              <option value="en_camino">En camino</option>
              <option value="entregado">Entregado</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={() => {
              setFiltros({ fecha_inicio: hoy, fecha_fin: hoy });
              setDatos([]);
              setBuscado(false);
            }}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            Limpiar
          </button>
          <button
            onClick={cargar}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {buscado && (
        <>
          <TarjetaTotales
            totalPedidos={totalPedidos}
            totalBultos={totalBultos}
            totalFlete={totalFlete}
            mostrarFlete={true}
          />

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{datos.length} registro(s) encontrado(s)</p>
            <button
              onClick={handlePDF}
              disabled={!datos.length}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              Descargar PDF
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      "Fecha", "N° Pedido", "Cliente", "Paquetería",
                      "N° Guía", "Bultos", "Tipo", "Flete", "Estado",
                    ].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {datos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                        Sin resultados para los filtros aplicados
                      </td>
                    </tr>
                  ) : datos.map(r => (
                    <tr key={r.idenvio} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">
                        {fmtFecha(r.fecha_envio)}
                      </td>
                      <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">
                        {r.no_pedido}
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                        {r.cliente}
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                        {r.paqueteria.nombre}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {r.numero_guia ? (
                          <span className="font-mono text-xs text-gray-700">{r.numero_guia}</span>
                        ) : (
                          <span className="text-orange-500 text-xs font-medium">Sin guía</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 font-medium">
                        {r.total_bultos}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.es_parcialidad
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {r.es_parcialidad ? "Parcialidad" : "Completo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {r.costo_flete != null
                          ? `$${Number(r.costo_flete).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                          : "—"
                        }
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          (ESTADO_BADGE as any)[r.estado] ?? "bg-gray-100 text-gray-600"
                        }`}>
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

// ────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────
export default function TabHistorialReportes() {
  const [seccion,     setSeccion]     = useState<"local" | "paqueteria">("local");
  const [unidades,    setUnidades]    = useState<Unidad[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [paqueterias, setPaqueterias] = useState<Paqueteria[]>([]);
  const [loadingCat,  setLoadingCat]  = useState(true);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [u, c, p] = await Promise.all([
          getUnidades(),
          getConductores(),
          getPaqueterias(),
        ]);
        setUnidades(u);
        setConductores(c);
        setPaqueterias(p);
      } catch {
        showAlert("Error al cargar catálogos");
      } finally {
        setLoadingCat(false);
      }
    };
    cargarCatalogos();
  }, []);

  if (loadingCat) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Historial / Reportes</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Consulta envíos por fecha, unidad, chofer, pedido y paquetería. Exporta a PDF con los filtros aplicados.
          </p>
        </div>
      </div>

      {/* Toggle sección */}
      <div className="flex gap-2 mb-5">
        {(["local", "paqueteria"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSeccion(s)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              seccion === s
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "local" ? "🚚 Reparto Local" : "📦 Paquetería"}
          </button>
        ))}
      </div>

      {seccion === "local" ? (
        <SeccionLocal unidades={unidades} conductores={conductores} />
      ) : (
        <SeccionPaqueteria paqueterias={paqueterias} />
      )}
    </div>
  );
}