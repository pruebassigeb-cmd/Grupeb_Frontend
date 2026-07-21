import { useAuth } from "../context/AuthContext";
import { useSyncOutbox } from "../offline/useSyncOutbox";

/**
 * Único punto que llama a `useSyncOutbox` (y por lo tanto el único que
 * dispara la sincronización real) — renderiza tanto el modal de "está
 * sincronizando ahora mismo" como la insignia de "hay N pendientes" en
 * estado quieto. Si estas dos vistas se separaran en componentes distintos
 * que cada uno llamara a `useSyncOutbox` por su cuenta, se dispararía la
 * sincronización dos veces en paralelo y se duplicarían las peticiones.
 */
export default function SyncStatusIndicator() {
  const { user } = useAuth();
  const { pendientes, sincronizando } = useSyncOutbox(!!user?.id);

  return (
    <>
      {sincronizando && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            <p className="text-lg font-semibold text-gray-900 mb-1">Sincronizando cambios</p>
            <p className="text-sm text-gray-500">
              Subiendo {pendientes} cambio{pendientes === 1 ? "" : "s"} guardado{pendientes === 1 ? "" : "s"} mientras
              no había conexión. No cierres la aplicación.
            </p>
          </div>
        </div>
      )}

      {!sincronizando && pendientes > 0 && (
        <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-600 shadow-2xl px-4 py-2 text-sm text-white">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          {pendientes} cambio{pendientes === 1 ? "" : "s"} pendiente{pendientes === 1 ? "" : "s"} de sincronizar
        </div>
      )}
    </>
  );
}
