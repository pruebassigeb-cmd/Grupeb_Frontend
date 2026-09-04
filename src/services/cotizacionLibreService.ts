// src/services/cotizacionLibreService.ts
import api from "./api";
import type {
  CrearCotizacionLibrePayload,
  RespuestaCrearCotizacionLibre,
  CotizacionLibreResumen,
  CotizacionLibreDetalle,
} from "../types/cotizacion-libre.types";

export const crearCotizacionLibre = async (
  datos: CrearCotizacionLibrePayload
): Promise<RespuestaCrearCotizacionLibre> => {
  const response = await api.post("/cotizaciones-libres", datos);
  return response.data;
};

export const getCotizacionesLibres = async (): Promise<CotizacionLibreResumen[]> => {
  const response = await api.get("/cotizaciones-libres");
  return response.data;
};

export const getCotizacionLibreDetalle = async (
  folio: string
): Promise<CotizacionLibreDetalle> => {
  const response = await api.get(`/cotizaciones-libres/${folio}`);
  return response.data;
};

export const actualizarCotizacionLibre = async (
  folio: string,
  datos: CrearCotizacionLibrePayload
): Promise<{ message: string; folio: string }> => {
  const response = await api.put(`/cotizaciones-libres/${folio}`, datos);
  return response.data;
};

export const eliminarCotizacionLibre = async (folio: string): Promise<{ message: string }> => {
  const response = await api.delete(`/cotizaciones-libres/${folio}`);
  return response.data;
};