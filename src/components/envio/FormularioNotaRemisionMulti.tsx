import { useState, useEffect } from "react";
import {
  getConductores, getUnidades,
  procesarCarrito, crearNotaRemisionMulti,
} from "../../services/enviosService";
import { generarNotaRemisionMulti } from "../../utils/generarNotaRemision";
import type { CarritoPedido, Conductor, Unidad, TipoEnvioCarrito } from "../../types/envios.types";
import { inputClass, labelClass } from "./../enviosConstants";
import { showAlert } from ".././CustomAlert";

interface Props {
  carrito:   CarritoPedido[];
  onSuccess: () => Promise<void>;
  onCancel:  () => void;
}

export default function FormularioNotaRemisionMulti({ carrito, onSuccess, onCancel }: Props) {
  const [conductores,    setConductores]    = useState<Conductor[]>([]);
  const [unidades,       setUnidades]       = useState<Unidad[]>([]);
  const [cargando,       setCargando]       = useState(true);
  const [procesando,     setProcesando]     = useState(false);

  const [tipoEntrega,          setTipoEntrega]          = useState<"recoleccion" | "local" | null>(null);
  const [choferSeleccionado,   setChoferSeleccionado]   = useState(0);
  const [unidadSeleccionada,   setUnidadSeleccionada]   = useState(0);
  const [costoFlete,           setCostoFlete]           = useState("");
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState("");
  const [observaciones,        setObservaciones]        = useState("");

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [c, u] = await Promise.all([getConductores(), getUnidades()]);
        setConductores(c);
        setUnidades(u.filter(x => x.activo));
      } catch { showAlert("Error al cargar catálogos"); }
      finally { setCargando(false); }
    };
    cargarCatalogos();
  }, []);

  const totalBultos  = carrito.reduce((sum, p) => sum + p.bultos.length, 0);
  const totalPedidos = carrito.length;

  const handleSubmit = async () => {
    if (!tipoEntrega) {
      showAlert("Selecciona el tipo de entrega para la nota de remisión");
      return;
    }
    if (tipoEntrega === "local" && (!choferSeleccionado || !unidadSeleccionada)) {
      showAlert("Para entrega local selecciona chofer y unidad");
      return;
    }

    setProcesando(true);
    try {
      const pedidosPayload = carrito.map(p => ({
        idsolicitud: p.idsolicitud,
        tipo_envio: tipoEntrega as TipoEnvioCarrito,
        bultos: p.bultos.map(b => ({
          idbulto:                 b.idbulto,
          paqueteria_idpaqueteria: null,
        })),
      }));

      const resultCarrito = await procesarCarrito({
        usuarios_idusuario:     tipoEntrega === "local" ? choferSeleccionado || undefined : undefined,
        unidades_idunidad:      tipoEntrega === "local" ? unidadSeleccionada || undefined : undefined,
        costo_flete:            tipoEntrega === "local" && costoFlete ? Number(costoFlete) : undefined,
        fecha_entrega_estimada: fechaEntregaEstimada || undefined,
        observaciones:          observaciones.trim() || undefined,
        pedidos: pedidosPayload,
      });

      const enviosIds = resultCarrito.envios_creados.map(e => e.idenvio);

      const notaMulti = await crearNotaRemisionMulti({
        envios_ids:       enviosIds,
        tipo_entrega:     tipoEntrega,
        chofer_idusuario: tipoEntrega === "local" ? choferSeleccionado || undefined : undefined,
        unidad_idunidad:  tipoEntrega === "local" ? unidadSeleccionada || undefined : undefined,
        observaciones:    observaciones.trim() || undefined,
      });

      await generarNotaRemisionMulti(notaMulti);
      await onSuccess();
    } catch (error: any) {
      console.error("❌ Error nota remision:", error.response?.data || error.message);
      showAlert(error.response?.data?.error || "Error al crear nota de remisión");
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Resumen */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <p className="font-semibold text-emerald-800 text-sm">Nota de Remisión conjunta</p>
        <p className="text-emerald-600 text-xs mt-1">
          Se agrupará el contenido de <strong>{totalPedidos} pedidos</strong> ({totalBultos} bultos en total)
          en una sola nota de remisión.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {carrito.map(p => (
            <span key={p.idsolicitud} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
              {p.no_pedido}
            </span>
          ))}
        </div>
      </div>

      {/* Tipo de entrega */}
      <div>
        <label className={labelClass}>Tipo de entrega</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTipoEntrega("recoleccion")}
            className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
              tipoEntrega === "recoleccion"
                ? "border-purple-600 bg-purple-50 text-purple-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            🏭 Recolección en planta
            <p className="text-xs font-normal mt-0.5 opacity-70">El cliente pasa a recoger</p>
          </button>
          <button
            type="button"
            onClick={() => setTipoEntrega("local")}
            className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
              tipoEntrega === "local"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            🚚 Envío local
            <p className="text-xs font-normal mt-0.5 opacity-70">Se envía con chofer propio</p>
          </button>
        </div>
      </div>

      {/* Campos para recolección */}
      {tipoEntrega === "recoleccion" && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Datos de recolección</p>
          <div>
            <label className={labelClass}>Fecha estimada de recolección (opcional)</label>
            <input
              type="date"
              value={fechaEntregaEstimada}
              onChange={e => setFechaEntregaEstimada(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Campos para envío local */}
      {tipoEntrega === "local" && (
        <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Datos del reparto</p>
          <div>
            <label className={labelClass}>Chofer *</label>
            <select
              value={choferSeleccionado}
              onChange={e => setChoferSeleccionado(Number(e.target.value))}
              className={inputClass}
            >
              <option value={0}>Seleccionar chofer...</option>
              {conductores.map(c => (
                <option key={c.idusuario} value={c.idusuario}>
                  {c.nombre} {c.apellido}{c.telefono ? ` - ${c.telefono}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Unidad *</label>
            <select
              value={unidadSeleccionada}
              onChange={e => setUnidadSeleccionada(Number(e.target.value))}
              className={inputClass}
            >
              <option value={0}>Seleccionar unidad...</option>
              {unidades.map(u => (
                <option key={u.idunidad} value={u.idunidad}>
                  {u.marca} {u.modelo} - {u.placa}{u.color ? ` (${u.color})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Costo de Flete (opcional)</label>
              <input
                type="text"
                inputMode="decimal"
                value={costoFlete}
                onChange={e => setCostoFlete(e.target.value.replace(/[^0-9.]/g, ""))}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelClass}>Fecha estimada de entrega</label>
              <input
                type="date"
                value={fechaEntregaEstimada}
                onChange={e => setFechaEntregaEstimada(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Observaciones — aplica para cualquier tipo */}
      {tipoEntrega && (
        <div>
          <label className={labelClass}>Observaciones del envío / nota (opcional)</label>
          <textarea
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400 resize-none"
            placeholder="Ej: Favor de revisar embalaje, producto frágil, instrucciones especiales..."
          />
          <p className="text-xs text-gray-400 mt-1">Se guardará en el envío y se imprimirá en la parte inferior de la nota de remisión.</p>
        </div>
      )}

      {/* Desglose de pedidos */}
      <div>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Contenido de la nota</p>
        <div className="space-y-2">
          {carrito.map(pedido => (
            <div key={pedido.idsolicitud} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-bold">{pedido.no_pedido}</span>
                <span className="text-gray-400">{pedido.bultos.length} bulto(s)</span>
              </div>
              <span className="text-gray-500">{pedido.cliente}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={onCancel}
          disabled={procesando}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={procesando || !tipoEntrega}
          className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          {procesando ? "Generando..." : "📋 Crear Nota de Remisión"}
        </button>
      </div>
    </div>
  );
}