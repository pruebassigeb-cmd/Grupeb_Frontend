// src/services/cotizadorLibre/cotizadorLibreCotizaciones.service.ts
import api from "../api";
import type {
  CrearCotizacionRequest,
  CrearCotizacionResponse,
} from "../../types/cotizadorLibre/cotizadorLibreCotizaciones.types";

export const crearCotizacionCotizadorLibre = async (
  payload: CrearCotizacionRequest
): Promise<CrearCotizacionResponse> => {
  const { data } = await api.post<CrearCotizacionResponse>(
    "/cotizador-libre/cotizaciones",
    payload
  );
  return data;
};

export interface EnviarPdfCotizadorLibrePayload {
  tipo: "cotizacion" | "pedido";
  folio: string;
  pdfBase64: string;
  nombreArchivo: string;
}

export const enviarPdfCotizadorLibre = async (
  idsolicitud: number,
  payload: EnviarPdfCotizadorLibrePayload
): Promise<{ enviado: true }> => {
  const { data } = await api.post<{ enviado: true }>(
    `/cotizador-libre/cotizaciones/${idsolicitud}/enviar-pdf`,
    payload
  );
  return data;
};