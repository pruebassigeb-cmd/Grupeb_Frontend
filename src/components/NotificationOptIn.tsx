import { useState } from "react";
import { useNotificationPermission } from "../hooks/useNotificationPermission";
import { suscribirsePush } from "../services/pushService";

/**
 * Opt-in de notificaciones — alcance actual: solo Expo (ver
 * docs/pwa-plan.md Fase 4). Al conceder el permiso también intenta
 * suscribirse a push real del backend (best-effort; si VAPID no está
 * configurada o falla, el opt-in ya sirvió para la notificación LOCAL de
 * "Expo sincronizado", que no depende de esto).
 */
export default function NotificationOptIn() {
  const { permiso, pedirPermiso } = useNotificationPermission();
  const [activando, setActivando] = useState(false);

  if (permiso === "no-soportado" || permiso === "granted") return null;

  const activar = async () => {
    setActivando(true);
    try {
      const resultado = await pedirPermiso();
      if (resultado === "granted") {
        await suscribirsePush().catch((e) => console.error("No se pudo suscribir a push:", e));
      }
    } finally {
      setActivando(false);
    }
  };

  if (permiso === "denied") {
    return (
      <span
        title="Los bloqueaste desde el navegador — actívalos desde la configuración del sitio si los quieres de vuelta."
        style={{ fontSize: 10, color: "#666", padding: "4px 8px" }}
      >
        🔕 Notificaciones bloqueadas
      </span>
    );
  }

  return (
    <button
      onClick={activar}
      disabled={activando}
      title="Avisa cuando tus cambios de Expo terminan de sincronizarse sin conexión"
      style={{
        background: "transparent",
        border: "1px solid #C9922A55",
        color: "#C9922A",
        fontSize: 11,
        fontWeight: 700,
        padding: "8px 10px",
        borderRadius: 6,
        cursor: activando ? "not-allowed" : "pointer",
        opacity: activando ? 0.5 : 1,
      }}
    >
      🔔 {activando ? "Activando…" : "Activar notificaciones"}
    </button>
  );
}
