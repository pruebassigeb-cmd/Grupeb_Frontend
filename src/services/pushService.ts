import api from "./api";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

// Convierte la clave pública VAPID (base64url, como la entrega el backend)
// al Uint8Array que pide `PushManager.subscribe`.
function base64UrlAUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const salida = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) salida[i] = raw.charCodeAt(i);
  return salida;
}

export function pushDisponible(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Se suscribe a push real del navegador y registra la suscripción en el
 * backend (`POST /push/subscribe`). Es idempotente: si ya existe una
 * suscripción activa para este dispositivo, la reutiliza en vez de crear
 * una nueva.
 */
export async function suscribirsePush(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) {
    console.warn("VITE_VAPID_PUBLIC_KEY no está configurada — no se puede suscribir a push.");
    return;
  }
  if (!pushDisponible()) return;

  const registro = await navigator.serviceWorker.ready;
  let suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) {
    suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlAUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  await api.post("/push/subscribe", suscripcion.toJSON());
}

export async function desuscribirsePush(): Promise<void> {
  if (!pushDisponible()) return;

  const registro = await navigator.serviceWorker.ready;
  const suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) return;

  await api.post("/push/unsubscribe", { endpoint: suscripcion.endpoint });
  await suscripcion.unsubscribe();
}
