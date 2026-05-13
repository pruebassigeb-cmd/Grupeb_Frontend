import { useState, useEffect } from "react";
import { getConductores, getUnidades, getPaqueterias, createEnvio, getEnviosPedido } from "../services/enviosService";
import type { Conductor, Unidad, Paqueteria, PedidoDisponible } from "../types/envios.types";
import { inputClass, labelClass } from "./enviosConstants";
import ModalFormatoCastores       from "./ModalFormatoCastores";
import ModalFormatoTresGuerras    from "./ModalFormatoTresGuerras";
import ModalGuiaPaqueteriaGeneral from "./ModalGuiaPaqueteriaGeneral";
import { showAlert } from './CustomAlert';


interface Props {
  pedido:    PedidoDisponible;
  bultosIds: number[];
  onSuccess: (idenvio?: number) => void;
  onCancel:  () => void;
}

export default function FormularioEnvioIndividual({ pedido, bultosIds, onSuccess, onCancel }: Props) {
  const [tipo,              setTipo]              = useState<"local" | "paqueteria">("local");
  const [conductores,       setConductores]       = useState<Conductor[]>([]);
  const [unidades,          setUnidades]          = useState<Unidad[]>([]);
  const [paqueterias,       setPaqueterias]       = useState<Paqueteria[]>([]);
  const [loading,           setLoading]           = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [idenvioNuevo,      setIdenvioNuevo]      = useState<number | null>(null);
  const [paqueteriaEnvio,   setPaqueteriaEnvio]   = useState<"castores" | "tres_guerras" | "general" | null>(null);

  const [form, setForm] = useState({
    usuarios_idusuario:      0,
    unidades_idunidad:       0,
    paqueteria_idpaqueteria: 0,
    costo_flete:             "",
    fecha_entrega_estimada:  "",
    observaciones:           "",
  });

  useEffect(() => {
    const cargar = async () => {
      try {
        const [c, u, p] = await Promise.all([getConductores(), getUnidades(), getPaqueterias()]);
        setConductores(c);
        setUnidades(u.filter(x => x.activo));
        setPaqueterias(p.filter(x => x.activo));
      } catch { showAlert("Error al cargar catálogos"); }
      finally { setCargandoCatalogos(false); }
    };
    cargar();
  }, []);

  const paqueteriaSeleccionada = paqueterias.find(
    p => p.idpaqueteria === form.paqueteria_idpaqueteria
  );

  const esCastores    = paqueteriaSeleccionada?.nombre.toLowerCase().includes("castores")     ?? false;
  const esTresGuerras = paqueteriaSeleccionada?.nombre.toLowerCase().includes("tres guerras") ?? false;

  const handleSubmit = async () => {
    if (tipo === "local" && (!form.usuarios_idusuario || !form.unidades_idunidad)) {
      showAlert("Selecciona un chofer y una unidad"); return;
    }
    if (tipo === "paqueteria" && !form.paqueteria_idpaqueteria) {
      showAlert("Selecciona una paquetería"); return;
    }
    setLoading(true);
    try {
      await createEnvio({
        idsolicitud:             pedido.idsolicitud,
        tipo,
        usuarios_idusuario:      tipo === "local"      ? form.usuarios_idusuario      : undefined,
        unidades_idunidad:       tipo === "local"      ? form.unidades_idunidad        : undefined,
        paqueteria_idpaqueteria: tipo === "paqueteria" ? form.paqueteria_idpaqueteria  : undefined,
        costo_flete:             form.costo_flete           ? Number(form.costo_flete) : undefined,
        fecha_entrega_estimada:  form.fecha_entrega_estimada || undefined,
        observaciones:           form.observaciones          || undefined,
        bultos_ids:              bultosIds,
      });

      const enviosActualizados = await getEnviosPedido(pedido.idsolicitud);
      const nuevoId = enviosActualizados.length > 0 ? enviosActualizados[0].idenvio : null;

      if (tipo === "paqueteria" && nuevoId) {
        if (esCastores) {
          setPaqueteriaEnvio("castores");
          setIdenvioNuevo(nuevoId);
        } else if (esTresGuerras) {
          setPaqueteriaEnvio("tres_guerras");
          setIdenvioNuevo(nuevoId);
        } else {
          setPaqueteriaEnvio("general");
          setIdenvioNuevo(nuevoId);
        }
      } else {
        onSuccess(tipo === "local" ? nuevoId ?? undefined : undefined);
      }
    } catch (error: any) {
      showAlert(error.response?.data?.error || "Error al registrar envío");
    } finally {
      setLoading(false);
    }
  };

  // ── Mostrar modal según paquetería ──
  if (idenvioNuevo && paqueteriaEnvio === "castores") {
    return (
      <ModalFormatoCastores
        idenvio={idenvioNuevo}
        onClose={() => onSuccess(undefined)}
      />
    );
  }

  if (idenvioNuevo && paqueteriaEnvio === "tres_guerras") {
    return (
      <ModalFormatoTresGuerras
        idenvio={idenvioNuevo}
        onClose={() => onSuccess(undefined)}
      />
    );
  }

  if (idenvioNuevo && paqueteriaEnvio === "general") {
    return (
      <ModalGuiaPaqueteriaGeneral
        idenvio={idenvioNuevo}
        onClose={() => onSuccess(undefined)}
      />
    );
  }

  if (cargandoCatalogos) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="font-medium text-gray-700">{pedido.no_pedido} - {pedido.impresion || pedido.empresa}</p>
        <p className="text-gray-500 text-xs mt-1">
          {[pedido.calle, pedido.numero, pedido.colonia, pedido.poblacion, pedido.estado].filter(Boolean).join(", ")}
        </p>
        <p className="text-blue-600 text-xs mt-1">{bultosIds.length} bulto(s) seleccionado(s)</p>
      </div>

      <div>
        <label className={labelClass}>Tipo de Envío</label>
        <div className="flex gap-3">
          {(["local", "paqueteria"] as const).map(t => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                tipo === t
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              {t === "local" ? "Local" : "Paquetería"}
            </button>
          ))}
        </div>
      </div>

      {tipo === "local" ? (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Chofer</label>
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
            <label className={labelClass}>Unidad</label>
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
      ) : (
        <div>
          <label className={labelClass}>Paquetería</label>
          <select value={form.paqueteria_idpaqueteria}
            onChange={e => setForm({ ...form, paqueteria_idpaqueteria: Number(e.target.value) })}
            className={inputClass}>
            <option value={0}>Seleccionar paquetería...</option>
            {paqueterias.map(p => (
              <option key={p.idpaqueteria} value={p.idpaqueteria}>{p.nombre}</option>
            ))}
          </select>

          {esCastores && (
            <p className="mt-1 text-xs text-amber-600 font-medium">
              📋 Se generará el formato de solicitud de Castores al registrar el envío.
            </p>
          )}
          {esTresGuerras && (
            <p className="mt-1 text-xs text-red-600 font-medium">
              📋 Se generará la orden de servicio de Tres Guerras al registrar el envío.
            </p>
          )}
          {!esCastores && !esTresGuerras && form.paqueteria_idpaqueteria > 0 && (
            <p className="mt-1 text-xs text-indigo-500">
              📄 Se generará una guía informativa para el repartidor al registrar el envío.
            </p>
          )}
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

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} disabled={loading}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          Cancelar
        </button>
        <button type="button" onClick={handleSubmit} disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Registrando..." : "Registrar Envío"}
        </button>
      </div>
    </div>
  );
}