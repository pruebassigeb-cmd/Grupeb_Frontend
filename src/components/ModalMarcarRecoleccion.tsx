import { useState, useRef } from "react";
import Modal from "./Modal";
import { marcarRecolectado } from "../services/enviosService";
import { subirArchivo } from "../services/archivos.service";
import { inputClass, labelClass } from "./enviosConstants";
import { showAlert } from "./CustomAlert";
import type { EnvioRecoleccion } from "../types/envios.types";

interface Props {
  recoleccion: EnvioRecoleccion;
  onClose:     () => void;
  onSuccess:   () => void;
}

export default function ModalMarcarRecoleccion({ recoleccion, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    nombre_quien_recogio: "",
    empresa:              "",
    unidad_marca:         "",
    unidad_modelo:        "",
    unidad_placas:        "",
  });
  const [foto,      setFoto]      = useState<File | null>(null);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.nombre_quien_recogio.trim()) {
      showAlert("El nombre de quien recogió es obligatorio");
      return;
    }
    setGuardando(true);
    try {
      // 1. Registrar datos de recolección en bitácora
      await marcarRecolectado(recoleccion.idenvio, form);

      // 2. Si hay foto, subirla a archivos vinculada al envío con envio_id
      if (foto) {
        const ext = foto.name.match(/\.[^/.]+$/)?.[0] || "";
        const archivoRenombrado = new File(
          [foto],
          `recoleccion-${recoleccion.idenvio}-${recoleccion.no_pedido}-${Date.now()}${ext}`,
          { type: foto.type }
        );
        await subirArchivo(archivoRenombrado, "fotos-envios", undefined, recoleccion.idenvio);
      }

      onSuccess();
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al registrar recolección");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar Recolección">
      <div className="space-y-4">

        {/* Info del pedido */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-purple-800">{recoleccion.no_pedido}</p>
          <p className="text-purple-600 text-xs mt-0.5">{recoleccion.cliente} · {recoleccion.total_bultos} bulto(s)</p>
        </div>

        {/* Nombre */}
        <div>
          <label className={labelClass}>Nombre de quien recogió *</label>
          <input type="text" value={form.nombre_quien_recogio}
            onChange={e => setForm({ ...form, nombre_quien_recogio: e.target.value })}
            className={inputClass} placeholder="Nombre completo..." />
        </div>

        {/* Empresa */}
        <div>
          <label className={labelClass}>Empresa (opcional)</label>
          <input type="text" value={form.empresa}
            onChange={e => setForm({ ...form, empresa: e.target.value })}
            className={inputClass} placeholder="Razón social o nombre de empresa..." />
        </div>

        {/* Datos de la unidad */}
        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Datos de la unidad (opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Marca</label>
              <input type="text" value={form.unidad_marca}
                onChange={e => setForm({ ...form, unidad_marca: e.target.value })}
                className={inputClass} placeholder="Ford, Toyota..." />
            </div>
            <div>
              <label className={labelClass}>Modelo</label>
              <input type="text" value={form.unidad_modelo}
                onChange={e => setForm({ ...form, unidad_modelo: e.target.value })}
                className={inputClass} placeholder="Transit, Ranger..." />
            </div>
          </div>
          <div>
            <label className={labelClass}>Placas</label>
            <input type="text" value={form.unidad_placas}
              onChange={e => setForm({ ...form, unidad_placas: e.target.value.toUpperCase() })}
              className={inputClass} placeholder="ABC-123" />
          </div>
        </div>

        {/* Foto */}
        <div>
          <label className={labelClass}>Foto (recibo, comprobante, etc.)</label>
          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleFoto} />

          {preview ? (
            <div className="relative">
              <img src={preview} alt="preview"
                className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
              <button type="button"
                onClick={() => { setFoto(null); setPreview(null); if (inputFotoRef.current) inputFotoRef.current.value = ""; }}
                className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-200">
                ✕
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => inputFotoRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex flex-col items-center gap-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Tomar o seleccionar foto</span>
              <span className="text-xs text-gray-400">Recibo, comprobante o lo que indique el gerente</span>
            </button>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} disabled={guardando}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit}
            disabled={guardando || !form.nombre_quien_recogio.trim()}
            className="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50">
            {guardando ? "Registrando..." : "✓ Confirmar Recolección"}
          </button>
        </div>
      </div>
    </Modal>
  );
}