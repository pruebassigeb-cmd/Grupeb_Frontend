// src/pages/ReportesCorreo.tsx
import { useEffect, useMemo, useState } from "react";
import Dashboard from "../layouts/Sidebar";
import {
  getDestinatariosReporte,
  actualizarDestinatarioReporte,
  type DestinatarioReporte,
  type TipoReporte,
} from "../services/reportesDestinatariosService";

const REPORTES: { key: TipoReporte; label: string; icon: string }[] = [
  { key: "produccion", label: "Producción", icon: "📊" },
  { key: "cotizaciones", label: "Cotizaciones", icon: "📋" },
  { key: "pedidos", label: "Pedidos", icon: "🛒" },
  { key: "diseno", label: "Diseño", icon: "🎨" },
  { key: "anticipos", label: "Anticipos", icon: "💰" },
];

export default function ReportesCorreo() {
  const [usuarios, setUsuarios] = useState<DestinatarioReporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const data = await getDestinatariosReporte();
      setUsuarios(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Error al cargar destinatarios");
    } finally {
      setCargando(false);
    }
  }

  async function toggleReporte(usuario: DestinatarioReporte, reporte: TipoReporte) {
    const nuevosReportes = { ...usuario.reportes, [reporte]: !usuario.reportes[reporte] };

    // Optimista: refleja el cambio de inmediato, revierte si falla
    setUsuarios((prev) =>
      prev.map((u) => (u.idusuario === usuario.idusuario ? { ...u, reportes: nuevosReportes } : u))
    );
    setGuardandoId(usuario.idusuario);
    setError(null);

    try {
      await actualizarDestinatarioReporte(usuario.idusuario, nuevosReportes);
    } catch (e: any) {
      setUsuarios((prev) =>
        prev.map((u) => (u.idusuario === usuario.idusuario ? { ...u, reportes: usuario.reportes } : u))
      );
      setError(e?.response?.data?.error || "No se pudo guardar el cambio");
    } finally {
      setGuardandoId(null);
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return u.nombre.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q) || u.rol.toLowerCase().includes(q);
  });

  const totalesPorReporte = useMemo(() => {
    const totales: Record<TipoReporte, number> = {
      produccion: 0, cotizaciones: 0, pedidos: 0, diseno: 0, anticipos: 0,
    };
    for (const u of usuarios) {
      for (const r of REPORTES) {
        if (u.reportes[r.key]) totales[r.key]++;
      }
    }
    return totales;
  }, [usuarios]);

  return (
    <Dashboard>
      <div className="max-w-6xl mx-auto">
        {/* Encabezado */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            <span>Administración</span>
            <span>/</span>
            <span className="text-slate-500">Reportes de correo</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes semanales por correo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cada lunes a las 8:00am se envían automáticamente. Marca qué reportes recibe cada persona.
          </p>
        </div>

        {/* Tarjetas resumen — cuántos destinatarios tiene cada reporte activos */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {REPORTES.map((r) => (
            <div key={r.key} className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg leading-none">{r.icon}</span>
                <span className="text-2xl font-bold text-gray-900">{totalesPorReporte[r.key]}</span>
              </div>
              <p className="text-xs text-gray-500">{r.label}</p>
            </div>
          ))}
        </div>

        {/* Buscador */}
        <div className="flex items-center justify-between mb-3 gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre, correo o rol..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          {guardandoId !== null && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
              Guardando...
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            {error}
          </div>
        )}

        {cargando ? (
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-8 text-center">
            <p className="text-sm text-gray-500">Cargando destinatarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Correo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Rol</th>
                  {REPORTES.map((r) => (
                    <th key={r.key} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                      <span title={r.label}>{r.icon} {r.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr
                    key={u.idusuario}
                    className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors
                      ${guardandoId === u.idusuario ? "bg-slate-50" : ""}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">{u.nombre}</td>
                    <td className="px-4 py-2.5 text-gray-600">{u.correo}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                        {u.rol}
                      </span>
                    </td>
                    {REPORTES.map((r) => (
                      <td key={r.key} className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={u.reportes[r.key]}
                          disabled={guardandoId === u.idusuario}
                          onChange={() => toggleReporte(u, r.key)}
                          className="w-4 h-4 cursor-pointer accent-slate-700 disabled:opacity-50"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={3 + REPORTES.length} className="px-4 py-8 text-center text-gray-400">
                      Sin usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Dashboard>
  );
}