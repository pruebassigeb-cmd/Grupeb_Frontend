// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGOS
// ═══════════════════════════════════════════════════════════════════════════
export interface CatItem {
  id: number;
  nombre: string;
  medida?: string;
  numero_maquina?: string;
}

export type CatKey =
  | "tipo_producto"
  | "tipo_papel"
  | "calibre"
  | "tipo_pegado"
  | "pegamento"
  | "tipo_asa"
  | "laminado"
  | "refuerzo_medidas"
  | "refuerzo_material"
  | "empaque"
  | "sacabocados"
  | "perforado"
  | "hojeado_guillotina"
  | "impresora"
  | "hs_ar"
  | "suaje_maquina"
  | "uv"
  | "textura"
  | "empalme"
  | "armado"
  | "asas_maquina"
  | "desbarbe";

export type Catalogs = Record<CatKey, CatItem[]>;

// ═══════════════════════════════════════════════════════════════════════════
// MATERIAL / GRUPO
// ═══════════════════════════════════════════════════════════════════════════
export interface Hojeado {
  bobina: string;
  corte: string;
  rendimiento: string;
  guillotina: string;
  hilo: string;
}

export interface MaterialEntry {
  id: number;   // id local para el form (Date.now())
  idcat_tipo_papel: number | null;
  idcat_calibre: number | null;
  tipo: string;   // nombre display
  calibre: string;   // nombre display
  pliego: string;
  rendimiento: string;
  corte: string;
  hojeado: Hojeado;
}

export interface GrupoPapel {
  id: number;   // id local para el form
  idgrupo_papel?: number;   // id real de BD (presente al editar)
  materiales: MaterialEntry[];
  draft: MaterialEntry;
  precioSugerido: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUAJE
// ═══════════════════════════════════════════════════════════════════════════
export interface Suaje {
  numero: string;
  pzs: string;
  tamano: string;
  corte1Tipo: string;
  corte1Medida: string;
  dobles1Tipo: string;
  dobles1Medida: string;
  metros: string;
  matrix: string;
  tiempoArreglo: string;
  idcat_sacabocados: number | null;
  sacabocadoNombre: string;
  cantidad_sacabocado: string;
  idcat_perforado: number | null;
  perforadoNombre: string;
  cantidad_perforado: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACABADOS
// ═══════════════════════════════════════════════════════════════════════════
export interface Acabados {
  idcat_tipo_pegado: number | null;
  idcat_pegamento: number | null;
  idcat_laminado: number | null;
  asas: number[];   // array de idcat_tipo_asa
  asasNombres: string[];   // para display
  idcat_refuerzo_material: number | null;
  idcat_refuerzo_medidas: number | null;
  refuerzoMedidaNombre: string;
  idcat_base_material: number | null;
  base_medida: string;     // calculado auto
  idcat_empaque: number | null;
  pzs_caja: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAQUINARIA
// ═══════════════════════════════════════════════════════════════════════════
export interface Maquinaria {
  idcat_hojeado_guillotina: number | null;
  idcat_impresora: number | null;
  idcat_hs_ar: number | null;
  idcat_suaje_maquina: number | null;
  idcat_uv: number | null;
  idcat_textura: number | null;
  idcat_empalme: number | null;
  idcat_armado: number | null;
  idcat_asas_maquina: number | null;
  idcat_desbarbe: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTO PAPEL (forma del formulario)
// ═══════════════════════════════════════════════════════════════════════════
export interface ProductoPapelForm {
  idcat_tipo_producto_papel: number | null;
  tipoProductoNombre: string;
  ancho: string;
  fuelle: string;
  altura: string;
  medida: string;
  grupos: GrupoPapel[];
  suaje: Suaje;
  acabados: Acabados;
  maquinaria: Maquinaria;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTO PAPEL (listado desde API)
// ═══════════════════════════════════════════════════════════════════════════
export interface ProductoPapelListItem {
  idproducto_papel: number;
  tipo_producto: string;
  ancho: number | null;
  fuelle: number | null;
  altura: number | null;
  medida: string | null;
  activo: boolean;
  created_at: string;
  creado_por: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS PARA INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════
export const newHojeado = (): Hojeado => ({
  bobina: "", corte: "", rendimiento: "", guillotina: "", hilo: "",
});

export const newMaterial = (): MaterialEntry => ({
  id: Date.now() + Math.random(),
  idcat_tipo_papel: null,
  idcat_calibre: null,
  tipo: "",
  calibre: "",
  pliego: "",
  rendimiento: "",
  corte: "",
  hojeado: newHojeado(),
});

export const newGrupo = (): GrupoPapel => ({
  id: Date.now() + Math.random(),
  materiales: [],
  draft: newMaterial(),
  precioSugerido: "",
});

export const newSuaje = (): Suaje => ({
  numero: "", pzs: "", tamano: "",
  corte1Tipo: "", corte1Medida: "",
  dobles1Tipo: "", dobles1Medida: "",
  metros: "", matrix: "", tiempoArreglo: "",
  idcat_sacabocados: null, sacabocadoNombre: "", cantidad_sacabocado: "",
  idcat_perforado: null, perforadoNombre: "", cantidad_perforado: "",
});

export const newAcabados = (): Acabados => ({
  idcat_tipo_pegado: null, idcat_pegamento: null, idcat_laminado: null,
  asas: [], asasNombres: [],
  idcat_refuerzo_material: null, idcat_refuerzo_medidas: null, refuerzoMedidaNombre: "",
  idcat_base_material: null, base_medida: "",
  idcat_empaque: null, pzs_caja: "",
});

export const newMaquinaria = (): Maquinaria => ({
  idcat_hojeado_guillotina: null, idcat_impresora: null, idcat_hs_ar: null,
  idcat_suaje_maquina: null, idcat_uv: null, idcat_textura: null,
  idcat_empalme: null, idcat_armado: null, idcat_asas_maquina: null, idcat_desbarbe: null,
});

export const newProductoForm = (): ProductoPapelForm => ({
  idcat_tipo_producto_papel: null,
  tipoProductoNombre: "",
  ancho: "", fuelle: "", altura: "", medida: "",
  grupos: [newGrupo()],
  suaje: newSuaje(),
  acabados: newAcabados(),
  maquinaria: newMaquinaria(),
});