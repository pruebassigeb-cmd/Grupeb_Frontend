import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { calcularPrecioPapel } from "../../services/papel/calculadorPrecioPapel.service";
import type { FilaProducto } from "../../types/expo/expo.types";
import type {
  ReferenciaCantidadPrecioPapel,
  ResultadoCalculoPrecioPapel,
} from "../../types/papel/calculador-precio-papel.types";

const DEBOUNCE_MS = 350;

interface UseCalculoPrecioPapelParams {
  filas: FilaProducto[];
  setFilas: Dispatch<SetStateAction<FilaProducto[]>>;
  columnasPrecio: 1 | 2 | 3;
}

const parseCantidad = (value: string): number =>
  Number.parseInt(String(value || "").replace(/,/g, ""), 10) || 0;

const formatearPrecio = (value: number): string => `$${Number(value).toFixed(2)}`;

const esPapel = (fila: FilaProducto): boolean =>
  fila.producto.categoria === "papel" || fila.producto.categoria === "carton";

function construirFirma(fila: FilaProducto, columnasPrecio: 1 | 2 | 3): string {
  const p = fila.producto;
  return JSON.stringify({
    idproducto_papel: p.idproducto_papel ?? (esPapel(fila) ? p.id : null),
    idgrupo_papel: p.idgrupo_papel ?? null,
    columnasPrecio,
    cantidades: [
      parseCantidad(fila.cant1),
      columnasPrecio >= 2 ? parseCantidad(fila.cant2) : null,
      columnasPrecio >= 3 ? parseCantidad(fila.cant3) : null,
    ],
    acabados: {
      tintasFrente: fila.tintasFrente,
      tintasDentro: fila.usaTintasDentro ? fila.tintasDentro : 0,
      laminacion: fila.laminacion,
      hs: fila.hs,
      ar: fila.ar,
      textura: fila.textura,
      uv: fila.uv,
      asa: fila.asa,
    },
  });
}

function resultadoPorReferencia(
  resultados: ResultadoCalculoPrecioPapel[],
  referencia: ReferenciaCantidadPrecioPapel,
): ResultadoCalculoPrecioPapel | undefined {
  return resultados.find((item) => item.referencia === referencia);
}

export function useCalculoPrecioPapel({
  filas,
  setFilas,
  columnasPrecio,
}: UseCalculoPrecioPapelParams): void {
  const firmasRef = useRef(new Map<string, string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const controllersRef = useRef(new Map<string, AbortController>());

  const actualizarFila = useCallback((
    uid: string,
    updater: (fila: FilaProducto) => FilaProducto,
  ) => {
    setFilas((prev) => prev.map((fila) => fila.uid === uid ? updater(fila) : fila));
  }, [setFilas]);

  const recalcularFila = useCallback(async (fila: FilaProducto) => {
    if (!esPapel(fila)) return;

    const idProducto = fila.producto.idproducto_papel ?? fila.producto.id;
    const idGrupo = fila.producto.idgrupo_papel ?? null;
    const cantidades = [
      { referencia: "precio1" as const, cantidad: parseCantidad(fila.cant1) },
      ...(columnasPrecio >= 2
        ? [{ referencia: "precio2" as const, cantidad: parseCantidad(fila.cant2) }]
        : []),
      ...(columnasPrecio >= 3
        ? [{ referencia: "precio3" as const, cantidad: parseCantidad(fila.cant3) }]
        : []),
    ].filter((item) => item.cantidad > 0);

    if (!idProducto || !idGrupo) {
      actualizarFila(fila.uid, (actual) => ({
        ...actual,
        calculandoPrecio: false,
        errorCalculoPrecio: "El producto necesita un grupo de papel para calcularse. Puedes capturar el precio manualmente.",
      }));
      return;
    }

    if (!cantidades.length) {
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
      const response = await calcularPrecioPapel({
        idproducto_papel: idProducto,
        idgrupo_papel: idGrupo,
        cantidades,
        acabados: {
          tintas_frente: Math.max(0, Number(fila.tintasFrente) || 0),
          tintas_dentro: fila.usaTintasDentro
            ? Math.max(0, Number(fila.tintasDentro) || 0)
            : 0,
          laminado: fila.laminacion,
          hot_stamping: fila.hs,
          alto_relieve: fila.ar,
          textura: fila.textura,
          uv: fila.uv,
          asa: fila.asa,
        },
      }, controller.signal);

      if (controller.signal.aborted) return;

      actualizarFila(fila.uid, (actual) => {
        const r1 = resultadoPorReferencia(response.resultados, "precio1");
        const r2 = resultadoPorReferencia(response.resultados, "precio2");
        const r3 = resultadoPorReferencia(response.resultados, "precio3");
        const c1 = r1 ? formatearPrecio(r1.precio_calculado) : "";
        const c2 = r2 ? formatearPrecio(r2.precio_calculado) : "";
        const c3 = r3 ? formatearPrecio(r3.precio_calculado) : "";

        return {
          ...actual,
          producto: {
            ...actual.producto,
            idTamanoProducto: response.producto.id_tamano_producto ?? undefined,
            tamanoProd: response.producto.tamano_producto ?? actual.producto.tamanoProd,
          },
          precioCalculado1: c1,
          precioCalculado2: c2,
          precioCalculado3: c3,
          precio1: actual.precioManual1 || !r1 ? actual.precio1 : c1,
          precio2: actual.precioManual2 || !r2 ? actual.precio2 : c2,
          precio3: actual.precioManual3 || !r3 ? actual.precio3 : c3,
          advertenciasPrecio1: r1?.advertencias ?? [],
          advertenciasPrecio2: r2?.advertencias ?? [],
          advertenciasPrecio3: r3?.advertencias ?? [],
          calculandoPrecio: false,
          errorCalculoPrecio: null,
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
          "No se pudo calcular el precio. Puedes capturarlo manualmente.",
      }));
    } finally {
      if (controllersRef.current.get(fila.uid) === controller) {
        controllersRef.current.delete(fila.uid);
      }
    }
  }, [actualizarFila, columnasPrecio]);

  useEffect(() => {
    const uidsActuales = new Set(filas.map((fila) => fila.uid));

    for (const uid of Array.from(firmasRef.current.keys()) as string[]) {
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
      if (!esPapel(fila)) continue;
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
