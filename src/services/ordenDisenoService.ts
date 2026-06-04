import api from "./api";
import type {
  OrdenDiseno,
  OrdenDisenoDetalle,
  MensajeDiseno,
  Notificacion,
} from "../types/ordenDiseno.types";

export const getOrdenesDiseno = async (): Promise<OrdenDiseno[]> => {
  const res = await api.get("/orden-diseno");
  return res.data;
};

export const getOrdenDisenoById = async (id: number): Promise<OrdenDisenoDetalle> => {
  const res = await api.get(`/orden-diseno/${id}`);
  return res.data;
};

export const getMensajes = async (
  id: number,
  desde?: string
): Promise<MensajeDiseno[]> => {
  const params = desde ? { desde } : {};
  const res = await api.get(`/orden-diseno/${id}/mensajes`, { params });
  return res.data;
};

export const crearOrdenDiseno = async (data: {
  solicitud_id: number;
  no_pedido:    string;
  participantes?: { usuario_id: number; rol_en_orden: string }[];
}) => {
  const res = await api.post("/orden-diseno", data);
  return res.data;
};

export const enviarMensaje = async (id: number, contenido: string) => {
  const res = await api.post(`/orden-diseno/${id}/mensaje`, { contenido });
  return res.data;
};

export const subirRevision = async (
  id: number,
  data: {
    tipo:           "render" | "feedback";
    observaciones?: string;
    archivos:       { id_archivo: number; categoria?: string }[];
  }
) => {
  const res = await api.post(`/orden-diseno/${id}/revision`, data);
  return res.data;
};

export const aprobarOrdenDiseno = async (id: number) => {
  const res = await api.post(`/orden-diseno/${id}/aprobar`);
  return res.data;
};

export const agregarParticipante = async (
  id: number,
  data: { usuario_id: number; rol_en_orden: string }
) => {
  const res = await api.post(`/orden-diseno/${id}/participante`, data);
  return res.data;
};

export const getNotificaciones = async (): Promise<Notificacion[]> => {
  const res = await api.get("/orden-diseno/notificaciones/mis");
  return res.data;
};

export const marcarNotificacionesLeidas = async (ids?: number[]) => {
  const res = await api.patch("/orden-diseno/notificaciones/leer", { ids });
  return res.data;
};

export const getObservacionProducto = async (id: number) => {
  const res = await api.get(`/orden-diseno/${id}/observacion-producto`);
  return res.data;
};
// src/services/ordenDisenoService.ts — reemplaza getImagenesDiseno

export const getImagenesDiseno = async (
  idorden: number
): Promise<{ url_render: string | null; url_master: string | null }> => {
  const orden = await getOrdenDisenoById(idorden);

  const renderRevisiones = orden.revisiones
    .filter((r) => r.tipo === "render")
    .sort((a, b) => b.numero_version - a.numero_version);

  const ultimaRevision = renderRevisiones[0] ?? null;

  if (!ultimaRevision || ultimaRevision.archivos.length === 0) {
    return { url_render: null, url_master: null };
  }

  // ✅ Busca por categoría real, no por posición
  const renderArchivo = ultimaRevision.archivos.find(a => a.categoria === "render") ?? null;


  const masterArchivo = ultimaRevision.archivos.find(a => a.categoria === "master")
    ?? null;  // master no tiene fallback — si no está marcado, no se muestra

  return {
    url_render: renderArchivo?.url ?? null,
    url_master: masterArchivo?.url ?? null,
  };
};