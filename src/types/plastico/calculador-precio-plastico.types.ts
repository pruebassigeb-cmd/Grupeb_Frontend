// src/types/plastico/calculador-precio-plastico.types.ts

export interface ResultadoCalculoPrecioPlastico {
  peso_total_kg: number;
  precio_kg: number;
  merma_porcentaje: number;
  costo_produccion: number;
  costo_merma: number;
  costo_total: number;
  precio_unitario: number;
  kilogramos_rango: number;
  tarifa_id: number;
  kilogramos_id: number;
  tintas_id?: number;
  tintas_cantidad?: number | null;
}

export interface CalcularPreciosPlasticoBatchInput {
  cantidades: number[];
  porKilo: number;
  /**
   * Expo maneja cantidades de tintas, no IDs internos. El backend resuelve
   * la FK real y conserva compatibilidad con el cotizador general.
   */
  tintasCantidad: number;
}

export interface CalcularPreciosPlasticoBatchResponse {
  success: true;
  resultados: Array<ResultadoCalculoPrecioPlastico | null>;
  tintas_id?: number;
  tintas_cantidad?: number | null;
}
