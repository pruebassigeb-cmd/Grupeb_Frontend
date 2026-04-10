import { useState, useEffect } from "react";
import {
  getProcesosOrden,
  iniciarProceso,
  finalizarProceso,
  editarProceso,
  getBultos,
  agregarBulto,
  eliminarBulto,
  finalizarBultos,
  getBultosEtiqueta,
  editarBulto as editarBultoService,
} from "../services/seguimientoService";
import type {
  ProcesosOrdenRespuesta,
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
    metros_extruir: Math.round(metros      * 100) / 100,
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
        <div className="text-center bg-white rounded border border-indigo-100 px-2 py-2">
          <p className="text-[10px] text-indigo-400 uppercase tracking-wide mb-0.5">Bolsas pedidas</p>
          <p className="text-lg font-bold text-indigo-800">
            {cantidadBolsas != null ? cantidadBolsas.toLocaleString("es-MX") : "—"}
          </p>
          <p className="text-[10px] text-indigo-400">pzas</p>
        </div>
        <div className="text-center bg-white rounded border border-indigo-100 px-2 py-2">
          <p className="text-[10px] text-indigo-400 uppercase tracking-wide mb-0.5">
            {esKilo ? "Kilogramos" : "Equiv. kg"}
          </p>
          <p className="text-lg font-bold text-indigo-800">
            {kilogramos != null ? kilogramos.toLocaleString("es-MX") : "—"}
          </p>
          <p className="text-[10px] text-indigo-400">kg</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TARJETA BULTO
// ─────────────────────────────────────────────
interface NuevoBultoForm {
  cantidad_unidades: string;
  peso: string; alto: string; largo: string; ancho: string;
}
const FORM_VACIO: NuevoBultoForm = { cantidad_unidades: "", peso: "", alto: "", largo: "", ancho: "" };

function TarjetaBulto({ bulto, numero, bultosFinalizados, eliminando, onEliminar, onEditar }: {
  bulto: Bulto; numero: number; bultosFinalizados: boolean;
  eliminando: number | null; onEliminar: (idbulto: number, cantidad: number) => void;
  onEditar: (bulto: Bulto) => void;
}) {
  const tieneDimensiones = bulto.peso || bulto.alto || bulto.largo || bulto.ancho;
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">{numero}</span>
          <span className="text-sm font-semibold text-gray-800">
            {bulto.cantidad_unidades.toLocaleString("es-MX")}
            <span className="text-xs font-normal text-gray-500 ml-1">pzas</span>
          </span>
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
          {bultosFinalizados ? (
            <>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <button onClick={() => onEditar(bulto)}
                className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Editar bulto">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onEliminar(bulto.idbulto, bulto.cantidad_unidades)}
                disabled={eliminando === bulto.idbulto}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40">
                {eliminando === bulto.idbulto
                  ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                }
              </button>
              <button onClick={() => onEditar(bulto)}
                className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Editar bulto">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
      {tieneDimensiones && (
        <div className="px-3 py-2">
          <div className="grid grid-cols-4 gap-1.5">
            {bulto.peso != null && (
              <div className="text-center bg-orange-50 border border-orange-100 rounded px-2 py-1.5">
                <p className="text-[9px] text-orange-400 uppercase tracking-wide leading-tight">Peso</p>
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
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECCION BULTOS
// ─────────────────────────────────────────────
function SeccionBultos({ pedido, cantidadReal }: { pedido: PedidoSeguimiento; cantidadReal?: number | null }) {
  const [bultos,            setBultos]            = useState<Bulto[]>([]);
  const [totalUnidades,     setTotalUnidades]     = useState(0);
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
      setBultosFinalizados(res.bultos_finalizado);
    } catch { setError("No se pudieron cargar los bultos."); }
    finally { setCargando(false); }
  };

  const abrirEditar = (bulto: Bulto) => {
    setFormEditar({
      cantidad_unidades: String(bulto.cantidad_unidades),
      peso:  bulto.peso  != null ? String(bulto.peso)  : "",
      alto:  bulto.alto  != null ? String(bulto.alto)  : "",
      largo: bulto.largo != null ? String(bulto.largo) : "",
      ancho: bulto.ancho != null ? String(bulto.ancho) : "",
    });
    setEditandoBulto(bulto);
    setError(null);
  };

  const handleGuardarEdicion = async () => {
    if (!editandoBulto || !pedido.idproduccion) return;
    const cantidad = parseInt(formEditar.cantidad_unidades);
    if (!cantidad || cantidad <= 0) { setError("Cantidad inválida."); return; }
    setGuardandoEdicion(true); setError(null);
    try {
      const payload: NuevoBultoPayload = {
        cantidad_unidades: cantidad,
        peso:  formEditar.peso  !== "" ? parseFloat(formEditar.peso)  : null,
        alto:  formEditar.alto  !== "" ? parseFloat(formEditar.alto)  : null,
        largo: formEditar.largo !== "" ? parseFloat(formEditar.largo) : null,
        ancho: formEditar.ancho !== "" ? parseFloat(formEditar.ancho) : null,
      };
      const actualizado = await editarBultoService(pedido.idproduccion, editandoBulto.idbulto, payload);
      setBultos(prev => prev.map(b => b.idbulto === actualizado.idbulto ? actualizado : b));
      setTotalUnidades(prev => prev - editandoBulto.cantidad_unidades + actualizado.cantidad_unidades);
      setEditandoBulto(null);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al editar bulto");
    } finally { setGuardandoEdicion(false); }
  };

  const updateForm = (campo: keyof NuevoBultoForm, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  const validarFormulario = (): string | null => {
    const cantidad = parseInt(form.cantidad_unidades);
    if (!cantidad || cantidad <= 0) return "Ingresa una cantidad válida mayor a 0.";
    const disponible = cantidadReal != null ? cantidadReal - totalUnidades : null;
    if (disponible !== null && cantidad > disponible)
      return `La cantidad excede el disponible. Máximo: ${disponible.toLocaleString("es-MX")} pzas.`;
    if (!form.peso.trim() || parseFloat(form.peso) <= 0) return "El peso del bulto es obligatorio.";
    if (!form.alto.trim() || !form.largo.trim() || !form.ancho.trim() ||
        parseFloat(form.alto) <= 0 || parseFloat(form.largo) <= 0 || parseFloat(form.ancho) <= 0)
      return "Las dimensiones del bulto (alto, largo y ancho) son obligatorias.";
    return null;
  };

  const formularioCompleto =
    form.cantidad_unidades !== "" && form.peso.trim() !== "" &&
    form.alto.trim() !== "" && form.largo.trim() !== "" && form.ancho.trim() !== "";

  const camposRequeridos = ["cantidad_unidades", "peso", "alto", "largo", "ancho"] as const;
  const camposLlenos = camposRequeridos.filter(k => form[k].trim() !== "").length;

  const handleAgregar = async () => {
    const mensajeError = validarFormulario();
    if (mensajeError) { setError(mensajeError); return; }
    setGuardando(true); setError(null);
    try {
      const payload: NuevoBultoPayload = {
        cantidad_unidades: parseInt(form.cantidad_unidades),
        peso: parseFloat(form.peso), alto: parseFloat(form.alto),
        largo: parseFloat(form.largo), ancho: parseFloat(form.ancho),
      };
      const nuevo = await agregarBulto(pedido.idproduccion!, payload);
      setBultos(prev => [...prev, nuevo]);
      setTotalUnidades(prev => prev + nuevo.cantidad_unidades);
      setForm(FORM_VACIO);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al agregar bulto");
    } finally { setGuardando(false); }
  };

  const handleEliminar = async (idbulto: number, cantidad: number) => {
    setEliminando(idbulto); setError(null);
    try {
      await eliminarBulto(pedido.idproduccion!, idbulto);
      setBultos(prev => prev.filter(b => b.idbulto !== idbulto));
      setTotalUnidades(prev => prev - cantidad);
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

  const cantidadIngresada  = parseInt(form.cantidad_unidades || "0") || 0;
  const proyectadoTotal    = totalUnidades + cantidadIngresada;
  const cantidadCompleta   = cantidadReal != null && proyectadoTotal >= cantidadReal;
  const disponibleRestante = cantidadReal != null ? Math.max(cantidadReal - totalUnidades, 0) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Total bultos</p>
          <p className="text-2xl font-bold text-blue-800">{bultos.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-green-400 uppercase tracking-wide mb-0.5">Total unidades</p>
          <p className="text-2xl font-bold text-green-800">{totalUnidades.toLocaleString("es-MX")}</p>
        </div>
      </div>

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
            {generandoEtiquetas ? "Generando etiquetas..." : `🏷️ Imprimir Etiquetas PDF (${bultos.length} bulto${bultos.length !== 1 ? "s" : ""})`}
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">➕ Agregar bulto</p>
            <div className="flex items-center gap-1.5">
              {camposRequeridos.map(k => (
                <div key={k}
                  title={k === "cantidad_unidades" ? "Cantidad" : k.charAt(0).toUpperCase() + k.slice(1)}
                  className={`w-2 h-2 rounded-full transition-colors ${form[k].trim() !== "" ? "bg-green-500" : "bg-gray-300"}`}
                />
              ))}
              <span className="text-[10px] text-gray-400 ml-1">{camposLlenos}/5</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cantidad de unidades <span className="text-red-500">*</span>
              {disponibleRestante !== null && (
                <span className="ml-2 text-[10px] text-gray-400 font-normal">
                  (máx. {disponibleRestante.toLocaleString("es-MX")} disponibles)
                </span>
              )}
            </label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.cantidad_unidades}
              onChange={e => { updateForm("cantidad_unidades", e.target.value.replace(/[^0-9]/g, "")); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleAgregar()}
              placeholder="Ej: 3000"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                cantidadCompleta ? "border-green-400 bg-green-50" : "border-gray-300"
              }`}
            />
            {cantidadIngresada > 0 && cantidadReal != null && (
              <p className={`text-[10px] mt-1 font-medium ${cantidadCompleta ? "text-green-600" : "text-amber-600"}`}>
                {cantidadCompleta
                  ? `✓ Con este bulto se completan las ${cantidadReal.toLocaleString("es-MX")} pzas producidas`
                  : `Quedarán ${Math.max(cantidadReal - proyectadoTotal, 0).toLocaleString("es-MX")} pzas sin empacar`
                }
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Peso y dimensiones <span className="text-red-500">*</span>
              <span className="text-[10px] text-red-400 font-normal">(todos obligatorios)</span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {([
                { key: "peso",  label: "Peso (kg)", color: "orange" },
                { key: "alto",  label: "Alto (cm)", color: "teal"   },
                { key: "largo", label: "Largo (cm)", color: "teal"  },
                { key: "ancho", label: "Ancho (cm)", color: "teal"  },
              ] as const).map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-[10px] font-medium text-${color}-600 mb-1 uppercase tracking-wide`}>
                    {label} <span className="text-red-500">*</span>
                  </label>
                  <input type="text" inputMode="decimal" value={form[key]}
                    onChange={e => { updateForm(key, e.target.value.replace(/[^0-9.]/g, "")); setError(null); }}
                    placeholder="0.0"
                    className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-${color}-300 placeholder-${color}-300 text-${color}-800 ${
                      form[key].trim() !== "" ? `border-${color}-400 bg-${color}-50` : "border-red-200 bg-red-50"}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleAgregar} disabled={guardando || !formularioCompleto}
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
            <TarjetaBulto key={b.idbulto} bulto={b} numero={idx + 1}
              bultosFinalizados={bultosFinalizados} eliminando={eliminando}
              onEliminar={handleEliminar} onEditar={abrirEditar} />
          ))}
        </div>
      )}

      {!bultosFinalizados && bultos.length > 0 && (
        <>
          {cantidadReal != null && totalUnidades < cantidadReal && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <span className="text-amber-500 mt-0.5 text-base leading-none">⚠️</span>
              <div>
                <p className="text-xs font-semibold text-amber-800">Faltan piezas por empacar</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Llevas {totalUnidades.toLocaleString("es-MX")} de {cantidadReal.toLocaleString("es-MX")} pzas.
                  Aún faltan <span className="font-bold">{(cantidadReal - totalUnidades).toLocaleString("es-MX")}</span> pzas.
                </p>
              </div>
            </div>
          )}
          {!confirmFinalizar ? (
            <button onClick={() => setConfirmFinalizar(true)}
              disabled={cantidadReal != null && totalUnidades < cantidadReal}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white disabled:text-gray-500 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {cantidadReal != null && totalUnidades < cantidadReal
                ? `Faltan ${(cantidadReal - totalUnidades).toLocaleString("es-MX")} pzas para finalizar`
                : "Finalizar bultos"
              }
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
              <p className="text-sm font-semibold text-amber-800">⚠️ ¿Confirmas que ya no se agregaran mas bultos?</p>
              <p className="text-xs text-amber-700">Esta accion es irreversible.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmFinalizar(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Cantidad de unidades <span className="text-red-500">*</span>
              </label>
              <input type="text" inputMode="numeric" value={formEditar.cantidad_unidades}
                onChange={e => setFormEditar(p => ({ ...p, cantidad_unidades: e.target.value.replace(/[^0-9]/g, "") }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Ej: 3000" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Peso y dimensiones</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "peso",  label: "Peso (kg)",  color: "orange" },
                  { key: "alto",  label: "Alto (cm)",  color: "teal"   },
                  { key: "largo", label: "Largo (cm)", color: "teal"   },
                  { key: "ancho", label: "Ancho (cm)", color: "teal"   },
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
                className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleGuardarEdicion} disabled={guardandoEdicion || !formEditar.cantidad_unidades}
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
// MODAL PROCESO INDIVIDUAL (export principal)
// ─────────────────────────────────────────────
interface Props {
  pedido:        PedidoSeguimiento;
  nombreProceso: string;
  onClose:       () => void;
  onActualizar:  () => void;
}

export default function ModalProcesoIndividual({ pedido, nombreProceso, onClose, onActualizar }: Props) {
  const [datos,              setDatos]              = useState<ProcesosOrdenRespuesta | null>(null);
  const [cargando,           setCargando]           = useState(true);
  const [accion,             setAccion]             = useState<"iniciar" | "finalizar" | null>(null);
  const [formDatos,          setFormDatos]          = useState<Record<string, any>>({});
  const [guardando,          setGuardando]          = useState(false);
  const [error,              setError]              = useState<string | null>(null);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState<"kidder" | "sicosa" | "">("");
  const [observaciones,      setObservaciones]      = useState("");
  const [editando,           setEditando]           = useState(false);
  const [formEditar,         setFormEditar]         = useState<Record<string, any>>({});
  const [obsEditar,          setObsEditar]          = useState("");
  const [guardandoEdit,      setGuardandoEdit]      = useState(false);

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

  const proc         = datos?.procesos.find((p: any) => p.tabla === nombreProceso || p.nombre_proceso === nombreProceso);
  const esActual     = datos?.proceso_actual === proc?.idproceso_cat;
  const bobinaVisual = nombreProceso === "extrusion" ? calcularBobinaVisual(pedido) : null;
  const campos       = CAMPOS_PROCESO[nombreProceso] ?? [];

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
      await finalizarProceso(pedido.idproduccion, { ...formDatos, observaciones: observaciones.trim() || null });
      await cargar(); onActualizar(); setAccion(null); setFormDatos({});
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al finalizar proceso");
    } finally { setGuardando(false); }
  };

  const handleAbrirFinalizar = () => {
    const preFill: Record<string, any> = {};
    if (nombreProceso === "extrusion") {
      preFill.kilos_extruir  = pedido.kilos_merma  ?? 0;
      preFill.metros_extruir = pedido.metros_merma ?? 0;
    }
    if (proc?.registro) {
      campos.forEach((c: any) => { if (proc.registro[c.key] != null) preFill[c.key] = proc.registro[c.key]; });
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
    setFormEditar(preFill);
    setObsEditar(proc?.registro?.observaciones ?? "");
    setEditando(true);
    setError(null);
  };

  const handleGuardarEdicion = async () => {
    if (!pedido.idproduccion) return;
    setGuardandoEdit(true); setError(null);
    try {
      await editarProceso(pedido.idproduccion, nombreProceso, {
        ...formEditar,
        observaciones: obsEditar.trim() || null,
      });
      await cargar();
      onActualizar();
      setEditando(false);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al guardar los cambios");
    } finally { setGuardandoEdit(false); }
  };

  const puedeIniciar   = esActual && proc?.estado === "pendiente";
  const puedeFinalizar = esActual && proc?.registro?.fecha_inicio && proc?.estado !== "terminado";
  const nombreLabel    = nombreProceso.replace("_", " ");

  const getNombreProcesoAnterior = () => {
    const mapa: Record<string, string> = {
      extrusion: "Extrusion", impresion: "Impresion", bolseo: "Bolseo", asa_flexible: "Asa flexible",
    };
    if (nombreProceso === "impresion")    return mapa["extrusion"];
    if (nombreProceso === "bolseo")       return mapa["impresion"];
    if (nombreProceso === "asa_flexible") return mapa["bolseo"];
    return null;
  };

  const nombreProcesoAnterior   = getNombreProcesoAnterior();
  const observacionesAnteriores = proc?.observaciones_proceso_anterior;

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

      {/* Observaciones proceso anterior */}
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

      {/* Calculo bobina (solo extrusion) */}
      {bobinaVisual && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
            📐 Calculo de bobina —{" "}
            <span className="normal-case font-normal text-blue-600">
              {bobinaVisual.orientacion === "horizontal"
                ? "Extrusion horizontal (fuelle de fondo)"
                : "Extrusion vertical (fuelle lateral)"}
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

      {/* Cuerpo principal */}
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
          {/* Registro existente */}
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
              {nombreProceso === "impresion" && proc.registro.repeticion && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Repeticion</span>
                  <span className="font-medium text-indigo-600">{proc.registro.repeticion}</span>
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

          {!esActual && proc.estado !== "terminado" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-yellow-800 text-sm">Este proceso aun no es el actual. Deben completarse los procesos anteriores primero.</p>
            </div>
          )}

          {/* Proceso terminado */}
          {proc.estado === "terminado" && (
            <>
              {!editando && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-green-800 text-sm font-medium flex-1">Proceso completado</p>
                  <button onClick={handleAbrirEditar}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors">
                    ✏️ Editar datos
                  </button>
                </div>
              )}

              {editando && (
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
                      className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={handleGuardarEdicion} disabled={guardandoEdit}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
                      {guardandoEdit && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Guardar cambios
                    </button>
                  </div>
                </div>
              )}

              {/* Seccion bultos (último proceso) */}
              {(() => {
                const tieneAsa = pedido.asa_flexible_estado !== "no-aplica" && pedido.asa_flexible_estado !== undefined;
                const esUltimoProceso =
                  (tieneAsa && nombreProceso === "asa_flexible") ||
                  (!tieneAsa && nombreProceso === "bolseo");
                return esUltimoProceso;
              })() && (
                <>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">📦 Registro de bultos</p>
                  </div>
                  <SeccionBultos
                    pedido={pedido}
                    cantidadReal={
                      nombreProceso === "asa_flexible"
                        ? (proc?.registro?.pzas_finales     != null ? Number(proc.registro.pzas_finales)     : null)
                        : (proc?.registro?.piezas_bolseadas != null ? Number(proc.registro.piezas_bolseadas) : null)
                    }
                  />
                </>
              )}
            </>
          )}

          {error && !editando && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{error}</div>
          )}

          {/* Selector máquina impresion */}
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

          {/* Botón iniciar */}
          {puedeIniciar && accion !== "finalizar" && (
            <button
              onClick={accion === "iniciar" ? handleIniciar : () => setAccion("iniciar")}
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
              className="w-full py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          )}

          {/* Botón / form finalizar */}
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
                      placeholder="Escribe aqui cualquier novedad, incidencia o comentario sobre el proceso..." />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setAccion(null); setFormDatos({}); setObservaciones(""); }}
                      className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                      Cancelar
                    </button>
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