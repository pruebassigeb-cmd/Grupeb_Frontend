// src/services/cotizacionesService.ts
import api from "./api";
import { ejecutarOEncolar } from "../offline/outbox";
import type {
  Cotizacion,
  CrearCotizacionPayload,
  DetalleCrearCotizacion,
  ProductoEnviarCotizacion,
  RespuestaActualizarEstado,
  RespuestaCrearCotizacion,
} from "../types/cotizaciones.types";
import type { MaquinariaProductoPedidoPapel } from "../types/papel/maquinaria-pedido.types";

export const getCotizaciones = async (): Promise<Cotizacion[]> => {
  const response = await api.get("/cotizaciones");
  return response.data;
};

const esProductoPapel = (prod: any): boolean =>
  prod?.tipoCotizacion === "papel" ||
  prod?.tipo_material === "papel" ||
  prod?.idproducto_papel != null ||
  prod?.producto_papel_idproducto_papel != null;

export const crearCotizacion = async (
  datos: CrearCotizacionPayload
): Promise<RespuestaCrearCotizacion> => {
  if (!datos.clienteId) {
    throw new Error("Se requiere clienteId para crear la cotizacion");
  }

  const productos: ProductoEnviarCotizacion[] = datos.productos.map((prod: any) => {
    if (esProductoPapel(prod)) {
      return {
        tipoCotizacion: "papel",
        tipo_material: "papel",
        idproducto_papel: prod.idproducto_papel,
        nombre: prod.nombre,
        idgrupo_papel: prod.idgrupo_papel ?? null,
        grupo_descripcion: prod.grupo_descripcion ?? null,
        tintasId: prod.tintasId ?? null,
        pantones: prod.pantones || null,
        tintasDentroId: prod.tintasDentroId ?? null,
        pantonesDentro: prod.pantonesDentro || null,
        carasId: prod.carasId ?? null,
        id_asa: prod.id_asa ?? null,
        id_color: prod.id_color ?? null,
        color_asa_nombre: prod.color_asa_nombre ?? null,
        asa_color: prod.asa_color ?? null,
        tamano_asa: prod.tamano_asa?.trim() || null,
        idcat_laminado: prod.idcat_laminado ?? null,
        idfoil: prod.idfoil ?? null,
        idcat_textura: prod.idcat_textura ?? null,
        uv: prod.uv ?? false,
        alto_relieve: prod.alto_relieve ?? false,
        metodo_hojeado: prod.metodo_hojeado,
        lleva_armado: prod.lleva_armado === true,
        observacion: prod.observacion || null,
        descripcion: prod.descripcion ?? null,
        cantidades: prod.cantidades,
        precios: prod.precios,
        herramental_descripcion: prod.herramental_descripcion ?? null,
        herramental_precio: prod.herramental_precio ?? null,
        cargo_adicional_descripcion: prod.cargo_adicional_descripcion ?? null,
        cargo_adicional_precio: prod.cargo_adicional_precio ?? null,
      };
    }

    if (!prod.productoId) {
      throw new Error(`El producto "${prod.nombre}" no tiene ID asignado`);
    }

    const modo = prod.modoCantidad ?? "unidad";

    const detalles: DetalleCrearCotizacion[] = prod.cantidades
      .map((cantidad: number, i: number) => {
        if (cantidad <= 0 || prod.precios[i] <= 0) return null;

        let precio_total: number;
        if (modo === "kilo" && prod.kilogramos?.[i] > 0 && prod.porKilo) {
          const precioKg = Math.round(prod.precios[i] * Number(prod.porKilo) * 10000) / 10000;
          precio_total = Math.round(prod.kilogramos[i] * precioKg * 100) / 100;
        } else {
          precio_total = Number((cantidad * prod.precios[i]).toFixed(2));
        }

        return {
          cantidad,
          precio_total,
          modo_cantidad: modo,
          kilogramos_ingresados:
            modo === "kilo" && prod.kilogramos?.[i] > 0 ? prod.kilogramos[i] : null,
        };
      })
      .filter((detalle: DetalleCrearCotizacion | null): detalle is DetalleCrearCotizacion => detalle !== null);

    if (detalles.length === 0) {
      throw new Error(`El producto "${prod.nombre}" no tiene cantidades o precios validos`);
    }

    return {
      tipoCotizacion: "plastico",
      tipo_material: "plastico",
      productoId: prod.productoId,
      tintasId: prod.tintasId,
      carasId: prod.carasId,
      idsuaje: prod.idsuaje ?? null,
      colorAsaId: prod.colorAsaId ?? null,
      idMedidaTroquel: prod.idMedidaTroquel ?? null,
      observacion: prod.observacion || null,
      descripcion: prod.descripcion ?? null,
      perforacion: prod.perforacion ?? false,
      pantones: prod.pantones ?? null,
      pigmentos: prod.pigmentos ?? null,
      porKilo: prod.porKilo ?? null,
      herramental_descripcion: prod.herramental_descripcion ?? null,
      herramental_precio: prod.herramental_precio ?? null,
      detalles,
    };
  });

  const payload = {
    clienteId: datos.clienteId,
    tipo: datos.tipo ?? "cotizacion",
    prioridad: datos.prioridad ?? false,
    sin_iva: datos.sin_iva ?? false,
    productos,
  };

  return ejecutarOEncolar(
    "post",
    "/cotizaciones",
    payload,
    `Cotización nueva — cliente ${datos.clienteId}`,
    async () => {
      const response = await api.post("/cotizaciones", payload);
      return response.data;
    }
  );
};

export const aprobarDetalle = async (detalleId: number, aprobado: boolean) => {
  const response = await api.patch(`/cotizaciones/detalle/${detalleId}/aprobar`, { aprobado });
  return response.data;
};

export const aprobarHerramental = async (herramentalId: number, aprobado: boolean) => {
  const response = await api.patch(`/cotizaciones/herramental/${herramentalId}/aprobar`, { aprobado });
  return response.data;
};

export const actualizarObservacion = async (productoId: number, observacion: string) => {
  const response = await api.patch(`/cotizaciones/producto/${productoId}/observacion`, { observacion });
  return response.data;
};

export const actualizarEstado = async (
  noCotizacion: string,
  estadoId: number,
  maquinariaPapel: MaquinariaProductoPedidoPapel[] = []
): Promise<RespuestaActualizarEstado> => {
  const response = await api.patch(`/cotizaciones/${noCotizacion}/estado`, {
    estadoId,
    maquinariaPapel,
  });
  return response.data;
};

export const eliminarCotizacion = async (noCotizacion: string) => {
  const response = await api.delete(`/cotizaciones/${noCotizacion}`);
  return response.data;
};

// ─── Editar cotización (antes de aprobar) ────────────────────────────────

export interface DetalleCotizacionActualizar {
  iddetalle: number | null;
  cantidad: number;
  precio_total: number;
  kilogramos?: number | null;
  modo_cantidad: "unidad" | "kilo";
}

interface ProductoCotizacionActualizarBase {
  idsolicitud_producto: number;
  eliminado: boolean;
  observacion: string | null;
  descripcion: string | null;
  herramental_descripcion: string | null;
  herramental_precio: number | null;
  detalles: DetalleCotizacionActualizar[];
}

export interface ProductoPlasticoCotizacionActualizar extends ProductoCotizacionActualizarBase {
  tipo_material?: "plastico";
  tipoCotizacion?: "plastico";
  nuevo_configuracion_id?: number;
  tintas: number;
  caras: number;
  pantones: string | null;
  pigmentos: string | null;
  perforacion: boolean;
  idsuaje: number | null;
  id_color: number | null;
  id_medidatro: number | null;
}

export interface ProductoPapelCotizacionActualizar extends ProductoCotizacionActualizarBase {
  tipo_material: "papel";
  tipoCotizacion: "papel";
  idproducto_papel: number;
  idgrupo_papel: number | null;
  grupo_descripcion: string | null;
  tintasId: number | null;
  carasId: number | null;
  pantones: string | null;
  id_asa: number | null;
  tamano_asa?: string | null;
  id_color: number | null;
  idcat_laminado: number | null;
  idfoil: number | null;
  idcat_textura: number | null;
  uv: boolean;
  alto_relieve: boolean;
  tintasDentroId: number | null;
  pantonesDentro: string | null;
  cargo_adicional_descripcion?: string | null;
  cargo_adicional_precio?: number | null;
}

export type ProductoCotizacionActualizar =
  | ProductoPlasticoCotizacionActualizar
  | ProductoPapelCotizacionActualizar;

interface ProductoCotizacionNuevoBase {
  observacion: string | null;
  descripcion: string | null;
  herramental_descripcion: string | null;
  herramental_precio: number | null;
  detalles: Omit<DetalleCotizacionActualizar, "iddetalle">[];
}

export interface ProductoCotizacionNuevoPlastico extends ProductoCotizacionNuevoBase {
  tipo_material?: "plastico";
  tipoCotizacion?: "plastico";
  configuracion_plastico_id: number;
  tintas: number;
  caras: number;
  pantones: string | null;
  pigmentos: string | null;
  perforacion: boolean;
  idsuaje: number | null;
  id_color: number | null;
  id_medidatro: number | null;
}

export interface ProductoCotizacionNuevoPapel extends ProductoCotizacionNuevoBase {
  tipo_material: "papel";
  tipoCotizacion: "papel";
  idproducto_papel: number;
  idgrupo_papel: number | null;
  grupo_descripcion: string | null;
  tintasId: number | null;
  carasId: number | null;
  pantones: string | null;
  id_asa: number | null;
  tamano_asa?: string | null;
  id_color: number | null;
  idcat_laminado: number | null;
  idfoil: number | null;
  idcat_textura: number | null;
  uv: boolean;
  alto_relieve: boolean;
  tintasDentroId: number | null;
  pantonesDentro: string | null;
}

export type ProductoCotizacionNuevo =
  | ProductoCotizacionNuevoPlastico
  | ProductoCotizacionNuevoPapel;

export interface ActualizarCotizacionPayload {
  productos: ProductoCotizacionActualizar[];
  productos_nuevos?: ProductoCotizacionNuevo[];
}

export const actualizarCotizacionProductos = async (
  noCotizacion: string,
  payload: ActualizarCotizacionPayload
): Promise<{ message: string }> => {
  const response = await api.put(`/cotizaciones/${noCotizacion}`, payload);
  return response.data;
};