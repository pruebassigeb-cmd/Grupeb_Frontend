// ============================================================
// DETALLE DE COTIZACIÓN / PEDIDO
// ============================================================
export interface DetalleCotizacion {
  iddetalle:     number;
  cantidad:      number;
  precio_total:  number;
  aprobado:      boolean | null;
  kilogramos?:   number | null;
  modo_cantidad: "unidad" | "kilo";
}

// ============================================================
// MEDIDAS INDIVIDUALES DEL PRODUCTO
// ============================================================
export interface MedidasProducto {
  altura:         string;
  ancho:          string;
  fuelleFondo:    string;
  fuelleLateral1: string;
  fuelleLateral2: string;
  refuerzo:       string;
  solapa:         string;
}

// ============================================================
// PRODUCTO EN COTIZACIÓN / PEDIDO
// ============================================================
export interface ProductoCotizacion {
  idcotizacion:          number;
  idcotizacion_producto: number;
  producto_id:           number;

  nombre:             string;
  material:           string;
  calibre:            string;
  medidasFormateadas: string;
  medidas:            MedidasProducto;

  tintas: number;
  caras:  number;

  bk?:       boolean | null;
  foil?:     boolean | null;
  alto_rel?: boolean | null;
  laminado?: boolean | null;
  uv_br?:    boolean | null;

  pigmentos?: string | null;
  pantones?:  string | null;

  idsuaje?:   number | null;
  asa_suaje?: string | null;

  color_asa_id?:     number | null;
  color_asa_nombre?: string | null;

  observacion?: string | null;
  por_kilo?:    string | null;

  // ── Herramental ──────────────────────────────────────────
  herramental_descripcion?: string | null;
  herramental_precio?:      number | null;
  herramental_aprobado?:    boolean | null;
  herramental_id?:          number | null;

  detalles: DetalleCotizacion[];
  subtotal: number;
}

// ============================================================
// DATOS EXTENDIDOS DEL CLIENTE
// ============================================================
export interface DatosClientePdf {
  celular?:        string | null;
  razon_social?:   string | null;
  rfc?:            string | null;
  domicilio?:      string | null;
  numero?:         string | null;
  colonia?:        string | null;
  codigo_postal?:  string | null;
  poblacion?:      string | null;
  estado_cliente?: string | null;
}

// ============================================================
// COTIZACIÓN COMPLETA
// ============================================================
export interface Cotizacion extends DatosClientePdf {
  no_cotizacion:  string;
  no_pedido?:     string | null;
  tipo_documento: "cotizacion" | "pedido";
  fecha:          string;
  estado_id:      number;
  estado:         string;
  cliente_id:     number;
  cliente:        string;
  telefono:       string;
  correo:         string;
  empresa:        string;
  impresion?:     string | null;
  productos:      ProductoCotizacion[];
  total:          number;
}

// ============================================================
// PEDIDO
// ============================================================
export interface Pedido extends DatosClientePdf {
  no_pedido:      string;
  no_cotizacion?: string | null;
  es_directo:     boolean;
  fecha:          string;
  estado_id:      number;
  estado:         string;
  prioridad:      boolean;
  cliente_id:     number;
  cliente:        string;
  telefono:       string;
  correo:         string;
  empresa:        string;
  impresion?:     string | null;
  productos:      ProductoCotizacion[];
  total:          number;
}

// ============================================================
// TIPOS PARA CREAR COTIZACIÓN / PEDIDO
// ============================================================
export interface DetalleCrearCotizacion {
  cantidad:               number;
  precio_total:           number;
  modo_cantidad:          "unidad" | "kilo";
  kilogramos_ingresados?: number | null;
}

export interface ProductoEnviarCotizacion {
  productoId:    number;
  tintasId:      number;
  carasId:       number;
  idsuaje?:      number | null;
  colorAsaId?:   number | null;
  observacion?:  string | null;
  pigmentos?:    string | null;
  pantones?:     string | null;
  porKilo?:      string | null;
  herramental_descripcion?: string | null;
  herramental_precio?:      number | null;
  detalles:      DetalleCrearCotizacion[];
}

// ============================================================
// RESPUESTA AL CREAR COTIZACIÓN
// ============================================================
export interface RespuestaCrearCotizacion {
  message:        string;
  no_cotizacion?: string;
  no_pedido?:     string;
  tipo:           "cotizacion" | "pedido";
}

// ============================================================
// RESPUESTA AL ACTUALIZAR ESTADO (con posible conversión)
// ============================================================
export interface RespuestaActualizarEstado {
  message:             string;
  convertida_a_pedido: boolean;
  no_pedido:           string | null;
}