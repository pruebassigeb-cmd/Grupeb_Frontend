// src/services/pdfS3.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Utilitario para subir PDFs generados en el frontend directamente a S3
// a través del endpoint /api/archivos/upload que ya existe en el backend.
//
// Para WhatsApp necesitamos que la subida NO sea silenciosa:
// debe regresar id_archivo, public_id/key y nombre, para después pedir
// una URL firmada larga y enviarla a Meta como documento.
// ─────────────────────────────────────────────────────────────────────────────

import api from "./api";
import { showConfirm } from "../components/CustomConfirm";

type CarpetaS3 = "pdfs" | "disenos" | "fotos-envios" | "backups";

type SubcarpetaPdf =
  | "cotizaciones"
  | "pedidos"
  | "ordenes-produccion"
  | "estados-cuenta-detallado"
  | "estados-cuenta-simple"
  | "historial-pagos"
  | "etiquetas"
  | "notas-remision"
  | "formas-envio";

export interface ArchivoSubidoS3 {
  id_archivo: number;
  nombre: string;
  tipo: string;
  mime_type: string;
  url: string;
  public_id: string;
  tamano_kb: number;
  subido_por: number | null;
  resource_type: string;
  categoria: string | null;
  usuario_id: number | null;
  envio_id: number | null;
  nota_id: number | null;
  idproducto_papel: number | null;
  idconfiguracion_plastico: number | null;
  created_at: string;
}

export interface UrlFirmadaArchivo {
  url: string;
}

/**
 * Recibe un Blob ya generado y lo sube al endpoint /api/archivos/upload.
 *
 * Antes regresaba void.
 * Ahora regresa la fila creada en la tabla archivos.
 */
export async function subirPdfA3(
  blob: Blob,
  nombreArchivo: string,
  carpeta: CarpetaS3,
  subcarpeta: SubcarpetaPdf
): Promise<ArchivoSubidoS3> {
  const file = new File([blob], nombreArchivo, { type: "application/pdf" });

  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("carpeta", carpeta);
  formData.append("subcarpeta", subcarpeta);

  const { data } = await api.post<ArchivoSubidoS3>("/archivos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  console.log("✅ PDF guardado en S3:", {
    nombre: data.nombre,
    public_id: data.public_id,
    id_archivo: data.id_archivo,
  });

  return data;
}

/**
 * Obtiene URL firmada normal del backend.
 * Esta normalmente dura poco tiempo.
 */
export async function obtenerUrlFirmadaArchivo(
  idArchivo: number
): Promise<string> {
  const { data } = await api.get<UrlFirmadaArchivo>(
    `/archivos/${idArchivo}/url`
  );

  return data.url;
}

/**
 * Obtiene URL firmada larga.
 * Esta es la que conviene usar para WhatsApp, porque Meta necesita
 * descargar el PDF desde una URL accesible.
 *
 * Requiere que agreguemos un endpoint en backend:
 * GET /api/archivos/:id_archivo/url-larga?dias=7
 */
export async function obtenerUrlFirmadaLargaArchivo(
  idArchivo: number,
  dias = 7
): Promise<string> {
  const { data } = await api.get<UrlFirmadaArchivo>(
    `/archivos/${idArchivo}/url-larga`,
    {
      params: { dias },
    }
  );

  return data.url;
}

/**
 * Sube el PDF y devuelve todo lo necesario para WhatsApp:
 * - datos del archivo
 * - URL firmada larga
 * - nombre del archivo
 */
export async function subirPdfA3ParaWhatsapp(
  blob: Blob,
  nombreArchivo: string,
  carpeta: CarpetaS3,
  subcarpeta: SubcarpetaPdf,
  diasUrl = 7
): Promise<{
  archivo: ArchivoSubidoS3;
  documentoUrl: string;
  documentoNombre: string;
}> {
  const archivo = await subirPdfA3(blob, nombreArchivo, carpeta, subcarpeta);

  const documentoUrl = await obtenerUrlFirmadaLargaArchivo(
    archivo.id_archivo,
    diasUrl
  );

  return {
    archivo,
    documentoUrl,
    documentoNombre: archivo.nombre || nombreArchivo,
  };
}

/**
 * Muestra un modal de confirmación personalizado preguntando si quiere guardar en S3.
 * Retorna una promesa que resuelve en true si el usuario acepta.
 */
export function preguntarGuardarS3(tipoDocumento: string): Promise<boolean> {
  return showConfirm(
    `¿Deseas guardar este ${tipoDocumento} en el gestor de archivos?\n\nPodrás acceder a él desde la sección "Archivos" en cualquier momento.`
  );
}