import api from "./api";

export type LoginMode = "COLLAGE" | "NORMAL" | "BLOQUEADO";
export type EstadoSighting = "pendiente" | "promovida" | "ignorada";

export interface Red {
  id_red: number;
  nombre: string;
  ip_publica: string;
  login_mode: LoginMode;
  activa: boolean;
  descripcion: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RedPayload {
  nombre: string;
  ip_publica: string;
  login_mode: LoginMode;
  activa: boolean;
  descripcion?: string | null;
}

export interface Sighting {
  id_avistamiento: number;
  ip_publica: string;
  primera_vez: string;
  ultima_vez: string;
  veces_vista: number;
  estado: EstadoSighting;
  authorized_network_id: number | null;
  resuelta_por: number | null;
  resuelta_at: string | null;
}

export interface PromoverPayload {
  nombre: string;
  login_mode: LoginMode;
  activa?: boolean;
  descripcion?: string | null;
}

// ==========================
// CRUD authorized_networks
// ==========================
export const listarRedesService = async (): Promise<Red[]> => {
  const { data } = await api.get("/admin/networks");
  return data;
};

export const crearRedService = async (payload: RedPayload): Promise<Red> => {
  const { data } = await api.post("/admin/networks", payload);
  return data;
};

export const actualizarRedService = async (id: number, payload: RedPayload): Promise<Red> => {
  const { data } = await api.put(`/admin/networks/${id}`, payload);
  return data;
};

export const cambiarEstadoRedService = async (id: number, activa: boolean) => {
  const { data } = await api.patch(`/admin/networks/${id}/status`, { activa });
  return data;
};

export const eliminarRedService = async (id: number) => {
  const { data } = await api.delete(`/admin/networks/${id}`);
  return data;
};

// ==========================
// network_sightings
// ==========================
export const listarSightingsService = async (
  estado: EstadoSighting = "pendiente"
): Promise<Sighting[]> => {
  const { data } = await api.get("/admin/networks/sightings", { params: { estado } });
  return data;
};

export const promoverSightingService = async (
  id: number,
  payload: PromoverPayload
): Promise<Red> => {
  const { data } = await api.post(`/admin/networks/sightings/${id}/promover`, payload);
  return data;
};

export const ignorarSightingService = async (id: number) => {
  const { data } = await api.post(`/admin/networks/sightings/${id}/ignorar`);
  return data;
};