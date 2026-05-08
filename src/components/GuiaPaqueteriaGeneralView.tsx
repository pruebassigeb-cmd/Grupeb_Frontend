import type { GuiaPaqueteriaGeneral } from "../types/envios.types";
import { generarGuiaPaqueteriaGeneral } from "../utils/generarGuiaPaqueteriaGeneral";

interface Props {
  datos:        GuiaPaqueteriaGeneral;
  onClose:      () => void;
  onDescargar?: () => void;
}

export default function GuiaPaqueteriaGeneralView({ datos, onClose, onDescargar }: Props) {
  const folio = `ENV-P${datos.no_pedido}`;

  const nombrePaq = datos.paqueteria.toLowerCase();
  const esFormato = nombrePaq.includes("castores") || nombrePaq.includes("tres guerras");

  const handleDescargar = () => {
    if (onDescargar) onDescargar();
    else generarGuiaPaqueteriaGeneral(datos);
  };

  return (
    <div className="font-sans">

      {/* Botones — se ocultan al imprimir */}
      <div className="flex justify-end gap-3 mb-4 print:hidden">
        {/* Solo mostrar descarga para paqueterías sin formato propio */}
        {!esFormato && (
          <button
            onClick={handleDescargar}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Descargar
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Cerrar
        </button>
      </div>

      {/* ── GUÍA ── */}
      <div className="bg-white border-2 border-gray-800 rounded-xl overflow-hidden shadow-lg print:shadow-none print:border print:rounded-none">

        {/* Encabezado */}
        <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-0.5">Guía de Envío</p>
            <h1 className="text-2xl font-black tracking-tight">{datos.paqueteria}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Folio</p>
            <p className="text-xl font-mono font-bold text-yellow-400">{folio}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Fila superior: Pedido + Fecha */}
          <div className="flex gap-4">
            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">No. Pedido</p>
              <p className="text-lg font-bold text-blue-700">{datos.no_pedido}</p>
            </div>
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Fecha de Envío</p>
              <p className="text-base font-semibold text-gray-700">
                {new Date(datos.fecha_envio).toLocaleDateString("es-MX", {
                  day: "2-digit", month: "long", year: "numeric"
                })}
              </p>
            </div>
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Total Bultos</p>
              <p className="text-lg font-bold text-gray-700">{datos.total_bultos}</p>
            </div>
          </div>

          {/* Remitente / Destinatario */}
          <div className="grid grid-cols-2 gap-4">

            {/* Remitente */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Remitente</p>
              </div>
              <div className="px-4 py-3 space-y-1.5 text-sm">
                <p className="font-bold text-gray-800">{datos.remitente.nombre_empresa}</p>
                <p className="text-gray-600">{datos.remitente.razon_social}</p>
                <p className="text-gray-500">{datos.remitente.rfc}</p>
                <p className="text-gray-500">{datos.remitente.domicilio}</p>
                <p className="text-gray-500">{datos.remitente.colonia}, {datos.remitente.ciudad}</p>
                <p className="text-gray-500">{datos.remitente.estado} — C.P. {datos.remitente.codigo_postal}</p>
                <p className="text-gray-500">{datos.remitente.telefonos}</p>
              </div>
            </div>

            {/* Destinatario */}
            <div className="border-2 border-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-4 py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-300">Destinatario</p>
              </div>
              <div className="px-4 py-3 space-y-1.5 text-sm">
                <p className="font-black text-gray-900 text-base">{datos.destinatario.impresion || datos.destinatario.nombre}</p>
                {datos.destinatario.impresion && datos.destinatario.nombre !== datos.destinatario.impresion && (
                  <p className="text-gray-600 font-medium">{datos.destinatario.nombre}</p>
                )}
                <p className="text-gray-500">{datos.destinatario.rfc}</p>
                <p className="text-gray-600">{datos.destinatario.domicilio}</p>
                <p className="text-gray-600">{datos.destinatario.colonia}, {datos.destinatario.ciudad}</p>
                <p className="text-gray-600 font-medium">{datos.destinatario.estado} — C.P. {datos.destinatario.codigo_postal}</p>
                <p className="text-gray-500">{datos.destinatario.telefonos}</p>
              </div>
            </div>
          </div>

          {/* Bultos */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Contenido del Envío</p>
              <span className="text-xs text-gray-400">{datos.bultos.length} bulto(s)</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs text-gray-400 font-semibold uppercase">#</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-400 font-semibold uppercase">Producto</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-400 font-semibold uppercase">Peso</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-400 font-semibold uppercase">Medidas (cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {datos.bultos.map((b, idx) => (
                  <tr key={b.idbulto} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800">{b.nombre_producto} {b.medida && `(${b.medida})`}</p>
                      {b.cantidad_unidades != null && (
                        <p className="text-xs text-gray-400">{b.cantidad_unidades.toLocaleString("es-MX")} pzas</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {b.peso != null ? `${b.peso} kg` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {b.alto != null ? `${b.alto} × ${b.largo} × ${b.ancho}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Observaciones */}
          {datos.observaciones && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Observaciones</p>
              <p className="text-sm text-amber-800">{datos.observaciones}</p>
            </div>
          )}

          {/* Pie */}
          <div className="border-t border-dashed border-gray-300 pt-4 flex items-center justify-between text-xs text-gray-400">
            <p>Documento informativo — no tiene validez fiscal</p>
            <p className="font-mono">{folio}</p>
          </div>

        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .bg-white { visibility: visible; }
          .bg-white * { visibility: visible; }
        }
      `}</style>
    </div>
  );
}