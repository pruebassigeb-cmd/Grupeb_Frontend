import api from "../api";
import type { Tarifa, TarifaUpdate } from "../../types/plastico/tarifas.types";

export const getTarifas = async (): Promise<Tarifa[]> => {
  const response = await api.get<Tarifa[]>("/tarifas");
  return response.data;
};

export const updateTarifasBatch = async (tarifas: TarifaUpdate[]) => {
  const response = await api.put("/tarifas/batch", { tarifas });
  return response.data;
};