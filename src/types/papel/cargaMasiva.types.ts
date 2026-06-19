// src/types/papel/cargaMasiva.types.ts

export interface ResultadoFilaCarga {
  fila: number;
  producto_id: string;
  estado: "creado" | "error";
  idproducto_papel?: number;
  error?: string;
}

export interface CatalogoNuevo {
  catalogo: string;
  valor_nuevo: string;
}

export interface RespuestaCargaMasiva {
  message: string;
  resumen: { total: number; creados: number; conError: number };
  resultados: ResultadoFilaCarga[];
  catalogosNuevos: CatalogoNuevo[];
}