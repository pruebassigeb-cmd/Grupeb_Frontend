// ========================
// CATÁLOGOS DE PRODUCCIÓN
// ========================
export interface Cara {
  id: number;
  cantidad: number;
}
export interface Tinta {
  id: number;
  cantidad: number;
}
export interface CatalogosProduccion {
  caras: Cara[];
  tintas: Tinta[];
}
// ========================
// TARIFAS DE PRODUCCIÓN
// ========================
export interface TarifaProduccion {
  id: number;
  tintas_idtintas: number;
  kilogramos_idkilogramos: number;
  caras_idcaras: number;
  precio: number;
  merma_porcentaje: number;
  kg_min: number;
  kg_max: number | null;
}

// ========================
// RESULTADO DE CÁLCULO
// ========================
export interface ResultadoCalculo {
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
}