// src/types/papel/cotizacion-papel.types.ts
// ─────────────────────────────────────────────────────────────────────────
// Tipos compartidos para cotizar productos de PAPEL.
// ─────────────────────────────────────────────────────────────────────────

export interface ProductoPapelBusqueda {
  idproducto_papel: number;
  tipo_producto: string;
  descripcion_papel: string | null;
  medida: string | null;
  primer_tipo_papel?: string;
  primer_calibre?: string;
}

export interface GrupoOpcion {
  idgrupo_papel: number;
  precio_sugerido: number | null;
  etiqueta: string; // "Couché 300pts + Kraft 200gms"
}
export interface AsaOpcion      { idcat_tipo_asa: number; nombre: string; }
export interface LaminadoOpcion { idcat_laminado: number; nombre: string; }

export interface FoilOpcion    { idfoil: number; colorfoil: string; codigofoil: string | null; }
export interface TexturaOpcion { idcat_textura: number; nombre: string; }

// Maquinaria que devuelve getProductoPapelById: { impresora: [{id,nombre}], ... }
export type MaquinariaItem = { id: number; nombre: string };
export type MaquinariaProducto = Record<string, MaquinariaItem[]>;

// Forma (parcial) del detalle que devuelve GET /productos-papel/:id
export interface ProductoPapelDetalle {
  idproducto_papel: number;
  grupos: {
    idgrupo_papel: number;
    precio_sugerido: string | number | null;
    orden: number;
    materiales: { tipo_papel: string | null; calibre: string | null }[];
  }[];
  acabados: {
    asas: { idcat_tipo_asa: number; tipo_asa: string }[];
    laminados: { id: number; nombre: string }[];
  } | null;
  maquinaria?: MaquinariaProducto;
}

export interface OpcionesProductoPapel {
  grupos: GrupoOpcion[];
  asas: AsaOpcion[];
  laminados: LaminadoOpcion[];
}

export interface ProductoPapelCotizacion {
  tipoCotizacion: "papel";
  idproducto_papel: number;
  nombre: string;
  descripcion_papel: string | null;
  medida: string | null;

  idgrupo_papel: number | null;
  grupo_descripcion: string;
  precio_sugerido: number | null;

  // Tintas EXTERIORES
  tintasId: number | null;
  tintas: number;
  pantones: string;

  // Tintas INTERIORES ("por dentro")
  tintasDentroId: number | null;
  tintasDentro: number;
  pantonesDentro: string;

  carasId: number | null;
  caras: number;

  id_asa: number | null;          asa_nombre: string | null;
  idcat_laminado: number | null;  laminado_nombre: string | null;
  idfoil: number | null;          foil_nombre: string | null;
  idcat_textura: number | null;   textura_nombre: string | null;
  uv: boolean;
  alto_relieve: boolean;

  observacion: string;
  descripcion: string | null;

  cantidades: [number, number, number];
  precios: [number, number, number];

  herramental_descripcion?: string | null;
  herramental_precio?: number | null;
}