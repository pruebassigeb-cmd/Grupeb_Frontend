// src/services/cotizadorLibre/cotizadorLibreLanding.service.ts
import api from "../api";
import type {
  LandingSlotItem,
  SeccionLandingCotizadorLibre,
} from "../../types/cotizadorLibre/cotizadorLibreLanding.types";
import type { CategoriaCotizadorLibre } from "../../types/cotizadorLibre/cotizadorLibre.types";

const BASE = "/cotizador-libre/landing";

export const getLandingCotizadorLibre = async (): Promise<LandingSlotItem[]> => {
  const { data } = await api.get<LandingSlotItem[]>(BASE);
  return data;
};

export const crearSlotLandingCotizadorLibre = async (
  seccion: SeccionLandingCotizadorLibre,
  titulo: string,
  // ✅ NUEVO — opcional: configurar el atajo desde el alta misma.
  atajo?: { categoriaDestino: CategoriaCotizadorLibre; idTipoDestino: number }
): Promise<LandingSlotItem> => {
  const { data } = await api.post<LandingSlotItem>(BASE, {
    seccion,
    titulo,
    ...(atajo ? { categoriaDestino: atajo.categoriaDestino, idTipoDestino: atajo.idTipoDestino } : {}),
  });
  return data;
};

export const actualizarSlotLandingCotizadorLibre = async (
  id: number,
  cambios: {
    titulo?: string;
    orden?: number;
    seccion?: SeccionLandingCotizadorLibre;
    // ✅ NUEVO — categoriaDestino: null es la señal explícita de "quitar
    // el atajo"; no mandar el campo deja el que ya tenía sin tocar.
    categoriaDestino?: CategoriaCotizadorLibre | null;
    idTipoDestino?: number | null;
  }
): Promise<LandingSlotItem> => {
  const { data } = await api.put<LandingSlotItem>(`${BASE}/${id}`, cambios);
  return data;
};

export const eliminarSlotLandingCotizadorLibre = async (id: number): Promise<void> => {
  await api.delete(`${BASE}/${id}`);
};

export const subirImagenSlotLandingCotizadorLibre = async (
  id: number,
  archivo: File
): Promise<LandingSlotItem> => {
  const formData = new FormData();
  formData.append("archivo", archivo);
  const { data } = await api.post<LandingSlotItem>(`${BASE}/${id}/imagen`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const eliminarImagenSlotLandingCotizadorLibre = async (id: number): Promise<LandingSlotItem> => {
  const { data } = await api.delete<LandingSlotItem>(`${BASE}/${id}/imagen`);
  return data;
};