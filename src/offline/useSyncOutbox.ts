import { useCallback, useEffect, useState } from "react";
import { sincronizarOutbox, contarPendientes } from "./outbox";
import { notificarSincronizacionExpo } from "../pwa/notificacionesLocales";

interface UseSyncOutboxResult {
  pendientes: number;
  sincronizando: boolean;
}

const REINTENTO_MS = 20_000;

/**
 * Dispara la sincronización del outbox cuando hay sesión activa: al montar
 * (si ya hay red) y cada vez que vuelve la conexión — mismo patrón que
 * `warmApiCache`. Expone el conteo de pendientes para mostrarlo en la UI.
 *
 * El evento `online` del navegador no es confiable como señal de "ya hay
 * internet de verdad" — se dispara en cuanto una interfaz de red vuelve a
 * estar activa, que puede ser unos segundos antes de que la conexión real
 * (DNS, túnel, etc.) esté lista. Si ese primer intento falla, no hay
 * ninguna otra señal que dispare un reintento — por eso, mientras queden
 * pendientes en la cola, se reintenta solo cada `REINTENTO_MS`.
 */
export function useSyncOutbox(activo: boolean): UseSyncOutboxResult {
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const refrescarConteo = useCallback(async () => {
    setPendientes(await contarPendientes());
  }, []);

  const ejecutarSync = useCallback(async () => {
    if (!activo || !navigator.onLine) return;
    setSincronizando(true);
    try {
      const resultado = await sincronizarOutbox();
      if (resultado.modulosSincronizados.has("expo")) {
        void notificarSincronizacionExpo();
      }
    } finally {
      setSincronizando(false);
      await refrescarConteo();
    }
  }, [activo, refrescarConteo]);

  useEffect(() => {
    void refrescarConteo();
  }, [refrescarConteo]);

  useEffect(() => {
    if (!activo) return;

    void ejecutarSync();

    window.addEventListener("online", ejecutarSync);
    return () => window.removeEventListener("online", ejecutarSync);
  }, [activo, ejecutarSync]);

  useEffect(() => {
    if (!activo) return;

    // Antes este intervalo solo se armaba si `pendientes > 0` — pero
    // `pendientes` es un estado local que solo se refresca al montar o
    // después de un intento de sync; nada avisa a este hook cuando se
    // encola una entrada nueva desde otra pantalla (ej. una cotización
    // Expo creada sin conexión). Si el contador local seguía en 0, el
    // intervalo nunca se creaba, y el único disparador que quedaba era el
    // evento `online` — poco confiable (ver comentario de arriba). Por eso
    // hacía falta recargar la página para que se sincronizara: solo así el
    // hook volvía a montar y a leer el estado real de IndexedDB. Ahora se
    // revisa siempre cada `REINTENTO_MS` mientras haya sesión activa;
    // `sincronizarOutbox()` es barato cuando no hay nada pendiente (una
    // sola lectura de IndexedDB, sin red), así que no cuesta nada dejarlo
    // corriendo de forma incondicional.
    const id = setInterval(() => {
      void ejecutarSync();
    }, REINTENTO_MS);

    return () => clearInterval(id);
  }, [activo, ejecutarSync]);

  return { pendientes, sincronizando };
}
