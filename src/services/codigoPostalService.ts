import api from "./api";

export interface OpcionCP {
  colonia: string;
  poblacion: string;
  estado: string;
}

export const buscarCodigoPostal = async (cp: string): Promise<OpcionCP[]> => {
  const response = await api.get(`/codigos-postales/${cp}`);
  return response.data;
};