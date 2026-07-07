import { useRef, useState } from "react";
import type {
  ArchivoProductoPlastico,
  ArchivoPendientePlastico,
  CategoriaArchivoPlastico,
} from "../../types/productos-plastico.types";
import {
  subirArchivoProductoPlastico,
  eliminarArchivoProductoPlastico,
} from "../../services/productosPlasticoService";

const CATEGORIAS: { categoria: CategoriaArchivoPlastico; label: string; icono: string; accept: string }[] = [
  { categoria: "imagen-producto-plastico", label: "Imagen", icono: "🖼️", accept: "image/*" },
  { categoria: "render-plastico", label: "Render", icono: "🎨", accept: "image/*,.pdf" },
  { categoria: "master-plastico", label: "Master", icono: "📐", accept: ".pdf,.ai,.eps,image/*" },
];

const getTipoDeFile = (file: File): "image" | "pdf" | "document" => {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return "document";
};

interface Props {
  /** null cuando el producto aún no existe (modo alta) — los archivos quedan
   *  pendientes y se suben después de crear el producto. */
  idconfiguracion_plastico: number | null;
  archivosIniciales?: ArchivoProductoPlastico[];
  onPendientesChange: (pendientes: ArchivoPendientePlastico[]) => void;
}

export default function ArchivosProductoPlastico({
  idconfiguracion_plastico,
  archivosIniciales = [],
  onPendientesChange,
}: Props) {
  const [archivosGuardados, setArchivosGuardados] = useState<ArchivoProductoPlastico[]>(archivosIniciales);
  const [archivosPendientes, setArchivosPendientes] = useState<ArchivoPendientePlastico[]>([]);
  const [subiendo, setSubiendo] = useState<CategoriaArchivoPlastico | null>(null);
  const isEdit = idconfiguracion_plastico !== null;

  const notificarPendientes = (lista: ArchivoPendientePlastico[]) => {
    setArchivosPendientes(lista);
    onPendientesChange(lista);
  };

  const handleFile = async (file: File, categoria: CategoriaArchivoPlastico) => {
    if (!isEdit) {
      const pendiente: ArchivoPendientePlastico = {
        uid: `${Date.now()}-${Math.random()}`,
        file,
        categoria,
        previewUrl: URL.createObjectURL(file),
        nombre: file.name,
        tipo: getTipoDeFile(file),
        pendiente: true,
      };
      notificarPendientes([...archivosPendientes, pendiente]);
      return;
    }

    setSubiendo(categoria);
    try {
      const subido = await subirArchivoProductoPlastico(file, categoria, idconfiguracion_plastico!);
      setArchivosGuardados((prev) => [...prev, subido]);
    } catch (e: any) {
      alert(e.message ?? "Error al subir el archivo");
    } finally {
      setSubiendo(null);
    }
  };

  const eliminarGuardado = async (id_archivo: number) => {
    if (!confirm("¿Eliminar este archivo?")) return;
    try {
      await eliminarArchivoProductoPlastico(id_archivo);
      setArchivosGuardados((prev) => prev.filter((a) => a.id_archivo !== id_archivo));
    } catch {
      alert("No se pudo eliminar el archivo");
    }
  };

  const eliminarPendiente = (uid: string) => {
    const item = archivosPendientes.find((p) => p.uid === uid);
    if (item) URL.revokeObjectURL(item.previewUrl);
    notificarPendientes(archivosPendientes.filter((p) => p.uid !== uid));
  };

  const archivoDe = (categoria: CategoriaArchivoPlastico) =>
    archivosGuardados.find((a) => a.categoria === categoria) ??
    archivosPendientes.find((p) => p.categoria === categoria);

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-lg font-bold mb-1">Archivos del producto</h2>
      <p className="text-xs text-gray-400 mb-4">
        {isEdit
          ? "Imagen del producto, render y master — se suben de inmediato."
          : "Se subirán al servidor en cuanto guardes el producto."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CATEGORIAS.map(({ categoria, label, icono, accept }) => (
          <ArchivoSlot
            key={categoria}
            categoria={categoria}
            label={label}
            icono={icono}
            accept={accept}
            actual={archivoDe(categoria)}
            subiendo={subiendo === categoria}
            onSubir={(file) => handleFile(file, categoria)}
            onEliminarGuardado={eliminarGuardado}
            onEliminarPendiente={eliminarPendiente}
          />
        ))}
      </div>
    </div>
  );
}

// ── Slot individual — su propio componente para poder usar useRef sin
//    violar las reglas de hooks ────────────────────────────────────────────
function ArchivoSlot({
  label,
  icono,
  accept,
  actual,
  subiendo,
  onSubir,
  onEliminarGuardado,
  onEliminarPendiente,
}: {
  categoria: CategoriaArchivoPlastico;
  label: string;
  icono: string;
  accept: string;
  actual: ArchivoProductoPlastico | ArchivoPendientePlastico | undefined;
  subiendo: boolean;
  onSubir: (file: File) => void;
  onEliminarGuardado: (id_archivo: number) => void;
  onEliminarPendiente: (uid: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const esPendiente = !!actual && "pendiente" in actual && actual.pendiente;

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icono}</span>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>

      {actual ? (
        <div className="space-y-2">
          {actual.tipo === "image" && (
            <img
              src={"url" in actual ? actual.url : actual.previewUrl}
              alt={actual.nombre}
              className="w-full h-28 object-cover rounded-md border border-gray-200"
            />
          )}
          <p className="text-xs text-gray-600 truncate" title={actual.nombre}>
            {actual.nombre}
          </p>
          <div className="flex items-center justify-between">
            {esPendiente && (
              <span className="text-[10px] font-semibold text-amber-600">pendiente</span>
            )}
            <button
              type="button"
              onClick={() =>
                "id_archivo" in actual
                  ? onEliminarGuardado(actual.id_archivo)
                  : onEliminarPendiente(actual.uid)
              }
              className="text-xs text-red-500 hover:text-red-700 ml-auto"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onSubir(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="w-full h-28 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md text-xs text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
          >
            {subiendo ? "Subiendo..." : `+ Subir ${label.toLowerCase()}`}
          </button>
        </>
      )}
    </div>
  );
}