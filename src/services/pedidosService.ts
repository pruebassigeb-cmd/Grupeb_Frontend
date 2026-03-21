import api from "./api";

export const getPedidos = async () => {
  const response = await api.get("/pedidos");
  return response.data;
};

export const eliminarPedido = async (noPedido: string) => {  // ← string
  const response = await api.delete(`/pedidos/${noPedido}`);
  return response.data;
};