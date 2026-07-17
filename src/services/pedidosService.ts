// src/services/pedidosService.ts
import type { Pedido } from "../types/cotizaciones.types";
import api from "./api";
import type { MaquinariaProductoPedidoPapel } from "../types/papel/maquinaria-pedido.types";

export const getPedidos = async (): Promise<Pedido[]> => {
  const response = await api.get("/pedidos");
  return response.data;
};

export const guardarMaquinariaPedidoPapel = async (
  noPedido: string,
  maquinariaPapel: MaquinariaProductoPedidoPapel[]
): Promise<void> => {
  await api.patch(`/pedidos/${noPedido}/maquinaria-papel`, {
    maquinariaPapel,
  });
};

export const eliminarPedido = async (noPedido: string) => {
  const { data } = await api.delete(`/pedidos/${noPedido}/completo`);
  return data;
};

export interface DetalleActualizar {
  iddetalle: number | null;
  cantidad: number;
  precio_total: number;
  precio_unitario: number | null;
  kilogramos: number | null;
  modo_cantidad: "unidad" | "kilo";
}

// ─── Productos existentes (ya tienen idsolicitud_producto en BD) ─────────────

export interface ProductoActualizarBase {
  idsolicitud_producto: number;
  eliminado: boolean;
  observacion: string | null;
  descripcion: string | null;
  herramental_descripcion: string | null;
  herramental_precio: number | null;
  herramental_aprobado: boolean | null;
  detalles: DetalleActualizar[];
}

export interface ProductoPlasticoActualizar extends ProductoActualizarBase {
  tipo_material?: "plastico";
  tipoCotizacion?: "plastico";
  nuevo_configuracion_id?: number;
  tintas: number;
  caras: number;
  pantones: string | null;
  pigmentos: string | null;
  perforacion: boolean;
  idsuaje: number | null;
  id_color: number | null;
  id_medidatro: number | null;
}

export interface ProductoPapelActualizar extends ProductoActualizarBase {
  tipo_material: "papel";
  tipoCotizacion: "papel";
  idproducto_papel: number;
  idgrupo_papel: number | null;
  grupo_descripcion: string | null;
  tintasId: number | null;
  carasId: number | null;
  pantones: string | null;
  id_asa: number | null;
  idcat_laminado: number | null;
  idfoil: number | null;
  idcat_textura: number | null;
  uv: boolean;
  alto_relieve: boolean;
  tintasDentroId: number | null;
  pantonesDentro: string | null;
  // DEPRECATED: ya no se elige/deriva en el sistema (se decide físicamente
  // en producción). Se deja opcional para no romper código que aún la lea,
  // pero no debería seguir escribiéndose.
  metodo_hojeado?: "hojeado" | "guillotina" | null;
  lleva_armado: boolean;
  maquinaria_seleccionada: Record<string, { id: number; nombre: string } | null>;
  cargo_adicional_descripcion?: string | null;
  cargo_adicional_precio?: number | null;
}

export type ProductoActualizar =
  | ProductoPlasticoActualizar
  | ProductoPapelActualizar;

// ─── Productos nuevos (se agregan al pedido en esta edición, sin id en BD) ───
// Mismos campos que su contraparte "Actualizar", pero sin idsolicitud_producto
// ni eliminado (no aplica: un producto nuevo no puede llegar marcado como
// eliminado, simplemente no se incluye en el payload si el usuario lo quita).

export interface DetalleNuevo extends Omit<DetalleActualizar, "iddetalle"> {
  iddetalle?: null;
}

export interface ProductoNuevoBase {
  observacion: string | null;
  descripcion: string | null;
  herramental_descripcion: string | null;
  herramental_precio: number | null;
  herramental_aprobado: boolean | null;
  detalles: DetalleNuevo[];
}

export interface ProductoNuevoPlastico extends ProductoNuevoBase {
  tipo_material?: "plastico";
  tipoCotizacion?: "plastico";
  // Configuración inicial con la que se crea el producto (obligatoria: sin
  // esto el backend no sabe qué producto de plástico insertar).
  configuracion_plastico_id: number;
  tintas: number;
  caras: number;
  pantones: string | null;
  pigmentos: string | null;
  perforacion: boolean;
  idsuaje: number | null;
  id_color: number | null;
  id_medidatro: number | null;
}

export interface ProductoNuevoPapel extends ProductoNuevoBase {
  tipo_material: "papel";
  tipoCotizacion: "papel";
  idproducto_papel: number;
  idgrupo_papel: number | null;
  grupo_descripcion: string | null;
  tintasId: number | null;
  carasId: number | null;
  pantones: string | null;
  id_asa: number | null;
  idcat_laminado: number | null;
  idfoil: number | null;
  idcat_textura: number | null;
  uv: boolean;
  alto_relieve: boolean;
  tintasDentroId: number | null;
  pantonesDentro: string | null;
  // DEPRECATED: ya no se elige/deriva en el sistema (se decide físicamente
  // en producción). Se deja opcional para no romper código que aún la lea,
  // pero no debería seguir escribiéndose.
  metodo_hojeado?: "hojeado" | "guillotina" | null;
  lleva_armado: boolean;
  maquinaria_seleccionada: Record<string, { id: number; nombre: string } | null>;
}

export type ProductoNuevo = ProductoNuevoPlastico | ProductoNuevoPapel;

export interface ActualizarPedidoPayload {
  productos: ProductoActualizar[];
  productos_nuevos?: ProductoNuevo[];
}

export const actualizarPedido = async (
  noPedido: string,
  payload: ActualizarPedidoPayload
): Promise<{ message: string }> => {
  const response = await api.put(`/pedidos/${noPedido}`, payload);
  return response.data;
};

export const getHistorialPedidosPorCliente = async (clienteId: number): Promise<Pedido[]> => {
  const { data } = await api.get(`/pedidos/historial/${clienteId}`);
  return data;
};