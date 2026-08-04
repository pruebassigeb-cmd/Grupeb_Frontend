// src/types/cotizadorLibre/cotizadorLibre.types.ts

export type CategoriaCotizadorLibre = "papel" | "plastico";

export interface TipoCatalogoItem {
  id: number;
  nombre: string;
}

export interface MedidaPapelItem {
  id: number;
  medida: string | null;
  ancho: string | null;
  fuelle: string | null;
  altura: string | null;
  descripcion_papel: string | null;
}

export interface MedidaPlasticoItem {
  id: number;
  medida: string | null;
  ancho: string | null;
  altura: string | null;
  fuelle_fondo: string | null;
  fuelle_latiz: string | null;
  fuelle_latde: string | null;
  por_kilo: string | null;
}

export type MedidaItem = MedidaPapelItem | MedidaPlasticoItem;

export interface GrupoPapelItem {
  idgrupo_papel: number;
  precio_sugerido: string | null;
  idcat_tipo_papel: number | null;
  material: string | null;
}

export interface DetalleProductoPapelResponse {
  producto: {
    idproducto_papel: number;
    medida: string | null;
    ancho: string | null;
    fuelle: string | null;
    altura: string | null;
    descripcion_papel: string | null;
    activo: boolean;
  };
  grupos: GrupoPapelItem[];
  asas: TipoCatalogoItem[];
  laminados: TipoCatalogoItem[];
  texturas: TipoCatalogoItem[];
  foils: TipoCatalogoItem[];
  linea: null;
}

export interface TintaItem {
  id: number;
  cantidad: number | null;
}

export interface DetalleProductoPlasticoResponse {
  producto: {
    idconfiguracion_plastico: number;
    medida: string | null;
    ancho: string | null;
    altura: string | null;
    fuelle_fondo: string | null;
    fuelle_latiz: string | null;
    fuelle_latde: string | null;
    por_kilo: string | null;
    activo: boolean;
    material: string | null;
    calibre: number | null;
  };
  tintas: TintaItem[];
}