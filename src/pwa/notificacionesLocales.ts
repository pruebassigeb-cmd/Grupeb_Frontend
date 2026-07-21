/**
 * Notificaciones locales del navegador — no requieren push real del backend
 * ni VAPID, se disparan enteramente desde el cliente cuando algo termina de
 * sincronizar mientras la app sigue abierta (aunque esté en segundo plano).
 * Para push real (servidor → dispositivo, app cerrada) ver `pushService.ts`.
 */
export async function notificarSincronizacionExpo(): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const registro = await navigator.serviceWorker.ready;
    await registro.showNotification("Expo sincronizado", {
      body: "Tus cambios de Expo pendientes ya se sincronizaron correctamente.",
      icon: "/icons/icon-192.png",
      tag: "expo-sync",
      data: { url: "/expo" },
    });
  } catch (e) {
    console.error("No se pudo mostrar la notificación de sincronización de Expo:", e);
  }
}
