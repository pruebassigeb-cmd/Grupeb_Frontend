// components/ModalBultos.tsx
import { useState, useEffect } from "react";
import { getBultos, agregarBulto, eliminarBulto } from "../services/seguimientoService";
import type { Bulto } from "../services/seguimientoService";
import type { PedidoSeguimiento } from "../types/seguimiento.types";

export default function ModalBultos({
  pedido,
  onClose,
}: {
  pedido: PedidoSeguimiento;
  onClose: () => void;
}) {
  const [bultos,        setBultos]        = useState<Bulto[]>([]);
  const [totalUnidades, setTotalUnidades] = useState(0);
  const [cargando,      setCargando]      = useState(true);
  const [guardando,     setGuardando]     = useState(false);
  const [eliminando,    setEliminando]    = useState<number | null>(null);
  const [nuevaCantidad, setNuevaCantidad] = useState("");
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await getBultos(pedido.idproduccion!);
      setBultos(res.bultos);
      setTotalUnidades(res.total_unidades);
    } catch {
      setError("No se pudieron cargar los bultos.");
    } finally {
      setCargando(false);
    }
  };

  const handleAgregar = async () => {
    const cantidad = parseInt(nuevaCantidad);
    if (!cantidad || cantidad <= 0) {
      setError("Ingresa una cantidad válida mayor a 0.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const nuevo = await agregarBulto(pedido.idproduccion!, { cantidad_unidades: cantidad });
      setBultos(prev => [...prev, nuevo]);
      setTotalUnidades(prev => prev + nuevo.cantidad_unidades);
      setNuevaCantidad("");
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al agregar bulto");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (idbulto: number, cantidad: number) => {
    setEliminando(idbulto);
    setError(null);
    try {
      await eliminarBulto(pedido.idproduccion!, idbulto);
      setBultos(prev => prev.filter(b => b.idbulto !== idbulto));
      setTotalUnidades(prev => prev - cantidad);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al eliminar bulto");
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div className="space-y-4 min-w-[420px]">

      {/* Encabezado */}
      <div>
        <p className="font-bold text-gray-900">{pedido.no_produccion}</p>
        <p className="text-xs text-gray-500">
          Pedido #{pedido.no_pedido} · {pedido.cliente}
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Total bultos</p>
          <p className="text-2xl font-bold text-blue-800">{bultos.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-green-400 uppercase tracking-wide mb-0.5">Total unidades</p>
          <p className="text-2xl font-bold text-green-800">{totalUnidades.toLocaleString("es-MX")}</p>
        </div>
      </div>

      {/* Formulario agregar */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Agregar bulto
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={nuevaCantidad}
            onChange={e => setNuevaCantidad(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAgregar()}
            placeholder="Cantidad de unidades"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleAgregar}
            disabled={guardando || !nuevaCantidad}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            {guardando
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <span>+</span>
            }
            Agregar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Lista de bultos */}
      {cargando ? (
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bultos.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          No hay bultos registrados aún
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Bulto</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Unidades</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Hora</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {bultos.map((b, idx) => (
                <tr key={b.idbulto} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-700">
                    #{idx + 1}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">
                    {b.cantidad_unidades.toLocaleString("es-MX")}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-gray-400">
                    {new Date(b.fecha_creacion).toLocaleTimeString("es-MX", {
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleEliminar(b.idbulto, b.cantidad_unidades)}
                      disabled={eliminando === b.idbulto}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                      title="Eliminar bulto"
                    >
                      {eliminando === b.idbulto
                        ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button
          onClick={onClose}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
