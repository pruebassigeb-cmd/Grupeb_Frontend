import { useId, useState } from "react";
import PanelAuditoria from "./PanelAuditoria";
import { useAuth } from "../../context/AuthContext";
import { puedeVerAuditoriaUsuario } from "../../utils/permisosUsuario";

interface Props {
  tabla: string;
  id: number | null | undefined;
  /** Texto junto al ícono. Cada pantalla puede ser específica
   *  ("Auditoría del pedido P26120") o dejar el genérico. */
  titulo?: string;
  limite?: number;
  className?: string;
}

/**
 * Misma información que PanelAuditoria, pero colapsada por default detrás
 * de un renglón con el ícono ⓘ.
 *
 * Existe para las pantallas donde mostrar el panel siempre abierto le quita
 * demasiado espacio: listas de pagos (un panel por renglón), filas
 * expandidas de tabla, formularios de edición. El ícono es el mismo que usa
 * BotonAuditoria en modo discreto — aquí se abre inline en vez de en un
 * modal, porque estas pantallas ya tienen su propio scroll y una segunda
 * capa flotante estorba más de lo que ayuda.
 *
 * No pide el historial al backend hasta que se abre: `activo` se pasa igual
 * a `abierto`, mismo patrón perezoso que BotonAuditoria.
 */
export default function AuditoriaDesplegable({
  tabla,
  id,
  titulo = "Auditoría",
  limite = 20,
  className = "",
}: Props) {
  const { user } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const contenidoId = useId();

  if (!puedeVerAuditoriaUsuario(user) || !id) return null;

  return (
    <div className={`rounded-lg border border-gray-200 ${className}`}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={contenidoId}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
      >
        <span
          className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
            abierto
              ? "border-blue-400 bg-blue-50 text-blue-600"
              : "border-gray-300 text-gray-400"
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 011-1h.01a1 1 0 01.99 1v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <span className="flex-1 truncate text-xs font-medium text-gray-600">{titulo}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
            abierto ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {abierto && (
        <div id={contenidoId} className="border-t border-gray-100 bg-gray-50/60 px-3 py-2.5">
          <PanelAuditoria tabla={tabla} id={id} activo compacto limite={limite} />
        </div>
      )}
    </div>
  );
}
