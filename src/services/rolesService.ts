import api from "./api";
import type {
  Rol,
  PrivilegiosPorRol,
  CrearRolRequest,
  EditarRolRequest,
} from "../types/rol.types";

export const getRoles = async (): Promise<Rol[]> => {
  const response = await api.get<Rol[]>("/roles");
  return response.data;
};

/**
 * Obtener privilegios base predefinidos de un rol
 */
export const getPrivilegiosByRol = async (rolId: number): Promise<PrivilegiosPorRol> => {
  const response = await api.get<PrivilegiosPorRol>(`/roles/${rolId}/privilegios`);
  return response.data;
};

export const crearRol = async (datos: CrearRolRequest): Promise<Rol> => {
  const response = await api.post<Rol>("/roles", datos);
  return response.data;
};

export const editarRol = async (id: number, datos: EditarRolRequest): Promise<Rol> => {
  const response = await api.put<Rol>(`/roles/${id}`, datos);
  return response.data;
};

export const actualizarPrivilegiosRol = async (
  id: number,
  privilegios: number[]
): Promise<void> => {
  await api.put(`/roles/${id}/privilegios`, { privilegios });
};
