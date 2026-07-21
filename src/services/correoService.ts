import api from "./api";
import { ejecutarOEncolar } from "../offline/outbox";

export type TipoDocumentoCorreo = "cotizacion" | "pedido" | "agradecimiento";

interface EnviarCorreoDocumentoParams {
  tipo: TipoDocumentoCorreo;
  folio: string;
  cliente?: string;
  empresa?: string | null;
  destinatario: string;
  pdfBlob: Blob;
  nombreArchivo: string;
  /** Módulo dueño de este envío (ej. "expo") — ver `OutboxEntry.modulo`. */
  modulo?: string;
}

// Convierte un Blob a base64 puro (sin el prefijo "data:application/pdf;base64,")
function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result as string;
      const base64 = resultado.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const ETIQUETA_TIPO_CORREO: Record<TipoDocumentoCorreo, string> = {
  cotizacion: "de la cotización",
  pedido: "del pedido",
  agradecimiento: "de agradecimiento",
};

export async function enviarCorreoDocumento(params: EnviarCorreoDocumentoParams): Promise<void> {
  const pdfBase64 = await blobABase64(params.pdfBlob);

  const payload = {
    tipo: params.tipo,
    folio: params.folio,
    cliente: params.cliente || "",
    empresa: params.empresa ?? null,
    destinatario: params.destinatario,
    pdfBase64,
    nombreArchivo: params.nombreArchivo,
  };

  const destinoCorreo = params.cliente ? ` para "${params.cliente}"` : "";
  const notificacionExito =
    `El correo ${ETIQUETA_TIPO_CORREO[params.tipo]}${destinoCorreo} (folio ${params.folio}) se envió correctamente.`;

  return ejecutarOEncolar(
    "post",
    "/correos/documento",
    payload,
    `Correo (${params.tipo}) — folio ${params.folio}`,
    async () => {
      await api.post("/correos/documento", payload);
    },
    params.modulo,
    notificacionExito
  );
}