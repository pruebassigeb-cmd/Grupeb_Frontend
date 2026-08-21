import api from '../api';

export type PrioridadTicket = 'Baja' | 'Media' | 'Alta' | 'Urgente';
export type EstadoTicket = 'Pendiente' | 'En proceso' | 'Finalizado' | 'Cancelado';

export interface TicketComentario {
  idticket_comentario: number;
  comentario: string;
  es_interno: boolean;
  created_at: string;
  nombre: string;
  apellido: string;
}

export interface TicketArchivo {
  id_archivo: string;
  nombre: string;
  public_id: string;
  tamano_kb: number;
  created_at: string;
  ticket_comentario_id: number | null;
  url: string | null;
}

export interface Ticket {
  idticket: number;
  folio: string;
  titulo: string;
  descripcion: string;
  ubicacion: string | null;
  prioridad: PrioridadTicket;
  estado: EstadoTicket;
  creado_por: number;
  creador_nombre?: string;
  creador_apellido?: string;
  asignado_a: number | null;
  asignado_nombre?: string;
  asignado_apellido?: string;
  idticket_relacionado: number | null;
  relacionado_folio?: string;
  archivado: boolean;
  archivado_en: string | null;
  fecha_cierre: string | null;
  created_at: string;
}

export interface TicketDetalle extends Ticket {
  comentarios: TicketComentario[];
  archivos: TicketArchivo[];
}

export interface CrearTicketPayload {
  titulo: string;
  descripcion: string;
  ubicacion?: string;
  prioridad?: PrioridadTicket;
  idticket_relacionado?: number;
}

export const crearTicket = async (payload: CrearTicketPayload): Promise<Ticket> => {
  const { data } = await api.post<Ticket>('/tickets', payload);
  return data;
};

export const getMisTickets = async (): Promise<Ticket[]> => {
  const { data } = await api.get<Ticket[]>('/tickets/mios');
  return data;
};

export const getTickets = async (filtros?: {
  estado?: string;
  prioridad?: string;
  archivado?: boolean;
}): Promise<Ticket[]> => {
  const { data } = await api.get<Ticket[]>('/tickets', { params: filtros });
  return data;
};

export const getTicketDetalle = async (id: number): Promise<TicketDetalle> => {
  const { data } = await api.get<TicketDetalle>(`/tickets/${id}`);
  return data;
};

export const getContadorTickets = async (): Promise<number> => {
  const { data } = await api.get<{ activos: number }>('/tickets/contador');
  return data.activos;
};

export const cambiarEstadoTicket = async (id: number, estado: EstadoTicket): Promise<Ticket> => {
  const { data } = await api.patch<Ticket>(`/tickets/${id}/estado`, { estado });
  return data;
};

export const tomarTicket = async (id: number): Promise<Ticket> => {
  const { data } = await api.post<Ticket>(`/tickets/${id}/tomar`);
  return data;
};

export const comentarTicket = async (
  id: number,
  comentario: string,
  es_interno = false
): Promise<TicketComentario> => {
  const { data } = await api.post<TicketComentario>(`/tickets/${id}/comentarios`, { comentario, es_interno });
  return data;
};