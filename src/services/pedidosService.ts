import api from "./api";

export const getPedidos = async () => {
  const response = await api.get("/pedidos");
  return response.data;
};

export const eliminarPedido = async (noPedido: string) => {
  const response = await api.delete(`/pedidos/${noPedido}`);
  return response.data;
};

// ── Tipos para actualizar ─────────────────────────────────────────────────────
export interface DetalleActualizar {
  iddetalle:    number | null;
  cantidad:     number;
  precio_total: number;
  kilogramos:   number | null;
  modo_cantidad: "unidad" | "kilo";
}

export interface ProductoActualizar {
  idsolicitud_producto:    number;
  eliminado:               boolean;
  tintas:                  number;
  caras:                   number;
  pantones:                string | null;
  pigmentos:               string | null;
  observacion:             string | null;
  herramental_descripcion: string | null;
  herramental_precio:      number | null;
  detalles:                DetalleActualizar[];
}

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