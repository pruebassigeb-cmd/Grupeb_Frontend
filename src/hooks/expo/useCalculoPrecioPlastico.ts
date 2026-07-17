// src/hooks/expo/useCalculoPrecioPlastico.ts
import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { calcularPreciosPlasticoBatch } from "../../services/plastico/calculadorPrecioPlastico.service";
import type { FilaProducto } from "../../types/expo/expo.types";
import type { ResultadoCalculoPrecioPlastico } from "../../types/plastico/calculador-precio-plastico.types";

const DEBOUNCE_MS = 500;

interface UseCalculoPrecioPlasticoParams {
  filas: FilaProducto[];
  setFilas: Dispatch<SetStateAction<FilaProducto[]>>;
  columnasPrecio: 1 | 2 | 3;
}

const parseCantidad = (value: string): number =>
  Number.parseInt(String(value || "").replace(/,/g, ""), 10) || 0;

const formatearPrecio = (value: number): string =>
  `$${Number(value).toFixed(4)}`;

const esPlastico = (fila: FilaProducto): boolean =>
  fila.producto.categoria === "plastico";

function cantidadesActivas(
  fila: FilaProducto,
  columnasPrecio: 1 | 2 | 3,
): Array<{ referencia: 1 | 2 | 3; cantidad: number }> {
  return [
    { referencia: 1 as const, cantidad: parseCantidad(fila.cant1) },
    ...(columnasPrecio >= 2
      ? [{ referencia: 2 as const, cantidad: parseCantidad(fila.cant2) }]
      : []),
    ...(columnasPrecio >= 3
      ? [{ referencia: 3 as const, cantidad: parseCantidad(fila.cant3) }]
      : []),
  ].filter(({ cantidad }) => cantidad > 0);
}

function construirFirma(
  fila: FilaProducto,
  columnasPrecio: 1 | 2 | 3,
): string {
  return JSON.stringify({
    columnasPrecio,
    porKilo: Number(fila.producto.porKilo ?? 0),
    tintasCantidad: Number(fila.tintasFrente ?? 0),
    cantidades: cantidadesActivas(fila, columnasPrecio),
  });
}

export function useCalculoPrecioPlastico({
  filas,
  setFilas,
  columnasPrecio,
}: UseCalculoPrecioPlasticoParams): void {
  const firmasRef = useRef(new Map<string, string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const controllersRef = useRef(new Map<string, AbortController>());

  const actualizarFila = useCallback((
    uid: string,
    updater: (fila: FilaProducto) => FilaProducto,
  ) => {
    setFilas((prev) =>
      prev.map((fila) => fila.uid === uid ? updater(fila) : fila),
    );
  }, [setFilas]);

  const recalcularFila = useCallback(async (fila: FilaProducto) => {
    if (!esPlastico(fila)) return;

    const porKilo = Number(fila.producto.porKilo ?? 0);
    const tintasCantidad = Number(fila.tintasFrente ?? 0);
    const activas = cantidadesActivas(fila, columnasPrecio);

    if (!Number.isFinite(porKilo) || porKilo <= 0) {
      actualizarFila(fila.uid, (actual) => ({
        ...actual,
        calculandoPrecio: false,
        errorCalculoPrecio:
          "El producto plástico no tiene bolsas por kilo configuradas. Puedes capturar el precio manualmente.",
      }));
      return;
    }

    if (!Number.isInteger(tintasCantidad) || tintasCantidad <= 0) {
      actualizarFila(fila.uid, (actual) => ({
        ...actual,
        calculandoPrecio: false,
        errorCalculoPrecio:
          "Selecciona una cantidad válida de tintas para calcular el precio.",
      }));
      return;
    }

    if (activas.length === 0) {
      actualizarFila(fila.uid, (actual) => ({
        ...actual,
        calculandoPrecio: false,
        errorCalculoPrecio: null,
      }));
      return;
    }

    controllersRef.current.get(fila.uid)?.abort();
    const controller = new AbortController();
    controllersRef.current.set(fila.uid, controller);

    actualizarFila(fila.uid, (actual) => ({
      ...actual,
      calculandoPrecio: true,
      errorCalculoPrecio: null,
    }));

    try {
      const response = await calcularPreciosPlasticoBatch(
        {
          cantidades: activas.map(({ cantidad }) => cantidad),
          porKilo,
          tintasCantidad,
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      const resultadoPorColumna = new Map<1 | 2 | 3, ResultadoCalculoPrecioPlastico>();
      activas.forEach(({ referencia }, indice) => {
        const resultado = response.resultados?.[indice] ?? null;
        if (resultado) resultadoPorColumna.set(referencia, resultado);
      });

      const faltante = activas.find(
        ({ referencia }) => !resultadoPorColumna.has(referencia),
      );

      actualizarFila(fila.uid, (actual) => {
        const r1 = resultadoPorColumna.get(1);
        const r2 = resultadoPorColumna.get(2);
        const r3 = resultadoPorColumna.get(3);

        const c1 = r1 ? formatearPrecio(r1.precio_unitario) : "";
        const c2 = r2 ? formatearPrecio(r2.precio_unitario) : "";
        const c3 = r3 ? formatearPrecio(r3.precio_unitario) : "";

        return {
          ...actual,
          precioCalculado1: c1,
          precioCalculado2: c2,
          precioCalculado3: c3,
          precio1: actual.precioManual1 || !r1 ? actual.precio1 : c1,
          precio2: actual.precioManual2 || !r2 ? actual.precio2 : c2,
          precio3: actual.precioManual3 || !r3 ? actual.precio3 : c3,
          advertenciasPrecio1: [],
          advertenciasPrecio2: [],
          advertenciasPrecio3: [],
          calculandoPrecio: false,
          errorCalculoPrecio: faltante
            ? "No se encontró una tarifa de producción para una de las cantidades. Puedes capturar el precio manualmente."
            : null,
        };
      });
    } catch (error: any) {
      if (
        controller.signal.aborted ||
        error?.code === "ERR_CANCELED" ||
        error?.name === "CanceledError"
      ) return;

      actualizarFila(fila.uid, (actual) => ({
        ...actual,
        calculandoPrecio: false,
        errorCalculoPrecio:
          error?.response?.data?.error ||
          "No se pudo calcular el precio de plástico. Puedes capturarlo manualmente.",
      }));
    } finally {
      if (controllersRef.current.get(fila.uid) === controller) {
        controllersRef.current.delete(fila.uid);
      }
    }
  }, [actualizarFila, columnasPrecio]);

  useEffect(() => {
    const uidsActuales = new Set(filas.map((fila) => fila.uid));

    for (const uid of Array.from(firmasRef.current.keys())) {
      if (!uidsActuales.has(uid)) {
        firmasRef.current.delete(uid);
        const timer = timersRef.current.get(uid);
        if (timer) clearTimeout(timer);
        timersRef.current.delete(uid);
        controllersRef.current.get(uid)?.abort();
        controllersRef.current.delete(uid);
      }
    }

    for (const fila of filas) {
      if (!esPlastico(fila)) continue;

      const firma = construirFirma(fila, columnasPrecio);
      if (firmasRef.current.get(fila.uid) === firma) continue;

      firmasRef.current.set(fila.uid, firma);

      const timerAnterior = timersRef.current.get(fila.uid);
      if (timerAnterior) clearTimeout(timerAnterior);
      controllersRef.current.get(fila.uid)?.abort();

      const timer = setTimeout(() => {
        timersRef.current.delete(fila.uid);
        void recalcularFila(fila);
      }, DEBOUNCE_MS);

      timersRef.current.set(fila.uid, timer);
    }
  }, [filas, columnasPrecio, recalcularFila]);

  useEffect(() => () => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    for (const controller of controllersRef.current.values()) controller.abort();
    timersRef.current.clear();
    controllersRef.current.clear();
    firmasRef.current.clear();
  }, []);
}
