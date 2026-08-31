// src/services/cotizadorLibre/cintaSeguridadCotizadorLibre.service.ts
import api from "../api";
import type { CintaSeguridadCotizadorLibreItem } from "../../types/cotizadorLibre/cintaSeguridadCotizadorLibre.types";

export const getCintaSeguridadCotizadorLibre = async (): Promise<CintaSeguridadCotizadorLibreItem[]> => {
  const { data } = await api.get<CintaSeguridadCotizadorLibreItem[]>(
    "/cotizador-libre/catalogo/cinta-seguridad"
  );
  return data;
};