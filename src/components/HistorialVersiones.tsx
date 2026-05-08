import { useState } from "react";
import type { RevisionDiseno } from "../types/ordenDiseno.types";
import { usePermisos } from "../hooks/usePermiso";
import api from "../services/api";

const fmtFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};

interface Props {
  revisiones:   RevisionDiseno[];
  idorden:      number;
  onActualizar: () => void;
}

export default function HistorialVersiones({ revisiones, idorden, onActualizar }: Props) {
  const { puedeEditarDiseno } = usePermisos({
    puedeEditarDiseno: "Editar Diseño",
  });

  const [marcando, setMarcando] = useState<number | null>(null);

  const handleMarcarFinal = async (revId: number) => {
    if (!confirm("¿Marcar esta revisión como versión final? Esta versión nunca será eliminada automáticamente.")) return;
    setMarcando(revId);
    try {
      await api.patch(`/orden-diseno/${idorden}/revision/${revId}/version-final`);
      onActualizar();
    } catch (e: any) {
      alert(e.response?.data?.error || "Error al marcar versión final");
    } finally {
      setMarcando(null);
    }
  };

  if (revisiones.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Aún no hay revisiones registradas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {revisiones.map((rev, idx) => {
        const esFinal    = (rev as any).es_version_final === true;
        const isMarcando = marcando === rev.idrevision;

        return (
          <div key={rev.idrevision} className="flex gap-3">

            {/* Línea de tiempo */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                esFinal
                  ? "bg-green-100 text-green-700 ring-2 ring-green-400"
                  : rev.tipo === "render"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {rev.tipo === "render"
                  ? esFinal ? "★" : `v${rev.numero_version}`
                  : "FB"}
              </div>
              {idx < revisiones.length - 1 && (
                <div className="w-0.5 bg-gray-200 flex-1 mt-1" />
              )}
            </div>

            {/* Contenido */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  esFinal
                    ? "bg-green-100 text-green-700"
                    : rev.tipo === "render"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {rev.tipo === "render" ? `Render v${rev.numero_version}` : "Feedback cliente"}
                </span>

                {esFinal && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-300">
                    ⭐ Versión final
                  </span>
                )}

                <span className="text-xs text-gray-400">{fmtFecha(rev.created_at)}</span>
              </div>

              <p className="text-xs text-gray-500 mb-2">
                Por: {rev.subido_por_nombre} {rev.subido_por_apellido}
              </p>

              {rev.observaciones && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 mb-2">
                  {rev.observaciones}
                </p>
              )}

              {/* Archivos */}
              {rev.archivos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {rev.archivos.map((archivo) => (
                    <a
                      key={archivo.id_archivo}
                      href={archivo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {archivo.mime_type === "application/pdf" ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                      {archivo.nombre.length > 20
                        ? archivo.nombre.substring(0, 20) + "..."
                        : archivo.nombre}
                    </a>
                  ))}
                </div>
              )}

              {/* Botón marcar como final — solo diseño/admin, solo renders, solo si no está marcada */}
              {puedeEditarDiseno && rev.tipo === "render" && !esFinal && (
                <button
                  onClick={() => handleMarcarFinal(rev.idrevision)}
                  disabled={isMarcando}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-green-700 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isMarcando ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                  Marcar como versión final
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}