import { useEffect, useState } from "react";
import {
  getTipoCambioActual,
  type TipoCambioActual,
} from "../services/tipoCambioService";

interface EstadoTipoCambio {
  tipoCambio: TipoCambioActual | null;
  cargando: boolean;
  error: string | null;
}

// Precarga el tipo de cambio vigente para formularios que cotizan o
// registran pagos en USD. El valor siempre queda editable en el formulario
// que lo consume — este hook solo resuelve la sugerencia inicial.
export function useTipoCambioActual(): EstadoTipoCambio {
  const [estado, setEstado] = useState<EstadoTipoCambio>({
    tipoCambio: null,
    cargando: true,
    error: null,
  });

  useEffect(() => {
    let cancelado = false;

    getTipoCambioActual()
      .then((tipoCambio) => {
        if (!cancelado) setEstado({ tipoCambio, cargando: false, error: null });
      })
      .catch((err) => {
        if (!cancelado) {
          setEstado({
            tipoCambio: null,
            cargando: false,
            error:
              err?.response?.data?.error ?? "No se pudo obtener el tipo de cambio",
          });
        }
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return estado;
}
