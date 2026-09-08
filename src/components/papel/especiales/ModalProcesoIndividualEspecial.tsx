// ═══════════════════════════════════════════════════════════════════════════
// MODAL DE PROCESO INDIVIDUAL — PRODUCTOS ESPECIALES
// ═══════════════════════════════════════════════════════════════════════════
// Jose (2026-09-04). Archivo aparte del de papel normal a propósito, por dos
// razones que no se podían resolver parchando aquel:
//
//   1. En un especial el MISMO proceso puede ir varias veces en la ruta
//      (Impresión -> Laminación -> Impresión). El modal de papel identifica
//      el proceso solo por su tabla, así que las dos Impresiones caían en el
//      mismo registro. Aquí la unidad es el PASO: (tabla, pasada).
//
//   2. En un especial la ruta ya viene fija del alta del producto, así que no
//      hay nada que preguntar en planta: ni si Hojeado además lleva
//      Guillotina, ni si alguno "no aplica". Si está en la ruta, va. Por eso
//      este modal NO trae el checkbox "¿también pasa por Guillotina?" ni el
//      botón de reiniciar/quitar Hojeado-Guillotina que sí tiene el de papel
//      normal — ahí la ruta se decide pedido a pedido, aquí no.
//
// REDISEÑO (Jose, 2026-09-04): "Para los modales utiliza el mismo diseño que
// los de papel pero solo agrega las funciones nuevas y mejor no muestres la
// ruta de procesos" -- este archivo antes tenía un diseño propio (tarjetas
// Tailwind redondeadas, otra paleta) y una tira con toda la ruta arriba
// (TiraRuta). Ambas cosas se quitan: el diseño de abajo es el mismo que
// ModalProcesoIndividualPapel.tsx (mismas secciones, mismas clases, mismo
// orden visual) y lo único que se agrega encima es lo que ese modal no
// puede resolver por sí solo: identificar el paso por (tabla, pasada) en vez
// de solo tabla, y no preguntar nada del par Hojeado/Guillotina.
//
// Lo que se reutiliza tal cual del modal de papel (exportado desde ahí para
// no mantener dos copias que se puedan desincronizar): CAMPOS_PROCESO_PAPEL,
// CAMPOS_REGISTRO_PROPIO_PAPEL, CAMPOS_FICHA_PAPEL, formatearValorFicha,
// AVANCE_UNIDAD_PAPEL, CAMPO_PRINCIPAL_FINAL_PAPEL,
// CAMPOS_FINALES_ADICIONALES_PAPEL, colorEstado, textoEstado,
// TarjetaProductoPapel, BloqueVisualHojeadoGuillotina.
import { useState, useEffect, useRef } from "react";
// ✅ CORREGIDO (Jose, 2026-09-07): este archivo vive en
// src/components/papel/especiales/ (junto a RutaProcesos.tsx,
// FormularioProductoEspecial.tsx, MaterialesAsignacion.tsx), NO directo en
// src/components/papel/ -- todas las rutas relativas de abajo llevan un
// "../" extra para reflejar ese nivel de más.
import { showAlert } from "../../CustomAlert";
import {
  getProcesosOrdenPapel,
  iniciarProcesoPapel,
  finalizarProcesoPapel,
  editarProcesoPapel,
  registrarAvancePapel,
} from "../../../services/papel/seguimientoPapelService";
import type {
  ProcesosOrdenPapelRespuesta,
  AvanceParcialPapel,
} from "../../../services/papel/seguimientoPapelService";
import type { PedidoSeguimientoPapel, NombreProcesoPapel } from "../../../types/papel/seguimientoPapel.types";
import { NOMBRES_PROCESO_PAPEL } from "../../../types/papel/seguimientoPapel.types";
import AuditoriaDesplegable from "../../auditoria/AuditoriaDesplegable";
import { leerBorrador, useAutoguardarBorrador, limpiarBorrador } from "../../../hooks/useBorradorFormulario";
import { deInputFechaHora, fmtFechaHora, fmtFechaHoraCorta, paraInputFechaHora } from "../../../utils/fecha";
import {
  CAMPOS_PROCESO_PAPEL,
  CAMPOS_REGISTRO_PROPIO_PAPEL,
  CAMPOS_FICHA_PAPEL,
  formatearValorFicha,
  AVANCE_UNIDAD_PAPEL,
  CAMPO_PRINCIPAL_FINAL_PAPEL,
  CAMPOS_FINALES_ADICIONALES_PAPEL,
  colorEstado,
  textoEstado,
  TarjetaProductoPapel,
  BloqueVisualHojeadoGuillotina,
  SeccionBultosPapel,
  type CampoProceso,
} from "../ModalProcesoIndividualPapel";

const ordinal = (n: number) => `${n}ª`;

// ─────────────────────────────────────────────
// Cálculo del/de los campo(s) "entrada" (readOnly) al finalizar un paso.
// Espejo de calcularPreFillEntradaPapel, pero:
//  - identifica el paso por (tabla, pasada), no solo por tabla.
//  - no hace el "pick" entre Hojeado/Guillotina: en un especial la ruta ya
//    es una secuencia fija, así que el paso inmediato anterior siempre es
//    el correcto, sea cual sea su tabla.
// ─────────────────────────────────────────────
function calcularPreFillEntradaEspecial(
  procesos: ProcesosOrdenPapelRespuesta["procesos"],
  nombreProceso: NombreProcesoPapel,
  pasada: number,
  camposEntrada: CampoProceso[],
  pedido: PedidoSeguimientoPapel,
  piezasFinalesTotal: number | null | undefined,
): Record<string, any> {
  const procIndex = procesos.findIndex((p) => p.tabla === nombreProceso && (p.pasada ?? 1) === pasada);
  const proc = procIndex >= 0 ? procesos[procIndex] : undefined;
  const procAnterior = procIndex > 0 ? procesos[procIndex - 1] : null;
  const calculadoFicha =
    nombreProceso === "hojeado_papel" ? pedido.pliegos_hojeado_calculado
    : nombreProceso === "guillotina_papel" ? pedido.pliegos_guillotina_calculado
    : undefined;
  const preFill: Record<string, any> = {};
  camposEntrada.forEach((c) => {
    preFill[c.key] = proc?.registro?.[c.key] ?? calculadoFicha
      ?? procAnterior?.registro?.pliegos_entregados
      ?? procAnterior?.registro?.cantidad_entregada ?? procAnterior?.registro?.bolsas_entregadas
      // Primer paso de la ruta (posición 0, típicamente la OP de unión de un
      // especial): no hay paso anterior real -- la "entrada" sale del
      // mínimo entregado entre sus OP de inicio hermanas.
      ?? piezasFinalesTotal
      ?? 0;
  });
  return preFill;
}

// ─────────────────────────────────────────────
// SECCIÓN AVANCES PARCIALES — espejo de SeccionAvancesPapel, con la única
// diferencia real: todo lo que registra (avance y, si aplica, el
// finalizar-desde-aquí) lleva `pasada` para caer en la corrida correcta.
// ─────────────────────────────────────────────
interface SeccionAvancesEspecialProps {
  idproduccion: number;
  nombreProceso: NombreProcesoPapel;
  pasada: number;
  avances: AvanceParcialPapel[];
  totalAvances: number;
  onAvanceRegistrado: () => void;
  limiteAnterior: number | null;
  estimadoAnterior: number | null;
  piezasFinalesHermanas?: {
    no_produccion: string | null;
    componente_nombre: string | null;
    cantidad_entregada: number | null;
    terminado: boolean;
  }[] | null;
}

function SeccionAvancesEspecial({
  idproduccion, nombreProceso, pasada, avances, totalAvances, onAvanceRegistrado, limiteAnterior, estimadoAnterior,
  piezasFinalesHermanas,
}: SeccionAvancesEspecialProps) {
  interface BorradorAvanceEspecial {
    cantidad: string; observaciones: string; esAvanceFinal: boolean;
    ajusteFinal: string; datosFinales: Record<string, string>;
  }
  const claveBorrador = `avance-especial-${idproduccion}-${nombreProceso}-${pasada}`;
  const [borradorInicial] = useState(() => leerBorrador<BorradorAvanceEspecial>(claveBorrador));

  const [cantidad, setCantidad] = useState(borradorInicial?.cantidad ?? "");
  const [observaciones, setObservaciones] = useState(borradorInicial?.observaciones ?? "");
  const [guardando, setGuardando] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [esAvanceFinal, setEsAvanceFinal] = useState(borradorInicial?.esAvanceFinal ?? false);
  const [ajusteFinal, setAjusteFinal] = useState(borradorInicial?.ajusteFinal ?? "");
  const [datosFinales, setDatosFinales] = useState<Record<string, string>>(borradorInicial?.datosFinales ?? {});

  useAutoguardarBorrador<BorradorAvanceEspecial>(claveBorrador, {
    cantidad, observaciones, esAvanceFinal, ajusteFinal, datosFinales,
  }, true);

  const config = AVANCE_UNIDAD_PAPEL[nombreProceso] ?? { label: "Cantidad", unidad: "unidades", placeholder: "0" };
  const cantNum = parseFloat(cantidad) || 0;

  const restanteDelLimite = limiteAnterior != null ? Math.max(limiteAnterior - totalAvances, 0) : null;
  const excedeLimite = limiteAnterior != null && cantNum > 0 && (totalAvances + cantNum) > limiteAnterior;
  const alcanzaLimite = limiteAnterior != null && cantNum > 0 && (totalAvances + cantNum) === limiteAnterior;
  const pctLimite = limiteAnterior != null && limiteAnterior > 0
    ? Math.min((totalAvances / limiteAnterior) * 100, 100) : null;

  const ajusteNum = parseFloat(ajusteFinal) || 0;
  const totalAutomatico = Number(totalAvances ?? 0) + cantNum;
  const totalFinalPreview = totalAutomatico + ajusteNum;

  const campoPrincipalFinal = CAMPO_PRINCIPAL_FINAL_PAPEL[nombreProceso];
  const camposFinalesAdicionales = CAMPOS_FINALES_ADICIONALES_PAPEL[nombreProceso] ?? [];

  const handleRegistrar = async () => {
    const cant = parseFloat(cantidad);
    const ajuste = parseFloat(ajusteFinal) || 0;

    if (!cant || cant <= 0) {
      showAlert("Ingresa una cantidad válida mayor a 0.");
      return;
    }

    const totalFinal = Number(totalAvances ?? 0) + cant + ajuste;

    setGuardando(true);

    try {
      await registrarAvancePapel(idproduccion, {
        cantidad: cant,
        observaciones: observaciones.trim() || undefined,
        tabla_proceso: nombreProceso,
        pasada,
      });

      if (esAvanceFinal) {
        if (!campoPrincipalFinal) {
          throw new Error("No se pudo identificar el campo final del proceso.");
        }

        const payloadFinalizar: Record<string, any> = {
          tabla_proceso: nombreProceso,
          pasada,
          observaciones: observaciones.trim() || null,
          [campoPrincipalFinal.key]: totalFinal,
        };

        for (const campo of camposFinalesAdicionales) {
          const valor = datosFinales[campo.key];
          if (valor !== undefined && valor !== "") {
            payloadFinalizar[campo.key] = Number(valor);
          }
        }

        await finalizarProcesoPapel(idproduccion, payloadFinalizar);
      }

      limpiarBorrador(claveBorrador);
      setCantidad("");
      setObservaciones("");
      setAjusteFinal("");
      setDatosFinales({});
      setEsAvanceFinal(false);

      onAvanceRegistrado();
    } catch (e: any) {
      showAlert(e.response?.data?.error || e.message || "Error al registrar avance");
    } finally {
      setGuardando(false);
    }
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
                {fmtFechaHoraCorta(a.fecha_registro)}
              </p>
            </div>
          ))}
        </div>
      )}

      {limiteAnterior != null && (
        <div className="px-4 py-3 bg-white border-b border-blue-100">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-gray-700">
              {piezasFinalesHermanas && piezasFinalesHermanas.length > 0
                ? "✨ Piezas de las OP de inicio"
                : "Límite del proceso anterior"}
              <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                {piezasFinalesHermanas && piezasFinalesHermanas.length > 0
                  ? "(mínimo entregado entre las hermanas — van emparejadas, no sumadas)"
                  : "(máx. que puede avanzar este proceso)"}
              </span>
            </p>
            <p className="text-xs font-bold text-gray-800">{pctLimite != null ? `${Math.round(pctLimite)}%` : "—"}</p>
          </div>
          {piezasFinalesHermanas && piezasFinalesHermanas.length > 0 && (
            <div className="mb-2 space-y-1">
              {piezasFinalesHermanas.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] bg-purple-50 border border-purple-100 rounded px-2 py-1">
                  <span className="text-purple-700 font-medium">
                    {h.componente_nombre || h.no_produccion || `OP de inicio ${i + 1}`}
                    {h.no_produccion && h.componente_nombre ? ` · ${h.no_produccion}` : ""}
                  </span>
                  <span className="text-purple-800 font-bold">
                    {h.cantidad_entregada != null ? h.cantidad_entregada.toLocaleString("es-MX") : "—"}
                    {h.terminado && <span className="ml-1 font-normal text-green-600">✓</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
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

      {limiteAnterior == null && estimadoAnterior != null && (
        <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
          <p className="text-[11px] text-indigo-600">
            📐 Estimado (Hojeado/Guillotina aún sin avances): referencia, no un límite real todavía.
          </p>
          <p className="text-xs font-bold text-indigo-700">
            {estimadoAnterior.toLocaleString("es-MX")} <span className="text-[9px] font-normal">{config.unidad}</span>
          </p>
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
                  onChange={e => setCantidad(e.target.value.replace(/[^0-9.]/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handleRegistrar()}
                  placeholder={config.placeholder}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 bg-white ${excedeLimite ? "border-red-400 focus:ring-red-300" : "border-blue-300 focus:ring-blue-400"}`}
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
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones del operador</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
                placeholder="Novedades, incidencias o comentarios del turno..."
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={esAvanceFinal}
                  onChange={(e) => setEsAvanceFinal(e.target.checked)}
                  className="w-4 h-4"
                />
                Este avance finaliza el proceso
              </label>

              {esAvanceFinal && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                        ✅ Datos finales del proceso
                      </p>
                      <p className="text-[11px] text-green-700 mt-0.5">
                        El campo principal se calcula automático con los avances y puedes sumarle un ajuste manual.
                      </p>
                    </div>
                    {limiteAnterior != null && totalFinalPreview > limiteAnterior && (
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-1 whitespace-nowrap">
                        Sobreproducción
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white rounded border px-2 py-2">
                      <p className="text-[10px] text-gray-400 uppercase">Acumulado</p>
                      <p className="text-sm font-bold">{totalAvances.toLocaleString("es-MX")} {config.unidad}</p>
                    </div>
                    <div className="bg-white rounded border px-2 py-2">
                      <p className="text-[10px] text-gray-400 uppercase">Avance actual</p>
                      <p className="text-sm font-bold">{cantNum.toLocaleString("es-MX")} {config.unidad}</p>
                    </div>
                    <div className="bg-white rounded border px-2 py-2">
                      <p className="text-[10px] text-gray-400 uppercase">Ajuste</p>
                      <p className="text-sm font-bold">{ajusteNum.toLocaleString("es-MX")} {config.unidad}</p>
                    </div>
                    <div className="bg-white rounded border border-green-300 px-2 py-2">
                      <p className="text-[10px] text-green-500 uppercase">Total final</p>
                      <p className="text-sm font-bold text-green-700">{totalFinalPreview.toLocaleString("es-MX")} {config.unidad}</p>
                    </div>
                  </div>

                  {campoPrincipalFinal && (
                    <div className="bg-white border border-green-200 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {campoPrincipalFinal.label} automático
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={totalFinalPreview.toLocaleString("es-MX")}
                          readOnly
                          className="flex-1 px-3 py-2 border border-green-300 rounded-lg text-sm bg-green-50 text-green-800 font-semibold"
                        />
                        <span className="flex items-center px-3 py-2 bg-green-100 border border-green-200 rounded-lg text-xs font-semibold text-green-700">
                          {campoPrincipalFinal.unidad}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Ajuste manual / extra a sumar
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={ajusteFinal}
                        onChange={(e) => setAjusteFinal(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder={`Ej: 10 ${config.unidad}`}
                        className="flex-1 px-3 py-2 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                      />
                      <span className="flex items-center px-3 py-2 bg-green-100 border border-green-200 rounded-lg text-xs font-semibold text-green-700">
                        {config.unidad}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Úsalo solo si necesitas sumar producción extra o ajustar el total final.
                    </p>
                  </div>

                  {camposFinalesAdicionales.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {camposFinalesAdicionales.map((campo) => (
                        <div key={campo.key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{campo.label}</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={datosFinales[campo.key] ?? ""}
                              onChange={(e) =>
                                setDatosFinales(prev => ({
                                  ...prev,
                                  [campo.key]: e.target.value.replace(/[^0-9.]/g, ""),
                                }))
                              }
                              placeholder="0"
                              className="flex-1 px-3 py-2 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                            />
                            <span className="flex items-center px-3 py-2 bg-green-100 border border-green-200 rounded-lg text-xs font-semibold text-green-700">
                              {campo.unidad}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={handleRegistrar} disabled={guardando || !cantidad}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {guardando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>📋</span>}
              {guardando
                ? "Registrando..."
                : esAvanceFinal
                  ? "Registrar avance y finalizar proceso"
                  : "Registrar avance del día"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL PROCESO INDIVIDUAL — ESPECIALES
// ─────────────────────────────────────────────
interface PropsEspecial {
  pedido: PedidoSeguimientoPapel;
  nombreProceso: NombreProcesoPapel;
  /** Cuál repetición del proceso se está registrando. 1 si no se repite. */
  pasada: number;
  onClose: () => void;
  onActualizar: () => void;
}

export default function ModalProcesoIndividualEspecial({
  pedido, nombreProceso, pasada, onClose, onActualizar,
}: PropsEspecial) {
  const claveBorradorFinalizar = `finalizar-proceso-especial-${pedido.idproduccion}-${nombreProceso}-${pasada}`;
  const borradorFinalizarAplicado = useRef(false);

  const [datos, setDatos] = useState<ProcesosOrdenPapelRespuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState<"iniciar" | "finalizar" | null>(null);
  const [formDatos, setFormDatos] = useState<Record<string, any>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [editando, setEditando] = useState(false);
  const [formEditar, setFormEditar] = useState<Record<string, any>>({});
  const [obsEditar, setObsEditar] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  useAutoguardarBorrador(claveBorradorFinalizar, { formDatos, observaciones }, accion === "finalizar");

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const cargar = async () => {
    try {
      setCargando(true); setError(null);
      const res = await getProcesosOrdenPapel(Number(pedido.idproduccion));
      setDatos(res);
      const proc = res.procesos.find((p) => p.tabla === nombreProceso && (p.pasada ?? 1) === pasada);
      if (!borradorFinalizarAplicado.current) {
        borradorFinalizarAplicado.current = true;
        const borrador = leerBorrador<{ formDatos: Record<string, unknown>; observaciones: string }>(claveBorradorFinalizar);
        if (borrador) {
          const camposEntradaFrescos = (CAMPOS_PROCESO_PAPEL[nombreProceso] ?? []).filter((c) => c.readOnly);
          const entradaFresca = calcularPreFillEntradaEspecial(
            res.procesos, nombreProceso, pasada, camposEntradaFrescos, pedido, res.piezas_finales_total
          );
          setFormDatos({ ...(borrador.formDatos as Record<string, any>), ...entradaFresca });
          setObservaciones(borrador.observaciones);
          setAccion("finalizar");
          setCargando(false);
          return;
        }
      }
      if (proc?.registro?.observaciones) setObservaciones(proc.registro.observaciones);
    } catch { setError("No se pudieron cargar los procesos."); }
    finally { setCargando(false); }
  };

  const paso = datos?.procesos.find((p) => p.tabla === nombreProceso && (p.pasada ?? 1) === pasada);
  const totalPasadas = paso?.total_pasadas ?? 1;

  const esActual =
    (datos?.paso_actual?.tabla === nombreProceso && (datos?.paso_actual?.pasada ?? 1) === pasada) ||
    paso?.estado === "en_proceso";

  // ── Cálculo del "anterior" — a diferencia del modal de papel, aquí no hay
  // que resolver un par intercambiable: la ruta de un especial ya es una
  // secuencia fija (viene de componente_papel_proceso), así que el paso
  // justo antes en `datos.procesos` (que el backend ya entrega ordenado por
  // posición real de la ruta) siempre es el correcto.
  const procIndex = datos?.procesos.findIndex((p) => p.tabla === nombreProceso && (p.pasada ?? 1) === pasada) ?? -1;
  const procAnterior = procIndex > 0 ? datos?.procesos[procIndex - 1] : null;

  const anteriorTieneAvancesOTerminado =
    procAnterior == null ||
    procAnterior.estado === "terminado" ||
    (procAnterior.avances != null && procAnterior.avances.length > 0);
  const anteriorTerminado = procAnterior == null || procAnterior.estado === "terminado";

  // Estimado informativo (cantidad x rendimiento), solo si el paso
  // inmediato anterior es Hojeado/Guillotina y todavía no tiene avances.
  const esTablaPreparacion = (tabla?: string) => tabla === "hojeado_papel" || tabla === "guillotina_papel";
  const estimadoAnterior: number | null =
    procAnterior != null && esTablaPreparacion(procAnterior.tabla) && procAnterior.registro == null
      ? pedido.pliegos_hojeado_calculado ?? pedido.pliegos_guillotina_calculado ?? null
      : null;

  const esProcesoPreparacion = nombreProceso === "hojeado_papel" || nombreProceso === "guillotina_papel";
  const campos = CAMPOS_PROCESO_PAPEL[nombreProceso] ?? [];
  const camposFicha = CAMPOS_FICHA_PAPEL[nombreProceso] ?? [];
  const camposRegistroPropio = CAMPOS_REGISTRO_PROPIO_PAPEL[nombreProceso] ?? [];
  const limiteAnterior: number | null = (paso as any)?.limite_avance ?? null;
  // ✅ CORREGIDO (Jose, 2026-09-08): mismo criterio que en
  // ModalProcesoIndividualPapel -- esBloqueVisual se separa de
  // esProcesoPreparacion para que Laminación también muestre el bloque
  // visual calculado (BloqueVisualHojeadoGuillotina, rama laminacion_papel)
  // en vez de pedir bobina/metros/rollos/desarrollo/ctes-mod a mano.
  const esBloqueVisual = esProcesoPreparacion || nombreProceso === "laminacion_papel";
  // ✅ NUEVO (Jose, 2026-09-08): máquina configurada en la ficha para este
  // proceso (viene resuelta del backend, ver maquina_configurada en
  // getProcesosOrdenPapel) -- se MUESTRA aquí en vez de pedírsela al
  // operador. Mismo criterio de prioridad que ModalProcesoIndividualPapel.
  const maquinaConfigurada = paso?.registro?.maquina ?? (paso as any)?.maquina_configurada ?? null;

  const handleIniciar = async () => {
    if (!pedido.idproduccion) return;
    setGuardando(true);
    try {
      // La pasada va siempre: sin ella el backend asume la 1a y se
      // registraría en la corrida equivocada.
      await iniciarProcesoPapel(pedido.idproduccion, nombreProceso, {}, pasada);
      await cargar(); onActualizar(); setAccion(null);
    } catch (e: any) {
      showAlert(e.response?.data?.error || "Error al iniciar proceso");
    } finally { setGuardando(false); }
  };

  const handleFinalizar = async () => {
    if (!pedido.idproduccion) return;
    setGuardando(true);
    try {
      await finalizarProcesoPapel(pedido.idproduccion, {
        ...formDatos, observaciones: observaciones.trim() || null, tabla_proceso: nombreProceso, pasada,
        // Sin el checkbox de "¿también lleva Guillotina?": en un especial la
        // ruta ya está fija, así que ese aviso no aplica (Jose, 2026-09-03).
      });
      limpiarBorrador(claveBorradorFinalizar);
      await cargar(); onActualizar(); setAccion(null); setFormDatos({});
    } catch (e: any) {
      showAlert(e.response?.data?.error || "Error al finalizar proceso");
    } finally { setGuardando(false); }
  };

  const handleAbrirFinalizar = () => {
    const camposEntrada = campos.filter(c => c.readOnly);
    const preFill = calcularPreFillEntradaEspecial(
      datos?.procesos ?? [], nombreProceso, pasada, camposEntrada, pedido, datos?.piezas_finales_total
    );
    setFormDatos(preFill); setAccion("finalizar");
  };

  const handleAbrirEditar = () => {
    const preFill: Record<string, any> = {};
    if (paso?.registro) {
      [...campos, ...camposRegistroPropio].forEach((c) => {
        if (paso.registro[c.key] != null) preFill[c.key] = paso.registro[c.key];
      });
      // ✅ CORREGIDO (Jose, 2026-09-08): "Máquina" ya no se precarga aquí --
      // dejó de ser un campo editable en "Editar datos del proceso" (ver
      // maquinaConfigurada más abajo, que la MUESTRA en vez de pedirla).
      if (paso.registro.fecha_inicio) preFill.fecha_inicio = paraInputFechaHora(paso.registro.fecha_inicio);
      if (paso.registro.fecha_fin) preFill.fecha_fin = paraInputFechaHora(paso.registro.fecha_fin);
    }
    setFormEditar(preFill); setObsEditar(paso?.registro?.observaciones ?? "");
    setEditando(true);
  };

  const handleGuardarEdicion = async () => {
    if (!pedido.idproduccion) return;
    setGuardandoEdit(true);
    try {
      await editarProcesoPapel(pedido.idproduccion, nombreProceso, {
        ...formEditar,
        pasada,
        fecha_inicio: formEditar.fecha_inicio ? deInputFechaHora(formEditar.fecha_inicio) : formEditar.fecha_inicio,
        fecha_fin:    formEditar.fecha_fin    ? deInputFechaHora(formEditar.fecha_fin)    : formEditar.fecha_fin,
        observaciones: obsEditar.trim() || null,
      });
      await cargar(); onActualizar(); setEditando(false);
    } catch (e: any) {
      showAlert(e.response?.data?.error || "Error al guardar los cambios");
    } finally { setGuardandoEdit(false); }
  };

  const tienePendienteSinIniciar = paso?.registro != null && !paso?.registro?.fecha_inicio;
  // A diferencia de papel normal, aquí no hay par intercambiable: "puede
  // iniciar" es simplemente que el backend diga que este es el paso que
  // toca ahora mismo (paso_actual, que ya identifica tabla + pasada).
  const puedeIniciar =
    (datos?.paso_actual?.tabla === nombreProceso && (datos?.paso_actual?.pasada ?? 1) === pasada && paso?.estado === "pendiente")
    || tienePendienteSinIniciar;
  const puedeFinalizar = paso?.estado === "en_proceso" && paso?.registro?.fecha_inicio && anteriorTerminado;
  const puedeAvance = paso?.estado === "en_proceso" && paso?.registro?.fecha_inicio;
  const nombreLabel = NOMBRES_PROCESO_PAPEL[nombreProceso] ?? nombreProceso.replace("_papel", "").replace("_", " ");

  const nombreProcesoAnterior = procAnterior ? (NOMBRES_PROCESO_PAPEL[procAnterior.tabla] ?? null) : null;
  const observacionesAnteriores = paso?.observaciones_proceso_anterior;

  // ✅ NUEVO (Jose, 2026-09-05): "Empaquetado" siempre va en la OP de
  // unión -- es la orden principal, la última por la que pasa todo el
  // producto -- así que ahí el apartado de empaquetado (mismos campos de
  // bultos que en papel normal, ver SeccionBultosPapel) se engancha SOLO
  // al proceso que de verdad resulte último en la ruta de esa OP,
  // cualquiera que sea (Litolaminado, Suaje, etc.) -- igual que
  // esUltimoProceso en ModalProcesoIndividualPapel.tsx. Una OP "única"
  // (sin unión separada) es igual de terminal, así que se trata igual.
  // Si esa ruta YA incluye "Empaquetado" como proceso explícito (dato de
  // antes de este cambio, o una OP de inicio que sí lo necesitó), no se
  // duplica aquí -- ese paso se sigue registrando normal, como cualquier
  // otro proceso de la ruta.
  const componenteTipo = (pedido as any).componente_tipo as string | null;
  const esUnionOUnica = componenteTipo === "union" || componenteTipo === "unica";
  const procesosVisiblesEspecial = (datos?.procesos ?? []).filter((p) => p.tabla !== "empaque_papel");
  const tieneEmpaqueEnRuta = (datos?.procesos ?? []).some((p) => p.tabla === "empaque_papel");
  const esUltimoProcesoReal =
    !tieneEmpaqueEnRuta &&
    procesosVisiblesEspecial.length > 0 &&
    procesosVisiblesEspecial[procesosVisiblesEspecial.length - 1].tabla === nombreProceso &&
    (procesosVisiblesEspecial[procesosVisiblesEspecial.length - 1].pasada ?? 1) === pasada;
  const mostrarEmpaquetado = esUnionOUnica && esUltimoProcesoReal;

  return (
    <div className="space-y-4 min-w-[480px] max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-900">{pedido.no_produccion}</p>
          <p className="text-xs text-gray-500">Pedido #{pedido.no_pedido} · {pedido.cliente}</p>
        </div>
        <div className="flex items-center gap-2">
          {totalPasadas > 1 && (
            <span className="px-2 py-1 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
              {ordinal(pasada)} de {totalPasadas}
            </span>
          )}
          {paso && (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colorEstado(paso.estado)}`}>
              {textoEstado(paso.estado)}
            </span>
          )}
        </div>
      </div>

      <AuditoriaDesplegable
        tabla="orden_produccion"
        id={pedido.idproduccion}
        titulo={`Auditoría de ${pedido.no_produccion ?? "la orden de producción"}`}
        limite={25}
      />

      <TarjetaProductoPapel pedido={pedido} />

      {/* ── Ficha del producto — específica de este proceso (solo lectura,
          igual que en papel normal: para cambiarla se edita la ficha del
          producto, no el registro de este proceso). */}
      {camposFicha.length > 0 && (() => {
        const filasFicha = camposFicha
          .map((campo) => ({ campo, valor: formatearValorFicha(pedido[campo.key]) }))
          .filter((f) => f.valor !== null);
        if (filasFicha.length === 0) return null;
        return (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
              📋 Ficha del producto
            </p>
            {filasFicha.map(({ campo, valor }) => (
              <div key={campo.key} className="flex justify-between text-xs">
                <span className="text-purple-400">{campo.label}</span>
                <span className="font-medium text-purple-900">{valor}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* OP de unión esperando a sus OP de inicio hermanas — esto no existe
          en papel normal, es propio de especiales (Jose, 2026-09-03). */}
      {datos?.espera_union && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            {datos.espera_union_motivo || "Esta OP de unión todavía espera a sus OP de inicio."}
          </p>
        </div>
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

      {/* ✅ NUEVO (Jose, 2026-09-08): "Máquina" se muestra aquí, siempre
          visible sin importar el estado del proceso -- ya no se pide en
          "Editar datos del proceso" (ver maquinaConfigurada arriba). */}
      {maquinaConfigurada && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Máquina</span>
          <span className="text-sm font-semibold text-slate-700">{maquinaConfigurada}</span>
        </div>
      )}

      {esBloqueVisual && (
        <BloqueVisualHojeadoGuillotina nombreProceso={nombreProceso} pedido={pedido} />
      )}

      {cargando ? (
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error && !paso ? (
        <p className="text-red-600 text-sm text-center">{error}</p>
      ) : !paso ? (
        <p className="text-gray-500 text-sm text-center">
          Este proceso no está en la ruta de esta orden{totalPasadas > 1 ? `, o no tiene una ${ordinal(pasada)} corrida.` : "."}
        </p>
      ) : (
        <>
          {paso.registro && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registro</p>
              {paso.registro.fecha_inicio && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Inicio</span>
                  <span className="text-gray-800 font-medium">{fmtFechaHora(paso.registro.fecha_inicio)}</span>
                </div>
              )}
              {paso.registro.fecha_fin && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Fin</span>
                  <span className="text-gray-800 font-medium">{fmtFechaHora(paso.registro.fecha_fin)}</span>
                </div>
              )}
              {/* ✅ CORREGIDO (Jose, 2026-09-08): la máquina ya no se repite
                  aquí -- se muestra una sola vez, siempre visible, en el
                  bloque de "Máquina" de arriba (maquinaConfigurada). */}
              {camposRegistroPropio.map((campo) => {
                const val = paso.registro?.[campo.key];
                if (val === null || val === undefined || val === "") return null;
                return (
                  <div key={campo.key} className="flex justify-between text-xs">
                    <span className="text-gray-400">{campo.label}</span>
                    <span className="font-semibold text-indigo-700">{val}</span>
                  </div>
                );
              })}
              {campos.map((campo) => {
                const val = paso.registro?.[campo.key];
                if (val === null || val === undefined) return null;
                return (
                  <div key={campo.key} className="flex justify-between text-xs">
                    <span className="text-gray-400">{campo.label}</span>
                    <span className={`font-medium ${campo.readOnly ? "text-blue-700" : "text-gray-800"}`}>{val}</span>
                  </div>
                );
              })}
              {paso.registro.observaciones && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-1">📝 Observaciones del operador</p>
                  <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">{paso.registro.observaciones}</p>
                </div>
              )}
            </div>
          )}

          {!esActual && paso.estado === "pendiente" && !tienePendienteSinIniciar && !anteriorTieneAvancesOTerminado && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-yellow-800 text-sm">
                El proceso anterior aún no tiene avances registrados. Cuando registre su primer avance, este proceso quedará disponible para iniciar.
              </p>
            </div>
          )}

          {puedeAvance && (
            <SeccionAvancesEspecial
              idproduccion={pedido.idproduccion!}
              nombreProceso={nombreProceso}
              pasada={pasada}
              avances={paso.avances ?? []}
              totalAvances={paso.total_avances ?? 0}
              onAvanceRegistrado={async () => { await cargar(); onActualizar(); }}
              limiteAnterior={limiteAnterior}
              estimadoAnterior={estimadoAnterior}
              piezasFinalesHermanas={procAnterior == null ? (datos?.piezas_finales_hermanas ?? null) : null}
            />
          )}

          {paso.estado === "terminado" && (
            <>
              {(paso.avances ?? []).length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">📋 Historial de avances parciales</p>
                    <span className="text-xs text-gray-500">
                      Total: {(paso.total_avances ?? 0).toLocaleString("es-MX")} {AVANCE_UNIDAD_PAPEL[nombreProceso]?.unidad ?? ""}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(paso.avances ?? []).map((a, idx) => (
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
                          {fmtFechaHoraCorta(a.fecha_registro)}
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
                    <span className="text-[10px] text-blue-500 uppercase tracking-wide font-medium">{nombreLabel}</span>
                  </div>
                  {/* ✅ CORREGIDO (Jose, 2026-09-08): "Máquina" ya no se pide
                      aquí -- se muestra siempre arriba (maquinaConfigurada),
                      no es algo que el operador deba escribir por corrida. */}
                  {camposRegistroPropio.map((campo) => (
                    <div key={campo.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{campo.label}</label>
                      <input type="text" value={formEditar[campo.key] ?? ""}
                        onChange={e => setFormEditar((prev: Record<string, any>) => ({ ...prev, [campo.key]: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="—"
                      />
                    </div>
                  ))}
                  {campos.map((campo) => (
                    <div key={campo.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {campo.label}
                        {campo.readOnly && <span className="ml-1.5 text-[10px] text-blue-500 font-normal uppercase tracking-wide">calculado</span>}
                      </label>
                      <input type="text" inputMode="decimal" value={formEditar[campo.key] ?? ""}
                        onChange={e => {
                          if (campo.readOnly) return;
                          setFormEditar((prev: Record<string, any>) => ({
                            ...prev,
                            [campo.key]: e.target.value.replace(/[^0-9.-]/g, ""),
                          }));
                        }}
                        readOnly={campo.readOnly}
                        className={`w-full px-3 py-1.5 border rounded text-sm focus:outline-none ${campo.readOnly
                          ? "bg-blue-100 border-blue-200 text-blue-700 font-semibold cursor-not-allowed"
                          : "bg-white border-gray-300 focus:ring-2 focus:ring-blue-400"
                          }`}
                        placeholder="0"
                      />
                    </div>
                  ))}
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
            </>
          )}

          {mostrarEmpaquetado && paso?.estado === "terminado" && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">📦 Empaquetado</p>
              </div>
              <SeccionBultosPapel pedido={pedido} cantidadReal={null} limiteEnCurso={null} />
            </>
          )}

          {mostrarEmpaquetado && paso?.estado === "en_proceso" && (paso.avances ?? []).length > 0 && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">📦 Empaquetado</p>
                  <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded-full border border-amber-200">
                    Proceso en curso
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Puedes ir registrando empaques conforme vayas terminando.</p>
              </div>
              <SeccionBultosPapel pedido={pedido} cantidadReal={null} limiteEnCurso={paso.total_avances ?? null} />
            </>
          )}

          {mostrarEmpaquetado && paso?.estado === "en_proceso" && (paso.avances ?? []).length === 0 && (
            <div className="border-t border-gray-200 pt-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-gray-500 text-sm">📦 El registro de empaquetado estará disponible cuando registres tu primer avance del día.</p>
              </div>
            </div>
          )}

          {error && !editando && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{error}</div>
          )}

          {puedeIniciar && accion !== "finalizar" && (
            <button onClick={accion === "iniciar" ? handleIniciar : () => setAccion("iniciar")}
              disabled={guardando}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {guardando && accion === "iniciar"
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span>▶</span>
              }
              {accion === "iniciar" ? "Confirmar inicio" : `Iniciar ${nombreLabel}`}
            </button>
          )}
          {accion === "iniciar" && (
            <button onClick={() => setAccion(null)}
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
                  <p className="text-sm font-semibold text-gray-700">Datos de finalización</p>

                  {camposRegistroPropio.map((campo) => (
                    <div key={campo.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{campo.label}</label>
                      <input type="text" value={formDatos[campo.key] ?? ""}
                        onChange={e => setFormDatos((prev: Record<string, any>) => ({ ...prev, [campo.key]: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                        placeholder="—"
                      />
                    </div>
                  ))}
                  {campos.map((campo) => (
                    <div key={campo.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {campo.label}
                        {campo.readOnly && <span className="ml-1.5 text-[10px] text-blue-500 font-normal uppercase tracking-wide">calculado</span>}
                      </label>
                      <input type="text" inputMode="decimal" value={formDatos[campo.key] ?? ""}
                        onChange={e => {
                          if (campo.readOnly) return;
                          setFormDatos((prev: Record<string, any>) => ({
                            ...prev, [campo.key]: e.target.value.replace(/[^0-9.-]/g, ""),
                          }));
                        }}
                        readOnly={campo.readOnly}
                        className={`w-full px-3 py-1.5 border rounded text-sm focus:outline-none ${campo.readOnly
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
                      placeholder="Escribe aquí cualquier novedad..." />
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