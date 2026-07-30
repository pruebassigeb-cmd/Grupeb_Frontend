export interface Tarifa {
  idtarifas_produccion: number;
  tintas_idtintas: number;
  kilogramos_idkilogramos: number;
  precio: number;
  merma_porcentaje: number;
  cantidad_tintas: number;
  kilogramos: number;
}

export interface TarifaUpdate {
  id: number;
  precio: number;
  merma_porcentaje: number;
} 