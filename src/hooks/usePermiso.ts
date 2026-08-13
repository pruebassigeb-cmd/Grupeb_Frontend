import { useAuth } from "../context/AuthContext";
import { tienePermisoUsuario } from "../utils/permisosUsuario";

// ==========================
// usePermiso
// Devuelve true si el usuario tiene el permiso indicado.
// Acceso total siempre devuelve true.
//
// IMPORTANTE (fase 6): `permiso` es la CLAVE del privilegio
// ("diseno.editar"), NO su texto visible ("Editar Diseño"). El texto se
// puede renombrar libremente desde la pantalla de Roles, así que compararlo
// rompe el permiso en silencio -- el usuario simplemente deja de ver el
// botón, sin ningún error. Ya pasó con todo el módulo de Diseño.
// ==========================
export const usePermiso = (permiso: string): boolean => {
  const { user } = useAuth();
  return tienePermisoUsuario(user, permiso);
};

// ==========================
// usePermisos
// Recibe varios permisos y devuelve un objeto con cada uno.
// Útil cuando un componente necesita verificar múltiples permisos.
//
// Igual que usePermiso: se pasan CLAVES, no textos visibles. Cuando exista
// una constante exportada en utils/permisosUsuario.ts, úsala en vez del
// string suelto.
//
// Ejemplo:
//   const { puedeEditar, puedeVerOrden } = usePermisos({
//     puedeEditar:   PERMISO_EDITAR_DISENO,   // "diseno.editar"
//     puedeVerOrden: PERMISO_ORDEN_DISENO,    // "diseno.orden"
//   });
// ==========================
export const usePermisos = <T extends Record<string, string>>(
  permisos: T
): Record<keyof T, boolean> => {
  const { user } = useAuth();

  const resultado = {} as Record<keyof T, boolean>;

  for (const key in permisos) {
    resultado[key] = tienePermisoUsuario(user, permisos[key]);
  }

  return resultado;
};
