import { useCallback, useState } from "react";

type PermisoNotificacion = NotificationPermission | "no-soportado";

function permisoActual(): PermisoNotificacion {
  return typeof Notification === "undefined" ? "no-soportado" : Notification.permission;
}

/** Envuelve el estado de permiso de `Notification` — "no-soportado" cuando el navegador no expone la API. */
export function useNotificationPermission() {
  const [permiso, setPermiso] = useState<PermisoNotificacion>(permisoActual());

  const pedirPermiso = useCallback(async (): Promise<PermisoNotificacion> => {
    if (typeof Notification === "undefined") return "no-soportado";
    const resultado = await Notification.requestPermission();
    setPermiso(resultado);
    return resultado;
  }, []);

  return { permiso, pedirPermiso };
}
