// src/components/visor/VisorPdfHost.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Contenedor único del visor de PDF. Se monta una sola vez en App.tsx y escucha
// el canal de visorPdfGlobal.ts, así que cualquier parte de la app puede abrir
// un documento sin pasar props.
//
// El componente pesado (pdf.js) se carga con `lazy`: el bundle inicial no
// crece, pdfjs baja la primera vez que alguien abre un documento.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, lazy, useEffect, useState } from "react";
import type { OrigenPdf } from "./VisorPdf";
import {
  conectarVisorPdf,
  tomarPendienteVisorPdf,
  type EstadoVisor,
} from "./visorPdfGlobal";

const VisorPdf = lazy(() => import("./VisorPdf"));

export default function VisorPdfHost() {
  const [estado, setEstado] = useState<EstadoVisor | null>(
    tomarPendienteVisorPdf
  );

  useEffect(() => conectarVisorPdf(setEstado), []);

  if (!estado) return null;

  if (estado.modo === "pregunta") {
    return (
      <DialogoAbrirVisor
        nombre={estado.opciones.nombre}
        mensaje={estado.mensaje ?? ""}
        onVer={() => setEstado({ modo: "visor", opciones: estado.opciones })}
        onCerrar={() => setEstado(null)}
      />
    );
  }

  const { blob, url, nombre, onEnviarCorreo, ocultarDescargar } = estado.opciones;
  const origen: OrigenPdf | null = blob
    ? { tipo: "blob", blob }
    : url
      ? { tipo: "url", url }
      : null;
  if (!origen) return null;

  return (
    <Suspense fallback={<PantallaCargando onCerrar={() => setEstado(null)} />}>
      <VisorPdf
        origen={origen}
        nombre={nombre}
        onEnviarCorreo={onEnviarCorreo}
        ocultarDescargar={ocultarDescargar}
        onCerrar={() => setEstado(null)}
      />
    </Suspense>
  );
}

// Se muestra mientras baja el chunk de pdf.js (solo la primera vez).
function PantallaCargando({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-[10050] flex flex-col items-center justify-center gap-4 bg-[#1f1f23]">
      <div className="w-10 h-10 border-4 border-gray-600 border-t-gray-200 rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Preparando el visor…</p>
      <button
        onClick={onCerrar}
        className="px-4 py-2 text-sm font-semibold text-gray-300 bg-[#2a2a30] hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}

// ── Diálogo "¿quieres verlo?" ───────────────────────────────────────────────
// Mismo lenguaje visual que CustomConfirm, pero con etiquetas explícitas: en
// planta "Aceptar / Cancelar" no dice qué va a pasar.
function DialogoAbrirVisor({
  nombre,
  mensaje,
  onVer,
  onCerrar,
}: {
  nombre: string;
  mensaje: string;
  onVer: () => void;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      if (e.key === "Enter") onVer();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onVer, onCerrar]);

  return (
    <div className="fixed inset-0 z-[10040] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1f1f23] text-gray-100 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700/50">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 mt-0.5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed text-gray-200 font-medium">{mensaje}</p>
            <p className="mt-1 text-xs text-gray-400 break-words">{nombre}</p>
            <p className="mt-3 text-sm text-gray-300">¿Quieres abrirlo en el visor?</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCerrar}
            className="px-5 py-2.5 text-sm font-semibold text-gray-300 hover:text-white bg-[#2a2a30] hover:bg-gray-700 rounded-lg transition-all border border-gray-600 focus:ring-2 focus:ring-gray-500 focus:outline-none"
          >
            Ahora no
          </button>
          <button
            autoFocus
            onClick={onVer}
            className="px-5 py-2.5 text-sm font-semibold text-[#1a1a1a] bg-[#b2c8f8] hover:bg-[#a1b8e8] rounded-lg transition-all focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            Ver documento
          </button>
        </div>
      </div>
    </div>
  );
}
