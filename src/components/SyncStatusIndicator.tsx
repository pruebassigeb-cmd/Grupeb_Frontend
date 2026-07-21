import { useAuth } from "../context/AuthContext";
import { useSyncOutbox } from "../offline/useSyncOutbox";

/**
 * Único punto que llama a `useSyncOutbox` (y por lo tanto el único que
 * dispara la sincronización real) — renderiza una sola insignia pequeña,
 * NO bloqueante, con dos estados (sincronizando / pendientes). Si estas dos
 * vistas se separaran en componentes distintos que cada uno llamara a
 * `useSyncOutbox` por su cuenta, se dispararía la sincronización dos veces
 * en paralelo y se duplicarían las peticiones.
 *
 * Antes esto era un modal de pantalla completa con backdrop mientras
 * sincronizaba — el usuario pidió algo más discreto que no le impida
 * seguir navegando mientras sube los cambios en segundo plano.
 */
export default function SyncStatusIndicator() {
  const { user } = useAuth();
  const { pendientes, sincronizando } = useSyncOutbox(!!user?.id);

  if (!sincronizando && pendientes === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-600 shadow-2xl px-4 py-2 text-sm text-white">
      {sincronizando ? (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
          Sincronizando cambios…
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          {pendientes} cambio{pendientes === 1 ? "" : "s"} pendiente{pendientes === 1 ? "" : "s"} de sincronizar
        </>
      )}
    </div>
  );
}
