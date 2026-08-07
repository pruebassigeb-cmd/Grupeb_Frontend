import api from "../api";
import type {
  TipoProductoAdminItem,
  MaterialAdminItem,
  CalibreAdminItem,
} from "../../types/plastico/productos-plastico.types";

const BASE = "/catalogos-productos/plastico/admin";

// ── Tipo de producto ─────────────────────────────────────────────────────
// activo opcional: si se omite (warmApiCache.ts), el backend regresa todo
// sin filtrar (no arma WHERE). Si se pasa true/false, filtra por ese estado
// (useCatalogosPlastico.ts sí lo pasa siempre, explícito).
export const getTiposProductoAdmin = async (
  activo?: boolean
): Promise<TipoProductoAdminItem[]> => {
  try {
    const params = activo === undefined ? {} : { activo: String(activo) };
    const res = await api.get<TipoProductoAdminItem[]>(`${BASE}/tipos-producto`, { params });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al obtener tipos de producto:", error);
    throw error;
  }
};

export const crearTipoProductoAdmin = async (
  nombre: string
): Promise<TipoProductoAdminItem> => {
  try {
    const res = await api.post<TipoProductoAdminItem>(`${BASE}/tipos-producto`, { nombre });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al crear tipo de producto:", error);
    throw error;
  }
};

export const editarTipoProductoAdmin = async (
  id: number,
  nombre: string
): Promise<TipoProductoAdminItem> => {
  try {
    const res = await api.put<TipoProductoAdminItem>(`${BASE}/tipos-producto/${id}`, { nombre });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al editar tipo de producto:", error);
    throw error;
  }
};

export const desactivarTipoProductoAdmin = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const res = await api.delete(`${BASE}/tipos-producto/${id}`);
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al desactivar tipo de producto:", error);
    throw error;
  }
};

export const reactivarTipoProductoAdmin = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const res = await api.patch(`${BASE}/tipos-producto/${id}/reactivar`);
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al reactivar tipo de producto:", error);
    throw error;
  }
};

// ── Material ─────────────────────────────────────────────────────────────
export const getMaterialesAdmin = async (
  activo?: boolean
): Promise<MaterialAdminItem[]> => {
  try {
    const params = activo === undefined ? {} : { activo: String(activo) };
    const res = await api.get<MaterialAdminItem[]>(`${BASE}/materiales`, { params });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al obtener materiales:", error);
    throw error;
  }
};

export const crearMaterialAdmin = async (
  nombre: string,
  valor: number
): Promise<MaterialAdminItem> => {
  try {
    const res = await api.post<MaterialAdminItem>(`${BASE}/materiales`, { nombre, valor });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al crear material:", error);
    throw error;
  }
};

export const editarMaterialAdmin = async (
  id: number,
  nombre: string,
  valor: number
): Promise<MaterialAdminItem> => {
  try {
    const res = await api.put<MaterialAdminItem>(`${BASE}/materiales/${id}`, { nombre, valor });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al editar material:", error);
    throw error;
  }
};

export const desactivarMaterialAdmin = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const res = await api.delete(`${BASE}/materiales/${id}`);
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al desactivar material:", error);
    throw error;
  }
};

export const reactivarMaterialAdmin = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const res = await api.patch(`${BASE}/materiales/${id}/reactivar`);
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al reactivar material:", error);
    throw error;
  }
};

// ── Calibre ──────────────────────────────────────────────────────────────
export const getCalibresAdmin = async (
  activo?: boolean
): Promise<CalibreAdminItem[]> => {
  try {
    const params = activo === undefined ? {} : { activo: String(activo) };
    const res = await api.get<CalibreAdminItem[]>(`${BASE}/calibres`, { params });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al obtener calibres:", error);
    throw error;
  }
};

export const crearCalibreAdmin = async (
  calibre: number,
  calibre_bopp?: number | null,
  gramos?: number | null
): Promise<CalibreAdminItem> => {
  try {
    const res = await api.post<CalibreAdminItem>(`${BASE}/calibres`, {
      calibre,
      calibre_bopp: calibre_bopp ?? null,
      gramos: gramos ?? null,
    });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al crear calibre:", error);
    throw error;
  }
};

export const editarCalibreAdmin = async (
  id: number,
  calibre: number,
  calibre_bopp?: number | null,
  gramos?: number | null
): Promise<CalibreAdminItem> => {
  try {
    const res = await api.put<CalibreAdminItem>(`${BASE}/calibres/${id}`, {
      calibre,
      calibre_bopp: calibre_bopp ?? null,
      gramos: gramos ?? null,
    });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al editar calibre:", error);
    throw error;
  }
};

export const desactivarCalibreAdmin = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const res = await api.delete(`${BASE}/calibres/${id}`);
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al desactivar calibre:", error);
    throw error;
  }
};

export const reactivarCalibreAdmin = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const res = await api.patch(`${BASE}/calibres/${id}/reactivar`);
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al reactivar calibre:", error);
    throw error;
  }
};