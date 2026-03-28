import Dashboard from "../layouts/Sidebar";
import Modal from "../components/Modal";
import { useState, useEffect } from "react";
import {
  getVentas,
  getVentaByPedido,
  registrarPago,
  eliminarPago,
  getMetodosPago,
  autorizarAnticipoCredito,  // 👈 nueva importación
} from "../services/ventasservice";
import { getOrdenProduccion } from "../services/seguimientoService";
import { generarPdfOrdenProduccion } from "../services/generarPdfOrdenProduccion";
import { generarPdfEstadoCuenta } from "../services/generarPdfEstadoCuenta";
import { generarPdfEstadoCuentaSimple } from "../services/generarPdfEstadoCuentaSimple";
import { generarPdfHistorialPagos } from "../services/generarPdfHistorialPagos";
import { getEstadoCuenta } from "../services/estadoCuentaService";
import type { EstadoCuenta } from "../services/estadoCuentaService";
import type { Venta, VentaPago, MetodoPago } from "../types/ventas.types";

const ESTADO = { PENDIENTE: 1, EN_PROCESO: 2, PAGADO: 6 } as const;
const POR_PAGINA = 10;

const fmt = (n: number) =>
  Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
};

function calcularEstado(abono: number, anticipo: number, saldo: number): number {
  if (saldo <= 0.01)     return ESTADO.PAGADO;
  if (abono >= anticipo) return ESTADO.EN_PROCESO;
  return ESTADO.PENDIENTE;
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
    prioridad: data.prioridad ?? false,
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
    color_asa_nombre: producto.color_asa_nombre ?? null,
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

// ════════════════════════════════════════════════════════════
// SECCIÓN ESTADO DE CUENTA
// ════════════════════════════════════════════════════════════
function SeccionEstadoCuenta({
  noPedido,
  pagos,
  onActualizar,
}: {
  noPedido:     string;
  pagos:        VentaPago[];
  onActualizar: (ventaActualizada: Partial<Venta>) => void;
}) {
  const [expandido,       setExpandido]       = useState(false);
  const [datos,           setDatos]           = useState<EstadoCuenta | null>(null);
  const [cargando,        setCargando]        = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [cargado,         setCargado]         = useState(false);
  const [generandoSimple, setGenerandoSimple] = useState(false);
  const [generandoDetalle, setGenerandoDetalle] = useState(false);

  const cargar = async () => {
    if (cargado) return;
    setCargando(true);
    setError(null);
    try {
      const data = await getEstadoCuenta(noPedido);
      setDatos(data);
      setCargado(true);
      onActualizar({
        saldo:            data.saldo,
        anticipo:         data.anticipo,
        abono:            data.abono,
        subtotal_real:    data.subtotal_real,
        iva_real:         data.iva_real,
        total_real:       data.total_real,
        diferencia_total: data.diferencia_total,
        estado_id:        data.estado_id,
      });
    } catch (e: any) {
      const msg = e.response?.data?.detalle || e.response?.data?.error || "Error al cargar estado de cuenta";
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  const handleToggle = () => {
    const nuevo = !expandido;
    setExpandido(nuevo);
    if (nuevo && !cargado) cargar();
  };

  const handleDescargarSimple = async () => {
    if (!datos) return;
    setGenerandoSimple(true);
    try {
      await generarPdfEstadoCuentaSimple(datos);
    } catch (e) {
      console.error("Error al generar PDF estado de cuenta simple:", e);
    } finally {
      setGenerandoSimple(false);
    }
  };

  const handleDescargarDetalle = async () => {
    if (!datos) return;
    setGenerandoDetalle(true);
    try {
      await generarPdfEstadoCuenta(datos, pagos);
    } catch (e) {
      console.error("Error al generar PDF estado de cuenta detallado:", e);
    } finally {
      setGenerandoDetalle(false);
    }
  };

  return (
    <div className="border border-indigo-200 rounded-xl overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-indigo-600 text-sm">📊</span>
          <span className="text-sm font-semibold text-indigo-800">Estado de Cuenta</span>
          <span className="text-xs text-indigo-500 font-normal">(precio final basado en producción real)</span>
        </div>
        <svg className={`w-4 h-4 text-indigo-500 transition-transform duration-200 ${expandido ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expandido && (
        <div className="p-4 bg-white space-y-4">
          {cargando && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
            </div>
          )}

          {error && !cargando && (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                ⚠️ {error}
              </p>
              <p className="text-xs text-gray-400">
                El estado de cuenta solo está disponible cuando todos los procesos de producción han finalizado.
              </p>
            </div>
          )}

          {datos && !cargando && (
            <>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Comparativa por producto
                </p>
                {datos.productos.map(prod => {
                  const diffPzas   = prod.diferencia_piezas;
                  const diffPrecio = prod.diferencia_precio;
                  return (
                    <div key={prod.idsolicitud_producto} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{prod.nombre}</p>
                        <p className="text-[10px] text-gray-400">
                          {prod.no_produccion} · {prod.tintas} tinta(s) · {prod.caras} cara(s)
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-white rounded p-2 border border-gray-100 flex items-center gap-2">
                          <span className="text-sm">⚖️</span>
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase tracking-wide">Kilogramos reales</p>
                            <p className="text-xs font-bold text-gray-700">
                              {prod.peso_kg_real > 0 ? `${Number(prod.peso_kg_real).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white rounded p-2 border border-gray-100 flex items-center gap-2">
                          <span className="text-sm">📦</span>
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase tracking-wide">Piezas reales</p>
                            <p className="text-xs font-bold text-gray-700">
                              {Number(prod.cantidad_real).toLocaleString("es-MX")} pzas
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="bg-white rounded p-2 text-center border border-gray-100">
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Ordenado</p>
                          <p className="text-xs font-bold text-gray-700">{Number(prod.cantidad_original).toLocaleString("es-MX")}</p>
                        </div>
                        <div className="bg-blue-50 rounded p-2 text-center border border-blue-100">
                          <p className="text-[9px] text-blue-400 uppercase tracking-wide">Real</p>
                          <p className="text-xs font-bold text-blue-700">{Number(prod.cantidad_real).toLocaleString("es-MX")}</p>
                        </div>
                        <div className={`rounded p-2 text-center border ${
                          diffPzas === 0 ? "bg-gray-50 border-gray-100" :
                          diffPzas > 0   ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                        }`}>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Dif. pzas</p>
                          <p className={`text-xs font-bold ${
                            diffPzas === 0 ? "text-gray-500" : diffPzas > 0 ? "text-green-700" : "text-red-700"
                          }`}>{diffPzas > 0 ? "+" : ""}{Number(diffPzas).toLocaleString("es-MX")}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="bg-white rounded p-2 text-center border border-gray-100">
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Precio orig.</p>
                          <p className="text-xs font-bold text-gray-700">${fmt(prod.precio_total_original)}</p>
                        </div>
                        <div className="bg-blue-50 rounded p-2 text-center border border-blue-100">
                          <p className="text-[9px] text-blue-400 uppercase tracking-wide">Precio real</p>
                          <p className="text-xs font-bold text-blue-700">${fmt(prod.precio_total_real)}</p>
                        </div>
                        <div className={`rounded p-2 text-center border ${
                          diffPrecio === 0 ? "bg-gray-50 border-gray-100" :
                          diffPrecio > 0   ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                        }`}>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Dif. precio</p>
                          <p className={`text-xs font-bold ${
                            diffPrecio === 0 ? "text-gray-500" : diffPrecio > 0 ? "text-green-700" : "text-red-700"
                          }`}>{diffPrecio > 0 ? "+" : ""}${fmt(diffPrecio)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-800 px-4 py-2">
                  <p className="text-xs font-bold text-white uppercase tracking-wide">Resumen financiero</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200">
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5 font-medium">Original (cotizado)</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-700">${fmt(datos.subtotal_original)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">IVA 16%</span><span className="text-gray-700">${fmt(datos.iva_original)}</span></div>
                        <div className="flex justify-between font-semibold border-t border-gray-100 pt-1"><span className="text-gray-600">Total</span><span className="text-gray-800">${fmt(datos.total_original)}</span></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-blue-500 mb-1.5 font-medium">Real (producción final)</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-blue-700">${fmt(datos.subtotal_real)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">IVA 16%</span><span className="text-blue-700">${fmt(datos.iva_real)}</span></div>
                        <div className="flex justify-between font-semibold border-t border-blue-100 pt-1"><span className="text-gray-600">Total</span><span className="text-blue-800">${fmt(datos.total_real)}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-lg overflow-hidden border ${
                    datos.diferencia_total === 0 ? "border-gray-200" :
                    datos.diferencia_total > 0   ? "border-green-200" : "border-red-200"
                  }`}>
                    <div className={`px-3 py-2 flex justify-between items-center ${
                      datos.diferencia_total === 0 ? "bg-gray-100" :
                      datos.diferencia_total > 0   ? "bg-green-50" : "bg-red-50"
                    }`}>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Diferencia total c/IVA</p>
                        <p className="text-[10px] text-gray-400">Total real − Total original</p>
                      </div>
                      <span className={`text-sm font-bold ${
                        datos.diferencia_total === 0 ? "text-gray-500" :
                        datos.diferencia_total > 0   ? "text-green-700" : "text-red-700"
                      }`}>
                        {datos.diferencia_total > 0 ? "+" : ""}${fmt(datos.diferencia_total)}
                      </span>
                    </div>
                    {datos.diferencia_total !== 0 && (
                      <div className={`px-3 py-2 text-xs font-medium ${
                        datos.diferencia_total > 0 ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                      }`}>
                        {datos.diferencia_total > 0
                          ? `⚠️ El cliente debe pagar $${fmt(datos.diferencia_total)} adicionales por mayor producción`
                          : `✅ Se debe devolver $${fmt(Math.abs(datos.diferencia_total))} al cliente por menor producción`}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Total abonado</span>
                      <span className="text-green-700 font-semibold">${fmt(datos.abono)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5">
                      <span className="text-gray-700">Saldo pendiente (sobre total real)</span>
                      <span className={datos.saldo <= 0 ? "text-green-600" : "text-red-600"}>
                        {datos.saldo <= 0 ? "✓ Liquidado" : `$${fmt(datos.saldo)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Dos botones de descarga ── */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDescargarSimple}
                  disabled={generandoSimple}
                  className="flex items-center justify-center gap-2 py-2.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {generandoSimple
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                  }
                  {generandoSimple ? "Generando..." : "PDF Cliente"}
                </button>

                <button
                  onClick={handleDescargarDetalle}
                  disabled={generandoDetalle}
                  className="flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {generandoDetalle
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                  }
                  {generandoDetalle ? "Generando..." : "PDF Detallado"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MODAL DETALLE / PAGOS
// ════════════════════════════════════════════════════════════
export function EditarAntLiqReal({
  venta: ventaInicial,
  metodos,
  onClose,
  onActualizar,
}: {
  venta:        Venta;
  metodos:      MetodoPago[];
  onClose:      () => void;
  onActualizar: (v: Venta) => void;
}) {
  const [venta,           setVenta]           = useState<Venta>(ventaInicial);
  const [monto,           setMonto]           = useState("");
  const [metodoPagoId,    setMetodoPagoId]    = useState<number>(metodos[0]?.idmetodo_pago ?? 1);
  const [esAnticipo,      setEsAnticipo]      = useState(false);
  const [montoEsAnticipo, setMontoEsAnticipo] = useState(false);
  const [observacion,     setObservacion]     = useState("");
  const [guardando,       setGuardando]       = useState(false);
  const [eliminando,      setEliminando]      = useState<number | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [descargandoHist, setDescargandoHist] = useState(false);
  const [autorizando,     setAutorizando]     = useState(false); // 👈 nuevo estado
  const [alertaPdf, setAlertaPdf] = useState<{ visible: boolean; folios: string[] }>({
    visible: false, folios: [],
  });

  const anticipo         = Number(venta.anticipo);
  const saldo            = Number(venta.saldo);
  const totalPagado      = Number(venta.abono);
  const totalRef         = Number(venta.total_real ?? venta.total);
  const anticipoRestante = Math.max(anticipo - totalPagado, 0);
  const anticipoCubierto = anticipoRestante <= 0.01;
  const pagado           = saldo <= 0.01;
  const pctPagado        = totalRef > 0 ? Math.min((totalPagado / totalRef) * 100, 100) : 0;

  const recargar = async () => {
    const actualizada = await getVentaByPedido(venta.no_pedido);
    setVenta(actualizada);
    onActualizar(actualizada);
    return actualizada;
  };

  const handleEstadoCuentaActualiza = (parcial: Partial<Venta>) => {
    setVenta(prev => ({ ...prev, ...parcial }));
    onActualizar({ ...venta, ...parcial });
  };

  const handleRegistrarPago = async () => {
    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setError("Ingresa un monto válido mayor a 0"); return;
    }
    if (montoNum > saldo + 0.01) {
      setError(`El monto excede el saldo pendiente ($${fmt(saldo)})`); return;
    }
    setGuardando(true);
    setError(null);
    try {
      const response = await registrarPago(venta.idventas, {
        metodoPagoId, monto: montoNum, esAnticipo,
        observacion: observacion.trim() || undefined,
      });
      await recargar();
      setMonto(""); setObservacion(""); setEsAnticipo(false); setMontoEsAnticipo(false);

      const foliosNuevos: string[] = response?.ordenes_generadas ?? [];
      if (foliosNuevos.length > 0) {
        const foliosDescargados: string[] = [];
        for (const folio of foliosNuevos) {
          try { await descargarPdfOrden(venta.no_pedido, folio); foliosDescargados.push(folio); }
          catch (pdfErr) { console.error(`Error al generar PDF de ${folio}:`, pdfErr); }
        }
        if (foliosDescargados.length > 0) setAlertaPdf({ visible: true, folios: foliosDescargados });
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al registrar pago");
    } finally { setGuardando(false); }
  };

  // 👈 nuevo handler para autorizar anticipo por crédito
  const handleAutorizarCredito = async () => {
    if (!confirm(
      `¿Autorizar el anticipo de $${fmt(anticipoRestante)} por crédito?\n\n` +
      `Esto activará la producción sin registrar movimiento de dinero.\n` +
      `El saldo pendiente seguirá siendo $${fmt(saldo)}.`
    )) return;

    setAutorizando(true);
    setError(null);
    try {
      const response = await autorizarAnticipoCredito(venta.idventas);
      await recargar();

      const foliosNuevos: string[] = response?.ordenes_generadas ?? [];
      if (foliosNuevos.length > 0) {
        const foliosDescargados: string[] = [];
        for (const folio of foliosNuevos) {
          try { await descargarPdfOrden(venta.no_pedido, folio); foliosDescargados.push(folio); }
          catch (pdfErr) { console.error(`Error al generar PDF de ${folio}:`, pdfErr); }
        }
        if (foliosDescargados.length > 0) setAlertaPdf({ visible: true, folios: foliosDescargados });
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al autorizar anticipo por crédito");
    } finally {
      setAutorizando(false);
    }
  };

  const handleEliminarPago = async (pago: VentaPago) => {
    if (!confirm(`¿Eliminar el pago de $${fmt(pago.monto)}?`)) return;
    setEliminando(pago.idventa_pago);
    try { await eliminarPago(pago.idventa_pago); await recargar(); }
    catch (e: any) { alert(e.response?.data?.error || "Error al eliminar pago"); }
    finally { setEliminando(null); }
  };

  const handleDescargarHistorial = async () => {
    setDescargandoHist(true);
    try { await generarPdfHistorialPagos(venta); }
    catch (e) { console.error("Error al generar PDF historial:", e); }
    finally { setDescargandoHist(false); }
  };

  return (
    <div className="space-y-6">

      {/* Alerta PDF */}
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
          <button onClick={() => setAlertaPdf({ visible: false, folios: [] })}
            className="flex-shrink-0 text-green-400 hover:text-green-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Encabezado cliente */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-semibold text-gray-900">{venta.cliente || "—"}</p>
        <p className="text-sm text-gray-500">{venta.empresa || "—"}</p>
        <div className="flex gap-4 mt-1 text-xs text-gray-400">
          {venta.telefono && <span>📞 {venta.telefono}</span>}
          {venta.correo   && <span>✉️ {venta.correo}</span>}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Pedido #{venta.no_pedido}
          {venta.no_cotizacion ? ` · Cot. #${venta.no_cotizacion}` : ""}
          {" · "}{fmtFecha(venta.fecha_pedido)}
        </p>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Subtotal orig.",  value: fmt(venta.subtotal), color: "text-gray-700"               },
          { label: "IVA 16%",         value: fmt(venta.iva),      color: "text-gray-500"               },
          { label: "Total orig.",     value: fmt(venta.total),    color: "text-gray-900 font-bold"     },
          { label: "Anticipo (50%)",  value: fmt(anticipo),       color: "text-blue-700 font-semibold" },
        ].map(item => (
          <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">{item.label}</p>
            <p className={`text-sm ${item.color}`}>${item.value}</p>
          </div>
        ))}
      </div>

      {/* Barra de progreso */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Avance de pago</span>
          <span className="text-sm font-bold text-gray-900">{pctPagado.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 relative">
          <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-10" style={{ left: "50%" }} />
          <div className={`h-3 rounded-full transition-all duration-500 ${
            pctPagado >= 100 ? "bg-emerald-500" : pctPagado >= 50 ? "bg-blue-500" : "bg-yellow-500"
          }`} style={{ width: `${pctPagado}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Pagado: <span className="font-semibold text-emerald-700">${fmt(totalPagado)}</span></span>
          <span>Saldo: <span className={`font-semibold ${saldo > 0.01 ? "text-red-600" : "text-emerald-600"}`}>
            {saldo > 0.01 ? `$${fmt(saldo)}` : "Pagado ✓"}
          </span></span>
        </div>
        <p className="text-center text-xs mt-1 text-blue-500">
          {pagado
            ? "✓ Pedido pagado"
            : anticipoCubierto
              ? "✓ Anticipo cubierto — falta liquidar saldo"
              : `↑ Línea azul = anticipo requerido (50%) · Faltan $${fmt(anticipoRestante)}`}
        </p>

        {pagado && venta.total_real != null && Number(venta.total_real) > Number(venta.total) && (
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
            <p className="text-xs text-amber-800">
              La producción real fue mayor a la cotizada. El saldo se actualizó a{" "}
              <span className="font-bold">${fmt(saldo)}</span> — ya puedes registrar el pago pendiente.
            </p>
          </div>
        )}
      </div>

      {/* Estado de cuenta desplegable */}
      <SeccionEstadoCuenta
        noPedido={venta.no_pedido}
        pagos={venta.pagos ?? []}
        onActualizar={handleEstadoCuentaActualiza}
      />

      {/* Historial de pagos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">
            Historial de pagos ({venta.pagos?.length ?? 0})
          </h4>
          {(venta.pagos?.length ?? 0) > 0 && (
            <button
              onClick={handleDescargarHistorial}
              disabled={descargandoHist}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition-colors border border-gray-200"
            >
              {descargandoHist
                ? <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
              }
              {descargandoHist ? "Generando..." : "PDF"}
            </button>
          )}
        </div>

        {venta.pagos && venta.pagos.length > 0 ? (
          <div className="space-y-2">
            {venta.pagos.map(pago => (
              <div key={pago.idventa_pago}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    pago.es_anticipo ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {pago.es_anticipo ? "A" : "$"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">${fmt(pago.monto)}</p>
                      {pago.es_anticipo && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">Anticipo</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{pago.metodo_pago} · {fmtFecha(pago.fecha)}</p>
                    {pago.observacion && (
                      <p className="text-xs text-gray-500 italic">{pago.observacion}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => handleEliminarPago(pago)}
                  disabled={eliminando === pago.idventa_pago}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                  {eliminando === pago.idventa_pago
                    ? <div className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                  }
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
            Sin pagos registrados aún
          </div>
        )}
      </div>

      {/* Registrar nuevo pago */}
      {!pagado ? (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Registrar pago</h4>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={monto}
                  readOnly={montoEsAnticipo}
                  onChange={e => {
                    const val = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(val)) {
                      setMonto(val);
                      setEsAnticipo(false);
                      setMontoEsAnticipo(false);
                    }
                  }}
                  placeholder="0.00"
                  className={`w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-400 text-sm transition-colors ${
                    montoEsAnticipo ? "bg-blue-50 border-blue-300 cursor-not-allowed" : "bg-white"
                  }`}
                />
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                {!anticipoCubierto && (
                  <button type="button"
                    onClick={() => { setMonto(anticipoRestante.toFixed(2)); setEsAnticipo(true); setMontoEsAnticipo(true); }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline">
                    Anticipo restante (${fmt(anticipoRestante)})
                  </button>
                )}
                <button type="button"
                  onClick={() => { setMonto(saldo.toFixed(2)); setEsAnticipo(false); setMontoEsAnticipo(false); }}
                  className="text-xs text-emerald-600 hover:text-emerald-800 underline">
                  Saldo completo (${fmt(saldo)})
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago *</label>
              <select value={metodoPagoId} onChange={e => setMetodoPagoId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-400 text-sm">
                {metodos.map(m => (
                  <option key={m.idmetodo_pago} value={m.idmetodo_pago}>{m.tipo_pago}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Observación (opcional)</label>
            <input type="text" value={observacion} onChange={e => setObservacion(e.target.value)}
              placeholder="Ej: Transferencia ref. 12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Lado izquierdo: checkbox o mensaje de anticipo */}
            {!anticipoCubierto ? (
              <label className={`flex items-center gap-2 ${montoEsAnticipo ? "cursor-default" : "cursor-not-allowed opacity-40"}`}>
                <input type="checkbox" checked={esAnticipo} readOnly disabled={!montoEsAnticipo}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className={`text-sm ${montoEsAnticipo ? "text-blue-700 font-medium" : "text-gray-400"}`}>
                  {montoEsAnticipo ? "✓ Anticipo" : "Anticipo"}
                </span>
              </label>
            ) : (
              <span className="text-xs text-emerald-600 font-medium">
                ✓ Anticipo cubierto — este pago es abono normal
              </span>
            )}

            {/* Lado derecho: botones de acción */}
            <div className="flex items-center gap-2">
              {!anticipoCubierto && (
                <button
                  type="button"
                  onClick={handleAutorizarCredito}
                  disabled={autorizando}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {autorizando
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Autorizando...</>
                    : <>🤝 Autorizar anticipo por crédito</>
                  }
                </button>
              )}

              <button onClick={handleRegistrarPago} disabled={guardando || !monto}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {guardando
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Guardando...</>
                  : <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Registrar pago
                    </>
                }
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <svg className="w-6 h-6 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-emerald-800 font-semibold text-sm">Pedido pagado — saldo $0.00</p>
            {venta.total_real == null && (
              <p className="text-emerald-600 text-xs mt-0.5">
                Abre el Estado de Cuenta para verificar si hubo diferencia en la producción real.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function AnticipoLiquidacion() {
  const [ventas,          setVentas]          = useState<Venta[]>([]);
  const [metodos,         setMetodos]         = useState<MetodoPago[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [busqueda,        setBusqueda]        = useState("");
  const [pagina,          setPagina]          = useState(1);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [ventaEditando,   setVentaEditando]   = useState<Venta | null>(null);
  const [cargandoDet,     setCargandoDet]     = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const [vs, ms] = await Promise.all([getVentas(), getMetodosPago()]);
      setVentas(vs);
      setMetodos(ms);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleEditar = async (venta: Venta) => {
    setCargandoDet(true);
    try {
      const detalle = await getVentaByPedido(venta.no_pedido);
      setVentaEditando(detalle);
      setModalEditarOpen(true);
    } catch (e) { console.error(e); }
    finally { setCargandoDet(false); }
  };

  const handleActualizar = (ventaActualizada: Venta) => {
    setVentaEditando(ventaActualizada);
    setVentas(prev => prev.map(v =>
      v.idventas === ventaActualizada.idventas ? { ...v, ...ventaActualizada } : v
    ));
  };

  const handleCerrar = () => {
    setModalEditarOpen(false);
    setVentaEditando(null);
  };

  const normalizarTexto = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\-]/g, "").trim();

  const ventasFiltradas = ventas.filter(v => {
    if (!busqueda) return true;
    const t = normalizarTexto(busqueda);
    return (
      normalizarTexto(v.cliente ?? "").includes(t) ||
      normalizarTexto(v.empresa ?? "").includes(t) ||
      normalizarTexto(v.no_pedido ?? "").includes(t) ||
      (v.no_cotizacion?.toString() ?? "").includes(t)
    );
  });

  useEffect(() => { setPagina(1); }, [busqueda]);

  const ventasPaginadas = ventasFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const getEstadoBadge = (v: Venta) => {
    const abono    = Number(v.abono);
    const anticipo = Number(v.anticipo);
    const saldo    = Number(v.saldo);
    const estado   = calcularEstado(abono, anticipo, saldo);

    if (estado === ESTADO.PAGADO) return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
        ✓ Pagado
      </span>
    );
    if (estado === ESTADO.EN_PROCESO) return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          🔄 En proceso
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
          ${fmt(saldo)} pendiente
        </span>
      </div>
    );
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          ⏱️ Pendiente
        </span>
        {Number(v.abono) > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            💰 ${fmt(Number(v.abono))} abonados
          </span>
        )}
      </div>
    );
  };

  return (
    <Dashboard>
      <h1 className="text-2xl font-bold mb-2">Anticipo y Liquidación</h1>
      <p className="text-slate-400 mb-6">Gestiona los anticipos y liquidaciones de los pedidos activos.</p>

      <div className="mb-6 relative">
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, empresa, N° pedido o N° cotización..."
          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {busqueda && <p className="mt-2 text-sm text-gray-600">{ventasFiltradas.length} resultado(s)</p>}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["N° Pedido", "Fecha", "Impresión", "Empresa", "Total", "Pagado", "Saldo", "Estado", "Acciones"].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={9} className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
                <p className="mt-3 text-gray-500">Cargando...</p>
              </td></tr>
            ) : ventasPaginadas.length > 0 ? ventasPaginadas.map(v => (
              <tr key={v.idventas} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {v.no_pedido}
                  {v.no_cotizacion && <span className="ml-1 text-xs text-gray-400 font-normal">Cot.#{v.no_cotizacion}</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtFecha(v.fecha_pedido)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.impresion || "—"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.empresa || "—"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">${fmt(v.total)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">${fmt(v.abono)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                  <span className={Number(v.saldo) > 0.01 ? "text-red-600" : "text-emerald-600"}>
                    ${Number(v.saldo) > 0.01 ? fmt(v.saldo) : "0.00"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{getEstadoBadge(v)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleEditar(v)} disabled={cargandoDet}
                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50">
                    {cargandoDet ? "Cargando..." : "Ver/Editar"}
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                {busqueda ? `No se encontraron resultados para "${busqueda}"` : "No hay ventas registradas"}
              </td></tr>
            )}
          </tbody>
        </table>
        <Paginador
          total={ventasFiltradas.length}
          pagina={pagina}
          porPagina={POR_PAGINA}
          onChange={setPagina}
        />
      </div>

      <Modal isOpen={modalEditarOpen} onClose={handleCerrar} title="Anticipo y Liquidación">
        {ventaEditando && (
          <EditarAntLiqReal
            venta={ventaEditando}
            metodos={metodos}
            onClose={handleCerrar}
            onActualizar={handleActualizar}
          />
        )}
      </Modal>
    </Dashboard>
  );
}