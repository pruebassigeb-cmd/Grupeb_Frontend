import api from "./api";
import type { RespuestaActualizarEstado, RespuestaCrearCotizacion } from "../types/cotizaciones.types";

export const getCotizaciones = async () => {
  const response = await api.get("/cotizaciones");
  return response.data;
};

export const crearCotizacion = async (datos: {
  clienteId?: number;
  tipo?:      "cotizacion" | "pedido";
  sin_iva?:   boolean;
  productos: any[];
  [key: string]: any;
}): Promise<RespuestaCrearCotizacion> => {
  if (!datos.clienteId) {
    throw new Error("Se requiere clienteId para crear la cotización");
  }

  const productos = datos.productos.map((prod: any) => {
    // ── PAPEL: pasa intacto, no lleva productoId ni detalles de plástico ──
    if (prod.tipoCotizacion === "papel") {
      return {
        tipoCotizacion:    "papel",
        idproducto_papel:  prod.idproducto_papel,
        nombre:            prod.nombre,
        idgrupo_papel:     prod.idgrupo_papel ?? null,
        grupo_descripcion: prod.grupo_descripcion ?? null,
        tintasId:          prod.tintasId ?? null,
        pantones:          prod.pantones || null,
        tintasDentroId:    prod.tintasDentroId ?? null,
        pantonesDentro:    prod.pantonesDentro || null,
        carasId:           prod.carasId ?? null,
        id_asa:            prod.id_asa ?? null,
        idcat_laminado:    prod.idcat_laminado ?? null,
        idfoil:            prod.idfoil ?? null,
        idcat_textura:     prod.idcat_textura ?? null,
        uv:                prod.uv ?? false,
        alto_relieve:      prod.alto_relieve ?? false,
        observacion:       prod.observacion || null,
        descripcion:       prod.descripcion ?? null,
        cantidades:        prod.cantidades,
        precios:           prod.precios,
      };
    }

    // ── PLÁSTICO ──
    if (!prod.productoId) {
      throw new Error(`El producto "${prod.nombre}" no tiene ID asignado`);
    }

    const modo = prod.modoCantidad ?? "unidad";

    const detalles = prod.cantidades
      .map((cantidad: number, i: number) => {
        if (cantidad <= 0 || prod.precios[i] <= 0) return null;

        let precio_total: number;
        if (modo === "kilo" && prod.kilogramos?.[i] > 0 && prod.porKilo) {
          const precioKg = Math.round(prod.precios[i] * Number(prod.porKilo) * 10000) / 10000;
          precio_total   = Math.round(prod.kilogramos[i] * precioKg * 100) / 100;
        } else {
          precio_total = Number((cantidad * prod.precios[i]).toFixed(2));
        }

        return {
          cantidad,
          precio_total,
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
      productoId:              prod.productoId,
      tintasId:                prod.tintasId,
      carasId:                 prod.carasId,
      idsuaje:                 prod.idsuaje         ?? null,
      colorAsaId:              prod.colorAsaId      ?? null,
      idMedidaTroquel:         prod.idMedidaTroquel ?? null,
      observacion:             prod.observacion     || null,
      descripcion:             prod.descripcion     ?? null,
      perforacion:             prod.perforacion     ?? false,
      pantones:                prod.pantones        ?? null,
      pigmentos:               prod.pigmentos       ?? null,
      porKilo:                 prod.porKilo         ?? null,
      herramental_descripcion: prod.herramental_descripcion ?? null,
      herramental_precio:      prod.herramental_precio      ?? null,
      detalles,
    };
  });

  console.log("🔍 prioridad antes de enviar:", datos.prioridad, "| sin_iva:", datos.sin_iva);

  const response = await api.post("/cotizaciones", {
    clienteId: datos.clienteId,
    tipo:      datos.tipo      ?? "cotizacion",
    prioridad: datos.prioridad ?? false,
    sin_iva:   datos.sin_iva   ?? false,
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

export const aprobarHerramental = async (herramentalId: number, aprobado: boolean) => {
  const response = await api.patch(
    `/cotizaciones/herramental/${herramentalId}/aprobar`,
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