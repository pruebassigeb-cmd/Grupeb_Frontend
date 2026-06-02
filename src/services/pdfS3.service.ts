// src/services/pdfS3.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Utilitario para subir PDFs generados en el frontend directamente a S3
// a través del endpoint /api/archivos/upload que ya existe en el backend.
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

/**
 * Recibe un Blob ya generado (doc.output("blob") ANTES del doc.save())
 * y lo sube al endpoint /api/archivos/upload.
 * Silencioso: no lanza error si falla — el PDF ya se descargó/abrió.
 */
export async function subirPdfA3(
  blob: Blob,
  nombreArchivo: string,
  carpeta: CarpetaS3,
  subcarpeta: SubcarpetaPdf
): Promise<void> {
  try {
    const file = new File([blob], nombreArchivo, { type: "application/pdf" });

    const formData = new FormData();
    formData.append("archivo", file);
    formData.append("carpeta", carpeta);
    formData.append("subcarpeta", subcarpeta);

    await api.post("/archivos/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    console.log(`✅ PDF guardado en S3: grupeb/${carpeta}/${subcarpeta}/${nombreArchivo}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo guardar en S3 (${nombreArchivo}):`, err);
  }
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