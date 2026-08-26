// scripts/sincronizar-pdfjs.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Copia a public/pdfjs/ los archivos de pdfjs-dist que el visor de PDF necesita
// servir tal cual:
//
//   • pdf.worker.min.mjs  — el worker que hace el trabajo pesado.
//   • standard_fonts/     — las 14 fuentes base de PDF (Helvetica, Times…), que
//                           los PDFs de jsPDF no traen embebidas.
//
// ¿Por qué en public/ y no importándolos desde node_modules? Porque en
// desarrollo Vite transforma cualquier módulo que sirva desde node_modules y le
// inyecta su cliente de HMR (`import ... from "/@vite/client"`). Dentro de un
// Web Worker ese import revienta, el worker muere sin avisar y pdf.js se queda
// esperando para siempre: el visor abre la página en blanco y no da error.
// Los archivos de public/ se sirven byte a byte, sin tocarlos.
//
// Corre solo en `npm install` (postinstall), así que al actualizar pdfjs-dist
// las copias se refrescan sin que nadie tenga que acordarse.
// ─────────────────────────────────────────────────────────────────────────────

import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "node_modules", "pdfjs-dist");
const destino = join(raiz, "public", "pdfjs");

if (!existsSync(origen)) {
  console.log("pdfjs-dist no está instalado todavía — nada que sincronizar.");
  process.exit(0);
}

await mkdir(destino, { recursive: true });

await cp(
  join(origen, "build", "pdf.worker.min.mjs"),
  join(destino, "pdf.worker.min.mjs")
);

// Se rehace la carpeta para no dejar fuentes viejas si cambia el juego.
await rm(join(destino, "standard_fonts"), { recursive: true, force: true });
await cp(join(origen, "standard_fonts"), join(destino, "standard_fonts"), {
  recursive: true,
});

console.log("pdf.js sincronizado en public/pdfjs/");
