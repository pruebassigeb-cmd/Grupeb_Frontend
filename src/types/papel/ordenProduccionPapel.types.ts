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
  | "empaque_papel"
  // NUEVOS (Fase 1/2, productos especiales -- ver fase1_productos_especiales_up.sql
  // y fase2_procesos_nuevos_y_repeticion_up.sql). Se agregan aquí porque
  // procesosAplicanDesdeProducto() (ordenProduccionPapelPdf.helpers.ts) filtra
  // CUALQUIER clave que no esté en este union type -- sin esto, la ruta real de
  // una OP de unión con Litolaminado llegaba vacía al PDF (a veces vaciando
  // procesos_aplican por completo y tumbando validarProductoPapelParaPdf).
  | "litolaminado_papel"
  | "desbarbe_papel"
  | "pegado_papel"
  | "especial_papel";

// CORREGIDO: "hojeado_guillotina" se partió en dos claves independientes
// ("hojeadora" y "guillotina") desde que el producto puede registrar una
// máquina de cada tipo por separado (ver cotizacionPapel.helper.ts /
// FormularioProductoPapelAlta.tsx). maquinaria_seleccionada ahora llega
// con esas dos claves en vez de la combinada.
export type ClaveMaquinariaPapel =
  | "hojeadora"
  | "guillotina"
  | "impresora"
  | "laminado_maquina"
  | "uv"
  | "hs_ar"
  | "texturizadora"
  | "suaje_maquina"
  | "armado"
  | "empaque_maquina"
  // NUEVOS: litolaminado y desbarbe sí tienen catálogo de máquina propio
  // (maquinaria_empalme / maquinaria_desbarbe -- ver
  // MAQUINARIA_COMPONENTE_POR_TABLA en procesosPapel.controller.ts). Pegado y
  // Especial NO tienen catálogo (pegado_papel.maquina es texto libre capturado
  // en planta; especial_papel no lleva máquina) -- se dejan las claves de
  // todos modos para que CLAVE_MAQUINA_POR_PROCESO_PAPEL tenga un valor por
  // cada proceso; maquinaria_seleccionada nunca trae esas dos claves desde el
  // backend, así que obtenerMaquinaProcesoPapel() regresa null sin problema y
  // el PDF cae al valor capturado en vivo (registro.maquina).
  | "empalme"
  | "desbarbe"
  | "pegado"
  | "especial";

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

  // DEPRECATED: ya no se elige/deriva en el sistema (Hojeado/Guillotina
  // se decide físicamente en producción). Se deja opcional para no
  // romper lecturas de datos históricos; siempre llega null en adelante.
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

  // Cantidad pedida + merma congelada de la orden
  // (orden_produccion_merma.cantidad_a_producir). CORREGIDO (2026-08-21):
  // ya NO alimenta el cálculo de pliegos — la merma se suma sobre los
  // cortes, no sobre la cantidad (ver merma_total abajo). Se conserva solo
  // como dato informativo para las celdas visibles "con Merma" del PDF (ver
  // filaMerma en generarPdfOrdenProduccionPapel.ts). La celda "Cantidad"
  // sigue mostrando `cantidad` sin merma. Null si la orden no tiene
  // snapshot (anteriores al sistema, o aún no congelada).
  cantidad_produccion?: number | null;
  /** Merma congelada de la orden, en pliegos de máquina. Se suma a `cortes`. */
  merma_total?: number | null;
  /** cortes + merma_total, ya calculado por el backend. */
  cortes_con_merma?: number | null;
  /** pliegos_hojeado x hoj_rendimiento, tras subir los pliegos a entero. */
  maquina_hojeado_calculada?: number | null;
  /** pliegos_guillotina x rendimiento, tras subir los pliegos a entero. */
  maquina_guillotina_calculada?: number | null;
  // PZS del suaje (alta de producto, sección Suaje) -- paso intermedio
  // obligatorio antes de dividir entre rendimiento: cortes = cantidad
  // pedida / piezas_suaje. Ver calcularCortes() en este mismo archivo.
  piezas_suaje?: number | null;
  cantidad_con_merma?: number | null;
  cantidad_hojeada_con_merma?: number | null;
  pliegos_con_merma?: number | null;

  bobina_cm?: number | string | null;
  bobina_laminacion_cm?: number | string | null;
  desarrollo_mm?: number | string | null;
  desarrollo_laminacion_mm?: number | string | null;
  ctes_mod?: string | null;
  ctes_mod_laminacion?: string | null;
  // Lo que hay que surtir de verdad: piezas de guillotina (pliegos enteros x
  // rendimiento) x desarrollo. Incluye la merma congelada de la orden.
  metros_laminacion_estimados?: number | null;
  rollos_laminacion_estimados?: number | null;
  // Consumo teórico del pedido, sin merma — solo referencia para cotejar con
  // el cálculo a mano del cliente. Nunca es la cantidad a comprar.
  metros_laminacion_sin_merma?: number | null;
  rollos_laminacion_sin_merma?: number | null;

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

  // ── Especiales, sólo OP de UNIÓN: piezas finales de cada OP de inicio
  // hermana (último proceso de cada una), calculadas en
  // seguimiento.controller.ts vía piezasFinalesHermanasPapel(). Se usan
  // para mostrar/entrar como "entrada" del primer proceso de la unión.
  piezas_finales_hermanas?: {
    idproduccion: number;
    no_produccion: string | null;
    idcomponente_papel: number | null;
    componente_nombre: string | null;
    proceso_final_tabla: string | null;
    proceso_final_nombre: string | null;
    cantidad_entregada: number | null;
    terminado: boolean;
  }[];
  piezas_finales_total?: number | null;

  [key: string]: unknown;
}