// src/services/papel/mermaPapel.service.ts
// Import confirmado contra preciosAcabadosPapel.service.ts: mismo patrón
// (default export desde "../api").
import api from "../api";

import type {
  CeldaMermaPayload,
  EscalaMerma,
  EscalaResuelta,
  MatrizMermaResponse,
  MermaOrden,
  SimulacionMerma,
} from "../../types/papel/merma.types";

const BASE = "/merma-papel";

// ── Matriz ────────────────────────────────────────────────────────────────
export const getMatrizMerma = async (): Promise<MatrizMermaResponse> => {
  const { data } = await api.get(`${BASE}/matriz`);
  return data;
};

export const updateMatrizMerma = async (
  celdas: CeldaMermaPayload[]
): Promise<{ message: string; actualizadas: number }> => {
  const { data } = await api.put(`${BASE}/matriz`, { celdas });
  return data;
};

// ── Escalas ───────────────────────────────────────────────────────────────
export const createEscalaMerma = async (
  cantidad: number
): Promise<{ message: string; escala: EscalaMerma }> => {
  const { data } = await api.post(`${BASE}/escalas`, { cantidad });
  return data;
};

export const updateEscalaMerma = async (
  id: number,
  cantidad: number
): Promise<{ message: string; escala: EscalaMerma }> => {
  const { data } = await api.put(`${BASE}/escalas/${id}`, { cantidad });
  return data;
};

export const toggleEscalaMerma = async (
  id: number,
  activo: boolean
): Promise<{ message: string; escala: EscalaMerma }> => {
  const { data } = await api.patch(`${BASE}/escalas/${id}/activo`, { activo });
  return data;
};

export const toggleProcesoMerma = async (
  id: number,
  activo: boolean
): Promise<{ message: string; proceso: any }> => {
  const { data } = await api.patch(`${BASE}/procesos/${id}/activo`, { activo });
  return data;
};

// ── Simulación ────────────────────────────────────────────────────────────
export const simularMerma = async (
  cantidad: number,
  procesos?: number[]
): Promise<SimulacionMerma> => {
  const { data } = await api.get(`${BASE}/simular`, {
    params: {
      cantidad,
      ...(procesos?.length ? { procesos: procesos.join(",") } : {}),
    },
  });
  return data;
};

export const resolverEscala = async (
  cantidad: number
): Promise<{ cantidad: number; escala: EscalaResuelta }> => {
  const { data } = await api.get(`${BASE}/escala`, { params: { cantidad } });
  return data;
};

// ── Snapshot por orden ────────────────────────────────────────────────────
export const getPermisosMerma = async (): Promise<{ puede_recalcular: boolean }> => {
  const { data } = await api.get(`${BASE}/permisos`);
  return data;
};

export const getMermaOrden = async (idproduccion: number): Promise<MermaOrden> => {
  const { data } = await api.get(`${BASE}/orden/${idproduccion}`);
  return data;
};

/** 🔒 Solo usuarios con acceso_total. El backend responde 403 al resto. */
export const recalcularMermaOrden = async (
  idproduccion: number,
  motivo: string
): Promise<{
  message: string;
  anterior: { merma_total: number; cantidad_a_producir: number; version_calculo: number };
  actual: { merma_total: number; cantidad_a_producir: number; version_calculo: number };
  advertencias: string[];
}> => {
  const { data } = await api.post(`${BASE}/orden/${idproduccion}/recalcular`, { motivo });
  return data;
};