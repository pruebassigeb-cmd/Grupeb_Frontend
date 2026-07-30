// src/services/catalogosProduccionService.ts
import api from "../api";
import type {
  CatalogosProduccion,
  TarifaProduccion,
} from "../../types/plastico/catalogos-produccion.types";

export const getCatalogosProduccion = async (): Promise<CatalogosProduccion> => {
  try {
    const response = await api.get<CatalogosProduccion>("/catalogos-produccion");
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al obtener catálogos de producción:", error);
    throw error;
  }
};

// ✅ NUEVA FUNCIÓN
export const getTarifasProduccion = async (): Promise<TarifaProduccion[]> => {
  try {
    const response = await api.get<TarifaProduccion[]>("/catalogos-produccion/tarifas");
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al obtener tarifas de producción:", error);
    throw error;
  }
};