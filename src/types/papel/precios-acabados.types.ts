// src/types/papel/precios-acabados.types.ts

export type TipoCalculoAcabado = "por_tinta" | "booleano" | "asa";

export interface AcabadoCostoCatalogo {
  id: number;
  clave: string;
  nombre: string;
  tipo_calculo: TipoCalculoAcabado;
  activo: boolean;
  orden: number;
}

export interface TamanoProductoCatalogo {
  id: number;
  clave: string;
  nombre: string;
  activo: boolean;
}

export interface EscalaCostoCatalogo {
  id: number;
  cantidad: number;
  activo: boolean;
  orden: number;
}

export interface CatalogosPreciosAcabadosResponse {
  acabados: AcabadoCostoCatalogo[];
  tamanos: TamanoProductoCatalogo[];
  escalas: EscalaCostoCatalogo[];
}

export interface CeldaMatrizPrecio {
  id: number | null;
  precio: number | null;
  activo: boolean;
}

export interface FilaMatrizPrecio {
  idTamano: number;
  clave: string;
  tamano: string;
  activo: boolean;
  precios: Record<string, CeldaMatrizPrecio>;
}

export interface MatrizPreciosAcabadoResponse {
  acabado: AcabadoCostoCatalogo;
  escalas: EscalaCostoCatalogo[];
  filas: FilaMatrizPrecio[];
}

export interface CeldaPrecioUpdate {
  idTamano: number;
  idEscala: number;
  precio: number | null;
}

export interface UpdateMatrizPreciosPayload {
  celdas: CeldaPrecioUpdate[];
}

export interface CostoMetroLaminado {
  id: number;
  costo: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpdateCostoMetroLaminadoResponse {
  message: string;
  costoMetro: CostoMetroLaminado;
}
