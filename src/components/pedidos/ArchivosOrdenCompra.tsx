// src/components/pedidos/ArchivosOrdenCompra.tsx
//
// Miniaturas + vista previa de los archivos de la Orden de Compra de un
// pedido. Reutilizado en EditarPedido.tsx, EditarPedidoPapel.tsx (con
// subida/borrado) y AnticipoLiquidacion.tsx (solo lectura — se omiten
// onSubir/onEliminar).
//
// - Imagen: miniatura real; clic abre una vista previa grande (lightbox).
// - PDF: ícono; clic lo abre en el visor interno de PDFs de la app (mismo
//   mecanismo que GestorArchivos.tsx, evita el problema de CORS con S3).
// - Mientras se sube un archivo nuevo, se muestra de inmediato una vista
//   previa local (URL.createObjectURL) con un spinner encima, antes de que
//   el backend confirme la subida.
import { useRef, useState } from "react";
import { descargarArchivoBlob } from "../../services/archivos/archivos.service";
import { abrirVisorPdf } from "../visor/visorPdfGlobal";
import { showAlert } from "../CustomAlert";
import type { ArchivoOrdenCompra } from "../../services/pedidosService";

interface Props {
  archivos: ArchivoOrdenCompra[];
  // Si no se pasa, el componente queda de solo lectura (sin botón de subir
  // ni "x" para borrar) — así se usa en Anticipo y Liquidación.
  onSubir?: (archivo: File) => void | Promise<void>;
  onEliminar?: (idArchivo: number) => void | Promise<void>;
  subiendo?: boolean;
  vacioTexto?: string;
}

export default function ArchivosOrdenCompra({
  archivos,
  onSubir,
  onEliminar,
  subiendo = false,
  vacioTexto = "Sin archivos todavía.",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [abriendoId, setAbriendoId] = useState<number | null>(null);
  const [previewImagen, setPreviewImagen] = useState<{ url: string; nombre: string } | null>(null);
  // Vista previa local mientras el archivo recién seleccionado se sube.
  const [previaLocal, setPreviaLocal] = useState<{ url: string; esImagen: boolean } | null>(null);

  const abrirArchivo = async (archivo: ArchivoOrdenCompra) => {
    if (archivo.tipo === "image") {
      setPreviewImagen({ url: archivo.url, nombre: archivo.nombre });
      return;
    }
    if (archivo.tipo === "pdf") {
      if (abriendoId != null) return;
      setAbriendoId(archivo.id_archivo);
      try {
        const blob = await descargarArchivoBlob(String(archivo.id_archivo));
        abrirVisorPdf({ blob, nombre: archivo.nombre });
      } catch {
        showAlert("No se pudo abrir el documento. Revisa tu conexión e inténtalo de nuevo.");
      } finally {
        setAbriendoId(null);
      }
      return;
    }
    // Cualquier otro tipo de documento: se abre directo desde S3.
    window.open(archivo.url, "_blank", "noopener,noreferrer");
  };

  const handleSeleccionArchivo = (file: File) => {
    if (!onSubir) return;
    const esImagen = file.type.startsWith("image/");
    const urlLocal = URL.createObjectURL(file);
    setPreviaLocal({ url: urlLocal, esImagen });
    Promise.resolve(onSubir(file)).finally(() => {
      URL.revokeObjectURL(urlLocal);
      setPreviaLocal(null);
    });
  };

  const hayContenido = archivos.length > 0 || !!previaLocal;

  return (
    <div>
      {!hayContenido && (
        <p className="text-xs text-gray-400 mb-2">{vacioTexto}</p>
      )}

      {hayContenido && (
        <div className="flex flex-wrap gap-3 mb-3">
          {archivos.map(archivo => (
            <div key={archivo.id_archivo} className="relative group">
              <button
                type="button"
                onClick={() => abrirArchivo(archivo)}
                title={archivo.nombre}
                className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 hover:border-amber-400 transition-colors"
              >
                {archivo.tipo === "image" ? (
                  <img
                    src={archivo.url}
                    alt={archivo.nombre}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-red-400">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-bold">
                      {archivo.tipo === "pdf" ? "PDF" : "ARCHIVO"}
                    </span>
                  </div>
                )}
                {abriendoId === archivo.id_archivo && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
              {onEliminar && (
                <button
                  type="button"
                  onClick={() => onEliminar(archivo.id_archivo)}
                  title="Eliminar"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm text-red-500 hover:bg-red-50 flex items-center justify-center text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {previaLocal && (
            <div className="relative w-20 h-20 rounded-lg border border-amber-300 overflow-hidden flex items-center justify-center bg-amber-50">
              {previaLocal.esImagen ? (
                <img src={previaLocal.url} alt="" className="w-full h-full object-cover opacity-60" />
              ) : (
                <span className="text-[10px] font-bold text-amber-600">PDF</span>
              )}
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}
        </div>
      )}

      {onSubir && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            disabled={subiendo}
            onChange={e => {
              const archivo = e.target.files?.[0];
              if (archivo) handleSeleccionArchivo(archivo);
              e.target.value = "";
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 disabled:opacity-50 transition-colors"
          >
            {subiendo ? "Subiendo..." : "+ Agregar archivo o imagen"}
          </button>
        </>
      )}

      {/* Vista previa grande (lightbox) para imágenes */}
      {previewImagen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImagen(null)}
        >
          <img
            src={previewImagen.url}
            alt={previewImagen.nombre}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setPreviewImagen(null)}
            title="Cerrar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 text-gray-800 flex items-center justify-center text-lg font-bold hover:bg-white"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}