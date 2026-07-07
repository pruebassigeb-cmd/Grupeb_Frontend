import api from "../api";
import type {
  TipoProductoAdminItem,
  MaterialAdminItem,
  CalibreAdminItem,
} from "../../types/productos-plastico.types";

const BASE = "/catalogos-productos/plastico/admin";

// ── Tipo de producto ─────────────────────────────────────────────────────
export const getTiposProductoAdmin = async (
  activo?: boolean
): Promise<TipoProductoAdminItem[]> => {
  const params = activo === undefined ? {} : { activo: String(activo) };
  const res = await api.get(`${BASE}/tipos-producto`, { params });
  return res.data;
};

export const crearTipoProductoAdmin = async (
  nombre: string
): Promise<TipoProductoAdminItem> => {
  const res = await api.post(`${BASE}/tipos-producto`, { nombre });
  return res.data;
};

export const editarTipoProductoAdmin = async (
  id: number,
  nombre: string
): Promise<TipoProductoAdminItem> => {
  const res = await api.put(`${BASE}/tipos-producto/${id}`, { nombre });
  return res.data;
};

export const desactivarTipoProductoAdmin = async (id: number) => {
  const res = await api.delete(`${BASE}/tipos-producto/${id}`);
  return res.data;
};

export const reactivarTipoProductoAdmin = async (id: number) => {
  const res = await api.patch(`${BASE}/tipos-producto/${id}/reactivar`);
  return res.data;
};

// ── Material ─────────────────────────────────────────────────────────────
export const getMaterialesAdmin = async (
  activo?: boolean
): Promise<MaterialAdminItem[]> => {
  const params = activo === undefined ? {} : { activo: String(activo) };
  const res = await api.get(`${BASE}/materiales`, { params });
  return res.data;
};

export const crearMaterialAdmin = async (
  nombre: string,
  valor: number
): Promise<MaterialAdminItem> => {
  const res = await api.post(`${BASE}/materiales`, { nombre, valor });
  return res.data;
};

export const editarMaterialAdmin = async (
  id: number,
  nombre: string,
  valor: number
): Promise<MaterialAdminItem> => {
  const res = await api.put(`${BASE}/materiales/${id}`, { nombre, valor });
  return res.data;
};

export const desactivarMaterialAdmin = async (id: number) => {
  const res = await api.delete(`${BASE}/materiales/${id}`);
  return res.data;
};

export const reactivarMaterialAdmin = async (id: number) => {
  const res = await api.patch(`${BASE}/materiales/${id}/reactivar`);
  return res.data;
};

// ── Calibre ──────────────────────────────────────────────────────────────
export const getCalibresAdmin = async (
  activo?: boolean
): Promise<CalibreAdminItem[]> => {
  const params = activo === undefined ? {} : { activo: String(activo) };
  const res = await api.get(`${BASE}/calibres`, { params });
  return res.data;
};

export const crearCalibreAdmin = async (
  calibre: number,
  calibre_bopp?: number | null,
  gramos?: number | null
): Promise<CalibreAdminItem> => {
  const res = await api.post(`${BASE}/calibres`, { calibre, calibre_bopp, gramos });
  return res.data;
};

export const editarCalibreAdmin = async (
  id: number,
  calibre: number,
  calibre_bopp?: number | null,
  gramos?: number | null
): Promise<CalibreAdminItem> => {
  const res = await api.put(`${BASE}/calibres/${id}`, { calibre, calibre_bopp, gramos });
  return res.data;
};

export const desactivarCalibreAdmin = async (id: number) => {
  const res = await api.delete(`${BASE}/calibres/${id}`);
  return res.data;
};

export const reactivarCalibreAdmin = async (id: number) => {
  const res = await api.patch(`${BASE}/calibres/${id}/reactivar`);
  return res.data;
};