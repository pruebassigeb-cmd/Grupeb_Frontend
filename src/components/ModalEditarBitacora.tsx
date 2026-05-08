import Modal from "./Modal";
import { OBSERVACIONES, inputClass, labelClass } from "./enviosConstants";
import type { BitacoraRegistro, UpdateBitacoraRequest } from "../types/envios.types";

interface Props {
  registro: BitacoraRegistro;
  onClose:  () => void;
  onGuardar: (data: UpdateBitacoraRequest & { numero_guia?: string }) => Promise<void>;
  guardando: boolean;
  form:      UpdateBitacoraRequest & { numero_guia?: string };
  setForm:   (f: UpdateBitacoraRequest & { numero_guia?: string }) => void;
}

export default function ModalEditarBitacora({ registro, onClose, onGuardar, guardando, form, setForm }: Props) {
  return (
    <Modal isOpen onClose={onClose} title="Editar Registro de Bitácora">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="font-medium">{registro.no_pedido} - {registro.cliente}</p>
          <p className="text-gray-500 text-xs">{registro.chofer.nombre} - {registro.unidad.nombre}</p>
        </div>

        <div>
          <label className={labelClass}>Número de Guía</label>
          <input type="text" value={form.numero_guia || ""}
            onChange={e => setForm({ ...form, numero_guia: e.target.value })}
            className={inputClass} placeholder="Núm. de guía..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Fecha y Hora de Salida</label>
            <input type="datetime-local" value={form.hora_salida || ""}
              onChange={e => setForm({ ...form, hora_salida: e.target.value })}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fecha y Hora de Llegada</label>
            <input type="datetime-local" value={form.hora_llegada || ""}
              onChange={e => setForm({ ...form, hora_llegada: e.target.value })}
              className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Observación</label>
          <select value={form.observacion || ""}
            onChange={e => setForm({ ...form, observacion: e.target.value as any })}
            className={inputClass}>
            <option value="">Sin observación</option>
            {OBSERVACIONES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Notas adicionales</label>
          <input type="text" value={form.observacion_extra || ""}
            onChange={e => setForm({ ...form, observacion_extra: e.target.value })}
            className={inputClass} placeholder="Notas extras..." />
        </div>

        <div>
          <label className={labelClass}>Firma (nombre del responsable)</label>
          <input type="text" value={form.firma || ""}
            onChange={e => setForm({ ...form, firma: e.target.value })}
            className={inputClass} placeholder="Nombre completo..." />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={guardando}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={() => onGuardar(form)} disabled={guardando}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </Modal>
  );
}