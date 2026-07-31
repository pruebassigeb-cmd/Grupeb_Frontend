import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import {
  getTipoCambioActual,
  getTipoCambioHistorial,
  registrarTipoCambioManual,
  type TipoCambioActual,
} from "../services/tipoCambioService";
import { formatMoney } from "../utils/formatMoney";
import { showAlert } from "../components/CustomAlert";

export default function TipoCambio() {
  const [actual, setActual] = useState<TipoCambioActual | null>(null);
  const [historial, setHistorial] = useState<TipoCambioActual[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [valorTexto, setValorTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

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

  const iniciarEdicion = () => {
    setValorTexto(actual ? String(actual.valor) : "");
    setEditando(true);
  };

  const guardar = async () => {
    const valor = Number(valorTexto);
    if (!valor || valor <= 0) {
      showAlert("Captura un valor mayor a 0");
      return;
    }
    try {
      setGuardando(true);
      await registrarTipoCambioManual(valor);
      setEditando(false);
      await cargar();
      showAlert("Tipo de cambio actualizado");
    } catch (error: any) {
      showAlert(error.response?.data?.error || "Error al guardar el tipo de cambio");
    } finally {
      setGuardando(false);
    }
  };

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-500">Vigente</p>
            {actual ? (
              <>
                <p className="text-3xl font-bold text-indigo-700">
                  {formatMoney(actual.valor, "MXN")} <span className="text-base font-normal text-gray-400">por 1 USD</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {actual.fecha} — {actual.origen === "manual" ? "captura manual" : "Banxico (FIX)"}
                </p>
              </>
            ) : (
              <p className="text-sm text-red-500">Aún no hay un tipo de cambio registrado.</p>
            )}
          </div>

          {!editando ? (
            <button
              onClick={iniciarEdicion}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              Corregir manualmente
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.0001"
                min="0"
                value={valorTexto}
                onChange={(e) => setValorTexto(e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                placeholder="18.50"
                autoFocus
              />
              <button
                onClick={guardar}
                disabled={guardando}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => setEditando(false)}
                disabled={guardando}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Se sincroniza automáticamente todos los días con el tipo de cambio FIX de Banxico.
          La corrección manual solo debe usarse si el valor del día no se pudo obtener o necesita ajustarse.
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
                  <th className="border px-3 py-2 text-left">Origen</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.idtipo_cambio} className="even:bg-gray-50">
                    <td className="border px-3 py-2">{h.fecha}</td>
                    <td className="border px-3 py-2 font-medium">{formatMoney(h.valor, "MXN")}</td>
                    <td className="border px-3 py-2">
                      {h.origen === "manual" ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-semibold">Manual</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold">Banxico</span>
                      )}
                    </td>
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
