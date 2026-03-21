import api from "./api";

export const getVentas = async () => {
  const response = await api.get("/ventas");
  return response.data;
};

export const getVentaById = async (idventas: number) => {
  const response = await api.get(`/ventas/${idventas}`);
  return response.data;
};

export const getVentaByPedido = async (noPedido: string) => {  // ← string
  const response = await api.get(`/ventas/pedido/${noPedido}`);
  return response.data;
};

export const registrarPago = async (
  idventas: number,
  datos: {
    metodoPagoId: number;
    monto:        number;
    esAnticipo?:  boolean;
    observacion?: string;
  }
) => {
  const response = await api.post(`/ventas/${idventas}/pagos`, datos);
  return response.data;
};

export const eliminarPago = async (idventa_pago: number) => {
  const response = await api.delete(`/ventas/pagos/${idventa_pago}`);
  return response.data;
};

export const getMetodosPago = async () => {
  const response = await api.get("/ventas/metodos-pago");
  return response.data;
};