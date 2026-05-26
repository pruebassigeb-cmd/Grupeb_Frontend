import { useState, useEffect, useCallback } from "react";
import {
  getProveedores,
  eliminarProveedor,
  type Proveedor,
} from "../services/proveedoresservice";
import { showAlert } from "./CustomAlert";
import { showConfirm } from "./CustomConfirm";

interface Props {
  onNuevo: () => void;
  onEditar: (proveedor: Proveedor) => void;
  onVerProductos: (proveedor: Proveedor) => void;
}

export default function ListaProveedores({ onNuevo, onEditar, onVerProductos }: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading]         = useState(true);
  const [busqueda, setBusqueda]       = useState("");
  const [eliminando, setEliminando]   = useState<number | null>(null);

  const cargar = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      setProveedores(await getProveedores(q));
    } catch {
      showAlert("Error al cargar proveedores", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda || undefined), 400);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  const handleEliminar = async (p: Proveedor) => {
    const ok = await showConfirm(`¿Desactivar al proveedor "${p.nombre}"?\nSus insumos quedarán inactivos.`);
    if (!ok) return;
    setEliminando(p.idproveedor);
    try {
      await eliminarProveedor(p.idproveedor);
      setProveedores(prev => prev.filter(x => x.idproveedor !== p.idproveedor));
      showAlert(`Proveedor "${p.nombre}" desactivado`, "success");
    } catch {
      showAlert("Error al desactivar proveedor", "error");
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proveedores</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona proveedores y sus catálogos de insumos</p>
        </div>
        <button onClick={onNuevo}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo proveedor
        </button>
      </div>

      {/* ── Buscador ── */}
      <div className="relative max-w-sm">
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, contacto, correo..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* ── Contenido ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : proveedores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="font-medium">No hay proveedores registrados</p>
          <p className="text-sm mt-1">Agrega el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Contacto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Teléfono</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Correo</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Insumos</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {proveedores.map(p => (
                <tr key={p.idproveedor} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{p.nombre}</p>
                    {p.notas && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{p.notas}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.contacto || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{p.telefono || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{p.correo || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => onVerProductos(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold hover:bg-indigo-100 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      {p.total_productos ?? 0} insumo{p.total_productos !== 1 ? "s" : ""}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEditar(p)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleEliminar(p)} disabled={eliminando === p.idproveedor}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40" title="Desactivar">
                        {eliminando === p.idproveedor
                          ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}