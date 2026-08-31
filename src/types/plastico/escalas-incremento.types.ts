// src/types/plastico/escalas-incremento.types.ts

export interface EscalaAsaFlexible {
  id: number;
  rango_min: number;
  rango_max: number | null;
  incremento_por_pieza: number;
  activo: boolean;
}

// Ya no hay filas "vacías" sintéticas — solo lo que existe de verdad en BD.
export interface EscalaCintaSeguridadItem {
  id: number;
  rango_min: number;
  rango_max: number | null;
  incremento_por_pieza: number;
  activo: boolean;
}

export interface CintaSeguridadConEscalas {
  cinta_seguridad_id: number;
  nombre: string;
  medida: string | null;
  escalas: EscalaCintaSeguridadItem[];
}

// ── Payload de edición (batch) ───────────────────────────────────────────
// id ausente/null = fila nueva (INSERT). eliminar:true = borrado (soft
// delete). rango_max: null = "en adelante".
export interface RangoIncrementoInput {
  id?: number | null;
  rango_min: number;
  rango_max: number | null;
  incremento_por_pieza: number;
  eliminar?: boolean;
}

export interface RangoIncrementoCintaInput extends RangoIncrementoInput {
  cinta_seguridad_id: number;
}