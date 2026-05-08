import api from "./api";
import type { Usuario, CreateUsuarioRequest, UpdateUsuarioRequest } from "../types/usuario.types";
import type { UsuarioParticipante } from "../types/ordenDiseno.types";

export const getUsuarios = async (): Promise<Usuario[]> => {
  const response = await api.get<Usuario[]>("/usuarios");
  return response.data;
};

export const getUsuarioById = async (id: number): Promise<Usuario> => {
  const response = await api.get<Usuario>(`/usuarios/${id}`);
  return response.data;
};

export const createUsuario = async (data: CreateUsuarioRequest) => {
  const response = await api.post("/usuarios", data);
  return response.data;
};

export const updateUsuario = async (id: number, data: UpdateUsuarioRequest) => {
  const response = await api.put(`/usuarios/${id}`, data);
  return response.data;
};

export const deleteUsuario = async (id: number) => {
  const response = await api.delete(`/usuarios/${id}`);
  return response.data;
};

export const getUsuariosDiseno = async (): Promise<UsuarioParticipante[]> => {
  const response = await api.get<UsuarioParticipante[]>("/usuarios/diseno/lista");
  return response.data;
};