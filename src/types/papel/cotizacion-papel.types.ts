export interface ProductoPapelBusqueda {
  idproducto_papel: number;
  tipo_producto: string;
  descripcion_papel: string | null;
  medida: string | null;
  tamano_asa_default?: string | null;
  primer_tipo_papel?: string | null;
  primer_calibre?: string | null;
  origen_expo?: boolean;
  // NUEVO — integración de productos especiales en cotización/pedido.
  // Sin esto, el filtro `p.es_especial` en FormularioProductoPapel.tsx /
  // EditarCotizacionPapelCompleta.tsx / EditarPedidoPapel.tsx compila igual
  // (JS no valida tipos en runtime) pero TypeScript lo marca como error.
  es_especial?: boolean;
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

export interface ColorAsaOpcion {
  id_color: number;
  color: string;
  hex?: string | null;
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
  // Los especiales guardan tipo_material="especial", no "papel"
  // (Jose, 2026-09-03).
  tipo_material?: "papel" | "especial";
  idproducto_papel: number;
  nombre: string;
  descripcion_papel: string | null;
  medida: string | null;
  tamano_asa_default?: string | null;
  idgrupo_papel: number | null;
  grupo_descripcion: string;
  precio_sugerido: number | null;

  // NUEVO — integración de productos especiales en cotización/pedido.
  // La marca FormularioProductoPapel.tsx (soloEspeciales) al agregar la
  // línea, y el backend la devuelve (papel_es_especial) al recargar una
  // cotización/pedido ya guardado — ver cotizacionPapel.helper.ts /
  // pedidos.controller.ts. Opcional para no romper líneas ya guardadas
  // antes de este cambio (llegarían sin el campo).
  es_especial?: boolean;

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
  id_color: number | null;
  color_asa_nombre: string | null;
  asa_color?: string | null;
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
  cargo_adicional_descripcion?: string | null;
  cargo_adicional_precio?: number | null;
}