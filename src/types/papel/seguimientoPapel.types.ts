// ─────────────────────────────────────────────────────────────────────────
// TIPOS — Seguimiento de Producción de Papel
// Espejo de seguimiento.types.ts (plástico), pero con los campos propios
// de papel. PedidoSeguimientoPapel reutiliza los campos base que ya trae
// PedidoSeguimiento (no_pedido, cliente, fecha, etc.) y agrega los que
// necesita el modal de papel para mostrar la ficha del producto.
// ─────────────────────────────────────────────────────────────────────────

export interface PedidoSeguimientoPapel {
  idsolicitud: number;
  no_pedido: string;
  no_cotizacion: string | null;
  fecha: string;
  prioridad: boolean;
  cliente: string;
  empresa?: string;
  tipo_producto: string; // "papel"
  impresion: string;

  no_produccion: string | null;
  idproduccion: number | null;
  puede_pdf: boolean;

  // ── Columnas de plástico (Ext/Imp/Bol/Asa) — el backend siempre las
  // manda fijas en "no-aplica"/null para filas de papel, porque
  // Seguimiento.tsx reutiliza el mismo tipo base PedidoSeguimiento.
  // No se usan para nada en el flujo de papel; se declaran solo para que
  // el tipo refleje la forma real del dato que llega del backend.
  extrusion_estado?: string;
  impresion_estado?: string;
  bolseo_estado?: string;
  asa_flexible_estado?: string;
  extrusion_fecha_estado?: string | null;
  impresion_fecha_estado?: string | null;
  bolseo_fecha_estado?: string | null;
  asa_flexible_fecha_estado?: string | null;

  // ── Estado resumido de producción de papel ──
  // Calculado por el backend (getSeguimiento) a partir de
  // orden_produccion.idestado_produccion_cat + fecha_inicio más reciente
  // entre las 11 tablas de proceso. Esto es lo que pinta el color/estado
  // del botón "📦 Procesos" en la tabla principal — NO confundir con
  // proc.estado (que viene de getProcesosOrdenPapel, por proceso
  // individual dentro del modal selector).
  estado_resumen_papel?: "pendiente" | "proceso" | "finalizado" | "resagado";
  estado_resumen_papel_fecha?: string | null;

  // ── Ficha del producto de papel (PDF: encabezado de la orden) ──
  nombre_producto: string;
  descripcion: string | null;
  material: string | null; // ej "Sulfatada" — viene de detalle_material_papel (idcat_tipo_papel)
  calibre: string | null; // ej "12pts" — detalle_material_papel (idcat_calibre)
  medida: string | null; // ej "40+15x30"
  ancho: string | null;
  fuelle: string | null;
  altura: string | null;
  asa_tipo: string | null; // ej "Cordel" — solicitud_producto_papel.id_asa (FK cat_tipo_asa)
  asa_color: string | null; // ej "Negro" — color_asa.id_color
  asa_medida: string | null; // ej "35cm" — sin campo estructurado en DDL; texto libre
  pegamento: string | null; // ej "Blanco 393 / Hot melt"
  tipo_pegue: string | null; // ej "Fuelle"
  suaje: string | null; // ej "312" — referencia visual, el folio real vive en suaje_papel
  rendimiento: string | null; // ej "0.5"

  // ── Campos de ficha agregados tras corrección del DDL (ddl_papel_produccion_true.sql) ──
  // Estos ya NO se capturan por proceso — el backend los trae por JOIN desde
  // la ficha del producto y se muestran una sola vez, no repetidos por proceso.

  // Hojeado/Guillotina — detalle_material_papel (vía grupo_papel)
  hoj_bobina: string | null; // ej "61 cm"
  hoj_bobina_extra: string | null;
  hoj_corte: string | null; // ej "61x45 cm"
  hoj_rendimiento: string | null; // ej ".5"
  pliego: string | null; // medida del pliego, ej "61x90"

  // Impresión — detalle_material_papel + solicitud_producto / solicitud_producto_papel
  tintas_frente: number | null;
  pantones_frente: string[] | null;
  tintas_dentro: number | null;
  pantones_dentro: string[] | null;

  // Laminación — solicitud_producto_papel.idcat_laminado
  laminado_acabado: string | null; // ej "Mate" | "Brillante"

  // Hot Stamping — solicitud_producto_papel.idfoil (FK a foil)
  foil_nombre: string | null; // ej "Oro Bl45"

  // Texturizado — solicitud_producto_papel.idcat_textura
  textura_nombre: string | null; // ej "Lino 3"

  // Armado — acabados_papel (refuerzo y base) + color_asa
  refuerzo_material: string | null;
  refuerzo_medida: string | null; // ej "4x10"
  base_material: string | null;
  base_medida: string | null; // ej "39.5x14.5"

  // Empaque — acabados_papel.idcat_empaque (tipo de caja) + pzs_caja
  tipo_caja: string | null; // ej "Caja EB 60x40x40"
  cantidad_por_caja: number | null; // ej 150

  cantidad_orden: number | null; // cantidad pedida (bolsas)
  fecha_entrega: string | null;

  // ── Estado general de la orden ──
  anticipo_cubierto: boolean;
  pago_completo: boolean;
  saldo_venta: number | null;
  diseno_aprobado: boolean;
  idorden_diseno: number | null;
  od_estado: "en_revision" | "aprobado" | "rechazado" | null;
}

// ─────────────────────────────────────────────────────────────────────────
// PROCESOS DE PAPEL
// ─────────────────────────────────────────────────────────────────────────

export type NombreProcesoPapel =
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

// Orden de cascada fijo de referencia (el backend filtra a los procesos
// que realmente aplican a cada orden, preservando este orden relativo).
export const ORDEN_CASCADA_PAPEL: NombreProcesoPapel[] = [
  "hojeado_papel",
  "guillotina_papel",
  "impresion_papel",
  "laminacion_papel",
  "barniz_uv_papel",
  "hot_stamping_papel",
  "texturizado_papel",
  "alto_relieve_papel",
  "suaje_produccion_papel",
  "armado_papel",
  "empaque_papel",
];

export const NOMBRES_PROCESO_PAPEL: Record<NombreProcesoPapel, string> = {
  hojeado_papel: "Hojeado",
  guillotina_papel: "Guillotina",
  impresion_papel: "Impresión",
  laminacion_papel: "Laminación",
  barniz_uv_papel: "Barniz UV",
  hot_stamping_papel: "Hot Stamping",
  texturizado_papel: "Texturizado",
  alto_relieve_papel: "Alto Relieve",
  suaje_produccion_papel: "Suaje",
  armado_papel: "Armado",
  empaque_papel: "Empaque",
};

// Último proceso de papel: siempre Empaque (sin excepción, a diferencia de
// plástico que alterna entre bolseo/asa_flexible).
export const ULTIMO_PROCESO_PAPEL: NombreProcesoPapel = "empaque_papel";