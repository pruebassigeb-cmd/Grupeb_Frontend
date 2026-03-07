import Dashboard from "../layouts/Sidebar";
import Modal from "../components/Modal";
import { useState, useEffect } from "react";
import {
  getVentas,
  getVentaByPedido,
  registrarPago,
  eliminarPago,
  getMetodosPago,
} from "../services/ventasservice";
import type { Venta, VentaPago, MetodoPago } from "../types/ventas.types";

const ESTADO = { PENDIENTE: 1, EN_PROCESO: 2, PAGADO: 6 } as const;

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

// ── Modal de detalle / pagos ──────────────────────────────────
function EditarAntLiqReal({
  venta,
  metodos,
  onClose,
  onActualizar,
}: {
  venta:        Venta;
  metodos:      MetodoPago[];
  onClose:      () => void;
  onActualizar: (v: Venta) => void;
}) {
  const [monto,           setMonto]           = useState("");
  const [metodoPagoId,    setMetodoPagoId]    = useState<number>(metodos[0]?.idmetodo_pago ?? 1);
  const [esAnticipo,      setEsAnticipo]      = useState(false);
  const [montoEsAnticipo, setMontoEsAnticipo] = useState(false);
  const [observacion,     setObservacion]     = useState("");
  const [guardando,       setGuardando]       = useState(false);
  const [eliminando,      setEliminando]      = useState<number | null>(null);
  const [error,           setError]           = useState<string | null>(null);

  const anticipo    = Number(venta.anticipo);
  const saldo       = Number(venta.saldo);
  const totalPagado = Number(venta.abono);
  const total       = Number(venta.total);

  const anticipoRestante = Math.max(anticipo - totalPagado, 0);
  const anticipoCubierto = anticipoRestante <= 0.01;
  const pagado           = saldo <= 0.01;

  const recargar = async () => {
    const actualizada = await getVentaByPedido(venta.no_pedido);
    onActualizar(actualizada);
  };

  const handleRegistrarPago = async () => {
    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setError("Ingresa un monto válido mayor a 0");
      return;
    }
    if (montoNum > saldo + 0.01) {
      setError(`El monto excede el saldo pendiente ($${fmt(saldo)})`);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await registrarPago(venta.idventas, {
        metodoPagoId,
        monto:       montoNum,
        esAnticipo,
        observacion: observacion.trim() || undefined,
      });
      await recargar();
      setMonto("");
      setObservacion("");
      setEsAnticipo(false);
      setMontoEsAnticipo(false);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al registrar pago");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarPago = async (pago: VentaPago) => {
    if (!confirm(`¿Eliminar el pago de $${fmt(pago.monto)}?`)) return;
    setEliminando(pago.idventa_pago);
    try {
      await eliminarPago(pago.idventa_pago);
      await recargar();
    } catch (e: any) {
      alert(e.response?.data?.error || "Error al eliminar pago");
    } finally {
      setEliminando(null);
    }
  };

  const pctPagado = total > 0 ? Math.min((totalPagado / total) * 100, 100) : 0;

  return (
    <div className="space-y-6">

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
          { label: "Subtotal",       value: fmt(venta.subtotal),     color: "text-gray-700"               },
          { label: "IVA 16%",        value: fmt(venta.iva),          color: "text-gray-500"               },
          { label: "Total con IVA",  value: fmt(total),              color: "text-gray-900 font-bold"     },
          { label: "Anticipo (50%)", value: fmt(anticipo),           color: "text-blue-700 font-semibold" },
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
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              pctPagado >= 100 ? "bg-emerald-500" :
              pctPagado >= 50  ? "bg-blue-500"    : "bg-yellow-500"
            }`}
            style={{ width: `${pctPagado}%` }}
          />
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
      </div>

      {/* Historial de pagos */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Historial de pagos ({venta.pagos?.length ?? 0})
        </h4>
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
                    <p className="text-xs text-gray-400">
                      {pago.metodo_pago} · {fmtFecha(pago.fecha)}
                    </p>
                    {pago.observacion && (
                      <p className="text-xs text-gray-500 italic">{pago.observacion}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleEliminarPago(pago)}
                  disabled={eliminando === pago.idventa_pago}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Eliminar pago"
                >
                  {eliminando === pago.idventa_pago
                    ? <div className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            {/* Monto */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  readOnly={montoEsAnticipo}
                  onChange={e => {
                    setMonto(e.target.value);
                    setEsAnticipo(false);
                    setMontoEsAnticipo(false);
                  }}
                  placeholder="0.00"
                  className={`w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-400 text-sm transition-colors ${
                    montoEsAnticipo
                      ? "bg-blue-50 border-blue-300 cursor-not-allowed"
                      : "bg-white"
                  }`}
                />
              </div>
              {/* Accesos rápidos */}
              <div className="flex gap-2 mt-1 flex-wrap">
                {!anticipoCubierto && (
                  <button
                    type="button"
                    onClick={() => {
                      setMonto(anticipoRestante.toFixed(2));
                      setEsAnticipo(true);
                      setMontoEsAnticipo(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Anticipo restante (${fmt(anticipoRestante)})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMonto(saldo.toFixed(2));
                    setEsAnticipo(false);
                    setMontoEsAnticipo(false);
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-800 underline"
                >
                  Saldo completo (${fmt(saldo)})
                </button>
              </div>
            </div>

            {/* Método */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago *</label>
              <select
                value={metodoPagoId}
                onChange={e => setMetodoPagoId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-400 text-sm"
              >
                {metodos.map(m => (
                  <option key={m.idmetodo_pago} value={m.idmetodo_pago}>{m.tipo_pago}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Observación */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Observación (opcional)</label>
            <input
              type="text"
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              placeholder="Ej: Transferencia ref. 12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          {/* Indicador de anticipo — solo visible/activo cuando vino del botón */}
          <div className="flex items-center justify-between">
            {!anticipoCubierto ? (
              <label className={`flex items-center gap-2 ${montoEsAnticipo ? "cursor-default" : "cursor-not-allowed opacity-40"}`}>
                <input
                  type="checkbox"
                  checked={esAnticipo}
                  readOnly
                  disabled={!montoEsAnticipo}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm ${montoEsAnticipo ? "text-blue-700 font-medium" : "text-gray-400"}`}>
                  {montoEsAnticipo ? "✓ Anticipo" : "Anticipo"}
                </span>
              </label>
            ) : (
              <span className="text-xs text-emerald-600 font-medium">
                ✓ Anticipo cubierto — este pago es abono normal
              </span>
            )}

            <button
              onClick={handleRegistrarPago}
              disabled={guardando || !monto}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
      ) : (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <svg className="w-6 h-6 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-emerald-800 font-semibold text-sm">Pedido pagado — saldo $0.00</p>
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

// ── Página principal ──────────────────────────────────────────
export default function AnticipoLiquidacion() {
  const [ventas,          setVentas]          = useState<Venta[]>([]);
  const [metodos,         setMetodos]         = useState<MetodoPago[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [busqueda,        setBusqueda]        = useState("");
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
      v.no_pedido.toString().includes(t)           ||
      (v.no_cotizacion?.toString() ?? "").includes(t)
    );
  });

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
        {abono > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            💰 ${fmt(abono)} abonados
          </span>
        )}
      </div>
    );
  };

  return (
    <Dashboard userName="Administrador">
      <h1 className="text-2xl font-bold mb-2">Anticipo y Liquidación</h1>
      <p className="text-slate-400 mb-6">
        Gestiona los anticipos y liquidaciones de los pedidos activos.
      </p>

      <div className="mb-6 relative">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
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
              {["N° Pedido", "Fecha", "Cliente", "Empresa", "Total", "Pagado", "Saldo", "Estado", "Acciones"].map(h => (
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
            ) : ventasFiltradas.length > 0 ? ventasFiltradas.map(v => (
              <tr key={v.idventas} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{v.no_pedido}
                  {v.no_cotizacion && (
                    <span className="ml-1 text-xs text-gray-400 font-normal">Cot.#{v.no_cotizacion}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {fmtFecha(v.fecha_pedido)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {v.cliente || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {v.empresa || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                  ${fmt(v.total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">
                  ${fmt(v.abono)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                  <span className={Number(v.saldo) > 0.01 ? "text-red-600" : "text-emerald-600"}>
                    ${Number(v.saldo) > 0.01 ? fmt(v.saldo) : "0.00"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getEstadoBadge(v)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditar(v)}
                    disabled={cargandoDet}
                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                  >
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