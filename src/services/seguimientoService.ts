import api from "./api";
import type { PedidoSeguimiento } from "../types/seguimiento.types";

export const getSeguimiento = async (): Promise<PedidoSeguimiento[]> => {
  const response = await api.get("/seguimiento");
  return response.data;
};

// ─────────────────────────────────────────────
// ORDEN DE PRODUCCIÓN
// ─────────────────────────────────────────────
export interface OrdenProduccionProducto {
  idsolicitud_producto:    number;
  no_produccion:           string | null;
  idproduccion:            number | null;
  fecha_produccion:        string | null;
  fecha_aprobacion_diseno: string | null;
  observaciones_diseno:    string | null;
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
  id_color?:               number | null;
  color_asa_nombre?:       string | null;
  id_medidatro?:           number | null;
  medida_troquel?:         string | null;
  observacion:             string | null;
  cantidad:                number | null;
  kilogramos:              number | null;
  modo_cantidad:           string;
  repeticion_extrusion:    number | null;
  repeticion_metro:        number | null;
  metros:                  number | null;
  ancho_bobina:            number | null;
  repeticion_kidder:       string | null;
  repeticion_sicosa:       string | null;
  fecha_entrega:           string | null;
  kilos:                   number | null;
  kilos_merma:             number | null;
  pzas:                    number | null;
  pzas_merma:              number | null;
  metros_merma:            number | null;
  kilos_extruir:           number | null;
  metros_extruir:          number | null;
}

export interface OrdenProduccionRespuesta {
  no_pedido:       string;
  no_cotizacion:   string | null;
  fecha:           string;
  prioridad:       boolean;
  cliente:         string;
  empresa:         string;
  telefono:        string;
  correo:          string;
  impresion:       string | null;
  total_productos: number;
  con_orden:       number;
  productos:       OrdenProduccionProducto[];
}

export const getOrdenProduccion = async (noPedido: string): Promise<OrdenProduccionRespuesta> => {
  const response = await api.get(`/seguimiento/${noPedido}/orden-produccion`);
  return response.data;
};

// ─────────────────────────────────────────────
// PROCESOS
// ─────────────────────────────────────────────
export interface AvanceParcial {
  idavance:       number;
  cantidad:       number;
  unidad:         "kg" | "pzas";
  observaciones:  string | null;
  fecha_registro: string;
}

export interface ProcesoRegistro {
  idproceso_cat:  number;
  nombre_proceso: string;
  tabla:          string;
  estado:         string;
  registro:       any | null;
  observaciones:  string | null;
  observaciones_proceso_anterior: string | null;
  avances:        AvanceParcial[];
  total_avances:  number;
  limite_avance?: number | null;
}

export interface ProcesosOrdenRespuesta {
  idproduccion:      number;
  no_produccion:     string;
  no_pedido:         string;
  proceso_actual:    number | null;
  estado_id:         number;
  estado_nombre:     string;
  repeticion_kidder: string | null;
  repeticion_sicosa: string | null;
  procesos:          ProcesoRegistro[];
}

export const getProcesosOrden = async (idproduccion: number): Promise<ProcesosOrdenRespuesta> => {
  const response = await api.get(`/procesos/${idproduccion}`);
  return response.data;
};

export const iniciarProceso = async (
  idproduccion: number,
  datos?: Record<string, any>
) => {
  const response = await api.post(`/procesos/${idproduccion}/iniciar`, datos ?? {});
  return response.data;
};

export const finalizarProceso = async (idproduccion: number, datos: Record<string, any>) => {
  const response = await api.put(`/procesos/${idproduccion}/finalizar`, datos);
  return response.data;
};

export const editarProceso = async (
  idproduccion: number,
  tabla: string,
  datos: Record<string, any>
): Promise<void> => {
  await api.put(`/procesos/${idproduccion}/editar/${tabla}`, datos);
};

// ─────────────────────────────────────────────
// AVANCES PARCIALES
// ─────────────────────────────────────────────
export interface RegistrarAvancePayload {
  cantidad:       number;
  observaciones?: string;
  tabla_proceso:  string;
}

export interface RegistrarAvanceRespuesta {
  message:                          string;
  idproduccion:                     number;
  tabla:                            string;
  avance:                           AvanceParcial;
  siguiente_proceso_desbloqueado:   boolean;
}

export const registrarAvance = async (
  idproduccion: number,
  payload: RegistrarAvancePayload
): Promise<RegistrarAvanceRespuesta> => {
  const { data } = await api.post(`/procesos/${idproduccion}/avance`, payload);
  return data;
};

// ─────────────────────────────────────────────
// BULTOS
// ─────────────────────────────────────────────
export interface Bulto {
  idbulto:           number;
  cantidad_unidades: number;
  fecha_creacion:    string;
  proceso_origen:    "bolseo" | "asa_flexible";
  peso_producto: number | null; // kg del producto solo (principal en modo kilo)
  peso:          number | null; // peso empaquetado
  alto:          number | null;
  largo:         number | null;
  ancho:         number | null;
}

export interface BultosRespuesta {
  bultos_finalizado: boolean;
  modo_cantidad:     "unidad" | "kilo";
  bultos:            Bulto[];
  total_bultos:      number;
  total_unidades:    number;  // siempre disponible
  total_kg:          number;  // siempre disponible (suma de peso_producto)
}

export interface NuevoBultoPayload {
  cantidad_unidades?: number | null; // principal en modo unidad
  peso_producto?:     number | null; // principal en modo kilo
  peso?:              number | null; // peso empaquetado (siempre)
  alto?:              number | null;
  largo?:             number | null;
  ancho?:             number | null;
}

export const getBultos = async (idproduccion: number): Promise<BultosRespuesta> => {
  const { data } = await api.get(`/seguimiento/${idproduccion}/bultos`);
  return data;
};

export const agregarBulto = async (
  idproduccion: number,
  payload: NuevoBultoPayload
): Promise<Bulto> => {
  const { data } = await api.post(`/seguimiento/${idproduccion}/bultos`, payload);
  return data;
};

export const eliminarBulto = async (
  idproduccion: number,
  idbulto: number
): Promise<void> => {
  await api.delete(`/seguimiento/${idproduccion}/bultos/${idbulto}`);
};

export const finalizarBultos = async (idproduccion: number): Promise<void> => {
  await api.patch(`/seguimiento/${idproduccion}/bultos/finalizar`);
};

export const editarBulto = async (
  idproduccion: number,
  idbulto: number,
  payload: NuevoBultoPayload
): Promise<Bulto> => {
  const { data } = await api.put(
    `/seguimiento/${idproduccion}/bultos/${idbulto}`,
    payload
  );
  return data;
};

// ─────────────────────────────────────────────
// ETIQUETAS PDF
// ─────────────────────────────────────────────
export interface BultoEtiqueta {
  idbulto:           number;
  cantidad_unidades: number;
  fecha_creacion:    string;
  proceso_origen:    "bolseo" | "asa_flexible";
  peso_producto: number | null;
  peso:          number | null;
  alto:          number | null;
  largo:         number | null;
  ancho:         number | null;
}

export interface EtiquetaData {
  no_pedido:         string;
  no_produccion:     string;
  fecha:             string;
  fecha_entrega:     string | null;
  cliente:           string;
  empresa:           string;
  telefono:          string;
  celular:           string;
  correo:            string;
  cliente_impresion: string;
  atencion:          string | null;
  calle:             string;
  numero:            string;
  colonia:           string;
  codigo_postal:     string;
  poblacion:         string;
  estado:            string;
  nombre_producto:   string;
  medida:            string;
  material:          string;
  cantidad_total:    number | null;
  kilogramos:        number | null;
  modo_cantidad:     string;
  total_bultos:      number;
  total_kg:          number;
  bultos:            BultoEtiqueta[];
}

export const getBultosEtiqueta = async (idproduccion: number): Promise<EtiquetaData> => {
  const { data } = await api.get(`/seguimiento/${idproduccion}/bultos/etiqueta`);
  return data;
};