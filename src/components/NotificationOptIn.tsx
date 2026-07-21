import { useState } from "react";
import { useNotificationPermission } from "../hooks/useNotificationPermission";
import { suscribirsePush } from "../services/pushService";
import { notificarPrueba } from "../pwa/notificacionesLocales";

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
  const [probando, setProbando] = useState(false);

  if (permiso === "no-soportado") return null;

  if (permiso === "granted") {
    const probar = async () => {
      setProbando(true);
      try {
        await notificarPrueba();
      } catch (e) {
        console.error("No se pudo mostrar la notificación de prueba:", e);
      } finally {
        setProbando(false);
      }
    };

    return (
      <button
        onClick={probar}
        disabled={probando}
        title="Si no ves nada al darle clic, el navegador/Windows la está bloqueando a nivel sistema, no es un problema de la app"
        style={{
          background: "transparent",
          border: "1px solid #33333355",
          color: "#888",
          fontSize: 10,
          fontWeight: 600,
          padding: "6px 8px",
          borderRadius: 6,
          cursor: probando ? "not-allowed" : "pointer",
          opacity: probando ? 0.5 : 1,
        }}
      >
        🔔 {probando ? "Probando…" : "Probar notificación"}
      </button>
    );
  }

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
