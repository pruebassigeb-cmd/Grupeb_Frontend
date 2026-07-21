import { registrarManejadorOutbox } from "./outbox";
import api from "../services/api";
import { getCotizacionesExpo } from "../services/expo/expoService";
import { enviarCorreoDocumento } from "../services/correoService";
import { generarPdfCotizacion } from "../services/generarPdfCotizacion";
import { construirPayloadPdfCotizacionDesdeBackData } from "../utils/expo/construirPayloadPdfCotizacionExpo";
import { notificarMensajeExito } from "../pwa/notificacionesLocales";

export interface DatosCotizacionExpoConCorreo {
  payloadCotizacion: { clienteId: number; productos: unknown[]; comentarios?: string };
  correo: {
    destinatario: string;
    cliente: string;
    empresa?: string | null;
  } | null;
}

/**
 * Se importa una sola vez desde `App.tsx` (efecto de carga del módulo, no
 * depende de estar en /expo) para registrar el manejador de la tarea
 * compuesta "crear cotización Expo + mandarla por correo una vez que tenga
 * folio real". Ver docs/pwa-plan.md — nació porque `crearCotizacionExpo`
 * no puede generar el PDF/correo sin conexión (no hay folio todavía), pero
 * el usuario sí quiere que el correo se mande solo cuando sincronice.
 */
registrarManejadorOutbox("cotizacion-expo-con-correo", async (data) => {
  const { payloadCotizacion, correo } = data as DatosCotizacionExpoConCorreo;

  const { data: resultado } = await api.post("/expo/cotizaciones", payloadCotizacion);
  const noCotizacion: string = resultado.no_cotizacion;

  // Notificación propia (no vía `OutboxEntry.notificacionExito` genérico):
  // este manejador ya conoce el folio real y si el correo se pidió/logró,
  // algo que el mecanismo genérico no puede saber de antemano al encolar.
  void notificarMensajeExito(
    correo?.cliente
      ? `Se generó la cotización ${noCotizacion} para "${correo.cliente}".`
      : `Se generó la cotización ${noCotizacion}.`
  );

  if (!correo) return;

  try {
    const cotizaciones = await getCotizacionesExpo();
    const backDataFresco = cotizaciones.find((c) => c.no_cotizacion === noCotizacion);
    if (!backDataFresco) {
      console.error(
        "No se encontró la cotización recién sincronizada para mandar el correo:",
        noCotizacion
      );
      return;
    }

    const payloadPdf = await construirPayloadPdfCotizacionDesdeBackData(
      backDataFresco,
      noCotizacion,
      new Date().toISOString()
    );
    const blob = await generarPdfCotizacion(payloadPdf as any, false, false);

    await enviarCorreoDocumento({
      tipo: "cotizacion",
      folio: noCotizacion,
      cliente: correo.cliente,
      empresa: correo.empresa,
      destinatario: correo.destinatario,
      pdfBlob: blob,
      nombreArchivo: `Cotizacion_${noCotizacion}.pdf`,
      modulo: "expo",
    });
    // Si `enviarCorreoDocumento` tuvo que encolarse de nuevo por red, ya
    // avisó por su cuenta (OperacionEncoladaError no se lanza aquí porque
    // no se captura como tal, pero su propio ejecutarOEncolar solo encola;
    // si llegó hasta aquí sin lanzar, es que sí se mandó ahora mismo).
    void notificarMensajeExito(`El correo de la cotización ${noCotizacion} para "${correo.cliente}" se envió correctamente.`);
  } catch (e) {
    // La cotización YA se creó — no tiene caso reintentar todo el combo por
    // esto. Si `enviarCorreoDocumento` volvió a fallar por red, ya se
    // re-encoló sola como una entrada "http" normal (se reintentará aparte,
    // y esa sí trae su propio notificacionExito para cuando le toque).
    // Si fue otro error, se deja constancia; el usuario puede reenviar el
    // documento manualmente desde la lista de cotizaciones.
    console.error("La cotización se sincronizó pero el correo de seguimiento falló:", e);
  }
});
