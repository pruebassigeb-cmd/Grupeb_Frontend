import api from './api';

export interface Archivo {
  id_archivo: string;
  nombre: string;
  tipo: 'pdf' | 'image' | 'document';
  mime_type: string;
  url: string;
  public_id: string | null;
  tamano_kb: number;
  subido_por: string | null;
  resource_type: string;
  carpeta: string;
  created_at: string;
}

export type CarpetaFrontend = "disenos" | "pdfs" | "fotos-envios" | "backups";

export const CARPETAS_LABELS: Record<CarpetaFrontend, string> = {
  "disenos":      "Diseños",
  "pdfs":         "PDFs",
  "fotos-envios": "Fotos de Envíos",
  "backups":      "Backups BD",
};

export const subirArchivo = async (
  file: File,
  carpeta: CarpetaFrontend
): Promise<Archivo> => {
  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("carpeta", carpeta);

  const { data } = await api.post<Archivo>("/archivos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
};

export const listarArchivos = async (): Promise<Archivo[]> => {
  const { data } = await api.get<Archivo[]>("/archivos");
  return data;
};

export const eliminarArchivo = async (id_archivo: string): Promise<void> => {
  await api.delete(`/archivos/${id_archivo}`);
};

export interface Estadisticas {
  total_archivos:   number;
  total_imagenes:   number;
  total_pdfs:       number;
  total_documentos: number;
  almacenamiento: {
    kb:         number;
    mb:         number;
    gb:         number;
    limite_gb:  number;
    porcentaje: number;
  };
  por_carpeta: {
    disenos:      number;
    pdfs:         number;
    fotos_envios: number;
    backups:      number;
  };
}

export const obtenerEstadisticas = async (): Promise<Estadisticas> => {
  const { data } = await api.get<Estadisticas>("/archivos/estadisticas");
  return data;
};