export interface PedidoSeguimiento {
  no_pedido:          number;
  fecha:              string;
  cliente:            string;
  tipo_producto:      string;

  anticipo_requerido: number;
  anticipo_pagado:    number;
  anticipo_cubierto:  boolean;
  pago_completo:      boolean;

  diseno_estado_id:   number;
  diseno_aprobado:    boolean;

  no_produccion:      string | null;
  idproduccion:       number | null;
  puede_pdf:          boolean;

  extrusion_estado:    string;
  impresion_estado:    string;
  bolseo_estado:       string;
  asa_flexible_estado: string;

  // Datos del producto para el operador
  nombre_producto:  string;
  medida:           string;
  altura:           string;
  ancho:            string;
  fuelle_fondo:     string;
  fuelle_lat_iz:    string;
  fuelle_lat_de:    string;
  refuerzo:         string;
  material:         string;
  calibre:          string;
  tintas:           number | null;
  caras:            number | null;
  pigmentos:        string | null;
  pantones:         string | null;
  observacion:      string | null;
  bk:               boolean | null;
  foil:             boolean | null;
  asa_suaje:        string | null;
  cantidad_orden:   number | null;
  kilogramos_orden: number | null;
  modo_cantidad:    string;
}