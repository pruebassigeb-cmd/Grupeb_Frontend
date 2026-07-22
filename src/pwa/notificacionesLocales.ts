/**
 * Notificaciones locales del navegador — no requieren push real del backend
 * ni VAPID, se disparan enteramente desde el cliente cuando algo termina de
 * sincronizar mientras la app sigue abierta (aunque esté en segundo plano).
 * Para push real (servidor → dispositivo, app cerrada) ver `pushService.ts`.
 *
 * Importante: `Notification.permission === "granted"` solo confirma que el
 * navegador dejó pasar la notificación — el sistema operativo puede seguir
 * silenciándola (Windows: Configuración > Sistema > Notificaciones, o Enfoque
 * asistido/Do Not Disturb) sin que `showNotification()` lance ningún error.
 */
async function mostrarNotificacionLocal(
  titulo: string,
  opciones: NotificationOptions
): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (!("serviceWorker" in navigator)) return;

  const registro = await navigator.serviceWorker.ready;
  await registro.showNotification(titulo, {
    icon: "/icons/icon-192.png",
    ...opciones,
  });
}

export async function notificarSincronizacionExpo(): Promise<void> {
  try {
    await mostrarNotificacionLocal("Expo sincronizado", {
      body: "Tus cambios de Expo pendientes ya se sincronizaron correctamente.",
      tag: "expo-sync",
      data: { url: "/expo" },
    });
  } catch (e) {
    console.error("No se pudo mostrar la notificación de sincronización de Expo:", e);
  }
}

/**
 * Notificación con un mensaje concreto de qué se sincronizó (ej. "El correo
 * para Juan Pérez se envió correctamente"). Cada una lleva un `tag` único
 * para que no se reemplacen entre sí — si compartieran tag, solo quedaría
 * visible la última, y el usuario pidió específicamente distinguir qué pasó
 * con cada cosa (correo, cotización, cliente, producto).
 */
export async function notificarMensajeExito(mensaje: string): Promise<void> {
  try {
    await mostrarNotificacionLocal("Expo", {
      body: mensaje,
      tag: `expo-sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
  } catch (e) {
    console.error("No se pudo mostrar la notificación:", e);
  }
}

/** Resumen cuando sincronizan varias cosas a la vez — evita saturar con una notificación por cada una. */
export async function notificarResumenSincronizacion(cantidad: number): Promise<void> {
  try {
    await mostrarNotificacionLocal("Expo sincronizado", {
      body: `${cantidad} cambios de Expo se sincronizaron correctamente.`,
      tag: "expo-sync-resumen",
      data: { url: "/expo" },
    });
  } catch (e) {
    console.error("No se pudo mostrar la notificación de sincronización de Expo:", e);
  }
}
