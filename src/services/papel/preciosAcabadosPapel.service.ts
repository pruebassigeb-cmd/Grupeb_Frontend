// src/services/papel/preciosAcabadosPapel.service.ts
import api from "../api";
import type {
  AcabadoCostoCatalogo,
  CatalogosPreciosAcabadosResponse,
  CostoMetroLaminado,
  EscalaCostoCatalogo,
  MatrizPreciosAcabadoResponse,
  UpdateCostoMetroLaminadoResponse,
  UpdateMatrizPreciosPayload,
} from "../../types/papel/precios-acabados.types";

const BASE = "/precios-acabados-papel";

export const getCostoMetroLaminado = async (): Promise<CostoMetroLaminado> => {
  const { data } = await api.get<CostoMetroLaminado>(`${BASE}/costo-metro`);
  return data;
};

export const updateCostoMetroLaminado = async (
  costo: number
): Promise<UpdateCostoMetroLaminadoResponse> => {
  const { data } = await api.put<UpdateCostoMetroLaminadoResponse>(
    `${BASE}/costo-metro`,
    { costo }
  );
  return data;
};

export const getCatalogosPreciosAcabados = async (): Promise<CatalogosPreciosAcabadosResponse> => {
  const { data } = await api.get<CatalogosPreciosAcabadosResponse>(`${BASE}/catalogos`);
  return data;
};

export const getMatrizPreciosAcabado = async (
  idAcabado: number
): Promise<MatrizPreciosAcabadoResponse> => {
  const { data } = await api.get<MatrizPreciosAcabadoResponse>(`${BASE}/matriz/${idAcabado}`);
  return data;
};

export const updateMatrizPreciosAcabado = async (
  idAcabado: number,
  payload: UpdateMatrizPreciosPayload
): Promise<{ message: string; actualizadas: number }> => {
  const { data } = await api.put(`${BASE}/matriz/${idAcabado}`, payload);
  return data;
};

export const createEscalaCosto = async (
  cantidad: number
): Promise<{ message: string; escala: EscalaCostoCatalogo }> => {
  const { data } = await api.post(`${BASE}/escalas`, { cantidad });
  return data;
};

export const updateEscalaCosto = async (
  id: number,
  cantidad: number
): Promise<{ message: string; escala: EscalaCostoCatalogo }> => {
  const { data } = await api.put(`${BASE}/escalas/${id}`, { cantidad });
  return data;
};

export const toggleEscalaCosto = async (
  id: number,
  activo: boolean
): Promise<{ message: string; escala: EscalaCostoCatalogo }> => {
  const { data } = await api.patch(`${BASE}/escalas/${id}/estado`, { activo });
  return data;
};

export const toggleAcabadoCosto = async (
  id: number,
  activo: boolean
): Promise<{ message: string; acabado: AcabadoCostoCatalogo }> => {
  const { data } = await api.patch(`${BASE}/acabados/${id}/estado`, { activo });
  return data;
};
