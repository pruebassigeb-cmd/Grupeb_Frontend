// ========================
// CATÁLOGOS
// ========================

export interface CatalogoTipoProducto {
  id: number;
  nombre: string;
  producto_id: number;
}

export interface CatalogoMaterial {
  id: number;
  nombre: string;
  valor: string;
}

export interface CatalogoCalibre {
  id: number;
  valor: number;
  gramos?: number; // ✅ Solo viene cuando es calibre BOPP
}

export interface CatalogosPlastico {
  tiposProducto: CatalogoTipoProducto[];
  materiales: CatalogoMaterial[];
  calibres: CatalogoCalibre[];
}

// ========================
// PRODUCTO PLÁSTICO
// ========================

export interface ProductoPlasticoCreate {
  tipo_producto_plastico_id: number;
  material_plastico_id: number;
  calibre_id: number;
  altura: number;
  ancho: number;
  fuelle_fondo: number;
  fuelle_latIz: number;
  fuelle_latDe: number;
  refuerzo: number;
  medida: string;
  por_kilo: number;
}

export interface ProductoPlastico {
  id: number;
  altura: number;
  fuelle_fondo: number;
  refuerzo: number;
  ancho: number;
  fuelle_lateral_izquierdo: number;
  fuelle_lateral_derecho: number;
  medida: string;
  por_kilo: string;
  tipo_producto: string;
  material: string;
  calibre: number;
}

export interface ProductoPlasticoDetalle extends ProductoPlastico {
  tipo_producto_id: number;
  material_id: number;
  calibre_id: number;
}

export interface ProductoPlasticoResponse {
  message: string;
  producto: {
    id: number;
    medida: string;
    por_kilo: string;
  };
}

// ====================================
// NUEVAS INTERFACES PARA BÚSQUEDA
// ====================================

export interface ProductoBusqueda {
  id: number;
  altura: number;
  fuelle_fondo: number;
  refuerzo: number;
  ancho: number;
  fuelle_lateral_izquierdo: number;
  fuelle_lateral_derecho: number;
  medida: string;
  por_kilo: string;
  tipo_producto: string;
  material: string;
  calibre: number;
  tipo_producto_id: number;
  material_id: number;
  calibre_id: number;
}

export interface VerificarProductoResponse {
  existe: boolean;
  producto: {
    id: number;
    medida: string;
    por_kilo: string;
  } | null;
}

// ========================
// COMPONENTES
// ========================

export type MedidaKey =
  | "altura"
  | "ancho"
  | "fuelleFondo"
  | "fuelleLateral1"
  | "fuelleLateral2"
  | "refuerzo";

export interface DatosProducto {
  tipoProducto: string;
  tipoProductoId: number;
  material: string;
  materialId: number;
  calibre: string;
  calibreId: number;
  gramos?: number; // ✅ NUEVO: gramos del calibre BOPP, undefined para otros materiales
  medidas: Record<MedidaKey, string>;
  medidasFormateadas: string;
  nombreCompleto: string;
}

export interface ConfigProducto {
  imagen: string;
  medidas: {
    key: MedidaKey;
    label: string;
    position: string;
  }[];
}

// ========================
// CONSTANTES
// ========================

export const FORMATO_MEDIDAS = {
  verticales: ["altura", "fuelleFondo", "refuerzo"] as MedidaKey[],
  horizontales: ["ancho", "fuelleLateral1", "fuelleLateral2"] as MedidaKey[],
} as const;