import { useEffect } from "react";

const PREFIJO = "sigeb-borrador:";
const DEBOUNCE_MS = 600;

/**
 * Punto de guardado para formularios: mientras se captura, el progreso se
 * autoguarda en sessionStorage; si la pestaña se recarga a media captura
 * (típicamente por la actualización automática de la PWA — ver
 * PWAUpdatePrompt.tsx, aunque cubre cualquier recarga) se restaura solo, sin
 * preguntar nada. No sustituye al guardado real contra el servidor: es solo
 * para no perder lo ya tecleado si pasa algo entre que se empieza a llenar el
 * formulario y se manda a guardar.
 *
 * `clave` identifica QUÉ se está llenando. Para ALTA (formulario vacío)
 * basta con algo fijo, ej. "cotizacion-nueva". Para EDICIÓN hay que incluir
 * el id del registro, ej. `pedido-editar-${id}` — si no, el borrador de un
 * registro se podría restaurar encima de otro registro distinto.
 *
 * No se borra solo al cerrar el formulario sin guardar (cerrar el modal por
 * error deja el progreso disponible la próxima vez que se abra) — hay que
 * llamar a `limpiarBorrador(clave)` explícitamente tras un guardado exitoso,
 * para que la próxima vez que se abra ese mismo formulario no aparezcan
 * datos viejos ya guardados.
 */

// ── Lectura síncrona, para inicializar useState sin parpadeo ───────────────
// Uso: const [datos, setDatos] = useState(() => leerBorrador(clave) ?? valorInicial);
// Es el camino preferido cuando el valor inicial del formulario ya se conoce
// de forma síncrona al montar (formularios de alta, o de edición cuyo
// registro llega por props ya cargado) — restaura de una vez, sin el
// parpadeo de un primer render vacío seguido de un efecto que lo llena.
export function leerBorrador<T>(clave: string): T | null {
  try {
    const crudo = sessionStorage.getItem(PREFIJO + clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

// Nota sobre formularios de edición cuyo valor inicial llega async (fetch
// propio al servidor, en vez de por props ya cargadas): en ese caso
// `leerBorrador` no se puede usar como inicializador de useState (el dato
// aún no existe en el primer render). El patrón usado en todo el proyecto
// para ese caso es un `useRef` de "ya restaurado" comprobado a mano dentro
// del propio efecto de carga, justo antes de aplicar la respuesta del
// servidor — ver por ejemplo cargarDatosEdicion() en
// src/components/proveedores/FormularioProveedor.tsx.

// ── Autoguardado continuo, con debounce, mientras `activo` sea true (ej. el
// modal está abierto). En `false` deja de guardar pero NO borra lo ya
// guardado — ver nota de limpiarBorrador arriba.
export function useAutoguardarBorrador<T>(
  clave: string,
  valorActual: T,
  activo: boolean
): void {
  useEffect(() => {
    if (!activo) return;
    const id = setTimeout(() => {
      try {
        sessionStorage.setItem(PREFIJO + clave, JSON.stringify(valorActual));
      } catch {
        // sessionStorage lleno o inaccesible (modo privado agresivo, etc.):
        // el borrador es una mejora, no algo crítico — se ignora en silencio.
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [activo, clave, valorActual]);
}

export function limpiarBorrador(clave: string): void {
  sessionStorage.removeItem(PREFIJO + clave);
}
