import api from "../api";

export interface ColorAsaAdmin {
  id_color: number;
  color: string;
  hex: string | null;
  activo: boolean;
}

const BASE = "/catalogos-papel/color-asa";

export const getColoresAsaAdmin = async (): Promise<ColorAsaAdmin[]> => {
  const { data } = await api.get(BASE);
  return data;
};

export const getColoresAsaInactivos = async (): Promise<ColorAsaAdmin[]> => {
  const { data } = await api.get(`${BASE}/inactivos`);
  return data;
};

export const crearColorAsa = async (color: string, hex: string | null): Promise<ColorAsaAdmin> => {
  const { data } = await api.post(BASE, { color, hex });
  return data;
};

export const editarColorAsa = async (id: number, color: string, hex: string | null): Promise<ColorAsaAdmin> => {
  const { data } = await api.put(`${BASE}/${id}`, { color, hex });
  return data;
};

export const desactivarColorAsa = async (id: number): Promise<{ message: string }> => {
  const { data } = await api.delete(`${BASE}/${id}`);
  return data;
};

export const reactivarColorAsa = async (id: number): Promise<{ message: string }> => {
  const { data } = await api.patch(`${BASE}/${id}/reactivar`);
  return data;
};
