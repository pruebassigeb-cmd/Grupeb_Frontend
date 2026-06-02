import api from "./api";
import type {
  Unidad,
  CreateUnidadRequest,
  UpdateUnidadRequest,
  Paqueteria,
  CreatePaqueteriaRequest,
  UpdatePaqueteriaRequest,
  Conductor,
  PedidoDisponible,
  BultoPedido,
  Envio,
  CreateEnvioRequest,
  BitacoraRegistro,
  UpdateBitacoraRequest,
  EnvioPaqueteria,
  EnvioRecoleccion,
  CarritoPedido,
  ProcesarCarritoRequest,
  TipoEnvioCarrito,
  ProductoSat,
  GuiaPaqueteriaGeneral,
  FiltrosHistorialLocal,
  FiltrosHistorialPaqueteria,
  HistorialLocalItem,
  HistorialPaqueteriaItem,
  NotaRemisionMultiData,
  NotaRemisionBitacoraItem,
  ClienteRemision,
  PedidoRemision,
  HistorialEntregasPedido,
} from "../types/envios.types";

// ==========================
// UNIDADES
// ==========================
export const getUnidades = async (): Promise<Unidad[]> => {
  const res = await api.get<Unidad[]>("/unidades");
  return res.data;
};
export const createUnidad = async (
  data: CreateUnidadRequest,
): Promise<Unidad> => {
  const res = await api.post<{ unidad: Unidad }>("/unidades", data);
  return res.data.unidad;
};
export const updateUnidad = async (
  id: number,
  data: UpdateUnidadRequest,
): Promise<Unidad> => {
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
export const createPaqueteria = async (
  data: CreatePaqueteriaRequest,
): Promise<Paqueteria> => {
  const res = await api.post<{ paqueteria: Paqueteria }>("/paqueterias", data);
  return res.data.paqueteria;
};
export const updatePaqueteria = async (
  id: number,
  data: UpdatePaqueteriaRequest,
): Promise<Paqueteria> => {
  const res = await api.put<{ paqueteria: Paqueteria }>(
    `/paqueterias/${id}`,
    data,
  );
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
export const getBultosPedido = async (
  idsolicitud: number,
): Promise<BultoPedido[]> => {
  const res = await api.get<BultoPedido[]>(
    `/envios/pedidos/${idsolicitud}/bultos`,
  );
  return res.data;
};
export const getEnviosPedido = async (
  idsolicitud: number,
): Promise<Envio[]> => {
  const res = await api.get<Envio[]>(`/envios/pedidos/${idsolicitud}/envios`);
  return res.data;
};
export const createEnvio = async (data: CreateEnvioRequest): Promise<void> => {
  await api.post("/envios", data);
};
export const updateEstadoEnvio = async (
  id: number,
  estado: string,
): Promise<void> => {
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
export const updateBitacora = async (
  id: number,
  data: UpdateBitacoraRequest,
): Promise<void> => {
  await api.put(`/bitacora/${id}`, data);
};

export const marcarSalidaEnvio = async (
  idenvio: number,
): Promise<void> => {
  await api.patch(`/bitacora/envio/${idenvio}/marcar-salida`);
};

export const marcarEntregaEnvio = async (
  idenvio: number,
  data: UpdateBitacoraRequest & { numero_guia?: string },
): Promise<void> => {
  await api.patch(`/bitacora/envio/${idenvio}/marcar-entregado`, data);
};

// ==========================
// ENVÍOS POR PAQUETERÍA
// ==========================
export const getEnviosPaqueteria = async (): Promise<EnvioPaqueteria[]> => {
  const res = await api.get<EnvioPaqueteria[]>("/envios/paqueteria/historial");
  return res.data;
};

export const getEnviosPaqueteriaBitacora = async (): Promise<EnvioPaqueteria[]> => {
  const res = await api.get<EnvioPaqueteria[]>("/bitacora/paqueteria");
  return res.data;
};

export const updateGuiaEnvio = async (
  id: number,
  numero_guia: string,
): Promise<void> => {
  await api.patch(`/envios/${id}/guia`, { numero_guia });
};

// ==========================
// ENVÍOS DE RECOLECCIÓN
// ==========================
export const getEnviosRecoleccion = async (): Promise<EnvioRecoleccion[]> => {
  const res = await api.get<EnvioRecoleccion[]>("/bitacora/recoleccion");
  return res.data;
};

export const marcarRecolectado = async (
  idenvio: number,
  datos: {
    nombre_quien_recogio: string;
    empresa?: string;
    unidad_marca?: string;
    unidad_modelo?: string;
    unidad_placas?: string;
    observacion_extra?: string;
  },
): Promise<void> => {
  const formData = new FormData();
  formData.append("nombre_quien_recogio", datos.nombre_quien_recogio);
  if (datos.empresa) formData.append("empresa", datos.empresa);
  if (datos.unidad_marca) formData.append("unidad_marca", datos.unidad_marca);
  if (datos.unidad_modelo)
    formData.append("unidad_modelo", datos.unidad_modelo);
  if (datos.unidad_placas)
    formData.append("unidad_placas", datos.unidad_placas);
  if (datos.observacion_extra)
    formData.append("observacion_extra", datos.observacion_extra);

  await api.patch(
    `/bitacora/recoleccion/${idenvio}/marcar-recogido`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
};

export const getFotoRecoleccion = async (idenvio: number): Promise<string> => {
  const res = await api.get<{ url: string }>(
    `/bitacora/recoleccion/${idenvio}/foto`,
  );
  return res.data.url;
};

// ==========================
// NOTAS DE REMISIÓN
// ==========================
export interface NotaRemisionData {
  idnota: number;
  no_nota: string;
  created_at: string;
  observaciones: string | null;
  envio: {
    idenvio: number;
    tipo: string;
    fecha_envio: string;
    no_pedido: string;
    observaciones: string | null;
  };
  cliente: {
    nombre: string;
    rfc: string;
    direccion: string;
  };
  productos: {
    nombre_producto: string;
    medida: string;
    total_bultos: number;
    total_unidades: number | null;
    total_kg: number | null;
  }[];
}

export const getOrCreateNotaRemision = async (
  idenvio: number,
): Promise<NotaRemisionData> => {
  const res = await api.get<NotaRemisionData>(`/notas-remision/${idenvio}`);
  return res.data;
};

export const crearNotaRemisionMulti = async (data: {
  envios_ids: number[];
  tipo_entrega: "recoleccion" | "local";
  chofer_idusuario?: number;
  unidad_idunidad?: number;
  observaciones?: string;
}): Promise<NotaRemisionMultiData> => {
  const res = await api.post<NotaRemisionMultiData>(
    "/notas-remision/multi",
    data,
  );
  return res.data;
};

export const getNotaRemisionMulti = async (
  idnota: number,
): Promise<NotaRemisionMultiData> => {
  const res = await api.get<NotaRemisionMultiData>(
    `/notas-remision/multi/${idnota}`,
  );
  return res.data;
};

export const getNotasRemisionBitacora = async (): Promise<
  NotaRemisionBitacoraItem[]
> => {
  const res = await api.get<NotaRemisionBitacoraItem[]>(
    "/notas-remision/bitacora",
  );
  return res.data;
};

export const marcarRecolectadoNotaRemision = async (
  idnota: number,
  datos: {
    nombre_quien_recogio: string;
    empresa?: string;
    unidad_marca?: string;
    unidad_modelo?: string;
    unidad_placas?: string;
  },
): Promise<void> => {
  await api.patch(`/notas-remision/${idnota}/marcar-recogido`, datos);
};

// Registra solo la SALIDA — cambia envíos a en_camino, NO marca nota como entregada
export const marcarSalidaLocalNota = async (idnota: number): Promise<void> => {
  await api.patch(`/notas-remision/${idnota}/marcar-salida-local`);
};

// Registra la LLEGADA + firma/obs — marca nota como entregada
export const marcarEntregadoLocalNota = async (
  idnota: number,
  datos: {
    hora_llegada?: string;
    observacion?: string;
    observacion_extra?: string;
    firma?: string;
  },
): Promise<void> => {
  await api.patch(`/notas-remision/${idnota}/marcar-entregado-local`, datos);
};

// ==========================
// CARRITO
// ==========================
export const getCarrito = async (): Promise<CarritoPedido[]> => {
  const res = await api.get<CarritoPedido[]>("/carrito");
  return res.data;
};

export const agregarAlCarrito = async (
  bultos_ids: number[],
  idsolicitud: number,
): Promise<void> => {
  await api.post("/carrito/agregar", { bultos_ids, idsolicitud });
};

export const asignarTipoEnvioPedido = async (
  idsolicitud: number,
  tipo_envio: TipoEnvioCarrito,
  paqueteria_idpaqueteria?: number,
): Promise<void> => {
  await api.post("/carrito/tipo-envio", {
    idsolicitud,
    tipo_envio,
    paqueteria_idpaqueteria: paqueteria_idpaqueteria ?? null,
  });
};

export const asignarPaqueteriaCarrito = async (
  idcarrito: number,
  paqueteria_idpaqueteria: number | null,
): Promise<void> => {
  await api.patch(`/carrito/bulto/${idcarrito}/paqueteria`, {
    paqueteria_idpaqueteria,
  });
};

export const quitarDelCarrito = async (idbulto: number): Promise<void> => {
  await api.delete(`/carrito/quitar/${idbulto}`);
};
export const vaciarCarrito = async (): Promise<void> => {
  await api.delete("/carrito/vaciar");
};

export interface EnvioCreado {
  idenvio: number;
  tipo: "local" | "paqueteria" | "recoleccion";
  paqueteria_idpaqueteria: number | null;
  paqueteria_nombre: string | null;
}

export const procesarCarrito = async (
  data: ProcesarCarritoRequest,
): Promise<{ envios_creados: EnvioCreado[] }> => {
  const res = await api.post<{ envios_creados: EnvioCreado[] }>(
    "/carrito/procesar",
    data,
  );
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
// FORMATOS
// ==========================
export const getFormatoCastores = async (idenvio: number): Promise<any> => {
  const res = await api.get(`/formato-castores/${idenvio}`);
  return res.data;
};
export const getGuiaPaqueteriaGeneral = async (
  idenvio: number,
): Promise<GuiaPaqueteriaGeneral> => {
  const res = await api.get<GuiaPaqueteriaGeneral>(
    `/envios/${idenvio}/guia-general`,
  );
  return res.data;
};
export const updateClavesSatBultos = async (
  idenvio: number,
  bultos: {
    idbulto: number;
    clave_producto_sat: string;
    clave_unidad_sat: string;
  }[],
): Promise<void> => {
  await api.patch(`/envios/${idenvio}/claves-sat`, { bultos });
};

// ==========================
// BULTOS POR ORDEN DE PRODUCCIÓN
// ==========================
export interface BultoConEnvio extends BultoPedido {
  nombre_producto: string;
  medida: string;
}
export interface BultosPorProduccionResponse {
  bultos: BultoConEnvio[];
  envios: Envio[];
}
export const getBultosPorProduccion = async (
  idsolicitud: number,
  idproduccion: number,
): Promise<BultosPorProduccionResponse> => {
  const res = await api.get<BultosPorProduccionResponse>(
    `/envios/pedidos/${idsolicitud}/bultos-por-produccion/${idproduccion}`,
  );
  return res.data;
};

// ── helpers ─────────────────────────────────────────────────
function toQueryString(params: Record<string, any>): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.append(k, String(v));
  });
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

export const getHistorialLocal = async (
  filtros: FiltrosHistorialLocal = {},
): Promise<HistorialLocalItem[]> => {
  const res = await api.get<HistorialLocalItem[]>(
    `/historial/local${toQueryString(filtros)}`,
  );
  return res.data;
};
export const getHistorialPaqueteria = async (
  filtros: FiltrosHistorialPaqueteria = {},
): Promise<HistorialPaqueteriaItem[]> => {
  const res = await api.get<HistorialPaqueteriaItem[]>(
    `/historial/paqueteria${toQueryString(filtros)}`,
  );
  return res.data;
};

// ==========================
// REMISIONES
// ==========================
export const getClientesRemisiones = async (): Promise<ClienteRemision[]> => {
  const res = await api.get<ClienteRemision[]>(
    "/historial/remisiones/clientes",
  );
  return res.data;
};

export const getPedidosClienteRemisiones = async (
  idclientes: number,
): Promise<PedidoRemision[]> => {
  const res = await api.get<PedidoRemision[]>(
    `/historial/remisiones/pedidos/${idclientes}`,
  );
  return res.data;
};

export const getHistorialEntregas = async (
  idsolicitudes: number[],
): Promise<HistorialEntregasPedido[]> => {
  const res = await api.post<HistorialEntregasPedido[]>(
    "/historial/remisiones/entregas",
    { idsolicitudes },
  );
  return res.data;
};
