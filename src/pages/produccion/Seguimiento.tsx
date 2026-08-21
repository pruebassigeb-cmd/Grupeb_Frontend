import { useState, useEffect, useRef } from "react";
import Dashboard from "../../layouts/Sidebar";
import RequiereConexion from "../../components/pwa/RequiereConexion";
import { getSeguimiento, getCuentasPorCobrar } from "../../services/produccion/seguimientoService";
import type { CuentaPorCobrar } from "../../services/produccion/seguimientoService";
// ── NUEVO: días hábiles compartido (antes vivía declarado inline aquí abajo) ──
import { contarDiasHabiles } from "../../utils/diasHabiles";
import { marcarDescargaIniciada, marcarDescargaFinalizada, hayDescargaEnCurso } from "../../utils/descargasActivas";
import { descargarPdfOrdenProduccionUniversal } from "../../services/produccion/descargarPdfOrdenProduccion";
import { generarPdfEstadoCuentaSimple } from "../../utils/generarPdfEstadoCuentaSimple";
import { generarPdfPedido } from "../../utils/generarPdfPedido";
import { getEstadoCuenta } from "../../services/anticipoLiquidacion/estadoCuentaService";
import { preguntarGuardarS3 } from "../../services/pdfS3.service";
import { getVentaByPedido, getMetodosPago } from "../../services/ventasservice";
import {
  CLAVE_PEDIDO_ACTUALIZADO,
  EVENTO_PEDIDO_ACTUALIZADO,
  getPedidos,
} from "../../services/pedidosService";
import { invalidarSolicitudesGet } from "../../services/api";
import type { PedidoSeguimiento } from "../../types/produccion/seguimiento.types";
import type { Venta, MetodoPago } from "../../types/ventas.types";
import type { Pedido } from "../../types/cotizaciones.types";
import Modal from "../../components/Modal";
import ModalProcesoIndividual from "../../components/plastico/ModalProcesoIndividual";
import ModalEnvioSeguimiento from "../../components/envio/ModalEnvioSeguimiento";
import ChatRevision from "../../components/diseno/ChatRevision";
import { EditarAntLiqReal } from "../anticipoLiquidacion/AnticipoLiquidacion";
import { EditarDisenoReal } from "../diseno/Diseno";
import { useAuth } from "../../context/AuthContext";
import { usePermiso, usePermisos } from "../../hooks/usePermiso";
import ModalVerificarOperador from "../../components/produccion/ModalVerificarOperador";
import { setTokenProceso } from "../../services/procesoTokenStore";
import type { Proceso as ProcesoVerificacion } from "../../components/produccion/ModalVerificarOperador";
import { showAlert } from '../../components/CustomAlert';
import ModalProcesoIndividualPapel from "../../components/papel/ModalProcesoIndividualPapel";
import { getProcesosOrdenPapel } from "../../services/papel/seguimientoPapelService";
import type {
  ProcesoRegistroPapel,
  ProcesosOrdenPapelRespuesta,
} from "../../services/papel/seguimientoPapelService";
import type { PedidoSeguimientoPapel, NombreProcesoPapel } from "../../types/papel/seguimientoPapel.types";
import { NOMBRES_PROCESO_PAPEL } from "../../types/papel/seguimientoPapel.types";
import { esProductoOrdenPapel } from "../../utils/papel/ordenProduccionPapelPdf.helpers";


// Margen mínimo entre recargas automáticas disparadas por foco/visibilidad.
// Volver a la ventana (tras un diálogo de archivos, una descarga de PDF o un
// cambio de pestaña) no debe relanzar el seguimiento completo si acabamos de
// traerlo: el evento se ignora dentro de esa ventana de tiempo.
const MS_MINIMO_ENTRE_RECARGAS = 15_000;

const diasDesde = (fecha: string | null): number | null => {
  if (!fecha) return null;
  const diff = Date.now() - new Date(fecha).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const formatearFechaAprobacion = (fecha: string | null): string | null => {
  if (!fecha) return null;
  return new Date(fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

const FechaAprobacion = ({ fecha }: { fecha: string | null }) => {
  const texto = formatearFechaAprobacion(fecha);
  if (!texto) return null;
  return <div className="text-[10px] text-gray-400 leading-tight mt-0.5 whitespace-nowrap">✓ {texto}</div>;
};

// Fecha corta (día/mes en números, ej. "17/08") que se muestra debajo de los
// botones de proceso cuando ya fueron finalizados.
const formatearFechaCorta = (fecha: string | null): string | null => {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return null;
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
};

const FechaCorta = ({ fecha }: { fecha: string | null }) => {
  const texto = formatearFechaCorta(fecha);
  if (!texto) return null;
  return <div className="text-[10px] text-gray-400 leading-tight mt-0.5 text-center whitespace-nowrap">{texto}</div>;
};

// ✅ NUEVO: pseudo-estado exclusivo del badge "OD" — la orden de diseño
// está aprobada administrativamente (od.estado = 'aprobado') pero nadie ha
// subido todavía ningún archivo real (render/master/feedback) a esa orden.
// El texto sigue diciendo "Aprobado" (mismo mapa de textos), pero el color
// se pinta como "pendiente" (naranja) para que no se lea como que el
// diseño ya está listo de verdad. Se agrega a la lista de estados
// "terminales" de abajo para que NO le apliquen los colores de
// envejecimiento (gris/rojo por días sin cambio) — ese cómputo es solo
// para procesos que de verdad siguen pendientes de arrancar.
const obtenerColorEstadoProceso = (
  estado: string,
  fechaEstado: string | null,
  intensificado: boolean = false,
): string => {
  if (estado === "finalizado" || estado === "no-aplica" || estado === "aprobado"
    || estado === "pagado" || estado === "aprobado_sin_archivos") {
    return obtenerColorEstado(estado);
  }
  if (estado === "resagado") return "bg-gray-800 text-white border-gray-700";
  const dias = diasDesde(fechaEstado);
  if (dias !== null && dias >= 10) return "bg-gray-600 text-white border-gray-500";
  if (dias !== null && dias >= 7) return "bg-red-600 text-white border-red-700";
  // ✅ NUEVO: "le toca arrancar" — el proceso inmediatamente anterior en el
  // pipeline (Ext→Imp→Bol/Asa para plástico, o el cascade dinámico de
  // papel) ya quedó finalizado, así que este ya está listo para empezar.
  // Mismo naranja de "pendiente" pero 2 tonos más intenso, para que salte
  // a la vista sin inventar un color nuevo que rompa el código de colores.
  if (intensificado && estado === "pendiente") {
    return "bg-orange-300 text-orange-900 border-orange-500";
  }
  return obtenerColorEstado(estado);
};

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
    // ✅ NUEVO: ver comentario arriba de obtenerColorEstadoProceso.
    case "aprobado_sin_archivos":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "resagado":
      return "bg-gray-800 text-white border-gray-700";
    case "no-aplica":
      return "bg-gray-100 text-gray-400 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-300";
  }
};

const obtenerTextoEstado = (estado: string) => {
  const mapa: Record<string, string> = {
    finalizado: "✓", proceso: "⚙", pendiente: "–",
    detenido: "!", resagado: "!", "no-aplica": "N/A", aprobado: "✓", pagado: "✓",
    aprobado_sin_archivos: "✓",
  };
  return mapa[estado] ?? "–";
};

const Badge = ({
  estado, fechaEstado = null, clickable = false, onClick, intensificado = false,
}: {
  estado: string; fechaEstado?: string | null; clickable?: boolean; onClick?: () => void;
  // ✅ NUEVO: true cuando este proceso es el que sigue justo después de uno
  // recién finalizado — sube el tono del naranja de "pendiente" para
  // marcar visualmente "ya te toca". Ver calcularProcesoSiguiente().
  intensificado?: boolean;
}) => {
  const dias = diasDesde(fechaEstado);
  const color = obtenerColorEstadoProceso(estado, fechaEstado, intensificado);
  const titulo = dias !== null && (estado === "pendiente" || estado === "proceso")
    ? `${estado} · ${dias} día${dias !== 1 ? "s" : ""} sin cambio`
    : estado;
  const base = `inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${color}`;
  const cursor = clickable && estado !== "no-aplica" ? "cursor-pointer hover:scale-110 hover:shadow-md transition-transform" : "";
  return (
    <span title={titulo} className={`${base} ${cursor}`}
      onClick={clickable && estado !== "no-aplica" ? onClick : undefined}>
      {obtenerTextoEstado(estado)}
    </span>
  );
};

const BadgeTexto = ({ estado, fechaEstado = null }: { estado: string; fechaEstado?: string | null }) => {
  const textos: Record<string, string> = {
    finalizado: "Finalizado", proceso: "En Proceso", pendiente: "Pendiente",
    resagado: "Resagado", "no-aplica": "N/A", aprobado: "Aprobado", pagado: "Pagado ✓",
    // ✅ NUEVO: mismo texto "Aprobado" — solo cambia el color (ver
    // obtenerColorEstado), para el caso "aprobado pero sin archivos".
    aprobado_sin_archivos: "Aprobado",
  };
  const color = obtenerColorEstadoProceso(estado, fechaEstado);
  const dias = diasDesde(fechaEstado);
  const titulo = dias !== null ? `${textos[estado] ?? estado} · ${dias} día${dias !== 1 ? "s" : ""}` : undefined;
  return (
    <span title={titulo} className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${color}`}>
      {textos[estado] ?? estado}
    </span>
  );
};

const BadgeTextoBtn = ({ estado, fechaEstado = null, onClick, cargando = false }: {
  estado: string; fechaEstado?: string | null; onClick: () => void; cargando?: boolean;
}) => {
  const textos: Record<string, string> = {
    finalizado: "Finalizado", proceso: "En Proceso", pendiente: "Pendiente",
    resagado: "Resagado", "no-aplica": "N/A", aprobado: "Aprobado", pagado: "Pagado ✓",
    // ✅ NUEVO: mismo texto "Aprobado" — solo cambia el color (ver
    // obtenerColorEstado), para el caso "aprobado pero sin archivos".
    aprobado_sin_archivos: "Aprobado",
  };
  const color = obtenerColorEstadoProceso(estado, fechaEstado);
  const dias = diasDesde(fechaEstado);
  const titulo = dias !== null ? `${textos[estado] ?? estado} · ${dias} día${dias !== 1 ? "s" : ""}` : "Abrir módulo";
  return (
    <button onClick={onClick} disabled={cargando} title={titulo}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-all
        hover:brightness-95 hover:shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed
        ${color}`}>
      {cargando && <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {textos[estado] ?? estado}
    </button>
  );
};

// ✅ NUEVO: dado el pipeline de procesos de una fila (en orden — Ext→Imp→
// Bol/Asa para plástico, o el cascade de 11 pasos de papel), regresa la
// key del proceso que "sigue": el primero en "pendiente" cuyo predecesor
// inmediato (ignorando los que no aplican a este producto) ya quedó
// "finalizado". Solo puede haber uno por fila — es al que le toca
// arrancar — y se usa para intensificar su color (ver Badge/
// obtenerColorEstadoProceso). Si no hay ninguno así (nada finalizado
// todavía, o ya se finalizó todo), regresa null y ningún badge se resalta.
function calcularProcesoSiguiente<K extends string>(
  pasos: { key: K; estado: string }[]
): K | null {
  const aplican = pasos.filter(p => p.estado !== "no-aplica");
  for (let i = 1; i < aplican.length; i++) {
    if (aplican[i].estado === "pendiente" && aplican[i - 1].estado === "finalizado") {
      return aplican[i].key;
    }
  }
  return null;
}

const IconoPdf = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

function BotonPdfPedido({ pedido, puedePdf }: { pedido: PedidoSeguimiento; puedePdf: boolean }) {
  const [descargando, setDescargando] = useState(false);

  const esLineaPapel = (p: any): boolean =>
    p?.tipo_material === "papel" || p?.tipoCotizacion === "papel";

  const resolverCalibre = (p: any): string => {
    const mat = (p.material || "").toUpperCase();
    const esBopp = mat.includes("BOPP") || mat.includes("CELOFAN") || mat.includes("CELOFÁN");
    if (esBopp) {
      const cb = p.calibre_bopp ? String(p.calibre_bopp).trim() : "";
      if (cb && cb !== "0") return cb;
    }
    const c = p.calibre ? String(p.calibre).trim() : "";
    if (c && c !== "0") return c;
    const cb2 = p.calibre_bopp ? String(p.calibre_bopp).trim() : "";
    return cb2 && cb2 !== "0" ? cb2 : "";
  };

  const buildPapelPdf = (p: any) => {
    const grupDesc: string = p.grupo_descripcion ?? "";
    const partes = grupDesc.split(/\s*\+\s*/).map((s: string) => s.trim());
    const regexCalibre = /(\d+(?:\.\d+)?\s*(?:pts|gms|ect))/gi;

    const materialStr = partes
      .map((parte: string) => parte.replace(regexCalibre, "").trim())
      .filter(Boolean)
      .join(" + ") || grupDesc;

    const calibreStr = partes
      .map((parte: string) => {
        const m = parte.match(/(\d+(?:\.\d+)?\s*(?:pts|gms|ect))/i);
        return m ? m[1] : "";
      })
      .filter(Boolean)
      .join(" / ") || "";

    return {
      tipo_material: "papel",
      tipoCotizacion: "papel",
      nombre: p.nombre,
      material: materialStr,
      calibre: calibreStr,
      grupo_descripcion: grupDesc,
      tintas: p.tintas ?? 0,
      tintasDentro: p.tintasDentro ?? 0,
      caras: p.caras ?? 0,
      medidasFormateadas: p.medida || "",
      medidas: {},
      bk: null,
      foil: p.foil_nombre ? true : null,
      foil_nombre: p.foil_nombre || null,
      laminado_nombre: p.laminado_nombre || null,
      textura_nombre: p.textura_nombre || null,
      asa_nombre: p.asa_nombre || null,
      uv: p.uv ?? null,
      alto_relieve: p.alto_relieve ?? null,
      pantones: p.pantones || null,
      pantonesDentro: p.pantonesDentro || null,
      observacion: p.observacion || null,
      descripcion: p.descripcion || null,
      perforacion: p.perforacion ?? false,
      por_kilo: p.por_kilo || null,
      herramental_descripcion: p.herramental_descripcion ?? null,
      herramental_precio: p.herramental_precio != null ? Number(p.herramental_precio) : null,
      herramental_aprobado: p.herramental_aprobado ?? null,
      detalles: (p.detalles || []).map((d: any) => ({
        cantidad: d.cantidad,
        precio_total: d.precio_total,
        kilogramos: d.kilogramos ?? null,
        modo_cantidad: d.modo_cantidad || "unidad",
      })),
    };
  };

  const buildProductosPdf = (productos: any[]) =>
    productos.map((p: any) => {
      if (esLineaPapel(p)) return buildPapelPdf(p);
      return {
        nombre: p.nombre,
        material: p.material || "",
        calibre: resolverCalibre(p),
        tintas: p.tintas,
        caras: p.caras,
        medidasFormateadas: p.medidasFormateadas || "",
        medidas: p.medidas || {},
        bk: null,
        foil: null,
        laminado: null,
        uvBr: null,
        pigmentos: p.pigmentos || null,
        pantones: p.pantones || null,
        asa_suaje: p.asa_suaje || null,
        observacion: p.observacion || null,
        descripcion: p.descripcion || null,
        perforacion: p.perforacion ?? false,
        por_kilo: p.por_kilo || null,
        herramental_descripcion: p.herramental_descripcion ?? null,
        herramental_precio: p.herramental_precio != null ? Number(p.herramental_precio) : null,
        herramental_aprobado: p.herramental_aprobado ?? null,
        detalles: (p.detalles || []).map((d: any) => ({
          cantidad: d.cantidad,
          precio_total: d.precio_total,
          kilogramos: d.kilogramos ?? null,
          modo_cantidad: d.modo_cantidad || "unidad",
        })),
      };
    });

  const handleDescargar = async () => {
    setDescargando(true);
    marcarDescargaIniciada();
    try {
      const [todos, venta] = await Promise.all([getPedidos(), getVentaByPedido(pedido.no_pedido)]);
      const ped: Pedido | undefined = (todos as Pedido[]).find(p => p.no_pedido === pedido.no_pedido);
      if (!ped) { showAlert("No se encontró el pedido."); return; }
      const guardarS3 = await preguntarGuardarS3("pedido");
      await generarPdfPedido({
        no_pedido: ped.no_pedido,
        no_cotizacion: ped.no_cotizacion ?? null,
        fecha: ped.fecha,
        cliente: ped.cliente,
        empresa: ped.empresa,
        telefono: ped.telefono,
        correo: ped.correo,
        impresion: ped.impresion ?? null,
        celular: ped.celular ?? null,
        razon_social: ped.razon_social ?? null,
        rfc: ped.rfc ?? null,
        domicilio: ped.domicilio ?? null,
        numero: ped.numero ?? null,
        colonia: ped.colonia ?? null,
        codigo_postal: ped.codigo_postal ?? null,
        poblacion: ped.poblacion ?? null,
        estado_cliente: ped.estado_cliente ?? null,
        identificar: ped.identificar ?? null,
        sin_iva: ped.sin_iva ?? false,
        cliente_id: ped.cliente_id ?? null,
        subtotal: Number(venta.subtotal),
        iva: Number(venta.iva),
        total: Number(venta.total),
        anticipo: Number(venta.anticipo),
        saldo: Number(venta.saldo),
        moneda: (venta as any).moneda ?? "MXN",
        productos: buildProductosPdf(ped.productos),
      }, guardarS3);
    } catch {
      showAlert("No se pudo generar el PDF del pedido.");
    } finally { setDescargando(false); marcarDescargaFinalizada(); }
  };

  if (!puedePdf) {
    return (
      <span className="text-xs font-medium text-blue-600 whitespace-nowrap">
        {pedido.no_pedido}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-blue-600 whitespace-nowrap">{pedido.no_pedido}</span>
      <button onClick={handleDescargar} disabled={descargando} title="Descargar PDF del pedido"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded transition-colors">
        {descargando
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <IconoPdf />}
        PDF
      </button>
    </div>
  );
}

// fecha corta reutilizando el mismo formato que FechaAprobacion / FechaCorta
// (día/mes/año) — se muestra debajo del botón cuando ya hay snapshot.
const formatearFechaGeneracion = (fecha: string | null): string | null => {
  if (!fecha) return null;
  return new Date(fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

function BotonEstadoCuentaPdf({
  noPedido, generado, fechaGeneracion,
}: {
  noPedido: string;
  // ── NUEVO: si el estado de cuenta aún no se generó (producción
  // incompleta), el botón se deshabilita de una vez en vez de dejar que
  // el usuario le dé clic y reciba una alerta genérica después de esperar
  // la respuesta del servidor.
  generado?: boolean;
  fechaGeneracion?: string | null;
}) {
  const [descargando, setDescargando] = useState(false);

  if (generado === false) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span
          title="El estado de cuenta se genera automáticamente cuando termina toda la producción del pedido."
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-200 text-gray-400 text-xs rounded cursor-not-allowed">
          <IconoPdf /> PDF
        </span>
      </div>
    );
  }

  const handleDescargar = async () => {
    setDescargando(true);
    marcarDescargaIniciada();
    try {
      const datos = await getEstadoCuenta(noPedido);
      const guardarS3 = await preguntarGuardarS3("estado de cuenta");
      await generarPdfEstadoCuentaSimple(datos, guardarS3);
    } catch (e: any) {
      const msg = e?.response?.data?.detalle || e?.response?.data?.error || null;
      showAlert(msg
        ? `Estado de cuenta no disponible:\n${msg}`
        : "El estado de cuenta aun no esta disponible. Verifica que todos los procesos hayan finalizado."
      );
    } finally { setDescargando(false); marcarDescargaFinalizada(); }
  };

  const fechaTexto = formatearFechaGeneracion(fechaGeneracion ?? null);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button onClick={handleDescargar} disabled={descargando} title="Descargar estado de cuenta cliente"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-medium rounded transition-colors">
        {descargando
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <IconoPdf />}
        {descargando ? "..." : "PDF"}
      </button>
      {fechaTexto && (
        <span className="text-[10px] text-gray-400 leading-tight whitespace-nowrap" title="Fecha en que se generó el estado de cuenta">
          {fechaTexto}
        </span>
      )}
    </div>
  );
}

function BotonPdfDirecto({ pedido }: { pedido: PedidoSeguimiento }) {
  const [descargando, setDescargando] = useState(false);
  const esPapel = esProductoOrdenPapel(pedido);

  const handleDescargar = async () => {
    if (!pedido.no_produccion) return;

    setDescargando(true);
    marcarDescargaIniciada();
    try {
      const guardarS3 = await preguntarGuardarS3("orden de producción con datos");
      await descargarPdfOrdenProduccionUniversal(
        pedido.no_pedido,
        pedido.no_produccion,
        guardarS3,
        {
          idordenDiseno: (pedido as any).idorden_diseno ?? null,
          descripcion: (pedido as any).descripcion ?? null,
          forzarTipoMaterial: esPapel ? "papel" : null,
          productoReferencia: pedido,
        }
      );
    } catch (e: any) {
      showAlert(e?.message || "No se pudo generar el PDF.");
    } finally {
      setDescargando(false);
      marcarDescargaFinalizada();
    }
  };

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <span className="whitespace-nowrap text-xs font-medium text-gray-700">
        {pedido.no_produccion}
      </span>
      <button
        onClick={handleDescargar}
        disabled={descargando}
        title="Descargar PDF con los datos registrados en producción — se va llenando conforme avanzan los procesos"
        className="inline-flex min-h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-[11px] font-medium leading-tight text-white transition-colors hover:bg-red-700 disabled:bg-red-400">
        {descargando
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <IconoPdf />}
        PDF
      </button>
      <FechaAprobacion fecha={(pedido as any).op_fecha_aprobacion ?? null} />
    </div>
  );
}

function RenderOrdenProduccion({ pedido }: { pedido: PedidoSeguimiento }) {
  if (!pedido.puede_pdf || !pedido.no_produccion) {
    const tooltip = !pedido.anticipo_cubierto && !pedido.diseno_aprobado
      ? "Falta anticipo y diseno"
      : !pedido.anticipo_cubierto ? "Falta anticipo" : "Diseno no aprobado";
    return (
      <span title={tooltip}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-200 text-gray-400 text-xs rounded cursor-not-allowed">
        <IconoPdf /> PDF
      </span>
    );
  }
  return <BotonPdfDirecto pedido={pedido} />;
}



const PROCESOS_PAPEL: { key: NombreProcesoPapel; encabezado: string; titulo: string }[] = [
  { key: "hojeado_papel", encabezado: "Hoj", titulo: "Hojeado" },
  { key: "guillotina_papel", encabezado: "Gui", titulo: "Guillotina" },
  { key: "impresion_papel", encabezado: "Imp. Papel", titulo: "Impresión de papel" },
  { key: "laminacion_papel", encabezado: "Lam", titulo: "Laminación" },
  { key: "barniz_uv_papel", encabezado: "UV", titulo: "Barniz UV" },
  { key: "hot_stamping_papel", encabezado: "Hot", titulo: "Hot stamping" },
  { key: "texturizado_papel", encabezado: "Tex", titulo: "Texturizado" },
  { key: "alto_relieve_papel", encabezado: "Rel", titulo: "Alto relieve" },
  { key: "suaje_produccion_papel", encabezado: "Sua", titulo: "Suaje" },
  { key: "armado_papel", encabezado: "Arm", titulo: "Armado" },
  { key: "empaque_papel", encabezado: "Emp", titulo: "Empaque" },
];

const COLUMNAS_PAPEL = PROCESOS_PAPEL.map(({ encabezado }) => encabezado);

// Un privilegio "Operar X" por proceso, igual que plástico (fase 4 del plan
// de roles y privilegios) — antes ninguna de estas 11 celdas pedía nada.
const PRIVILEGIO_PROCESO_PAPEL: Record<NombreProcesoPapel, string> = {
  hojeado_papel: "produccion.papel.hojeado.operar",
  guillotina_papel: "produccion.papel.guillotina.operar",
  impresion_papel: "produccion.papel.impresion.operar",
  laminacion_papel: "produccion.papel.laminacion.operar",
  barniz_uv_papel: "produccion.papel.barniz_uv.operar",
  hot_stamping_papel: "produccion.papel.hot_stamping.operar",
  texturizado_papel: "produccion.papel.texturizado.operar",
  alto_relieve_papel: "produccion.papel.alto_relieve.operar",
  suaje_produccion_papel: "produccion.papel.suaje.operar",
  armado_papel: "produccion.papel.armado.operar",
  empaque_papel: "produccion.papel.empaque.operar",
};

const COLUMNAS = [
  "Fecha", "N° Pedido", "Impresion + Info", "Tipo", "Cantidad",
  "Anticipo", "OD", "Diseno", "Orden", "Días",
  "Ext", "Imp", "Bol", "Asa", ...COLUMNAS_PAPEL,
  "E. Cta", "Pago", "Envio",
];
const COLS_CENTRADAS = new Set([
  "Impresion + Info", "Tipo", "Cantidad", "Anticipo", "OD", "Diseno", "Orden", "Días",
  "Ext", "Imp", "Bol", "Asa", ...COLUMNAS_PAPEL,
  "E. Cta", "Pago", "Envio",
]);

const estadoProcesoPapelATabla = (estado?: string): string => {
  const estados: Record<string, string> = {
    terminado: "finalizado",
    en_proceso: "proceso",
    pendiente: "pendiente",
    resagado: "resagado",
    no_aplica: "no-aplica",
  };
  return estados[estado ?? ""] ?? "no-aplica";
};

const fechaProcesoPapel = (proceso?: ProcesoRegistroPapel): string | null => {
  const avances = proceso?.avances ?? [];
  return proceso?.registro?.fecha_fin ??
    proceso?.registro?.fecha_inicio ??
    avances[avances.length - 1]?.fecha_registro ??
    null;
};

// ─────────────────────────────────────────────
// Contador de días hábiles desde que se habilita la orden
// (anticipo cubierto + diseño aprobado ⇒ se crea la orden_produccion)
// contarDiasHabiles ahora vive en utils/diasHabiles.ts — la usa tanto
// este badge como el filtro/badge de "Cuentas por cobrar" más abajo.
// ─────────────────────────────────────────────
function ContadorDiasHabiles({ pedido, vigente }: { pedido: PedidoSeguimiento; vigente: boolean }) {
  const fechaInicio = pedido.fecha_habilitacion_orden;

  // Solo cuenta si la orden está habilitada Y esa habilitación sigue vigente
  // (si el diseño o el anticipo se desaprobaron después de haber estado
  // aprobados, la orden_produccion ya existe pero el conteo debe volver a
  // "—" en vez de seguir corriendo desde la fecha de habilitación original).
  if (!pedido.no_produccion || !fechaInicio || !vigente) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  const dias = contarDiasHabiles(new Date(fechaInicio), new Date());

  const estilos = dias <= 15
    ? "bg-green-100 text-green-700 border border-green-300"
    : dias <= 25
      ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
      : "bg-red-100 text-red-700 border border-red-300";

  return (
    <span
      title={`Días hábiles desde que se habilitó la orden (${new Date(fechaInicio).toLocaleDateString("es-MX")})`}
      className={`inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-xs font-semibold ${estilos}`}
    >
      {dias}
    </span>
  );
}

// ─────────────────────────────────────────────
// Cantidad del pedido: muestra unidades y, cuando aplica, kilogramos
// ─────────────────────────────────────────────
function CantidadPedido({ pedido }: { pedido: PedidoSeguimiento }) {
  const unidades = pedido.cantidad_orden;
  const kilos = pedido.kilogramos_orden;

  if ((unidades == null || unidades === 0) && (kilos == null || kilos === 0)) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  return (
    <div className="leading-tight text-[11px]">
      {unidades != null && unidades > 0 && (
        <div className="text-gray-700 font-medium whitespace-nowrap">
          {unidades.toLocaleString("es-MX")} pzas
        </div>
      )}
      {kilos != null && kilos > 0 && (
        <div className="text-emerald-600 whitespace-nowrap">
          {kilos.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg
        </div>
      )}
    </div>
  );
}

const renderThead = (oscuro = false) => (
  <thead className={oscuro ? "bg-gray-900 text-white" : "bg-gray-100 border-b border-gray-200"}>
    <tr>
      {COLUMNAS.map(h => (
        <th key={h}
          title={PROCESOS_PAPEL.find(proceso => proceso.encabezado === h)?.titulo}
          className={`px-2 py-2 text-xs font-semibold uppercase tracking-wider ${oscuro ? "text-white" : "text-gray-700"
            } ${COLS_CENTRADAS.has(h) ? "text-center" : "text-left"}`}>
          {h}
        </th>
      ))}
    </tr>
  </thead>
);

const norm = (t: string) =>
  (t ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// ── NUEVO: badge de días vencidos, mismos cortes de color que pidió Jose:
// 5-9 amarillo, 10-19 naranja, 20+ rojo. (El filtro del backend ya
// garantiza que aquí nunca llega nada por debajo de 5.)
function BadgeDiasVencidos({ dias }: { dias: number }) {
  const estilos = dias >= 20
    ? "bg-red-100 text-red-700 border-red-300"
    : dias >= 10
      ? "bg-orange-100 text-orange-700 border-orange-300"
      : "bg-yellow-100 text-yellow-700 border-yellow-300";
  return (
    <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded text-xs font-semibold border ${estilos}`}>
      {dias} día{dias !== 1 ? "s" : ""}
    </span>
  );
}

function ModalCuentasPorCobrar({
  cuentas, cargando, onVerLiquidar,
}: {
  cuentas: CuentaPorCobrar[];
  cargando: boolean;
  onVerLiquidar: (noPedido: string) => void;
}) {
  const ordenadas = [...cuentas].sort(
    (a, b) => b.dias_habiles_desde_generacion - a.dias_habiles_desde_generacion,
  );

  // El spinner solo sustituye al contenido si aún no hay filas: un refresco
  // (al registrar un pago, por ejemplo) ya no vacía el modal a medio uso.
  if (cargando && ordenadas.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (ordenadas.length === 0) {
    return (
      <p className="text-center text-gray-500 py-10">
        No hay cuentas por cobrar vencidas — todos los estados de cuenta generados hace 5+ días hábiles ya están liquidados. 🎉
      </p>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[70vh]">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {["Pedido", "Cliente", "Generado", "Vencido", "Total real", "Saldo", ""].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {ordenadas.map(c => (
            <tr key={c.no_pedido} className="hover:bg-amber-50">
              <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{c.no_pedido}</td>
              <td className="px-3 py-2 text-gray-700">{c.cliente || c.empresa || "—"}</td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                {new Date(c.fecha_generacion).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td className="px-3 py-2"><BadgeDiasVencidos dias={c.dias_habiles_desde_generacion} /></td>
              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                ${Number(c.total_real ?? c.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-2 font-semibold text-red-600 whitespace-nowrap">
                ${Number(c.saldo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => onVerLiquidar(c.no_pedido)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                >
                  Ver / Liquidar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Seguimiento() {
  const [pedidos, setPedidos] = useState<PedidoSeguimiento[]>([]);
  // `cargando` = hay una petición en vuelo; solo pinta el spinner del botón
  // "Actualizar". `cargaInicial` = todavía no hay NADA que mostrar, y es lo
  // único que justifica reemplazar la pantalla por el spinner grande.
  // Antes ambos casos eran la misma bandera, así que cada cargar() —y
  // cargar() se llama al cerrar casi cualquier modal, al recuperar el foco y
  // al finalizar un proceso— desmontaba la tabla completa: se veía como si
  // la página se recargara sola y se perdían scroll, filtros y paginación.
  const [cargando, setCargando] = useState(true);
  const [cargaInicial, setCargaInicial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  // ── NUEVO: botón discreto para volver a ver órdenes ya finalizadas por
  // completo (producción + envío + pago). Por defecto siguen ocultas —
  // igual que antes — pero con esto activo no dependen de tener que
  // escribir algo en el buscador para reaparecer.
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false);

  const [modalProceso, setModalProceso] = useState<{ pedido: PedidoSeguimiento; nombreProceso: string } | null>(null);
  const [modalAnticipo, setModalAnticipo] = useState<{ venta: Venta; metodos: MetodoPago[] } | null>(null);
  const modalAnticipoRef = useRef<{ venta: Venta; metodos: MetodoPago[] } | null>(null);
  const [cargandoAnticipo, setCargandoAnticipo] = useState<string | null>(null);
  const [modalDiseno, setModalDiseno] = useState<Pedido | null>(null);
  const [modalEnvio, setModalEnvio] = useState<PedidoSeguimiento | null>(null);
  const [modalOD, setModalOD] = useState<PedidoSeguimiento | null>(null);

  const [modalVerificacion, setModalVerificacion] = useState<{
    pedido: PedidoSeguimiento;
    proceso: ProcesoVerificacion;
  } | null>(null);

  const [procesosPapel, setProcesosPapel] = useState<Record<number, ProcesosOrdenPapelRespuesta>>({});
  const [erroresProcesosPapel, setErroresProcesosPapel] = useState<Set<number>>(new Set());
  const cargaActualRef = useRef(0);
  // Momento (ms) en que terminó la última carga con datos; lo consulta el
  // margen de las recargas automáticas por foco/visibilidad.
  const ultimaCargaRef = useRef(0);
  // ¿Hay algún modal abierto? Lo lee el listener de "focus"/visibilitychange
  // de abajo, que corre con dependencias [] y por eso no ve el estado actual.
  const hayModalAbiertoRef = useRef(false);
  // Recarga pospuesta porque llegó mientras un modal estaba abierto: se
  // ejecuta al cerrarlo, así no se pierde el refresco, solo se retrasa.
  const recargaPendienteRef = useRef(false);
  const [modalProcesoPapel, setModalProcesoPapel] = useState<{
    pedido: PedidoSeguimiento;
    nombreProceso: NombreProcesoPapel;
  } | null>(null);

  // ── NUEVO: Cuentas por cobrar (modal) ─────────────────────────────────
  const [modalCuentasPorCobrar, setModalCuentasPorCobrar] = useState(false);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState<CuentaPorCobrar[]>([]);
  const [cargandoCPC, setCargandoCPC] = useState(false);

  const { user } = useAuth();
  const esAccesoTotal = user?.acceso_total ?? false;

  const puedeExtrusion = esAccesoTotal || usePermiso("produccion.plastico.extrusion.operar");
  const puedeImpresion = esAccesoTotal || usePermiso("produccion.plastico.impresion.operar");
  const puedeBolseo = esAccesoTotal || usePermiso("produccion.plastico.bolseo.operar");
  const puedeAsaFlexible = esAccesoTotal || usePermiso("produccion.plastico.asa_flexible.operar");
  const esRolPlanta = usePermiso("produccion.acceso_planta");
  const puedeVerECta = esAccesoTotal || usePermiso("cobranza.anticipo_liquidacion.gestionar");
  const puedeVerEnvio = esAccesoTotal || usePermiso("envios.gestionar");
  const puedeVerOD = esAccesoTotal || usePermiso("diseno.orden");
  const puedePdfPedido = esAccesoTotal || usePermiso("pedido.pdf.descargar");
  const permisosProcesoPapel = usePermisos(PRIVILEGIO_PROCESO_PAPEL);
  const [ordenFecha, setOrdenFecha] = useState<"reciente" | "antiguo">("antiguo");
  useEffect(() => {
    modalAnticipoRef.current = modalAnticipo;
  }, [modalAnticipo]);

  // CORREGIDO: abrir el explorador de archivos (subir imagen en el chat de
  // Orden de Diseño, por ejemplo) le quita el foco a la ventana; al elegir el
  // archivo el foco regresa y disparaba `programarRecarga` -> cargar(), que
  // hace setCargando(true) y remonta la pantalla completa, cerrando el modal
  // y perdiendo los archivos ya seleccionados. Se veía como "se recargó la
  // página sola" y solo pasaba desde Seguimiento (Diseño no tiene este
  // listener). Ahora, si hay un modal abierto, la recarga se POSPONE hasta
  // cerrarlo en vez de descartarse: el refresco sigue ocurriendo, solo que
  // sin destruir el trabajo en curso. Sustituye al parche puntual que ya
  // existía solo para el modal de Anticipo (modalAnticipoRef en cargar()).
  const hayModalAbierto = Boolean(
    modalProceso || modalAnticipo || modalDiseno || modalEnvio ||
    modalOD || modalVerificacion || modalProcesoPapel || modalCuentasPorCobrar
  );
  useEffect(() => {
    hayModalAbiertoRef.current = hayModalAbierto;
    if (!hayModalAbierto && recargaPendienteRef.current) {
      recargaPendienteRef.current = false;
      invalidarSolicitudesGet();
      cargar();
    }
  }, [hayModalAbierto]);

  useEffect(() => {
    cargar();

    let temporizador: number | null = null;
    // `forzar` distingue las señales de que los datos SÍ cambiaron (evento de
    // pedido actualizado, aquí o en otra pestaña) de las que solo indican que
    // el usuario volvió a la ventana. Las segundas se ignoran si acabamos de
    // cargar, o si hay una descarga de PDF en curso (el diálogo nativo de
    // "guardar como" también dispara blur+focus): recuperar el foco es
    // constante (descargar un PDF, elegir un archivo, cambiar de pestaña) y
    // cada una relanzaba el seguimiento completo más una petición por cada
    // orden de papel.
    const programarRecarga = (forzar = false) => {
      if (hayModalAbiertoRef.current) {
        recargaPendienteRef.current = true;
        return;
      }
      if (!forzar && hayDescargaEnCurso()) return;
      if (!forzar && Date.now() - ultimaCargaRef.current < MS_MINIMO_ENTRE_RECARGAS) return;
      if (temporizador !== null) window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => {
        invalidarSolicitudesGet();
        cargar();
      }, 50);
    };
    const onFoco = () => programarRecarga();
    const onPedidoActualizado = () => programarRecarga(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") programarRecarga();
    };
    const onStorage = (evento: StorageEvent) => {
      if (evento.key === CLAVE_PEDIDO_ACTUALIZADO) programarRecarga(true);
    };

    window.addEventListener("focus", onFoco);
    window.addEventListener(EVENTO_PEDIDO_ACTUALIZADO, onPedidoActualizado);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (temporizador !== null) window.clearTimeout(temporizador);
      window.removeEventListener("focus", onFoco);
      window.removeEventListener(EVENTO_PEDIDO_ACTUALIZADO, onPedidoActualizado);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  // Los procesos de papel son N peticiones, una por orden. Antes se esperaban
  // dentro de cargar(), así que la pantalla seguía en "Cargando seguimiento..."
  // hasta que respondían todas: de ahí que el refresco se sintiera lento
  // aunque la lista de pedidos ya hubiera llegado. Ahora se piden aparte y las
  // celdas de papel se rellenan cuando lleguen, sin bloquear al resto.
  const cargarProcesosPapel = async (
    data: PedidoSeguimiento[],
    cargaId: number,
  ) => {
    const idsPapel = Array.from(new Set(
      data
        .filter(p =>
          (p.tipo_producto ?? "").toLowerCase() === "papel" &&
          p.idproduccion != null
        )
        .map(p => Number(p.idproduccion))
    ));

    if (idsPapel.length === 0) {
      if (cargaId === cargaActualRef.current) {
        setProcesosPapel({});
        setErroresProcesosPapel(new Set());
      }
      return;
    }

    const resultados = await Promise.allSettled(
      idsPapel.map(async idproduccion => ({
        idproduccion,
        datos: await getProcesosOrdenPapel(idproduccion),
      }))
    );

    const procesosPorOrden: Record<number, ProcesosOrdenPapelRespuesta> = {};
    const idsConError = new Set<number>();
    resultados.forEach((resultado, index) => {
      if (resultado.status === "fulfilled") {
        procesosPorOrden[resultado.value.idproduccion] = resultado.value.datos;
      } else {
        idsConError.add(idsPapel[index]);
      }
    });
    if (cargaId !== cargaActualRef.current) return;
    setProcesosPapel(procesosPorOrden);
    setErroresProcesosPapel(idsConError);
  };

  const cargar = async () => {
    // Una recarga real deja sin efecto la pospuesta: varios onClose de modales
    // ya llaman a cargar() por su cuenta, y sin esto se disparaba dos veces.
    recargaPendienteRef.current = false;
    const cargaId = ++cargaActualRef.current;
    const anticipoAbierto = modalAnticipoRef.current;
    try {
      setCargando(true); setError(null);
      const [data, ventaModalActualizada] = await Promise.all([
        getSeguimiento(),
        anticipoAbierto
          ? getVentaByPedido(anticipoAbierto.venta.no_pedido).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (cargaId !== cargaActualRef.current) return;
      setPedidos(data);
      ultimaCargaRef.current = Date.now();
      if (
        ventaModalActualizada
        && modalAnticipoRef.current?.venta.no_pedido === ventaModalActualizada.no_pedido
      ) {
        setModalAnticipo(prev => prev
          ? { ...prev, venta: ventaModalActualizada }
          : null
        );
      }
      void cargarProcesosPapel(data, cargaId);
    } catch {
      if (cargaId === cargaActualRef.current) {
        setError("No se pudo cargar el seguimiento.");
      }
    }
    finally {
      if (cargaId === cargaActualRef.current) {
        setCargando(false);
        setCargaInicial(false);
      }
    }
  };

  const abrirAnticipo = async (pedido: PedidoSeguimiento) => {
    if (cargandoAnticipo) return;
    setCargandoAnticipo(pedido.no_pedido);
    try {
      const [venta, metodos] = await Promise.all([getVentaByPedido(pedido.no_pedido), getMetodosPago()]);
      setModalAnticipo({ venta, metodos });
    } catch {
      showAlert("No se pudo cargar la informacion de anticipo.");
    } finally { setCargandoAnticipo(null); }
  };

  // ── NUEVO: Cuentas por cobrar — pedidos con estado de cuenta generado
  // hace 5+ días hábiles y saldo pendiente (filtro ya resuelto en el
  // backend, ver GET /api/seguimiento/cuentas-por-cobrar). Se carga al
  // montar (para el contador del botón) y se refresca cada vez que se
  // abre el modal o se registra un pago desde dentro de él.
  const cargarCuentasPorCobrar = async () => {
    setCargandoCPC(true);
    try {
      const datos = await getCuentasPorCobrar();
      setCuentasPorCobrar(datos);
    } catch {
      // silencioso: el botón simplemente no muestra contador si falla
    } finally {
      setCargandoCPC(false);
    }
  };

  useEffect(() => { cargarCuentasPorCobrar(); }, []);

  const abrirDiseno = (pedido: PedidoSeguimiento) => {
    setModalDiseno({
      no_pedido: pedido.no_pedido,
      no_cotizacion: (pedido as any).no_cotizacion ?? null,
      cliente: pedido.cliente ?? "",
      empresa: (pedido as any).empresa ?? "",
      fecha: pedido.fecha,
      impresion: pedido.impresion ?? "",
      productos: [],
      diseno_estado_id: pedido.diseno_aprobado ? 3 : 1,
    } as any);
  };

  // Un pedido está pagado por completo cuando su saldo real llegó a 0 (o,
  // si el backend todavía no manda saldo_venta, cuando el flag legado
  // pago_completo lo dice). Misma cuenta que usa renderFila para pintar el
  // badge de Pago — vive aquí, arriba, para que esProductoFinalizadoPorCompleto
  // también pueda usarla sin duplicar la fórmula.
  const estaPagadoPorCompleto = (p: PedidoSeguimiento): boolean =>
    p.saldo_venta != null ? p.saldo_venta <= 0.01 : Boolean(p.pago_completo);

  // ── Pedidos terminados por completo ──────────────────────────────────
  // Un producto se considera terminado del todo cuando:
  //  - ya tiene orden de producción (idproduccion), si no, ni siquiera ha
  //    arrancado y de ninguna manera puede contar como terminado;
  //  - no es una parcialidad (es_parcialidad === true bloquea, porque el
  //    usuario pidió expresamente "ni parcialidades tiene que haber");
  //  - todos sus procesos aplicables (los que no son "no-aplica") están
  //    en "finalizado" — en papel se usa el único estado_resumen_papel
  //    que ya calcula el backend, porque ahí no hay columnas por proceso;
  //  - el envío está "finalizado" (o "no-aplica" — OJO: para papel hoy
  //    ese es el valor que SIEMPRE trae el backend, porque los bultos aún
  //    no se ligan a sus procesos allá — ver nota en
  //    seguimiento.controller.ts. Eso hace que una orden de papel se
  //    pueda dar por "enviada" sin haberse enviado de verdad; hay que
  //    corregirlo del lado del backend cuando se ligue bultos↔procesos
  //    de papel, este filtro no lo puede distinguir);
  //  - ✅ NUEVO: el pedido ya está pagado por completo (saldo en 0). Antes
  //    esta función no revisaba el pago, así que un pedido con producción
  //    y envío terminados pero CON SALDO PENDIENTE desaparecía de
  //    Seguimiento de todas formas — la única forma de verlo era el modal
  //    de Cuentas por Cobrar (y ese solo lista adeudos de 5+ días hábiles).
  //    Ahora un pedido se sigue mostrando aquí mientras falte pagar o
  //    falte enviar, que es justo lo que se necesita vigilar día a día.
  // Un pedido completo (no_pedido) se oculta solo si TODOS sus productos
  // cumplen lo anterior — basta con que uno quede pendiente para que el
  // pedido entero se siga mostrando.
  const esProductoFinalizadoPorCompleto = (p: PedidoSeguimiento): boolean => {
    if (!p.idproduccion) return false;
    if ((p as any).es_parcialidad) return false;

    const okOProcesoNoAplica = (estado: unknown) => estado === "finalizado" || estado === "no-aplica";
    const esPapel = (p.tipo_producto ?? "").toLowerCase() === "papel";

    if (esPapel) {
      if ((p as any).estado_resumen_papel !== "finalizado") return false;
    } else {
      if (!okOProcesoNoAplica(p.extrusion_estado)) return false;
      if (!okOProcesoNoAplica(p.impresion_estado)) return false;
      if (!okOProcesoNoAplica(p.bolseo_estado)) return false;
      if (!okOProcesoNoAplica(p.asa_flexible_estado)) return false;
    }

    if (!okOProcesoNoAplica((p as any).estado_envio)) return false;
    if (!estaPagadoPorCompleto(p)) return false;

    return true;
  };

  const pedidosTerminadosPorCompleto = (() => {
    const porPedido = new Map<string, PedidoSeguimiento[]>();
    pedidos.forEach(p => {
      const arr = porPedido.get(p.no_pedido) ?? [];
      arr.push(p);
      porPedido.set(p.no_pedido, arr);
    });
    const terminados = new Set<string>();
    porPedido.forEach((productos, no_pedido) => {
      if (productos.length > 0 && productos.every(esProductoFinalizadoPorCompleto)) {
        terminados.add(no_pedido);
      }
    });
    return terminados;
  })();

  const hayBusquedaActiva = busqueda.trim().length > 0;

  const pedidosFiltrados = pedidos
    .filter(p => hayBusquedaActiva || mostrarFinalizados || !pedidosTerminadosPorCompleto.has(p.no_pedido))
    .filter(p => {
      const pasaTipo = filtroTipo === "todos"
        || norm(p.tipo_producto ?? "").includes(norm(filtroTipo));
      if (!pasaTipo) return false;
      if (!busqueda.trim()) return true;
      const q = norm(busqueda);
      return (
        norm(p.no_pedido).includes(q) ||
        norm(p.no_produccion ?? "").includes(q) ||
        norm(p.impresion ?? "").includes(q)
      );
    })
    // El backend entrega una fila agregada por producto. El id estable evita
    // ocultar por accidente dos productos distintos con el mismo texto.
    .filter((p, idx, arr) => arr.findIndex(x => {
      if (p.idsolicitud_producto != null && x.idsolicitud_producto != null) {
        return x.idsolicitud_producto === p.idsolicitud_producto;
      }

      // Compatibilidad temporal con respuestas de un backend anterior.
      return x.no_pedido === p.no_pedido &&
        (x.no_produccion ?? "") === (p.no_produccion ?? "") &&
        (x.nombre_producto ?? "") === (p.nombre_producto ?? "") &&
        (x.medida ?? "") === (p.medida ?? "") &&
        (x.descripcion ?? "") === (p.descripcion ?? "");
    }) === idx)
    .sort((a, b) => {
      const diff = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      return ordenFecha === "reciente" ? diff : -diff;
    });

  // REEMPLAZA por:
  const inicio = 0;
  const pedidosPagina = pedidosFiltrados;

  const renderFila = (pedido: PedidoSeguimiento, grande = false, idx = 0) => {
    const px = grande ? "px-3 py-3" : "px-2 py-2";
    const txt = grande ? "text-sm" : "text-xs";

    const estadoAnticipo = pedido.anticipo_cubierto ? "pagado" : "pendiente";
    const estadoDiseño = pedido.diseno_aprobado ? "aprobado" : "pendiente";
    const pagadoReal = estaPagadoPorCompleto(pedido);
    const estadoPago = pagadoReal ? "pagado" : pedido.anticipo_cubierto ? "proceso" : "pendiente";

    const tieneOrden = !!pedido.no_produccion && !!pedido.idproduccion;
    // La orden puede haberse habilitado en el pasado (anticipo + diseño
    // aprobados ⇒ se creó orden_produccion) y luego el diseño haberse
    // desaprobado de nuevo (ej. se rechaza tras haber estado aprobado).
    // tieneOrden se queda en true para siempre porque la OP ya existe, pero
    // NO debe seguir contando días ni permitir registrar avances si ya no
    // están vigentes las condiciones que la habilitaron.
    const ordenVigente = tieneOrden && pedido.diseno_aprobado && pedido.anticipo_cubierto;
    const esPapel = (pedido.tipo_producto ?? "").toLowerCase() === "papel";
    const extEstado = tieneOrden && !esPapel ? pedido.extrusion_estado : "no-aplica";
    const impEstado = tieneOrden && !esPapel ? pedido.impresion_estado : "no-aplica";
    const bolEstado = tieneOrden && !esPapel ? pedido.bolseo_estado : "no-aplica";
    const asaEstado = tieneOrden && !esPapel ? pedido.asa_flexible_estado : "no-aplica";
    const estadoEnvio = tieneOrden ? ((pedido as any).estado_envio ?? "pendiente") : "no-aplica";

    const odEstadoRaw = (pedido as any).od_estado as string | null;
    const odId = (pedido as any).idorden_diseno as number | null;
    // ✅ NUEVO: aprobado administrativamente pero sin ningún archivo subido
    // todavía (od_tiene_archivos) ⇒ pseudo-estado "aprobado_sin_archivos",
    // mismo texto "Aprobado" pero en naranja (ver obtenerColorEstado).
    const odTieneArchivos = Boolean((pedido as any).od_tiene_archivos);
    const estadoOD = odEstadoRaw === "aprobado"
      ? (odTieneArchivos ? "aprobado" : "aprobado_sin_archivos")
      : odEstadoRaw === "en_revision"
        ? "proceso"
        : odEstadoRaw === "rechazado"
          ? "detenido"
          : "no-aplica";

    const abrirProceso = (nombreProceso: string) => {
      if (!ordenVigente) return;
      setModalProceso({ pedido, nombreProceso });
    };

    const procesosDeLaOrden = pedido.idproduccion
      ? procesosPapel[Number(pedido.idproduccion)]?.procesos ?? []
      : [];
    const errorCargaProcesosPapel = esPapel &&
      !!pedido.idproduccion &&
      erroresProcesosPapel.has(Number(pedido.idproduccion));
    const procesosPapelPorNombre = new Map<NombreProcesoPapel, ProcesoRegistroPapel>(
      procesosDeLaOrden.map(proceso => [proceso.tabla, proceso] as const)
    );

    // ✅ NUEVO: "próximo proceso" a resaltar — ver calcularProcesoSiguiente.
    // Plástico sigue el pipeline fijo Ext→Imp→Bol→Asa (mismo orden que las
    // columnas y que ORDEN_PROCESOS en el backend). Papel usa el cascade
    // de 11 pasos ya ordenado en PROCESOS_PAPEL.
    const siguienteProcesoPlastico = calcularProcesoSiguiente([
      { key: "extrusion", estado: extEstado },
      { key: "impresion", estado: impEstado },
      { key: "bolseo", estado: bolEstado },
      { key: "asa_flexible", estado: asaEstado },
    ]);
    const estadosPapelDeLaFila = esPapel
      ? PROCESOS_PAPEL.map(({ key }) => ({
          key,
          estado: estadoProcesoPapelATabla(procesosPapelPorNombre.get(key)?.estado),
        }))
      : [];
    const siguienteProcesoPapel = esPapel ? calcularProcesoSiguiente(estadosPapelDeLaFila) : null;

    return (
      <tr key={`${pedido.no_pedido}-${pedido.no_produccion ?? "sin-op"}-${idx}`}
        className="hover:bg-gray-50 transition-colors border-t border-gray-200">

        <td className={`${px} ${txt} text-gray-900 whitespace-nowrap`}>
          {new Date(pedido.fecha).toLocaleDateString("es-MX")}
        </td>

        <td className={`${px} whitespace-nowrap`}>
          <BotonPdfPedido pedido={pedido} puedePdf={puedePdfPedido} />
        </td>

        {/* ── IMPRESION + PRODUCTO + MEDIDAS + PIGMENTO ── */}
        <td className={`${px} ${txt} text-gray-900 text-center min-w-[25px]`}>
          <div className="font-medium leading-tight text-[12px]">{pedido.impresion || "—"}
            {pedido.descripcion && (
              <span className="text-gray-400 text-[11px] italic ml-1">{pedido.descripcion}</span>
            )}
          </div>
          <div className="text-[11px] leading-tight mt-0.5">
            {pedido.medida && <span className="text-gray-500">{pedido.medida}</span>}
            {pedido.pigmentos && (
              <span className="text-orange-500 ml-1">{pedido.pigmentos}</span>
            )}
          </div>
        </td>


        {/* TIPO ← FALTABA ESTE */}
        <td className={`${px}`}>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
            esPapel ? "bg-yellow-100 text-yellow-800" : "bg-indigo-100 text-indigo-800"
          }`}>
            {pedido.tipo_producto || "—"}
          </span>
        </td>

        {/* CANTIDAD (unidades + kilogramos) */}
        <td className={`${px} text-center`}>
          <CantidadPedido pedido={pedido} />
        </td>

        {/* ANTICIPO */}
        <td className={`${px} text-center`}>
          {esAccesoTotal
            ? <BadgeTextoBtn estado={estadoAnticipo} fechaEstado={(pedido as any).anticipo_fecha_estado} cargando={cargandoAnticipo === pedido.no_pedido} onClick={() => abrirAnticipo(pedido)} />
            : <BadgeTexto estado={estadoAnticipo} fechaEstado={(pedido as any).anticipo_fecha_estado} />
          }
          <FechaAprobacion fecha={(pedido as any).anticipo_fecha_aprobacion ?? null} />
        </td>

        {/* OD */}
        <td className={`${px} text-center`}>
          {odId ? (
            (puedeVerOD || esRolPlanta) ? (
              <>
                <BadgeTextoBtn
                  estado={estadoOD}
                  fechaEstado={(pedido as any).od_fecha_estado}
                  onClick={() => {
                    puedeVerOD
                      ? setModalOD(pedido)
                      : setModalVerificacion({ pedido, proceso: "orden_diseno" });
                  }}
                />
                <FechaAprobacion fecha={(pedido as any).od_fecha_aprobacion ?? null} />
              </>
            ) : (
              <>
                <BadgeTexto estado={estadoOD} fechaEstado={(pedido as any).od_fecha_estado} />
                <FechaAprobacion fecha={(pedido as any).od_fecha_aprobacion ?? null} />
              </>
            )
          ) : (
            <BadgeTexto estado="no-aplica" />
          )}
        </td>

        {/* DISEÑO */}
        <td className={`${px} text-center`}>
          {esAccesoTotal
            ? <BadgeTextoBtn estado={estadoDiseño} fechaEstado={(pedido as any).diseno_fecha_estado} onClick={() => abrirDiseno(pedido)} />
            : <BadgeTexto estado={estadoDiseño} fechaEstado={(pedido as any).diseno_fecha_estado} />
          }
          <FechaAprobacion fecha={(pedido as any).diseno_fecha_aprobacion ?? null} />
        </td>

        <td className={`${px} text-center`}><RenderOrdenProduccion pedido={pedido} /></td>

        <td className={`${px} text-center`}><ContadorDiasHabiles pedido={pedido} vigente={ordenVigente} /></td>

        <td className={`${px} text-center`}>
          <Badge estado={extEstado} fechaEstado={pedido.extrusion_fecha_estado}
            intensificado={siguienteProcesoPlastico === "extrusion"}
            clickable={ordenVigente && extEstado !== "no-aplica" && (puedeExtrusion || esRolPlanta)}
            onClick={() => {
              if (!ordenVigente) return;
              puedeExtrusion ? abrirProceso("extrusion") : setModalVerificacion({ pedido, proceso: "extrusion" });
            }} />
          {extEstado === "finalizado" && <FechaCorta fecha={pedido.extrusion_fecha_estado} />}
        </td>

        <td className={`${px} text-center`}>
          <Badge estado={impEstado} fechaEstado={pedido.impresion_fecha_estado}
            intensificado={siguienteProcesoPlastico === "impresion"}
            clickable={ordenVigente && impEstado !== "no-aplica" && (puedeImpresion || esRolPlanta)}
            onClick={() => {
              if (!ordenVigente) return;
              puedeImpresion ? abrirProceso("impresion") : setModalVerificacion({ pedido, proceso: "impresion" });
            }} />
          {impEstado === "finalizado" && <FechaCorta fecha={pedido.impresion_fecha_estado} />}
        </td>

        <td className={`${px} text-center`}>
          <Badge estado={bolEstado} fechaEstado={pedido.bolseo_fecha_estado}
            intensificado={siguienteProcesoPlastico === "bolseo"}
            clickable={ordenVigente && bolEstado !== "no-aplica" && (puedeBolseo || esRolPlanta)}
            onClick={() => {
              if (!ordenVigente) return;
              puedeBolseo ? abrirProceso("bolseo") : setModalVerificacion({ pedido, proceso: "bolseo" });
            }} />
          {bolEstado === "finalizado" && <FechaCorta fecha={pedido.bolseo_fecha_estado} />}
        </td>

        <td className={`${px} text-center`}>
          <Badge estado={asaEstado} fechaEstado={pedido.asa_flexible_fecha_estado}
            intensificado={siguienteProcesoPlastico === "asa_flexible"}
            clickable={ordenVigente && asaEstado !== "no-aplica" && (puedeAsaFlexible || esRolPlanta)}
            onClick={() => {
              if (!ordenVigente) return;
              puedeAsaFlexible ? abrirProceso("asa_flexible") : setModalVerificacion({ pedido, proceso: "asa_flexible" });
            }} />
          {asaEstado === "finalizado" && <FechaCorta fecha={pedido.asa_flexible_fecha_estado} />}
        </td>

        {PROCESOS_PAPEL.map(({ key }, idxPapel) => {
          const proceso = esPapel ? procesosPapelPorNombre.get(key) : undefined;
          const estado = esPapel ? estadosPapelDeLaFila[idxPapel].estado : estadoProcesoPapelATabla(proceso?.estado);
          return (
            <td key={key} className={`${px} text-center`}>
              {errorCargaProcesosPapel ? (
                <span
                  title="No se pudieron cargar los procesos de papel"
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border bg-red-100 text-red-800 border-red-300"
                >
                  !
                </span>
              ) : (
                <>
                  <Badge
                    estado={estado}
                    fechaEstado={fechaProcesoPapel(proceso)}
                    intensificado={esPapel && key === siguienteProcesoPapel}
                    clickable={
                      esPapel && ordenVigente && !!proceso && estado !== "no-aplica" &&
                      (permisosProcesoPapel[key] || esRolPlanta)
                    }
                    onClick={() => {
                      if (!esPapel || !ordenVigente || !proceso) return;
                      permisosProcesoPapel[key]
                        ? setModalProcesoPapel({ pedido, nombreProceso: key })
                        : setModalVerificacion({ pedido, proceso: key });
                    }}
                  />
                  {estado === "finalizado" && <FechaCorta fecha={fechaProcesoPapel(proceso)} />}
                </>
              )}
            </td>
          );
        })}

        <td className={`${px} text-center`}>
          {puedeVerECta
            ? <BotonEstadoCuentaPdf
                noPedido={pedido.no_pedido}
                generado={(pedido as any).estado_cuenta_generado}
                fechaGeneracion={(pedido as any).estado_cuenta_fecha ?? null}
              />
            : <span className="text-gray-300 text-xs">—</span>
          }
        </td>

        <td className={`${px} text-center`}>
          {esAccesoTotal
            ? <BadgeTextoBtn estado={estadoPago} fechaEstado={(pedido as any).pago_fecha_estado} cargando={cargandoAnticipo === pedido.no_pedido} onClick={() => abrirAnticipo(pedido)} />
            : <BadgeTexto estado={estadoPago} fechaEstado={(pedido as any).pago_fecha_estado} />
          }
          {/* Fecha en que se liquidó por completo la deuda del pedido.
              La columna real en BD es ventas.fecha_liquidacion — si el
              backend de /seguimiento aún no la manda con ese nombre, no
              hay fecha que mostrar (por eso el fallback a null final, en
              vez de apoyarse solo en pago_fecha_estado que no refleja la
              liquidación). Pide que se agregue pago_fecha_liquidacion
              (alias de ventas.fecha_liquidacion) a esa respuesta. */}
          {estadoPago === "pagado" && (
            <FechaAprobacion fecha={
              (pedido as any).pago_fecha_liquidacion ??
              (pedido as any).venta_fecha_liquidacion ??
              (pedido as any).fecha_liquidacion ??
              (pedido as any).pago_fecha_estado ??
              null
            } />
          )}
        </td>

        {/* ENVÍO */}
        <td className={`${px} text-center`}>
          {tieneOrden ? (
            puedeVerEnvio ? (
              <BadgeTextoBtn estado={estadoEnvio} fechaEstado={(pedido as any).envio_fecha_estado} onClick={() => setModalEnvio(pedido)} />
            ) : (
              <BadgeTexto estado={estadoEnvio} fechaEstado={(pedido as any).envio_fecha_estado} />
            )
          ) : (
            <BadgeTexto estado="no-aplica" />
          )}
          {/* Fecha en que se terminó de enviar todo lo de esta orden */}
          {estadoEnvio === "finalizado" && <FechaAprobacion fecha={(pedido as any).envio_fecha_estado ?? null} />}
        </td>
      </tr>
    );
  };

  const modales = (
    <>
      {modalProceso && (
        <Modal isOpen={!!modalProceso} onClose={() => { setModalProceso(null); setTokenProceso(null); }}
          title={`${modalProceso.nombreProceso.replace("_", " ").toUpperCase()} — ${modalProceso.pedido.no_produccion}`}>
          <ModalProcesoIndividual
            pedido={modalProceso.pedido}
            nombreProceso={modalProceso.nombreProceso}
            onClose={() => { setModalProceso(null); setTokenProceso(null); }}
            onActualizar={cargar}
          />
        </Modal>
      )}

      {modalAnticipo && (
        <Modal isOpen={!!modalAnticipo} onClose={() => { setModalAnticipo(null); cargar(); cargarCuentasPorCobrar(); }} title="Anticipo y Liquidacion">
          <EditarAntLiqReal
            venta={modalAnticipo.venta}
            metodos={modalAnticipo.metodos}
            onClose={() => { setModalAnticipo(null); cargar(); cargarCuentasPorCobrar(); }}
            onActualizar={(ventaActualizada) => {
              setModalAnticipo(prev => prev ? { ...prev, venta: ventaActualizada } : null);
              cargarCuentasPorCobrar();
            }}
          />
        </Modal>
      )}

      {modalCuentasPorCobrar && (
        <Modal
          isOpen={modalCuentasPorCobrar}
          onClose={() => setModalCuentasPorCobrar(false)}
          title="Cuentas por cobrar"
        >
          <ModalCuentasPorCobrar
            cuentas={cuentasPorCobrar}
            cargando={cargandoCPC}
            onVerLiquidar={(noPedido) => {
              setModalCuentasPorCobrar(false);
              abrirAnticipo({ no_pedido: noPedido } as unknown as PedidoSeguimiento);
            }}
          />
        </Modal>
      )}

      {modalDiseno && (
        <Modal isOpen={!!modalDiseno} onClose={() => setModalDiseno(null)} title="Gestionar Disenos">
          <EditarDisenoReal
            pedido={modalDiseno}
            onClose={() => setModalDiseno(null)}
            onEstadoChange={() => { cargar(); }}
          />
        </Modal>
      )}

      {modalVerificacion && (
        <ModalVerificarOperador
          proceso={modalVerificacion.proceso}
          idproduccion={modalVerificacion.pedido.idproduccion}
          onSuccess={(_operador, tokenProceso) => {
            const { pedido, proceso } = modalVerificacion;
            setModalVerificacion(null);
            // Token de proceso (fase 5): null para orden_diseno, que queda
            // fuera de su alcance — ver ModalVerificarOperador.tsx.
            setTokenProceso(tokenProceso);
            if (proceso === "orden_diseno") {
              setModalOD(pedido);
            } else if (proceso in NOMBRES_PROCESO_PAPEL) {
              setModalProcesoPapel({ pedido, nombreProceso: proceso as NombreProcesoPapel });
            } else {
              setModalProceso({ pedido, nombreProceso: proceso });
            }
          }}
          onCancel={() => setModalVerificacion(null)}
        />
      )}

      {modalEnvio && (
        <ModalEnvioSeguimiento
          pedido={modalEnvio}
          onClose={() => setModalEnvio(null)}
          onActualizar={cargar}
        />
      )}

      {modalOD && (
        <Modal
          isOpen={!!modalOD}
          onClose={() => { setModalOD(null); cargar(); }}
          title={`Orden de Diseño — ${modalOD.no_pedido}`}
        >
          <ChatRevision
            idorden={(modalOD as any).idorden_diseno as number}
            usuarioId={user?.id ?? 0}
            onClose={() => { setModalOD(null); cargar(); }}
          />
        </Modal>
      )}

      {modalProcesoPapel && (
        <Modal
          isOpen={!!modalProcesoPapel}
          onClose={() => { setModalProcesoPapel(null); setTokenProceso(null); }}
          title={`${NOMBRES_PROCESO_PAPEL[modalProcesoPapel.nombreProceso]} — ${modalProcesoPapel.pedido.no_produccion}`}
        >
          <ModalProcesoIndividualPapel
            pedido={modalProcesoPapel.pedido as unknown as PedidoSeguimientoPapel}
            nombreProceso={modalProcesoPapel.nombreProceso}
            onClose={() => { setModalProcesoPapel(null); setTokenProceso(null); }}
            onActualizar={cargar}
          />
        </Modal>
      )}
    </>
  );

  if (cargaInicial) return (
    <Dashboard>
      <RequiereConexion>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Cargando seguimiento...</p>
        </div>
      </div>
    </RequiereConexion>
    </Dashboard>
  );

  if (error && pedidos.length === 0) return (
    <Dashboard>
      <RequiereConexion>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-3">{error}</p>
          <button onClick={cargar} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Reintentar</button>
        </div>
      </div>
    </RequiereConexion>
    </Dashboard>
  );

  if (pantallaCompleta) return (
    <>
      <div className="p-6 min-h-screen bg-gray-50">
        <button onClick={() => setPantallaCompleta(false)}
          className="mb-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cerrar
        </button>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {renderThead(true)}
              <tbody>{pedidosFiltrados.map((p, i) => renderFila(p, true, i))}</tbody>
            </table>
          </div>
        </div>
      </div>
      {modales}
    </>
  );

  return (
    <Dashboard>
      <RequiereConexion>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
          <p className="text-sm text-red-700">{error} Se muestran los últimos datos cargados.</p>
          <button onClick={cargar} disabled={cargando}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md disabled:opacity-50">
            Reintentar
          </button>
        </div>
      )}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seguimiento de Pedidos</h1>
          <p className="text-gray-600">Monitorea el estado de todos los pedidos en tiempo real</p>
        </div>
        {puedeVerECta && (
          <button
            onClick={() => { setModalCuentasPorCobrar(true); cargarCuentasPorCobrar(); }}
            title="Pedidos con estado de cuenta generado hace 5 o más días hábiles y saldo pendiente"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 transition-colors"
          >
          Cuentas por cobrar
            {cuentasPorCobrar.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 rounded-full bg-amber-600 text-white text-xs font-bold">
                {cuentasPorCobrar.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Filtros y búsqueda ── */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
        <div className="relative">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por N° pedido, N° orden producción o impresión..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-700">Tipo:</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "todos", label: "Todos" },
              { key: "plastico", label: "Plástico" },
              { key: "papel", label: "Papel" },
              { key: "carton", label: "Cartón" },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltroTipo(f.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtroTipo === f.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Orden:</label>
            <select
              value={ordenFecha}
              onChange={e => setOrdenFecha(e.target.value as "antiguo" | "reciente")}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="antiguo">Más antiguo</option>
              <option value="reciente">Más reciente</option>
            </select>
          </div>

          {/* ── NUEVO: botón discreto — sin este toggle, una orden ya
              pagada+enviada solo reaparece si se busca por nombre/folio.
              Aquí se puede volver a ver el listado completo con un click. */}
          <button
            type="button"
            onClick={() => setMostrarFinalizados(prev => !prev)}
            title={mostrarFinalizados
              ? "Ocultar de nuevo las órdenes ya finalizadas por completo"
              : "Mostrar también las órdenes ya finalizadas por completo (producción + envío + pago)"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              mostrarFinalizados
                ? "bg-gray-700 text-white border-gray-700 hover:bg-gray-800"
                : "text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100"
            }`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mostrarFinalizados ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.774 3.162 10.066 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              )}
            </svg>
            {mostrarFinalizados ? "Viendo todas" : "Ver finalizadas"}
          </button>

          {(busqueda || filtroTipo !== "todos" || mostrarFinalizados) && (
            <span className="text-sm text-gray-500 ml-auto">
              {pedidosFiltrados.length} resultado{pedidosFiltrados.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Leyenda:</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { color: "bg-green-500", label: "Finalizado / Aprobado / Pagado" },
            { color: "bg-yellow-400", label: "En Proceso" },
            { color: "bg-orange-400", label: "Pendiente" },
            { color: "bg-orange-600", label: "Listo para arrancar (el proceso anterior ya terminó)" },
            { color: "bg-red-700", label: "Detenido +7 días (crítico)" },
            { color: "bg-gray-600", label: "Resagado / +10 días sin cambio" },
            { color: "bg-gray-300", label: "No Aplica" },
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
            Lista de Ordenes
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({pedidosFiltrados.length} orden{pedidosFiltrados.length !== 1 ? "es" : ""})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={cargar} disabled={cargando} title="Actualizar"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 rounded-lg transition-colors">
              <svg className={"w-5 h-5 " + (cargando ? "animate-spin" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={() => setPantallaCompleta(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            {renderThead()}
            <tbody>{pedidosPagina.map((p, i) => renderFila(p, false, inicio + i))}</tbody>
          </table>
        </div>

        {pedidosFiltrados.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-lg font-medium text-gray-900">Sin resultados</p>
            <p className="text-sm text-gray-500 mt-1">
              {busqueda
                ? `No se encontraron órdenes para "${busqueda}"`
                : "No se encontraron órdenes con los filtros seleccionados"}
            </p>
            {(busqueda || filtroTipo !== "todos") && (
              <button
                onClick={() => { setBusqueda(""); setFiltroTipo("todos"); }}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {modales}
    </RequiereConexion>
    </Dashboard>
  );
}