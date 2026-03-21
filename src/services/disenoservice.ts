import api from "./api";

// ============================================================
// OBTENER DISEÑO DE UN PEDIDO (cabecera + productos)
// ============================================================
export const getDisenoByPedido = async (noPedido: string) => {
  const response = await api.get(`/diseno/pedido/${noPedido}`);
  return response.data;
};

// ============================================================
// ACTUALIZAR ESTADO DE UN PRODUCTO DE DISEÑO
// estadoId: 1=Pendiente, 3=Aprobado, 4=Rechazado
// ============================================================
export const actualizarEstadoProductoDiseno = async (
  iddiseno_producto: number,
  datos: {
    estadoId:      number;
    observaciones?: string;
  }
) => {
  const response = await api.patch(
    `/diseno/producto/${iddiseno_producto}/estado`,
    datos
  );
  return response.data;
};

// ============================================================
// VERIFICAR SI EL PEDIDO PUEDE PASAR A PRODUCCIÓN
// ============================================================
export const verificarCondicionesProduccion = async (noPedido: string) => {
  const response = await api.get(`/diseno/pedido/${noPedido}/produccion`);
  return response.data;
};