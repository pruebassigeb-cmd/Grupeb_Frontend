export type EstadoSeguimiento =
  | "pendiente"
  | "proceso"
  | "finalizado"
  | "resagado"
  | "no-aplica";

export type TipoMaterialSeguimiento = "plastico" | "papel";

export interface PedidoSeguimientoBase {
  idsolicitud: number;
  no_pedido: string;
  no_cotizacion?: string | null;
  fecha: string;
  prioridad: boolean;
  cliente: string;
  empresa?: string | null;
  tipo_producto: string;
  impresion: string;

  anticipo_requerido: number;
  anticipo_pagado: number;
  anticipo_cubierto: boolean;
  pago_completo: boolean;
  saldo_venta: number | null;

  diseno_estado_id: number;
  diseno_aprobado: boolean;
  no_produccion: string | null;
  idproduccion: number | null;
  fecha_habilitacion_orden: string | null;
  puede_pdf: boolean;

  extrusion_estado: EstadoSeguimiento;
  impresion_estado: EstadoSeguimiento;
  bolseo_estado: EstadoSeguimiento;
  asa_flexible_estado: EstadoSeguimiento;

  extrusion_fecha_estado: string | null;
  impresion_fecha_estado: string | null;
  bolseo_fecha_estado: string | null;
  asa_flexible_fecha_estado: string | null;

  anticipo_fecha_estado: string | null;
  pago_fecha_estado: string | null;
  diseno_fecha_estado: string | null;
  od_fecha_estado: string | null;
  envio_fecha_estado: string | null;

  nombre_producto: string;
  medida: string | null;
  altura: string | null;
  ancho: string | null;
  fuelle_fondo: string | null;
  fuelle_lat_iz: string | null;
  fuelle_lat_de: string | null;
  refuerzo: string | null;
  material: string | null;
  calibre: string | null;

  // Seguimiento.tsx lee estos campos en la fila sin discriminar primero
  // entre plástico y papel. Se declaran en el base como opcionales para
  // que el union PedidoSeguimiento sea seguro.
  pigmentos?: string | null;
  pantones?: string[] | string | null;
  observacion?: string | null;
  descripcion?: string | null;
  perforacion?: boolean;
  asa_suaje?: string | null;
  color_asa_nombre?: string | null;
  tintas?: number | null;
  caras?: number | null;

  cantidad_orden?: number | null;
  kilogramos_orden?: number | null;
  modo_cantidad?: "unidad" | "kilo";

  cantidad?: number | null;
  kilogramos?: number | null;
  fecha_entrega?: string | null;
  idorden_diseno?: number | null;
  od_estado?: string | null;
  es_parcialidad?: boolean;

  // Metas/merma de producción — se leen en ModalProcesoIndividual.tsx sin
  // discriminar primero entre plástico y papel, igual que pigmentos/observacion.
  kilos_merma?: number | null;
  pzas_merma?: number | null;
  metros_merma?: number | null;

}

export interface PedidoSeguimientoPlastico extends PedidoSeguimientoBase {
  tipo_material?: "plastico";
  id_color?: number | null;
  id_medidatro?: number | null;
  medida_troquel?: string | null;

  kilos?: number | null;
  pzas?: number | null;
  // kilos_merma, pzas_merma, metros_merma ahora viven en PedidoSeguimientoBase
}

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

export interface MaquinaSeleccionadaPapel {
  id: number;
  nombre: string;
}

export type MaquinariaSeleccionadaPapel = Partial<Record<
  | "hojeado_guillotina"
  | "impresora"
  | "laminado_maquina"
  | "uv"
  | "hs_ar"
  | "texturizadora"
  | "suaje_maquina"
  | "armado"
  | "empaque_maquina",
  MaquinaSeleccionadaPapel | null
>>;

export interface PedidoSeguimientoPapel extends PedidoSeguimientoBase {
  tipo_material: "papel";
  categoria: "Papel" | string;
  estado_resumen_papel?: EstadoSeguimiento;
  estado_resumen_papel_fecha?: string | null;

  descripcion?: string | null;
  observacion?: string | null;

  tintas?: number | null;
  tintas_dentro?: number | null;
  tintasDentro?: number | null;
  tintas_frente?: number | null;
  tintas_reverso?: number | null;
  pantones?: string[] | string | null;
  pantones_dentro?: string[] | string | null;
  pantonesDentro?: string[] | string | null;
  pantones_frente?: string[] | string | null;
  pantones_reverso?: string[] | string | null;

  metodo_hojeado: "hojeado" | "guillotina" | null;
  lleva_armado: boolean;
  procesos_aplican: NombreProcesoOrdenPapel[];
  maquinaria_seleccionada: MaquinariaSeleccionadaPapel;

  laminado_nombre?: string | null;
  laminado?: string | null;
  laminado_acabado?: string | null;
  uv: boolean;
  foil_nombre?: string | null;
  foil?: string | null;
  textura_nombre?: string | null;
  textura?: string | null;
  alto_relieve: boolean;

  asa_nombre?: string | null;
  asa_tipo?: string | null;
  asa?: string | null;
  color_asa_nombre?: string | null;
  asa_color?: string | null;
  asa_medida?: string | null;
  medida_asa?: string | null;
  tamano_asa?: string | null;
  asa_descripcion?: string | null;

  grupo_descripcion?: string | null;
  pliego?: string | null;
  pliego_hojeado?: string | null;
  rendimiento?: number | string | null;
  corte?: string | null;
  hoj_bobina?: string | null;
  hoj_bobina_extra?: string | null;
  hoj_corte?: string | null;
  hoj_rendimiento?: number | string | null;
  hoj_guillotina?: string | null;
  hoj_hilo?: string | null;

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
}

export type PedidoSeguimiento =
  | PedidoSeguimientoPlastico
  | PedidoSeguimientoPapel;