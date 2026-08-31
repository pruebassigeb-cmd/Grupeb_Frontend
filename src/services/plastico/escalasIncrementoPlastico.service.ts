// src/services/plastico/escalasIncrementoPlastico.service.ts
import api from "../api";
import type {
  EscalaAsaFlexible,
  CintaSeguridadConEscalas,
  RangoIncrementoInput,
  RangoIncrementoCintaInput,
} from "../../types/plastico/escalas-incremento.types";

const BASE = "/escalas-incremento-plastico";

export const getEscalasAsaFlexible = async (): Promise<EscalaAsaFlexible[]> => {
  const { data } = await api.get<EscalaAsaFlexible[]>(`${BASE}/asa-flexible`);
  return data;
};

export const updateEscalasAsaFlexibleBatch = async (
  escalas: RangoIncrementoInput[]
): Promise<EscalaAsaFlexible[]> => {
  const { data } = await api.put<EscalaAsaFlexible[]>(`${BASE}/asa-flexible/batch`, { escalas });
  return data;
};

export const getEscalasCintaSeguridad = async (): Promise<CintaSeguridadConEscalas[]> => {
  const { data } = await api.get<CintaSeguridadConEscalas[]>(`${BASE}/cinta-seguridad`);
  return data;
};

export const updateEscalasCintaSeguridadBatch = async (
  cambios: RangoIncrementoCintaInput[]
): Promise<CintaSeguridadConEscalas[]> => {
  const { data } = await api.put<CintaSeguridadConEscalas[]>(`${BASE}/cinta-seguridad/batch`, { cambios });
  return data;
};