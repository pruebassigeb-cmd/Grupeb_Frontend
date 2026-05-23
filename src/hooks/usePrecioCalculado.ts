import { useState, useEffect, useRef } from "react";
import api from "../services/api";

interface ResultadoCalculo {
  peso_total_kg: number;
  precio_kg: number;
  merma_porcentaje: number;
  costo_produccion: number;
  costo_merma: number;
  costo_total: number;
  precio_unitario: number;
  kilogramos_rango: number;
  tarifa_id: number;
  kilogramos_id: number;
}

interface UsePrecioCalculadoParams {
  cantidad: number;
  porKilo: number | string | undefined;
  tintasId: number;
  enabled?: boolean;
}

export const usePrecioCalculado = ({
  cantidad,
  porKilo,
  tintasId,
  enabled = true,
}: UsePrecioCalculadoParams) => {
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setResultado(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!cantidad || cantidad <= 0 || !porKilo || !tintasId) {
      setResultado(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const response = await api.post(
          "/calcular-precio",
          { cantidad, porKilo: Number(porKilo), tintasId },
          { signal: abortController.signal }
        );

        if (!abortController.signal.aborted) {
          setResultado(response.data);
          setError(null);
        }
      } catch (err: any) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        console.error("❌ Error al calcular precio:", err);
        setError(err.response?.data?.error || "Error al calcular precio. Intenta de nuevo.");
        setResultado(null);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [cantidad, porKilo, tintasId, enabled]);

  return {
    resultado,
    loading,
    error,
    precioUnitario: resultado?.precio_unitario ?? 0,
  };
};

// ============================================
// HOOK BATCH - CALCULAR MÚLTIPLES CANTIDADES
// ============================================
interface UsePreciosBatchParams {
  cantidades: number[];
  porKilo: number | string | undefined;
  tintasId: number;
  enabled?: boolean;
}

export const usePreciosBatch = ({
  cantidades,
  porKilo,
  tintasId,
  enabled = true,
}: UsePreciosBatchParams) => {
  const [resultados, setResultados] = useState<(ResultadoCalculo | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Guardar el valor anterior de cantidades para comparación estable.
  // JSON.stringify en las dependencias causaba disparos espurios porque cada
  // render producía una nueva referencia de array aunque los valores fueran iguales.
  const cantidadesPrevRef = useRef<string>("");

  useEffect(() => {
    // Guard inmediato — si no está habilitado, limpiar todo y NO hacer nada más.
    // Este return debe ser la primera instrucción para que nunca se salte.
    if (!enabled) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setResultados([]);
      setLoading(false);
      setError(null);
      cantidadesPrevRef.current = "";
      return;
    }

    if (!porKilo || !tintasId) {
      setResultados([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cantidadesStr = JSON.stringify(cantidades);

    // Si los valores reales no cambiaron, no hacer nada aunque React re-ejecute el efecto
    if (cantidadesStr === cantidadesPrevRef.current) return;
    cantidadesPrevRef.current = cantidadesStr;

    const cantidadesConIndice = cantidades
      .map((c, i) => ({ cantidad: c, indice: i }))
      .filter(({ cantidad }) => cantidad > 0);

    if (cantidadesConIndice.length === 0) {
      setResultados([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const cantidadesFiltradas = cantidadesConIndice.map((c) => c.cantidad);

        const response = await api.post(
          "/calcular-precios-batch",
          {
            cantidades: cantidadesFiltradas,
            porKilo: Number(porKilo),
            tintasId,
          },
          { signal: abortController.signal }
        );

        if (!abortController.signal.aborted) {
          const resultadosCompletos: (ResultadoCalculo | null)[] = Array(
            cantidades.length
          ).fill(null);

          const resultadosBackend: ResultadoCalculo[] = response.data.resultados;

          cantidadesConIndice.forEach(({ indice }, posicionEnBatch) => {
            resultadosCompletos[indice] = resultadosBackend[posicionEnBatch] ?? null;
          });

          setResultados(resultadosCompletos);
          setError(null);
        }
      } catch (err: any) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        console.error("❌ Error al calcular precios batch:", err);
        setError(err.response?.data?.error || "Error al calcular precios");
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [cantidades, porKilo, tintasId, enabled]);

  return {
    resultados,
    loading,
    error,
    preciosUnitarios: resultados.map((r) => r?.precio_unitario ?? 0),
  };
};