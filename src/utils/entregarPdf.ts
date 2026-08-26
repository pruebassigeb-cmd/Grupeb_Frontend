// src/utils/entregarPdf.ts
// ─────────────────────────────────────────────────────────────────────────────
// Punto único por donde sale TODO PDF generado en el frontend.
//
// Antes cada generador terminaba con `doc.save(nombre)`, que dispara la
// descarga nativa del navegador. En las laptops y tabletas que están en modo
// kiosko eso es un callejón sin salida: según el equipo, la descarga abre el
// visor del sistema o una pestaña que el usuario ya no puede cerrar porque el
// kiosko esconde la barra del navegador.
//
// `entregarPdf` hace lo mismo que antes (descargar el archivo) y además
// pregunta si se quiere ver el documento en el visor interno — ver
// components/visor/. Sustituir `doc.save(nombre)` por `entregarPdf(doc, nombre)`
// es todo lo que hay que hacer en cada generador: cualquier botón que ya
// generaba un PDF hereda la pregunta sin tocar la pantalla.
// ─────────────────────────────────────────────────────────────────────────────

import type jsPDF from "jspdf";
import { preguntarAbrirVisorPdf } from "../components/visor/visorPdfGlobal";

// En los equipos de kiosko la descarga no sirve de nada (nadie va a abrir el
// explorador de archivos) y encima puede sacar el diálogo "guardar como" del
// sistema, que roba el foco — el mismo problema que documenta
// utils/descargasActivas.ts. Con esta bandera en localStorage el PDF solo se
// muestra en el visor:
//
//   localStorage.setItem("sigeb_kiosko", "1")   // en el equipo de planta
//
// Sin la bandera (lo normal en las computadoras de oficina) todo se comporta
// igual que siempre y además se ofrece el visor.
const CLAVE_KIOSKO = "sigeb_kiosko";

export function esModoKiosko(): boolean {
  try {
    return localStorage.getItem(CLAVE_KIOSKO) === "1";
  } catch {
    return false;
  }
}

export interface OpcionesEntregaPdf {
  /**
   * Descargar el archivo además de ofrecer el visor.
   * Por omisión: sí, salvo en modo kiosko.
   */
  descargar?: boolean;
  /** No preguntar por el visor (p. ej. PDFs que solo se suben a S3). */
  sinVisor?: boolean;
  /** Mensaje del diálogo. Útil para distinguir el tipo de documento. */
  mensaje?: string;
  /** Habilita el botón de correo dentro del visor. */
  onEnviarCorreo?: () => void;
}

/**
 * Entrega un PDF al usuario: lo descarga (si aplica) y le ofrece abrirlo en el
 * visor interno. Devuelve el Blob por si el llamador todavía lo necesita
 * (subirlo a S3, mandarlo por correo…), así no se genera dos veces.
 */
export function entregarPdf(
  fuente: jsPDF | Blob,
  nombre: string,
  opciones: OpcionesEntregaPdf = {}
): Blob {
  const blob =
    fuente instanceof Blob ? fuente : (fuente.output("blob") as Blob);

  const debeDescargar = opciones.descargar ?? !esModoKiosko();
  if (debeDescargar) descargarBlob(blob, nombre);

  if (!opciones.sinVisor) {
    preguntarAbrirVisorPdf(
      { blob, nombre, onEnviarCorreo: opciones.onEnviarCorreo },
      opciones.mensaje ??
        (debeDescargar
          ? "El documento se generó y se descargó."
          : "El documento se generó correctamente.")
    );
  }

  return blob;
}

/** Descarga un Blob con el nombre indicado, sin abrir pestañas. */
export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  // Se libera tarde: si se revoca de inmediato, algunos navegadores cancelan la
  // descarga que apenas iba arrancando.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
