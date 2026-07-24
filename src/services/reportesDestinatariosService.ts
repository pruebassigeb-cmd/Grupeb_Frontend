// src/services/reportesDestinatariosService.ts
import api from "./api";

export type TipoReporte = "produccion" | "cotizaciones" | "pedidos" | "diseno" | "anticipos";

export interface DestinatarioReporte {
  idusuario: number;
  nombre: string;
  correo: string;
  rol: string;
  reportes: Record<TipoReporte, boolean>;
}

export const getDestinatariosReporte = async (): Promise<DestinatarioReporte[]> => {
  const response = await api.get<DestinatarioReporte[]>("/reportes/destinatarios");
  return response.data;
};

export const actualizarDestinatarioReporte = async (
  idusuario: number,
  reportes: Record<TipoReporte, boolean>
) => {
  const response = await api.put(`/reportes/destinatarios/${idusuario}`, { reportes });
  return response.data;
};