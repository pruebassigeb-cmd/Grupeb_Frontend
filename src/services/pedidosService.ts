// src/services/pedidosService.ts
import type { Pedido } from "../types/cotizaciones.types";
import api from "./api";
import type { MaquinariaProductoPedidoPapel } from "../types/papel/maquinaria-pedido.types";

export const EVENTO_PEDIDO_ACTUALIZADO = "grupeb:pedido-actualizado";
export const CLAVE_PEDIDO_ACTUALIZADO = "grupeb:ultimo-pedido-actualizado";

function notificarPedidoActualizado(noPedido: string): void {
  if (typeof window === "undefined") return;

  const detalle = { noPedido, actualizadoEn: Date.now() };
  window.dispatchEvent(new CustomEvent(EVENTO_PEDIDO_ACTUALIZADO, { detail: detalle }));

  try {
    localStorage.setItem(CLAVE_PEDIDO_ACTUALIZADO, JSON.stringify(detalle));
  } catch {
    // La actualizaciÃ³n ya se guardÃ³; el aviso entre pestaÃ±as es secundario.
  }
}

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
  // Los especiales guardan tipo_material="especial", no "papel"
  // (Jose, 2026-09-03).
  tipo_material: "papel" | "especial";
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
  // Los especiales guardan tipo_material="especial", no "papel"
  // (Jose, 2026-09-03).
  tipo_material: "papel" | "especial";
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
  // Banderas/datos de cabecera del pedido. Opcionales: si no se envían, el
  // backend conserva el valor actual.
  prioridad?: boolean; // pedido urgente
  sin_iva?: boolean;
  // Folio de la orden de compra del cliente. Mandar "" o null para borrarlo;
  // omitir el campo para no tocar el valor guardado.
  orden_compra_folio?: string | null;
}

export const actualizarPedido = async (
  noPedido: string,
  payload: ActualizarPedidoPayload
): Promise<{ message: string }> => {
  const response = await api.put(`/pedidos/${noPedido}`, payload);
  notificarPedidoActualizado(noPedido);
  return response.data;
};

export interface ResultadoCambioMoneda {
  idsolicitud: number;
  moneda: "MXN" | "USD";
  tipo_cambio: number | null;
  ventas_actualizada: boolean;
}

// Cambia la moneda de un pedido ya creado, convirtiendo los precios ya
// capturados con el tipo de cambio vigente. El backend rechaza el cambio si
// el pedido ya tiene pagos registrados.
export const cambiarMonedaPedido = async (
  noPedido: string,
  moneda: "MXN" | "USD",
): Promise<ResultadoCambioMoneda> => {
  const response = await api.put(`/pedidos/${noPedido}/moneda`, { moneda });
  notificarPedidoActualizado(noPedido);
  return response.data;
};

export const getHistorialPedidosPorCliente = async (clienteId: number): Promise<Pedido[]> => {
  const { data } = await api.get(`/pedidos/historial/${clienteId}`);
  return data;
};

// ─── Archivos de la Orden de Compra (ligados al pedido, no al producto) ──────

export interface ArchivoOrdenCompra {
  id_archivo: number;
  nombre: string;
  tipo: "image" | "pdf" | "document";
  mime_type: string;
  tamano_kb: number;
  categoria: string | null;
  created_at: string;
  url: string;
}

// Sube un archivo (imagen o PDF) de la Orden de Compra y lo liga al pedido
// vía no_pedido (el backend lo resuelve internamente a solicitud_id). Se
// puede llamar varias veces para el mismo pedido: no hay límite de archivos
// (ej. una imagen y el PDF por separado).
export const subirArchivoOrdenCompra = async (
  noPedido: string,
  archivo: File
): Promise<ArchivoOrdenCompra> => {
  const formData = new FormData();
  formData.append("archivo", archivo);
  formData.append("carpeta", "ordenes-compra");
  formData.append("no_pedido", noPedido);

  const { data } = await api.post("/archivos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// Lista los archivos de Orden de Compra (u otros) ya ligados a un pedido.
export const getArchivosOrdenCompra = async (
  noPedido: string
): Promise<ArchivoOrdenCompra[]> => {
  const { data } = await api.get(`/archivos/pedido/${noPedido}`);
  return data;
};

// Elimina un archivo de Orden de Compra ya subido.
export const eliminarArchivoOrdenCompra = async (idArchivo: number): Promise<void> => {
  await api.delete(`/archivos/${idArchivo}`);
};