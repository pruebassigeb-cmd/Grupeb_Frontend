export interface ProductoPapelBusqueda {
  idproducto_papel: number;
  tipo_producto: string;
  descripcion_papel: string | null;
  medida: string | null;
  tamano_asa_default?: string | null;
  primer_tipo_papel?: string | null;
  primer_calibre?: string | null;
}

export interface GrupoOpcion {
  idgrupo_papel: number;
  etiqueta: string;
  precio_sugerido: number | null;
}

export interface AsaOpcion {
  idcat_tipo_asa: number;
  nombre: string;
}

export interface LaminadoOpcion {
  idcat_laminado: number;
  nombre: string;
}

export interface FoilOpcion {
  idfoil: number;
  colorfoil: string;
  codigofoil?: string | null;
}

export interface TexturaOpcion {
  idcat_textura: number;
  nombre: string;
}

export interface MaquinaPapelOpcion {
  id: number;
  nombre: string;
  numero_maquina?: string | null;
  tipo_maquina?: "hojeadora" | "guillotina" | string | null;
}

export interface MaquinariaProducto {
  hojeado_guillotina?: MaquinaPapelOpcion[];
  impresora?: MaquinaPapelOpcion[];
  hs_ar?: MaquinaPapelOpcion[];
  suaje_maquina?: MaquinaPapelOpcion[];
  uv?: MaquinaPapelOpcion[];
  texturizadora?: MaquinaPapelOpcion[];
  empaque_maquina?: MaquinaPapelOpcion[];
  empalme?: MaquinaPapelOpcion[];
  armado?: MaquinaPapelOpcion[];
  asas_maquina?: MaquinaPapelOpcion[];
  desbarbe?: MaquinaPapelOpcion[];
  laminado_maquina?: MaquinaPapelOpcion[];
  [key: string]: MaquinaPapelOpcion[] | undefined;
}

export type MaquinariaSeleccionadaPapel = Record<
  string,
  { id: number; nombre: string } | null
>;

export interface ProductoPapelCotizacion {
  tipoCotizacion: "papel";
  tipo_material?: "papel";
  idproducto_papel: number;
  nombre: string;
  descripcion_papel: string | null;
  medida: string | null;
  idgrupo_papel: number | null;
  grupo_descripcion: string;
  precio_sugerido: number | null;
  tintasId: number | null;
  tintas: number;
  pantones: string;
  tintasDentroId: number | null;
  tintasDentro: number;
  pantonesDentro: string;
  carasId: number | null;
  caras: number;
  id_asa: number | null;
  asa_nombre: string | null;
  tamano_asa: string | null;
  idcat_laminado: number | null;
  laminado_nombre: string | null;
  idfoil: number | null;
  foil_nombre: string | null;
  idcat_textura: number | null;
  textura_nombre: string | null;
  uv: boolean;
  alto_relieve: boolean;
  metodo_hojeado: "hojeado" | "guillotina" | null;
  lleva_armado: boolean;
  maquinaria_seleccionada: MaquinariaSeleccionadaPapel;
  observacion: string;
  descripcion: string | null;
  cantidades: [number, number, number];
  precios: [number, number, number];
  herramental_descripcion?: string | null;
  herramental_precio?: number | null;
}
