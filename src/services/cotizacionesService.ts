import api from "./api";
import type { RespuestaActualizarEstado, RespuestaCrearCotizacion } from "../types/cotizaciones.types";

export const getCotizaciones = async () => {
  const response = await api.get("/cotizaciones");
  return response.data;
};

export const crearCotizacion = async (datos: {
  clienteId?: number;
  tipo?:      "cotizacion" | "pedido";
  productos: {
    productoId?:   number;
    cantidades:    [number, number, number];
    kilogramos:    [number, number, number];
    precios:       [number, number, number];
    tintasId:      number;
    carasId:       number;
    idsuaje?:      number | null;
    colorAsaId?:   number | null;
    observacion?:  string;
    pantones?:     string | null;
    pigmentos?:    string | null;
    modoCantidad?: "unidad" | "kilo";
    porKilo?:      string | null;
    [key: string]: any;
  }[];
  [key: string]: any;
}): Promise<RespuestaCrearCotizacion> => {
  if (!datos.clienteId) {
    throw new Error("Se requiere clienteId para crear la cotización");
  }

  const productos = datos.productos.map((prod) => {
    if (!prod.productoId) {
      throw new Error(`El producto "${prod.nombre}" no tiene ID asignado`);
    }

    const modo = prod.modoCantidad ?? "unidad";

    const detalles = prod.cantidades
      .map((cantidad, i) => {
        if (cantidad <= 0 || prod.precios[i] <= 0) return null;
        return {
          cantidad,
          precio_total:          Number((cantidad * prod.precios[i]).toFixed(2)),
          modo_cantidad:         modo,
          kilogramos_ingresados: modo === "kilo" && prod.kilogramos?.[i] > 0
            ? prod.kilogramos[i]
            : null,
        };
      })
      .filter(Boolean);

    if (detalles.length === 0) {
      throw new Error(`El producto "${prod.nombre}" no tiene cantidades o precios válidos`);
    }

    return {
      productoId:  prod.productoId,
      tintasId:    prod.tintasId,
      carasId:     prod.carasId,
      idsuaje:     prod.idsuaje     ?? null,
      colorAsaId:  prod.colorAsaId  ?? null,
      observacion: prod.observacion || null,
      pantones:    prod.pantones    ?? null,
      pigmentos:   prod.pigmentos   ?? null,
      porKilo:     prod.porKilo     ?? null,
      detalles,
    };
  });

  console.log("🔍 prioridad antes de enviar:", datos.prioridad);

  const response = await api.post("/cotizaciones", {
    clienteId: datos.clienteId,
    tipo:      datos.tipo ?? "cotizacion",
    prioridad: datos.prioridad ?? false,
    productos,
  });

  return response.data;
};

export const aprobarDetalle = async (detalleId: number, aprobado: boolean) => {
  const response = await api.patch(
    `/cotizaciones/detalle/${detalleId}/aprobar`,
    { aprobado }
  );
  return response.data;
};

export const actualizarObservacion = async (productoId: number, observacion: string) => {
  const response = await api.patch(
    `/cotizaciones/producto/${productoId}/observacion`,
    { observacion }
  );
  return response.data;
};

export const actualizarEstado = async (
  noCotizacion: string,
  estadoId: number
): Promise<RespuestaActualizarEstado> => {
  const response = await api.patch(
    `/cotizaciones/${noCotizacion}/estado`,
    { estadoId }
  );
  return response.data;
};

export const eliminarCotizacion = async (noCotizacion: string) => {
  const response = await api.delete(`/cotizaciones/${noCotizacion}`);
  return response.data;
};