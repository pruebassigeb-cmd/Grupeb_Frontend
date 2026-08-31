export interface CatItem {
  id: number;
  nombre: string;
  medida?: string;
  numero_maquina?: string;
  tipo_maquina?: "hojeadora" | "guillotina" | string | null;
  altura?: string;
  puntos?: number;
  idcat_punto?: number;
  medida_ancho?: number;
}

export type CatKey =
  | "tipo_producto"
  | "tipo_papel"
  | "calibre"
  | "tipo_pegado"
  | "pegamento"
  | "tipo_asa"
  | "laminado"
  | "laminado_maquina"
  | "rollo_lam"
  | "textura"
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
  | "texturizadora"
  | "empaque_maquina"
  | "empalme"
  | "armado"
  | "asas_maquina"
  | "desbarbe"
  | "matrix"
  | "cortes"
  | "dobles"
  | "puntos";

export type Catalogs = Record<CatKey, CatItem[]>;

export interface Hojeado {
  bobina: string;
  corte: string;
  rendimiento: string;
  guillotina: string;
  hilo: string;
  bobinaExtra: string;
}

export interface MaterialEntry {
  id: number;
  iddetalle_material?: number;
  idcat_tipo_papel: number | null;
  idcat_calibre: number | null;
  tipo: string;
  calibre: string;
  pliego: string;
  rendimiento: string;
  corte: string;
  hojeado: Hojeado;

  // NUEVO (Fase 3, productos especiales): a qué componente se asigna este
  // material. Se guarda como referencia local (ComponentePapel.id) para que
  // el formulario pueda resolverla sin ids reales todavía; mapFormToApi la
  // traduce a "componente_client_key" (String(id)) al armar el payload.
  // null/undefined = material a nivel producto (caso normal, sin cambios).
  idComponenteAsignado?: number | null;

  // NUEVO: medidas y método de preparación propios del material — antes
  // solo existían a nivel producto_papel; ahora detalle_material_papel
  // también los admite (un producto especial puede tener materiales con
  // medidas distintas a las del producto padre, p. ej. cada bobina de un
  // componente).
  ancho: string;
  fuelle: string;
  altura: string;
  medida: string;
  metodoPreparacion: string; // "" | "hojeadora" | "guillotina"
}

export interface GrupoPapel {
  id: number;
  idgrupo_papel?: number;
  materiales: MaterialEntry[];
  draft: MaterialEntry;
  precioSugerido: string;
}

export interface Suaje {
  numero: string;
  pzs: string;
  tamano: string;
  corte1Tipo: string;
  corte1Medida: string;
  idcat_corte: number | null;
  idcat_punto_corte: number | null;
  puntosCorte: string;
  dobles1Tipo: string;
  dobles1Medida: string;
  idcat_doble: number | null;
  idcat_punto_doble: number | null;
  puntosDoble: string;
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
  herramentalDesbarbe: boolean;
  noDesbarbe: string;
}

export interface Acabados {
  idcat_tipo_pegado: number | null;
  idcat_pegamento: number | null;
  laminados: number[];
  laminadosNombres: string[];

  // FK real hacia public.rollo_lam(idrollo_lam).
  idrollo_lam: number | null;
  rolloLamNombre: string;

  // Captura libre en centímetros. Se guarda en
  // acabados_papel.desarrollo_laminado.
  desarrolloLaminado: string;

  asas: number[];
  asasNombres: string[];
  idcat_refuerzo_material: number | null;
  idcat_refuerzo_medidas: number | null;
  refuerzoMedidaNombre: string;
  idcat_base_material: number | null;
  base_medida: string;
  idcat_empaque: number | null;
  pzs_caja: string;

  // ✅ NUEVO — defaults del producto que precargan los "Acabados especiales"
  // de la cotización (solicitud_producto_papel.uv/alto_relieve, etc.).
  llevaUv: boolean;
  llevaAltoRelieve: boolean;
  llevaTextura: boolean;
  llevaHotStamping: boolean;
}

export interface Maquinaria {
  hojeado_guillotina: number[];
  hojeado_guillotina_nombres: string[];
  impresora: number[];
  impresora_nombres: string[];
  hs_ar: number[];
  hs_ar_nombres: string[];
  suaje_maquina: number[];
  suaje_maquina_nombres: string[];
  uv: number[];
  uv_nombres: string[];
  laminado_maquina: number[];
  laminado_maquina_nombres: string[];
  texturizadora: number[];
  texturizadora_nombres: string[];
  empaque_maquina: number[];
  empaque_maquina_nombres: string[];
  empalme: number[];
  empalme_nombres: string[];
  armado: number[];
  armado_nombres: string[];
  asas_maquina: number[];
  asas_maquina_nombres: string[];
  desbarbe: number[];
  desbarbe_nombres: string[];
  [key: string]: number[] | string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTES (Fase 2/3: productos especiales)
// ═══════════════════════════════════════════════════════════════════════════
// Un producto especial se arma con N componentes (ver
// modulo-productos-especiales.html, sección "Modelo de datos"). Cada
// componente tiene su propia ruta de procesos y, opcionalmente, su propio
// suaje/acabados/maquinaria — mismo shape que a nivel producto, solo que
// aplicado a este componente en vez de al producto completo.
//
// "id" es una clave puramente local (nunca se lee del backend tal cual);
// mapFormToApi la usa como "client_key" para que el backend pueda resolver,
// dentro de una sola petición, qué materiales y qué procesos pertenecen a
// un componente que todavía no tiene idcomponente_papel real (ver el
// comentario sobre client_key en producto_papel.controller.ts).
export interface ComponenteProceso {
  id: number;
  idcomponente_papel_proceso?: number | null;
  idproceso_cat: number | null;
  procesoNombre: string;
  orden: number;
  observaciones: string;

  // Qué material(es) trabaja este proceso, por MaterialEntry.id (clave
  // local) — mapFormToApi las traduce a iddetalle_material (si el material
  // ya existe) o a su client_key (si es nuevo), tal como espera
  // upsertComponenteProcesos en el backend.
  materiales: number[];
}

export interface ComponentePapel {
  id: number;
  idcomponente_papel?: number | null;
  tipo: "unica" | "inicio" | "union";
  orden: number | null;
  nombre: string;
  esUnion: boolean;
  procesos: ComponenteProceso[];
  suaje: Suaje;
  acabados: Acabados;
  maquinaria: Maquinaria;
}

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
  tamanoAsaDefault: string;

  // FK a cat_tamano_producto. La columna de producto_papel conserva el
  // nombre tamano_prod, pero ahora contiene el id numérico.
  idcat_tamano_producto: number | null;
  tamanoProdNombre: string;

  // Resultado calculado en el frontend y guardado en
  // producto_papel.costo_laminado.
  costoLaminado: number | null;

  // NUEVO (Fase 2/3): productos especiales. Con esEspecial = true, el
  // producto se arma con N componentes (cada uno con su propia ruta de
  // procesos y, opcionalmente, su propio suaje/acabados/maquinaria) en vez
  // del suaje/acabados/maquinaria "sueltos" de arriba — ver
  // modulo-productos-especiales.html, sección "Modelo de datos". Con
  // esEspecial = false (caso normal, default) componentes se queda vacío y
  // nada de este bloque cambia el comportamiento existente.
  esEspecial: boolean;
  componentes: ComponentePapel[];
}

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
  tamano_asa_default: string | null;
  tamano_prod: number | null;
  tamano_prod_nombre: string | null;
  origen_expo: boolean;
  completitud_pct: number;
  costo_laminado: number | null;

  // NUEVO (reestructura de especiales, Fase 5): antes ningún endpoint de
  // listado exponía esto — hacía falta para que Papel.tsx y ProductoEspecial.tsx
  // puedan mostrar cada quien solo lo suyo a partir del mismo GET
  // /productos-papel. Ver getProductosPapel en producto_papel.controller.ts.
  es_especial: boolean;
}

export const newHojeado = (): Hojeado => ({
  bobina: "",
  corte: "",
  rendimiento: "",
  guillotina: "",
  hilo: "",
  bobinaExtra: "",
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
  idComponenteAsignado: null,
  ancho: "",
  fuelle: "",
  altura: "",
  medida: "",
  metodoPreparacion: "",
});

export const newGrupo = (): GrupoPapel => ({
  id: Date.now() + Math.random(),
  materiales: [],
  draft: newMaterial(),
  precioSugerido: "",
});

export const newSuaje = (): Suaje => ({
  numero: "",
  pzs: "",
  tamano: "",
  corte1Tipo: "",
  corte1Medida: "",
  idcat_corte: null,
  idcat_punto_corte: null,
  puntosCorte: "",
  dobles1Tipo: "",
  dobles1Medida: "",
  idcat_doble: null,
  idcat_punto_doble: null,
  puntosDoble: "",
  metros: "",
  matrix: "",
  idcat_matrix: null,
  tiempoArreglo: "",
  idcat_sacabocados: null,
  sacabocadoNombre: "",
  cantidad_sacabocado: "",
  idcat_perforado: null,
  perforadoNombre: "",
  cantidad_perforado: "",
  herramentalDesbarbe: false,
  noDesbarbe: "",
});

export const newAcabados = (): Acabados => ({
  idcat_tipo_pegado: null,
  idcat_pegamento: null,
  laminados: [],
  laminadosNombres: [],
  idrollo_lam: null,
  rolloLamNombre: "",
  desarrolloLaminado: "",
  asas: [],
  asasNombres: [],
  idcat_refuerzo_material: null,
  idcat_refuerzo_medidas: null,
  refuerzoMedidaNombre: "",
  idcat_base_material: null,
  base_medida: "",
  idcat_empaque: null,
  pzs_caja: "",
  llevaUv: false,
  llevaAltoRelieve: false,
  llevaTextura: false,
  llevaHotStamping: false,
});

export const newMaquinaria = (): Maquinaria => ({
  hojeado_guillotina: [],
  hojeado_guillotina_nombres: [],
  impresora: [],
  impresora_nombres: [],
  hs_ar: [],
  hs_ar_nombres: [],
  suaje_maquina: [],
  suaje_maquina_nombres: [],
  uv: [],
  uv_nombres: [],
  laminado_maquina: [],
  laminado_maquina_nombres: [],
  texturizadora: [],
  texturizadora_nombres: [],
  empaque_maquina: [],
  empaque_maquina_nombres: [],
  empalme: [],
  empalme_nombres: [],
  armado: [],
  armado_nombres: [],
  asas_maquina: [],
  asas_maquina_nombres: [],
  desbarbe: [],
  desbarbe_nombres: [],
});

export const newComponenteProceso = (): ComponenteProceso => ({
  id: Date.now() + Math.random(),
  idproceso_cat: null,
  procesoNombre: "",
  orden: 1,
  observaciones: "",
  materiales: [],
});

export const newComponente = (): ComponentePapel => ({
  id: Date.now() + Math.random(),
  tipo: "unica",
  orden: 1,
  nombre: "",
  esUnion: false,
  procesos: [],
  suaje: newSuaje(),
  acabados: newAcabados(),
  maquinaria: newMaquinaria(),
});

export const newProductoForm = (): ProductoPapelForm => ({
  idcat_tipo_producto_papel: null,
  tipoProductoNombre: "",
  descripcion: "",
  ancho: "",
  fuelle: "",
  altura: "",
  medida: "",
  grupos: [newGrupo()],
  suaje: newSuaje(),
  acabados: newAcabados(),
  maquinaria: newMaquinaria(),
  tamanoAsaDefault: "",
  idcat_tamano_producto: null,
  tamanoProdNombre: "",
  costoLaminado: null,
  esEspecial: false,
  componentes: [],
});