import api from "./api";
import type {
  Privilegio,
  PrivilegioModulo,
  CrearPrivilegioRequest,
  EditarPrivilegioRequest,
} from "../types/privilegio.types";

export const getPrivilegios = async (): Promise<Privilegio[]> => {
  const response = await api.get<Privilegio[]>("/privilegios");
  return response.data;
};

export const getModulos = async (): Promise<PrivilegioModulo[]> => {
  const response = await api.get<PrivilegioModulo[]>("/privilegios/modulos");
  return response.data;
};

export const crearPrivilegio = async (datos: CrearPrivilegioRequest): Promise<Privilegio> => {
  const response = await api.post<Privilegio>("/privilegios", datos);
  return response.data;
};

export const editarPrivilegio = async (
  id: number,
  datos: EditarPrivilegioRequest
): Promise<Privilegio> => {
  const response = await api.put<Privilegio>(`/privilegios/${id}`, datos);
  return response.data;
};

export const toggleActivoPrivilegio = async (id: number): Promise<Privilegio> => {
  const response = await api.patch<Privilegio>(`/privilegios/${id}/activo`);
  return response.data;
};
