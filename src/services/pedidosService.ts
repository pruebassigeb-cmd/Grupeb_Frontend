// src/services/pedidosService.ts
import type { Pedido } from "../types/cotizaciones.types";
import api from "./api";

export const getPedidos = async () => {
  const response = await api.get("/pedidos");
  return response.data;
};

export const eliminarPedido = async (noPedido: string) => {
  const { data } = await api.delete(`/pedidos/${noPedido}/completo`);
  return data;
};


// ── Detalle individual ────────────────────────────────────────────────────────
export interface DetalleActualizar {
  iddetalle:       number | null;
  cantidad:        number;
  precio_total:    number;
  precio_unitario: number | null;
  kilogramos:      number | null;
  modo_cantidad:   "unidad" | "kilo";
}

// ── Producto existente (UPDATE) ───────────────────────────────────────────────
export interface ProductoActualizar {
  idsolicitud_producto:    number;
  eliminado:               boolean;
  // Si el usuario cambió el producto desde el modal, viene el nuevo id
  nuevo_configuracion_id?: number;
  tintas:                  number;
  caras:                   number;
  pantones:                string | null;
  pigmentos:               string | null;
  observacion:             string | null;
  descripcion:             string | null;
  perforacion:             boolean;
  herramental_descripcion: string | null;
  herramental_precio:      number | null;
  herramental_aprobado:    boolean | null;
  idsuaje:                 number | null;
  id_color:                number | null;
  id_medidatro:            number | null;
  detalles:                DetalleActualizar[];
}

// ── Payload completo ──────────────────────────────────────────────────────────
export interface ActualizarPedidoPayload {
  productos: ProductoActualizar[];
}

export const actualizarPedido = async (
  noPedido: string,
  payload:  ActualizarPedidoPayload
): Promise<{ message: string }> => {
  const response = await api.put(`/pedidos/${noPedido}`, payload);
  return response.data;
};

// ── AGREGAR ESTO ─────────────────────────────────────────────────────────────
export const getHistorialPedidosPorCliente = async (clienteId: number): Promise<Pedido[]> => {
  const { data } = await api.get(`/pedidos/historial/${clienteId}`);
  return data;
};
