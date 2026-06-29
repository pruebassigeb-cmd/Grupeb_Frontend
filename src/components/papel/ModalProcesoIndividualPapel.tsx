import { useState, useEffect } from "react";
import {
  getProcesosOrdenPapel,
  iniciarProcesoPapel,
  finalizarProcesoPapel,
  editarProcesoPapel,
  registrarAvancePapel,
  getBultos,
  agregarBulto,
  agregarBultosBatch,
  eliminarBulto,
  finalizarBultos,
  getBultosEtiqueta,
  marcarBultosParcialidad,
  editarBulto as editarBultoService,
} from "../../services/papel/seguimientoPapelService";
import type {
  ProcesosOrdenPapelRespuesta,
  AvanceParcialPapel,
} from "../../services/papel/seguimientoPapelService";
import type { Bulto, NuevoBultoPayload, NuevoBultoBatchPayload } from "../../services/seguimientoService";
import { generarPdfEtiquetas } from "../../services/generarPdfEtiquetas";
import { preguntarGuardarS3 } from "../../services/pdfS3.service";
import type { PedidoSeguimientoPapel, NombreProcesoPapel } from "../../types/papel/seguimientoPapel.types";
import { NOMBRES_PROCESO_PAPEL, ULTIMO_PROCESO_PAPEL } from "../../types/papel/seguimientoPapel.types";

// ─────────────────────────────────────────────
// CAMPOS POR PROCESO (cascada entrada → merma → salida + campos propios)
// Tomado literalmente de la tabla en contexto_frontend_seguimiento_papel.md,
// que a su vez viene del DDL ddl_papel_produccion.sql.
// ─────────────────────────────────────────────
interface CampoProceso {
  key: string;
  label: string;
  readOnly?: boolean;
}

const CAMPOS_PROCESO_PAPEL: Record<NombreProcesoPapel, CampoProceso[]> = {
  hojeado_papel: [
    { key: "cantidad_hojeado", label: "Cantidad hojeado (objetivo)", readOnly: true },
    { key: "merma", label: "Merma" },
    { key: "cantidad_entregada", label: "Cantidad entregada" },
  ],
  guillotina_papel: [
    { key: "pliegos", label: "Pliegos (objetivo)", readOnly: true },
    { key: "cortes", label: "Cortes" },
    { key: "merma", label: "Merma" },
    { key: "cantidad_entregada", label: "Cantidad entregada" },
  ],
  impresion_papel: [
    { key: "pliegos_entrada", label: "Hojas impresas (entrada)", readOnly: true },
    { key: "merma", label: "Merma" },
    { key: "pliegos_entregados", label: "Entregadas" },
  ],
  laminacion_papel: [
    { key: "pliegos_entrada", label: "Hojas laminadas (entrada)", readOnly: true },
    { key: "merma", label: "Merma" },
    { key: "pliegos_entregados", label: "Entregadas" },
  ],
  barniz_uv_papel: [
    { key: "pliegos_entrada", label: "Hojas UV (entrada)", readOnly: true },
    { key: "merma", label: "Merma" },
    { key: "pliegos_entregados", label: "Entregadas" },
  ],
  hot_stamping_papel: [
    { key: "pliegos_entrada", label: "Hojas estampadas (entrada)", readOnly: true },
    { key: "merma", label: "Merma" },
    { key: "pliegos_entregados", label: "Entregadas" },
  ],
  texturizado_papel: [
    { key: "pliegos_entrada", label: "Hojas texturizadas (entrada)", readOnly: true },
    { key: "merma", label: "Merma" },
    { key: "pliegos_entregados", label: "Entregadas" },
  ],
  alto_relieve_papel: [
    { key: "pliegos_entrada", label: "Hojas alto relieve (entrada)", readOnly: true },
    { key: "merma", label: "Merma" },
    { key: "pliegos_entregados", label: "Entregadas" },
  ],
  suaje_produccion_papel: [
    { key: "pliegos_entrada", label: "Hojas suaje (entrada)", readOnly: true },
    { key: "merma", label: "Merma" },
    { key: "pliegos_entregados", label: "Entregadas" },
  ],
  armado_papel: [
    { key: "pliegos_entrada", label: "Pliegos (entrada)", readOnly: true },
    { key: "bolsas_armadas", label: "Bolsas armadas" },
    { key: "merma", label: "Merma" },
    { key: "bolsas_entregadas", label: "Bolsas entregadas" },
  ],
  empaque_papel: [
    { key: "bolsas_entrada", label: "Bolsas (entrada)", readOnly: true },
    { key: "merma", label: "Merma" },
    { key: "bolsas_entregadas_final", label: "Bolsas entregadas (final)" },
  ],
};

// ─────────────────────────────────────────────
// CAMPOS PROPIOS DEL REGISTRO (no son de ficha, no son cascada
// entrada/merma/salida — son cálculos reales de ESA corrida que sí viven
// en la tabla del proceso). Confirmado en el DDL corregido: a diferencia
// de "acabado" en laminación (que SÍ es de ficha), bobina_cm/metros/
// rollos/desarrollo_mm/ctes_mod son fórmulas pendientes de implementar en
// el alta de producto, así que por ahora se quedan en el registro.
// ─────────────────────────────────────────────
const CAMPOS_REGISTRO_PROPIO_PAPEL: Record<NombreProcesoPapel, CampoProceso[]> = {
  hojeado_papel: [],
  guillotina_papel: [],
  impresion_papel: [],
  laminacion_papel: [
    { key: "bobina_cm", label: "Bobina (cm)" },
    { key: "metros", label: "Metros" },
    { key: "rollos", label: "Rollos" },
    { key: "desarrollo_mm", label: "Desarrollo (mm)" },
    { key: "ctes_mod", label: "CTES/Mod" },
  ],
  barniz_uv_papel: [],
  hot_stamping_papel: [],
  texturizado_papel: [],
  alto_relieve_papel: [],
  suaje_produccion_papel: [
    { key: "suaje_idsuaje_papel", label: "Suaje (folio)" },
  ],
  armado_papel: [],
  empaque_papel: [],
};

// ─────────────────────────────────────────────
// CAMPOS DE FICHA POR PROCESO
// Tras la corrección del DDL (ddl_papel_produccion_true.sql), varios
// campos que antes vivían en el registro de cada proceso en realidad
// pertenecen a la FICHA del producto (detalle_material_papel,
// solicitud_producto_papel, acabados_papel, foil, cat_textura, etc.) y el
// backend los trae por JOIN una sola vez a nivel pedido — no se repiten
// ni se editan por proceso. Por eso esta tabla mapea proceso → claves de
// PedidoSeguimientoPapel (no del registro del proceso).
//
// "máquina" se queda FUERA de este mapeo a propósito: sigue viviendo en
// el registro de cada proceso (`proc.registro.maquina`), porque es un
// dato real de la corrida (qué máquina se usó esta vez), no de la ficha.
// ─────────────────────────────────────────────
interface CampoFicha {
  key: keyof PedidoSeguimientoPapel;
  label: string;
}

const CAMPOS_FICHA_PAPEL: Record<NombreProcesoPapel, CampoFicha[]> = {
  hojeado_papel: [
    { key: "hoj_bobina", label: "Bobina" },
    { key: "hoj_corte", label: "Hojeado" },
    { key: "hoj_rendimiento", label: "Rendimiento" },
    { key: "pliego", label: "Medida del pliego" },
  ],
  guillotina_papel: [
    { key: "pliego", label: "Pliego origen" },
    { key: "hoj_rendimiento", label: "Rendimiento" },
    { key: "hoj_corte", label: "Medida del corte" },
  ],
  impresion_papel: [
    { key: "material", label: "Material" },
    { key: "calibre", label: "Calibre" },
    { key: "tintas_frente", label: "Tintas (frente)" },
    { key: "pantones_frente", label: "Pantones (frente)" },
    { key: "tintas_dentro", label: "Tintas (dentro)" },
    { key: "pantones_dentro", label: "Pantones (dentro)" },
  ],
  laminacion_papel: [
    { key: "laminado_acabado", label: "Acabado" },
  ],
  barniz_uv_papel: [],
  hot_stamping_papel: [
    { key: "foil_nombre", label: "Foil" },
  ],
  texturizado_papel: [
    { key: "textura_nombre", label: "Textura" },
  ],
  alto_relieve_papel: [],
  suaje_produccion_papel: [], // suaje_idsuaje_papel sigue en el registro del proceso, no es de ficha
  armado_papel: [
    { key: "asa_tipo", label: "Tipo de asa" },
    { key: "asa_color", label: "Color de asa" },
    { key: "asa_medida", label: "Medida de asa" },
    { key: "refuerzo_material", label: "Refuerzo (material)" },
    { key: "refuerzo_medida", label: "Refuerzo (medida)" },
    { key: "base_material", label: "Base (material)" },
    { key: "base_medida", label: "Base (medida)" },
  ],
  empaque_papel: [
    { key: "tipo_caja", label: "Tipo de caja" },
    { key: "cantidad_por_caja", label: "Cantidad por caja" },
  ],
};

// Helper para formatear el valor de un campo de ficha (arrays de pantones
// se unen con coma, el resto se muestra tal cual).
function formatearValorFicha(valor: any): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (Array.isArray(valor)) return valor.length > 0 ? valor.join(", ") : null;
  return String(valor);
}

// Unidad de avance por proceso: "pliegos" para todos salvo Armado y
// Empaque, donde ya se trabaja en "bolsas" (cambio de unidad confirmado
// en el PDF real: 6,055 pliegos → 3,027 bolsas).
const AVANCE_UNIDAD_PAPEL: Record<NombreProcesoPapel, { label: string; unidad: string; placeholder: string }> = {
  hojeado_papel: { label: "Pliegos hojeados hoy", unidad: "pliegos", placeholder: "Ej: 6300" },
  guillotina_papel: { label: "Cortes hechos hoy", unidad: "pliegos", placeholder: "Ej: 6300" },
  impresion_papel: { label: "Pliegos impresos hoy", unidad: "pliegos", placeholder: "Ej: 6200" },
  laminacion_papel: { label: "Pliegos laminados hoy", unidad: "pliegos", placeholder: "Ej: 6150" },
  barniz_uv_papel: { label: "Pliegos con UV hoy", unidad: "pliegos", placeholder: "Ej: 6120" },
  hot_stamping_papel: { label: "Pliegos estampados hoy", unidad: "pliegos", placeholder: "Ej: 6090" },
  texturizado_papel: { label: "Pliegos texturizados hoy", unidad: "pliegos", placeholder: "Ej: 6080" },
  alto_relieve_papel: { label: "Pliegos con alto relieve hoy", unidad: "pliegos", placeholder: "Ej: 6070" },
  suaje_produccion_papel: { label: "Pliegos suajados hoy", unidad: "pliegos", placeholder: "Ej: 6055" },
  armado_papel: { label: "Bolsas armadas hoy", unidad: "bolsas", placeholder: "Ej: 3027" },
  empaque_papel: { label: "Bolsas empacadas hoy", unidad: "bolsas", placeholder: "Ej: 3012" },
};

// Campo "principal" que se llena automático al finalizar con el total de
// avances acumulado (equivalente a k_para_impresion / pzas_finales en
// plástico).
const CAMPO_PRINCIPAL_FINAL_PAPEL: Record<NombreProcesoPapel, { key: string; label: string; unidad: string } | null> = {
  hojeado_papel: { key: "cantidad_entregada", label: "Cantidad entregada", unidad: "pliegos" },
  guillotina_papel: { key: "cantidad_entregada", label: "Cantidad entregada", unidad: "pliegos" },
  impresion_papel: { key: "pliegos_entregados", label: "Pliegos entregados", unidad: "pliegos" },
  laminacion_papel: { key: "pliegos_entregados", label: "Pliegos entregados", unidad: "pliegos" },
  barniz_uv_papel: { key: "pliegos_entregados", label: "Pliegos entregados", unidad: "pliegos" },
  hot_stamping_papel: { key: "pliegos_entregados", label: "Pliegos entregados", unidad: "pliegos" },
  texturizado_papel: { key: "pliegos_entregados", label: "Pliegos entregados", unidad: "pliegos" },
  alto_relieve_papel: { key: "pliegos_entregados", label: "Pliegos entregados", unidad: "pliegos" },
  suaje_produccion_papel: { key: "pliegos_entregados", label: "Pliegos entregados", unidad: "pliegos" },
  armado_papel: { key: "bolsas_entregadas", label: "Bolsas entregadas", unidad: "bolsas" },
  empaque_papel: { key: "bolsas_entregadas_final", label: "Bolsas entregadas (final)", unidad: "bolsas" },
};

// Campos de merma adicionales que se piden al finalizar (aparte del
// campo principal calculado automático).
const CAMPOS_FINALES_ADICIONALES_PAPEL: Record<NombreProcesoPapel, { key: string; label: string; unidad: string }[]> = {
  hojeado_papel: [{ key: "merma", label: "Merma", unidad: "pliegos" }],
  guillotina_papel: [
    { key: "merma", label: "Merma", unidad: "pliegos" },
    { key: "cortes", label: "Cortes (referencia)", unidad: "pliegos" },
  ],
  impresion_papel: [{ key: "merma", label: "Merma", unidad: "pliegos" }],
  laminacion_papel: [{ key: "merma", label: "Merma", unidad: "pliegos" }],
  barniz_uv_papel: [{ key: "merma", label: "Merma", unidad: "pliegos" }],
  hot_stamping_papel: [{ key: "merma", label: "Merma", unidad: "pliegos" }],
  texturizado_papel: [{ key: "merma", label: "Merma", unidad: "pliegos" }],
  alto_relieve_papel: [{ key: "merma", label: "Merma", unidad: "pliegos" }],
  suaje_produccion_papel: [{ key: "merma", label: "Merma", unidad: "pliegos" }],
  armado_papel: [
    { key: "merma", label: "Merma", unidad: "bolsas" },
    { key: "bolsas_armadas", label: "Bolsas armadas (referencia)", unidad: "bolsas" },
  ],
  empaque_papel: [{ key: "merma", label: "Merma", unidad: "bolsas" }],
};

// ─────────────────────────────────────────────
// HELPERS DE ESTADO / COLOR (mismo criterio visual que plástico)
// ─────────────────────────────────────────────
const colorEstado = (estado: string) => {
  if (estado === "terminado") return "text-green-700 bg-green-50 border-green-300";
  if (estado === "en_proceso") return "text-yellow-700 bg-yellow-50 border-yellow-300";
  if (estado === "resagado") return "text-white bg-black border-black";
  if (estado === "no_aplica") return "text-gray-400 bg-gray-100 border-gray-200";
  return "text-orange-700 bg-orange-50 border-orange-300";
};

const textoEstado = (estado: string) => {
  const m: Record<string, string> = {
    terminado: "Terminado",
    en_proceso: "En proceso",
    resagado: "Resagado",
    no_aplica: "No aplica",
    pendiente: "Pendiente",
  };
  return m[estado] ?? estado;
};

// ─────────────────────────────────────────────
// TARJETA PRODUCTO (ficha de papel, espejo de TarjetaProducto de plástico
// pero con los campos propios de la ficha de papel: material, calibre,
// asa, pegamento, suaje, etc. — tomados del encabezado del PDF OP26003)
// ─────────────────────────────────────────────
function TarjetaProductoPapel({ pedido }: { pedido: PedidoSeguimientoPapel }) {
  const cantidad = pedido.cantidad_orden != null
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
        <span><span className="text-gray-400">Cantidad </span>{cantidad} bolsas</span>
        {pedido.asa_tipo && (
          <span>
            <span className="text-gray-400">Asa </span>
            {pedido.asa_tipo}
            {pedido.asa_color ? ` ${pedido.asa_color}` : ""}
            {pedido.asa_medida ? ` ${pedido.asa_medida}` : ""}
          </span>
        )}
        {pedido.pegamento && <span><span className="text-gray-400">Pegamento </span>{pedido.pegamento}</span>}
        {pedido.tipo_pegue && <span><span className="text-gray-400">Tipo pegue </span>{pedido.tipo_pegue}</span>}
        {pedido.suaje && <span><span className="text-gray-400">Suaje </span>{pedido.suaje}</span>}
      </div>
      {pedido.descripcion && (
        <p className="text-sm text-gray-500 italic leading-tight border-t border-gray-200 pt-1.5">
          {pedido.descripcion}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BLOQUE VISUAL — HOJEADO / GUILLOTINA
// Espejo conceptual de calcularBobinaVisual de plástico, pero estos datos
// ya vienen capturados en el registro del proceso (no se calculan en el
// front, se muestran tal cual los campos propios de hojeado_papel /
// guillotina_papel — bobina_cm, rendimiento, pliego_medida, etc).
// ─────────────────────────────────────────────
function BloqueVisualHojeadoGuillotina({
  nombreProceso, registro,
}: { nombreProceso: NombreProcesoPapel; registro: any }) {
  if (!registro) return null;

  if (nombreProceso === "hojeado_papel") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
          📐 Hojeado — bobina a pliego
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
            <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Bobina</p>
            <p className="text-sm font-bold text-blue-800">{registro.bobina_cm ?? "—"} cm</p>
          </div>
          <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
            <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Hojeado</p>
            <p className="text-sm font-bold text-blue-800">{registro.hojeado_cm ?? "—"} cm</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
            <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Rendimiento</p>
            <p className="text-sm font-bold text-blue-800">{registro.rendimiento ?? "—"}</p>
          </div>
          <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
            <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Medida pliego</p>
            <p className="text-sm font-bold text-blue-800">{registro.pliego_medida ?? "—"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (nombreProceso === "guillotina_papel") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
          📐 Guillotina — pliego origen a corte
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
            <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Pliego origen</p>
            <p className="text-sm font-bold text-blue-800">{registro.pliego_origen_medida ?? "—"}</p>
          </div>
          <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
            <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Corte</p>
            <p className="text-sm font-bold text-blue-800">{registro.corte_medida ?? "—"}</p>
          </div>
        </div>
        <div className="text-center bg-white rounded border border-blue-100 px-2 py-2">
          <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Rendimiento</p>
          <p className="text-sm font-bold text-blue-800">{registro.rendimiento ?? "—"}</p>
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────
// SECCIÓN AVANCES PARCIALES (espejo de SeccionAvances de plástico,
// adaptado a unidades de papel: pliegos / bolsas)
// ─────────────────────────────────────────────
interface SeccionAvancesPapelProps {
  idproduccion: number;
  nombreProceso: NombreProcesoPapel;
  avances: AvanceParcialPapel[];
  totalAvances: number;
  onAvanceRegistrado: () => void;
  limiteAnterior: number | null;
}

function SeccionAvancesPapel({
  idproduccion, nombreProceso, avances, totalAvances, onAvanceRegistrado, limiteAnterior,
}: SeccionAvancesPapelProps) {
  const [cantidad, setCantidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState(false);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [esAvanceFinal, setEsAvanceFinal] = useState(false);
  const [ajusteFinal, setAjusteFinal] = useState("");
  const [datosFinales, setDatosFinales] = useState<Record<string, string>>({});

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
      setError("Ingresa una cantidad válida mayor a 0.");
      return;
    }

    const totalFinal = Number(totalAvances ?? 0) + cant + ajuste;

    setGuardando(true);
    setError(null);

    try {
      await registrarAvancePapel(idproduccion, {
        cantidad: cant,
        observaciones: observaciones.trim() || undefined,
        tabla_proceso: nombreProceso,
      });

      if (esAvanceFinal) {
        if (!campoPrincipalFinal) {
          throw new Error("No se pudo identificar el campo final del proceso.");
        }

        const payloadFinalizar: Record<string, any> = {
          tabla_proceso: nombreProceso,
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

      setCantidad("");
      setObservaciones("");
      setAjusteFinal("");
      setDatosFinales({});
      setEsAvanceFinal(false);

      onAvanceRegistrado();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Error al registrar avance");
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
                  onChange={(e) => {
                    setEsAvanceFinal(e.target.checked);
                    setError(null);
                  }}
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
                        onChange={(e) => {
                          setAjusteFinal(e.target.value.replace(/[^0-9.]/g, ""));
                          setError(null);
                        }}
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
                              onChange={(e) => {
                                setDatosFinales(prev => ({
                                  ...prev,
                                  [campo.key]: e.target.value.replace(/[^0-9.]/g, ""),
                                }));
                                setError(null);
                              }}
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
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
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
// TARJETA BULTO (espejo del de plástico, simplificado: papel siempre
// trabaja por unidades — bolsas — nunca por kilo, así que se omite la
// rama modoKilo y el badge de proceso_origen, que no aplica a papel ya
// que el único proceso que genera bultos es Empaque).
// ─────────────────────────────────────────────
interface NuevoBultoForm {
  cantidad_unidades: string;
  peso_producto: string;
  peso: string;
  alto: string;
  largo: string;
  ancho: string;
}
const FORM_VACIO: NuevoBultoForm = {
  cantidad_unidades: "", peso_producto: "", peso: "", alto: "", largo: "", ancho: "",
};

function TarjetaBultoPapel({ bulto, numero, bultosFinalizados, eliminando, onEliminar, onEditar, esParcialidad }: {
  bulto: Bulto; numero: number; bultosFinalizados: boolean;
  esParcialidad: boolean;
  eliminando: number | null; onEliminar: (idbulto: number) => void; onEditar: (bulto: Bulto) => void;
}) {
  const yaEnviado = esParcialidad && bulto.numero_parcialidad != null;

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${yaEnviado ? "opacity-50 bg-gray-100 border-gray-200" : "bg-white border-gray-200"
      }`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 ${yaEnviado ? "bg-gray-200" : "bg-gray-50"
        }`}>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">{numero}</span>
          <span className="text-sm font-semibold text-gray-800">
            {bulto.cantidad_unidades.toLocaleString("es-MX")}
            <span className="text-xs font-normal text-gray-500 ml-1">bolsas</span>
          </span>
          {yaEnviado && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-700 text-white">
              ✓ Envío {bulto.numero_parcialidad}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {new Date(bulto.fecha_creacion).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {!bultosFinalizados && !yaEnviado && (
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
          {!yaEnviado && (
            <button onClick={() => onEditar(bulto)}
              className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="grid grid-cols-4 gap-1.5">
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

function FilaEnvioParcialPapel({
  num, bultosGrupo, idproduccion, onError,
}: {
  num: number; bultosGrupo: Bulto[]; idproduccion: number; onError: (msg: string) => void;
}) {
  const [reimp, setReimp] = useState(false);
  const totalUnidadesGrupo = bultosGrupo.reduce((s, b) => s + b.cantidad_unidades, 0);

  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div>
        <p className="text-sm font-semibold text-gray-800">Envío parcial {num}</p>
        <p className="text-xs text-gray-500">
          {bultosGrupo.length} bulto{bultosGrupo.length !== 1 ? "s" : ""} · {totalUnidadesGrupo.toLocaleString("es-MX")} bolsas
        </p>
      </div>
      <button
        disabled={reimp}
        onClick={async () => {
          setReimp(true);
          try {
            const etiquetaData = await getBultosEtiqueta(idproduccion, num);
            const guardarS3 = await preguntarGuardarS3("etiquetas");
            await generarPdfEtiquetas(etiquetaData, guardarS3);
          } catch (e: any) {
            onError(e.response?.data?.error || "Error al reimprimir");
          } finally {
            setReimp(false);
          }
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
      >
        {reimp
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        }
        {reimp ? "..." : "Reimprimir"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECCIÓN BULTOS PAPEL (espejo de SeccionBultos de plástico, pero
// siempre en modo unidades/bolsas — papel nunca trabaja por kilo)
// ─────────────────────────────────────────────
function SeccionBultosPapel({
  pedido, cantidadReal, limiteEnCurso,
}: {
  pedido: PedidoSeguimientoPapel;
  cantidadReal?: number | null;
  limiteEnCurso?: number | null;
}) {
  const [bultos, setBultos] = useState<Bulto[]>([]);
  const [totalUnidades, setTotalUnidades] = useState(0);
  const [bultosFinalizados, setBultosFinalizados] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [confirmFinalizar, setConfirmFinalizar] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [form, setForm] = useState<NuevoBultoForm>(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [generandoEtiquetas, setGenerandoEtiquetas] = useState(false);
  const [editandoBulto, setEditandoBulto] = useState<Bulto | null>(null);
  const [formEditar, setFormEditar] = useState<NuevoBultoForm>(FORM_VACIO);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [repetir, setRepetir] = useState("1");

  const esParcialidad = Boolean((pedido as any).es_parcialidad);

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

  const bultosNuevos = bultos.filter(b => b.numero_parcialidad == null);
  const bultosEnviados = bultos.filter(b => b.numero_parcialidad != null);

  const abrirEditar = (bulto: Bulto) => {
    setFormEditar({
      cantidad_unidades: bulto.cantidad_unidades > 0 ? String(bulto.cantidad_unidades) : "",
      peso_producto: "",
      peso: bulto.peso != null ? String(bulto.peso) : "",
      alto: bulto.alto != null ? String(bulto.alto) : "",
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
        peso: formEditar.peso !== "" ? parseFloat(formEditar.peso) : null,
        alto: formEditar.alto !== "" ? parseFloat(formEditar.alto) : null,
        largo: formEditar.largo !== "" ? parseFloat(formEditar.largo) : null,
        ancho: formEditar.ancho !== "" ? parseFloat(formEditar.ancho) : null,
      };
      const actualizado = await editarBultoService(pedido.idproduccion, editandoBulto.idbulto, payload);
      setBultos(prev => prev.map(b => b.idbulto === actualizado.idbulto ? actualizado : b));
      const nuevosTotal = bultos.map(b => b.idbulto === actualizado.idbulto ? actualizado : b);
      setTotalUnidades(nuevosTotal.reduce((s, b) => s + b.cantidad_unidades, 0));
      setEditandoBulto(null);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al editar bulto");
    } finally { setGuardandoEdicion(false); }
  };

  const updateForm = (campo: keyof NuevoBultoForm, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  const validarFormulario = (): string | null => {
    const cant = parseInt(form.cantidad_unidades);
    if (!cant || cant <= 0) return "Ingresa una cantidad válida mayor a 0.";
    if (!form.peso.trim() || parseFloat(form.peso) <= 0)
      return "El peso empaquetado es obligatorio.";
    if (!form.alto.trim() || !form.largo.trim() || !form.ancho.trim() ||
      parseFloat(form.alto) <= 0 || parseFloat(form.largo) <= 0 || parseFloat(form.ancho) <= 0)
      return "Las dimensiones del bulto (alto, largo y ancho) son obligatorias.";
    return null;
  };

  const camposRequeridos = ["cantidad_unidades", "peso", "alto", "largo", "ancho"] as const;
  const formularioCompleto = camposRequeridos.every(k => form[k].trim() !== "");
  const camposLlenos = camposRequeridos.filter(k => form[k].trim() !== "").length;

  const cantidadIngresada = parseInt(form.cantidad_unidades || "0") || 0;
  const limiteEfectivo = cantidadReal ?? limiteEnCurso ?? null;
  const totalActual = totalUnidades;
  const valorIngresado = cantidadIngresada;

  const repeticionesNum = Math.max(1, Math.min(50, parseInt(repetir) || 1));
  const esBatch = repeticionesNum > 1 && valorIngresado > 0;
  const valorTotalIngresado = valorIngresado * repeticionesNum;
  const proyectadoTotal = totalActual + valorTotalIngresado;
  const excedeLimiteBulto = limiteEfectivo != null && valorIngresado > 0 && proyectadoTotal > limiteEfectivo;
  const completaLimite = limiteEfectivo != null && valorIngresado > 0 && proyectadoTotal >= limiteEfectivo;
  const disponibleBultos = limiteEfectivo != null ? Math.max(limiteEfectivo - totalActual, 0) : null;

  const handleAgregar = async () => {
    const mensajeError = validarFormulario();
    if (mensajeError) { setError(mensajeError); return; }

    const repeticionesNum = Math.max(1, Math.min(50, parseInt(repetir) || 1));
    setGuardando(true); setError(null);

    try {
      const payload: NuevoBultoPayload = {
        cantidad_unidades: form.cantidad_unidades !== "" ? parseInt(form.cantidad_unidades) : undefined,
        peso: form.peso !== "" ? parseFloat(form.peso) : undefined,
        alto: form.alto !== "" ? parseFloat(form.alto) : undefined,
        largo: form.largo !== "" ? parseFloat(form.largo) : undefined,
        ancho: form.ancho !== "" ? parseFloat(form.ancho) : undefined,
      };

      if (repeticionesNum === 1) {
        const nuevo = await agregarBulto(pedido.idproduccion!, payload);
        setBultos(prev => [...prev, nuevo]);
        setTotalUnidades(prev => prev + nuevo.cantidad_unidades);
      } else {
        const payloadBatch: NuevoBultoBatchPayload = { ...payload, repeticiones: repeticionesNum };
        const resultado = await agregarBultosBatch(pedido.idproduccion!, payloadBatch);
        setBultos(prev => [...prev, ...resultado.bultos]);
        setTotalUnidades(prev => prev + resultado.bultos.reduce((s, b) => s + b.cantidad_unidades, 0));
      }

      setForm(FORM_VACIO);
      setRepetir("1");
    } catch (e: any) {
      const mensajeBackend = e.response?.data?.error;
      if (mensajeBackend?.includes("último proceso") || mensajeBackend?.includes("completamente terminada")) {
        setError("El proceso aún no está listo para registrar bultos. Asegúrate de que esté en curso con al menos un avance.");
      } else {
        setError(mensajeBackend || "Error al agregar bulto(s)");
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
      const guardarS3 = await preguntarGuardarS3("etiquetas");
      await generarPdfEtiquetas(etiquetaData, guardarS3);
      if (etiquetaData.es_parcialidad && etiquetaData.numero_envio_parcial) {
        const idbultos = etiquetaData.bultos.map(b => b.idbulto);
        await marcarBultosParcialidad(pedido.idproduccion, etiquetaData.numero_envio_parcial, idbultos);
        await cargarBultos();
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al generar etiquetas");
    } finally { setGenerandoEtiquetas(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Total bultos</p>
          <p className="text-2xl font-bold text-blue-800">{bultos.length}</p>
          {esParcialidad && bultosNuevos.length < bultos.length && (
            <p className="text-[10px] text-blue-500 mt-0.5">
              {bultosNuevos.length} nuevos · {bultosEnviados.length} enviados
            </p>
          )}
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-green-400 uppercase tracking-wide mb-0.5">Total bolsas</p>
          <p className="text-2xl font-bold text-green-800">{totalUnidades.toLocaleString("es-MX")}</p>
          <p className="text-[10px] text-green-400">bolsas</p>
        </div>
      </div>

      {cantidadReal != null && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">📊 Producción real del proceso</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-white rounded border border-amber-100 px-2 py-2">
              <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-0.5">Total producido</p>
              <p className="text-lg font-bold text-amber-800">{cantidadReal.toLocaleString("es-MX")}</p>
              <p className="text-[10px] text-amber-400">bolsas</p>
            </div>
            <div className="text-center bg-white rounded border border-amber-100 px-2 py-2">
              <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-0.5">Ya en bultos</p>
              <p className="text-lg font-bold text-blue-700">{totalActual.toLocaleString("es-MX")}</p>
              <p className="text-[10px] text-amber-400">bolsas</p>
            </div>
            <div className={`text-center rounded border px-2 py-2 ${cantidadReal - totalActual <= 0 ? "bg-green-50 border-green-200" : "bg-white border-amber-100"}`}>
              <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-0.5">Disponible</p>
              <p className={`text-lg font-bold ${cantidadReal - totalActual <= 0 ? "text-green-600" : "text-amber-800"}`}>
                {Math.max(cantidadReal - totalActual, 0).toLocaleString("es-MX")}
              </p>
              <p className="text-[10px] text-amber-400">bolsas</p>
            </div>
          </div>
        </div>
      )}

      {esParcialidad && bultosEnviados.length > 0 && (() => {
        const grupos = bultosEnviados.reduce((acc, b) => {
          const n = b.numero_parcialidad!;
          if (!acc[n]) acc[n] = [];
          acc[n].push(b);
          return acc;
        }, {} as Record<number, Bulto[]>);

        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2 bg-gray-100 border-b border-gray-200">
              📋 Historial de envíos parciales
            </p>
            <div className="divide-y divide-gray-100">
              {Object.entries(grupos).map(([numStr, bultosGrupo]) => (
                <FilaEnvioParcialPapel
                  key={numStr}
                  num={Number(numStr)}
                  bultosGrupo={bultosGrupo}
                  idproduccion={pedido.idproduccion!}
                  onError={(msg) => setError(msg)}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {bultosFinalizados ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800 text-sm font-medium">Bultos finalizados. No se pueden agregar ni eliminar más registros.</p>
          </div>
          <button onClick={handleImprimirEtiquetas} disabled={generandoEtiquetas || bultosNuevos.length === 0}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {generandoEtiquetas
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            {generandoEtiquetas
              ? "Generando..."
              : bultosNuevos.length === 0
                ? "Sin bultos pendientes"
                : `🏷️ Imprimir Etiquetas PDF (${bultosNuevos.length} bulto${bultosNuevos.length !== 1 ? "s" : ""} pendientes)`
            }
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

          <div className="flex gap-3 items-start">
            <div className="flex-1 w-3/4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Cantidad de bolsas <span className="text-red-500">*</span>
                {disponibleBultos !== null && (
                  <span className="ml-2 text-[10px] text-gray-400 font-normal">
                    (máx. {disponibleBultos.toLocaleString("es-MX")} bolsas disponibles)
                  </span>
                )}
              </label>
              <input type="text" inputMode="numeric" value={form.cantidad_unidades}
                onChange={e => { updateForm("cantidad_unidades", e.target.value.replace(/[^0-9]/g, "")); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleAgregar()}
                placeholder="Ej: 3000"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 bg-white ${excedeLimiteBulto ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-400"}`}
              />
            </div>

            <div className="w-1/4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Multiplicador
                <span className="ml-1.5 text-[10px] text-blue-500 font-semibold">× bultos</span>
              </label>
              <input type="text" min="1" max="50" value={repetir}
                onChange={e => { setRepetir(e.target.value.replace(/[^0-9]/g, "")); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleAgregar()}
                placeholder="1"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-center font-semibold"
              />
            </div>
          </div>

          {esBatch && (
            <p className="text-[10px] mt-1 text-blue-600 font-medium">
              Se crearán {repeticionesNum} bultos separados de{" "}
              {valorIngresado.toLocaleString("es-MX")} bolsas c/u.
              Total: {valorTotalIngresado.toLocaleString("es-MX")} bolsas.
            </p>
          )}

          {excedeLimiteBulto && (
            <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-200 rounded px-3 py-2">
              <span className="text-red-500 text-sm flex-shrink-0">⚠️</span>
              <p className="text-[10px] text-red-600">
                <strong>Excede lo producido.</strong> Con {valorIngresado.toLocaleString("es-MX")} bolsas por bulto{" "}
                {esBatch && `× ${repeticionesNum} = ${valorTotalIngresado.toLocaleString("es-MX")} bolsas `}
                llegarías a {proyectadoTotal.toLocaleString("es-MX")} bolsas, superando el límite de{" "}
                {limiteEfectivo?.toLocaleString("es-MX")} bolsas.
              </p>
            </div>
          )}
          {!excedeLimiteBulto && valorIngresado > 0 && (
            <p className={`text-[10px] mt-1 font-medium ${completaLimite ? "text-green-600" : "text-orange-600"}`}>
              {completaLimite
                ? `✓ Con esta operación se completan las ${limiteEfectivo?.toLocaleString("es-MX")} bolsas`
                : `Total acumulado después de la operación: ${proyectadoTotal.toLocaleString("es-MX")} bolsas`
              }
            </p>
          )}

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Peso empaquetado y dimensiones <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {([
                { key: "peso", label: "Peso emp. (kg)", color: "orange" },
                { key: "alto", label: "Alto (cm)", color: "teal" },
                { key: "largo", label: "Largo (cm)", color: "teal" },
                { key: "ancho", label: "Ancho (cm)", color: "teal" },
              ] as const).map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-[10px] font-medium text-${color}-600 mb-1 uppercase tracking-wide`}>
                    {label} <span className="text-red-500">*</span>
                  </label>
                  <input type="text" inputMode="decimal" value={form[key]}
                    onChange={e => { updateForm(key, e.target.value.replace(/[^0-9.]/g, "")); setError(null); }}
                    placeholder="0.0"
                    className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-${color}-300 placeholder-${color}-300 text-${color}-800 ${form[key].trim() !== "" ? `border-${color}-400 bg-${color}-50` : "border-red-200 bg-red-50"}`}
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
            Agregar bulto{esBatch ? `s (${repeticionesNum})` : ""}
          </button>
        </div>
      )}

      {error && <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{error}</div>}

      {cargando ? (
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bultos.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">No hay bultos registrados aún</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {esParcialidad && bultosEnviados.length > 0 && (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
              Enviados anteriormente ({bultosEnviados.length})
            </p>
          )}
          {bultosEnviados.map((b, idx) => (
            <TarjetaBultoPapel key={b.idbulto} bulto={b} numero={idx + 1}
              bultosFinalizados={bultosFinalizados} eliminando={eliminando}
              esParcialidad={esParcialidad}
              onEliminar={handleEliminar} onEditar={abrirEditar} />
          ))}
          {esParcialidad && bultosNuevos.length > 0 && bultosEnviados.length > 0 && (
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide px-1 pt-1">
              Nuevos — pendientes de enviar ({bultosNuevos.length})
            </p>
          )}
          {esParcialidad && bultosNuevos.map((b, idx) => (
            <TarjetaBultoPapel
              key={b.idbulto} bulto={b} numero={bultosEnviados.length + idx + 1}
              bultosFinalizados={bultosFinalizados} eliminando={eliminando}
              esParcialidad={esParcialidad}
              onEliminar={handleEliminar} onEditar={abrirEditar}
            />
          ))}
          {!esParcialidad && bultos.map((b, idx) => (
            <TarjetaBultoPapel key={b.idbulto} bulto={b} numero={idx + 1}
              bultosFinalizados={bultosFinalizados} eliminando={eliminando}
              esParcialidad={false}
              onEliminar={handleEliminar} onEditar={abrirEditar} />
          ))}
        </div>
      )}

      {!bultosFinalizados && bultos.length > 0 && (
        <>
          {!confirmFinalizar ? (
            <div className="flex flex-col gap-2">
              {esParcialidad && (
                <button onClick={handleImprimirEtiquetas}
                  disabled={generandoEtiquetas || bultosNuevos.length === 0}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                  {generandoEtiquetas
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  {generandoEtiquetas
                    ? "Generando..."
                    : bultosNuevos.length === 0
                      ? "Sin bultos pendientes"
                      : `🏷️ Etiquetas parciales (${bultosNuevos.length} bulto${bultosNuevos.length !== 1 ? "s" : ""} nuevos)`
                  }
                </button>
              )}
              <button onClick={() => setConfirmFinalizar(true)}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Finalizar bultos
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
              <p className="text-sm font-semibold text-amber-800">⚠️ ¿Confirmas que ya no se agregarán más bultos?</p>
              <p className="text-xs text-amber-700">Esta acción es irreversible.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmFinalizar(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={handleFinalizar} disabled={finalizando}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
                  {finalizando && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Sí, finalizar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {editandoBulto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">✏️ Editar Bulto #{editandoBulto.idbulto}</p>
              <button onClick={() => setEditandoBulto(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Cantidad de bolsas <span className="text-red-500">*</span>
              </label>
              <input type="text" inputMode="numeric" value={formEditar.cantidad_unidades}
                onChange={e => setFormEditar(p => ({ ...p, cantidad_unidades: e.target.value.replace(/[^0-9]/g, "") }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Ej: 3000" />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Peso empaquetado y dimensiones</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "peso", label: "Peso emp. (kg)", color: "orange" },
                  { key: "alto", label: "Alto (cm)", color: "teal" },
                  { key: "largo", label: "Largo (cm)", color: "teal" },
                  { key: "ancho", label: "Ancho (cm)", color: "teal" },
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
                disabled={guardandoEdicion || !formEditar.cantidad_unidades}
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
// MODAL PROCESO INDIVIDUAL — PAPEL
// ─────────────────────────────────────────────
interface PropsPapel {
  pedido: PedidoSeguimientoPapel;
  nombreProceso: NombreProcesoPapel;
  onClose: () => void;
  onActualizar: () => void;
}

export default function ModalProcesoIndividualPapel({ pedido, nombreProceso, onClose, onActualizar }: PropsPapel) {
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

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      setCargando(true); setError(null);
      const res = await getProcesosOrdenPapel(pedido.idproduccion!);
      setDatos(res);
      const proc = res.procesos.find((p) => p.tabla === nombreProceso);
      if (proc?.registro?.observaciones) setObservaciones(proc.registro.observaciones);
    } catch { setError("No se pudieron cargar los procesos."); }
    finally { setCargando(false); }
  };

  const proc = datos?.procesos.find((p) => p.tabla === nombreProceso);
  const esActual = datos?.proceso_actual === proc?.idproceso_cat || proc?.estado === "en_proceso";

  // ── Cálculo del "anterior": el array `datos.procesos` ya viene
  // filtrado y ordenado en cascada real por el backend (solo los
  // procesos que aplican a esta orden según su maquinaria de ficha), por
  // lo que el índice -1 funciona correctamente aquí — a diferencia de
  // plástico, donde el riesgo era asumir 4 procesos fijos sin filtrar.
  const procIndex = datos?.procesos.findIndex((p) => p.tabla === nombreProceso) ?? -1;
  const procAnterior = procIndex > 0 ? datos?.procesos[procIndex - 1] : null;
  const anteriorTieneAvancesOTerminado =
    procAnterior?.estado === "terminado" ||
    (procAnterior?.avances != null && procAnterior.avances.length > 0);
  const anteriorTerminado = procAnterior == null || procAnterior?.estado === "terminado";

  const campos = CAMPOS_PROCESO_PAPEL[nombreProceso] ?? [];
  const camposFicha = CAMPOS_FICHA_PAPEL[nombreProceso] ?? [];
  const camposRegistroPropio = CAMPOS_REGISTRO_PROPIO_PAPEL[nombreProceso] ?? [];
  const limiteAnterior: number | null = (proc as any)?.limite_avance ?? null;
  const esBloqueVisual = nombreProceso === "hojeado_papel" || nombreProceso === "guillotina_papel";

  const handleIniciar = async () => {
    if (!pedido.idproduccion) return;
    setGuardando(true); setError(null);
    try {
      await iniciarProcesoPapel(pedido.idproduccion, nombreProceso, {});
      await cargar(); onActualizar(); setAccion(null);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al iniciar proceso");
    } finally { setGuardando(false); }
  };

  const handleFinalizar = async () => {
    if (!pedido.idproduccion) return;
    setGuardando(true); setError(null);
    try {
      await finalizarProcesoPapel(pedido.idproduccion, {
        ...formDatos, observaciones: observaciones.trim() || null, tabla_proceso: nombreProceso,
      });
      await cargar(); onActualizar(); setAccion(null); setFormDatos({});
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al finalizar proceso");
    } finally { setGuardando(false); }
  };

  const handleAbrirFinalizar = () => {
    const preFill: Record<string, any> = {};
    const camposEntrada = campos.filter(c => c.readOnly);
    camposEntrada.forEach(c => {
      preFill[c.key] = proc?.registro?.[c.key] ?? procAnterior?.registro?.pliegos_entregados
        ?? procAnterior?.registro?.cantidad_entregada ?? procAnterior?.registro?.bolsas_entregadas ?? 0;
    });
    setFormDatos(preFill); setAccion("finalizar");
  };

  const handleAbrirEditar = () => {
    const preFill: Record<string, any> = {};
    if (proc?.registro) {
      [...campos, ...camposRegistroPropio].forEach((c) => {
        if (proc.registro[c.key] != null) preFill[c.key] = proc.registro[c.key];
      });
      if (proc.registro.maquina != null) preFill.maquina = proc.registro.maquina;
      if (proc.registro.fecha_inicio) preFill.fecha_inicio = proc.registro.fecha_inicio?.slice(0, 16);
      if (proc.registro.fecha_fin) preFill.fecha_fin = proc.registro.fecha_fin?.slice(0, 16);
    }
    setFormEditar(preFill); setObsEditar(proc?.registro?.observaciones ?? "");
    setEditando(true); setError(null);
  };

  const handleGuardarEdicion = async () => {
    if (!pedido.idproduccion) return;
    setGuardandoEdit(true); setError(null);
    try {
      await editarProcesoPapel(pedido.idproduccion, nombreProceso, {
        ...formEditar, observaciones: obsEditar.trim() || null,
      });
      await cargar(); onActualizar(); setEditando(false);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al guardar los cambios");
    } finally { setGuardandoEdit(false); }
  };

  const tienePendienteSinIniciar = proc?.registro != null && !proc?.registro?.fecha_inicio;
  const puedeIniciar = (datos?.proceso_actual === proc?.idproceso_cat && proc?.estado === "pendiente") || tienePendienteSinIniciar;
  const puedeFinalizar = proc?.estado === "en_proceso" && proc?.registro?.fecha_inicio && anteriorTerminado;
  const puedeAvance = proc?.estado === "en_proceso" && proc?.registro?.fecha_inicio;
  const nombreLabel = NOMBRES_PROCESO_PAPEL[nombreProceso] ?? nombreProceso.replace("_papel", "").replace("_", " ");

  const nombreProcesoAnterior = procAnterior ? (NOMBRES_PROCESO_PAPEL[procAnterior.tabla] ?? null) : null;
  const observacionesAnteriores = proc?.observaciones_proceso_anterior;

  // Último proceso de papel: siempre Empaque, sin excepción (a diferencia
  // de plástico, que alterna entre bolseo y asa_flexible).
  const esUltimoProceso = nombreProceso === ULTIMO_PROCESO_PAPEL;

  const cantidadRealBultos = esUltimoProceso && proc?.estado === "terminado"
    ? (proc?.registro?.bolsas_entregadas_final != null ? Number(proc.registro.bolsas_entregadas_final) : null)
    : null;

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

      <TarjetaProductoPapel pedido={pedido} />

      {/* ── Ficha del producto — específica de este proceso ──
          Datos que ya existen en la ficha (detalle_material_papel,
          solicitud_producto_papel, acabados_papel, foil, cat_textura) y
          el backend trae por JOIN. Es información de solo lectura, nunca
          se edita desde aquí — para cambiarla hay que editar la ficha del
          producto, no el registro de este proceso. */}
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

      {esBloqueVisual && proc?.registro && (
        <BloqueVisualHojeadoGuillotina nombreProceso={nombreProceso} registro={proc.registro} />
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
              {/* Máquina usada en esta corrida — dato real del registro, no de ficha */}
              {proc.registro.maquina && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Máquina</span>
                  <span className="font-semibold text-indigo-700">{proc.registro.maquina}</span>
                </div>
              )}
              {/* Campos propios de esta corrida que SÍ viven en el registro
                  del proceso (ej. cálculos de laminación, folio de suaje) */}
              {camposRegistroPropio.map((campo) => {
                const val = proc.registro?.[campo.key];
                if (val === null || val === undefined || val === "") return null;
                return (
                  <div key={campo.key} className="flex justify-between text-xs">
                    <span className="text-gray-400">{campo.label}</span>
                    <span className="font-semibold text-indigo-700">{val}</span>
                  </div>
                );
              })}
              {/* Cascada entrada → merma → salida */}
              {campos.map((campo) => {
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
            <SeccionAvancesPapel
              idproduccion={pedido.idproduccion!}
              nombreProceso={nombreProceso}
              avances={proc.avances ?? []}
              totalAvances={proc.total_avances ?? 0}
              onAvanceRegistrado={async () => { await cargar(); onActualizar(); }}
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
                      Total: {(proc.total_avances ?? 0).toLocaleString("es-MX")} {AVANCE_UNIDAD_PAPEL[nombreProceso]?.unidad ?? ""}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(proc.avances ?? []).map((a, idx) => (
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
                    <span className="text-[10px] text-blue-500 uppercase tracking-wide font-medium">{nombreLabel}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Máquina</label>
                    <input type="text" value={formEditar.maquina ?? ""}
                      onChange={e => setFormEditar((prev: Record<string, any>) => ({ ...prev, maquina: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="—"
                    />
                  </div>
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

              {esUltimoProceso && (
                <>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">📦 Registro de bultos</p>
                  </div>
                  <SeccionBultosPapel pedido={pedido} cantidadReal={cantidadRealBultos} limiteEnCurso={null} />
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
              <SeccionBultosPapel pedido={pedido} cantidadReal={null} limiteEnCurso={limiteEnCursoBultos} />
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