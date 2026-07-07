import { useState } from "react";
import { enviarCorreoDocumento, type TipoDocumentoCorreo } from "../services/correoService";

interface DatosDocumento {
  tipo: TipoDocumentoCorreo;
  folio: string;
  cliente?: string;
  empresa?: string | null;
  correoDefault?: string | null;
}

// paraImprimir puede no regresar nada (ej. generarPdfCotizacionExpo, que solo
// hace doc.save() internamente) — no necesitamos su blob para nada.
// paraCorreo SIEMPRE debe regresar el Blob que se adjunta al correo.
type GenerarParaImprimir = () => Promise<void> | void;
type GenerarParaCorreo = () => Promise<Blob>;

interface Generadores {
  paraImprimir?: GenerarParaImprimir;
  paraCorreo?: GenerarParaCorreo;
}

export function useEnvioDocumentoPdf() {
  const [modalCorreoAbierto, setModalCorreoAbierto] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [contextoPendiente, setContextoPendiente] = useState<{
    generadores: Generadores;
    datos: DatosDocumento;
  } | null>(null);

  const ejecutar = async (
    generadores: Generadores,
    datos: DatosDocumento,
    opciones: { imprimir: boolean; correo: boolean }
  ) => {
    const { imprimir, correo } = opciones;

    if (imprimir && generadores.paraImprimir) {
      await generadores.paraImprimir();
    }

    if (correo) {
      setContextoPendiente({ generadores, datos });
      setModalCorreoAbierto(true);
    }
  };

  const confirmarEnvioCorreo = async (correoDestino: string) => {
    if (!contextoPendiente?.generadores.paraCorreo) return;
    const { generadores, datos } = contextoPendiente;

    setEnviandoCorreo(true);
    try {
      const blob = await generadores.paraCorreo();
      const nombreArchivo = `${datos.tipo === "pedido" ? "Pedido" : "Cotizacion"}_${datos.folio}.pdf`;

      await enviarCorreoDocumento({
        tipo: datos.tipo,
        folio: datos.folio,
        cliente: datos.cliente,
        empresa: datos.empresa,
        destinatario: correoDestino,
        pdfBlob: blob,
        nombreArchivo,
      });

      setModalCorreoAbierto(false);
      setContextoPendiente(null);
    } catch (e: any) {
      console.error("❌ Error al enviar correo:", e);
      alert(e?.response?.data?.error || "No se pudo enviar el correo.");
    } finally {
      setEnviandoCorreo(false);
    }
  };

  const cancelarEnvioCorreo = () => {
    if (enviandoCorreo) return;
    setModalCorreoAbierto(false);
    setContextoPendiente(null);
  };

  return {
    ejecutar,
    modalCorreoAbierto,
    enviandoCorreo,
    correoDefault: contextoPendiente?.datos.correoDefault || "",
    nombreDocumentoModal: contextoPendiente?.datos.folio || "",
    confirmarEnvioCorreo,
    cancelarEnvioCorreo,
  };
}