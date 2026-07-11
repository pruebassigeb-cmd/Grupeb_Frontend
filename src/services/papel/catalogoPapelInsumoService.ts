import api from "../api";

export type CatKeySincronizado =
  | "tipo_papel"
  | "pegamento"
  | "laminado"
  | "sacabocados"
  | "perforado"
  | "matrix";

export interface CatalogoInsumoItem {
  id: number;
  nombre: string;
  activo: boolean;
  insumo_idinsumo: number | null;
}

const BASE = "/catalogos-papel/insumo";

export const getCatalogoInsumo = async (
  catKey: CatKeySincronizado,
  activo?: boolean
): Promise<CatalogoInsumoItem[]> => {
  const params = activo === undefined ? {} : { activo: String(activo) };
  const { data } = await api.get(`${BASE}/${catKey}`, { params });
  return data;
};

/**
 * Da de alta un registro en el catálogo `catKey`. El tipo de insumo queda
 * implícito por `catKey` — el usuario no elige tipo, ya está dentro de esa
 * pestaña. Para sacabocados/perforado, pasa `medida` aparte y el backend la
 * concatena al nombre (ej. "Sacabocado" + "3 mm" -> "Sacabocado 3 mm").
 */
export const crearCatalogoInsumo = async (
  catKey: CatKeySincronizado,
  nombre: string,
  medida?: string
): Promise<CatalogoInsumoItem> => {
  const { data } = await api.post(`${BASE}/${catKey}`, { nombre, medida });
  return data;
};

export const desactivarCatalogoInsumo = async (
  catKey: CatKeySincronizado,
  id: number
): Promise<{ message: string }> => {
  const { data } = await api.patch(`${BASE}/${catKey}/${id}`);
  return data;
};

export const reactivarCatalogoInsumo = async (
  catKey: CatKeySincronizado,
  id: number
): Promise<{ message: string }> => {
  const { data } = await api.patch(`${BASE}/${catKey}/${id}/reactivar`);
  return data;
};