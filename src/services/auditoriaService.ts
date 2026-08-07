import api from "./api";

export interface UsuarioAuditoria {
  id: number;
  nombre: string;
}

export interface SelloAutoria {
  creadoPor: UsuarioAuditoria | null;
  createdAt: string | null;
  actualizadoPor: UsuarioAuditoria | null;
  updatedAt: string | null;
  eliminadoPor: UsuarioAuditoria | null;
  eliminadoAt: string | null;
}

export interface CambioAuditoria {
  campo: string;
  etiqueta: string;
  antes: unknown;
  despues: unknown;
}

export interface EventoAuditoria {
  id: number | string;
  accion: "INSERT" | "UPDATE" | "DELETE";
  fecha: string;
  usuario: UsuarioAuditoria | null;
  endpoint: string | null;
  cambios: CambioAuditoria[];
}

export interface Auditoria {
  tabla: string;
  etiqueta: string;
  modo: "discreto" | "principal";
  registroId: number;
  sello: SelloAutoria;
  eventos: EventoAuditoria[];
}

/** Consulta el historial de una entidad permitida por el backend. */
export const getAuditoria = async (
  tabla: string,
  id: number,
  limite = 50,
): Promise<Auditoria> => {
  const response = await api.get(`/auditoria/${tabla}/${id}`, {
    params: { limite },
  });
  return response.data;
};
