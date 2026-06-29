import { useState, useEffect } from "react";
import { getProcesosOrdenPapel } from "../../services/papel/seguimientoPapelService";
import type { ProcesosOrdenPapelRespuesta, ProcesoRegistroPapel } from "../../services/papel/seguimientoPapelService";
import type { PedidoSeguimientoPapel, NombreProcesoPapel } from "../../types/papel/seguimientoPapel.types";
import { NOMBRES_PROCESO_PAPEL } from "../../types/papel/seguimientoPapel.types";

// ─────────────────────────────────────────────────────────────────────────
// MODAL SELECTOR DE PROCESOS — PAPEL
//
// A diferencia de plástico (4 columnas fijas Ext/Imp/Bol/Asa directamente
// en la tabla de Seguimiento), papel puede tener hasta 10 procesos y
// cuáles aplican varía por orden según la maquinaria de la ficha del
// producto. Por eso se necesita esta vista intermedia: lista solo los
// procesos que el backend ya determinó que aplican a ESTA orden
// (filtrados y en su orden de cascada real), con su estado, y desde aquí
// se abre ModalProcesoIndividualPapel para el proceso elegido.
// ─────────────────────────────────────────────────────────────────────────

const colorEstado = (estado: string) => {
  switch (estado) {
    case "terminado": return "bg-green-100 text-green-800 border-green-300";
    case "en_proceso": return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "resagado": return "bg-gray-800 text-white border-gray-700";
    case "no_aplica": return "bg-gray-100 text-gray-400 border-gray-200";
    default: return "bg-orange-100 text-orange-800 border-orange-300";
  }
};
 
const textoEstado = (estado: string) => {
  const m: Record<string, string> = {
    terminado: "Terminado", en_proceso: "En proceso",
    resagado: "Resagado", no_aplica: "No aplica", pendiente: "Pendiente",
  };
  return m[estado] ?? estado;
};
 
const iconoEstado = (estado: string) => {
  const m: Record<string, string> = {
    terminado: "✓", en_proceso: "⚙", pendiente: "–", resagado: "!", no_aplica: "—",
  };
  return m[estado] ?? "–";
};
 
interface FilaProcesoProps {
  proceso: ProcesoRegistroPapel;
  esActual: boolean;
  onAbrir: () => void;
}
 
function FilaProceso({ proceso, esActual, onAbrir }: FilaProcesoProps) {
  const nombre = NOMBRES_PROCESO_PAPEL[proceso.tabla] ?? proceso.tabla;
  const tieneAvances = (proceso.avances ?? []).length > 0;
 
  return (
    <button
      onClick={onAbrir}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left
        ${esActual ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200" : "border-gray-200 bg-white hover:bg-gray-50"}
        hover:shadow-sm`}
    >
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border ${colorEstado(proceso.estado)}`}>
          {iconoEstado(proceso.estado)}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{nombre}</p>
          <p className="text-xs text-gray-500">
            {textoEstado(proceso.estado)}
            {tieneAvances && proceso.estado === "en_proceso" && (
              <span className="ml-1.5 text-blue-500">
                · {(proceso.total_avances ?? 0).toLocaleString("es-MX")} avanzado
              </span>
            )}
          </p>
        </div>
      </div>
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
 
interface Props {
  pedido: PedidoSeguimientoPapel;
  onAbrirProceso: (nombreProceso: NombreProcesoPapel) => void;
  onClose: () => void;
}
 
export default function ModalSelectorProcesoPapel({ pedido, onAbrirProceso, onClose }: Props) {
  const [datos, setDatos] = useState<ProcesosOrdenPapelRespuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => { cargar(); }, []);
 
  const cargar = async () => {
    if (!pedido.idproduccion) return;
    try {
      setCargando(true); setError(null);
      const res = await getProcesosOrdenPapel(pedido.idproduccion);
      setDatos(res);
    } catch (e: any) {
      const mensajeBackend = e?.response?.data?.error;
      setError(mensajeBackend || "No se pudieron cargar los procesos de esta orden.");
    } finally {
      setCargando(false);
    }
  };
 
  const procesosTerminados = datos?.procesos.filter(p => p.estado === "terminado").length ?? 0;
  const totalProcesos = datos?.procesos.length ?? 0;
  const pctProgreso = totalProcesos > 0 ? Math.round((procesosTerminados / totalProcesos) * 100) : 0;
 
  return (
    <div className="space-y-4 min-w-[420px] max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-900">{pedido.no_produccion}</p>
          <p className="text-xs text-gray-500">Pedido #{pedido.no_pedido} · {pedido.cliente}</p>
        </div>
      </div>
 
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
        <p className="text-sm font-semibold text-gray-900 leading-tight">
          {pedido.nombre_producto || "—"}
          {pedido.medida && <span className="font-normal text-gray-500"> · {pedido.medida}</span>}
        </p>
        {pedido.cantidad_orden != null && (
          <p className="text-xs text-gray-500 mt-0.5">{pedido.cantidad_orden.toLocaleString("es-MX")} bolsas</p>
        )}
      </div>
 
      {!cargando && datos && totalProcesos > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-indigo-700">
              Progreso general · {procesosTerminados}/{totalProcesos} procesos
            </p>
            <p className="text-xs font-bold text-indigo-800">{pctProgreso}%</p>
          </div>
          <div className="w-full bg-white rounded-full h-2 border border-indigo-100">
            <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${pctProgreso}%` }} />
          </div>
        </div>
      )}
 
      {cargando ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-600 text-sm text-center py-4">{error}</p>
      ) : !datos || datos.procesos.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          Esta orden no tiene procesos de papel determinados todavía.
          Verifica que la solicitud tenga capturado el método de hojeado
          (hojeado o guillotina) — sin eso el sistema no puede armar la
          cascada de producción.
        </p>
      ) : (
        <div className="space-y-1.5">
          {datos.procesos.map((proceso) => (
            <FilaProceso
              key={proceso.tabla}
              proceso={proceso}
              esActual={datos.proceso_actual === proceso.idproceso_cat}
              onAbrir={() => onAbrirProceso(proceso.tabla)}
            />
          ))}
        </div>
      )}
 
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
          Cerrar
        </button>
      </div>
    </div>
  );
}
 