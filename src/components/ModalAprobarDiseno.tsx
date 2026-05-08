interface Props {
  noPedido:   string;
  versiones:  number;
  onConfirm:  () => void;
  onCancel:   () => void;
  aprobando:  boolean;
}

export default function ModalAprobarDiseno({
  noPedido, versiones, onConfirm, onCancel, aprobando,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          ¿Aprobar diseño final?
        </h3>
        <p className="text-sm text-gray-500">
          Pedido <span className="font-semibold text-gray-700">#{noPedido}</span>
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Iteraciones realizadas</span>
          <span className="font-semibold text-gray-800">{versiones}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Estado final</span>
          <span className="font-semibold text-green-700">Aprobado por cliente</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Esta acción cerrará el hilo de revisiones. El chat quedará en modo solo lectura.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={aprobando}
          className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={aprobando}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {aprobando ? "Aprobando..." : "Confirmar aprobación"}
        </button>
      </div>
    </div>
  );
}