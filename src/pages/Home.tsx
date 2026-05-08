import { useEffect, useState } from "react";
import Dashboard from "../layouts/Sidebar";
import {
  subirArchivo,
  listarArchivos,
  eliminarArchivo,
} from "../services/archivos.service";
import type { Archivo } from "../services/archivos.service";

export default function Home() {
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarArchivos = async () => {
    try {
      const data = await listarArchivos();
      setArchivos(data);
    } catch (err) {
      console.error(err);
      setError("Error al cargar archivos");
    }
  };

  useEffect(() => {
    cargarArchivos();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendo(true);
    setError(null);

    try {
      await subirArchivo(file);
      await cargarArchivos();
      e.target.value = "";
    } catch (err) {
      console.error(err);
      setError("Error al subir el archivo");
    } finally {
      setSubiendo(false);
    }
  };

  const handleDelete = async (id_archivo: string) => {
    if (!confirm("¿Seguro que quieres eliminar este archivo?")) return;

    try {
      await eliminarArchivo(id_archivo);
      await cargarArchivos();
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el archivo");
    }
  };

  const formatearTamano = (kb: number) => {
    if (!kb || isNaN(kb)) return "—";
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <Dashboard>
      <h1 className="text-2xl font-bold mb-4">Inicio - Prueba Cloudinary</h1>

      <p className="text-slate-400 mb-6">
        Sube archivos (PDF o imágenes) para probar la integración con Cloudinary.
      </p>

      {/* Zona de subida */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <label className="block mb-2 text-sm font-medium text-slate-300">
          Selecciona un archivo
        </label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleUpload}
          disabled={subiendo}
          className="block w-full text-sm text-slate-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700
            file:cursor-pointer
            disabled:opacity-50"
        />
        {subiendo && (
          <p className="mt-2 text-sm text-blue-400">Subiendo archivo...</p>
        )}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* Lista de archivos */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">
          Archivos subidos ({archivos.length})
        </h2>

        {archivos.length === 0 ? (
          <p className="text-slate-400 text-sm">
            No hay archivos subidos todavía.
          </p>
        ) : (
          <div className="space-y-3">
            {archivos.map((archivo) => (
              <div
                key={archivo.id_archivo}
                className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-700"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {archivo.tipo === "image" ? (
                    <img
                      src={archivo.url}
                      alt={archivo.nombre}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-red-600/20 border border-red-600/40 rounded flex items-center justify-center text-red-400 font-bold text-xs">
                      PDF
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {archivo.nombre}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatearTamano(archivo.tamano_kb)} ·{" "}
                      {new Date(archivo.created_at).toLocaleString("es-MX")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <a
                    href={archivo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition"
                  >
                    Ver
                  </a>
                  <button
                    onClick={() => handleDelete(archivo.id_archivo)}
                    className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dashboard>
  );
}