import { useState } from "react";
import {
  quitarDelCarrito, vaciarCarrito, asignarTipoEnvioPedido,
} from "../services/enviosService";
import type { CarritoPedido, Paqueteria, TipoEnvioCarrito } from "../types/envios.types";
import { showAlert } from './CustomAlert';
import { showConfirm } from './CustomConfirm';

interface Props {
  carrito: CarritoPedido[];
  paqueterias: Paqueteria[];
  onCarritoChange: () => Promise<void>;
  onProcesar: () => void;
  onNotaRemision: () => void;
  onClose: () => void;
}

export default function VistaCarrito({
  carrito, paqueterias, onCarritoChange, onProcesar, onNotaRemision, onClose,
}: Props) {
  const [vaciando, setVaciando] = useState(false);
  const [asignando, setAsignando] = useState<number | null>(null);

  // Estado local tipo_envio por pedido
  // IMPORTANTE: siempre inicia virgen, sin seleccionar Local/Paquetería/Recolección.
  const [tipoPedido, setTipoPedido] = useState<Map<number, TipoEnvioCarrito | null>>(() => {
    const m = new Map<number, TipoEnvioCarrito | null>();
    carrito.forEach(p => m.set(p.idsolicitud, null));
    return m;
  });

  const [paqSeleccionada, setPaqSeleccionada] = useState<Map<number, number>>(() => {
    const m = new Map<number, number>();
    carrito.forEach(p => {
      const primera = p.bultos.find(b => b.paqueteria_idpaqueteria != null)?.paqueteria_idpaqueteria;
      if (primera) m.set(p.idsolicitud, primera);
    });
    return m;
  });

  const totalBultos = carrito.reduce((sum, p) => sum + p.bultos.length, 0);
  const totalPedidos = carrito.length;

  // Validación: todos los pedidos deben tener tipo válido para mostrar "Procesar"
  const todoValido = carrito.every(p => {
    const tipo = tipoPedido.get(p.idsolicitud) ?? null;
    if (!tipo) return false;
    if (tipo === "paqueteria") return (paqSeleccionada.get(p.idsolicitud) ?? 0) > 0;
    return true;
  });

  const handleQuitar = async (idbulto: number) => {
    try {
      await quitarDelCarrito(idbulto);
      await onCarritoChange();
    } catch {
      showAlert("Error al quitar bulto");
    }
  };

  const handleVaciar = async () => {
    if (!await showConfirm("¿Vaciar todo el carrito?")) return;
    setVaciando(true);
    try {
      await vaciarCarrito();
      await onCarritoChange();
    } catch {
      showAlert("Error al vaciar carrito");
    } finally {
      setVaciando(false);
    }
  };

  const handleCambiarTipo = async (pedido: CarritoPedido, tipo: TipoEnvioCarrito) => {
    setTipoPedido(prev => new Map(prev).set(pedido.idsolicitud, tipo));

    // Si elige paquetería, NO pegamos al backend todavía.
    // Primero debe seleccionar cuál paquetería para evitar 400 por paqueteria_idpaqueteria null.
    if (tipo === "paqueteria") {
      setPaqSeleccionada(prev => {
        const next = new Map(prev);
        next.delete(pedido.idsolicitud);
        return next;
      });
      return;
    }

    setAsignando(pedido.idsolicitud);
    try {
      await asignarTipoEnvioPedido(pedido.idsolicitud, tipo);
      await onCarritoChange();
    } catch (error: any) {
      showAlert(error.response?.data?.error || "Error al actualizar tipo de envío");
    } finally {
      setAsignando(null);
    }
  };

  const handleCambiarPaqueteria = async (pedido: CarritoPedido, idpaqueteria: number) => {
    if (!idpaqueteria) return;

    setPaqSeleccionada(prev => new Map(prev).set(pedido.idsolicitud, idpaqueteria));
    setAsignando(pedido.idsolicitud);
    try {
      await asignarTipoEnvioPedido(pedido.idsolicitud, "paqueteria", idpaqueteria);
      await onCarritoChange();
    } catch (error: any) {
      showAlert(error.response?.data?.error || "Error al asignar paquetería");
    } finally {
      setAsignando(null);
    }
  };

  if (carrito.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-sm">El carrito está vacío</p>
        <p className="text-xs mt-1">Agrega bultos desde la tab de Envíos</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Ir a Envíos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">

      {/* Resumen */}
      <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3">
        <span className="text-sm text-blue-700 font-medium">
          {totalPedidos} pedido(s) — {totalBultos} bulto(s) en total
        </span>
        <button onClick={handleVaciar} disabled={vaciando}
          className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50">
          Vaciar todo
        </button>
      </div>

      {/* Pedidos */}
      {carrito.map(pedido => {
        const tipo = tipoPedido.get(pedido.idsolicitud) ?? null;
        const paqActual = paqSeleccionada.get(pedido.idsolicitud) ?? 0;
        const cargando = asignando === pedido.idsolicitud;
        const paqNombre = paqueterias.find(p => p.idpaqueteria === paqActual)?.nombre;

        return (
          <div key={pedido.idsolicitud} className="bg-white border border-gray-200 rounded-lg overflow-hidden">

            {/* Header pedido */}
            <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="text-blue-600 font-bold text-sm">{pedido.no_pedido}</span>
                <span className="ml-2 text-gray-600 text-sm">{pedido.cliente}</span>
              </div>
              <span className="text-xs text-gray-500 shrink-0">{pedido.bultos.length} bulto(s)</span>
            </div>

            {/* Selector tipo envío */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-2">Tipo de envío para este pedido:</p>
              <div className="flex gap-2">
                {([
                  { value: "local", label: "🚚 Local", activeClass: "border-blue-600 bg-blue-50 text-blue-700" },
                  { value: "paqueteria", label: "📦 Paquetería", activeClass: "border-blue-600 bg-blue-50 text-blue-700" },
                  { value: "recoleccion", label: "🏭 Recolección", activeClass: "border-purple-600 bg-purple-50 text-purple-700" },
                ] as { value: TipoEnvioCarrito; label: string; activeClass: string }[]).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={cargando}
                    onClick={() => handleCambiarTipo(pedido, opt.value)}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors disabled:opacity-50 ${tipo === opt.value ? opt.activeClass : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Selector paquetería */}
              {tipo === "paqueteria" && (
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={paqActual}
                    disabled={cargando}
                    onChange={e => handleCambiarPaqueteria(pedido, Number(e.target.value))}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value={0}>Seleccionar paquetería...</option>
                    {paqueterias.filter(p => p.activo).map(p => (
                      <option key={p.idpaqueteria} value={p.idpaqueteria}>{p.nombre}</option>
                    ))}
                  </select>
                  {cargando && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />}
                </div>
              )}

              {/* Mensajes de confirmación */}
              {!cargando && !tipo && (
                <p className="mt-1.5 text-xs text-gray-400">Selecciona qué se hará con este pedido</p>
              )}
              {!cargando && tipo === "local" && (
                <p className="mt-1.5 text-xs text-gray-400">Los bultos de este pedido irán en envío local</p>
              )}
              {!cargando && tipo === "paqueteria" && paqNombre && (
                <p className="mt-1.5 text-xs text-indigo-600 font-medium">✓ Los bultos irán por {paqNombre}</p>
              )}
              {!cargando && tipo === "paqueteria" && !paqActual && (
                <p className="mt-1.5 text-xs text-amber-600">⚠ Selecciona una paquetería</p>
              )}
              {!cargando && tipo === "recoleccion" && (
                <p className="mt-1.5 text-xs text-purple-600 font-medium">
                  🏭 El cliente pasará a recoger en planta
                </p>
              )}
            </div>

            {/* Lista bultos */}
            <div className="divide-y divide-gray-100">
              {pedido.bultos.map((bulto, idx) => (
                <div key={bulto.idcarrito} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-medium">#{idx + 1}</span>
                    <div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-gray-700 font-medium">
                            {bulto.nombre_producto}{" "}
                            {bulto.medida && `(${bulto.medida})`}
                          </p>

                          {bulto.descripcion && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                              {bulto.descripcion}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-400">
                          {bulto.cantidad_unidades != null
                            ? `${bulto.cantidad_unidades.toLocaleString("es-MX")} pzas`
                            : bulto.peso_producto != null
                              ? `${bulto.peso_producto} kg`
                              : "-"
                          }

                          {bulto.alto != null &&
                            ` · ${bulto.alto}×${bulto.largo}×${bulto.ancho} cm`}
                        </p>
                      </div>
                      <p className="text-gray-400">
                        {bulto.cantidad_unidades != null
                          ? `${bulto.cantidad_unidades.toLocaleString("es-MX")} pzas`
                          : bulto.peso_producto != null ? `${bulto.peso_producto} kg` : "-"
                        }
                        {bulto.alto != null && ` · ${bulto.alto}×${bulto.largo}×${bulto.ancho} cm`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleQuitar(bulto.idbulto)}
                    className="text-red-400 hover:text-red-600 ml-2 text-base leading-none shrink-0">✕</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Botones de acción */}
      <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">

        {/* Nota de Remisión — visible cuando hay 2+ pedidos en el carrito */}
        {totalPedidos >= 2 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <p className="text-xs text-emerald-700 font-medium mb-2">
              📋 Hay {totalPedidos} pedidos en el carrito — puedes crear una Nota de Remisión conjunta
            </p>
            <button
              onClick={onNotaRemision}
              className="w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 text-sm transition-colors">
              Crear Nota de Remisión →
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onProcesar}
            disabled={!todoValido}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm disabled:opacity-50 transition-colors">
            Procesar Envío →
          </button>
        </div>
      </div>
    </div>
  );
}
