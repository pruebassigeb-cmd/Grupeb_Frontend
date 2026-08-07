import type { Cliente } from "../types/clientes.types";
import type { Usuario } from "../types/usuario.types";

/**
 * Claves de sessionStorage para el punto de guardado (ver
 * src/hooks/useBorradorFormulario.ts) de formularios cuyo `onSubmit` puede
 * tragarse sus propios errores sin relanzarlos (varias pantallas atrapan el
 * error, muestran su propia alerta y regresan normalmente). En esos casos
 * `limpiarBorrador` no se puede llamar desde DENTRO del formulario — un
 * `await onSubmit(...)` que resuelve no es garantía de que se haya guardado
 * de verdad — así que cada pantalla que sí conoce su señal real de éxito
 * llama a `limpiarBorrador(claveBorradorX(...))` desde ahí. Centralizado
 * aquí (en vez de exportado junto a cada componente) porque exportar una
 * función no-componente desde un archivo de componente rompe React Fast
 * Refresh (regla react-refresh/only-export-components).
 */

export function claveBorradorCliente(clienteEditar?: Cliente | null): string {
  return clienteEditar ? `cliente-editar-${clienteEditar.idclientes}` : "cliente-nuevo";
}

export function claveBorradorUsuario(usuarioEditar?: Usuario | null): string {
  return usuarioEditar ? `usuario-editar-${usuarioEditar.idusuario}` : "usuario-nuevo";
}

// FormularioProductoPapelAlta se monta desde 3 pantallas (catálogo de papel,
// y como alta de línea nueva dentro de editar cotización/pedido de papel);
// de esas, dos atrapan sus propios errores sin relanzarlos.
export function claveBorradorProductoPapel(idExistente?: number | null): string {
  return idExistente ? `papel-producto-editar-${idExistente}` : "papel-producto-nueva";
}
