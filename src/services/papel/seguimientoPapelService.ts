import api from "../api";
import type { NombreProcesoPapel } from "../../types/papel/seguimientoPapel.types";

// Reexportamos lo de bultos/etiquetas de plástico tal cual, porque el
// backend reutiliza /seguimiento/:idproduccion/bultos/* sin cambios para
// papel (a confirmar definitivamente con el chat de backend — ver
// contexto_frontend_seguimiento_papel.md). Si backend decide que necesita
// endpoints propios para bultos de papel, solo hay que tocar este archivo.
export {
  getBultos,
  agregarBulto,
  agregarBultosBatch,
  eliminarBulto,
  finalizarBultos,
  editarBulto,
  getBultosEtiqueta,
  marcarBultosParcialidad,
} from "../seguimientoService";
export type {
  Bulto,
  BultosRespuesta,
  NuevoBultoPayload,
  NuevoBultoBatchPayload,
  BultoBatchRespuesta,
  EtiquetaData,
  BultoEtiqueta,
} from "../seguimientoService";

// ─────────────────────────────────────────────
// PROCESOS DE PAPEL
// ─────────────────────────────────────────────
export interface AvanceParcialPapel {
  idavance: number;
  cantidad: number;
  unidad: "pliegos" | "bolsas" | "pzas";
  observaciones: string | null;
  fecha_registro: string;
}

export interface ProcesoRegistroPapel {
  idproceso_cat: number;
  nombre_proceso: string;
  tabla: NombreProcesoPapel;
  estado: string; // "pendiente" | "en_proceso" | "terminado" | "resagado" | "no_aplica"
  registro: any | null;
  observaciones: string | null;
  observaciones_proceso_anterior: string | null;
  avances: AvanceParcialPapel[];
  total_avances: number;
  limite_avance?: number | null;
}

export interface ProcesosOrdenPapelRespuesta {
  idproduccion: number;
  no_produccion: string;
  no_pedido: string;
  proceso_actual: number | null;
  estado_id: number;
  estado_nombre: string;
  // Procesos que SÍ aplican a esta orden, ya filtrados y en orden de
  // cascada real por el backend (esto es lo que hace que el patrón de
  // índice -1 del modal de papel funcione igual que en plástico, sin
  // tener que asumir una cadena fija de 10).
  procesos: ProcesoRegistroPapel[];
}

export const getProcesosOrdenPapel = async (
  idproduccion: number
): Promise<ProcesosOrdenPapelRespuesta> => {
  const response = await api.get(`/procesos-papel/${idproduccion}`);
  return response.data;
};

export const iniciarProcesoPapel = async (
  idproduccion: number,
  tablaProceso: NombreProcesoPapel,
  datos?: Record<string, any>
) => {
  const response = await api.post(`/procesos-papel/${idproduccion}/iniciar`, {
    tabla_proceso: tablaProceso,
    ...(datos ?? {}),
  });
  return response.data;
};

export const finalizarProcesoPapel = async (
  idproduccion: number,
  datos: Record<string, any>
) => {
  const response = await api.put(`/procesos-papel/${idproduccion}/finalizar`, datos);
  return response.data;
};

export const editarProcesoPapel = async (
  idproduccion: number,
  tabla: NombreProcesoPapel,
  datos: Record<string, any>
): Promise<void> => {
  await api.put(`/procesos-papel/${idproduccion}/editar/${tabla}`, datos);
};

export interface RegistrarAvancePapelPayload {
  cantidad: number;
  observaciones?: string;
  tabla_proceso: NombreProcesoPapel;
}

export interface RegistrarAvancePapelRespuesta {
  message: string;
  idproduccion: number;
  tabla: string;
  avance: AvanceParcialPapel;
  // Nota: el backend real (registrarAvancePapel) NO devuelve un campo de
  // "siguiente proceso desbloqueado" -- el desbloqueo ocurre del lado del
  // servidor (inicializa la fila pendiente del siguiente proceso), pero
  // no se reporta explícitamente en la respuesta. Si llega a necesitarse
  // en el frontend, hay que agregarlo primero en
  // procesosPapel.controller.ts -> registrarAvancePapel.
}

export const registrarAvancePapel = async (
  idproduccion: number,
  payload: RegistrarAvancePapelPayload
): Promise<RegistrarAvancePapelRespuesta> => {
  const { data } = await api.post(`/procesos-papel/${idproduccion}/avance`, payload);
  return data;
};