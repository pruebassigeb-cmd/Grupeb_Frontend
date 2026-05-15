// src/hooks/useCodigoPostal.ts
import { useState, useCallback } from "react";
import { buscarCodigoPostal } from "../services/codigoPostalService";
import type { OpcionCP } from "../types/formulario-solicitud.types";

export function useCodigoPostal() {
  const [cargandoCP, setCargandoCP] = useState(false);
  const [errorCP, setErrorCP] = useState<string | null>(null);

  const buscarCP = useCallback(async (cp: string): Promise<OpcionCP[]> => {
    if (cp.length !== 5) return [];

    setCargandoCP(true);
    setErrorCP(null);

    try {
      const data = await buscarCodigoPostal(cp);
      return data;
    } catch {
      setErrorCP("CP no encontrado — puedes capturar los datos manualmente");
      return [];
    } finally {
      setCargandoCP(false);
    }
  }, []);

  return {
    buscarCP,
    cargandoCP,
    errorCP,
    setErrorCP,
  };
}