import Modal from "./../Modal";
import { inputClass, labelClass } from "./../enviosConstants";
import type { EnvioPaqueteria } from "../../types/envios.types";

interface Props {
  envio:     EnvioPaqueteria;
  onClose:   () => void;
  onGuardar: (guia: string) => Promise<void>;
  guardando: boolean;
  guia:      string;
  setGuia:   (g: string) => void;
}

export default function ModalGuiaPaqueteria({ envio, onClose, onGuardar, guardando, guia, setGuia }: Props) {
  return (
    <Modal isOpen onClose={onClose} title="Registrar Número de Guía">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="font-medium">{envio.no_pedido} - {envio.cliente}</p>
          <p className="text-gray-500 text-xs">{envio.paqueteria.nombre}</p>
        </div>

        <div>
          <label className={labelClass}>Número de Guía</label>
          <input type="text" value={guia}
            onChange={e => setGuia(e.target.value)}
            className={inputClass} placeholder="Ingresa el número de guía..." autoFocus />
          <p className="mt-1 text-xs text-gray-400">
            Una vez registrada la guía, la responsabilidad del envío pasa a la paquetería.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={guardando}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={() => onGuardar(guia)} disabled={guardando}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
            {guardando ? "Guardando..." : "Guardar Guía"}
          </button>
        </div>
      </div>
    </Modal>
  );
}