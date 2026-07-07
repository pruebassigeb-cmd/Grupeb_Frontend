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
  CategoriaArchivoPlastico,
  ArchivoProductoPlastico,
} from "../types/productos-plastico.types";

// ========================
// FUNCIONES EXISTENTES
// ========================
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

export const getCatalogosPlastico = async (): Promise<CatalogosPlastico> => {
  try {
    const response = await api.get("/catalogos-productos/plastico");
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al obtener catálogos:", error);
    throw error;
  }
};

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

export const getProductosPlastico = async (): Promise<ProductoPlastico[]> => {
  try {
    const response = await api.get("/productos-plastico");
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al obtener productos:", error);
    throw error;
  }
};

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

/** Soft-delete — el backend ahora marca activo=false, no borra el registro */
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

/** ✅ NUEVO — reactivar un producto previamente desactivado */
export const reactivarProductoPlastico = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const response = await api.patch(`/productos-plastico/${id}/reactivar`);
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al reactivar producto:", error);
    throw error;
  }
};

// ====================================
// NUEVAS FUNCIONES PARA BÚSQUEDA
// ====================================
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

export const crearOObtenerProducto = async (
  producto: ProductoPlasticoCreate
): Promise<ProductoPlasticoResponse> => {
  try {
    const verificacion = await verificarProductoExiste({
      tipo_producto_id: producto.tipo_producto_plastico_id,
      material_id: producto.material_plastico_id,
      calibre_id: producto.calibre_id,
      medida: producto.medida,
    });

    if (verificacion.existe && verificacion.producto) {
      return { message: "Producto encontrado", producto: verificacion.producto };
    }

    return await createProductoPlastico(producto);
  } catch (error: any) {
    console.error("❌ Error al crear/obtener producto:", error);
    throw error;
  }
};

interface CheckDuplicadoParams {
  tipo_producto_plastico_id: number;
  material_plastico_id: number;
  calibre_id: number;
  altura: number;
  ancho: number;
  fuelle_fondo?: number;
  fuelle_latIz?: number;
  fuelle_latDe?: number;
  refuerzo?: number;
}

interface CheckDuplicadoResult {
  existe: boolean;
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

// ====================================
// ✅ NUEVO — ARCHIVOS (imagen / render / master)
// Usa carpeta="catalogoproductos" y subcarpeta="plastico", que YA existen
// en config/multer.ts del backend (CARPETAS.catalogo_productos y
// SUBCARPETAS_CATALOGO). No requiere ningún ajuste ahí.
// ====================================

export const subirArchivoProductoPlastico = async (
  file: File,
  categoria: CategoriaArchivoPlastico,
  idconfiguracion_plastico: number
): Promise<ArchivoProductoPlastico> => {
  const BASE = (import.meta as any).env.VITE_API_URL;
  const fd = new FormData();
  fd.append("archivo", file);
  fd.append("carpeta", "catalogoproductos");
  fd.append("subcarpeta", "plastico");
  fd.append("categoria", categoria);
  fd.append("idconfiguracion_plastico", String(idconfiguracion_plastico));

  const res = await fetch(`${BASE}/archivos/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Error al subir el archivo");
  }

  return await res.json();
};

/** Elimina un archivo ya subido (imagen/render/master) */
export const eliminarArchivoProductoPlastico = async (
  id_archivo: number
): Promise<{ message: string }> => {
  const response = await api.delete(`/archivos/${id_archivo}`);
  return response.data;
};

/** GET /archivos/producto-plastico/:idproducto (ya existe en tus rutas reales) */
export const getArchivosProductoPlastico = async (
  idconfiguracion_plastico: number
): Promise<ArchivoProductoPlastico[]> => {
  const response = await api.get(
    `/archivos/producto-plastico/${idconfiguracion_plastico}`
  );
  return response.data;
};