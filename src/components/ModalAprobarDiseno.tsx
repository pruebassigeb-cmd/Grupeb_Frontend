interface Props {
  noPedido: string;
  versiones: number;
  onConfirm: () => void;
  onCancel: () => void;
  aprobando?: boolean;
}

export default function ModalAprobarDiseno({
  noPedido,
  versiones,
  onConfirm,
  onCancel,
  aprobando = false,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center pt-2">
        <div className="mx-auto w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 className="text-2xl font-bold text-gray-900">¿Aprobar diseño final?</h3>
        <p className="text-gray-500 mt-2">Pedido #{noPedido}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500">Iteraciones realizadas</span>
          <span className="font-semibold text-gray-900">{versiones}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500">Estado final</span>
          <span className="font-semibold text-green-700">Aprobado por cliente</span>
        </div>
      </div>

      <p className="text-center text-sm text-gray-400">
        Esta acción marcará el diseño como aprobado. El chat y la carga de archivos seguirán funcionando con normalidad.
      </p>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={aprobando}
          className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={aprobando}
          className="px-5 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {aprobando ? "Aprobando..." : "Confirmar aprobación"}
        </button>
      </div>
    </div>
  );
}