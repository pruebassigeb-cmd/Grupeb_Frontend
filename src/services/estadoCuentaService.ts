import api from "./api";

export interface ProductoEstadoCuenta {
  idsolicitud_producto:    number;
  no_produccion:           string;
  nombre:                  string;
  medida:                  string | null;
  material:                string | null;
  alta_densidad:           boolean | null;
  impresion:               string | null;
  tintas:                  number;
  caras:                   number;
  modo_cantidad:           string;
  cantidad_original:       number;
  precio_total_original:   number;
  cantidad_real:           number;
  peso_kg_real:            number;
  precio_unitario_real:    number;
  precio_total_real:       number;
  diferencia_piezas:       number;
  diferencia_precio:       number;
  herramental_descripcion?: string | null;
  herramental_precio?:      number | null;
  herramental_aprobado?:    boolean | null;
}

export interface EstadoCuenta {
  no_pedido:            string;
  no_cotizacion:        string | null;
  fecha:                string;
  cliente:              string;
  atencion:             string | null;
  empresa:              string;
  telefono:             string;
  correo:               string;
  productos:            ProductoEstadoCuenta[];
  subtotal_original:    number;
  iva_original:         number;
  total_original:       number;
  subtotal_real:        number;
  iva_real:             number;
  total_real:           number;
  herramental_total:    number;
  anticipo:             number;
  primer_pago_anticipo: number | null;
  abono:                number;
  saldo:                number;
  es_credito_anticipo:  boolean;
  diferencia_total:     number;
  estado_id:            number;
}

export interface ResumenEstadoCuenta {
  no_pedido:           string;
  no_cotizacion:       string | null;
  fecha:               string;
  cliente:             string;
  empresa:             string;
  total:               number;
  abono:               number;
  saldo:               number;
  anticipo:            number;
  total_real:          number | null;
  diferencia_total:    number | null;
  total_ordenes:       number;
  ordenes_completas:   number;
  produccion_completa: boolean;
}

export const getListaEstadoCuenta = async (): Promise<ResumenEstadoCuenta[]> => {
  const response = await api.get("/estado-cuenta");
  return response.data;
};

export const getEstadoCuenta = async (noPedido: string): Promise<EstadoCuenta> => {
  const response = await api.get(`/estado-cuenta/${noPedido}`);
  return response.data;
};