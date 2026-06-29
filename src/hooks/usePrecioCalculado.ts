// src/hooks/usePrecioCalculado.ts
import { useState, useEffect, useRef, useMemo } from "react";
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

const toNumeroPositivo = (value: number | string | undefined): number => {
  const numero = Number(value ?? 0);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
};

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
  const requestIdRef = useRef(0);

  useEffect(() => {
    const porKiloNum = toNumeroPositivo(porKilo);
    const tintasIdNum = Number(tintasId ?? 0);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!enabled || cantidad <= 0 || porKiloNum <= 0 || tintasIdNum <= 0) {
      setResultado(null);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await api.post(
          "/calcular-precio",
          { cantidad, porKilo: porKiloNum, tintasId: tintasIdNum },
          { signal: abortController.signal }
        );

        if (!abortController.signal.aborted && requestIdRef.current === requestId) {
          setResultado(response.data);
          setError(null);
        }
      } catch (err: any) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        if (requestIdRef.current !== requestId) return;
        console.error("Error al calcular precio:", err);
        setError(err.response?.data?.error || "Error al calcular precio. Intenta de nuevo.");
        setResultado(null);
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
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
  const requestIdRef = useRef(0);

  const cantidadesEstables = useMemo(
    () => cantidades,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cantidades[0], cantidades[1], cantidades[2]]
  );

  useEffect(() => {
    const porKiloNum = toNumeroPositivo(porKilo);
    const tintasIdNum = Number(tintasId ?? 0);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!enabled || porKiloNum <= 0 || tintasIdNum <= 0) {
      setResultados([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cantidadesConIndice = cantidadesEstables
      .map((cantidad, indice) => ({ cantidad, indice }))
      .filter(({ cantidad }) => Number(cantidad) > 0);

    if (cantidadesConIndice.length === 0) {
      setResultados([]);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await api.post(
          "/calcular-precios-batch",
          {
            cantidades: cantidadesConIndice.map(({ cantidad }) => cantidad),
            porKilo: porKiloNum,
            tintasId: tintasIdNum,
          },
          { signal: abortController.signal }
        );

        if (!abortController.signal.aborted && requestIdRef.current === requestId) {
          const resultadosCompletos: (ResultadoCalculo | null)[] = Array(cantidadesEstables.length).fill(null);
          const resultadosBackend: (ResultadoCalculo | null)[] = response.data.resultados ?? [];

          cantidadesConIndice.forEach(({ indice }, posicionEnBatch) => {
            resultadosCompletos[indice] = resultadosBackend[posicionEnBatch] ?? null;
          });

          setResultados(resultadosCompletos);
          setError(null);
        }
      } catch (err: any) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        if (requestIdRef.current !== requestId) return;
        console.error("Error al calcular precios batch:", err);
        setError(err.response?.data?.error || "Error al calcular precios");
        setResultados([]);
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [cantidadesEstables, porKilo, tintasId, enabled]);

  return {
    resultados,
    loading,
    error,
    preciosUnitarios: resultados.map((r) => r?.precio_unitario ?? 0),
  };
};
