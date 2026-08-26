// src/components/visor/visorPdfGlobal.ts
// ─────────────────────────────────────────────────────────────────────────────
// API imperativa del visor de PDF, en la misma línea que `showConfirm` de
// CustomConfirm.tsx: se puede llamar desde cualquier lado (servicios, utils de
// generación de PDF, botones) sin colgar estado en cada pantalla ni pasar props
// por media app.
//
//   abrirVisorPdf({ blob, nombre })            → abre el visor de una vez
//   preguntarAbrirVisorPdf({ blob, nombre })   → primero pregunta, luego abre
//
// Quien pinta todo esto es <VisorPdfHost />, montado una sola vez en App.tsx.
// Este archivo no trae JSX a propósito: así los utils de PDF (que no son
// componentes) pueden importarlo sin arrastrar el visor al bundle inicial.
// ─────────────────────────────────────────────────────────────────────────────

export interface OpcionesVisorPdf {
  /** Documento ya generado en memoria. Tiene prioridad sobre `url`. */
  blob?: Blob;
  /** Alternativa: URL del archivo (S3, backend…). Se descarga al abrir. */
  url?: string;
  nombre: string;
  /** Si se pasa, el visor muestra el botón de enviar por correo. */
  onEnviarCorreo?: () => void;
  /** Oculta el botón de descargar dentro del visor. */
  ocultarDescargar?: boolean;
}

export interface EstadoVisor {
  /** "pregunta" muestra el diálogo previo; "visor" abre el documento. */
  modo: "pregunta" | "visor";
  opciones: OpcionesVisorPdf;
  /** Encabezado del diálogo previo. */
  mensaje?: string;
}

// ── Canal entre la API y el contenedor montado ──────────────────────────────
// Se guarda un estado pendiente por si alguien llama a la API antes de que el
// contenedor termine de montarse (pasa cuando se genera un PDF justo al cargar
// una pantalla).
let publicar: ((estado: EstadoVisor | null) => void) | null = null;
let pendiente: EstadoVisor | null = null;

/** Uso interno de VisorPdfHost: engancha el contenedor al canal. */
export function conectarVisorPdf(
  fn: (estado: EstadoVisor | null) => void
): () => void {
  publicar = fn;
  if (pendiente) {
    const guardado = pendiente;
    pendiente = null;
    // En microtarea para no provocar un setState dentro del cuerpo del efecto.
    queueMicrotask(() => publicar?.(guardado));
  }
  return () => {
    if (publicar === fn) publicar = null;
  };
}

/** Uso interno de VisorPdfHost: lo pendiente al primer render, si lo hay. */
export function tomarPendienteVisorPdf(): EstadoVisor | null {
  const guardado = pendiente;
  pendiente = null;
  return guardado;
}

function enviar(estado: EstadoVisor | null) {
  if (publicar) publicar(estado);
  else pendiente = estado;
}

/** Abre el visor directamente, sin preguntar nada. */
export function abrirVisorPdf(opciones: OpcionesVisorPdf): void {
  enviar({ modo: "visor", opciones });
}

/**
 * Pregunta si se quiere ver el documento y, si el usuario acepta, lo abre.
 * Pensado para el momento en que se acaba de generar/descargar un PDF: en las
 * laptops y tabletas en modo kiosko no hay forma de abrirlo por fuera.
 */
export function preguntarAbrirVisorPdf(
  opciones: OpcionesVisorPdf,
  mensaje = "El documento se generó correctamente."
): void {
  enviar({ modo: "pregunta", opciones, mensaje });
}

/** Cierra lo que esté abierto (visor o diálogo). */
export function cerrarVisorPdf(): void {
  enviar(null);
}
