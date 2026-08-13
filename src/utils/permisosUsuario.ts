// Fase 6: estos dos ya son clave, no el texto visible — así renombrar la
// etiqueta desde la pantalla de Roles no rompe nada. Ver
// docs/roles-privilegios-plan.md.
export const PERMISO_EDITAR_DISENO = "diseno.editar";
export const PERMISO_ORDEN_DISENO = "diseno.orden";

interface UsuarioConPermisos {
  rol?: string;
  acceso_total?: boolean;
  privilegios?: string[];
}

const normalizarRol = (rol?: string): string =>
  (rol ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const ROLES_ADMINISTRATIVOS = new Set([
  "admin",
  "administrador",
  "super usuario",
  "superusuario",
]);

export const puedeVerAuditoriaUsuario = (
  usuario: UsuarioConPermisos | null | undefined
): boolean =>
  Boolean(
    usuario?.acceso_total &&
    ROLES_ADMINISTRATIVOS.has(normalizarRol(usuario.rol))
  );

/**
 * `usuario.privilegios` trae claves (fase 6), no el texto visible del
 * privilegio. La antigua excepción por nombre de rol para Diseño/Ventas se
 * quitó: los dos roles ya tienen estos privilegios en su base real desde
 * antes de la fase 0, era pura redundancia. El backend aplica exactamente
 * la misma regla (usuarioTienePermiso en auth.middleware.ts).
 */
export const tienePermisoUsuario = (
  usuario: UsuarioConPermisos | null | undefined,
  privilegio: string
): boolean => {
  if (!usuario) return false;
  if (usuario.acceso_total) return true;
  return (usuario.privilegios ?? []).includes(privilegio);
};
