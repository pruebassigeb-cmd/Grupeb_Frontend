import { useState, useEffect } from "react";
import {
  getProcesosOrden,
  iniciarProceso,
  finalizarProceso,
  editarProceso,
  registrarAvance,
  getBultos,
  agregarBulto,
  eliminarBulto,
  finalizarBultos,
  getBultosEtiqueta,
  editarBulto as editarBultoService,
} from "../services/seguimientoService";
import type {
  ProcesosOrdenRespuesta,
  AvanceParcial,
  Bulto,
  NuevoBultoPayload,
} from "../services/seguimientoService";
import { generarPdfEtiquetas } from "../services/generarPdfEtiquetas";
import type { PedidoSeguimiento } from "../types/seguimiento.types";

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────
const CAMPOS_PROCESO: Record<string, { key: string; label: string; readOnly?: boolean }[]> = {
  extrusion: [
    { key: "kilos_extruir",    label: "Kilos a extruir",    readOnly: true },
    { key: "metros_extruir",   label: "Metros a extruir",   readOnly: true },
    { key: "merma",            label: "Merma (kg)" },
    { key: "k_para_impresion", label: "Kilos p/ impresion" },
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
    { key: "kilos_merma",      label: "Kilos merma" },
    { key: "kilos_bolseados",  label: "Kilos bolseados" },
    { key: "piezas_merma",     label: "Piezas merma" },
    { key: "piezas_bolseadas", label: "Piezas bolseadas" },
  ],
  asa_flexible: [
    { key: "piezas_recibidas", label: "Pzas recibidas (de bolseo)", readOnly: true },
    { key: "merma",            label: "Merma (pzas)" },
    { key: "pzas_finales",     label: "Piezas finales" },
  ],
};

const AVANCE_UNIDAD: Record<string, { label: string; unidad: string; placeholder: string }> = {
  extrusion:    { label: "Kilos extruidos hoy",   unidad: "kg",   placeholder: "Ej: 120.5" },
  impresion:    { label: "Kilos impresos hoy",     unidad: "kg",   placeholder: "Ej: 85.0"  },
  bolseo:       { label: "Piezas bolseadas hoy",   unidad: "pzas", placeholder: "Ej: 5000"  },
  asa_flexible: { label: "Piezas terminadas hoy",  unidad: "pzas", placeholder: "Ej: 2000"  },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function calcularBobinaVisual(pedido: PedidoSeguimiento) {
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

  const metros       = repeticion > 0 ? piezas * (repeticion / 100) : 0;
  const repsPorMetro = repeticion > 0 ? Math.round((100 / repeticion) * 100) / 100 : 0;

  return {
    ancho_bobina:   Math.round(anchoBobina * 100) / 100,
    metros_extruir: Math.round(metros * 100) / 100,
    kilos_extruir:  pedido.kilogramos_orden || 0,
    repeticion_cm:  repeticion,
    reps_por_metro: repsPorMetro,
    orientacion:    (fFondo > 0 || refuerzo > 0) ? "horizontal" : "vertical",
  };
}

// ─────────────────────────────────────────────
// TARJETA PRODUCTO
// ─────────────────────────────────────────────
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
        {pedido.material  && <span><span className="text-gray-400">Material </span>{pedido.material}</span>}
        {pedido.calibre   && <span><span className="text-gray-400">Calibre </span>{pedido.calibre}</span>}
        <span><span className="text-gray-400">Cantidad </span>{cantidad}</span>
        {pedido.tintas != null && <span><span className="text-gray-400">Tintas </span>{pedido.tintas}</span>}
        {pedido.caras  != null && <span><span className="text-gray-400">Caras </span>{pedido.caras}</span>}
        {pedido.asa_suaje  && <span><span className="text-gray-400">Asa / Suaje </span>{pedido.asa_suaje}</span>}
        {pedido.pigmentos  && <span><span className="text-gray-400">Pigmento </span>{pedido.pigmentos}</span>}
        {pedido.pantones   && <span><span className="text-gray-400">Pantones </span>{pedido.pantones}</span>}
        {pedido.bk   && <span className="px-1.5 py-0.5 bg-gray-800 text-white rounded text-xs">BK</span>}
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

// ─────────────────────────────────────────────
// RESUMEN BOLSAS ORDEN
// ─────────────────────────────────────────────
function ResumenBolsasOrden({ pedido }: { pedido: PedidoSeguimiento }) {
  const cantidadBolsas = pedido.cantidad_orden   ?? null;
  const kilogramos     = pedido.kilogramos_orden ?? null;
  const esKilo         = pedido.modo_cantidad === "kilo";
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
        📦 Cantidad de la orden
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className={`text-center bg-white rounded border px-2 py-2 ${esKilo ? "border-indigo-100" : "border-indigo-300 ring-1 ring-indigo-300"}`}>
          <p className="text-[10px] text-indigo-400 uppercase tracking-wide mb-0.5">
            {esKilo ? "Bolsas (ref)" : "Bolsas pedidas"}
          </p>
          <p className={`text-lg font-bold ${esKilo ? "text-indigo-400" : "text-indigo-800"}`}>
            {cantidadBolsas != null ? cantidadBolsas.toLocaleString("es-MX") : "—"}
          </p>
          <p className="text-[10px] text-indigo-400">pzas</p>
        </div>
        <div className={`text-center bg-white rounded border px-2 py-2 ${esKilo ? "border-indigo-300 ring-1 ring-indigo-300" : "border-indigo-100"}`}>
          <p className="text-[10px] text-indigo-400 uppercase tracking-wide mb-0.5">
            {esKilo ? "Kilogramos" : "Equiv. kg (ref)"}
          </p>
          <p className={`text-lg font-bold ${esKilo ? "text-indigo-800" : "text-indigo-400"}`}>
            {kilogramos != null ? kilogramos.toLocaleString("es-MX") : "—"}
          </p>
          <p className="text-[10px] text-indigo-400">kg</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECCIÓN AVANCES PARCIALES
// ─────────────────────────────────────────────
interface SeccionAvancesProps {
  idproduccion:    number;
  nombreProceso:   string;
  avances:         AvanceParcial[];
  totalAvances:    number;
  onAvanceRegistrado: () => void;
  metaKg:          number | null;
  metaPzas:        number | null;
  modoCantidad:    string;
  limiteAnterior:  number | null;
}

function SeccionAvances({
  idproduccion, nombreProceso, avances, totalAvances, onAvanceRegistrado,
  metaKg, metaPzas, modoCantidad, limiteAnterior,
}: SeccionAvancesProps) {
  const [cantidad,          setCantidad]          = useState("");
  const [observaciones,     setObservaciones]     = useState("");
  const [guardando,         setGuardando]         = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [expandido,         setExpandido]         = useState(false);
  const [formularioAbierto, setFormularioAbierto] = useState(false);

  // En bolseo/asa_flexible, si el pedido es por kilo el avance también es en kg
  const esProcesoPorKilo = modoCantidad === "kilo" &&
    (nombreProceso === "bolseo" || nombreProceso === "asa_flexible");

  const configBase = AVANCE_UNIDAD[nombreProceso] ?? { label: "Cantidad", unidad: "unidades", placeholder: "0" };
  const config = esProcesoPorKilo
    ? { label: "Kilos procesados hoy", unidad: "kg", placeholder: "Ej: 12.5" }
    : configBase;

  const esKg = config.unidad === "kg";
  const meta = esKg ? metaKg : metaPzas;
  const pct      = meta != null && meta > 0 ? Math.min((totalAvances / meta) * 100, 100) : null;
  const restante = meta != null ? Math.max(meta - totalAvances, 0) : null;
  const cantNum  = parseFloat(cantidad) || 0;

  const restanteDelLimite = limiteAnterior != null ? Math.max(limiteAnterior - totalAvances, 0) : null;
  const excedeLimite      = limiteAnterior != null && cantNum > 0 && (totalAvances + cantNum) > limiteAnterior;
  const alcanzaLimite     = limiteAnterior != null && cantNum > 0 && (totalAvances + cantNum) === limiteAnterior;
  const pctLimite         = limiteAnterior != null && limiteAnterior > 0
    ? Math.min((totalAvances / limiteAnterior) * 100, 100) : null;

  const handleRegistrar = async () => {
    const cant = parseFloat(cantidad);
    if (!cant || cant <= 0) { setError("Ingresa una cantidad válida mayor a 0."); return; }
    setGuardando(true); setError(null);
    try {
      await registrarAvance(idproduccion, {
        cantidad: cant,
        observaciones: observaciones.trim() || undefined,
        tabla_proceso: nombreProceso,
      });
      setCantidad(""); setObservaciones("");
      onAvanceRegistrado();
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al registrar avance");
    } finally { setGuardando(false); }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold">📊 Avances del día</span>
          {avances.length > 0 && (
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {avances.length} registro{avances.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-blue-100 text-[10px] uppercase tracking-wide">Total acumulado</p>
            <p className="text-white text-base font-bold leading-tight">
              {totalAvances.toLocaleString("es-MX")} {config.unidad}
            </p>
          </div>
          {avances.length > 0 && (
            <button onClick={() => setExpandido(!expandido)} className="text-blue-100 hover:text-white text-xs underline">
              {expandido ? "Ocultar" : "Ver historial"}
            </button>
          )}
        </div>
      </div>

      {expandido && avances.length > 0 && (
        <div className="border-b border-blue-200 max-h-48 overflow-y-auto">
          {avances.map((a, idx) => (
            <div key={a.idavance}
              className="flex items-start justify-between px-4 py-2.5 border-b border-blue-100 last:border-0 bg-white/50">
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    {Number(a.cantidad).toLocaleString("es-MX")} {a.unidad}
                  </p>
                  {a.observaciones && <p className="text-xs text-gray-600 mt-0.5 italic">{a.observaciones}</p>}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 ml-2 mt-0.5">
                {new Date(a.fecha_registro).toLocaleString("es-MX", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {limiteAnterior != null && (
        <div className="px-4 py-3 bg-white border-b border-blue-100">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-gray-700">
              Límite del proceso anterior
              <span className="ml-1.5 text-[10px] font-normal text-gray-400">(máx. que puede avanzar este proceso)</span>
            </p>
            <p className="text-xs font-bold text-gray-800">{pctLimite != null ? `${Math.round(pctLimite)}%` : "—"}</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div className={`h-2 rounded-full transition-all ${pctLimite != null && pctLimite >= 100 ? "bg-green-500" : "bg-orange-400"}`}
              style={{ width: `${pctLimite ?? 0}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-orange-50 rounded border border-orange-100 px-2 py-1.5">
              <p className="text-[9px] text-orange-400 uppercase tracking-wide">Límite</p>
              <p className="text-xs font-bold text-orange-700">{limiteAnterior.toLocaleString("es-MX")} <span className="text-[9px] font-normal">{config.unidad}</span></p>
            </div>
            <div className="text-center bg-blue-50 rounded border border-blue-100 px-2 py-1.5">
              <p className="text-[9px] text-blue-400 uppercase tracking-wide">Avanzado</p>
              <p className="text-xs font-bold text-blue-700">{totalAvances.toLocaleString("es-MX")} <span className="text-[9px] font-normal">{config.unidad}</span></p>
            </div>
            <div className={`text-center rounded border px-2 py-1.5 ${restanteDelLimite === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-100"}`}>
              <p className="text-[9px] text-amber-400 uppercase tracking-wide">Disponible</p>
              <p className={`text-xs font-bold ${restanteDelLimite === 0 ? "text-green-600" : "text-amber-700"}`}>
                {restanteDelLimite != null ? restanteDelLimite.toLocaleString("es-MX") : "—"} <span className="text-[9px] font-normal">{config.unidad}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {meta != null && (
        <div className="px-4 py-3 bg-white border-b border-blue-100">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-gray-700">Progreso vs meta del pedido</p>
            <p className="text-xs font-bold text-gray-800">{pct != null ? `${Math.round(pct)}%` : "—"}</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
            <div className={`h-2.5 rounded-full transition-all ${pct != null && pct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${pct ?? 0}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-gray-50 rounded border border-gray-100 px-2 py-1.5">
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Meta</p>
              <p className="text-xs font-bold text-gray-700">{meta.toLocaleString("es-MX")} <span className="text-[9px] font-normal">{config.unidad}</span></p>
            </div>
            <div className="text-center bg-blue-50 rounded border border-blue-100 px-2 py-1.5">
              <p className="text-[9px] text-blue-400 uppercase tracking-wide">Avanzado</p>
              <p className="text-xs font-bold text-blue-700">{totalAvances.toLocaleString("es-MX")} <span className="text-[9px] font-normal">{config.unidad}</span></p>
            </div>
            <div className={`text-center rounded border px-2 py-1.5 ${restante === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-100"}`}>
              <p className="text-[9px] text-amber-400 uppercase tracking-wide">Restante</p>
              <p className={`text-xs font-bold ${restante === 0 ? "text-green-600" : "text-amber-700"}`}>
                {restante != null ? restante.toLocaleString("es-MX") : "—"} <span className="text-[9px] font-normal">{config.unidad}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-blue-200">
        <button onClick={() => setFormularioAbierto(!formularioAbierto)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-100 transition-colors">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">➕ Registrar avance de hoy</span>
          <svg className={`w-4 h-4 text-blue-500 transition-transform ${formularioAbierto ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {formularioAbierto && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {config.label} <span className="text-red-500">*</span>
                {restanteDelLimite !== null && restanteDelLimite > 0 && (
                  <span className="ml-2 text-[10px] text-orange-500 font-normal">
                    (máx. {restanteDelLimite.toLocaleString("es-MX")} {config.unidad} disponibles)
                  </span>
                )}
                {restanteDelLimite === 0 && (
                  <span className="ml-2 text-[10px] text-green-600 font-semibold">✓ Límite alcanzado</span>
                )}
              </label>
              <div className="flex gap-2">
                <input type="text" inputMode="decimal" value={cantidad}
                  onChange={e => { setCantidad(e.target.value.replace(/[^0-9.]/g, "")); setError(null); }}
                  onKeyDown={e => e.key === "Enter" && handleRegistrar()}
                  placeholder={config.placeholder}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 bg-white ${
                    excedeLimite ? "border-red-400 focus:ring-red-300" : "border-blue-300 focus:ring-blue-400"
                  }`}
                />
                <span className="flex items-center px-3 py-2 bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700">
                  {config.unidad}
                </span>
              </div>
              {excedeLimite && cantNum > 0 && limiteAnterior != null && (
                <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-200 rounded px-3 py-2">
                  <span className="text-red-500 text-sm mt-0.5 flex-shrink-0">⚠️</span>
                  <div>
                    <p className="text-xs font-semibold text-red-700">Excede el límite del proceso anterior</p>
                    <p className="text-[10px] text-red-600 mt-0.5">
                      Con {cantNum.toLocaleString("es-MX")} {config.unidad} quedarías en{" "}
                      <strong>{(totalAvances + cantNum).toLocaleString("es-MX")}</strong> {config.unidad},
                      superando el máximo de <strong>{limiteAnterior.toLocaleString("es-MX")}</strong> {config.unidad}.
                    </p>
                  </div>
                </div>
              )}
              {alcanzaLimite && (
                <p className="text-[10px] mt-1 font-semibold text-green-600">
                  ✓ Con esto alcanzas exactamente el límite del proceso anterior
                </p>
              )}
              {!excedeLimite && !alcanzaLimite && cantNum > 0 && meta != null && (
                <p className={`text-[10px] mt-1 font-medium ${totalAvances + cantNum >= meta ? "text-green-600" : "text-amber-600"}`}>
                  {totalAvances + cantNum >= meta
                    ? `✓ Con esto se alcanza la meta de ${meta.toLocaleString("es-MX")} ${config.unidad}`
                    : `Quedarán ${Math.max(meta - totalAvances - cantNum, 0).toLocaleString("es-MX")} ${config.unidad} restantes`
                  }
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones del operador</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
                placeholder="Novedades, incidencias o comentarios del turno..."
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
              />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
            <button onClick={handleRegistrar} disabled={guardando || !cantidad || excedeLimite}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {guardando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>📋</span>}
              {guardando ? "Registrando..." : "Registrar avance del día"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TARJETA BULTO
// ─────────────────────────────────────────────
interface NuevoBultoForm {
  cantidad_unidades: string; // principal en modo unidad
  peso_producto:     string; // principal en modo kilo
  peso:  string;             // peso empaquetado (siempre)
  alto:  string;
  largo: string;
  ancho: string;
}
const FORM_VACIO: NuevoBultoForm = {
  cantidad_unidades: "", peso_producto: "", peso: "", alto: "", largo: "", ancho: "",
};

function TarjetaBulto({ bulto, numero, bultosFinalizados, eliminando, onEliminar, onEditar, modoKilo }: {
  bulto: Bulto; numero: number; bultosFinalizados: boolean; modoKilo: boolean;
  eliminando: number | null; onEliminar: (idbulto: number) => void; onEditar: (bulto: Bulto) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">{numero}</span>
          {/* Dato principal según modo */}
          {modoKilo ? (
            <span className="text-sm font-semibold text-gray-800">
              {bulto.peso_producto != null ? bulto.peso_producto.toLocaleString("es-MX") : "—"}
              <span className="text-xs font-normal text-gray-500 ml-1">kg prod.</span>
              {bulto.cantidad_unidades > 0 && (
                <span className="text-xs font-normal text-gray-400 ml-2">
                  ({bulto.cantidad_unidades.toLocaleString("es-MX")} pzas)
                </span>
              )}
            </span>
          ) : (
            <span className="text-sm font-semibold text-gray-800">
              {bulto.cantidad_unidades.toLocaleString("es-MX")}
              <span className="text-xs font-normal text-gray-500 ml-1">pzas</span>
            </span>
          )}
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
            bulto.proceso_origen === "asa_flexible" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
          }`}>
            {bulto.proceso_origen === "asa_flexible" ? "Asa flexible" : "Bolseo"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {new Date(bulto.fecha_creacion).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {!bultosFinalizados && (
            <button onClick={() => onEliminar(bulto.idbulto)} disabled={eliminando === bulto.idbulto}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40">
              {eliminando === bulto.idbulto
                ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
              }
            </button>
          )}
          <button onClick={() => onEditar(bulto)}
            className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      </div>
      {/* Pesos y dimensiones */}
      <div className="px-3 py-2">
        <div className="grid grid-cols-4 gap-1.5">
          {bulto.peso_producto != null && modoKilo && (
            <div className="text-center bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
              <p className="text-[9px] text-orange-500 uppercase tracking-wide leading-tight font-semibold">Prod.</p>
              <p className="text-xs font-bold text-orange-700">{bulto.peso_producto}</p>
              <p className="text-[9px] text-orange-400">kg</p>
            </div>
          )}
          {bulto.peso != null && (
            <div className="text-center bg-orange-50 border border-orange-100 rounded px-2 py-1.5">
              <p className="text-[9px] text-orange-400 uppercase tracking-wide leading-tight">Empaq.</p>
              <p className="text-xs font-bold text-orange-700">{bulto.peso}</p>
              <p className="text-[9px] text-orange-400">kg</p>
            </div>
          )}
          {bulto.alto != null && (
            <div className="text-center bg-teal-50 border border-teal-100 rounded px-2 py-1.5">
              <p className="text-[9px] text-teal-400 uppercase tracking-wide leading-tight">Alto</p>
              <p className="text-xs font-bold text-teal-700">{bulto.alto}</p>
              <p className="text-[9px] text-teal-400">cm</p>
            </div>
          )}
          {bulto.largo != null && (
            <div className="text-center bg-teal-50 border border-teal-100 rounded px-2 py-1.5">
              <p className="text-[9px] text-teal-400 uppercase tracking-wide leading-tight">Largo</p>
              <p className="text-xs font-bold text-teal-700">{bulto.largo}</p>
              <p className="text-[9px] text-teal-400">cm</p>
            </div>
          )}
          {bulto.ancho != null && (
            <div className="text-center bg-teal-50 border border-teal-100 rounded px-2 py-1.5">
              <p className="text-[9px] text-teal-400 uppercase tracking-wide leading-tight">Ancho</p>
              <p className="text-xs font-bold text-teal-700">{bulto.ancho}</p>
              <p className="text-[9px] text-teal-400">cm</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECCIÓN BULTOS
// modoKilo: true = pedido por kilogramos, false = por unidades
// ─────────────────────────────────────────────
function SeccionBultos({
  pedido, cantidadReal, modoKilo, limiteEnCurso,
}: {
  pedido: PedidoSeguimiento;
  cantidadReal?: number | null;
  modoKilo: boolean;
  limiteEnCurso?: number | null; // límite cuando proceso en curso = total_avances acumulado
}) {
  const [bultos,            setBultos]            = useState<Bulto[]>([]);
  const [totalUnidades,     setTotalUnidades]     = useState(0);
  const [totalKg,           setTotalKg]           = useState(0);
  const [bultosFinalizados, setBultosFinalizados] = useState(false);
  const [cargando,          setCargando]          = useState(true);
  const [guardando,         setGuardando]         = useState(false);
  const [finalizando,       setFinalizando]       = useState(false);
  const [confirmFinalizar,  setConfirmFinalizar]  = useState(false);
  const [eliminando,        setEliminando]        = useState<number | null>(null);
  const [form,              setForm]              = useState<NuevoBultoForm>(FORM_VACIO);
  const [error,             setError]             = useState<string | null>(null);
  const [generandoEtiquetas, setGenerandoEtiquetas] = useState(false);
  const [editandoBulto,     setEditandoBulto]     = useState<Bulto | null>(null);
  const [formEditar,        setFormEditar]        = useState<NuevoBultoForm>(FORM_VACIO);
  const [guardandoEdicion,  setGuardandoEdicion]  = useState(false);

  useEffect(() => { cargarBultos(); }, []);

  const cargarBultos = async () => {
    try {
      setCargando(true); setError(null);
      const res = await getBultos(pedido.idproduccion!);
      setBultos(res.bultos);
      setTotalUnidades(res.total_unidades);
      setTotalKg(res.total_kg ?? 0);
      setBultosFinalizados(res.bultos_finalizado);
    } catch { setError("No se pudieron cargar los bultos."); }
    finally { setCargando(false); }
  };

  const abrirEditar = (bulto: Bulto) => {
    setFormEditar({
      cantidad_unidades: bulto.cantidad_unidades > 0 ? String(bulto.cantidad_unidades) : "",
      peso_producto:     bulto.peso_producto != null ? String(bulto.peso_producto) : "",
      peso:  bulto.peso  != null ? String(bulto.peso)  : "",
      alto:  bulto.alto  != null ? String(bulto.alto)  : "",
      largo: bulto.largo != null ? String(bulto.largo) : "",
      ancho: bulto.ancho != null ? String(bulto.ancho) : "",
    });
    setEditandoBulto(bulto); setError(null);
  };

  const handleGuardarEdicion = async () => {
    if (!editandoBulto || !pedido.idproduccion) return;
    setGuardandoEdicion(true); setError(null);
    try {
      const payload: NuevoBultoPayload = {
        cantidad_unidades: formEditar.cantidad_unidades !== "" ? parseInt(formEditar.cantidad_unidades) : null,
        peso_producto:     formEditar.peso_producto !== ""     ? parseFloat(formEditar.peso_producto)   : null,
        peso:  formEditar.peso  !== "" ? parseFloat(formEditar.peso)  : null,
        alto:  formEditar.alto  !== "" ? parseFloat(formEditar.alto)  : null,
        largo: formEditar.largo !== "" ? parseFloat(formEditar.largo) : null,
        ancho: formEditar.ancho !== "" ? parseFloat(formEditar.ancho) : null,
      };
      const actualizado = await editarBultoService(pedido.idproduccion, editandoBulto.idbulto, payload);
      setBultos(prev => prev.map(b => b.idbulto === actualizado.idbulto ? actualizado : b));
      // Recalcular totales
      const nuevosTotal = bultos.map(b => b.idbulto === actualizado.idbulto ? actualizado : b);
      setTotalUnidades(nuevosTotal.reduce((s, b) => s + b.cantidad_unidades, 0));
      setTotalKg(Math.round(nuevosTotal.reduce((s, b) => s + (b.peso_producto ?? 0), 0) * 100) / 100);
      setEditandoBulto(null);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al editar bulto");
    } finally { setGuardandoEdicion(false); }
  };

  const updateForm = (campo: keyof NuevoBultoForm, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  // Validación según modo
  const validarFormulario = (): string | null => {
    if (modoKilo) {
      if (!form.peso_producto.trim() || parseFloat(form.peso_producto) <= 0)
        return "El peso del producto es obligatorio y debe ser mayor a 0.";
    } else {
      const cant = parseInt(form.cantidad_unidades);
      if (!cant || cant <= 0) return "Ingresa una cantidad válida mayor a 0.";
    }
    if (!form.peso.trim() || parseFloat(form.peso) <= 0)
      return "El peso empaquetado es obligatorio.";
    if (!form.alto.trim() || !form.largo.trim() || !form.ancho.trim() ||
        parseFloat(form.alto) <= 0 || parseFloat(form.largo) <= 0 || parseFloat(form.ancho) <= 0)
      return "Las dimensiones del bulto (alto, largo y ancho) son obligatorias.";
    return null;
  };

  // Campos requeridos según modo
  const camposRequeridos = modoKilo
    ? (["peso_producto", "peso", "alto", "largo", "ancho"] as const)
    : (["cantidad_unidades", "peso", "alto", "largo", "ancho"] as const);

  const formularioCompleto = camposRequeridos.every(k => form[k].trim() !== "");
  const camposLlenos = camposRequeridos.filter(k => form[k].trim() !== "").length;

  const pesoProductoNum   = parseFloat(form.peso_producto || "0") || 0;
  const cantidadIngresada = parseInt(form.cantidad_unidades || "0") || 0;
  const proyectadoKg      = totalKg + pesoProductoNum;
  const proyectadoPzas    = totalUnidades + cantidadIngresada;

  // Límite efectivo: terminado → cantidadReal, en curso → limiteEnCurso
  const limiteEfectivo    = cantidadReal ?? limiteEnCurso ?? null;
  const totalActual       = modoKilo ? totalKg : totalUnidades;
  const valorIngresado    = modoKilo ? pesoProductoNum : cantidadIngresada;
  const proyectadoTotal   = totalActual + valorIngresado;
  const excedeLimiteBulto = limiteEfectivo != null && valorIngresado > 0 && proyectadoTotal > limiteEfectivo;
  const completaLimite    = limiteEfectivo != null && valorIngresado > 0 && proyectadoTotal >= limiteEfectivo;
  const disponibleBultos  = limiteEfectivo != null ? Math.max(limiteEfectivo - totalActual, 0) : null;
  const unidadLimite      = modoKilo ? "kg" : "pzas";

  const handleAgregar = async () => {
    const mensajeError = validarFormulario();
    if (mensajeError) { setError(mensajeError); return; }
    setGuardando(true); setError(null);
    try {
      const payload: NuevoBultoPayload = {
        cantidad_unidades: form.cantidad_unidades !== "" ? parseInt(form.cantidad_unidades) : undefined,
        peso_producto:     form.peso_producto !== ""     ? parseFloat(form.peso_producto)   : undefined,
        peso:  form.peso  !== "" ? parseFloat(form.peso)  : undefined,
        alto:  form.alto  !== "" ? parseFloat(form.alto)  : undefined,
        largo: form.largo !== "" ? parseFloat(form.largo) : undefined,
        ancho: form.ancho !== "" ? parseFloat(form.ancho) : undefined,
      };
      const nuevo = await agregarBulto(pedido.idproduccion!, payload);
      setBultos(prev => [...prev, nuevo]);
      setTotalUnidades(prev => prev + nuevo.cantidad_unidades);
      setTotalKg(prev => Math.round((prev + (nuevo.peso_producto ?? 0)) * 100) / 100);
      setForm(FORM_VACIO);
    } catch (e: any) {
      const mensajeBackend = e.response?.data?.error;
      if (mensajeBackend?.includes("último proceso") || mensajeBackend?.includes("completamente terminada")) {
        setError("El proceso aún no está listo para registrar bultos. Asegúrate de que esté en curso con al menos un avance.");
      } else {
        setError(mensajeBackend || "Error al agregar bulto");
      }
    } finally { setGuardando(false); }
  };

  const handleEliminar = async (idbulto: number) => {
    const bulto = bultos.find(b => b.idbulto === idbulto);
    setEliminando(idbulto); setError(null);
    try {
      await eliminarBulto(pedido.idproduccion!, idbulto);
      setBultos(prev => prev.filter(b => b.idbulto !== idbulto));
      setTotalUnidades(prev => prev - (bulto?.cantidad_unidades ?? 0));
      setTotalKg(prev => Math.round((prev - (bulto?.peso_producto ?? 0)) * 100) / 100);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al eliminar bulto");
    } finally { setEliminando(null); }
  };

  const handleFinalizar = async () => {
    setFinalizando(true); setError(null);
    try {
      await finalizarBultos(pedido.idproduccion!);
      setBultosFinalizados(true); setConfirmFinalizar(false);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al finalizar bultos");
    } finally { setFinalizando(false); }
  };

  const handleImprimirEtiquetas = async () => {
    if (!pedido.idproduccion) return;
    setGenerandoEtiquetas(true); setError(null);
    try {
      const etiquetaData = await getBultosEtiqueta(pedido.idproduccion);
      await generarPdfEtiquetas(etiquetaData);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al generar etiquetas");
    } finally { setGenerandoEtiquetas(false); }
  };

  return (
    <div className="space-y-4">
      {/* Totales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Total bultos</p>
          <p className="text-2xl font-bold text-blue-800">{bultos.length}</p>
        </div>
        {modoKilo ? (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 text-center">
            <p className="text-[10px] text-orange-500 uppercase tracking-wide mb-0.5 font-semibold">Total kg producto</p>
            <p className="text-2xl font-bold text-orange-800">{totalKg.toLocaleString("es-MX")}</p>
            <p className="text-[10px] text-orange-400">kg</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-[10px] text-green-400 uppercase tracking-wide mb-0.5">Total unidades</p>
            <p className="text-2xl font-bold text-green-800">{totalUnidades.toLocaleString("es-MX")}</p>
            <p className="text-[10px] text-green-400">pzas</p>
          </div>
        )}
      </div>

      {/* Producción real del proceso */}
      {cantidadReal != null && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">📊 Produccion real del proceso</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-white rounded border border-amber-100 px-2 py-2">
              <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-0.5">Total producido</p>
              <p className="text-lg font-bold text-amber-800">{cantidadReal.toLocaleString("es-MX")}</p>
              <p className="text-[10px] text-amber-400">pzas</p>
            </div>
            <div className="text-center bg-white rounded border border-amber-100 px-2 py-2">
              <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-0.5">Ya en bultos</p>
              <p className="text-lg font-bold text-blue-700">{totalUnidades.toLocaleString("es-MX")}</p>
              <p className="text-[10px] text-amber-400">pzas</p>
            </div>
            <div className={`text-center rounded border px-2 py-2 ${cantidadReal - totalUnidades <= 0 ? "bg-green-50 border-green-200" : "bg-white border-amber-100"}`}>
              <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-0.5">Disponible</p>
              <p className={`text-lg font-bold ${cantidadReal - totalUnidades <= 0 ? "text-green-600" : "text-amber-800"}`}>
                {Math.max(cantidadReal - totalUnidades, 0).toLocaleString("es-MX")}
              </p>
              <p className="text-[10px] text-amber-400">pzas</p>
            </div>
          </div>
        </div>
      )}

      {/* Formulario / estado finalizado */}
      {bultosFinalizados ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800 text-sm font-medium">Bultos finalizados. No se pueden agregar ni eliminar mas registros.</p>
          </div>
          <button onClick={handleImprimirEtiquetas} disabled={generandoEtiquetas}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {generandoEtiquetas
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            }
            {generandoEtiquetas ? "Generando..." : `🏷️ Imprimir Etiquetas PDF (${bultos.length} bulto${bultos.length !== 1 ? "s" : ""})`}
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">➕ Agregar bulto</p>
            <div className="flex items-center gap-1.5">
              {camposRequeridos.map(k => (
                <div key={k} title={k}
                  className={`w-2 h-2 rounded-full transition-colors ${form[k].trim() !== "" ? "bg-green-500" : "bg-gray-300"}`}
                />
              ))}
              <span className="text-[10px] text-gray-400 ml-1">{camposLlenos}/5</span>
            </div>
          </div>

          {/* ── Campo principal según modo ─────────────────────────── */}
          {modoKilo ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Peso del producto (kg) <span className="text-red-500">*</span>
                <span className="ml-1.5 text-[10px] text-orange-500 font-semibold uppercase">Principal</span>
              </label>
              {disponibleBultos !== null && (
                <span className="ml-1.5 text-[10px] text-orange-500 font-normal">
                  (máx. {disponibleBultos.toLocaleString("es-MX")} kg disponibles)
                </span>
              )}
              <div className="flex gap-2 mt-1">
                <input type="text" inputMode="decimal" value={form.peso_producto}
                  onChange={e => { updateForm("peso_producto", e.target.value.replace(/[^0-9.]/g, "")); setError(null); }}
                  onKeyDown={e => e.key === "Enter" && handleAgregar()}
                  placeholder="Ej: 25.50"
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 bg-white ${
                    excedeLimiteBulto ? "border-red-400 focus:ring-red-300" : "border-orange-300 focus:ring-orange-400"
                  }`}
                />
                <span className="flex items-center px-3 py-2 bg-orange-100 border border-orange-200 rounded-lg text-xs font-semibold text-orange-700">kg</span>
              </div>
              {excedeLimiteBulto && (
                <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-200 rounded px-3 py-2">
                  <span className="text-red-500 text-sm flex-shrink-0">⚠️</span>
                  <p className="text-[10px] text-red-600">
                    <strong>Excede lo producido.</strong> Con {pesoProductoNum.toLocaleString("es-MX")} kg llegarías a{" "}
                    {proyectadoTotal.toLocaleString("es-MX")} kg, superando el límite de{" "}
                    {limiteEfectivo?.toLocaleString("es-MX")} kg.
                  </p>
                </div>
              )}
              {!excedeLimiteBulto && pesoProductoNum > 0 && (
                <p className={`text-[10px] mt-1 font-medium ${completaLimite ? "text-green-600" : "text-orange-600"}`}>
                  {completaLimite
                    ? `✓ Con este bulto se completan los ${limiteEfectivo?.toLocaleString("es-MX")} kg`
                    : `Total acumulado: ${proyectadoKg.toLocaleString("es-MX")} kg`
                  }
                </p>
              )}
              {/* Unidades como referencia opcional */}
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Cantidad de unidades <span className="text-gray-400 text-[10px] font-normal">(referencia, opcional)</span>
                </label>
                <input type="text" inputMode="numeric" value={form.cantidad_unidades}
                  onChange={e => updateForm("cantidad_unidades", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Ej: 500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-600"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Cantidad de unidades <span className="text-red-500">*</span>
                {disponibleBultos !== null && (
                  <span className="ml-2 text-[10px] text-gray-400 font-normal">
                    (máx. {disponibleBultos.toLocaleString("es-MX")} {unidadLimite} disponibles)
                  </span>
                )}
              </label>
              <input type="text" inputMode="numeric" value={form.cantidad_unidades}
                onChange={e => { updateForm("cantidad_unidades", e.target.value.replace(/[^0-9]/g, "")); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleAgregar()}
                placeholder="Ej: 3000"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 bg-white ${
                  excedeLimiteBulto ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-400"
                }`}
              />
              {excedeLimiteBulto && (
                <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-200 rounded px-3 py-2">
                  <span className="text-red-500 text-sm flex-shrink-0">⚠️</span>
                  <p className="text-[10px] text-red-600">
                    <strong>Excede lo producido.</strong> Con {cantidadIngresada.toLocaleString("es-MX")} {unidadLimite} llegarías a{" "}
                    {proyectadoTotal.toLocaleString("es-MX")} {unidadLimite}, superando el límite de{" "}
                    {limiteEfectivo?.toLocaleString("es-MX")} {unidadLimite}.
                  </p>
                </div>
              )}
              {!excedeLimiteBulto && cantidadIngresada > 0 && limiteEfectivo != null && (
                <p className={`text-[10px] mt-1 font-medium ${completaLimite ? "text-green-600" : "text-amber-600"}`}>
                  {completaLimite
                    ? `✓ Con este bulto se completa el total de ${limiteEfectivo.toLocaleString("es-MX")} ${unidadLimite}`
                    : `Quedarán ${Math.max(limiteEfectivo - proyectadoTotal, 0).toLocaleString("es-MX")} ${unidadLimite} sin empacar`
                  }
                </p>
              )}
            </div>
          )}

          {/* ── Peso empaquetado + dimensiones (siempre) ─────────── */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Peso empaquetado y dimensiones <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {([
                { key: "peso",  label: "Peso emp. (kg)", color: "orange" },
                { key: "alto",  label: "Alto (cm)",      color: "teal"   },
                { key: "largo", label: "Largo (cm)",     color: "teal"   },
                { key: "ancho", label: "Ancho (cm)",     color: "teal"   },
              ] as const).map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-[10px] font-medium text-${color}-600 mb-1 uppercase tracking-wide`}>
                    {label} <span className="text-red-500">*</span>
                  </label>
                  <input type="text" inputMode="decimal" value={form[key]}
                    onChange={e => { updateForm(key, e.target.value.replace(/[^0-9.]/g, "")); setError(null); }}
                    placeholder="0.0"
                    className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-${color}-300 placeholder-${color}-300 text-${color}-800 ${
                      form[key].trim() !== "" ? `border-${color}-400 bg-${color}-50` : "border-red-200 bg-red-50"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleAgregar} disabled={guardando || !formularioCompleto || excedeLimiteBulto}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {guardando
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <span className="text-base leading-none">+</span>
            }
            Agregar bulto
          </button>
        </div>
      )}

      {error && <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{error}</div>}

      {cargando ? (
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bultos.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">No hay bultos registrados aun</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {bultos.map((b, idx) => (
            <TarjetaBulto key={b.idbulto} bulto={b} numero={idx + 1} modoKilo={modoKilo}
              bultosFinalizados={bultosFinalizados} eliminando={eliminando}
              onEliminar={handleEliminar} onEditar={abrirEditar} />
          ))}
        </div>
      )}

      {!bultosFinalizados && bultos.length > 0 && (
        <>
          {!confirmFinalizar ? (
            <button onClick={() => setConfirmFinalizar(true)}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Finalizar bultos
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
              <p className="text-sm font-semibold text-amber-800">⚠️ ¿Confirmas que ya no se agregaran mas bultos?</p>
              <p className="text-xs text-amber-700">Esta accion es irreversible.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmFinalizar(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={handleFinalizar} disabled={finalizando}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
                  {finalizando && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Si, finalizar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal editar bulto */}
      {editandoBulto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">✏️ Editar Bulto #{editandoBulto.idbulto}</p>
              <button onClick={() => setEditandoBulto(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {modoKilo ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Peso del producto (kg) <span className="text-red-500">*</span>
                </label>
                <input type="text" inputMode="decimal" value={formEditar.peso_producto}
                  onChange={e => setFormEditar(p => ({ ...p, peso_producto: e.target.value.replace(/[^0-9.]/g, "") }))}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Ej: 25.50" />
                <label className="block text-xs font-medium text-gray-500 mt-2 mb-1">Unidades (referencia)</label>
                <input type="text" inputMode="numeric" value={formEditar.cantidad_unidades}
                  onChange={e => setFormEditar(p => ({ ...p, cantidad_unidades: e.target.value.replace(/[^0-9]/g, "") }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="Ej: 500" />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cantidad de unidades <span className="text-red-500">*</span>
                </label>
                <input type="text" inputMode="numeric" value={formEditar.cantidad_unidades}
                  onChange={e => setFormEditar(p => ({ ...p, cantidad_unidades: e.target.value.replace(/[^0-9]/g, "") }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Ej: 3000" />
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Peso empaquetado y dimensiones</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "peso",  label: "Peso emp. (kg)", color: "orange" },
                  { key: "alto",  label: "Alto (cm)",      color: "teal"   },
                  { key: "largo", label: "Largo (cm)",     color: "teal"   },
                  { key: "ancho", label: "Ancho (cm)",     color: "teal"   },
                ] as const).map(({ key, label, color }) => (
                  <div key={key}>
                    <label className={`block text-[10px] font-medium text-${color}-600 mb-1 uppercase tracking-wide`}>{label}</label>
                    <input type="text" inputMode="decimal" value={formEditar[key]}
                      onChange={e => setFormEditar(p => ({ ...p, [key]: e.target.value.replace(/[^0-9.]/g, "") }))}
                      placeholder="0.0"
                      className={`w-full px-2 py-1.5 border border-${color}-200 rounded text-sm bg-${color}-50 text-${color}-800 focus:outline-none focus:ring-2 focus:ring-${color}-300`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setEditandoBulto(null); setError(null); }}
                className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleGuardarEdicion}
                disabled={guardandoEdicion || (modoKilo ? !formEditar.peso_producto : !formEditar.cantidad_unidades)}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
                {guardandoEdicion && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL PROCESO INDIVIDUAL
// ─────────────────────────────────────────────
interface Props {
  pedido:        PedidoSeguimiento;
  nombreProceso: string;
  onClose:       () => void;
  onActualizar:  () => void;
}

export default function ModalProcesoIndividual({ pedido, nombreProceso, onClose, onActualizar }: Props) {
  const [datos,               setDatos]               = useState<ProcesosOrdenRespuesta | null>(null);
  const [cargando,            setCargando]            = useState(true);
  const [accion,              setAccion]              = useState<"iniciar" | "finalizar" | null>(null);
  const [formDatos,           setFormDatos]           = useState<Record<string, any>>({});
  const [guardando,           setGuardando]           = useState(false);
  const [error,               setError]               = useState<string | null>(null);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState<"kidder" | "sicosa" | "">("");
  const [observaciones,       setObservaciones]       = useState("");
  const [editando,            setEditando]            = useState(false);
  const [formEditar,          setFormEditar]          = useState<Record<string, any>>({});
  const [obsEditar,           setObsEditar]           = useState("");
  const [guardandoEdit,       setGuardandoEdit]       = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      setCargando(true); setError(null);
      const res = await getProcesosOrden(pedido.idproduccion!);
      setDatos(res);
      const proc = res.procesos.find((p: any) => p.tabla === nombreProceso || p.nombre_proceso === nombreProceso);
      if (proc?.registro?.observaciones) setObservaciones(proc.registro.observaciones);
    } catch { setError("No se pudieron cargar los procesos."); }
    finally { setCargando(false); }
  };

  const proc     = datos?.procesos.find((p: any) => p.tabla === nombreProceso || p.nombre_proceso === nombreProceso);
  const esActual = datos?.proceso_actual === proc?.idproceso_cat || proc?.estado === "en_proceso";

  const procIndex    = datos?.procesos.findIndex((p: any) => p.tabla === nombreProceso || p.nombre_proceso === nombreProceso) ?? -1;
  const procAnterior = procIndex > 0 ? datos?.procesos[procIndex - 1] : null;
  const anteriorTieneAvancesOTerminado =
    procAnterior?.estado === "terminado" ||
    (procAnterior?.avances != null && procAnterior.avances.length > 0);
  const anteriorTerminado = procAnterior == null || procAnterior?.estado === "terminado";

  const modoKilo     = pedido.modo_cantidad === "kilo";
  const bobinaVisual = nombreProceso === "extrusion" ? calcularBobinaVisual(pedido) : null;
  const campos       = CAMPOS_PROCESO[nombreProceso] ?? [];
  const limiteAnterior: number | null = (proc as any)?.limite_avance ?? null;

  const repeticionMaquina = maquinaSeleccionada === "kidder"
    ? (datos?.repeticion_kidder ?? null)
    : maquinaSeleccionada === "sicosa"
      ? (datos?.repeticion_sicosa ?? null)
      : null;

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
      resagado: "Resagado", no_aplica: "No aplica", pendiente: "Pendiente",
    };
    return m[estado] ?? estado;
  };

  const handleIniciar = async () => {
    if (!pedido.idproduccion) return;
    if (nombreProceso === "impresion" && !maquinaSeleccionada) {
      setError("Debes seleccionar una maquina antes de iniciar."); return;
    }
    setGuardando(true); setError(null);
    try {
      const datosProceso: Record<string, any> = {};
      if (nombreProceso === "impresion" && maquinaSeleccionada) {
        datosProceso.maquina    = maquinaSeleccionada;
        datosProceso.repeticion = repeticionMaquina ?? null;
      }
      await iniciarProceso(pedido.idproduccion, datosProceso);
      await cargar(); onActualizar(); setAccion(null); setMaquinaSeleccionada("");
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al iniciar proceso");
    } finally { setGuardando(false); }
  };

  const handleFinalizar = async () => {
    if (!pedido.idproduccion) return;
    setGuardando(true); setError(null);
    try {
      await finalizarProceso(pedido.idproduccion, {
        ...formDatos, observaciones: observaciones.trim() || null, tabla_proceso: nombreProceso,
      });
      await cargar(); onActualizar(); setAccion(null); setFormDatos({});
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al finalizar proceso");
    } finally { setGuardando(false); }
  };

  const handleAbrirFinalizar = () => {
    const preFill: Record<string, any> = {};
    if (nombreProceso === "extrusion") {
      preFill.kilos_extruir  = proc?.registro?.kilos_extruir  ?? pedido.kilos_merma  ?? 0;
      preFill.metros_extruir = proc?.registro?.metros_extruir ?? pedido.metros_merma ?? 0;
    }
    if (nombreProceso === "impresion") {
      const extProc = datos?.procesos.find((p: any) => p.tabla === "extrusion");
      preFill.kilos_imprimir  = proc?.registro?.kilos_imprimir  ?? extProc?.registro?.k_para_impresion ?? 0;
      preFill.metros_imprimir = proc?.registro?.metros_imprimir ?? extProc?.registro?.metros_extruidos ?? 0;
    }
    if (nombreProceso === "bolseo") {
      const impProc = datos?.procesos.find((p: any) => p.tabla === "impresion");
      preFill.kilos_bolsear = proc?.registro?.kilos_bolsear ?? impProc?.registro?.kilos_impresos ?? 0;
    }
    if (nombreProceso === "asa_flexible") {
      const bolProc = datos?.procesos.find((p: any) => p.tabla === "bolseo");
      preFill.piezas_recibidas = proc?.registro?.piezas_recibidas ?? bolProc?.registro?.piezas_bolseadas ?? 0;
    }
    setFormDatos(preFill); setAccion("finalizar");
  };

  const handleAbrirEditar = () => {
    const preFill: Record<string, any> = {};
    if (proc?.registro) {
      campos.forEach((c: any) => {
        if (proc.registro[c.key] != null) preFill[c.key] = proc.registro[c.key];
      });
      if (nombreProceso === "impresion" && proc.registro.maquina) {
        const partes = proc.registro.maquina.split(" | ");
        preFill.maquina    = partes[0] ?? "";
        preFill.repeticion = partes[1] ?? "";
      }
      if (proc.registro.fecha_inicio) preFill.fecha_inicio = proc.registro.fecha_inicio?.slice(0, 16);
      if (proc.registro.fecha_fin)    preFill.fecha_fin    = proc.registro.fecha_fin?.slice(0, 16);
    }
    setFormEditar(preFill); setObsEditar(proc?.registro?.observaciones ?? "");
    setEditando(true); setError(null);
  };

  const handleGuardarEdicion = async () => {
    if (!pedido.idproduccion) return;
    setGuardandoEdit(true); setError(null);
    try {
      await editarProceso(pedido.idproduccion, nombreProceso, {
        ...formEditar, observaciones: obsEditar.trim() || null,
      });
      await cargar(); onActualizar(); setEditando(false);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al guardar los cambios");
    } finally { setGuardandoEdit(false); }
  };

  const tienePendienteSinIniciar = proc?.registro != null && !proc?.registro?.fecha_inicio;
  const puedeIniciar   = (datos?.proceso_actual === proc?.idproceso_cat && proc?.estado === "pendiente") || tienePendienteSinIniciar;
  const puedeFinalizar = proc?.estado === "en_proceso" && proc?.registro?.fecha_inicio && anteriorTerminado;
  const puedeAvance    = proc?.estado === "en_proceso" && proc?.registro?.fecha_inicio;
  const nombreLabel    = nombreProceso.replace("_", " ");

  const getNombreProcesoAnterior = () => {
    if (nombreProceso === "impresion")    return "Extrusion";
    if (nombreProceso === "bolseo")       return "Impresion";
    if (nombreProceso === "asa_flexible") return "Bolseo";
    return null;
  };
  const nombreProcesoAnterior   = getNombreProcesoAnterior();
  const observacionesAnteriores = proc?.observaciones_proceso_anterior;

  const esUltimoProceso = (() => {
    const tieneAsa = pedido.asa_flexible_estado !== "no-aplica" && pedido.asa_flexible_estado !== undefined;
    return (tieneAsa && nombreProceso === "asa_flexible") || (!tieneAsa && nombreProceso === "bolseo");
  })();

  // Límite para bultos cuando el proceso está TERMINADO
  // Modo unidad → piezas; modo kilo → kilos del campo final
  const cantidadRealBultos = esUltimoProceso && proc?.estado === "terminado"
    ? (nombreProceso === "asa_flexible"
        ? (modoKilo
            ? (proc?.registro?.kilos_finales    != null ? Number(proc.registro.kilos_finales)    : null)
            : (proc?.registro?.pzas_finales     != null ? Number(proc.registro.pzas_finales)     : null))
        : (modoKilo
            ? (proc?.registro?.kilos_bolseados  != null ? Number(proc.registro.kilos_bolseados)  : null)
            : (proc?.registro?.piezas_bolseadas != null ? Number(proc.registro.piezas_bolseadas) : null)))
    : null;

  // Límite para bultos cuando el proceso está EN CURSO
  // = lo que se ha acumulado en avances hasta ahora
  const limiteEnCursoBultos = esUltimoProceso && proc?.estado === "en_proceso"
    ? (proc?.total_avances ?? null)
    : null;

  return (
    <div className="space-y-4 min-w-[480px] max-w-2xl">
      {/* Header */}
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

      {(nombreProceso === "bolseo" || nombreProceso === "asa_flexible") && (
        <ResumenBolsasOrden pedido={pedido} />
      )}

      {nombreProcesoAnterior && observacionesAnteriores && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className="text-amber-600 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                📝 Observaciones de {nombreProcesoAnterior}
              </p>
              <p className="text-sm text-amber-900 bg-white bg-opacity-50 p-2 rounded border border-amber-200">
                {observacionesAnteriores}
              </p>
            </div>
          </div>
        </div>
      )}

      {bobinaVisual && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
            📐 Calculo de bobina —{" "}
            <span className="normal-case font-normal text-blue-600">
              {bobinaVisual.orientacion === "horizontal" ? "Extrusion horizontal (fuelle de fondo)" : "Extrusion vertical (fuelle lateral)"}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
              <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Ancho bobina</p>
              <p className="text-sm font-bold text-blue-800">{bobinaVisual.ancho_bobina} cm</p>
            </div>
            <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
              <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Repeticion</p>
              <p className="text-sm font-bold text-blue-800">{bobinaVisual.repeticion_cm} cm</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
              <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Reps / metro</p>
              <p className="text-sm font-bold text-blue-800">{bobinaVisual.reps_por_metro}</p>
            </div>
            <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
              <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Metros (sin merma)</p>
              <p className="text-sm font-bold text-blue-800">{bobinaVisual.metros_extruir} m</p>
            </div>
            <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
              <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Kilos (sin merma)</p>
              <p className="text-sm font-bold text-blue-800">{bobinaVisual.kilos_extruir} kg</p>
            </div>
          </div>
          {(pedido.kilos_merma || pedido.metros_merma) && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="text-center bg-amber-50 rounded border border-amber-200 px-2 py-2">
                <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-0.5 font-semibold">Metros con merma</p>
                <p className="text-sm font-bold text-amber-700">{pedido.metros_merma} m</p>
              </div>
              <div className="text-center bg-amber-50 rounded border border-amber-200 px-2 py-2">
                <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-0.5 font-semibold">Kilos con merma</p>
                <p className="text-sm font-bold text-amber-700">{pedido.kilos_merma} kg</p>
              </div>
            </div>
          )}
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
                  <span className="text-gray-800 font-medium">{new Date(proc.registro.fecha_inicio).toLocaleString("es-MX")}</span>
                </div>
              )}
              {proc.registro.fecha_fin && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Fin</span>
                  <span className="text-gray-800 font-medium">{new Date(proc.registro.fecha_fin).toLocaleString("es-MX")}</span>
                </div>
              )}
              {nombreProceso === "impresion" && proc.registro.maquina && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Maquina</span>
                  <span className="font-semibold text-indigo-700 capitalize">{proc.registro.maquina}</span>
                </div>
              )}
              {campos.map((campo: any) => {
                const val = proc.registro?.[campo.key];
                if (val === null || val === undefined) return null;
                return (
                  <div key={campo.key} className="flex justify-between text-xs">
                    <span className="text-gray-400">{campo.label}</span>
                    <span className={`font-medium ${campo.readOnly ? "text-blue-700" : "text-gray-800"}`}>{val}</span>
                  </div>
                );
              })}
              {proc.registro.observaciones && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-1">📝 Observaciones del operador</p>
                  <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">{proc.registro.observaciones}</p>
                </div>
              )}
            </div>
          )}

          {!esActual && proc.estado === "pendiente" && !tienePendienteSinIniciar && !anteriorTieneAvancesOTerminado && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-yellow-800 text-sm">
                El proceso anterior aún no tiene avances registrados. Cuando registre su primer avance, este proceso quedará disponible para iniciar.
              </p>
            </div>
          )}

          {puedeAvance && (
            <SeccionAvances
              idproduccion={pedido.idproduccion!}
              nombreProceso={nombreProceso}
              avances={proc.avances ?? []}
              totalAvances={proc.total_avances ?? 0}
              onAvanceRegistrado={async () => { await cargar(); onActualizar(); }}
              metaKg={pedido.kilos_merma ?? null}
              metaPzas={pedido.pzas_merma ?? null}
              modoCantidad={pedido.modo_cantidad}
              limiteAnterior={limiteAnterior}
            />
          )}

          {proc.estado === "terminado" && (
            <>
              {(proc.avances ?? []).length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">📋 Historial de avances parciales</p>
                    <span className="text-xs text-gray-500">
                      Total: {(proc.total_avances ?? 0).toLocaleString("es-MX")} {(pedido.modo_cantidad === "kilo" && (nombreProceso === "bolseo" || nombreProceso === "asa_flexible")) ? "kg" : (AVANCE_UNIDAD[nombreProceso]?.unidad ?? "")}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(proc.avances ?? []).map((a: AvanceParcial, idx: number) => (
                      <div key={a.idavance} className="flex items-start justify-between px-4 py-2.5">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {Number(a.cantidad).toLocaleString("es-MX")} {a.unidad}
                            </p>
                            {a.observaciones && <p className="text-xs text-gray-500 mt-0.5 italic">{a.observaciones}</p>}
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 ml-2 mt-0.5">
                          {new Date(a.fecha_registro).toLocaleString("es-MX", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!editando ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-green-800 text-sm font-medium flex-1">Proceso completado</p>
                  <button onClick={handleAbrirEditar}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                    ✏️ Editar datos
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-blue-800">✏️ Editar datos del proceso</p>
                    <span className="text-[10px] text-blue-500 uppercase tracking-wide font-medium">{nombreProceso.replace("_", " ")}</span>
                  </div>
                  {campos.map((campo: any) => (
                    <div key={campo.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {campo.label}
                        {campo.readOnly && <span className="ml-1.5 text-[10px] text-blue-500 font-normal uppercase tracking-wide">calculado</span>}
                      </label>
                      <input type="text" inputMode="decimal" value={formEditar[campo.key] ?? ""}
                        onChange={e => {
                          if (campo.readOnly) return;
                          const esMermaExtrusion = campo.key === "merma" && nombreProceso === "extrusion";
                          setFormEditar((prev: Record<string, any>) => ({
                            ...prev,
                            [campo.key]: e.target.value.replace(esMermaExtrusion ? /[^0-9.-]/g : /[^0-9.]/g, ""),
                          }));
                        }}
                        readOnly={campo.readOnly}
                        className={`w-full px-3 py-1.5 border rounded text-sm focus:outline-none ${
                          campo.readOnly
                            ? "bg-blue-100 border-blue-200 text-blue-700 font-semibold cursor-not-allowed"
                            : "bg-white border-gray-300 focus:ring-2 focus:ring-blue-400"
                        }`}
                        placeholder="0"
                      />
                    </div>
                  ))}
                  {nombreProceso === "impresion" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Maquina</label>
                      <select value={formEditar.maquina ?? ""}
                        onChange={e => setFormEditar((prev: Record<string, any>) => ({ ...prev, maquina: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">— Selecciona —</option>
                        <option value="kidder">Kidder</option>
                        <option value="sicosa">Sicosa</option>
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio</label>
                      <input type="datetime-local" value={formEditar.fecha_inicio ?? ""}
                        onChange={e => setFormEditar((prev: Record<string, any>) => ({ ...prev, fecha_inicio: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
                      <input type="datetime-local" value={formEditar.fecha_fin ?? ""}
                        onChange={e => setFormEditar((prev: Record<string, any>) => ({ ...prev, fecha_fin: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">📝 Observaciones</label>
                    <textarea value={obsEditar} onChange={e => setObsEditar(e.target.value)} rows={3}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Observaciones del operador..." />
                  </div>
                  {error && <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{error}</div>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setEditando(false); setError(null); }}
                      className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button onClick={handleGuardarEdicion} disabled={guardandoEdit}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
                      {guardandoEdit && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Guardar cambios
                    </button>
                  </div>
                </div>
              )}

              {esUltimoProceso && (
                <>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">📦 Registro de bultos</p>
                  </div>
                  <SeccionBultos pedido={pedido} cantidadReal={cantidadRealBultos} modoKilo={modoKilo} limiteEnCurso={null} />
                </>
              )}
            </>
          )}

          {esUltimoProceso && proc.estado === "en_proceso" && (proc.avances ?? []).length > 0 && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">📦 Registro de bultos</p>
                  <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded-full border border-amber-200">
                    Proceso en curso
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Puedes ir registrando bultos conforme vayas terminando.</p>
              </div>
              <SeccionBultos pedido={pedido} cantidadReal={null} modoKilo={modoKilo} limiteEnCurso={limiteEnCursoBultos} />
            </>
          )}

          {esUltimoProceso && proc.estado === "en_proceso" && (proc.avances ?? []).length === 0 && (
            <div className="border-t border-gray-200 pt-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-gray-500 text-sm">📦 El registro de bultos estará disponible cuando registres tu primer avance del día.</p>
              </div>
            </div>
          )}

          {error && !editando && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{error}</div>
          )}

          {nombreProceso === "impresion" && puedeIniciar && accion !== "finalizar" && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">🖨️ Seleccionar maquina de impresion</p>
              <select value={maquinaSeleccionada}
                onChange={e => setMaquinaSeleccionada(e.target.value as "kidder" | "sicosa" | "")}
                className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800">
                <option value="">— Selecciona una maquina —</option>
                <option value="kidder">Kidder{datos?.repeticion_kidder ? ` · ${datos.repeticion_kidder}` : ""}</option>
                <option value="sicosa">Sicosa{datos?.repeticion_sicosa ? ` · ${datos.repeticion_sicosa}` : ""}</option>
              </select>
              {repeticionMaquina && (
                <div className="bg-white border border-indigo-100 rounded px-3 py-2 text-xs text-indigo-700">
                  <span className="font-semibold">Repeticion: </span>{repeticionMaquina}
                </div>
              )}
            </div>
          )}

          {puedeIniciar && accion !== "finalizar" && (
            <button onClick={accion === "iniciar" ? handleIniciar : () => setAccion("iniciar")}
              disabled={guardando || (nombreProceso === "impresion" && !maquinaSeleccionada)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {guardando && accion === "iniciar"
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span>▶</span>
              }
              {accion === "iniciar" ? "Confirmar inicio" : `Iniciar ${nombreLabel}`}
            </button>
          )}
          {accion === "iniciar" && (
            <button onClick={() => { setAccion(null); setMaquinaSeleccionada(""); }}
              className="w-full py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
          )}

          {puedeFinalizar && accion !== "iniciar" && (
            <>
              {accion !== "finalizar" ? (
                <button onClick={handleAbrirFinalizar}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  ✓ Finalizar {nombreLabel}
                </button>
              ) : (
                <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700">Datos de finalizacion</p>
                  {(proc?.avances ?? []).length > 0 && (() => {
                    const esProcKilo = pedido.modo_cantidad === "kilo" &&
                      (nombreProceso === "bolseo" || nombreProceso === "asa_flexible");
                    const configFin  = esProcKilo
                      ? { unidad: "kg" }
                      : (AVANCE_UNIDAD[nombreProceso] ?? { unidad: "unidades" });
                    const config    = configFin;
                    const esKg      = config.unidad === "kg";
                    const meta      = esKg ? (pedido.kilos_merma ?? 0) : (pedido.pzas_merma ?? 0);
                    const acumulado = proc?.total_avances ?? 0;
                    const restante  = Math.max(meta - acumulado, 0);
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">📋 Avances registrados previamente</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center bg-white rounded border border-blue-100 px-2 py-1.5">
                            <p className="text-[9px] text-gray-400 uppercase">Meta</p>
                            <p className="text-xs font-bold text-gray-700">{meta.toLocaleString("es-MX")} {config?.unidad}</p>
                          </div>
                          <div className="text-center bg-white rounded border border-blue-100 px-2 py-1.5">
                            <p className="text-[9px] text-blue-400 uppercase">Ya avanzado</p>
                            <p className="text-xs font-bold text-blue-700">{acumulado.toLocaleString("es-MX")} {config?.unidad}</p>
                          </div>
                          <div className={`text-center rounded border px-2 py-1.5 ${restante === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-100"}`}>
                            <p className="text-[9px] text-amber-400 uppercase">Restante</p>
                            <p className={`text-xs font-bold ${restante === 0 ? "text-green-600" : "text-amber-700"}`}>
                              {restante.toLocaleString("es-MX")} {config?.unidad}
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] text-blue-500">Los campos editables ya están pre-llenados. Ajusta si es necesario.</p>
                      </div>
                    );
                  })()}
                  {campos.map((campo: any) => (
                    <div key={campo.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {campo.label}
                        {campo.readOnly && <span className="ml-1.5 text-[10px] text-blue-500 font-normal uppercase tracking-wide">calculado</span>}
                      </label>
                      <input type="text" inputMode="decimal" value={formDatos[campo.key] ?? ""}
                        onChange={e => {
                          if (campo.readOnly) return;
                          const esMermaExtrusion = campo.key === "merma" && nombreProceso === "extrusion";
                          const val = e.target.value.replace(esMermaExtrusion ? /[^0-9.-]/g : /[^0-9.]/g, "");
                          setFormDatos((prev: Record<string, any>) => {
                            const next: Record<string, any> = { ...prev, [campo.key]: val };
                            const merma = parseFloat(val) || 0;
                            if (campo.key === "merma" && nombreProceso === "extrusion") {
                              const base = parseFloat(String(prev.kilos_extruir)) || 0;
                              if (base > 0) next.k_para_impresion = String(Math.max(base - merma, 0));
                            }
                            if (campo.key === "merma" && nombreProceso === "impresion") {
                              const base = parseFloat(String(prev.kilos_imprimir)) || 0;
                              if (base > 0) next.kilos_impresos = String(Math.max(base - merma, 0));
                            }
                            if (campo.key === "kilos_merma" && nombreProceso === "bolseo") {
                              const base = parseFloat(String(prev.kilos_bolsear)) || 0;
                              if (base > 0) next.kilos_bolseados = String(Math.max(base - merma, 0));
                            }
                            return next;
                          });
                        }}
                        readOnly={campo.readOnly}
                        className={`w-full px-3 py-1.5 border rounded text-sm focus:outline-none ${
                          campo.readOnly
                            ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold cursor-not-allowed"
                            : "border-gray-300 focus:ring-2 focus:ring-green-400"
                        }`}
                        placeholder="0"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">📝 Observaciones del operador</label>
                    <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      placeholder="Escribe aqui cualquier novedad..." />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setAccion(null); setFormDatos({}); setObservaciones(""); }}
                      className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button onClick={handleFinalizar} disabled={guardando}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
                      {guardando && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
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
        <button onClick={onClose}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
          Cerrar
        </button>
      </div>
    </div>
  );
}