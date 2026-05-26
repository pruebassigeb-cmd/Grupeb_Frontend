import api from "./api"; // ajusta al path de tu instancia de axios

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TipoInsumo {
  idtipo_insumo: number;
  nombre: string;
}

export interface Proveedor {
  idproveedor: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  total_productos?: number;
}

export interface ProductoProveedor {
  idproveedor_producto: number;
  nombre: string;
  codigo: string | null;
  precio: number | null;
  notas: string | null;
  activo: boolean;
  idtipo_insumo: number;
  tipo_insumo_nombre: string;
  proveedor_nombre?: string;
  idproveedor?: number;
}

export interface ProveedorDetalle extends Proveedor {
  productos: ProductoProveedor[];
}

export interface CreateProveedorDto {
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  notas?: string | null;
}

export interface CreateProductoDto {
  tipo_insumo_id: number;
  nombre: string;
  codigo?: string | null;
  precio?: number | null;
  notas?: string | null;
}

// ── Tipos de insumo ───────────────────────────────────────────────────────────

export const getTiposInsumo = async (): Promise<TipoInsumo[]> => {
const { data } = await api.get("/proveedores/tipos-insumo");
  return data;
};

// ── Proveedores ───────────────────────────────────────────────────────────────

export const getProveedores = async (q?: string): Promise<Proveedor[]> => {
  const { data } = await api.get("/proveedores", { params: { q, activo: true } });
  return data;
};

export const getProveedorById = async (id: number): Promise<ProveedorDetalle> => {
  const { data } = await api.get(`/proveedores/${id}`);
  return data;
};

export const crearProveedor = async (dto: CreateProveedorDto): Promise<Proveedor> => {
  const { data } = await api.post("/proveedores", dto);
  return data.proveedor;
};

export const actualizarProveedor = async (
  id: number,
  dto: Partial<CreateProveedorDto> & { activo?: boolean }
): Promise<Proveedor> => {
  const { data } = await api.put(`/proveedores/${id}`, dto);
  return data.proveedor;
};

export const eliminarProveedor = async (id: number): Promise<void> => {
  await api.delete(`/proveedores/${id}`);
};

// ── Productos del proveedor ───────────────────────────────────────────────────

export const crearProductoProveedor = async (
  proveedorId: number,
  dto: CreateProductoDto
): Promise<ProductoProveedor> => {
  const { data } = await api.post(`/proveedores/${proveedorId}/productos`, dto);
  return data.producto;
};

export const actualizarProductoProveedor = async (
  proveedorId: number,
  productoId: number,
  dto: Partial<CreateProductoDto> & { activo?: boolean }
): Promise<ProductoProveedor> => {
  const { data } = await api.put(`/proveedores/${proveedorId}/productos/${productoId}`, dto);
  return data.producto;
};

export const eliminarProductoProveedor = async (
  proveedorId: number,
  productoId: number
): Promise<void> => {
  await api.delete(`/proveedores/${proveedorId}/productos/${productoId}`);
};

// ── Búsqueda global de insumos (desplegable en cotización) ────────────────────

export const buscarInsumos = async (
  tipoId: number,
  q?: string
): Promise<ProductoProveedor[]> => {
const { data } = await api.get("/proveedores/insumos", { params: { tipo: tipoId, q } });
  return data;
};

// ── Registrar insumo rápido desde cotización ──────────────────────────────────

export interface RegistrarInsumoRapidoDto {
  tipo_insumo_id:        number;
  nombre:                string;
  codigo?:               string | null;
  proveedor_idproveedor?: number | null;
}

export const registrarInsumoRapido = async (
  dto: RegistrarInsumoRapidoDto
): Promise<ProductoProveedor> => {
  const { data } = await api.post("/proveedores/insumos/registrar-rapido", dto);
  return data.producto;
};

export const crearTipoInsumo = async (nombre: string): Promise<TipoInsumo> => {
  const { data } = await api.post("/proveedores/tipos-insumo", { nombre });
  return data.tipo;
};