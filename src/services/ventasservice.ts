import api from "./api";

export const getVentas = async () => {
  const response = await api.get("/ventas");
  return response.data;
};

export const getVentaById = async (idventas: number) => {
  const response = await api.get(`/ventas/${idventas}`);
  return response.data;
};

export const getVentaByPedido = async (noPedido: string) => {
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
    fecha?:       string | null;
    // Moneda en la que se recibió el pago (default = moneda de la venta).
    // tipoCambioAplicado solo aplica si difiere de la moneda de la venta.
    moneda?:             "MXN" | "USD";
    tipoCambioAplicado?: number | null;
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

export const autorizarAnticipoCredito = async (idVenta: number) => {
  const response = await api.post(`/ventas/${idVenta}/anticipo-credito`);
  return response.data;
};  