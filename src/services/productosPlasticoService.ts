import api from "./api";
import type {
  CatalogosPlastico,
  ProductoPlasticoCreate,
  ProductoPlastico,
  ProductoPlasticoDetalle,
  ProductoPlasticoResponse,
  ProductoBusqueda,
  VerificarProductoResponse,
  CatalogoCalibre,
} from "../types/productos-plastico.types";

// ========================
// FUNCIONES EXISTENTES
// ========================
/**
 * Obtener calibres según tipo (normal o BOPP)
 * @param tipo - 'normal' | 'bopp'
 * @returns Array de calibres
 */
export const getCalibres = async (
  tipo: "normal" | "bopp" = "normal"
): Promise<CatalogoCalibre[]> => {
  try {
    const params = { tipo };
    const response = await api.get<CatalogoCalibre[]>(
      "/catalogos-productos/plastico/calibres",
      { params }
    );
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al obtener calibres:", error);
    throw error;
  }
};
/**
 * Obtener catálogos de productos plástico
 */
export const getCatalogosPlastico = async (): Promise<CatalogosPlastico> => {
  try {
    const response = await api.get("/catalogos-productos/plastico");
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al obtener catálogos:", error);
    throw error;
  }
};

/**
 * Crear producto plástico
 */
export const createProductoPlastico = async (
  producto: ProductoPlasticoCreate
): Promise<ProductoPlasticoResponse> => {
  try {
    const response = await api.post("/productos-plastico", producto);
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al crear producto:", error);
    throw error;
  }
};

/**
 * Obtener todos los productos plástico
 */
export const getProductosPlastico = async (): Promise<ProductoPlastico[]> => {
  try {
    const response = await api.get("/productos-plastico");
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al obtener productos:", error);
    throw error;
  }
};

/**
 * Obtener producto plástico por ID
 */
export const getProductoPlasticoById = async (
  id: number
): Promise<ProductoPlasticoDetalle> => {
  try {
    const response = await api.get(`/productos-plastico/${id}`);
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al obtener producto:", error);
    throw error;
  }
};

/**
 * Actualizar producto plástico
 */
export const updateProductoPlastico = async (
  id: number,
  producto: ProductoPlasticoCreate
): Promise<ProductoPlasticoResponse> => {
  try {
    const response = await api.put(`/productos-plastico/${id}`, producto);
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al actualizar producto:", error);
    throw error;
  }
};

/**
 * Eliminar producto plástico
 */
export const deleteProductoPlastico = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/productos-plastico/${id}`);
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al eliminar producto:", error);
    throw error;
  }
};



// ====================================
// NUEVAS FUNCIONES PARA BÚSQUEDA
// ====================================

/**
 * Buscar productos plástico con filtro o devolver los últimos 50
 * @param query - Término de búsqueda (opcional)
 * @returns Array de productos simplificados
 */
export const searchProductosPlastico = async (
  query?: string
): Promise<ProductoBusqueda[]> => {
  try {
    const params = query ? { query } : {};
    const response = await api.get<ProductoBusqueda[]>(
      "/catalogos-productos/plastico/search",
      { params }
    );
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al buscar productos:", error);
    throw error;
  }
};

/**
 * Verificar si un producto ya existe en la base de datos
 * @param data - Datos del producto a verificar
 * @returns Si existe y datos del producto si existe
 */
export const verificarProductoExiste = async (data: {
  tipo_producto_id: number;
  material_id: number;
  calibre_id: number;
  medida: string;
}): Promise<VerificarProductoResponse> => {
  try {
    const response = await api.post<VerificarProductoResponse>(
      "/catalogos-productos/plastico/verificar",
      data
    );
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al verificar producto:", error);
    throw error;
  }
};

/**
 * Crear producto si no existe, o devolver el existente
 * @param producto - Datos del producto
 * @returns Producto creado o existente
 */
export const crearOObtenerProducto = async (
  producto: ProductoPlasticoCreate
): Promise<ProductoPlasticoResponse> => {
  try {
    // Primero verificar si existe
    const verificacion = await verificarProductoExiste({
      tipo_producto_id: producto.tipo_producto_plastico_id,
      material_id: producto.material_plastico_id,
      calibre_id: producto.calibre_id,
      medida: producto.medida,
    });

    if (verificacion.existe && verificacion.producto) {
      console.log("✅ Producto ya existe, devolviendo existente");
      return {
        message: "Producto encontrado",
        producto: verificacion.producto,
      };
    }

    // Si no existe, crear
    console.log("📝 Producto no existe, creando nuevo");
    return await createProductoPlastico(producto);
  } catch (error: any) {
    console.error("❌ Error al crear/obtener producto:", error);
    throw error;
  }
};

// ── Agrega esto a productosPlasticoService.ts ──────────────────────────────

interface CheckDuplicadoParams {
  tipo_producto_plastico_id: number;
  material_plastico_id:      number;
  calibre_id:                number;
  altura:       number;
  ancho:        number;
  fuelle_fondo?: number;
  fuelle_latIz?: number;
  fuelle_latDe?: number;
  refuerzo?:     number;
}

interface CheckDuplicadoResult {
  existe:  boolean;
  detalle?: string;
  producto_existente?: { id: number; medida: string };
}

export const checkProductoDuplicado = async (
  params: CheckDuplicadoParams
): Promise<CheckDuplicadoResult> => {
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  const response = await api.get(`/productos-plastico/check-duplicado?${queryString}`);
  return response.data;
};