// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGOS
// ═══════════════════════════════════════════════════════════════════════════
export interface CatItem {
  id: number;
  nombre: string;
  medida?: string;
  numero_maquina?: string;
  altura?: string;
  puntos?: number;
  idcat_punto?: number;
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
  | "desbarbe"
  | "matrix"
  | "cortes"
  | "dobles"
  | "puntos";

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
  bobinaExtra: string;  // opcional, despliega un campo extra al lado de "bobina"
}

export interface MaterialEntry {
  id: number;
  idcat_tipo_papel: number | null;
  idcat_calibre: number | null;
  tipo: string;
  calibre: string;
  pliego: string;
  rendimiento: string;
  corte: string;
  hojeado: Hojeado;
}

export interface GrupoPapel {
  id: number;
  idgrupo_papel?: number;
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
  // corte
  corte1Tipo: string;    // nombre del corte seleccionado
  corte1Medida: string;  // altura autorrellena
  idcat_corte: number | null;
  idcat_punto_corte: number | null;  // punto ligado al corte (autorrellena, editable)
  puntosCorte: string;               // valor de puntos para mostrar
  // dobles
  dobles1Tipo: string;   // nombre del doble seleccionado
  dobles1Medida: string; // altura autorrellena
  idcat_doble: number | null;
  idcat_punto_doble: number | null;  // punto ligado al doble (autorrellena, editable)
  puntosDoble: string;               // valor de puntos para mostrar
  metros: string;
  matrix: string;
  idcat_matrix: number | null;
  tiempoArreglo: string;
  idcat_sacabocados: number | null;
  sacabocadoNombre: string;
  cantidad_sacabocado: string;
  idcat_perforado: number | null;
  perforadoNombre: string;
  cantidad_perforado: string;
  // herramental de desbarbe
  herramentalDesbarbe: boolean;
  noDesbarbe: string;  // entero como string en el form, se parsea al enviar
}

// ═══════════════════════════════════════════════════════════════════════════
// ACABADOS
// ═══════════════════════════════════════════════════════════════════════════
export interface Acabados {
  idcat_tipo_pegado: number | null;
  idcat_pegamento: number | null;
  laminados:        number[];
  laminadosNombres: string[];
  asas: number[];
  asasNombres: string[];
  idcat_refuerzo_material: number | null;
  idcat_refuerzo_medidas: number | null;
  refuerzoMedidaNombre: string;
  idcat_base_material: number | null;
  base_medida: string;
  idcat_empaque: number | null;
  pzs_caja: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAQUINARIA
// ═══════════════════════════════════════════════════════════════════════════
export interface Maquinaria {
  hojeado_guillotina:         number[];
  hojeado_guillotina_nombres: string[];
  impresora:                  number[];
  impresora_nombres:          string[];
  hs_ar:                      number[];
  hs_ar_nombres:              string[];
  suaje_maquina:              number[];
  suaje_maquina_nombres:      string[];
  uv:                         number[];
  uv_nombres:                 string[];
  textura:                    number[];
  textura_nombres:            string[];
  empalme:                    number[];
  empalme_nombres:            string[];
  armado:                     number[];
  armado_nombres:             string[];
  asas_maquina:               number[];
  asas_maquina_nombres:       string[];
  desbarbe:                   number[];
  desbarbe_nombres:           string[];
  [key: string]: number[] | string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTO PAPEL (forma del formulario)
// ═══════════════════════════════════════════════════════════════════════════
export interface ProductoPapelForm {
  idcat_tipo_producto_papel: number | null;
  tipoProductoNombre: string;
  descripcion: string;
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
  descripcion_papel: string | null;
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
  bobina: "", corte: "", rendimiento: "", guillotina: "", hilo: "", bobinaExtra: "",
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
  corte1Tipo: "", corte1Medida: "", idcat_corte: null,
  idcat_punto_corte: null, puntosCorte: "",
  dobles1Tipo: "", dobles1Medida: "", idcat_doble: null,
  idcat_punto_doble: null, puntosDoble: "",
  metros: "",
  matrix: "", idcat_matrix: null,
  tiempoArreglo: "",
  idcat_sacabocados: null, sacabocadoNombre: "", cantidad_sacabocado: "",
  idcat_perforado: null, perforadoNombre: "", cantidad_perforado: "",
  herramentalDesbarbe: false, noDesbarbe: "",
});

export const newAcabados = (): Acabados => ({
  idcat_tipo_pegado: null, idcat_pegamento: null,
  laminados: [], laminadosNombres: [],
  asas: [], asasNombres: [],
  idcat_refuerzo_material: null, idcat_refuerzo_medidas: null, refuerzoMedidaNombre: "",
  idcat_base_material: null, base_medida: "",
  idcat_empaque: null, pzs_caja: "",
});

export const newMaquinaria = (): Maquinaria => ({
  hojeado_guillotina:         [], hojeado_guillotina_nombres: [],
  impresora:                  [], impresora_nombres:          [],
  hs_ar:                      [], hs_ar_nombres:              [],
  suaje_maquina:              [], suaje_maquina_nombres:      [],
  uv:                         [], uv_nombres:                 [],
  textura:                    [], textura_nombres:            [],
  empalme:                    [], empalme_nombres:            [],
  armado:                     [], armado_nombres:             [],
  asas_maquina:               [], asas_maquina_nombres:       [],
  desbarbe:                   [], desbarbe_nombres:           [],
});

export const newProductoForm = (): ProductoPapelForm => ({
  idcat_tipo_producto_papel: null,
  tipoProductoNombre: "",
  descripcion: "",
  ancho: "", fuelle: "", altura: "", medida: "",
  grupos: [newGrupo()],
  suaje: newSuaje(),
  acabados: newAcabados(),
  maquinaria: newMaquinaria(),
});