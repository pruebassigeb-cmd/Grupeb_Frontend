// src/pages/EditarPedido.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Dashboard from "../layouts/Sidebar";
import { getPedidos, actualizarPedido } from "../services/pedidosService";
import type { Pedido } from "../types/cotizaciones.types";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface DetalleEdit {
  iddetalle:     number | null;
  cantidad:      string;
  precio_total:  string;
  kilogramos:    string;
  modo_cantidad: "unidad" | "kilo";
}

interface ProductoEdit {
  idsolicitud_producto:    number;
  nombre:                  string;
  material:                string;
  calibre:                 string;
  medidasFormateadas:      string;
  tintas:                  number;
  caras:                   number;
  por_kilo:                string;
  pantones:                string;
  pigmentos:               string;
  observacion:             string;
  herramental_descripcion: string;
  herramental_precio:      string;
  detalles:                DetalleEdit[];
  _eliminado:              boolean;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
const esDecimal = (v: string) => /^\d*\.?\d{0,4}$/.test(v);
const esEntero  = (v: string) => /^\d*$/.test(v);
const fmt       = (n: number, d = 2) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const parseSafe = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

// ─── Página ───────────────────────────────────────────────────────────────────
export default function EditarPedido() {
  const { noPedido } = useParams<{ noPedido: string }>();
  const navigate     = useNavigate();

  const [cargando,     setCargando]     = useState(true);
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [exito,        setExito]        = useState(false);
  const [pedidoOrig,   setPedidoOrig]   = useState<Pedido | null>(null);
  const [productos,    setProductos]    = useState<ProductoEdit[]>([]);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!noPedido) return;
    (async () => {
      try {
        const todos = await getPedidos() as Pedido[];
        const ped   = todos.find(p => p.no_pedido === noPedido);
        if (!ped) { setError("Pedido no encontrado"); return; }

        setPedidoOrig(ped);
        setProductos((ped.productos as any[]).map(p => ({
          idsolicitud_producto:    p.idsolicitud_producto ?? p.idcotizacion_producto,
          nombre:                  p.nombre              || "",
          material:                p.material            || "",
          calibre:                 p.calibre             || "",
          medidasFormateadas:      p.medidasFormateadas  || "",
          tintas:                  p.tintas              ?? 1,
          caras:                   p.caras               ?? 1,
          por_kilo:                p.por_kilo            || "",
          pantones:  Array.isArray(p.pantones) ? p.pantones.join(", ") : (p.pantones || ""),
          pigmentos:               p.pigmentos           || "",
          observacion:             p.observacion         || "",
          herramental_descripcion: p.herramental_descripcion || "",
          herramental_precio:      p.herramental_precio != null ? String(p.herramental_precio) : "",
          _eliminado: false,
          detalles: (p.detalles || []).map((d: any) => ({
            iddetalle:    d.iddetalle    ?? null,
            cantidad:     String(d.cantidad    ?? ""),
            precio_total: String(d.precio_total ?? ""),
            kilogramos:   d.kilogramos != null ? String(d.kilogramos) : "",
            modo_cantidad: d.modo_cantidad || "unidad",
          })),
        })));
      } catch (e: any) {
        setError(e.message || "Error al cargar pedido");
      } finally {
        setCargando(false);
      }
    })();
  }, [noPedido]);

  // ── Helpers de state ───────────────────────────────────────────────────────
  const setProductoField = <K extends keyof ProductoEdit>(pi: number, k: K, v: ProductoEdit[K]) =>
    setProductos(prev => prev.map((p, i) => i === pi ? { ...p, [k]: v } : p));

  const setDetalleField = (pi: number, di: number, k: keyof DetalleEdit, v: string) =>
    setProductos(prev => prev.map((p, i) => {
      if (i !== pi) return p;
      return { ...p, detalles: p.detalles.map((d, j) => j === di ? { ...d, [k]: v } : d) };
    }));

  const agregarDetalle = (pi: number) =>
    setProductos(prev => prev.map((p, i) => i !== pi ? p : {
      ...p,
      detalles: [
        ...p.detalles,
        { iddetalle: null, cantidad: "", precio_total: "", kilogramos: "", modo_cantidad: "unidad" as const },
      ],
    }));

  const eliminarDetalle = (pi: number, di: number) =>
    setProductos(prev => prev.map((p, i) => i !== pi ? p : {
      ...p, detalles: p.detalles.filter((_, j) => j !== di),
    }));

  // ── Cálculos ───────────────────────────────────────────────────────────────
  const calcularTotalProducto = (p: ProductoEdit) =>
    p.detalles.reduce((s, d) => s + parseSafe(d.precio_total), 0) + parseSafe(p.herramental_precio);

  const calcularTotal = () =>
    productos.filter(p => !p._eliminado).reduce((s, p) => s + calcularTotalProducto(p), 0);

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!pedidoOrig) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      await actualizarPedido(pedidoOrig.no_pedido, {
        productos: productos.map(p => ({
          idsolicitud_producto:    p.idsolicitud_producto,
          eliminado:               p._eliminado,
          tintas:                  p.tintas,
          caras:                   p.caras,
          pantones:                p.pantones    || null,
          pigmentos:               p.pigmentos   || null,
          observacion:             p.observacion || null,
          herramental_descripcion: p.herramental_descripcion || null,
          herramental_precio:      p.herramental_precio !== "" ? parseSafe(p.herramental_precio) : null,
          detalles: p.detalles.map(d => ({
            iddetalle:    d.iddetalle,
            cantidad:     parseSafe(d.cantidad),
            precio_total: parseSafe(d.precio_total),
            kilogramos:   d.kilogramos !== "" ? parseSafe(d.kilogramos) : null,
            modo_cantidad: d.modo_cantidad,
          })),
        })),
      });
      setExito(true);
      setTimeout(() => navigate("/pedido"), 1500);
    } catch (e: any) {
      setErrorGuardar(e.response?.data?.error || e.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  // ── Estados especiales ─────────────────────────────────────────────────────
  if (cargando) return (
    <Dashboard>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Cargando pedido...</p>
      </div>
    </Dashboard>
  );

  if (error) return (
    <Dashboard>
      <div className="max-w-md mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <p className="text-red-700 font-semibold mb-4">{error}</p>
        <button onClick={() => navigate("/pedido")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          ← Volver a Pedidos
        </button>
      </div>
    </Dashboard>
  );

  if (exito) return (
    <Dashboard>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-green-700 font-semibold text-lg">Pedido actualizado correctamente</p>
        <p className="text-gray-400 text-sm">Redirigiendo...</p>
      </div>
    </Dashboard>
  );

  const productosActivos = productos.filter(p => !p._eliminado);
  const totalGeneral     = calcularTotal();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dashboard>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/pedido")}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Pedido</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="font-semibold text-blue-600">{noPedido}</span>
              {pedidoOrig?.no_cotizacion && (
                <span className="ml-2 text-purple-500">• De {pedidoOrig.no_cotizacion}</span>
              )}
              {pedidoOrig && (
                <span className="ml-2 text-gray-400">
                  — {pedidoOrig.impresion || pedidoOrig.cliente || pedidoOrig.empresa || ""}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Total flotante */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-xs text-blue-500 font-medium">Total estimado</span>
          <span className="text-lg font-bold text-blue-700">${fmt(totalGeneral)}</span>
        </div>
      </div>

      {/* ── Error guardar ── */}
      {errorGuardar && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-red-700 text-sm">{errorGuardar}</p>
        </div>
      )}

      {/* ── Productos ── */}
      <div className="space-y-5">

        {productos.map((prod, pi) => {

          // ── Producto marcado para eliminar ──
          if (prod._eliminado) return (
            <div key={pi} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl opacity-70">
              <div>
                <p className="text-sm font-semibold text-red-700 line-through">{prod.nombre}</p>
                <p className="text-xs text-red-400 mt-0.5">Marcado para eliminar al guardar</p>
              </div>
              <button onClick={() => setProductoField(pi, "_eliminado", false)}
                className="text-xs px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-100 transition">
                Restaurar
              </button>
            </div>
          );

          const subtotal = calcularTotalProducto(prod);

          return (
            <div key={pi} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Header del producto */}
              <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-blue-50/40 border-b border-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      {pi + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{prod.nombre}</p>
                      <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-gray-400">
                        {prod.material          && <span>{prod.material}</span>}
                        {prod.calibre           && <span>Cal. {prod.calibre}</span>}
                        {prod.medidasFormateadas && <span>{prod.medidasFormateadas}</span>}
                        {prod.por_kilo          && <span>{prod.por_kilo} pz/kg</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-700">${fmt(subtotal)}</span>
                    <button onClick={() => setProductoField(pi, "_eliminado", true)}
                      title="Marcar para eliminar"
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">

                {/* ── Tintas / Caras ── */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tintas</label>
                    <select value={prod.tintas}
                      onChange={e => setProductoField(pi, "tintas", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
                      {[1,2,3,4,5,6,7,8].map(n => (
                        <option key={n} value={n}>{n} tinta{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Caras</label>
                    <select value={prod.caras}
                      onChange={e => setProductoField(pi, "caras", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
                      {[1, 2].map(n => (
                        <option key={n} value={n}>{n} cara{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── Pantones / Pigmentos ── */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Pantones <span className="font-normal text-gray-300">(opcional)</span>
                    </label>
                    <input type="text" value={prod.pantones}
                      onChange={e => setProductoField(pi, "pantones", e.target.value)}
                      placeholder="Pantone 185 C, 286 C..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Pigmentos <span className="font-normal text-gray-300">(opcional)</span>
                    </label>
                    <input type="text" value={prod.pigmentos}
                      onChange={e => setProductoField(pi, "pigmentos", e.target.value)}
                      placeholder="Rojo intenso..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400" />
                  </div>
                </div>

                {/* ── Observación ── */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Observaciones <span className="font-normal text-gray-300">(opcional)</span>
                  </label>
                  <textarea value={prod.observacion} rows={2}
                    onChange={e => setProductoField(pi, "observacion", e.target.value)}
                    placeholder="Ej: Impresión a 2 colores, acabado mate..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                {/* ── Herramental ── */}
                <div className="border border-orange-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50">
                    <span>🔧</span>
                    <span className="text-xs font-semibold text-orange-700">Herramental</span>
                    <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                    {parseSafe(prod.herramental_precio) > 0 && (
                      <span className="ml-auto text-xs font-bold text-orange-700">
                        +${fmt(parseSafe(prod.herramental_precio))}
                      </span>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción</label>
                      <input type="text" value={prod.herramental_descripcion}
                        onChange={e => setProductoField(pi, "herramental_descripcion", e.target.value)}
                        placeholder="Suaje nuevo..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Precio</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input type="text" inputMode="decimal" value={prod.herramental_precio}
                          onChange={e => {
                            if (esDecimal(e.target.value))
                              setProductoField(pi, "herramental_precio", e.target.value);
                          }}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Detalles (cantidades / precios) ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Cantidades y precios
                    </label>
                    {prod.detalles.length < 3 && (
                      <button onClick={() => agregarDetalle(pi)}
                        className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium">
                        + Agregar cantidad
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {prod.detalles.map((det, di) => (
                      <div key={di} className="flex items-end gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">

                        {/* Cantidad */}
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">
                            {det.modo_cantidad === "kilo" ? "Kilos ingresados" : "Cantidad (pzas)"}
                          </label>
                          <input type="text" inputMode="numeric" value={det.cantidad}
                            onChange={e => { if (esEntero(e.target.value)) setDetalleField(pi, di, "cantidad", e.target.value); }}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400" />
                        </div>

                        {/* Kg (solo modo kilo) */}
                        {det.modo_cantidad === "kilo" && (
                          <div className="flex-1">
                            <label className="block text-xs text-gray-400 mb-1">Kg reales</label>
                            <input type="text" inputMode="decimal" value={det.kilogramos}
                              onChange={e => { if (esDecimal(e.target.value)) setDetalleField(pi, di, "kilogramos", e.target.value); }}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-400" />
                          </div>
                        )}

                        {/* Precio total */}
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">Precio total</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                            <input type="text" inputMode="decimal" value={det.precio_total}
                              onChange={e => { if (esDecimal(e.target.value)) setDetalleField(pi, di, "precio_total", e.target.value); }}
                              placeholder="0.00"
                              className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-green-400" />
                          </div>
                        </div>

                        {/* Modo */}
                        <div className="flex-shrink-0">
                          <label className="block text-xs text-gray-400 mb-1">Modo</label>
                          <select value={det.modo_cantidad}
                            onChange={e => setDetalleField(pi, di, "modo_cantidad", e.target.value)}
                            className="px-2 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white focus:ring-2 focus:ring-blue-400">
                            <option value="unidad">pz</option>
                            <option value="kilo">kg</option>
                          </select>
                        </div>

                        {/* Borrar fila */}
                        {prod.detalles.length > 1 && (
                          <button onClick={() => eliminarDetalle(pi, di)}
                            className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Mini resumen */}
                  <div className="mt-2 flex items-center justify-between px-3 py-2 bg-blue-50/60 rounded-lg">
                    <span className="text-xs text-gray-500">
                      {prod.detalles.length} detalle{prod.detalles.length !== 1 ? "s" : ""}
                      {parseSafe(prod.herramental_precio) > 0 && (
                        <span className="ml-1 text-orange-500">+ herramental</span>
                      )}
                    </span>
                    <span className="text-sm font-bold text-blue-700">${fmt(subtotal)}</span>
                  </div>
                </div>

              </div>
            </div>
          );
        })}

        {/* Aviso eliminados */}
        {productos.some(p => p._eliminado) && (
          <p className="text-xs text-center text-gray-400 py-1">
            {productos.filter(p => p._eliminado).length} producto(s) marcado(s) para eliminar — se procesarán al guardar
          </p>
        )}

        {/* ── Resumen total ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Resumen</h3>
            <span className="text-xs text-gray-400">{productosActivos.length} producto(s) activo(s)</span>
          </div>
          <div className="space-y-1.5 mb-4">
            {productosActivos.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 truncate flex-1 mr-2">
                  <span className="text-gray-300 mr-1">{i + 1}.</span>{p.nombre}
                </span>
                <span className="font-medium text-gray-800 flex-shrink-0">${fmt(calcularTotalProducto(p))}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total sin IVA</p>
              <p className="text-2xl font-bold text-gray-900">${fmt(totalGeneral)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                + IVA 16%: ${fmt(totalGeneral * 0.16)} →{" "}
                <span className="font-semibold text-gray-600">${fmt(totalGeneral * 1.16)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Botones ── */}
        <div className="flex items-center justify-between gap-3 pb-4">
          <button onClick={() => navigate("/pedido")}
            className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || productosActivos.length === 0}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold text-sm transition
              ${guardando || productosActivos.length === 0
                ? "bg-gray-300 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"}`}>
            {guardando
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
              : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar cambios
                </>
            }
          </button>
        </div>

      </div>
    </Dashboard>
  );
}