export type NombreProcesoOrdenPapel =
  | "hojeado_papel"
  | "guillotina_papel"
  | "impresion_papel"
  | "laminacion_papel"
  | "barniz_uv_papel"
  | "hot_stamping_papel"
  | "texturizado_papel"
  | "alto_relieve_papel"
  | "suaje_produccion_papel"
  | "armado_papel"
  | "empaque_papel";

export type ClaveMaquinariaPapel =
  | "hojeado_guillotina"
  | "impresora"
  | "laminado_maquina"
  | "uv"
  | "hs_ar"
  | "texturizadora"
  | "suaje_maquina"
  | "armado"
  | "empaque_maquina";

export interface MaquinaSeleccionadaPapel {
  id: number;
  nombre: string;
}

export type MaquinariaSeleccionadaPapel = Partial<
  Record<ClaveMaquinariaPapel, MaquinaSeleccionadaPapel | null>
>;

export interface ProcesoOrdenPapelPdf {
  key: NombreProcesoOrdenPapel;
  etiqueta: string;
  aplica: boolean;
  maquina: string | null;
}

export interface ProcesoPapelRuntime {
  maquina?: string | null;
  maquinaria_idmaquinaria?: number | null;

  cantidad_hojeado?: number | string | null;
  cantidad_entregada?: number | string | null;
  pliegos?: number | string | null;
  cortes?: number | string | null;

  pliegos_entrada?: number | string | null;
  pliegos_entregados?: number | string | null;
  merma?: number | string | null;

  bobina_cm?: number | string | null;
  metros?: number | string | null;
  rollos?: number | string | null;
  desarrollo_mm?: number | string | null;
  ctes_mod?: string | null;

  suaje_idsuaje_papel?: number | string | null;

  bolsas_armadas?: number | string | null;
  bolsas_entregadas?: number | string | null;
  bolsas_entrada?: number | string | null;
  bolsas_entregadas_final?: number | string | null;
  revision?: number | string | null;

  observaciones?: string | null;
  observaciones_calidad?: string | null;

  [key: string]: unknown;
}

export type ProcesosPapelRuntimeMap = Partial<
  Record<NombreProcesoOrdenPapel, ProcesoPapelRuntime | null>
>;

export type ProductoOrdenPapel = OrdenProduccionPapelData;

export interface OrdenProduccionPapelData {
  tipo_material?: "papel";

  no_pedido: string;
  no_produccion?: string | null;
  fecha?: string | null;
  fecha_entrega?: string | null;
  prioridad?: boolean;
  cliente?: string | null;
  empresa?: string | null;
  impresion?: string | null;

  idsolicitud_producto?: number;
  idproduccion?: number | null;
  fecha_produccion?: string | null;
  fecha_aprobacion_diseno?: string | null;
  observaciones_diseno?: string | null;
  tiene_orden?: boolean;

  nombre_producto?: string | null;
  descripcion?: string | null;
  categoria?: string | null;
  material?: string | null;
  calibre?: string | null;
  medida?: string | null;
  altura?: string | null;
  ancho?: string | null;
  fuelle?: string | null;
  fuelle_fondo?: string | null;
  fuelle_lat_iz?: string | null;
  fuelle_lat_de?: string | null;
  refuerzo?: string | null;
  medidas?: Record<string, string>;

  cantidad?: number | null;
  kilogramos?: number | null;
  modo_cantidad?: "unidad" | "kilo" | string;

  metodo_hojeado?: "hojeado" | "guillotina" | null;
  lleva_armado?: boolean;
  procesos_aplican?: NombreProcesoOrdenPapel[];
  maquinaria_seleccionada?: MaquinariaSeleccionadaPapel;

  tintas?: number | null;
  tintasDentro?: number | null;
  tintas_dentro?: number | null;
  tintas_frente?: number | null;
  tintas_reverso?: number | null;
  pantones?: string[] | string | null;
  pantonesDentro?: string[] | string | null;
  pantones_dentro?: string[] | string | null;
  pantones_frente?: string[] | string | null;
  pantones_reverso?: string[] | string | null;

  laminado_nombre?: string | null;
  laminado?: string | null;
  laminado_acabado?: string | null;
  uv?: boolean;
  foil_nombre?: string | null;
  foil?: string | null;
  textura_nombre?: string | null;
  textura?: string | null;
  alto_relieve?: boolean;

  asa_nombre?: string | null;
  asa_tipo?: string | null;
  asa?: string | null;
  asa_suaje?: string | null;
  color_asa_nombre?: string | null;
  asa_color?: string | null;
  asa_medida?: string | null;
  medida_asa?: string | null;
  tamano_asa?: string | null;
  asa_descripcion?: string | null;

  grupo_descripcion?: string | null;
  pliego?: string | null;
  pliego_hojeado?: string | null;
  pliegos_guillotina?: string | number | null;
  rendimiento?: string | number | null;
  rendimiento_guillotina?: string | number | null;
  corte?: string | null;
  corte_guillotina?: string | null;
  cortes?: string | number | null;

  hoj_bobina?: string | null;
  hoj_bobina_extra?: string | null;
  hoj_corte?: string | null;
  hoj_rendimiento?: string | number | null;
  hoj_guillotina?: string | null;
  hoj_hilo?: string | null;
  hojeado?: string | null;
  rendimiento_hojeado?: string | number | null;

  cantidad_hojeada_calculada?: number | null;
  pliegos_impresion_estimados?: number | null;
  material_impresion?: string | null;

  bobina_cm?: number | string | null;
  bobina_laminacion_cm?: number | string | null;
  desarrollo_mm?: number | string | null;
  desarrollo_laminacion_mm?: number | string | null;
  ctes_mod?: string | null;
  ctes_mod_laminacion?: string | null;
  metros_laminacion_estimados?: number | null;
  rollos_laminacion_estimados?: number | null;

  tipo_pegue?: string | null;
  tipo_pegado?: string | null;
  pegamento?: string | null;
  suaje?: string | number | null;
  suaje_nombre?: string | number | null;
  numero_suaje?: string | number | null;
  suaje_tamano?: string | null;
  matrix?: string | null;

  base_medida?: string | null;
  base?: string | null;
  refuerzo_material?: string | null;
  refuerzo_medida?: string | null;
  maquina_armado_pdf?: "Manual" | string;
  bolsas_armadas_calculadas?: number | null;

  tipo_caja?: string | null;
  empaque?: string | null;
  cantidad_por_caja?: number | null;
  pzs_caja?: number | null;

  registros_procesos?: ProcesosPapelRuntimeMap;
  procesos_runtime?: ProcesosPapelRuntimeMap;
  procesos_papel?: ProcesosPapelRuntimeMap | null;
  registros_papel?: ProcesosPapelRuntimeMap | null;
  procesos_registros?: ProcesosPapelRuntimeMap | null;

  url_render?: string | null;
  url_master?: string | null;

  [key: string]: unknown;
}
