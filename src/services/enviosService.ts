import api from "./api";
import type {
  Unidad, CreateUnidadRequest, UpdateUnidadRequest,
  Paqueteria, CreatePaqueteriaRequest, UpdatePaqueteriaRequest,
  Conductor,
  PedidoDisponible, BultoPedido,
  Envio, CreateEnvioRequest,
  BitacoraRegistro, UpdateBitacoraRequest, EnvioPaqueteria,
  CarritoPedido, ProcesarCarritoRequest,
  ProductoSat,
  GuiaPaqueteriaGeneral,
} from "../types/envios.types";

// ==========================
// UNIDADES
// ==========================
export const getUnidades = async (): Promise<Unidad[]> => {
  const res = await api.get<Unidad[]>("/unidades");
  return res.data;
};

export const createUnidad = async (data: CreateUnidadRequest): Promise<Unidad> => {
  const res = await api.post<{ unidad: Unidad }>("/unidades", data);
  return res.data.unidad;
};

export const updateUnidad = async (id: number, data: UpdateUnidadRequest): Promise<Unidad> => {
  const res = await api.put<{ unidad: Unidad }>(`/unidades/${id}`, data);
  return res.data.unidad;
};

export const deleteUnidad = async (id: number): Promise<void> => {
  await api.delete(`/unidades/${id}`);
};

// ==========================
// PAQUETERÍAS
// ==========================
export const getPaqueterias = async (): Promise<Paqueteria[]> => {
  const res = await api.get<Paqueteria[]>("/paqueterias");
  return res.data;
};

export const createPaqueteria = async (data: CreatePaqueteriaRequest): Promise<Paqueteria> => {
  const res = await api.post<{ paqueteria: Paqueteria }>("/paqueterias", data);
  return res.data.paqueteria;
};

export const updatePaqueteria = async (id: number, data: UpdatePaqueteriaRequest): Promise<Paqueteria> => {
  const res = await api.put<{ paqueteria: Paqueteria }>(`/paqueterias/${id}`, data);
  return res.data.paqueteria;
};

export const deletePaqueteria = async (id: number): Promise<void> => {
  await api.delete(`/paqueterias/${id}`);
};

// ==========================
// CONDUCTORES
// ==========================
export const getConductores = async (): Promise<Conductor[]> => {
  const res = await api.get<Conductor[]>("/usuarios/conductores/lista");
  return res.data;
};

// ==========================
// ENVÍOS
// ==========================
export const getPedidosDisponibles = async (): Promise<PedidoDisponible[]> => {
  const res = await api.get<PedidoDisponible[]>("/envios/pedidos-disponibles");
  return res.data;
};

export const getBultosPedido = async (idsolicitud: number): Promise<BultoPedido[]> => {
  const res = await api.get<BultoPedido[]>(`/envios/pedidos/${idsolicitud}/bultos`);
  return res.data;
};

export const getEnviosPedido = async (idsolicitud: number): Promise<Envio[]> => {
  const res = await api.get<Envio[]>(`/envios/pedidos/${idsolicitud}/envios`);
  return res.data;
};

export const createEnvio = async (data: CreateEnvioRequest): Promise<void> => {
  await api.post("/envios", data);
};

export const updateEstadoEnvio = async (id: number, estado: string): Promise<void> => {
  await api.patch(`/envios/${id}/estado`, { estado });
};

export const deleteEnvio = async (id: number): Promise<void> => {
  await api.delete(`/envios/${id}`);
};

// ==========================
// BITÁCORA
// ==========================
export const getBitacora = async (): Promise<BitacoraRegistro[]> => {
  const res = await api.get<BitacoraRegistro[]>("/bitacora");
  return res.data;
};

export const registrarHoraSalida = async (id: number): Promise<void> => {
  await api.patch(`/bitacora/${id}/hora-salida`);
};

export const registrarHoraLlegada = async (id: number): Promise<void> => {
  await api.patch(`/bitacora/${id}/hora-llegada`);
};

export const updateBitacora = async (id: number, data: UpdateBitacoraRequest): Promise<void> => {
  await api.put(`/bitacora/${id}`, data);
};

// ==========================
// ENVÍOS POR PAQUETERÍA
// ==========================
export const getEnviosPaqueteria = async (): Promise<EnvioPaqueteria[]> => {
  const res = await api.get<EnvioPaqueteria[]>("/envios/paqueteria/historial");
  return res.data;
};

export const updateGuiaEnvio = async (id: number, numero_guia: string): Promise<void> => {
  await api.patch(`/envios/${id}/guia`, { numero_guia });
};

// ==========================
// NOTAS DE REMISIÓN
// ==========================
export interface NotaRemisionData {
  idnota:     number;
  no_nota:    string;
  created_at: string;
  envio: {
    idenvio:       number;
    tipo:          string;
    fecha_envio:   string;
    no_pedido:     string;
    observaciones: string | null;
  };
  cliente: {
    nombre:    string;
    rfc:       string;
    direccion: string;
  };
  productos: {
    nombre_producto: string;
    medida:          string;
    total_bultos:    number;
    total_unidades:  number | null;
    total_kg:        number | null;
  }[];
}

export const getOrCreateNotaRemision = async (idenvio: number): Promise<NotaRemisionData> => {
  const res = await api.get<NotaRemisionData>(`/notas-remision/${idenvio}`);
  return res.data;
};

// ==========================
// CARRITO
// ==========================
export const getCarrito = async (): Promise<CarritoPedido[]> => {
  const res = await api.get<CarritoPedido[]>("/carrito");
  return res.data;
};

export const agregarAlCarrito = async (bultos_ids: number[], idsolicitud: number): Promise<void> => {
  await api.post("/carrito/agregar", { bultos_ids, idsolicitud });
};

export const asignarPaqueteriaCarrito = async (idcarrito: number, paqueteria_idpaqueteria: number | null): Promise<void> => {
  await api.patch(`/carrito/bulto/${idcarrito}/paqueteria`, { paqueteria_idpaqueteria });
};

export const quitarDelCarrito = async (idbulto: number): Promise<void> => {
  await api.delete(`/carrito/quitar/${idbulto}`);
};

export const vaciarCarrito = async (): Promise<void> => {
  await api.delete("/carrito/vaciar");
};

// ── Tipo del objeto que devuelve el backend por cada envío creado ──
export interface EnvioCreado {
  idenvio:                 number;
  tipo:                    "local" | "paqueteria";
  paqueteria_idpaqueteria: number | null;
  paqueteria_nombre:       string | null;
}

export const procesarCarrito = async (data: ProcesarCarritoRequest): Promise<{ envios_creados: EnvioCreado[] }> => {
  const res = await api.post<{ envios_creados: EnvioCreado[] }>("/carrito/procesar", data);
  return res.data;
};

// ==========================
// CATÁLOGO PRODUCTOS SAT
// ==========================
export const getProductosSat = async (): Promise<ProductoSat[]> => {
  const res = await api.get<ProductoSat[]>("/envios/catalogos/productos-sat");
  return res.data;
};

// ==========================
// FORMATO CASTORES
// ==========================
export const getFormatoCastores = async (idenvio: number): Promise<any> => {
  const res = await api.get(`/formato-castores/${idenvio}`);
  return res.data;
};

// ==========================
// GUÍA GENERAL PAQUETERÍA
// ==========================
export const getGuiaPaqueteriaGeneral = async (idenvio: number): Promise<GuiaPaqueteriaGeneral> => {
  const res = await api.get<GuiaPaqueteriaGeneral>(`/envios/${idenvio}/guia-general`);
  return res.data;
};

export const updateClavesSatBultos = async (
  idenvio: number,
  bultos: { idbulto: number; clave_producto_sat: string; clave_unidad_sat: string }[]
): Promise<void> => {
  await api.patch(`/envios/${idenvio}/claves-sat`, { bultos });
};