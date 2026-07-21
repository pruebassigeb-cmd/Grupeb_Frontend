import { useEffect } from "react";
import { showAlert } from "./CustomAlert";

/**
 * Avisa el MOMENTO en que se pierde o se recupera la conexión (a diferencia
 * de OfflineBanner, que muestra un estado persistente mientras se está sin
 * red). No se dispara al cargar la página, solo ante transiciones reales.
 */
export default function ConnectivityToast() {
  useEffect(() => {
    const handleOffline = () => {
      showAlert(
        "Se perdió la conexión a internet. Puedes seguir trabajando — los cambios se guardan y se sincronizan solos al reconectar.",
        "warning"
      );
    };

    const handleOnline = () => {
      showAlert("Conexión recuperada. Sincronizando cambios pendientes…", "success");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
