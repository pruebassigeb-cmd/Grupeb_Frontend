import api from "./api";
import type { PedidoSeguimiento } from "../types/seguimiento.types";

export const getSeguimiento = async (): Promise<PedidoSeguimiento[]> => {
  const response = await api.get("/seguimiento");
  return response.data;
};

export interface OrdenProduccionRespuesta {
  no_pedido:       number;
  no_cotizacion:   number | null;
  fecha:           string;
  cliente:         string;
  empresa:         string;
  telefono:        string;
  correo:          string;
  impresion:       string | null;
  total_productos: number;
  con_orden:       number;
  productos:       OrdenProduccionProducto[];
}

export interface OrdenProduccionProducto {
  idsolicitud_producto:    number;
  no_produccion:           string | null;
  idproduccion:            number | null;
  fecha_produccion:        string | null;
  fecha_aprobacion_diseno: string | null;
  tiene_orden:             boolean;
  nombre_producto:         string;
  categoria:               string;
  material:                string;
  calibre:                 string;
  medida:                  string;
  altura:                  string;
  ancho:                   string;
  fuelle_fondo:            string;
  fuelle_lat_iz:           string;
  fuelle_lat_de:           string;
  refuerzo:                string;
  por_kilo:                string | null;
  medidas:                 Record<string, string>;
  tintas:                  number | null;
  caras:                   number | null;
  bk:                      boolean | null;
  foil:                    boolean | null;
  alto_rel:                boolean | null;
  laminado:                boolean | null;
  uv_br:                   boolean | null;
  pigmentos:               string | null;
  pantones:                string[] | null;
  asa_suaje:               string | null;
  observacion:             string | null;
  cantidad:                number | null;
  kilogramos:              number | null;
  modo_cantidad:           string;
  // ✅ calculados automáticamente
  kilos_extruir:           number | null;
  metros_extruir:          number | null;
}

export const getOrdenProduccion = async (noPedido: number): Promise<OrdenProduccionRespuesta> => {
  const response = await api.get(`/seguimiento/${noPedido}/orden-produccion`);
  return response.data;
};

export interface ProcesoRegistro {
  idproceso_cat:  number;
  nombre_proceso: string;
  tabla:          string;
  estado:         string;
  registro:       any | null;
}

export interface ProcesosOrdenRespuesta {
  idproduccion:   number;
  no_produccion:  string;
  no_pedido:      number;
  proceso_actual: number | null;
  estado_id:      number;
  estado_nombre:  string;
  procesos:       ProcesoRegistro[];
}

export const getProcesosOrden = async (idproduccion: number): Promise<ProcesosOrdenRespuesta> => {
  const response = await api.get(`/procesos/${idproduccion}`);
  return response.data;
};

export const iniciarProceso = async (idproduccion: number) => {
  const response = await api.post(`/procesos/${idproduccion}/iniciar`);
  return response.data;
};

export const finalizarProceso = async (idproduccion: number, datos: Record<string, any>) => {
  const response = await api.put(`/procesos/${idproduccion}/finalizar`, datos);
  return response.data;
};