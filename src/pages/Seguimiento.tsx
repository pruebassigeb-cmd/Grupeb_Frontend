import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import {
  getSeguimiento,
  getOrdenProduccion,
  getProcesosOrden,
  iniciarProceso,
  finalizarProceso,
} from "../services/seguimientoService";
import type { OrdenProduccionProducto, ProcesosOrdenRespuesta } from "../services/seguimientoService";
import { generarPdfOrdenProduccion } from "../services/generarPdfOrdenProduccion";
import type { PedidoSeguimiento } from "../types/seguimiento.types";
import Modal from "../components/Modal";

// ── Helpers ───────────────────────────────────────────────────
const obtenerColorEstado = (estado: string) => {
  switch (estado) {
    case "finalizado": case "aprobado": case "pagado": case "enviado":
      return "bg-green-100 text-green-800 border-green-300";
    case "proceso":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "detenido":
      return "bg-red-100 text-red-800 border-red-300";
    case "pendiente":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "resagado":
      return "bg-black text-white border-black";
    case "no-aplica":
      return "bg-gray-100 text-gray-400 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-300";
  }
};

const obtenerTextoEstado = (estado: string) => {
  const mapa: Record<string, string> = {
    finalizado: "✓", proceso: "⚙", pendiente: "–",
    resagado: "!", "no-aplica": "N/A", aprobado: "✓", pagado: "✓",
  };
  return mapa[estado] ?? "–";
};

const Badge = ({
  estado,
  clickable = false,
  onClick,
}: {
  estado: string;
  clickable?: boolean;
  onClick?: () => void;
}) => {
  const base = `inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${obtenerColorEstado(estado)}`;
  const cursor = clickable && estado !== "no-aplica"
    ? "cursor-pointer hover:scale-110 hover:shadow-md transition-transform"
    : "";
  return (
    <span
      title={estado}
      className={`${base} ${cursor}`}
      onClick={clickable && estado !== "no-aplica" ? onClick : undefined}
    >
      {obtenerTextoEstado(estado)}
    </span>
  );
};

const BadgeTexto = ({ estado }: { estado: string }) => {
  const textos: Record<string, string> = {
    finalizado: "Finalizado", proceso: "En Proceso",
    pendiente: "Pendiente", resagado: "Resagado",
    "no-aplica": "N/A", aprobado: "Aprobado",
    pagado: "Pagado",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${obtenerColorEstado(estado)}`}>
      {textos[estado] ?? estado}
    </span>
  );
};

const IconoPdf = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// ── Campos por proceso ────────────────────────────────────────
const CAMPOS_PROCESO: Record<string, { key: string; label: string; readOnly?: boolean }[]> = {
  extrusion: [
    { key: "kilos_extruir",    label: "Kilos a extruir",    readOnly: true },
    { key: "metros_extruir",   label: "Metros a extruir",   readOnly: true },
    { key: "merma",            label: "Merma (kg)" },
    { key: "k_para_impresion", label: "Kilos p/ impresión" },
    { key: "metros_extruidos", label: "Metros extruidos" },
  ],
  impresion: [
    { key: "kilos_imprimir",   label: "Kilos a imprimir",   readOnly: true },
    { key: "metros_imprimir",  label: "Metros a imprimir",  readOnly: true },
    { key: "merma",            label: "Merma (kg)" },
    { key: "kilos_impresos",   label: "Kilos impresos" },
    { key: "metros_impresos",  label: "Metros impresos" },
  ],
  bolseo: [
    { key: "kilos_bolsear",    label: "Kilos a bolsear",    readOnly: true },
    { key: "kilos_bolseados",  label: "Kilos bolseados" },
    { key: "kilos_merma",      label: "Kilos merma" },
    { key: "piezas_bolseadas", label: "Piezas bolseadas" },
    { key: "piezas_merma",     label: "Piezas merma" },
  ],
  asa_flexible: [
    { key: "kilos_bolsear",    label: "Kilos a bolsear",    readOnly: true },
    { key: "merma",            label: "Merma (kg)" },
    { key: "piezas_recibidas", label: "Piezas recibidas" },
  ],
};

// ── Cálculo automático de extrusión ──────────────────────────
function calcularExtrusion(pedido: PedidoSeguimiento) {
  const alto     = parseFloat(pedido.altura)        || 0;
  const ancho    = parseFloat(pedido.ancho)         || 0;
  const fFondo   = parseFloat(pedido.fuelle_fondo)  || 0;
  const fLatIz   = parseFloat(pedido.fuelle_lat_iz) || 0;
  const fLatDe   = parseFloat(pedido.fuelle_lat_de) || 0;
  const refuerzo = parseFloat(pedido.refuerzo)      || 0;
  const piezas   = pedido.cantidad_orden            || 0;

  let anchoBobina: number;
  let repeticion: number;

  if (fFondo > 0 || refuerzo > 0) {
    anchoBobina = alto + fFondo + refuerzo;
    repeticion  = ancho + fLatIz + fLatDe;
  } else {
    anchoBobina = ancho + fLatIz + fLatDe;
    repeticion  = alto;
  }

  const metros = repeticion > 0 ? piezas * (repeticion / 100) : 0;
  const repsPorMetro = repeticion > 0 ? Math.round((100 / repeticion) * 100) / 100 : 0;

  return {
    ancho_bobina:   Math.round(anchoBobina * 100) / 100,
    metros_extruir: Math.round(metros      * 100) / 100,
    kilos_extruir:  pedido.kilogramos_orden || 0,
    repeticion_cm:  repeticion,
    reps_por_metro: repsPorMetro,
    orientacion:    (fFondo > 0 || refuerzo > 0) ? "horizontal" : "vertical",
  };
}

// ── Tarjeta especificaciones ──────────────────────────────────
function TarjetaProducto({ pedido }: { pedido: PedidoSeguimiento }) {
  const cantidad = pedido.modo_cantidad === "kilo" && pedido.kilogramos_orden
    ? `${pedido.kilogramos_orden} kg`
    : pedido.cantidad_orden
      ? pedido.cantidad_orden.toLocaleString("es-MX")
      : "—";

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 space-y-1.5">
      <p className="text-sm font-semibold text-gray-900 leading-tight">
        {pedido.nombre_producto || "—"}
        {pedido.medida && <span className="font-normal text-gray-500"> · {pedido.medida}</span>}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
        {pedido.material && <span><span className="text-gray-400">Material </span>{pedido.material}</span>}
        {pedido.calibre && <span><span className="text-gray-400">Calibre </span>{pedido.calibre}</span>}
        <span><span className="text-gray-400">Cantidad </span>{cantidad}</span>
        {pedido.tintas != null && <span><span className="text-gray-400">Tintas </span>{pedido.tintas}</span>}
        {pedido.caras != null && <span><span className="text-gray-400">Caras </span>{pedido.caras}</span>}
        {pedido.asa_suaje && <span><span className="text-gray-400">Asa / Suaje </span>{pedido.asa_suaje}</span>}
        {pedido.pigmentos && <span><span className="text-gray-400">Pigmento </span>{pedido.pigmentos}</span>}
        {pedido.pantones && <span><span className="text-gray-400">Pantones </span>{pedido.pantones}</span>}
        {pedido.bk && <span className="px-1.5 py-0.5 bg-gray-800 text-white rounded text-xs">BK</span>}
        {pedido.foil && <span className="px-1.5 py-0.5 bg-yellow-500 text-white rounded text-xs">FOIL</span>}
      </div>
      {pedido.observacion && (
        <p className="text-sm text-gray-500 italic leading-tight border-t border-gray-200 pt-1.5">
          {pedido.observacion}
        </p>
      )}
    </div>
  );
}

// ── Modal proceso individual ──────────────────────────────────
function ModalProcesoIndividual({
  pedido,
  nombreProceso,
  onClose,
  onActualizar,
}: {
  pedido: PedidoSeguimiento;
  nombreProceso: string;
  onClose: () => void;
  onActualizar: () => void;
}) {
  const [datos, setDatos] = useState<ProcesosOrdenRespuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState<"iniciar" | "finalizar" | null>(null);
  const [formDatos, setFormDatos] = useState<Record<string, any>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await getProcesosOrden(pedido.idproduccion!);
      setDatos(res);
    } catch {
      setError("No se pudieron cargar los procesos.");
    } finally {
      setCargando(false);
    }
  };

  const proc = datos?.procesos.find(
    p => p.tabla === nombreProceso || p.nombre_proceso === nombreProceso
  );
  const esActual = datos?.proceso_actual === proc?.idproceso_cat;

  const calculados = nombreProceso === "extrusion" ? calcularExtrusion(pedido) : null;
  const campos = CAMPOS_PROCESO[nombreProceso] ?? [];

  const colorEstado = (estado: string) => {
    if (estado === "terminado")  return "text-green-700 bg-green-50 border-green-300";
    if (estado === "en_proceso") return "text-yellow-700 bg-yellow-50 border-yellow-300";
    if (estado === "resagado")   return "text-white bg-black border-black";
    if (estado === "no_aplica")  return "text-gray-400 bg-gray-100 border-gray-200";
    return "text-orange-700 bg-orange-50 border-orange-300";
  };

  const textoEstado = (estado: string) => {
    const m: Record<string, string> = {
      terminado: "Terminado", en_proceso: "En proceso",
      resagado: "Resagado",   no_aplica: "No aplica",
      pendiente: "Pendiente",
    };
    return m[estado] ?? estado;
  };

  const handleIniciar = async () => {
    if (!pedido.idproduccion) return;
    setGuardando(true);
    setError(null);
    try {
      await iniciarProceso(pedido.idproduccion);
      await cargar();
      onActualizar();
      setAccion(null);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al iniciar proceso");
    } finally {
      setGuardando(false);
    }
  };

  const handleFinalizar = async () => {
    if (!pedido.idproduccion) return;
    setGuardando(true);
    setError(null);
    try {
      await finalizarProceso(pedido.idproduccion, formDatos);
      await cargar();
      onActualizar();
      setAccion(null);
      setFormDatos({});
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al finalizar proceso");
    } finally {
      setGuardando(false);
    }
  };

  const handleAbrirFinalizar = () => {
    const preFill: Record<string, any> = {};

    if (calculados) {
      preFill.kilos_extruir  = calculados.kilos_extruir;
      preFill.metros_extruir = calculados.metros_extruir;
    }

    if (proc?.registro) {
      campos.forEach(c => {
        if (proc.registro[c.key] != null) preFill[c.key] = proc.registro[c.key];
      });
    }

    setFormDatos(preFill);
    setAccion("finalizar");
  };

  const puedeIniciar   = esActual && proc?.estado === "pendiente";
  const puedeFinalizar = esActual && proc?.registro?.fecha_inicio && proc?.estado !== "terminado";
  const nombreLabel    = nombreProceso.replace("_", " ");

  return (
    <div className="space-y-4 min-w-[440px]">

      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-900">{pedido.no_produccion}</p>
          <p className="text-xs text-gray-500">Pedido #{pedido.no_pedido} · {pedido.cliente}</p>
        </div>
        {proc && (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colorEstado(proc.estado)}`}>
            {textoEstado(proc.estado)}
          </span>
        )}
      </div>

      <TarjetaProducto pedido={pedido} />

      {calculados && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
            📐 Cálculo de bobina —{" "}
            <span className="normal-case font-normal text-blue-600">
              {calculados.orientacion === "horizontal"
                ? "Extrusión horizontal (fuelle de fondo)"
                : "Extrusión vertical (fuelle lateral)"}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
              <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Ancho bobina</p>
              <p className="text-sm font-bold text-blue-800">{calculados.ancho_bobina} cm</p>
            </div>
            <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
              <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Repetición</p>
              <p className="text-sm font-bold text-blue-800">{calculados.repeticion_cm} cm</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
              <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Reps / metro</p>
              <p className="text-sm font-bold text-blue-800">{calculados.reps_por_metro}</p>
            </div>
            <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
              <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Metros</p>
              <p className="text-sm font-bold text-blue-800">{calculados.metros_extruir} m</p>
            </div>
            <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
              <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Kilos</p>
              <p className="text-sm font-bold text-blue-800">{calculados.kilos_extruir} kg</p>
            </div>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error && !proc ? (
        <p className="text-red-600 text-sm text-center">{error}</p>
      ) : !proc ? (
        <p className="text-gray-500 text-sm text-center">Proceso no encontrado.</p>
      ) : (
        <>
          {proc.registro && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registro</p>
              {proc.registro.fecha_inicio && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Inicio</span>
                  <span className="text-gray-800 font-medium">
                    {new Date(proc.registro.fecha_inicio).toLocaleString("es-MX")}
                  </span>
                </div>
              )}
              {proc.registro.fecha_fin && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Fin</span>
                  <span className="text-gray-800 font-medium">
                    {new Date(proc.registro.fecha_fin).toLocaleString("es-MX")}
                  </span>
                </div>
              )}
              {campos.map(campo => {
                const val = proc.registro?.[campo.key];
                if (val === null || val === undefined) return null;
                return (
                  <div key={campo.key} className="flex justify-between text-xs">
                    <span className="text-gray-400">{campo.label}</span>
                    <span className={`font-medium ${campo.readOnly ? "text-blue-700" : "text-gray-800"}`}>
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {!esActual && proc.estado !== "terminado" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-yellow-800 text-sm">
                Este proceso aún no es el actual. Deben completarse los procesos anteriores primero.
              </p>
            </div>
          )}

          {proc.estado === "terminado" && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 text-sm font-medium">Proceso completado</p>
            </div>
          )}

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {error}
            </div>
          )}

          {puedeIniciar && accion !== "finalizar" && (
            <button
              onClick={accion === "iniciar" ? handleIniciar : () => setAccion("iniciar")}
              disabled={guardando}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {guardando && accion === "iniciar"
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span>▶</span>
              }
              {accion === "iniciar" ? "Confirmar inicio" : `Iniciar ${nombreLabel}`}
            </button>
          )}
          {accion === "iniciar" && (
            <button
              onClick={() => setAccion(null)}
              className="w-full py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}

          {puedeFinalizar && accion !== "iniciar" && (
            <>
              {accion !== "finalizar" ? (
                <button
                  onClick={handleAbrirFinalizar}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  ✓ Finalizar {nombreLabel}
                </button>
              ) : (
                <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700">Datos de finalización</p>
                  {campos.map(campo => (
                    <div key={campo.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {campo.label}
                        {campo.readOnly && (
                          <span className="ml-1.5 text-[10px] text-blue-500 font-normal uppercase tracking-wide">
                            calculado
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={formDatos[campo.key] ?? ""}
                        onChange={e =>
                          !campo.readOnly &&
                          setFormDatos(prev => ({ ...prev, [campo.key]: e.target.value }))
                        }
                        readOnly={campo.readOnly}
                        className={`w-full px-3 py-1.5 border rounded text-sm focus:outline-none
                          ${campo.readOnly
                            ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold cursor-not-allowed"
                            : "border-gray-300 focus:ring-2 focus:ring-green-400"
                          }`}
                        placeholder="0"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setAccion(null); setFormDatos({}); }}
                      className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleFinalizar}
                      disabled={guardando}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
                    >
                      {guardando
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : null
                      }
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button
          onClick={onClose}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ── Botón PDF ─────────────────────────────────────────────────
function BotonPdfDirecto({ pedido }: { pedido: PedidoSeguimiento }) {
  const [descargando, setDescargando] = useState(false);

  const handleDescargar = async () => {
    setDescargando(true);
    try {
      const data = await getOrdenProduccion(pedido.no_pedido);
      const producto: OrdenProduccionProducto | undefined = data.productos.find(
        p => p.no_produccion === pedido.no_produccion
      );
      if (!producto) { alert("No se encontró la orden."); return; }
      await generarPdfOrdenProduccion({
        no_pedido: data.no_pedido, no_produccion: producto.no_produccion,
        fecha: data.fecha, fecha_produccion: producto.fecha_produccion,
        fecha_aprobacion_diseno: producto.fecha_aprobacion_diseno,
        cliente: data.cliente, empresa: data.empresa,
        telefono: data.telefono, correo: data.correo, impresion: data.impresion,
        nombre_producto: producto.nombre_producto, categoria: producto.categoria,
        material: producto.material, calibre: producto.calibre, medida: producto.medida,
        altura: producto.altura, ancho: producto.ancho,
        fuelle_fondo: producto.fuelle_fondo, fuelle_lat_iz: producto.fuelle_lat_iz,
        fuelle_lat_de: producto.fuelle_lat_de, refuerzo: producto.refuerzo,
        por_kilo: producto.por_kilo, medidas: producto.medidas,
        tintas: producto.tintas, caras: producto.caras,
        bk: producto.bk, foil: producto.foil, alto_rel: producto.alto_rel,
        laminado: producto.laminado, uv_br: producto.uv_br,
        pigmentos: producto.pigmentos, pantones: producto.pantones,
        asa_suaje: producto.asa_suaje, observacion: producto.observacion,
        cantidad: producto.cantidad, kilogramos: producto.kilogramos,
        modo_cantidad: producto.modo_cantidad,
        kilos_extruir: producto.kilos_extruir ?? null,
        metros_extruir: producto.metros_extruir ?? null,
      });
    } catch {
      alert("No se pudo generar el PDF.");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 justify-center">
      <span className="text-xs font-medium text-gray-700">{pedido.no_produccion}</span>
      <button
        onClick={handleDescargar}
        disabled={descargando}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-medium rounded transition-colors"
      >
        {descargando
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <IconoPdf />
        }
        PDF
      </button>
    </div>
  );
}

function RenderOrdenProduccion({ pedido }: { pedido: PedidoSeguimiento }) {
  if (!pedido.puede_pdf || !pedido.no_produccion) {
    const tooltip = !pedido.anticipo_cubierto && !pedido.diseno_aprobado
      ? "Falta anticipo y diseño"
      : !pedido.anticipo_cubierto ? "Falta anticipo"
        : "Diseño no aprobado";
    return (
      <span title={tooltip}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-200 text-gray-400 text-xs rounded cursor-not-allowed">
        <IconoPdf /> PDF
      </span>
    );
  }
  return <BotonPdfDirecto pedido={pedido} />;
}

const COLUMNAS = [
  "Fecha", "N° Pedido", "Cliente", "Tipo",
  "Anticipo", "Diseño", "Orden",
  "Ext", "Imp", "Bol", "Asa", "Pago", "Envío",
];

const COLS_CENTRADAS = new Set([
  "Anticipo", "Diseño", "Orden",
  "Ext", "Imp", "Bol", "Asa", "Pago", "Envío",
]);

const renderThead = (oscuro = false) => (
  <thead className={oscuro ? "bg-gray-900 text-white" : "bg-gray-100 border-b border-gray-200"}>
    <tr>
      {COLUMNAS.map(h => (
        <th key={h} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider
          ${oscuro ? "text-white" : "text-gray-700"}
          ${COLS_CENTRADAS.has(h) ? "text-center" : "text-left"}`}>
          {h}
        </th>
      ))}
    </tr>
  </thead>
);

// ── Componente principal ──────────────────────────────────────
export default function Seguimiento() {
  const [pedidos, setPedidos] = useState<PedidoSeguimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [modalProceso, setModalProceso] = useState<{
    pedido: PedidoSeguimiento;
    nombreProceso: string;
  } | null>(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      setCargando(true);
      setError(null);
      setPedidos(await getSeguimiento());
    } catch {
      setError("No se pudo cargar el seguimiento.");
    } finally {
      setCargando(false);
    }
  };

  const pedidosFiltrados = filtroTipo === "todos"
    ? pedidos
    : pedidos.filter(p => (p.tipo_producto || "").toLowerCase().includes(filtroTipo));

  const renderFila = (pedido: PedidoSeguimiento, grande = false) => {
    const px = grande ? "px-4 py-3" : "px-3 py-2";
    const txt = grande ? "text-sm" : "text-xs";

    const estadoAnticipo = pedido.anticipo_cubierto ? "pagado" : "pendiente";
    const estadoDiseño   = pedido.diseno_aprobado   ? "aprobado" : "pendiente";
    const estadoPago     = pedido.pago_completo      ? "pagado" : "pendiente";
    const tieneOrden     = !!pedido.no_produccion && !!pedido.idproduccion;

    const extEstado = tieneOrden ? pedido.extrusion_estado    : "no-aplica";
    const impEstado = tieneOrden ? pedido.impresion_estado    : "no-aplica";
    const bolEstado = tieneOrden ? pedido.bolseo_estado       : "no-aplica";
    const asaEstado = tieneOrden ? pedido.asa_flexible_estado : "no-aplica";

    const abrirProceso = (nombreProceso: string) => {
      if (!tieneOrden) return;
      setModalProceso({ pedido, nombreProceso });
    };

    return (
      <tr
        key={`${pedido.no_pedido}-${pedido.no_produccion}`}
        className="hover:bg-gray-50 transition-colors border-t border-gray-200"
      >
        <td className={`${px} ${txt} text-gray-900 whitespace-nowrap`}>
          {new Date(pedido.fecha).toLocaleDateString("es-MX")}
        </td>
        <td className={`${px} ${txt} font-medium text-blue-600 whitespace-nowrap`}>
          PED-{pedido.no_pedido}
        </td>
        <td className={`${px} ${txt} text-gray-900`}>{pedido.cliente}</td>
        <td className={`${px}`}>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
            {pedido.tipo_producto || "—"}
          </span>
        </td>
        <td className={`${px} text-center`}><BadgeTexto estado={estadoAnticipo} /></td>
        <td className={`${px} text-center`}><BadgeTexto estado={estadoDiseño} /></td>
        <td className={`${px} text-center`}><RenderOrdenProduccion pedido={pedido} /></td>
        <td className={`${px} text-center`}>
          <Badge estado={extEstado} clickable={tieneOrden && extEstado !== "no-aplica"} onClick={() => abrirProceso("extrusion")} />
        </td>
        <td className={`${px} text-center`}>
          <Badge estado={impEstado} clickable={tieneOrden && impEstado !== "no-aplica"} onClick={() => abrirProceso("impresion")} />
        </td>
        <td className={`${px} text-center`}>
          <Badge estado={bolEstado} clickable={tieneOrden && bolEstado !== "no-aplica"} onClick={() => abrirProceso("bolseo")} />
        </td>
        <td className={`${px} text-center`}>
          <Badge estado={asaEstado} clickable={tieneOrden && asaEstado !== "no-aplica"} onClick={() => abrirProceso("asa_flexible")} />
        </td>
        <td className={`${px} text-center`}><BadgeTexto estado={estadoPago} /></td>
        <td className={`${px} text-center`}><BadgeTexto estado="pendiente" /></td>
      </tr>
    );
  };

  if (cargando) return (
    <Dashboard userName="Administrador">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Cargando seguimiento...</p>
        </div>
      </div>
    </Dashboard>
  );

  if (error) return (
    <Dashboard userName="Administrador">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-3">{error}</p>
          <button onClick={cargar} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            Reintentar
          </button>
        </div>
      </div>
    </Dashboard>
  );

  if (pantallaCompleta) return (
    <div className="p-6 min-h-screen bg-gray-50">
      <button
        onClick={() => setPantallaCompleta(false)}
        className="mb-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cerrar
      </button>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {renderThead(true)}
            <tbody>{pedidosFiltrados.map(p => renderFila(p, true))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <Dashboard userName="Administrador">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Seguimiento de Pedidos</h1>
        <p className="text-gray-600">Monitorea el estado de todos los pedidos en tiempo real</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-gray-700">Filtrar por tipo:</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "todos",    label: "Todos" },
              { key: "plástico", label: "Plástico" },
              { key: "papel",    label: "Papel" },
              { key: "cartón",   label: "Cartón" },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltroTipo(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroTipo === f.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Leyenda:</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { color: "bg-green-500",  label: "Finalizado / Aprobado / Pagado" },
            { color: "bg-yellow-400", label: "En Proceso" },
            { color: "bg-orange-400", label: "Pendiente" },
            { color: "bg-red-500",    label: "Detenido" },
            { color: "bg-black",      label: "Resagado" },
            { color: "bg-gray-300",   label: "No Aplica" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${l.color}`} />
              <span className="text-xs text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Lista de Órdenes
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({pedidosFiltrados.length} orden{pedidosFiltrados.length !== 1 ? "es" : ""})
            </span>
          </h2>
          <button
            onClick={() => setPantallaCompleta(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            {renderThead()}
            <tbody>{pedidosFiltrados.map(p => renderFila(p))}</tbody>
          </table>
        </div>
        {pedidosFiltrados.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-lg font-medium text-gray-900">No hay órdenes</p>
            <p className="text-sm text-gray-500 mt-1">
              No se encontraron órdenes con los filtros seleccionados
            </p>
          </div>
        )}
      </div>

      {modalProceso && (
        <Modal
          isOpen={!!modalProceso}
          onClose={() => setModalProceso(null)}
          title={`${modalProceso.nombreProceso.replace("_", " ").toUpperCase()} — ${modalProceso.pedido.no_produccion}`}
        >
          <ModalProcesoIndividual
            pedido={modalProceso.pedido}
            nombreProceso={modalProceso.nombreProceso}
            onClose={() => setModalProceso(null)}
            onActualizar={cargar}
          />
        </Modal>
      )}
    </Dashboard>
  );
}