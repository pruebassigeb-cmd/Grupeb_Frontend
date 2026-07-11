import api from "./api";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TipoInsumo {
  idtipo_insumo: number;
  nombre: string;
}

export interface RegimenFiscal {
  idregimen_fiscal: number;
  tipo_regimen: string;
  codigo: string;
}

export interface ProductoSat {
  idproducto_sat: number;
  clave: number;
  pdft: string;
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
  rfc_proveedor?: string | null;
  regimen_fiscal_idregimen_fiscal?: number | null;
  regimen_fiscal_codigo?: string | null;
  regimen_fiscal_nombre?: string | null;
  condicion_compra?: string | null;
  dias_credito?: number | null;
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
  clave_producto?: string | null;
  minimo_compra?: number | null;
  unidad?: string | null;
  producto_sat_idproducto_sat?: number | null;
  producto_sat_clave?: number | null;
  producto_sat_nombre?: string | null;
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
  rfc_proveedor?: string | null;
  regimen_fiscal_idregimen_fiscal?: number | null;
}

export interface CreateProductoDto {
  tipo_insumo_id: number;
  nombre: string;
  codigo?: string | null;
  precio?: number | null;
  notas?: string | null;
  clave_producto?: string | null;
  minimo_compra?: number | null;
  unidad?: string | null;
  producto_sat_idproducto_sat?: number | null;
}

// ── Domicilio ─────────────────────────────────────────────────────────────────

export interface DomicilioProveedor {
  idproveedor_domicilio?: number;
  codigo_postal?: string | null;
  colonia?: string | null;
  domicilio?: string | null;
  municipio?: string | null;
  estado?: string | null;
}

// ── Facturación ───────────────────────────────────────────────────────────────

export interface FacturacionProveedor {
  idproveedor_facturacion?: number;
  banco: string;
  cuenta: string;
  clabe: string;
  convenio: string;
  nombre_cuenta: string;
  condicion_compra: string;
  dias_credito?: number | null;
}

export interface InsumoProveedorInfo {
  idinsumo_proveedor: number;
  idproveedor: number;
  proveedor_nombre: string;
  codigo: string | null;
  precio: number | null;
}

export interface Insumo {
  idinsumo: number;
  nombre: string;
  clave_producto: string | null;
  unidad: string | null;
  idtipo_insumo: number;
  tipo_insumo_nombre: string;
  proveedores: InsumoProveedorInfo[];
}

// ── Catálogos ─────────────────────────────────────────────────────────────────

export const getTiposInsumo = async (): Promise<TipoInsumo[]> => {
  const { data } = await api.get("/proveedores/tipos-insumo");
  return data;
};

export const getRegimenesFiscales = async (): Promise<RegimenFiscal[]> => {
  const { data } = await api.get("/proveedores/regimenes-fiscales");
  return data;
};

export const getProductosSat = async (
  q?: string
): Promise<ProductoSat[]> => {
  const { data } = await api.get("/proveedores/productos-sat", {
    params: { q },
  });

  return data;
};

// ── Proveedores ───────────────────────────────────────────────────────────────

export const getProveedores = async (
  q?: string
): Promise<Proveedor[]> => {
  const { data } = await api.get("/proveedores", {
    params: {
      q,
      activo: true,
    },
  });

  return data;
};

export const getProveedorById = async (
  id: number
): Promise<ProveedorDetalle> => {
  const { data } = await api.get(`/proveedores/${id}`);
  return data;
};

export const crearProveedor = async (
  dto: CreateProveedorDto
): Promise<Proveedor> => {
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

export const eliminarProveedor = async (
  id: number
): Promise<void> => {
  await api.delete(`/proveedores/${id}`);
};

// ── Productos del proveedor ───────────────────────────────────────────────────

export const crearProductoProveedor = async (
  proveedorId: number,
  dto: CreateProductoDto
): Promise<ProductoProveedor> => {
  const { data } = await api.post(
    `/proveedores/${proveedorId}/productos`,
    dto
  );

  return data.producto;
};

export const actualizarProductoProveedor = async (
  proveedorId: number,
  productoId: number,
  dto: Partial<CreateProductoDto> & { activo?: boolean }
): Promise<ProductoProveedor> => {
  const { data } = await api.put(
    `/proveedores/${proveedorId}/productos/${productoId}`,
    dto
  );

  return data.producto;
};

export const eliminarProductoProveedor = async (
  proveedorId: number,
  productoId: number
): Promise<void> => {
  await api.delete(
    `/proveedores/${proveedorId}/productos/${productoId}`
  );
};

// ── Búsqueda global de insumos ────────────────────────────────────────────────

export const buscarInsumos = async (
  tipoId: number,
  q?: string,
  activo?: boolean
): Promise<Insumo[]> => {
  const { data } = await api.get("/proveedores/insumos", {
    params: {
      tipo: tipoId,
      q,
      activo:
        activo === undefined
          ? undefined
          : String(activo),
    },
  });

  return data;
};

// ── Registrar insumo rápido ───────────────────────────────────────────────────

export interface RegistrarInsumoRapidoDto {
  tipo_insumo_id: number;
  nombre: string;
  codigo?: string | null;
  proveedores_ids?: number[];
  precio?: number | null;
  notas?: string | null;
  clave_producto?: string | null;
  minimo_compra?: number | null;

  // Se permite cualquier unidad enviada por el formulario.
  unidad?: string | null;

  producto_sat_idproducto_sat?: number | null;
}

export const registrarInsumoRapido = async (
  dto: RegistrarInsumoRapidoDto
): Promise<Insumo> => {
  const { data } = await api.post(
    "/proveedores/insumos/registrar-rapido",
    dto
  );

  return data.producto;
};

export const crearTipoInsumo = async (
  nombre: string
): Promise<TipoInsumo> => {
  const { data } = await api.post(
    "/proveedores/tipos-insumo",
    { nombre }
  );

  return data.tipo;
};

// ── Domicilio ─────────────────────────────────────────────────────────────────

export const getDomicilioProveedor = async (
  id: number
): Promise<DomicilioProveedor | null> => {
  const { data } = await api.get(
    `/proveedores/${id}/domicilio`
  );

  return data;
};

export const upsertDomicilioProveedor = async (
  id: number,
  dto: DomicilioProveedor
): Promise<DomicilioProveedor> => {
  const { data } = await api.put(
    `/proveedores/${id}/domicilio`,
    dto
  );

  return data.domicilio;
};

// ── Facturación ───────────────────────────────────────────────────────────────

export const getFacturacionProveedor = async (
  id: number
): Promise<FacturacionProveedor[]> => {
  const { data } = await api.get(
    `/proveedores/${id}/facturacion`
  );

  return data;
};

export const crearFacturacionProveedor = async (
  id: number,
  dto: FacturacionProveedor
): Promise<FacturacionProveedor> => {
  const { data } = await api.post(
    `/proveedores/${id}/facturacion`,
    dto
  );

  return data.facturacion;
};

export const actualizarFacturacionProveedor = async (
  id: number,
  idFact: number,
  dto: Partial<FacturacionProveedor>
): Promise<FacturacionProveedor> => {
  const { data } = await api.put(
    `/proveedores/${id}/facturacion/${idFact}`,
    dto
  );

  return data.facturacion;
};

export const eliminarFacturacionProveedor = async (
  id: number,
  idFact: number
): Promise<void> => {
  await api.delete(
    `/proveedores/${id}/facturacion/${idFact}`
  );
};

export const guardarProveedorCompleto = async (
  id: number,
  general: Partial<CreateProveedorDto>,
  domicilio: DomicilioProveedor,
  facturacion: FacturacionProveedor[]
): Promise<Proveedor> => {
  const { data } = await api.put(
    `/proveedores/${id}/completo`,
    {
      general,
      domicilio,
      facturacion,
    }
  );

  return data.proveedor;
};

// ── Activar/desactivar insumos ────────────────────────────────────────────────

export const desactivarInsumo = async (
  idinsumo: number
): Promise<{ message: string }> => {
  const { data } = await api.patch(
    `/proveedores/insumos/${idinsumo}`
  );

  return data;
};

export const reactivarInsumo = async (
  idinsumo: number
): Promise<{ message: string }> => {
  const { data } = await api.patch(
    `/proveedores/insumos/${idinsumo}/reactivar`
  );

  return data;
};