import api from "./api";
import type {
  Privilegio,
  PrivilegioModulo,
  CrearPrivilegioRequest,
  EditarPrivilegioRequest,
} from "../types/privilegio.types";

// NOTA (2026-08-14): aquí vivía una lista quemada de módulos a ocultar.
// Se quitó al reorganizar el catálogo por pantallas: ahora lo que decide si
// un privilegio se ofrece o no es su columna `activo` en la BD, que se
// prende y apaga desde Roles > Privilegios sin tocar código ni redesplegar.
// Los 7 privilegios sin pantalla (WhatsApp, push, auditoría, etc.) quedaron
// inactivos ahí. Ver migrations/2026-08-14_modulos_por_pantalla.sql.

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
