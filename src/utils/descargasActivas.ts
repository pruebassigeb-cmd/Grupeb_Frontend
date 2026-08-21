// Contador global (fuera de React) de descargas de PDF en curso.
//
// Generar un PDF con jsPDF puede tardar varios segundos (páginas con
// imágenes en base64) y `doc.save()` dispara la descarga nativa del
// navegador; en equipos con "Preguntar dónde guardar cada archivo"
// activado, eso abre un diálogo del sistema operativo que le quita el foco
// a la ventana y se lo devuelve al cerrarse. Páginas como Seguimiento
// escuchan "focus"/"visibilitychange" para refrescarse solas, así que ese
// blur+focus terminaba disparando una recarga completa justo mientras el
// usuario esperaba su PDF — se sentía como si la página se hubiera
// recargado sola y encima tardara.
//
// Los botones de descarga marcan aquí el inicio/fin de su operación, y
// cualquier listener de foco puede preguntar si hay una descarga en curso
// antes de decidir si vale la pena refrescar.
let activas = 0;

export function marcarDescargaIniciada(): void {
  activas++;
}

export function marcarDescargaFinalizada(): void {
  activas = Math.max(0, activas - 1);
}

export function hayDescargaEnCurso(): boolean {
  return activas > 0;
}
