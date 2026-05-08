import { useState, useRef } from "react";
import api from "../services/api";
import { subirRevision } from "../services/ordenDisenoService";

interface Props {
  idorden:   number;
  noPedido:  string;
  tipo:      "render" | "feedback";
  onSuccess: () => void;
  onCancel:  () => void;
}

export default function SubirRender({
  idorden, noPedido, tipo, onSuccess, onCancel,
}: Props) {
  const [archivos,      setArchivos]      = useState<File[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [subiendo,      setSubiendo]      = useState(false);
  const [progreso,      setProgreso]      = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const labelTipo = tipo === "render" ? "Render" : "Feedback del cliente";

  const handleArchivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const nuevos = Array.from(e.target.files);
    setArchivos(prev => [...prev, ...nuevos]);
    // Reset del input para permitir volver a seleccionar los mismos archivos
    if (inputRef.current) inputRef.current.value = "";
  };

  const abrirSelector = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const eliminarArchivo = (idx: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (archivos.length === 0) {
      alert("Debes seleccionar al menos un archivo.");
      return;
    }

    setSubiendo(true);
    setProgreso(0);

    try {
      const idsSubidos: { id_archivo: number }[] = [];
      const total = archivos.length;

      for (let i = 0; i < total; i++) {
        const formData = new FormData();
        formData.append("archivo", archivos[i]);
        formData.append(
          "tipo",
          archivos[i].type === "application/pdf" ? "pdf" : "imagen"
        );

        const res = await api.post("/archivos/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        idsSubidos.push({ id_archivo: res.data.id_archivo });
        setProgreso(Math.round(((i + 1) / total) * 90));
      }

      await subirRevision(idorden, {
        tipo,
        observaciones: observaciones.trim() || undefined,
        archivos: idsSubidos,
      });

      setProgreso(100);
      onSuccess();
    } catch (error: any) {
      console.error("Error al subir:", error);
      alert(error.response?.data?.error || "Error al subir archivos");
    } finally {
      setSubiendo(false);
      setProgreso(0);
    }
  };

  const tamanoTotal = archivos.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-4">

      {/* Cabecera */}
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          tipo === "render" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
        }`}>
          {labelTipo}
        </span>
        <span className="text-sm text-gray-500">Pedido #{noPedido}</span>
      </div>

      {/* Aviso de versión */}
      {tipo === "render" && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-amber-800">
              Todo lo que subas en esta acción contará como una sola versión
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Si tienes varias imágenes o PDFs para esta entrega, agrégalos todos antes de enviar. Cualquier archivo que subas después generará una nueva versión del render.
            </p>
          </div>
        </div>
      )}

      {/* Observaciones — primero para que no interfiera con el selector */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {tipo === "render" ? "Notas para el cliente (opcional)" : "Descripción del feedback"}
        </label>
        <textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          rows={3}
          placeholder={
            tipo === "render"
              ? "Ej: Se ajustaron los colores según la muestra física..."
              : "Ej: Cliente solicita cambiar tipografía y aumentar logo..."
          }
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 bg-white focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none"
        />
      </div>

      {/* Drop zone — usa onMouseDown para no robar foco del textarea */}
      <div
        onMouseDown={e => e.preventDefault()}
        onClick={abrirSelector}
        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-500">Haz clic para seleccionar archivos</p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF — sin límite de cantidad</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleArchivos}
          className="hidden"
        />
      </div>

      {/* Lista de archivos */}
      {archivos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">
              {archivos.length} archivo{archivos.length > 1 ? "s" : ""} seleccionado{archivos.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-400">
              {(tamanoTotal / 1024 / 1024).toFixed(1)} MB total
            </p>
          </div>

          {archivos.map((archivo, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              {archivo.type === "application/pdf" ? (
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              <span className="text-xs text-gray-700 flex-1 truncate">{archivo.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {(archivo.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => eliminarArchivo(idx)}
                disabled={subiendo}
                className="text-red-400 hover:text-red-600 flex-shrink-0 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* Botón para agregar más archivos */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={abrirSelector}
            disabled={subiendo}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar más archivos
          </button>
        </div>
      )}

      {/* Barra de progreso */}
      {subiendo && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subiendo archivos...</span>
            <span>{progreso}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={subiendo}
          className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={subiendo || archivos.length === 0}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            tipo === "render" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-500 hover:bg-amber-600"
          }`}
        >
          {subiendo ? "Subiendo..." : `Subir ${labelTipo}`}
        </button>
      </div>
    </div>
  );
}