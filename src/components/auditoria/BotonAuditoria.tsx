import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PanelAuditoria from "./PanelAuditoria";
import { useAuth } from "../../context/AuthContext";
import { puedeVerAuditoriaUsuario } from "../../utils/permisosUsuario";

interface Props {
  tabla: string;
  id: number | null | undefined;
  etiqueta?: string;
  alineacion?: "izquierda" | "derecha";
  className?: string;
}

/** Botón discreto para consultar autoría e historial bajo demanda. */
export default function BotonAuditoria({
  tabla,
  id,
  etiqueta = "Ver información de auditoría",
  alineacion = "derecha",
  className = "",
}: Props) {
  const { user } = useAuth();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;

    const cerrarEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    document.addEventListener("keydown", cerrarEscape);
    return () => document.removeEventListener("keydown", cerrarEscape);
  }, [abierto]);

  if (!puedeVerAuditoriaUsuario(user) || !id) return null;

  const contenido = abierto && typeof document !== "undefined"
    ? createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/35 p-4 pt-[8vh] backdrop-blur-[1px]"
          role="presentation"
          onMouseDown={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-4 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={etiqueta}
            data-alineacion={alineacion}
            onMouseDown={(evento) => evento.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-gray-100 pb-2">
              <h4 className="text-sm font-semibold text-gray-800">{etiqueta}</h4>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="-mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <PanelAuditoria tabla={tabla} id={id} activo compacto limite={20} />
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <span className={`inline-flex ${className}`}>
        <button
          type="button"
          onClick={(evento) => {
            evento.stopPropagation();
            setAbierto(true);
          }}
          title={etiqueta}
          aria-label={etiqueta}
          aria-expanded={abierto}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
            abierto
              ? "border-blue-400 bg-blue-50 text-blue-600"
              : "border-gray-300 text-gray-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 011-1h.01a1 1 0 01.99 1v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </span>
      {contenido}
    </>
  );
}
