// src/types/papel/merma.types.ts

export interface ProcesoMerma {
  id: number;
  clave: string;
  nombre: string;
  idproceso_cat: number | null;
  nombre_proceso: string | null;
  siempre_aplica: boolean;
  activo: boolean;
  orden: number;
  /**
   * true = columna preparada pero sin efecto en el cálculo, porque el proceso
   * todavía no existe en proceso_cat (caso Empalmadora). Se puede capturar su
   * valor; el motor la ignora hasta que exista el proceso.
   */
  inerte: boolean;
}

export interface EscalaMerma {
  id: number;
  cantidad: number;
  activo: boolean;
  orden: number;
}

export interface CeldaMerma {
  id: number | null;
  piezas: number | null;
  activo: boolean;
}

export interface FilaMerma {
  idEscala: number;
  cantidad: number;
  activo: boolean;
  orden: number;
  /** Indexado por id de proceso, en string. */
  celdas: Record<string, CeldaMerma>;
}

export interface MatrizMermaResponse {
  procesos: ProcesoMerma[];
  escalas: EscalaMerma[];
  filas: FilaMerma[];
}

export interface CeldaMermaPayload {
  idProceso: number;
  idEscala: number;
  piezas: number | null;
}

export interface RenglonDesglose {
  clave: string;
  nombre: string;
  piezas: number;
  motivo: string;
}

export interface EscalaResuelta {
  id: number;
  cantidad: number;
  clamp: boolean;
}

export interface SimulacionMerma {
  modo: "libre" | "orden";
  cantidad_pedida: number;
  escala: EscalaResuelta | null;
  merma_total: number;
  cantidad_a_producir: number;
  desglose: RenglonDesglose[];
  ignorados: Array<{ clave: string; motivo: string }>;
  advertencias: string[];
  procesos_detectados: number[];
}

export interface MermaOrden {
  idorden_produccion_merma: number;
  orden_produccion_idproduccion: number;
  no_produccion: string | null;
  idsolicitud_producto: number | null;
  /** Si no es null, esta orden heredó la merma de otra (parcialidades, ver R7). */
  heredada_de_idproduccion: number | null;
  cantidad_pedida: number;
  escala_cantidad: number | null;
  merma_total: number;
  cantidad_a_producir: number;
  merma_snapshot: any;
  version_calculo: number;
}