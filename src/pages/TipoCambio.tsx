import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import {
  getTipoCambioActual,
  getTipoCambioHistorial,
  type TipoCambioActual,
} from "../services/tipoCambioService";
import { formatMoney } from "../utils/formatMoney";

export default function TipoCambio() {
  const [actual, setActual] = useState<TipoCambioActual | null>(null);
  const [historial, setHistorial] = useState<TipoCambioActual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const [actualRes, historialRes] = await Promise.all([
          getTipoCambioActual().catch(() => null),
          getTipoCambioHistorial(30).catch(() => []),
        ]);
        setActual(actualRes);
        setHistorial(historialRes);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  if (loading) {
    return (
      <Dashboard>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Cargando tipo de cambio...</p>
        </div>
      </Dashboard>
    );
  }

  return (
    <Dashboard>
      <h1 className="text-2xl font-bold mb-6">Tipo de cambio (USD/MXN)</h1>

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <p className="text-sm text-gray-500">Vigente</p>
        {actual ? (
          <>
            <p className="text-3xl font-bold text-indigo-700">
              {formatMoney(actual.valor, "MXN")} <span className="text-base font-normal text-gray-400">por 1 USD</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {actual.fecha} — Banxico (FIX)
            </p>
          </>
        ) : (
          <p className="text-sm text-red-500">
            Aún no hay un tipo de cambio sincronizado. Se actualizará automáticamente en la próxima corrida (todos los días, o al reiniciar el servidor).
          </p>
        )}
        <p className="text-xs text-gray-400 mt-4">
          Este valor es 100% automático: se sincroniza todos los días con el tipo de cambio FIX de Banxico y se usa tal cual en cotizaciones, pedidos y pagos — no admite corrección manual.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">Historial reciente</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-gray-400">Sin historial todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="border px-3 py-2 text-left">Fecha</th>
                  <th className="border px-3 py-2 text-left">Valor</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.idtipo_cambio} className="even:bg-gray-50">
                    <td className="border px-3 py-2">{h.fecha}</td>
                    <td className="border px-3 py-2 font-medium">{formatMoney(h.valor, "MXN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Dashboard>
  );
}
