// ========================
// CATÁLOGOS (selector — solo activos, sin cambios de forma)
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
// CATÁLOGOS — ADMIN (alta / edición / desactivar / reactivar)
// ========================

export type CatKeyPlastico = "tipo_producto" | "material" | "calibre";

export interface TipoProductoAdminItem {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface MaterialAdminItem {
  id: number;
  nombre: string;
  valor: number;
  activo: boolean;
}

export interface CalibreAdminItem {
  id: number;
  calibre: number;
  calibre_bopp: number | null;
  gramos: number | null;
  activo: boolean;
}

// ========================
// ARCHIVOS DE PRODUCTO PLÁSTICO (imagen / render / master)
// ========================

export type CategoriaArchivoPlastico =
  | "imagen-producto-plastico"
  | "render-plastico"
  | "master-plastico";

export interface ArchivoProductoPlastico {
  id_archivo: number;
  nombre: string;
  categoria: CategoriaArchivoPlastico | string;
  tipo: "image" | "pdf" | "document" | string;
  mime_type?: string;
  tamano_kb?: number;
  url: string;
}

export interface ArchivoPendientePlastico {
  uid: string;
  file: File;
  categoria: CategoriaArchivoPlastico;
  previewUrl: string;
  nombre: string;
  tipo: "image" | "pdf" | "document";
  pendiente: true;
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
  // NUEVO: alias/nota libre del producto — el mismo producto (misma medida,
  // material y calibre) puede conocerse con distintos nombres según el
  // cliente; esto no afecta el nombre generado ni la detección de duplicados.
  descripcion?: string;
}

export interface ProductoPlastico {
  id: number;
  altura: number;
  fuelle_fondo: number;
  refuerzo: number;
  ancho: number;
  fuelle_lateral_izquierdo: number;
  fuelle_lateral_derecho: number;
  medida: string | null;
  por_kilo: string;
  identificador?: string | null;
  // NUEVO: alias/nota libre del producto (ver ProductoPlasticoCreate)
  descripcion?: string | null;
  tipo_producto: string | null;
  material: string | null;
  calibre: number | null;
  archivos_preview?: ArchivoProductoPlastico[];
  // NUEVO: tamaño (Mini/Chico/Mediano/Grande/Extragrande) y precios de
  // referencia (500/1000/3000 pzs) — antes vivían en catalogo_expo, ahora
  // se guardan directo aquí.
  tamano_prod?: string | null;
  precio_500?: number | null;
  precio_1000?: number | null;
  precio_3000?: number | null;
  // NUEVO: true cuando el producto se creó automáticamente desde Expo
  // (resolverFKsProductoExpo), en vez de darse de alta a mano desde esta
  // página. Se usa para mostrar el badge "⭐ Expo" en la tabla.
  origen_expo?: boolean;
}

export interface ProductoPlasticoDetalle extends ProductoPlastico {
  tipo_producto_id: number;
  material_id: number;
  calibre_id: number;
  activo?: boolean;
  archivos?: ArchivoProductoPlastico[];
}

export interface ProductoPlasticoResponse {
  message: string;
  producto: {
    id: number;
    medida: string;
    por_kilo: string;
    identificador?: string | null;
  };
}

// ====================================
// BÚSQUEDA
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
  gramos?: number;
  medidas: Record<MedidaKey, string>;
  medidasFormateadas: string;
  nombreCompleto: string;
  descripcion: string;
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