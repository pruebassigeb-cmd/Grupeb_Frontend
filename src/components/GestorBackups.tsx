import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import { useAuth } from "../context/AuthContext";
import { showAlert } from "./CustomAlert";
import {
  verificarCodigo,
  ejecutarBackupManual,
  getHistorialBackups,
  type ArchivoBackup,
} from "../services/backup.service";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const formatTamano = (kb: number) =>
  kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// ─────────────────────────────────────────────────────────
// Modal de código de acceso
// ─────────────────────────────────────────────────────────
interface ModalCodigoProps {
  titulo:      string;
  descripcion: string;
  onConfirmar: (codigo: string) => Promise<void>;
  onCerrar:    () => void;
}

function ModalCodigo({ titulo, descripcion, onConfirmar, onCerrar }: ModalCodigoProps) {
  const [codigo,   setCodigo]   = useState("");
  const [error,    setError]    = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrar,  setMostrar]  = useState(false);

  const handleSubmit = async () => {
    if (!codigo.trim()) { setError("Ingresa tu código"); return; }
    setCargando(true);
    setError("");
    try {
      await onConfirmar(codigo);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Código incorrecto");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">{titulo}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{descripcion}</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">
              Código de administrador
            </label>
            <div className="relative">
              <input
                type={mostrar ? "text" : "password"}
                value={codigo}
                onChange={e => { setCodigo(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                autoFocus
                className={`w-full px-4 py-2.5 pr-10 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  error ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-blue-300"
                }`}
              />
              <button
                type="button"
                onClick={() => setMostrar(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrar ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                )}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCerrar} disabled={cargando}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={cargando || !codigo.trim()}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {cargando ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────
export default function GestorBackups() {
  const { user } = useAuth();

  if (!user?.acceso_total) {
    return (
      <Dashboard>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800">Acceso restringido</p>
            <p className="text-sm text-gray-500 mt-1">Solo administradores pueden acceder a esta sección.</p>
          </div>
        </div>
      </Dashboard>
    );
  }

  const [desbloqueado,   setDesbloqueado]   = useState(false);
  const [modalCodigo,    setModalCodigo]    = useState<"desbloquear" | "backup" | null>(null);
  const [historial,      setHistorial]      = useState<ArchivoBackup[]>([]);
  const [ultimoBackup,   setUltimoBackup]   = useState<string | null>(null);
  const [cargandoData,   setCargandoData]   = useState(false);
  const [haciendoBackup, setHaciendoBackup] = useState(false);

  const cargarDatos = async () => {
    setCargandoData(true);
    try {
      const hist = await getHistorialBackups();
      setHistorial(hist);
      if (hist.length > 0) setUltimoBackup(hist[0].created_at);
    } catch {
      showAlert("Error al cargar historial de backups");
    } finally {
      setCargandoData(false);
    }
  };

  useEffect(() => { if (desbloqueado) cargarDatos(); }, [desbloqueado]);

  const handleDesbloquear = async (codigo: string) => {
    await verificarCodigo(codigo);
    setDesbloqueado(true);
    setModalCodigo(null);
  };

  const handleBackupManual = async (codigo: string) => {
    setModalCodigo(null);
    setHaciendoBackup(true);
    try {
      const res = await ejecutarBackupManual(codigo);
      showAlert(`✅ ${res.mensaje}`);
      await cargarDatos();
    } catch (e: any) {
      showAlert(e?.response?.data?.error || "Error al generar el backup");
    } finally {
      setHaciendoBackup(false);
    }
  };

  // ── Vista bloqueada ──
  if (!desbloqueado) {
    return (
      <Dashboard>
        <div className="flex flex-col items-center justify-center h-72 gap-5">
          <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-gray-800">Backups de base de datos</h1>
            <p className="text-sm text-gray-500">Esta sección está protegida. Ingresa tu código de administrador para continuar.</p>
          </div>
          <button onClick={() => setModalCodigo("desbloquear")}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
            </svg>
            Ingresar código
          </button>
        </div>
        {modalCodigo === "desbloquear" && (
          <ModalCodigo
            titulo="Acceso a Backups BD"
            descripcion="Ingresa tu código de administrador para desbloquear esta sección."
            onConfirmar={handleDesbloquear}
            onCerrar={() => setModalCodigo(null)}
          />
        )}
      </Dashboard>
    );
  }

  // ── Vista desbloqueada ──
  return (
    <Dashboard>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Backups BD</h1>
            <p className="text-sm text-gray-500 mt-0.5">Base de datos PostgreSQL en Render</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500"/>
            <span className="text-xs font-semibold text-green-700">Desbloqueado</span>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">

          {/* ── Backup inmediato ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Backup inmediato</h2>
                <p className="text-xs text-gray-500">Genera un respaldo ahora mismo y lo guarda en S3</p>
              </div>
            </div>

            {ultimoBackup && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-xs text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Último backup:&nbsp;
                <span className="font-semibold text-gray-700">{formatFecha(ultimoBackup)}</span>
              </div>
            )}

            {/* Info backups automáticos */}
            <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
              <svg className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-xs text-indigo-600">
                Los backups automáticos se ejecutan cada semana vía cron-job.org y aparecerán aquí en el historial.
              </p>
            </div>

            <button
              onClick={() => setModalCodigo("backup")}
              disabled={haciendoBackup}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {haciendoBackup ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Generando backup…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Generar backup ahora
                </>
              )}
            </button>
          </div>

          {/* ── Historial ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "320px" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Historial de backups</h2>
                  <p className="text-xs text-gray-500">
                    {historial.length > 0
                      ? `${historial.length} respaldo${historial.length !== 1 ? "s" : ""}`
                      : "Sin respaldos aún"}
                  </p>
                </div>
              </div>
              <button
                onClick={cargarDatos}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Actualizar
              </button>
            </div>

            {cargandoData ? (
              <div className="flex-1 flex justify-center items-center py-10">
                <svg className="w-6 h-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              </div>
            ) : historial.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-12 h-12 mb-3 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
                </svg>
                <p className="text-sm font-medium">No hay backups aún</p>
                <p className="text-xs mt-1">Genera tu primer respaldo con el botón de la izquierda</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                {historial.map((backup, i) => (
                  <div
                    key={backup.id_archivo}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                        i === 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {historial.length - i}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-gray-800 truncate max-w-[180px]">
                            {backup.nombre}
                          </p>
                          {i === 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold flex-shrink-0">
                              Último
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatFecha(backup.created_at)}
                          <span className="mx-1.5 text-gray-300">·</span>
                          {formatTamano(backup.tamano_kb)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={backup.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      .sql
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {modalCodigo === "backup" && (
        <ModalCodigo
          titulo="Confirmar backup manual"
          descripcion="Ingresa tu código de administrador para generar el backup."
          onConfirmar={handleBackupManual}
          onCerrar={() => setModalCodigo(null)}
        />
      )}
    </Dashboard>
  );
}