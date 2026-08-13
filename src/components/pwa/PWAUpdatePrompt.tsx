import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";

// Sobrevive a la recarga del auto-update, para poder avisar del lado de la
// versión NUEVA ya cargada — un aviso mostrado justo antes de recargar
// duraría milisegundos y nadie alcanzaría a leerlo.
const FLAG_ACTUALIZADO = "sigeb-pwa-actualizado";

// Cada cuánto se le pregunta al servidor si ya hay un sw.js distinto.
// El navegador por su cuenta solo revisa al navegar o cada ~24 h, y en una SPA
// que se deja abierta todo el día eso nunca pasa: sin este intervalo, un deploy
// nuevo no lo ve nadie hasta que alguien recargue a mano.
const INTERVALO_CHEQUEO_MS = 5 * 60_000;

// <StrictMode> invoca dos veces el inicializador de useState con el que
// `useRegisterSW` registra el SW, así que el arranque de los chequeos se
// protege aparte para no dejar dos intervalos ni dos listeners corriendo.
let chequeoArrancado = false;

// Hay dos caminos que pueden pedir la recarga (ver aplicarActualizacion) y solo
// uno debe ejecutarla.
let recargaPedida = false;

function recargarConAviso() {
  if (recargaPedida) return;
  recargaPedida = true;
  sessionStorage.setItem(FLAG_ACTUALIZADO, "1");
  window.location.reload();
}

function arrancarChequeoDeVersion(
  swUrl: string,
  registro: ServiceWorkerRegistration
) {
  if (chequeoArrancado) return;
  chequeoArrancado = true;

  const buscarVersionNueva = async () => {
    if (registro.installing || !navigator.onLine) return;
    try {
      // Se pide el sw.js antes de llamar a update() para no ensuciar la consola
      // con un error de red cada minuto cuando el servidor está caído o la
      // conexión va y viene.
      const respuesta = await fetch(swUrl, {
        cache: "no-store",
        headers: { "cache-control": "no-cache" },
      });
      if (respuesta.status === 200) await registro.update();
    } catch {
      // Sin red no hay nada que actualizar; el listener de "online" reintenta
      // en cuanto vuelva la conexión.
    }
  };

  setInterval(buscarVersionNueva, INTERVALO_CHEQUEO_MS);

  // El intervalo solo no alcanza: los navegadores congelan los timers de las
  // pestañas en segundo plano, así que se revisa también al volver a la
  // pestaña y al recuperar la conexión.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void buscarVersionNueva();
  });
  window.addEventListener("online", () => void buscarVersionNueva());
}

/**
 * Despierta al service worker que está en "waiting" y recarga cuando toma el
 * control.
 *
 * La recarga NO se deja solo en manos del `onNeedReload` del plugin: ese se
 * dispara desde el evento "controlling" de workbox-window, que solo actúa si
 * `isUpdate` es true — y workbox fija esa bandera según si YA había un service
 * worker controlando en el momento de registrarse. En la primera visita de un
 * usuario (cuando el SW se instala por primera vez) queda en false durante toda
 * esa sesión, así que si ese mismo día se sube una versión, el SW nuevo se
 * activaría y la pestaña se quedaría corriendo el bundle viejo sin recargar.
 * Escuchar "controllerchange" a mano cubre ese hueco.
 */
function aplicarActualizacion(updateServiceWorker: () => Promise<void>) {
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    recargarConAviso,
    { once: true }
  );

  // Red de seguridad: si por lo que sea el cambio de control no llega, se
  // recarga igual. Aquí ya se pidió activar la versión nueva, así que quedarse
  // a medias (código viejo + service worker nuevo) es peor que recargar.
  setTimeout(recargarConAviso, 5000);

  void updateServiceWorker();
}

/**
 * Actualiza SIGEB solo, sin botones, pero sin interrumpir a nadie a media
 * captura. El ciclo completo:
 *
 * 1. Cada minuto (y al volver a la pestaña, y al recuperar conexión) se revisa
 *    si el servidor tiene un sw.js distinto.
 * 2. Si lo hay, el service worker nuevo se instala y se queda en "waiting" —
 *    `src/sw.ts` no hace `skipWaiting()` por su cuenta. La pestaña sigue
 *    corriendo la versión vieja, con su caché intacto: el usuario no nota nada
 *    y no pierde nada.
 * 3. En cuanto cambia de pantalla se activa la versión nueva y se recarga. Ese
 *    es el único momento seguro: el formulario que estuviera llenando ya lo
 *    soltó él, no se lo quitamos nosotros.
 * 4. La ruta y la sesión sobreviven (la sesión vive en localStorage), así que
 *    aterriza justo donde iba, ya con la versión nueva.
 *
 * Contrapartida asumida: quien se quede horas en la misma pantalla sin moverse
 * sigue con la versión vieja hasta que navegue o cierre la pestaña. Se prefirió
 * eso a recargarle encima de un pedido a medio capturar.
 *
 * El caso "se subió una versión mientras el usuario estaba sin internet" se
 * resuelve solo: sin red el navegador no puede siquiera descargar el sw.js
 * nuevo, así que no hay nada que aplicar; en cuanto vuelve la conexión, el
 * listener de "online" dispara el chequeo y se aplica como cualquier otra.
 */
export default function PWAUpdatePrompt() {
  const location = useLocation();

  // El inicializador solo LEE la marca (no la borra) para que siga siendo puro:
  // <StrictMode> lo invoca dos veces y una versión que borrara aquí perdería el
  // aviso en la segunda pasada.
  const [avisoActualizado, setAvisoActualizado] = useState(
    () => sessionStorage.getItem(FLAG_ACTUALIZADO) !== null
  );
  const [actualizacionEnEspera, setActualizacionEnEspera] = useState(false);
  const [avisoEsperaVisible, setAvisoEsperaVisible] = useState(false);

  // Pantalla en la que estaba el usuario cuando llegó la versión nueva.
  // Mientras siga ahí no se toca nada.
  const rutaAlDetectar = useRef<string | null>(null);

  const { updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registro) {
      if (registro) arrancarChequeoDeVersion(swUrl, registro);
    },
    // Hay versión nueva instalada y esperando. NO se activa todavía.
    onNeedRefresh() {
      setActualizacionEnEspera(true);
      setAvisoEsperaVisible(true);
    },
    // Ya se activó la versión nueva (la disparamos nosotros al cambiar de
    // pantalla). Sin este callback el plugin recargaría por su cuenta; se
    // sobrescribe solo para dejar la marca antes de recargar y poder avisar
    // del otro lado. No es el único camino: ver aplicarActualizacion.
    onNeedReload: recargarConAviso,
    onRegisterError(error) {
      console.error("Error al registrar el service worker:", error);
    },
  });

  useEffect(() => {
    if (!actualizacionEnEspera) return;

    // Primera pasada tras detectar la versión nueva: se anota dónde estaba el
    // usuario y se le deja seguir trabajando.
    if (rutaAlDetectar.current === null) {
      rutaAlDetectar.current = location.pathname;
      return;
    }

    if (location.pathname === rutaAlDetectar.current) return;

    // Cambió de pantalla: ya soltó lo que estuviera capturando, es seguro
    // aplicar. La recarga cae sobre la ruta nueva, no sobre la anterior.
    aplicarActualizacion(updateServiceWorker);
  }, [actualizacionEnEspera, location.pathname, updateServiceWorker]);

  useEffect(() => {
    if (!avisoEsperaVisible) return;
    const id = setTimeout(() => setAvisoEsperaVisible(false), 8000);
    return () => clearTimeout(id);
  }, [avisoEsperaVisible]);

  useEffect(() => {
    if (!avisoActualizado) return;
    sessionStorage.removeItem(FLAG_ACTUALIZADO);
    const id = setTimeout(() => setAvisoActualizado(false), 5000);
    return () => clearTimeout(id);
  }, [avisoActualizado]);

  const mensaje = avisoActualizado
    ? "SIGEB se actualizó a la última versión."
    : avisoEsperaVisible
      ? "Hay una versión nueva de SIGEB. Se aplicará sola al cambiar de pantalla, para no perder lo que estés capturando."
      : null;

  if (!mensaje) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg bg-slate-800 border border-slate-600 shadow-2xl p-4 text-white">
      <p className="text-sm font-medium">{mensaje}</p>
    </div>
  );
}
