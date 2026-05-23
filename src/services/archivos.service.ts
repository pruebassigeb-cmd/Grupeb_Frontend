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
  subcarpeta?: string;
  envio_id?: number | null;
  created_at: string;
}

export type CarpetaFrontend = "disenos" | "pdfs" | "fotos-envios" | "backups";

export type SubcarpetaPDF =
  | "cotizaciones"
  | "pedidos"
  | "ordenes-produccion"
  | "estados-cuenta-detallado"
  | "estados-cuenta-simple"
  | "historial-pagos"
  | "etiquetas"
  | "notas-remision"
  | "formas-envio";

export const CARPETAS_LABELS: Record<CarpetaFrontend, string> = {
  "disenos":      "Diseños",
  "pdfs":         "PDFs",
  "fotos-envios": "Fotos de Envíos",
  "backups":      "Backups BD",
};

export const SUBCARPETAS_PDF: { value: SubcarpetaPDF; label: string }[] = [
  { value: "cotizaciones",             label: "Cotizaciones"                  },
  { value: "pedidos",                  label: "Pedidos"                       },
  { value: "ordenes-produccion",       label: "Órdenes de Producción"         },
  { value: "estados-cuenta-detallado", label: "Estados de Cuenta Detallados"  },
  { value: "estados-cuenta-simple",    label: "Estados de Cuenta Simple"      },
  { value: "historial-pagos",          label: "Historial de Pagos"            },
  { value: "etiquetas",                label: "Etiquetas"                     },
  { value: "notas-remision",           label: "Notas de Remisión"             },
  { value: "formas-envio",             label: "Formas de Envío"               },
];

// Subir archivo — ahora acepta envio_id opcional
export const subirArchivo = async (
  file: File,
  carpeta: CarpetaFrontend,
  subcarpeta?: SubcarpetaPDF,
  envio_id?: number,
): Promise<Archivo> => {
  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("carpeta", carpeta);
  if (subcarpeta)          formData.append("subcarpeta", subcarpeta);
  if (envio_id != null)    formData.append("envio_id",   String(envio_id));

  const { data } = await api.post<Archivo>("/archivos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
};

// Obtener fotos de un envío específico
export const getFotosEnvio = async (idenvio: number): Promise<Archivo[]> => {
  const { data } = await api.get<Archivo[]>(`/archivos/envio/${idenvio}`);
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