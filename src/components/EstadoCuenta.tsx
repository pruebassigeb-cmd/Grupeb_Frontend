import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import Modal from "./Modal";
import {
  getListaEstadoCuenta,
  getEstadoCuenta,
} from "../services/estadoCuentaService";
import type { ResumenEstadoCuenta, EstadoCuenta } from "../services/estadoCuentaService";

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
};

function DetalleEstadoCuenta({
  noPedido,
  onClose,
}: {
  noPedido: string;
  onClose: () => void;
}) {
  const [datos, setDatos]       = useState<EstadoCuenta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await getEstadoCuenta(noPedido);
      setDatos(data);
    } catch (e: any) {
      setError(e.response?.data?.detalle || e.response?.data?.error || "Error al cargar estado de cuenta");
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="text-center py-12 space-y-3">
      <div className="text-4xl">⚠️</div>
      <p className="text-red-600 font-semibold">{error}</p>
      <button onClick={cargar} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
        Reintentar
      </button>
    </div>
  );

  if (!datos) return null;

  const diferenciaPositiva = datos.diferencia_total >= 0;

  return (
    <div className="space-y-5 min-w-[560px]">

      {/* Info cliente */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-bold text-gray-900 text-lg">{datos.cliente}</p>
        <p className="text-sm text-gray-600">{datos.empresa}</p>
        <div className="flex gap-4 mt-1 text-xs text-gray-400">
          <span>Pedido #{datos.no_pedido}</span>
          {datos.no_cotizacion && <span>Cot. #{datos.no_cotizacion}</span>}
          <span>{fmtFecha(datos.fecha)}</span>
        </div>
      </div>

      {/* Productos */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Productos</p>
        {datos.productos.map(prod => {
          const diffPzas   = prod.diferencia_piezas;
          const diffPrecio = prod.diferencia_precio;

          // ── Unidad según modo del pedido ──────────────────────
          const esKilo = prod.modo_cantidad === "kilo";
          const unidad = esKilo ? "kg" : "pzas";

          return (
            <div key={prod.idsolicitud_producto} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{prod.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {prod.no_produccion} · {prod.tintas} tinta(s) · {prod.caras} cara(s)
                  {esKilo && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">
                      Por kg
                    </span>
                  )}
                </p>
              </div>

              {/* Cards de cantidad */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    Cant. ordenada ({unidad})
                  </p>
                  <p className="text-sm font-bold text-gray-700">
                    {Number(prod.cantidad_original).toLocaleString("es-MX")}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
                  <p className="text-[10px] text-blue-500 uppercase tracking-wide mb-0.5">
                    Cant. real ({unidad})
                  </p>
                  <p className="text-sm font-bold text-blue-700">
                    {Number(prod.cantidad_real).toLocaleString("es-MX")}
                  </p>
                </div>
                <div className={`rounded-lg p-2.5 text-center border ${
                  diffPzas === 0 ? "bg-gray-50 border-gray-100" : diffPzas > 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                }`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    Dif. ({unidad})
                  </p>
                  <p className={`text-sm font-bold ${diffPzas === 0 ? "text-gray-500" : diffPzas > 0 ? "text-green-700" : "text-red-700"}`}>
                    {diffPzas > 0 ? "+" : ""}{Number(diffPzas).toLocaleString("es-MX")}
                  </p>
                </div>
              </div>

              {/* Cards de precio */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Precio original</p>
                  <p className="text-sm font-bold text-gray-700">${fmt(prod.precio_total_original)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
                  <p className="text-[10px] text-blue-500 uppercase tracking-wide mb-0.5">Precio real</p>
                  <p className="text-sm font-bold text-blue-700">${fmt(prod.precio_total_real)}</p>
                </div>
                <div className={`rounded-lg p-2.5 text-center border ${
                  diffPrecio === 0 ? "bg-gray-50 border-gray-100" : diffPrecio > 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                }`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Dif. precio</p>
                  <p className={`text-sm font-bold ${diffPrecio === 0 ? "text-gray-500" : diffPrecio > 0 ? "text-green-700" : "text-red-700"}`}>
                    {diffPrecio > 0 ? "+" : ""}${fmt(diffPrecio)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <span className="text-xs text-gray-400">
                  Precio unitario real ({unidad}):{" "}
                  <span className="font-semibold text-gray-600">${prod.precio_unitario_real.toFixed(6)}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen financiero */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-800 px-4 py-2">
          <p className="text-xs font-bold text-white uppercase tracking-wide">Resumen financiero</p>
        </div>
        <div className="p-4 space-y-2">
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200">
            <div>
              <p className="text-xs text-gray-400 mb-1 font-medium">Original</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-700">${fmt(datos.subtotal_original)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">IVA 16%</span><span className="text-gray-700">${fmt(datos.iva_original)}</span></div>
                <div className="flex justify-between font-semibold"><span className="text-gray-600">Total</span><span className="text-gray-800">${fmt(datos.total_original)}</span></div>
              </div>
            </div>
            <div>
              <p className="text-xs text-blue-500 mb-1 font-medium">Real (recalculado)</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-blue-700">${fmt(datos.subtotal_real)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">IVA 16%</span><span className="text-blue-700">${fmt(datos.iva_real)}</span></div>
                <div className="flex justify-between font-semibold"><span className="text-gray-600">Total</span><span className="text-blue-800">${fmt(datos.total_real)}</span></div>
              </div>
            </div>
          </div>
          <div className={`flex justify-between items-center px-3 py-2 rounded-lg ${
            datos.diferencia_total === 0 ? "bg-gray-100" : diferenciaPositiva ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}>
            <span className="text-xs font-semibold text-gray-600">Diferencia total</span>
            <span className={`text-sm font-bold ${datos.diferencia_total === 0 ? "text-gray-500" : diferenciaPositiva ? "text-green-700" : "text-red-700"}`}>
              {diferenciaPositiva ? "+" : ""}${fmt(datos.diferencia_total)}
            </span>
          </div>
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Anticipo requerido</span><span className="text-gray-700">${fmt(datos.anticipo)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Total abonado</span><span className="text-green-700 font-semibold">${fmt(datos.abono)}</span></div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
              <span className="text-gray-700">Saldo pendiente</span>
              <span className={datos.saldo <= 0 ? "text-green-600" : "text-red-600"}>
                {datos.saldo <= 0 ? "✓ Liquidado" : `$${fmt(datos.saldo)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function EstadoCuenta() {
  const [pedidos,      setPedidos]      = useState<ResumenEstadoCuenta[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [busqueda,     setBusqueda]     = useState("");
  const [modalOpen,    setModalOpen]    = useState(false);
  const [pedidoActivo, setPedidoActivo] = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try { setPedidos(await getListaEstadoCuenta()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const normalizarTexto = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const filtrados = pedidos.filter(p => {
    if (!busqueda) return true;
    const t = normalizarTexto(busqueda);
    return (
      normalizarTexto(p.cliente ?? "").includes(t) ||
      normalizarTexto(p.empresa ?? "").includes(t) ||
      normalizarTexto(p.no_pedido ?? "").includes(t)
    );
  });

  const handleVer = (noPedido: string) => {
    setPedidoActivo(noPedido);
    setModalOpen(true);
  };

  const handleCerrar = () => {
    setModalOpen(false);
    setPedidoActivo(null);
    cargar();
  };

  return (
    <Dashboard>
      <h1 className="text-2xl font-bold mb-2">Estado de Cuenta</h1>
      <p className="text-slate-400 mb-6">
        Consulta el precio final real por pedido basado en la producción terminada.
      </p>
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
              {["N° Pedido", "Fecha", "Cliente", "Empresa", "Total", "Abonado", "Saldo", "Producción", "Acciones"].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
                  <p className="mt-3 text-gray-500">Cargando pedidos...</p>
                </td>
              </tr>
            ) : filtrados.length > 0 ? filtrados.map(p => (
              <tr key={p.no_pedido} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.no_pedido}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{fmtFecha(p.fecha)}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{p.cliente}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{p.empresa}</td>
                <td className="px-6 py-4 text-sm text-gray-700">${fmt(Number(p.total))}</td>
                <td className="px-6 py-4 text-sm text-green-700 font-medium">${fmt(Number(p.abono))}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={Number(p.saldo) <= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {Number(p.saldo) <= 0 ? "Liquidado" : `$${fmt(Number(p.saldo))}`}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {p.produccion_completa ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Completa</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⏳ {p.ordenes_completas}/{p.total_ordenes} listas
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {p.produccion_completa ? (
                    <button onClick={() => handleVer(p.no_pedido)} className="text-blue-600 hover:text-blue-900 font-semibold">
                      Ver estado de cuenta
                    </button>
                  ) : (
                    <span className="text-gray-300 cursor-not-allowed text-xs">Producción incompleta</span>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  {busqueda ? `No se encontraron pedidos para "${busqueda}"` : "No hay pedidos con órdenes de producción"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modalOpen} onClose={handleCerrar} title={`Estado de Cuenta — Pedido ${pedidoActivo}`}>
        {pedidoActivo && (
          <DetalleEstadoCuenta noPedido={pedidoActivo} onClose={handleCerrar} />
        )}
      </Modal>
    </Dashboard>
  );
}