import { useCallback, useEffect, useState } from "react";
import { getAuditoria, type Auditoria } from "../services/auditoriaService";

interface EstadoAuditoria {
  auditoria: Auditoria | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

interface ResultadoAuditoria {
  clave: string;
  auditoria: Auditoria | null;
  error: string | null;
}

/**
 * Historial de un registro. En modo discreto `activo` permanece en false
 * hasta que la persona abre el botón de información.
 */
export function useAuditoria(
  tabla: string,
  id: number | null | undefined,
  activo = true,
  limite = 50,
): EstadoAuditoria {
  const [resultado, setResultado] = useState<ResultadoAuditoria | null>(null);
  const [intento, setIntento] = useState(0);

  const recargar = useCallback(() => setIntento((numero) => numero + 1), []);
  const clave = activo && id ? `${tabla}:${id}:${limite}:${intento}` : null;

  useEffect(() => {
    if (!clave || !id) return;

    let cancelado = false;

    getAuditoria(tabla, id, limite)
      .then((auditoria) => {
        if (!cancelado) setResultado({ clave, auditoria, error: null });
      })
      .catch((error) => {
        if (cancelado) return;
        setResultado({
          clave,
          auditoria: null,
          error:
            error?.response?.status === 403
              ? "No tienes permiso para ver este historial"
              : error?.response?.data?.error ?? "No se pudo cargar el historial",
        });
      });

    return () => {
      cancelado = true;
    };
  }, [tabla, id, activo, limite, intento, clave]);

  if (!clave) {
    return { auditoria: null, cargando: false, error: null, recargar };
  }

  if (resultado?.clave !== clave) {
    return { auditoria: null, cargando: true, error: null, recargar };
  }

  return {
    auditoria: resultado.auditoria,
    cargando: false,
    error: resultado.error,
    recargar,
  };
}
