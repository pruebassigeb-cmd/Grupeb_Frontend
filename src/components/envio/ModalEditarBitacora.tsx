import { useEffect, useRef, useState } from "react";
import Modal from "./../Modal";
import { OBSERVACIONES, inputClass, labelClass } from "./../enviosConstants";
import {
  getFotosEnvio,
  type Archivo,
} from "../../services/archivos.service";
import type {
  BitacoraRegistro,
  UpdateBitacoraRequest,
} from "../../types/envios.types";

interface Props {
  registro: BitacoraRegistro;
  onClose: () => void;
  onGuardar: (
    data: UpdateBitacoraRequest & { numero_guia?: string },
    foto?: File | null,
    fotosAEliminar?: string[],
  ) => Promise<void>;
  guardando: boolean;
  form: UpdateBitacoraRequest & { numero_guia?: string };
  setForm: (f: UpdateBitacoraRequest & { numero_guia?: string }) => void;
  modo?: "normal" | "paqueteria_entrega" | "paqueteria_edicion";
}

export default function ModalEditarBitacora({
  registro,
  onClose,
  onGuardar,
  guardando,
  form,
  setForm,
  modo = "normal",
}: Props) {
  const esPaqueteria = registro.envio.tipo === "paqueteria";
  const esEntregaPaqueteria = modo === "paqueteria_entrega";
  const esEdicionPaqueteria = modo === "paqueteria_edicion";
  const mostrarHorarios = !esEntregaPaqueteria;
  const mostrarObservacionCodigo = !esPaqueteria;
  const mostrarFirma = !esPaqueteria;
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fotoActual, setFotoActual] = useState<Archivo | null>(null);
  const [fotosAEliminar, setFotosAEliminar] = useState<string[]>([]);
  const [cargandoFoto, setCargandoFoto] = useState(true);

  useEffect(() => {
    let mounted = true;

    setCargandoFoto(true);
    setFoto(null);
    setPreview(null);
    setFotoActual(null);
    setFotosAEliminar([]);

    getFotosEnvio(registro.envio.idenvio)
      .then((fotos) => {
        if (!mounted) return;
        setFotoActual(fotos[0] ?? null);
        setPreview(fotos[0]?.url ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setFotoActual(null);
        setPreview(null);
      })
      .finally(() => {
        if (mounted) setCargandoFoto(false);
      });

    return () => {
      mounted = false;
    };
  }, [registro.envio.idenvio]);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fotoActual) {
      setFotosAEliminar((prev) =>
        prev.includes(fotoActual.id_archivo)
          ? prev
          : [...prev, fotoActual.id_archivo],
      );
    }

    setFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const quitarFoto = () => {
    if (fotoActual) {
      setFotosAEliminar((prev) =>
        prev.includes(fotoActual.id_archivo)
          ? prev
          : [...prev, fotoActual.id_archivo],
      );
    }

    setFoto(null);
    setFotoActual(null);
    setPreview(null);

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }
  };

  const titulo = esEntregaPaqueteria
    ? "Registrar Entrega de Paquetería"
    : esEdicionPaqueteria
      ? "Editar Entrega de Paquetería"
      : "Editar Registro de Bitácora";

  return (
    <Modal isOpen onClose={onClose} title={titulo}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="font-medium">
            {registro.no_pedido} - {registro.cliente}
          </p>
          <p className="text-gray-500 text-xs">
            {[registro.chofer?.nombre, registro.unidad?.nombre]
              .filter(Boolean)
              .join(" - ") || "Datos de entrega"}
          </p>
        </div>

        <div>
          <label className={labelClass}>Número de Guía</label>
          <input
            type="text"
            value={form.numero_guia || ""}
            onChange={(e) => setForm({ ...form, numero_guia: e.target.value })}
            className={inputClass}
            placeholder="Núm. de guía..."
          />
        </div>

        {mostrarHorarios && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fecha y Hora de Salida</label>
              <input
                type="datetime-local"
                value={form.hora_salida || ""}
                onChange={(e) =>
                  setForm({ ...form, hora_salida: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Fecha y Hora de Llegada</label>
              <input
                type="datetime-local"
                value={form.hora_llegada || ""}
                onChange={(e) =>
                  setForm({ ...form, hora_llegada: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>
        )}

        {esEntregaPaqueteria && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-700">
            La hora de entrega se registrará automáticamente al guardar.
          </div>
        )}

        {mostrarObservacionCodigo && (
          <div>
            <label className={labelClass}>Observación de entrega</label>
            <select
              value={form.observacion || ""}
              onChange={(e) =>
                setForm({ ...form, observacion: e.target.value as any })
              }
              className={inputClass}
            >
              <option value="">Sin observación</option>
              {OBSERVACIONES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelClass}>{esPaqueteria ? "Observaciones de entrega" : "Notas adicionales de entrega"}</label>
          <input
            type="text"
            value={form.observacion_extra || ""}
            onChange={(e) =>
              setForm({ ...form, observacion_extra: e.target.value })
            }
            className={inputClass}
            placeholder={esPaqueteria ? "Observaciones de la entrega..." : "Notas extras..."}
          />
        </div>

        {mostrarFirma && (
          <div>
            <label className={labelClass}>Firma (nombre del responsable)</label>
            <input
              type="text"
              value={form.firma || ""}
              onChange={(e) => setForm({ ...form, firma: e.target.value })}
              className={inputClass}
              placeholder="Nombre completo..."
            />
          </div>
        )}

        <div>
          <label className={labelClass}>Foto / comprobante</label>

          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFoto}
          />

          {cargandoFoto ? (
            <div className="flex items-center justify-center py-8 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : preview ? (
            <div className="space-y-2">
              <div className="relative">
                <img
                  src={preview}
                  alt="Vista previa"
                  className="w-full max-h-56 object-contain rounded-lg border border-gray-200 bg-gray-50"
                />

                <button
                  type="button"
                  onClick={quitarFoto}
                  disabled={guardando}
                  className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-200 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                disabled={guardando}
                className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
              >
                Reemplazar foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              disabled={guardando}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>

              <span>Tomar o seleccionar foto</span>
            </button>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={() => onGuardar(form, foto, fotosAEliminar)}
            disabled={guardando}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : esEntregaPaqueteria ? "Confirmar Entrega" : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
