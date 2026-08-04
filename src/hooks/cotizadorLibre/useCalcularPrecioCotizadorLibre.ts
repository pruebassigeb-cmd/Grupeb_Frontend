// src/hooks/cotizadorLibre/useCalcularPrecioCotizadorLibre.ts
import { useEffect, useRef, useState } from "react";
import {
  calcularPrecioCotizadorLibre,
  type CalcularPrecioCotizadorLibrePayload,
  type CalcularPrecioCotizadorLibreResponse,
} from "../../services/cotizadorLibre/cotizadorLibrePrecio.service";

const DEBOUNCE_MS = 500;

interface UseCalcularPrecioCotizadorLibreParams {
  payload: CalcularPrecioCotizadorLibrePayload | null;
}

export function useCalcularPrecioCotizadorLibre({
  payload,
}: UseCalcularPrecioCotizadorLibreParams) {
  const [resultado, setResultado] = useState<CalcularPrecioCotizadorLibreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    // Sin payload (aún no hay cantidad/material suficiente) → no se calcula nada.
    if (!payload) {
      setResultado(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const data = await calcularPrecioCotizadorLibre(payload, controller.signal);
        if (!controller.signal.aborted) {
          setResultado(data);
          setError(null);
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        console.error("Error al calcular precio:", err);
        setError(err?.response?.data?.error || "No se pudo calcular el precio.");
        setResultado(null);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload)]);

  return { resultado, loading, error };
}