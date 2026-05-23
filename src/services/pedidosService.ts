import api from "./api";

export const getPedidos = async () => {
  const response = await api.get("/pedidos");
  return response.data;
};

export const eliminarPedido = async (noPedido: string) => {
  const { data } = await api.delete(`/pedidos/${noPedido}/completo`);
  return data;
};



// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DetalleActualizar {
  iddetalle:       number | null;
  cantidad:        number;
  precio_total:    number;
  precio_unitario: number | null;  // precio por bolsa; se guarda para no perderlo al editar
  kilogramos:      number | null;
  modo_cantidad:   "unidad" | "kilo";
}

export interface ProductoActualizar {
  idsolicitud_producto:    number;
  eliminado:               boolean;
  tintas:                  number;
  caras:                   number;
  pantones:                string | null;
  pigmentos:               string | null;
  observacion:             string | null;
  descripcion:             string | null;
  perforacion:             boolean;
  herramental_descripcion: string | null;
  herramental_precio:      number | null;
  herramental_aprobado:    boolean | null;  // preserved on update, used on insert
  idsuaje:                 number | null;
  id_color:                number | null;
  id_medidatro:            number | null;
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