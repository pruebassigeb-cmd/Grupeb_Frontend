// src/components/visor/VisorPdf.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Visor de PDF *dentro* de la aplicación.
//
// Motivo: varias laptops y tabletas de planta corren en modo kiosko. Ahí el
// navegador no tiene barra de pestañas, así que todo lo que abría el PDF en una
// ventana nueva (`window.open`, la descarga nativa de `doc.save()` o el visor
// del sistema en Android) dejaba al usuario atrapado en una pantalla que no
// podía cerrar. Este componente dibuja el PDF con pdf.js sobre canvas, sin
// salir del DOM de la app: siempre hay un botón de cerrar que lo devuelve a
// donde estaba.
//
// Por qué canvas y no un <iframe src="...pdf">: en táctil el navegador dibuja
// su propio "chrome" nativo encima del iframe (botón de abrir en app externa,
// barra de controles) — el mismo problema que ya está documentado en
// GestorArchivos.tsx para las miniaturas. Con canvas el render es idéntico en
// laptop y en tableta y nada nos saca de la app.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

// El worker y las fuentes se sirven desde public/pdfjs/ (los copia ahí
// scripts/sincronizar-pdfjs.mjs en cada `npm install`). NO se importan desde
// node_modules a propósito: en desarrollo Vite le inyecta su cliente de HMR a
// todo módulo que sirve desde ahí, y ese `import "/@vite/client"` dentro de un
// Web Worker lo mata sin lanzar error — pdf.js se queda esperando y el visor
// abre la página en blanco. Desde public/ los archivos salen intactos.
//
// Al vivir en public/ también entran al precache de Workbox (ver
// vite.config.ts), así que el visor funciona sin conexión como el resto de la
// PWA, sin depender de ningún CDN.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

// Las 14 fuentes base de PDF (Helvetica, Times, Courier…) no vienen embebidas
// en los PDFs que genera jsPDF; sin sus sustitutos pdf.js no dibuja el texto.
const RUTA_FUENTES_ESTANDAR = "/pdfjs/standard_fonts/";

// Límites de zoom. El máximo es conservador a propósito: cada página se
// redibuja a resolución completa y en una tableta modesta un canvas enorme
// tumba la pestaña.
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_PASO = 0.25;

export type OrigenPdf =
  | { tipo: "blob"; blob: Blob }
  | { tipo: "url"; url: string };

export interface VisorPdfProps {
  origen: OrigenPdf;
  /** Nombre que se muestra en la barra y con el que se descarga. */
  nombre: string;
  onCerrar: () => void;
  /** Si se pasa, aparece el botón de correo en la barra. */
  onEnviarCorreo?: () => void;
  /** Oculta el botón de descargar (equipos de kiosko sin disco propio). */
  ocultarDescargar?: boolean;
}

export default function VisorPdf({
  origen,
  nombre,
  onCerrar,
  onEnviarCorreo,
  ocultarDescargar = false,
}: VisorPdfProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [blob, setBlob] = useState<Blob | null>(
    origen.tipo === "blob" ? origen.blob : null
  );
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [anchoDisponible, setAnchoDisponible] = useState(0);
  const [intento, setIntento] = useState(0);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const paginasRef = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── Carga del documento ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    // En pdf.js v6 el `destroy()` vive en la tarea de carga, no en el
    // documento: es la que cierra el worker y libera la memoria del PDF.
    let tarea: ReturnType<typeof pdfjsLib.getDocument> | null = null;

    (async () => {
      setCargando(true);
      setError(null);
      try {
        // Siempre trabajamos contra un Blob local: así los botones de descargar
        // e imprimir no vuelven a pedir el archivo a la red, y el PDF se puede
        // seguir leyendo aunque la conexión se caiga a media lectura (pasa
        // seguido con el wifi de planta).
        let datos: Blob;
        if (origen.tipo === "blob") {
          datos = origen.blob;
        } else {
          const respuesta = await fetch(origen.url);
          if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
          datos = await respuesta.blob();
        }
        if (cancelado) return;
        setBlob(datos);

        // pdf.js se queda con el ArrayBuffer (lo transfiere al worker), por eso
        // se le entrega una copia y conservamos el Blob original intacto.
        const buffer = await datos.arrayBuffer();
        if (cancelado) return;

        tarea = pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          standardFontDataUrl: RUTA_FUENTES_ESTANDAR,
        });
        const documento = await tarea.promise;
        if (cancelado) return; // el cleanup ya se encarga de destruir la tarea
        setDoc(documento);
        setPaginaActual(1);
      } catch (e) {
        if (cancelado) return;
        const detalle = e instanceof Error ? e.message : String(e);
        // Un TypeError en el fetch de una URL externa casi siempre es CORS o
        // falta de red — se nombra explícito para que sea diagnosticable desde
        // planta sin abrir la consola del navegador.
        const pareceCors = origen.tipo === "url" && e instanceof TypeError;
        setError(
          pareceCors
            ? "No se pudo leer el archivo desde el almacenamiento. Puede ser falta de conexión o que el bucket no permita leerlo desde la aplicación (CORS)."
            : origen.tipo === "url"
              ? `No se pudo descargar el documento (${detalle}). Revisa la conexión e inténtalo de nuevo.`
              : `El archivo no se pudo abrir (${detalle}).`
        );
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
      tarea?.destroy();
    };
    // `intento` permite reintentar la descarga sin desmontar el visor.
  }, [origen, intento]);

  // ── Ancho disponible (para "ajustar al ancho") ────────────────────────────
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const medir = () => setAnchoDisponible(el.clientWidth);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  // ── Bloqueo del scroll de fondo + Escape para cerrar ──────────────────────
  useEffect(() => {
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [onCerrar]);

  // ── Zoom con pellizco (tableta) y Ctrl+rueda (laptop) ─────────────────────
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;

    let distanciaInicial = 0;
    let zoomInicial = 1;

    const distancia = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const alTocar = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      distanciaInicial = distancia(e.touches);
      zoomInicial = zoom;
    };
    const alMover = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !distanciaInicial) return;
      e.preventDefault(); // si no, el navegador hace zoom de toda la página
      setZoom(acotarZoom((distancia(e.touches) / distanciaInicial) * zoomInicial));
    };
    const alSoltar = () => {
      distanciaInicial = 0;
    };
    const alRodar = (e: WheelEvent) => {
      if (!e.ctrlKey) return; // el pellizco de trackpad llega como Ctrl+wheel
      e.preventDefault();
      setZoom((z) => acotarZoom(z - e.deltaY * 0.005));
    };

    el.addEventListener("touchstart", alTocar, { passive: true });
    el.addEventListener("touchmove", alMover, { passive: false });
    el.addEventListener("touchend", alSoltar, { passive: true });
    el.addEventListener("wheel", alRodar, { passive: false });
    return () => {
      el.removeEventListener("touchstart", alTocar);
      el.removeEventListener("touchmove", alMover);
      el.removeEventListener("touchend", alSoltar);
      el.removeEventListener("wheel", alRodar);
    };
  }, [zoom]);

  // ── Página visible: alimenta el contador de la barra ──────────────────────
  const registrarPagina = useCallback(
    (numero: number, el: HTMLDivElement | null) => {
      if (el) paginasRef.current.set(numero, el);
      else paginasRef.current.delete(numero);
    },
    []
  );

  useEffect(() => {
    if (!doc) return;
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const visibilidad = new Map<number, number>();
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const numero = Number(
            (entrada.target as HTMLElement).dataset.pagina ?? 0
          );
          if (numero) visibilidad.set(numero, entrada.intersectionRatio);
        }
        // Gana la página con mayor superficie visible; con zoom bajo puede
        // haber tres páginas a la vez en pantalla.
        let mejorNumero = 0;
        let mejorRatio = 0;
        for (const [numero, ratio] of visibilidad) {
          if (ratio > mejorRatio) {
            mejorRatio = ratio;
            mejorNumero = numero;
          }
        }
        if (mejorNumero) setPaginaActual(mejorNumero);
      },
      { root: contenedor, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    // Las páginas se montan en el mismo commit que este efecto, así que ya
    // están en el mapa cuando esto corre.
    for (const el of paginasRef.current.values()) obs.observe(el);
    return () => obs.disconnect();
  }, [doc]);

  const irAPagina = (numero: number) => {
    if (!doc) return;
    const destino = Math.min(Math.max(numero, 1), doc.numPages);
    paginasRef.current
      .get(destino)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPaginaActual(destino);
  };

  // ── Acciones de la barra ──────────────────────────────────────────────────
  const descargar = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const imprimir = () => {
    if (!blob) return;
    // Se imprime desde un iframe oculto con el blob: el diálogo de impresión es
    // el del navegador y no se abre ninguna pestaña, así que el kiosko sigue
    // intacto.
    const url = URL.createObjectURL(blob);
    const marco = document.createElement("iframe");
    marco.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    marco.src = url;
    marco.onload = () => {
      try {
        marco.contentWindow?.focus();
        marco.contentWindow?.print();
      } catch {
        // Algunos WebView de Android no exponen print() dentro del iframe; ahí
        // lo razonable es dejar que el usuario descargue y use el diálogo del
        // sistema.
        descargar();
      }
      setTimeout(() => {
        marco.remove();
        URL.revokeObjectURL(url);
      }, 60_000);
    };
    document.body.appendChild(marco);
  };

  // Ancho de página al 100 %: el del contenedor menos el respiro lateral, con
  // un tope para que en monitores grandes el PDF no quede gigante.
  const anchoBase =
    anchoDisponible > 0 ? Math.min(anchoDisponible - 32, 1100) : 0;

  return (
    <div className="fixed inset-0 z-[10050] flex flex-col bg-[#1f1f23]">
      {/* ── Barra superior ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#17171a] border-b border-gray-700/60 shadow-lg">
        <svg className="w-5 h-5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p className="flex-1 min-w-0 truncate text-sm font-medium text-gray-200 mr-2" title={nombre}>
          {nombre}
        </p>

        {doc && (
          <div className="hidden sm:flex items-center gap-1">
            <BotonBarra titulo="Página anterior" onClick={() => irAPagina(paginaActual - 1)} deshabilitado={paginaActual <= 1}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15.5l7-7 7 7" />
              </svg>
            </BotonBarra>
            <span className="px-1 text-xs font-medium text-gray-300 tabular-nums whitespace-nowrap">
              {paginaActual} / {doc.numPages}
            </span>
            <BotonBarra titulo="Página siguiente" onClick={() => irAPagina(paginaActual + 1)} deshabilitado={paginaActual >= doc.numPages}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 8.5l-7 7-7-7" />
              </svg>
            </BotonBarra>

            <span className="w-px h-6 bg-gray-700 mx-1" />

            <BotonBarra titulo="Alejar" onClick={() => setZoom((z) => acotarZoom(z - ZOOM_PASO))} deshabilitado={zoom <= ZOOM_MIN}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM8 10h6" />
              </svg>
            </BotonBarra>
            {/* Misma altura que los botones de ícono (36px) para que la fila
                quede pareja, y ancho mínimo para que la barra no brinque al
                pasar de "100%" a "87%". */}
            <button onClick={() => setZoom(1)} title="Ajustar al ancho"
              className="inline-flex items-center justify-center h-9 min-w-[3.25rem] px-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors tabular-nums">
              {Math.round(zoom * 100)}%
            </button>
            <BotonBarra titulo="Acercar" onClick={() => setZoom((z) => acotarZoom(z + ZOOM_PASO))} deshabilitado={zoom >= ZOOM_MAX}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM11 7v6M8 10h6" />
              </svg>
            </BotonBarra>

            <span className="w-px h-6 bg-gray-700 mx-1" />
          </div>
        )}

        <BotonBarra titulo="Imprimir" onClick={imprimir} deshabilitado={!blob}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </BotonBarra>

        {onEnviarCorreo && (
          <BotonBarra titulo="Enviar por correo" onClick={onEnviarCorreo}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </BotonBarra>
        )}

        {!ocultarDescargar && (
          <BotonBarra titulo="Descargar" onClick={descargar} deshabilitado={!blob}>
            {/* El dibujo ocupa 3..21 igual que la lupa y la impresora. El path
                anterior solo llegaba a 4..20, y ese 11% de diferencia se veía
                como un ícono más chico y desalineado con los de al lado. */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </BotonBarra>
        )}

        <button onClick={onCerrar} title="Cerrar"
          className="ml-1 flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-200 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="hidden sm:inline">Cerrar</span>
        </button>
      </div>

      {/* ── Lienzo ─────────────────────────────────────────────────────── */}
      <div ref={contenedorRef} className="flex-1 overflow-auto bg-[#2a2a30] px-4 py-4">
        {cargando && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="w-10 h-10 border-4 border-gray-600 border-t-gray-200 rounded-full animate-spin" />
            <p className="text-sm">Abriendo documento…</p>
          </div>
        )}

        {error && !cargando && (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="max-w-md text-sm text-gray-300">{error}</p>
            <div className="flex gap-3">
              <button onClick={() => setIntento((n) => n + 1)}
                className="px-4 py-2 text-sm font-semibold text-[#1a1a1a] bg-[#b2c8f8] hover:bg-[#a1b8e8] rounded-lg transition-colors">
                Reintentar
              </button>
              <button onClick={onCerrar}
                className="px-4 py-2 text-sm font-semibold text-gray-300 bg-[#1f1f23] hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        )}

        {doc && !error && anchoBase > 0 && (
          <div className="flex flex-col items-center gap-4">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PaginaPdf
                key={i + 1}
                doc={doc}
                numero={i + 1}
                anchoObjetivo={Math.floor(anchoBase * zoom)}
                contenedor={contenedorRef.current}
                registrar={registrarPagina}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Barra inferior: en táctil los controles quedan al alcance del pulgar ── */}
      {doc && !error && (
        <div className="sm:hidden flex items-center justify-center gap-1 px-3 py-2 bg-[#17171a] border-t border-gray-700/60">
          <BotonBarra titulo="Página anterior" onClick={() => irAPagina(paginaActual - 1)} deshabilitado={paginaActual <= 1}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 19l-7-7 7-7" />
            </svg>
          </BotonBarra>
          <span className="px-2 text-sm font-medium text-gray-300 tabular-nums">
            {paginaActual} / {doc.numPages}
          </span>
          <BotonBarra titulo="Página siguiente" onClick={() => irAPagina(paginaActual + 1)} deshabilitado={paginaActual >= doc.numPages}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.5 5l7 7-7 7" />
            </svg>
          </BotonBarra>
          <span className="w-px h-7 bg-gray-700 mx-1" />
          <BotonBarra titulo="Alejar" onClick={() => setZoom((z) => acotarZoom(z - ZOOM_PASO))} deshabilitado={zoom <= ZOOM_MIN}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM8 10h6" />
            </svg>
          </BotonBarra>
          <button onClick={() => setZoom(1)} title="Ajustar al ancho"
            className="inline-flex items-center justify-center h-10 min-w-[3.5rem] px-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors tabular-nums">
            {Math.round(zoom * 100)}%
          </button>
          <BotonBarra titulo="Acercar" onClick={() => setZoom((z) => acotarZoom(z + ZOOM_PASO))} deshabilitado={zoom >= ZOOM_MAX}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM11 7v6M8 10h6" />
            </svg>
          </BotonBarra>
        </div>
      )}
    </div>
  );
}

function acotarZoom(z: number) {
  return Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX);
}

// ── Botón de la barra ───────────────────────────────────────────────────────
// Área de toque de 36-40px: en tableta los íconos sueltos de 20px se fallan.
//
// El `inline-flex items-center justify-center` centra el ícono sin depender del
// reset de Tailwind (su Preflight pone los <svg> en display:block; si eso
// cambiara, un svg en línea se apoyaría en la línea base y quedaría unos 5px
// arriba del centro del botón).
//
// Ojo con los íconos que se pongan aquí: además de centrados, el trazo debe
// ocupar lo mismo dentro del viewBox de 24 — el juego de esta barra dibuja de
// 3 a 21. Un path que solo llegue a 4..20 se ve más chico y desalineado aunque
// esté perfectamente centrado.
function BotonBarra({
  titulo,
  onClick,
  deshabilitado = false,
  children,
}: {
  titulo: string;
  onClick: () => void;
  deshabilitado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      disabled={deshabilitado}
      className="inline-flex items-center justify-center p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

// ── Una página ──────────────────────────────────────────────────────────────
// Cada página se dibuja solo cuando se acerca al viewport. Sin esto, una orden
// de producción de 40 páginas dibujaría 40 canvas de golpe al abrir el visor y
// la tableta se queda congelada varios segundos.
function PaginaPdf({
  doc,
  numero,
  anchoObjetivo,
  contenedor,
  registrar,
}: {
  doc: PDFDocumentProxy;
  numero: number;
  anchoObjetivo: number;
  contenedor: HTMLDivElement | null;
  registrar: (numero: number, el: HTMLDivElement | null) => void;
}) {
  const contenedorPaginaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tareaRef = useRef<ReturnType<PDFPageRender> | null>(null);
  // Cola de dibujos de esta página y número de generación del más reciente.
  const cadenaRef = useRef<Promise<void>>(Promise.resolve());
  const generacionRef = useRef(0);
  const [visible, setVisible] = useState(numero === 1);
  const [medidas, setMedidas] = useState<{ ancho: number; alto: number } | null>(null);

  useEffect(() => {
    registrar(numero, contenedorPaginaRef.current);
    return () => registrar(numero, null);
  }, [numero, registrar]);

  // Medidas reales de la página antes de dibujarla: mantienen el scroll estable
  // (si todas las páginas midieran 0 hasta renderizarse, la barra de scroll
  // daría saltos al ir bajando).
  useEffect(() => {
    let cancelado = false;
    doc.getPage(numero).then((pagina) => {
      if (cancelado) return;
      const vista = pagina.getViewport({ scale: 1 });
      setMedidas({ ancho: vista.width, alto: vista.height });
    });
    return () => {
      cancelado = true;
    };
  }, [doc, numero]);

  useEffect(() => {
    if (visible) return;
    const el = contenedorPaginaRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { root: contenedor, rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, contenedor]);

  // pdf.js aborta con "Cannot use the same canvas during multiple render()
  // operations" si dos dibujos coinciden sobre el mismo canvas, y el canvas se
  // queda en blanco. Pasa más seguido de lo que parece: al abrir el visor React
  // corre el efecto dos veces en desarrollo (StrictMode), y en producción basta
  // con que el zoom cambie mientras la página se está dibujando.
  //
  // Por eso los dibujos se encadenan: cada uno espera a que el anterior termine
  // de abortarse, y solo el más reciente llega a pintar (los intermedios se
  // saltan comparando el número de generación).
  useEffect(() => {
    if (!visible || !medidas) return;
    const miGeneracion = ++generacionRef.current;
    let cancelado = false;

    cadenaRef.current = cadenaRef.current.then(async () => {
      if (cancelado || miGeneracion !== generacionRef.current) return;

      const pagina = await doc.getPage(numero).catch(() => null);
      if (!pagina || cancelado) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const vista = pagina.getViewport({ scale: anchoObjetivo / medidas.ancho });
      // El DPR se topa en 2: arriba de eso el canvas pesa el doble y la
      // diferencia ya no se aprecia en pantallas de tableta.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(vista.width * dpr);
      canvas.height = Math.floor(vista.height * dpr);
      canvas.style.width = `${Math.floor(vista.width)}px`;
      canvas.style.height = `${Math.floor(vista.height)}px`;

      // El escalado por DPR va como `transform` del render y no tocando el
      // contexto: pdf.js reinicia la matriz del canvas antes de dibujar, así
      // que un setTransform previo se pierde y la página sale en blanco.
      const tarea = pagina.render({
        canvas,
        viewport: vista,
        transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
      });
      tareaRef.current = tarea;
      try {
        await tarea.promise;
      } catch (e) {
        // Render cancelado (cambio de zoom o cierre del visor): no es un error.
        if (!(e instanceof Error) || e.name !== "RenderingCancelledException") {
          console.error("Visor PDF — error al dibujar la página", numero, e);
        }
      } finally {
        if (tareaRef.current === tarea) tareaRef.current = null;
      }
    });

    return () => {
      cancelado = true;
      tareaRef.current?.cancel();
    };
  }, [doc, numero, visible, medidas, anchoObjetivo]);

  const altoTentativo = medidas
    ? (anchoObjetivo / medidas.ancho) * medidas.alto
    : anchoObjetivo * 1.4;

  return (
    <div
      ref={contenedorPaginaRef}
      data-pagina={numero}
      className="bg-white shadow-xl rounded-sm overflow-hidden flex-shrink-0"
      style={{ width: anchoObjetivo, height: altoTentativo }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

// El tipo de la tarea de render no se exporta en la raíz del paquete; se toma
// de la firma del propio método para no depender de rutas internas de pdfjs.
type PDFPageRender = PDFDocumentProxy extends unknown
  ? Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]
  : never;
