export const PERMISO_EDITAR_DISENO = "Editar Diseño";
export const PERMISO_ORDEN_DISENO = "Orden de Diseño";

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
 * Centraliza privilegios individuales y los privilegios base de Ventas y
 * Diseño. El backend aplica exactamente las mismas reglas.
 */
export const tienePermisoUsuario = (
  usuario: UsuarioConPermisos | null | undefined,
  privilegio: string
): boolean => {
  if (!usuario) return false;
  if (usuario.acceso_total) return true;
  if ((usuario.privilegios ?? []).includes(privilegio)) return true;

  const rol = normalizarRol(usuario.rol);

  if (rol === "diseno") {
    return privilegio === PERMISO_EDITAR_DISENO || privilegio === PERMISO_ORDEN_DISENO;
  }

  return rol === "ventas" && privilegio === PERMISO_ORDEN_DISENO;
};
