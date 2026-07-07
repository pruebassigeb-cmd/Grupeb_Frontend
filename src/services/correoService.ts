import api from "./api";

export type TipoDocumentoCorreo = "cotizacion" | "pedido" | "agradecimiento";

interface EnviarCorreoDocumentoParams {
  tipo: TipoDocumentoCorreo;
  folio: string;
  cliente?: string;
  empresa?: string | null;
  destinatario: string;
  pdfBlob: Blob;
  nombreArchivo: string;
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

export async function enviarCorreoDocumento(params: EnviarCorreoDocumentoParams): Promise<void> {
  const pdfBase64 = await blobABase64(params.pdfBlob);

  await api.post("/correos/documento", {
    tipo: params.tipo,
    folio: params.folio,
    cliente: params.cliente || "",
    empresa: params.empresa ?? null,
    destinatario: params.destinatario,
    pdfBase64,
    nombreArchivo: params.nombreArchivo,
  });
}