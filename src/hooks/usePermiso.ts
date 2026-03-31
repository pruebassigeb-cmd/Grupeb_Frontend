import { useAuth } from "../context/AuthContext";

// ==========================
// usePermiso
// Devuelve true si el usuario tiene el permiso indicado.
// Acceso total siempre devuelve true.
// ==========================
export const usePermiso = (permiso: string): boolean => {
  const { user } = useAuth();
  if (!user) return false;
  if (user.acceso_total) return true;
  return user.privilegios.includes(permiso);
};

// ==========================
// usePermisos
// Recibe varios permisos y devuelve un objeto con cada uno.
// Útil cuando un componente necesita verificar múltiples permisos.
//
// Ejemplo:
//   const { puedeCrear, puedeEliminar } = usePermisos({
//     puedeCrear:   "Crear/Editar/Eliminar Usuarios",
//     puedeEliminar: "Crear/Editar/Eliminar Usuarios",
//   });
// ==========================
export const usePermisos = <T extends Record<string, string>>(
  permisos: T
): Record<keyof T, boolean> => {
  const { user } = useAuth();

  const resultado = {} as Record<keyof T, boolean>;

  for (const key in permisos) {
    if (!user) {
      resultado[key] = false;
    } else if (user.acceso_total) {
      resultado[key] = true;
    } else {
      resultado[key] = user.privilegios.includes(permisos[key]);
    }
  }

  return resultado;
};