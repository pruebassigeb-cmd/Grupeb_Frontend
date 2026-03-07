import api from "./api";
import type { PedidoSeguimiento } from "../types/seguimiento.types";

// ============================================================
// OBTENER SEGUIMIENTO DE PEDIDOS
// ============================================================
export const getSeguimiento = async (): Promise<PedidoSeguimiento[]> => {
  const response = await api.get("/seguimiento");
  return response.data;
};

// ── Tipo de respuesta del endpoint de orden de producción ──
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
  fecha_aprobacion_diseno: string | null; // ✅ nuevo
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
}

// ============================================================
// OBTENER DATOS PARA ORDEN DE PRODUCCIÓN
// ============================================================
export const getOrdenProduccion = async (noPedido: number): Promise<OrdenProduccionRespuesta> => {
  const response = await api.get(`/seguimiento/${noPedido}/orden-produccion`);
  return response.data;
};