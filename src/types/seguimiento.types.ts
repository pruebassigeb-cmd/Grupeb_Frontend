export interface PedidoSeguimiento {
  idsolicitud:         number;
  no_pedido:           string;
  no_cotizacion:       string | null;
  fecha:               string;
  prioridad:           boolean;
  cliente:             string;
  tipo_producto:       string;
  impresion:           string;
  anticipo_requerido:  number;
  anticipo_pagado:     number;
  anticipo_cubierto:   boolean;
  pago_completo:       boolean;
  saldo_venta:         number | null;
  diseno_estado_id:    number;
  diseno_aprobado:     boolean;
  no_produccion:       string | null;
  idproduccion:        number | null;
  puede_pdf:           boolean;
  extrusion_estado:    string;
  impresion_estado:    string;
  bolseo_estado:       string;
  asa_flexible_estado: string;

  // Fechas de referencia por proceso
  extrusion_fecha_estado:    string | null;
  impresion_fecha_estado:    string | null;
  bolseo_fecha_estado:       string | null;
  asa_flexible_fecha_estado: string | null;

  // Fechas para columnas administrativas
  anticipo_fecha_estado: string | null;
  pago_fecha_estado:     string | null;
  diseno_fecha_estado:   string | null;
  od_fecha_estado:       string | null;
  envio_fecha_estado:    string | null;

  nombre_producto:     string;
  medida:              string;
  altura:              string;
  ancho:               string;
  fuelle_fondo:        string;
  fuelle_lat_iz:       string;
  fuelle_lat_de:       string;
  refuerzo:            string;
  material:            string;
  calibre:             string;
  tintas:              number | null;
  caras:               number | null;
  pigmentos:           string | null;
  pantones:            string | null;
  observacion:         string | null;
  perforacion:         boolean;
  descripcion:         string | null; // ← NUEVO: identificador diferenciador del producto
  bk:                  boolean | null;
  foil:                boolean | null;
  asa_suaje:           string | null;
  id_color:            number | null;
  color_asa_nombre:    string | null;
  id_medidatro:        number | null;
  medida_troquel:      string | null;
  cantidad_orden:      number | null;
  kilogramos_orden:    number | null;
  modo_cantidad:       string;
  kilos:               number | null;
  kilos_merma:         number | null;
  pzas:                number | null;
  pzas_merma:          number | null;
  metros_merma:        number | null;

  // Orden de Diseño
  idorden_diseno:      number | null;
  od_estado:           "en_revision" | "aprobado" | "rechazado" | null;
  es_parcialidad:         boolean;
}