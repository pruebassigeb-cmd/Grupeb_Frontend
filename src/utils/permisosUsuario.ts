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

/**
 * ¿El usuario tiene ALGÚN privilegio de esta pantalla?
 *
 * Desde que el catálogo se organiza por pantallas (migración
 * 2026-08-14_modulos_por_pantalla.sql), cada pantalla agrupa privilegios que
 * comparten el mismo prefijo de clave: Cotización -> "cotizacion.",
 * Seguimiento -> "produccion.", etc. Verificado contra la BD: las 13
 * pantallas con privilegios usan exactamente un prefijo cada una.
 *
 * Sirve para que el menú y las rutas se abran solos con CUALQUIER privilegio
 * de la pantalla, en vez de con una lista quemada que hay que acordarse de
 * actualizar. Antes esa lista se quedaba corta y el privilegio quedaba
 * inservible: por ejemplo, quien solo tenía "Ver Cotizaciones" nunca veía la
 * pantalla, y un operador de papel no veía Seguimiento porque la lista solo
 * incluía los 4 procesos de plástico.
 *
 * Las restricciones dentro de la pantalla no cambian: cada botón sigue
 * pidiendo su propio privilegio.
 */
export const tienePermisoDePantalla = (
  usuario: UsuarioConPermisos | null | undefined,
  prefijo: string
): boolean => {
  if (!usuario) return false;
  if (usuario.acceso_total) return true;
  return (usuario.privilegios ?? []).some(p => p.startsWith(prefijo));
};
