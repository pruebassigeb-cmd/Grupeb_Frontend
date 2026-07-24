import { registrarManejadorOutbox } from "./outbox";
import api from "../services/api";
import { getCotizacionesExpo } from "../services/expo/expoService";
import { enviarCorreoDocumento } from "../services/correoService";
import { generarPdfCotizacion } from "../services/generarPdfCotizacion";
import { generarPdfPedido } from "../services/generarPdfPedido";
import { construirPayloadPdfCotizacionDesdeBackData } from "../utils/expo/construirPayloadPdfCotizacionExpo";
import { construirPayloadPdfPedidoDesdeBackData } from "../utils/expo/construirPayloadPdfPedidoExpo";
import { notificarMensajeExito } from "../pwa/notificacionesLocales";

export interface DatosCotizacionExpoConCorreo {
  payloadCotizacion: { clienteId: number; productos: unknown[]; comentarios?: string };
  correo: {
    destinatario: string;
    cliente: string;
    empresa?: string | null;
  } | null;
}

export interface DatosAprobarCotizacionExpoConCorreo {
  folio: string;
  itemsAprobados: { idsolicitud_producto: number; idsolicitud_detalle: number }[];
  fecha: string;
  correo: {
    destinatario: string;
    cliente: string;
    empresa?: string | null;
  };
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

/**
 * Análogo al de arriba pero para el flujo "aprobar cotización Expo → se
 * genera el pedido → mandar el PDF de pedido por correo" (ListaCotizaciones.tsx
 * → confirmarCorreoYAprobar). No cabía en `ejecutarOEncolar` por la misma
 * razón que el de arriba: el PDF de pedido necesita el folio de PEDIDO real,
 * que no existe hasta que la aprobación sincroniza.
 */
registrarManejadorOutbox("aprobar-cotizacion-expo-con-correo", async (data) => {
  const { folio, itemsAprobados, fecha, correo } = data as DatosAprobarCotizacionExpoConCorreo;

  let noPedido: string;
  try {
    const { data: resultado } = await api.patch(`/expo/cotizaciones/${folio}/aprobar`, { itemsAprobados });
    noPedido = resultado.no_pedido;
  } catch (err) {
    // Caso real encontrado en vivo: un intento anterior sí llegó a aprobar
    // en el servidor (la transacción se comprometió), pero la respuesta
    // nunca le llegó limpia al cliente (CORS/504 intermitentes justo al
    // reconectar) — axios lo ve igual que cualquier otro fallo. En el
    // siguiente reintento, el backend responde 400 "Ya fue convertida a
    // pedido" — que normalmente `sincronizarOutbox` trata como rechazo
    // permanente y BORRA la tarea entera, perdiendo el correo del pedido
    // para siempre aunque la aprobación sí haya funcionado. Se detecta ese
    // caso específico y se recupera el folio real ya asignado en vez de
    // dejar que la tarea se descarte.
    const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status;
    const mensaje = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "";
    const yaAprobada = status === 400 && /ya fue convertida a pedido/i.test(mensaje);
    if (!yaAprobada) throw err;

    const cotizacionesExistentes = await getCotizacionesExpo();
    const yaAprobadaData = cotizacionesExistentes.find((c) => c.no_cotizacion === folio);
    if (!yaAprobadaData?.no_pedido) throw err; // no se pudo recuperar el folio — se deja el error original, se reintenta/descarta normal
    noPedido = yaAprobadaData.no_pedido;
    console.warn(
      `[outbox] "${folio}" ya estaba aprobada de un intento anterior (folio ${noPedido}) — se retoma el correo en vez de descartar la tarea.`
    );
  }

  void notificarMensajeExito(`Se aprobó la cotización ${folio} y se generó el pedido ${noPedido}.`);

  try {
    const cotizaciones = await getCotizacionesExpo();
    const backDataFresco = cotizaciones.find((c) => c.no_cotizacion === folio);
    if (!backDataFresco) {
      console.error(
        "No se encontró la cotización recién aprobada para mandar el correo del pedido:",
        folio
      );
      return;
    }

    const payloadPdf = await construirPayloadPdfPedidoDesdeBackData(backDataFresco, folio, fecha);
    const blob = await generarPdfPedido(payloadPdf as any, false, false);

    await enviarCorreoDocumento({
      tipo: "pedido",
      folio: payloadPdf.no_pedido,
      cliente: correo.cliente,
      empresa: correo.empresa,
      destinatario: correo.destinatario,
      pdfBlob: blob,
      nombreArchivo: `Pedido_${payloadPdf.no_pedido}.pdf`,
      modulo: "expo",
    });
    void notificarMensajeExito(`El correo del pedido ${payloadPdf.no_pedido} para "${correo.cliente}" se envió correctamente.`);
  } catch (e) {
    // El pedido YA se aprobó — no tiene caso reintentar todo el combo por
    // esto. Si `enviarCorreoDocumento` volvió a fallar por red, ya se
    // re-encoló sola como una entrada "http" normal (trae su propio
    // notificacionExito). Si fue otro error, se deja constancia; el usuario
    // puede reenviar el documento manualmente.
    console.error("El pedido se aprobó pero el correo de seguimiento falló:", e);
  }
});
