// src/services/pedidosService.ts
import type { Pedido } from "../types/cotizaciones.types";
import api from "./api";
import type { MaquinariaProductoPedidoPapel } from "../types/papel/maquinaria-pedido.types";

export const getPedidos = async (): Promise<Pedido[]> => {
  const response = await api.get("/pedidos");
  return response.data;
};

export const guardarMaquinariaPedidoPapel = async (
  noPedido: string,
  maquinariaPapel: MaquinariaProductoPedidoPapel[]
): Promise<void> => {
  await api.patch(`/pedidos/${noPedido}/maquinaria-papel`, {
    maquinariaPapel,
  });
};

export const eliminarPedido = async (noPedido: string) => {
  const { data } = await api.delete(`/pedidos/${noPedido}/completo`);
  return data;
};

export interface DetalleActualizar {
  iddetalle: number | null;
  cantidad: number;
  precio_total: number;
  precio_unitario: number | null;
  kilogramos: number | null;
  modo_cantidad: "unidad" | "kilo";
}

export interface ProductoActualizarBase {
  idsolicitud_producto: number;
  eliminado: boolean;
  observacion: string | null;
  descripcion: string | null;
  herramental_descripcion: string | null;
  herramental_precio: number | null;
  herramental_aprobado: boolean | null;
  detalles: DetalleActualizar[];
}

export interface ProductoPlasticoActualizar extends ProductoActualizarBase {
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

export interface ProductoPapelActualizar extends ProductoActualizarBase {
  tipo_material: "papel";
  tipoCotizacion: "papel";
  idproducto_papel: number;
  idgrupo_papel: number | null;
  grupo_descripcion: string | null;
  tintasId: number | null;
  carasId: number | null;
  pantones: string | null;
  id_asa: number | null;
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

export type ProductoActualizar =
  | ProductoPlasticoActualizar
  | ProductoPapelActualizar;

export interface ActualizarPedidoPayload {
  productos: ProductoActualizar[];
  productos_nuevos?: any[];
}

export const actualizarPedido = async (
  noPedido: string,
  payload: ActualizarPedidoPayload
): Promise<{ message: string }> => {
  const response = await api.put(`/pedidos/${noPedido}`, payload);
  return response.data;
};

export const getHistorialPedidosPorCliente = async (clienteId: number): Promise<Pedido[]> => {
  const { data } = await api.get(`/pedidos/historial/${clienteId}`);
  return data;
};
