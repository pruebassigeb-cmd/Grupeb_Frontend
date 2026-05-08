import { useState, useEffect } from "react";
import {
  getConductores, getUnidades, procesarCarrito,
  getOrCreateNotaRemision, type EnvioCreado,
} from "../services/enviosService";
import { generarNotasMultiples } from "../utils/generarNotaRemision";
import type { CarritoPedido, Conductor, Unidad } from "../types/envios.types";
import { inputClass, labelClass } from "./enviosConstants";
import ModalFormatoCastores       from "./ModalFormatoCastores";
import ModalFormatoTresGuerras    from "./ModalFormatoTresGuerras";
import ModalGuiaPaqueteriaGeneral from "./ModalGuiaPaqueteriaGeneral";

interface Props {
  carrito:   CarritoPedido[];
  onSuccess: () => Promise<void>;
  onCancel:  () => void;
}

// Cada elemento de la cola tiene el idenvio y el tipo de modal a mostrar
interface ModalPendiente {
  idenvio: number;
  tipo:    "castores" | "tres_guerras" | "general";
}

export default function FormularioProcesarCarrito({ carrito, onSuccess, onCancel }: Props) {
  const [conductores,       setConductores]       = useState<Conductor[]>([]);
  const [unidades,          setUnidades]          = useState<Unidad[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [loading,           setLoading]           = useState(false);

  // Cola unificada de modales pendientes
  const [modalPendientes, setModalPendientes] = useState<ModalPendiente[]>([]);

  const [form, setForm] = useState({
    usuarios_idusuario:     0,
    unidades_idunidad:      0,
    costo_flete:            "",
    fecha_entrega_estimada: "",
    observaciones:          "",
  });

  const [seleccion, setSeleccion] = useState<Map<number, Set<number>>>(() => {
    const m = new Map<number, Set<number>>();
    carrito.forEach(p => {
      m.set(p.idsolicitud, new Set(p.bultos.map(b => b.idbulto)));
    });
    return m;
  });

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [c, u] = await Promise.all([getConductores(), getUnidades()]);
        setConductores(c);
        setUnidades(u.filter(x => x.activo));
      } catch { alert("Error al cargar catálogos"); }
      finally { setCargandoCatalogos(false); }
    };
    cargarCatalogos();
  }, []);

  const toggleBulto = (idsolicitud: number, idbulto: number) => {
    setSeleccion(prev => {
      const next = new Map(prev);
      const set  = new Set(next.get(idsolicitud) ?? []);
      if (set.has(idbulto)) set.delete(idbulto);
      else set.add(idbulto);
      next.set(idsolicitud, set);
      return next;
    });
  };

  const totalSeleccionados = Array.from(seleccion.values())
    .reduce((sum, set) => sum + set.size, 0);

  const hayBultosLocales = carrito.some(p =>
    p.bultos.some(b =>
      b.paqueteria_idpaqueteria === null &&
      (seleccion.get(p.idsolicitud)?.has(b.idbulto) ?? false)
    )
  );

  // ── Determina el tipo de modal según nombre de paquetería ──
  const tipoModal = (nombre: string | null): "castores" | "tres_guerras" | "general" => {
    const n = (nombre ?? "").toLowerCase();
    if (n.includes("castores"))    return "castores";
    if (n.includes("tres guerras")) return "tres_guerras";
    return "general";
  };

  const handleSubmit = async () => {
    if (hayBultosLocales && (!form.usuarios_idusuario || !form.unidades_idunidad)) {
      alert("Hay bultos con envío local — selecciona chofer y unidad"); return;
    }
    if (totalSeleccionados === 0) {
      alert("Selecciona al menos un bulto"); return;
    }

    setLoading(true);
    try {
      const pedidos = carrito
        .map(p => ({
          idsolicitud: p.idsolicitud,
          bultos: p.bultos
            .filter(b => seleccion.get(p.idsolicitud)?.has(b.idbulto))
            .map(b => ({
              idbulto:                 b.idbulto,
              paqueteria_idpaqueteria: b.paqueteria_idpaqueteria ?? null,
            })),
        }))
        .filter(p => p.bultos.length > 0);

      const result = await procesarCarrito({
        usuarios_idusuario:     form.usuarios_idusuario     || undefined,
        unidades_idunidad:      form.unidades_idunidad       || undefined,
        costo_flete:            form.costo_flete            ? Number(form.costo_flete) : undefined,
        fecha_entrega_estimada: form.fecha_entrega_estimada || undefined,
        observaciones:          form.observaciones          || undefined,
        pedidos,
      });

      const enviosCreados: EnvioCreado[] = result.envios_creados;

      // ── Notas de remisión para envíos locales ──
      const locales = enviosCreados.filter(e => e.tipo === "local");
      if (locales.length > 0) {
        try {
          const notas = await Promise.all(locales.map(e => getOrCreateNotaRemision(e.idenvio)));
          await generarNotasMultiples(notas);
        } catch { /* silencioso */ }
      }

      // ── Construir cola unificada para TODAS las paqueterías ──
      const pendientes: ModalPendiente[] = enviosCreados
        .filter(e => e.tipo === "paqueteria")
        .map(e => ({
          idenvio: e.idenvio,
          tipo:    tipoModal(e.paqueteria_nombre),
        }));

      if (pendientes.length > 0) {
        setModalPendientes(pendientes);
        // No llamamos onSuccess aquí — lo llamamos al cerrar el último modal
        return;
      }

      await onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error al procesar envío");
    } finally {
      setLoading(false);
    }
  };

  // ── Avanzar al siguiente modal o terminar ──
  const handleCerrarModal = async () => {
    const restantes = modalPendientes.slice(1);
    setModalPendientes(restantes);
    if (restantes.length === 0) {
      await onSuccess();
    }
  };

  // ── Renderizar el modal actual (el primero de la cola) ──
  if (modalPendientes.length > 0) {
    const actual = modalPendientes[0];

    if (actual.tipo === "castores") {
      return (
        <ModalFormatoCastores
          idenvio={actual.idenvio}
          onClose={handleCerrarModal}
        />
      );
    }

    if (actual.tipo === "tres_guerras") {
      return (
        <ModalFormatoTresGuerras
          idenvio={actual.idenvio}
          onClose={handleCerrarModal}
        />
      );
    }

    return (
      <ModalGuiaPaqueteriaGeneral
        idenvio={actual.idenvio}
        onClose={handleCerrarModal}
      />
    );
  }

  if (cargandoCatalogos) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

      {hayBultosLocales && (
        <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Datos para bultos con envío local
          </p>
          <div>
            <label className={labelClass}>Chofer *</label>
            <select value={form.usuarios_idusuario}
              onChange={e => setForm({ ...form, usuarios_idusuario: Number(e.target.value) })}
              className={inputClass}>
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
            <select value={form.unidades_idunidad}
              onChange={e => setForm({ ...form, unidades_idunidad: Number(e.target.value) })}
              className={inputClass}>
              <option value={0}>Seleccionar unidad...</option>
              {unidades.map(u => (
                <option key={u.idunidad} value={u.idunidad}>
                  {u.marca} {u.modelo} - {u.placa}{u.color ? ` (${u.color})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Costo de Flete (opcional)</label>
          <input type="text" inputMode="decimal" value={form.costo_flete}
            onChange={e => setForm({ ...form, costo_flete: e.target.value.replace(/[^0-9.]/g, "") })}
            className={inputClass} placeholder="0.00" />
        </div>
        <div>
          <label className={labelClass}>Fecha Estimada de Entrega</label>
          <input type="date" value={form.fecha_entrega_estimada}
            onChange={e => setForm({ ...form, fecha_entrega_estimada: e.target.value })}
            className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Observaciones (opcional)</label>
        <input type="text" value={form.observaciones}
          onChange={e => setForm({ ...form, observaciones: e.target.value })}
          className={inputClass} placeholder="Notas adicionales..." />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelClass + " mb-0"}>Confirmar bultos a enviar</label>
          <span className="text-xs text-gray-500">{totalSeleccionados} seleccionado(s)</span>
        </div>
        <div className="space-y-3">
          {carrito.map(pedido => (
            <div key={pedido.idsolicitud} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
              <div className="px-3 py-2 bg-gray-100 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600">{pedido.no_pedido}</span>
                <span className="text-xs text-gray-500">{pedido.cliente}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {pedido.bultos.map((bulto, idx) => {
                  const marcado = seleccion.get(pedido.idsolicitud)?.has(bulto.idbulto) ?? false;
                  return (
                    <div key={bulto.idbulto}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-xs ${marcado ? "bg-white" : "bg-gray-50 opacity-50"}`}
                      onClick={() => toggleBulto(pedido.idsolicitud, bulto.idbulto)}>
                      <input type="checkbox" readOnly checked={marcado}
                        className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-gray-400">#{idx + 1}</span>
                      <span className="text-gray-700 font-medium">
                        {bulto.nombre_producto} {bulto.medida && `(${bulto.medida})`}
                      </span>
                      <span className="text-gray-400 ml-auto">
                        {bulto.cantidad_unidades != null
                          ? `${bulto.cantidad_unidades.toLocaleString("es-MX")} pzas`
                          : bulto.peso_producto != null
                            ? `${bulto.peso_producto} kg`
                            : "-"
                        }
                      </span>
                      <span className={`px-2 py-0.5 rounded-full shrink-0 ${
                        bulto.paqueteria_idpaqueteria
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {bulto.paqueteria_nombre ?? "Local"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {hayBultosLocales && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs text-green-700">
          📄 Se generarán las notas de remisión automáticamente para los envíos locales.
        </div>
      )}

      {carrito.some(p => p.bultos.some(b =>
        b.paqueteria_idpaqueteria != null &&
        (seleccion.get(p.idsolicitud)?.has(b.idbulto) ?? false)
      )) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700">
          📋 Se generará el formato correspondiente para cada paquetería al registrar el envío.
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button onClick={onCancel} disabled={loading}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={loading || totalSeleccionados === 0}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Procesando..." : `Registrar ${carrito.length} Envío(s)`}
        </button>
      </div>
    </div>
  );
}