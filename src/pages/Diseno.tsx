import Dashboard from "../layouts/Sidebar";
import Modal from "../components/Modal";
import { useState, useEffect } from "react";
import { getDisenoByPedido, actualizarEstadoProductoDiseno } from "../services/disenoservice";
import { getPedidos } from "../services/pedidosService";
import { getOrdenProduccion } from "../services/seguimientoService";
import { generarPdfOrdenProduccion } from "../services/generarPdfOrdenProduccion";
import type { Diseno, DisenoProducto } from "../types/ventas.types";
import type { Pedido } from "../types/cotizaciones.types";

const ESTADO = { PENDIENTE: 1, EN_PROCESO: 2, APROBADO: 3 } as const;
const POR_PAGINA = 10;

const fmtFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
};

function estadoLabel(estadoId: number): "pendiente" | "en_proceso" | "aprobado" {
  if (estadoId === ESTADO.APROBADO)   return "aprobado";
  if (estadoId === ESTADO.EN_PROCESO) return "en_proceso";
  return "pendiente";
}

async function descargarPdfOrden(noPedido: string, noProduccion: string): Promise<void> {
  const data = await getOrdenProduccion(noPedido);
  const producto = data.productos.find((p: any) => p.no_produccion === noProduccion);
  if (!producto) throw new Error(`Producto con folio ${noProduccion} no encontrado`);

  await generarPdfOrdenProduccion({
    no_pedido:               data.no_pedido,
    no_produccion:           producto.no_produccion,
    fecha:                   data.fecha,
    fecha_produccion:        producto.fecha_produccion,
    fecha_aprobacion_diseno: producto.fecha_aprobacion_diseno,
    observaciones_diseno:    producto.observaciones_diseno    ?? null,
    cliente:                 data.cliente,
    empresa:                 data.empresa,
    telefono:                data.telefono,
    correo:                  data.correo,
    impresion:               data.impresion,
    nombre_producto:         producto.nombre_producto,
    categoria:               producto.categoria,
    material:                producto.material,
    calibre:                 producto.calibre,
    medida:                  producto.medida,
    altura:                  producto.altura,
    ancho:                   producto.ancho,
    fuelle_fondo:            producto.fuelle_fondo,
    fuelle_lat_iz:           producto.fuelle_lat_iz,
    fuelle_lat_de:           producto.fuelle_lat_de,
    refuerzo:                producto.refuerzo,
    por_kilo:                producto.por_kilo,
    medidas:                 producto.medidas,
    tintas:                  producto.tintas,
    caras:                   producto.caras,
    bk:                      producto.bk,
    foil:                    producto.foil,
    alto_rel:                producto.alto_rel,
    laminado:                producto.laminado,
    uv_br:                   producto.uv_br,
    pigmentos:               producto.pigmentos,
    pantones:                producto.pantones,
    asa_suaje:               producto.asa_suaje,
    observacion:             producto.observacion,
    cantidad:                producto.cantidad,
    kilogramos:              producto.kilogramos,
    modo_cantidad:           producto.modo_cantidad,
    repeticion_extrusion:    producto.repeticion_extrusion ?? null,
    repeticion_metro:        producto.repeticion_metro     ?? null,
    metros:                  producto.metros               ?? null,
    ancho_bobina:            producto.ancho_bobina         ?? null,
    repeticion_kidder:       producto.repeticion_kidder    ?? null,
    repeticion_sicosa:       producto.repeticion_sicosa    ?? null,
    fecha_entrega:           producto.fecha_entrega        ?? null,
    kilos:                   producto.kilos                ?? null,
    kilos_merma:             producto.kilos_merma          ?? null,
    pzas:                    producto.pzas                 ?? null,
    pzas_merma:              producto.pzas_merma           ?? null,
    kilos_extruir:           producto.kilos_extruir        ?? null,
    metros_extruir:          producto.metros_extruir       ?? null,
  });
}

// ─────────────────────────────────────────────
// PAGINADOR
// ─────────────────────────────────────────────
function Paginador({
  total, pagina, porPagina, onChange,
}: {
  total: number; pagina: number; porPagina: number; onChange: (p: number) => void;
}) {
  const totalPaginas = Math.ceil(total / porPagina);
  if (totalPaginas <= 1) return null;

  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-medium">{desde}–{hasta}</span> de{" "}
        <span className="font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(pagina - 1)}
          disabled={pagina === 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ‹ Anterior
        </button>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
          .reduce<(number | "...")[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((p, idx) =>
            p === "..." ? (
              <span key={`e${idx}`} className="px-2 text-gray-400 text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p as number)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  p === pagina
                    ? "bg-blue-600 text-white border-blue-600 font-semibold"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            )
          )}
        <button
          onClick={() => onChange(pagina + 1)}
          disabled={pagina === totalPaginas}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente ›
        </button>
      </div>
    </div>
  );
}

function EditarDisenoReal({
  pedido,
  onClose,
  onEstadoChange,
}: {
  pedido:         Pedido;
  onClose:        () => void;
  onEstadoChange: (noPedido: string, estadoId: number) => void;
}) {
  const [diseno,    setDiseno]    = useState<Diseno | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [obsMap,    setObsMap]    = useState<Record<number, string>>({});

  const [alertaPdf, setAlertaPdf] = useState<{ visible: boolean; folios: string[] }>({
    visible: false,
    folios:  [],
  });

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDisenoByPedido(pedido.no_pedido);
      setDiseno(data);
      const map: Record<number, string> = {};
      data.productos.forEach((p: DisenoProducto) => {
        map[p.iddiseno_producto] = p.observaciones ?? "";
      });
      setObsMap(map);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al cargar diseño");
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (id: number, estadoId: number) => {
    setGuardando(id);
    try {
      const resultado = await actualizarEstadoProductoDiseno(id, {
        estadoId,
        observaciones: obsMap[id] || undefined,
      });

      const actualizado = await getDisenoByPedido(pedido.no_pedido);
      setDiseno(actualizado);
      onEstadoChange(pedido.no_pedido, resultado.estado_cabecera_id ?? actualizado.estado_id);

      if (estadoId === ESTADO.APROBADO && resultado.orden_generada && resultado.no_produccion) {
        try {
          await descargarPdfOrden(pedido.no_pedido, resultado.no_produccion);
          setAlertaPdf({ visible: true, folios: [resultado.no_produccion] });
        } catch (pdfErr) {
          console.error("Error al generar PDF:", pdfErr);
        }
      }

    } catch (e: any) {
      alert(e.response?.data?.error || "Error al actualizar estado");
    } finally {
      setGuardando(null);
    }
  };

  const handleAprobarTodos = async () => {
    if (!diseno || !confirm("¿Aprobar TODOS los productos?")) return;
    for (const p of diseno.productos) {
      if (p.estado_id !== ESTADO.APROBADO) {
        await handleCambiarEstado(p.iddiseno_producto, ESTADO.APROBADO);
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="text-center py-12">
      <p className="text-red-600 mb-4">{error}</p>
      <button onClick={cargar} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Reintentar</button>
    </div>
  );

  if (!diseno) return null;

  const total     = diseno.total_productos;
  const aprobados = diseno.aprobados;
  const conOrden  = (diseno as any).con_orden ?? 0;

  const eg = aprobados === total && total > 0 ? "aprobado" :
             aprobados > 0                    ? "en_proceso" : "pendiente";

  return (
    <div className="space-y-5">

      {alertaPdf.visible && (
        <div className="flex items-start gap-3 bg-green-50 border-2 border-green-400 rounded-xl px-4 py-4 shadow-md">
          <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-green-800 text-sm">
              🎉 Orden{alertaPdf.folios.length > 1 ? "es" : ""} de Producción lista{alertaPdf.folios.length > 1 ? "s" : ""}
            </p>
            <div className="mt-1 space-y-0.5">
              {alertaPdf.folios.map(folio => (
                <p key={folio} className="text-green-700 text-xs font-semibold">📄 Folio: {folio}</p>
              ))}
            </div>
            <p className="text-green-600 text-xs mt-1">El PDF se descargó automáticamente.</p>
          </div>
          <button
            onClick={() => setAlertaPdf({ visible: false, folios: [] })}
            className="flex-shrink-0 text-green-400 hover:text-green-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-semibold text-gray-900">{pedido.cliente || "—"}</p>
        <p className="text-sm text-gray-500">{pedido.empresa || "—"}</p>
        <p className="text-xs text-gray-400 mt-1">
          Pedido #{pedido.no_pedido}
          {pedido.no_cotizacion ? ` · Cot. #${pedido.no_cotizacion}` : ""}
        </p>
      </div>

      {!(diseno as any).anticipo_cubierto && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 border bg-amber-50 border-amber-200">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-sm text-amber-800">Anticipo pendiente de pago</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Pagado: ${Number((diseno as any).abono ?? 0).toFixed(2)} /
              Requerido: ${Number((diseno as any).anticipo ?? 0).toFixed(2)} —
              Las órdenes se generarán automáticamente al cubrir el anticipo.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total",      value: total,             color: "text-gray-700"   },
          { label: "Aprobados",  value: aprobados,         color: "text-green-700"  },
          { label: "Pendientes", value: diseno.pendientes, color: "text-orange-600" },
          { label: "Con orden",  value: conOrden,          color: "text-blue-700"   },
        ].map(item => (
          <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
        eg === "aprobado"   ? "bg-green-50 border-green-200"  :
        eg === "en_proceso" ? "bg-blue-50 border-blue-200"    :
                              "bg-yellow-50 border-yellow-200"
      }`}>
        <span className="text-lg">
          {eg === "aprobado" ? "✓" : eg === "en_proceso" ? "🔄" : "⏱️"}
        </span>
        <p className={`font-semibold text-sm ${
          eg === "aprobado"   ? "text-green-800" :
          eg === "en_proceso" ? "text-blue-800"  : "text-yellow-800"
        }`}>
          {eg === "aprobado"
            ? `Todos los diseños aprobados — ${aprobados}/${total}`
            : eg === "en_proceso"
              ? `En proceso — ${aprobados}/${total} diseños aprobados`
              : `Pendiente — 0/${total} diseños aprobados`}
        </p>
      </div>

      {!diseno.diseno_completado && (
        <button
          onClick={handleAprobarTodos}
          disabled={guardando !== null}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Aprobar todos
        </button>
      )}

      <div className="space-y-3">
        {diseno.productos.map((producto: any) => {
          const isGuardando = guardando === producto.iddiseno_producto;
          const aprobado    = producto.estado_id === ESTADO.APROBADO;
          const enProceso   = producto.estado_id === ESTADO.EN_PROCESO;

          return (
            <div
              key={producto.iddiseno_producto}
              className={`bg-white rounded-xl border-2 p-4 transition-all ${
                aprobado  ? "border-green-200" :
                enProceso ? "border-blue-200"  : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span>{aprobado ? "✓" : enProceso ? "🔄" : "⏱️"}</span>
                  <p className="text-sm font-semibold text-gray-900 truncate">{producto.nombre}</p>
                </div>
                <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  aprobado  ? "bg-green-100 text-green-800" :
                  enProceso ? "bg-blue-100 text-blue-800"   : "bg-yellow-100 text-yellow-800"
                }`}>
                  {producto.estado}
                </span>
              </div>

              {(producto.cantidad || producto.kilogramos) && (
                <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Cantidad aprobada por cliente:</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {producto.modo_cantidad === "kilo" && producto.kilogramos
                      ? `${Number(producto.kilogramos).toFixed(2)} kg (${Number(producto.cantidad).toLocaleString()} piezas)`
                      : `${Number(producto.cantidad).toLocaleString()} piezas`
                    }
                  </p>
                </div>
              )}

              {producto.orden_generada && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg mb-3">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-xs font-semibold text-green-800">
                    ✅ Orden de Producción generada: {producto.no_produccion}
                  </span>
                </div>
              )}

              {aprobado && !producto.orden_generada && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-xs font-semibold text-amber-800">
                    Diseño aprobado — esperando pago de anticipo para generar orden
                  </span>
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Observaciones / cambios solicitados
                </label>
                <textarea
                  value={obsMap[producto.iddiseno_producto] ?? ""}
                  onChange={e => setObsMap(prev => ({
                    ...prev, [producto.iddiseno_producto]: e.target.value,
                  }))}
                  rows={2}
                  placeholder="Ej: Cliente solicitó cambiar el color azul por verde"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-700 bg-gray-50 focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCambiarEstado(producto.iddiseno_producto, ESTADO.EN_PROCESO)}
                  disabled={isGuardando || enProceso}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    enProceso
                      ? "bg-blue-100 text-blue-700 cursor-default"
                      : "bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                  }`}
                >
                  {isGuardando
                    ? <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                  }
                  En proceso
                </button>

                <button
                  onClick={() => handleCambiarEstado(producto.iddiseno_producto, ESTADO.APROBADO)}
                  disabled={isGuardando || aprobado}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    aprobado
                      ? "bg-green-100 text-green-700 cursor-default"
                      : "bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  }`}
                >
                  {isGuardando
                    ? <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                  }
                  {aprobado ? "Aprobado ✓" : "Aprobar"}
                </button>

                {producto.estado_id !== ESTADO.PENDIENTE && !producto.orden_generada && (
                  <button
                    onClick={() => handleCambiarEstado(producto.iddiseno_producto, ESTADO.PENDIENTE)}
                    disabled={isGuardando}
                    className="py-2 px-3 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200 transition-all disabled:opacity-50"
                    title="Restablecer a pendiente"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function Diseno() {
  const [pedidos,      setPedidos]      = useState<Pedido[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [busqueda,     setBusqueda]     = useState("");
  const [pagina,       setPagina]       = useState(1);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try { setPedidos(await getPedidos()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleEstadoChange = (noPedido: string, estadoId: number) => {
    setPedidos(prev => prev.map(p =>
      p.no_pedido === noPedido ? { ...p, diseno_estado_id: estadoId } as any : p
    ));
  };

  const handleEditar = (pedido: Pedido) => { setPedidoActivo(pedido); setModalOpen(true); };
  const handleCerrar = () => { setModalOpen(false); setPedidoActivo(null); };

  const normalizarTexto = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\-]/g, "").trim();

  const filtrados = pedidos.filter(p => {
    if (!busqueda) return true;
    const t = normalizarTexto(busqueda);
    return (
      normalizarTexto(p.cliente ?? "").includes(t) ||
      normalizarTexto(p.empresa ?? "").includes(t) ||
      p.no_pedido.toString().includes(t)
    );
  });

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => { setPagina(1); }, [busqueda]);

  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const getEstadoBadge = (ped: Pedido) => {
    const estadoId: number = (ped as any).diseno_estado_id ?? 1;
    const ef = estadoLabel(estadoId);
    return (
      <div className="flex flex-col gap-1">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          ef === "aprobado"   ? "bg-green-100 text-green-800"  :
          ef === "en_proceso" ? "bg-blue-100 text-blue-800"    :
                                "bg-yellow-100 text-yellow-800"
        }`}>
          {ef === "aprobado" ? "✓ Aprobado" : ef === "en_proceso" ? "🔄 En proceso" : "⏱️ Pendiente"}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
          🎨 {ped.productos.length} diseño(s)
        </span>
      </div>
    );
  };

  return (
    <Dashboard>
      <h1 className="text-2xl font-bold mb-4">Gestión de Diseños</h1>
      <p className="text-slate-400 mb-6">Administra y aprueba los diseños de productos de cada pedido.</p>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, empresa o N° pedido..."
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {busqueda && <p className="mt-2 text-sm text-gray-600">{filtrados.length} resultado(s)</p>}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["N° Pedido", "Fecha", "Cliente", "Empresa", "Productos", "Estado", "Acciones"].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
                <p className="mt-3 text-gray-500">Cargando pedidos...</p>
              </td></tr>
            ) : paginados.length > 0 ? paginados.map(ped => (
              <tr key={ped.no_pedido} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{ped.no_pedido}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtFecha(ped.fecha)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ped.cliente || "—"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ped.empresa || "N/A"}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="max-w-xs">
                    {ped.productos.length} producto(s)
                    <div className="text-xs text-gray-400 mt-1">
                      {ped.productos.slice(0, 2).map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className="text-orange-500">⏱️</span>
                          <span>{(p.nombre || "Producto").substring(0, 30)}...</span>
                        </div>
                      ))}
                      {ped.productos.length > 2 && (
                        <div className="text-gray-400">+ {ped.productos.length - 2} más</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{getEstadoBadge(ped)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleEditar(ped)} className="text-blue-600 hover:text-blue-900 font-semibold">
                    Ver/Editar
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                {busqueda ? `No se encontraron pedidos para "${busqueda}"` : "No hay pedidos registrados"}
              </td></tr>
            )}
          </tbody>
        </table>
        <Paginador
          total={filtrados.length}
          pagina={pagina}
          porPagina={POR_PAGINA}
          onChange={setPagina}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={handleCerrar} title="Gestionar Diseños">
        {pedidoActivo && (
          <EditarDisenoReal
            pedido={pedidoActivo}
            onClose={handleCerrar}
            onEstadoChange={handleEstadoChange}
          />
        )}
      </Modal>
    </Dashboard>
  );
}