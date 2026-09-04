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
} from "../produccion/seguimientoService";
export type {
  Bulto,
  BultosRespuesta,
  NuevoBultoPayload,
  NuevoBultoBatchPayload,
  BultoBatchRespuesta,
  EtiquetaData,
  BultoEtiqueta,
} from "../produccion/seguimientoService";

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
  // Sólo puede venir en true para la OP de UNIÓN de un especial que
  // fusiona por Litolaminado: significa que todavía le faltan por
  // terminar una o más de sus OP de inicio hermanas y por eso su primer
  // proceso está bloqueado (ver unionEsperandoHermanasPapel en el
  // backend). false/undefined en cualquier otro caso -- normal papel,
  // OP de inicio, OP "única", o unión que no lleva Litolaminado.
  espera_union?: boolean;
  espera_union_motivo?: string | null;
  // Especiales, sólo UNIÓN: piezas finales de cada OP de inicio hermana y
  // el mínimo entre todas -- alimenta tanto el límite del primer proceso
  // de la unión (normalmente Litolaminado) como la "entrada" que se le
  // precarga al finalizar (ver procesosPapel.controller.ts) (Jose,
  // 2026-09-03). [] / null en cualquier caso que no sea unión.
  piezas_finales_hermanas?: {
    idproduccion: number;
    no_produccion: string | null;
    idcomponente_papel: number | null;
    componente_nombre: string | null;
    proceso_final_tabla: string | null;
    proceso_final_nombre: string | null;
    cantidad_entregada: number | null;
    terminado: boolean;
  }[];
  piezas_finales_total?: number | null;
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

// ─────────────────────────────────────────────
// PAR INTERCAMBIABLE HOJEADO / GUILLOTINA
// ─────────────────────────────────────────────
// Hojeado y Guillotina se eligen manualmente en planta (con el PDF físico
// en mano), no dependen uno del otro ni son mutuamente excluyentes en el
// sistema. Mientras ninguno tiene registro, ambos aparecen disponibles;
// en cuanto uno recibe el primer avance/inicio, el otro se muestra como
// "no_aplica". Este endpoint es la vía para deshacer eso si el operador
// eligió la máquina equivocada, siempre que el siguiente proceso
// (normalmente Impresión) todavía no haya arrancado con esos datos.
export type NombreProcesoIntercambiablePapel = "hojeado_papel" | "guillotina_papel";

export const reiniciarProcesoPreparacionPapel = async (
  idproduccion: number,
  tabla: NombreProcesoIntercambiablePapel
): Promise<{ message: string; idproduccion: number; tabla: string }> => {
  const { data } = await api.delete(`/procesos-papel/${idproduccion}/reiniciar/${tabla}`);
  return data;
};