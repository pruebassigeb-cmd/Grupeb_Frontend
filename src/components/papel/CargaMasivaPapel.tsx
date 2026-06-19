// src/components/papel/CargaMasivaPapel.tsx
import { useState, useRef } from "react";
import {
  subirCargaMasivaPapel,
  descargarReporteCatalogos,
} from "../../services/papel/cargaMasiva.service";
import type { RespuestaCargaMasiva } from "../../types/papel/cargaMasiva.types";

const PLANTILLA_URL = "/plantillas/plantilla_carga_masiva_papel.xlsm"; // .xlsm: ya incluye la macro de selección múltiple — colócala en /public/plantillas

export default function CargaMasivaPapel() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<RespuestaCargaMasiva | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setArchivo(null);
    setResultado(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const cerrar = () => {
    setMostrarModal(false);
    reset();
  };

  const handleSubir = async () => {
    if (!archivo) return;
    setCargando(true);
    setError(null);
    try {
      const data = await subirCargaMasivaPapel(archivo);
      setResultado(data);
    } catch (e: any) {
      setError(e.message ?? "Error al procesar el archivo");
    } finally {
      setCargando(false);
    }
  };

  const handleDescargarReporte = async () => {
    if (!resultado) return;
    try {
      await descargarReporteCatalogos(resultado.catalogosNuevos);
    } catch (e: any) {
      alert(e.message ?? "Error al descargar el reporte");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMostrarModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
      >
        📤 Carga masiva
      </button>

      {mostrarModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Carga masiva de productos de papel</h3>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {!resultado && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <p className="font-medium mb-1">¿No tienes la plantilla?</p>
                    <a
                      href={PLANTILLA_URL}
                      download
                      className="underline hover:text-blue-900"
                    >
                      Descargar plantilla de Excel
                    </a>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecciona el archivo .xlsx ya lleno
                    </label>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".xlsx"
                      onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubir}
                    disabled={!archivo || cargando}
                    className="w-full py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {cargando ? "Procesando..." : "Subir y procesar"}
                  </button>
                </>
              )}

              {resultado && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{resultado.resumen.total}</p>
                      <p className="text-xs text-gray-500">Filas procesadas</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{resultado.resumen.creados}</p>
                      <p className="text-xs text-green-600">Creados</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{resultado.resumen.conError}</p>
                      <p className="text-xs text-red-600">Con error</p>
                    </div>
                  </div>

                  {resultado.catalogosNuevos.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-amber-800">
                          ⚠️ {resultado.catalogosNuevos.length} catálogo(s) nuevo(s) creado(s)
                        </p>
                        <button
                          onClick={handleDescargarReporte}
                          className="text-xs underline text-amber-700 hover:text-amber-900"
                        >
                          Descargar reporte
                        </button>
                      </div>
                      <p className="text-xs text-amber-700">
                        Revisa que no sean duplicados por error de dedo (ej. "UV" vs "U.V.").
                      </p>
                    </div>
                  )}

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                      <span>Fila</span>
                      <span>Producto ID</span>
                      <span>Estado</span>
                      <span>Detalle</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                      {resultado.resultados.map((r, i) => (
                        <div key={i} className="grid grid-cols-4 px-4 py-2 text-sm items-center">
                          <span className="text-gray-500">{r.fila}</span>
                          <span className="text-gray-900 font-medium truncate">{r.producto_id}</span>
                          <span>
                            {r.estado === "creado" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Creado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                ✗ Error
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-gray-500 truncate" title={r.error}>
                            {r.estado === "creado" ? `#${r.idproducto_papel}` : r.error}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={reset}
                    className="w-full py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Subir otro archivo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}