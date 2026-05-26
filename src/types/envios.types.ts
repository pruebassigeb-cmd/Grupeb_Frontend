// ==========================
// UNIDADES
// ==========================
export interface Unidad {
  idunidad:     number;
  tipo:         string;
  marca:        string;
  modelo:       string;
  placa:        string;
  num_serie?:   string;
  num_motor?:   string;
  color?:       string;
  propietario?: string;
  activo:       boolean;
  created_at?:  string;
}

export interface CreateUnidadRequest {
  tipo:         string;
  marca:        string;
  modelo:       string;
  placa:        string;
  num_serie?:   string;
  num_motor?:   string;
  color?:       string;
  propietario?: string;
}

export interface UpdateUnidadRequest extends CreateUnidadRequest {
  activo?: boolean;
}

// ==========================
// PAQUETERÍAS
// ==========================
export interface Paqueteria {
  idpaqueteria: number;
  nombre:       string;
  telefono?:    string | null;
  sitioweb?:    string | null;
  calle?:       string | null;
  numero?:      string | null;
  colonia?:     string | null;
  cp?:          string | null;
  poblacion?:   string | null;
  estado?:      string | null;
  activo:       boolean;
  created_at?:  string;
}

export interface CreatePaqueteriaRequest {
  nombre:    string;
  telefono?: string;
  sitioweb?: string;
  calle?:    string;
  numero?:   string;
  colonia?:  string;
  cp?:       string;
  poblacion?: string;
  estado?:   string;
}

export interface UpdatePaqueteriaRequest extends CreatePaqueteriaRequest {
  activo?: boolean;
}

// ==========================
// CONDUCTORES
// ==========================
export interface Conductor {
  idusuario: number;
  nombre:    string;
  apellido:  string;
  telefono?: string;
  rol:       string;
}

// ==========================
// PEDIDOS DISPONIBLES
// ==========================
export interface PedidoDisponible {
  idsolicitud:              number;
  no_pedido:                string;
  fecha:                    string;
  idclientes:               number;
  empresa:                  string;
  razon_social:             string;
  impresion:                string;
  telefono:                 string;
  celular:                  string;
  calle:                    string;
  numero:                   string;
  colonia:                  string;
  codigo_postal:            string;
  poblacion:                string;
  estado:                   string;
  referencia_envio?:        string | null;
  total_bultos:             number;
  bultos_enviados:          number;
  bultos_pendientes:        number;
  estado_envio:             "sin_iniciar" | "parcial" | "completo";
  completado_recientemente: boolean;
}

// ==========================
// BULTOS DE UN PEDIDO
// ==========================
export interface BultoPedido {
  idbulto:           number;
  cantidad_unidades: number | null;
  peso_producto:     number | null;
  peso:              number | null;
  alto:              number | null;
  largo:             number | null;
  ancho:             number | null;
  fecha_creacion:    string;
  proceso_origen:    "bolseo" | "asa_flexible";
  no_produccion:     string;
  nombre_producto:   string;
  medida:            string;
  estado_bulto:      "sin_enviar" | "preparando" | "en_camino" | "entregado";
  idenvio:           number | null;
  estado_envio:      string | null;
}

// ==========================
// ENVÍO
// ==========================
export interface Envio {
  idenvio:                number;
  tipo:                   "local" | "paqueteria" | "recoleccion";
  estado:                 "preparando" | "en_camino" | "entregado";
  es_parcialidad:         boolean;
  numero_guia:            string | null;
  costo_flete:            number | null;
  fecha_envio:            string;
  fecha_entrega_estimada: string | null;
  observaciones:          string | null;
  chofer:                 { idusuario: number; nombre: string } | null;
  unidad:                 { idunidad: number; nombre: string }  | null;
  paqueteria:             { idpaqueteria: number; nombre: string } | null;
  total_bultos:           number;
}

export interface CreateEnvioRequest {
  idsolicitud:              number;
  tipo:                     "local" | "paqueteria" | "recoleccion";
  usuarios_idusuario?:      number;
  unidades_idunidad?:       number;
  paqueteria_idpaqueteria?: number;
  numero_guia?:             string;
  costo_flete?:             number;
  fecha_entrega_estimada?:  string;
  observaciones?:           string;
  bultos_ids:               number[];
}

// ==========================
// BITÁCORA
// ==========================
export interface BitacoraRegistro {
  idbitacora:        number;
  fecha:             string;
  hora_salida:       string | null;
  hora_llegada:      string | null;
  observacion:       "E" | "RA" | "RD" | "PD" | null;
  observacion_extra: string | null;
  firma:             string | null;
  created_at:        string;
  updated_at:        string;
  envio: {
    idenvio:        number;
    tipo:           string;
    estado:         string;
    numero_guia:    string | null;
    es_parcialidad: boolean;
  };
  no_pedido: string;
  cliente:   string;
  chofer: {
    idusuario: number;
    nombre:    string;
  } | null;
  unidad: {
    idunidad: number;
    tipo:     string;
    nombre:   string;
  } | null;
}

export interface UpdateBitacoraRequest {
  hora_salida?:       string;
  hora_llegada?:      string;
  observacion?:       "E" | "RA" | "RD" | "PD";
  observacion_extra?: string;
  firma?:             string;
}

export interface EnvioPaqueteria {
  idenvio:                number;
  estado:                 "preparando" | "en_camino" | "entregado";
  es_parcialidad:         boolean;
  numero_guia:            string | null;
  costo_flete:            number | null;
  fecha_envio:            string;
  fecha_entrega_estimada: string | null;
  observaciones:          string | null;
  no_pedido:              string;
  cliente:                string;
  empresa:                string;
  paqueteria: {
    idpaqueteria: number;
    nombre:       string;
  };
  total_bultos: number;
}

// ==========================
// RECOLECCIÓN
// ==========================
export interface RecoleccionDatos {
  nombre_quien_recogio: string;
  empresa:              string | null;
  unidad_marca:         string | null;
  unidad_modelo:        string | null;
  unidad_placas:        string | null;
  tiene_foto:           boolean;
  foto_s3_key:          string | null;
  fecha_recogido:       string | null;
}

export interface EnvioRecoleccion {
  idenvio:                number;
  estado:                 "preparando" | "entregado";
  es_parcialidad:         boolean;
  fecha_envio:            string;
  fecha_entrega_estimada: string | null;
  observaciones:          string | null;
  no_pedido:              string;
  cliente:                string;
  empresa:                string;
  total_bultos:           number;
  idbitacora:             number | null;
  recoleccion_datos:      RecoleccionDatos | null;
}

// ==========================
// CARRITO
// ==========================
export type TipoEnvioCarrito = "local" | "paqueteria" | "recoleccion";
export type TipoEnvioCarritoSeleccion = TipoEnvioCarrito | null;

export interface CarritoBulto {
  idcarrito:               number;
  idbulto:                 number;
  nombre_producto:         string;
  medida:                  string;
  cantidad_unidades:       number | null;
  peso_producto:           number | null;
  peso:                    number | null;
  alto:                    number | null;
  largo:                   number | null;
  ancho:                   number | null;
  proceso_origen:          "bolseo" | "asa_flexible";
  agregado_por:            string;
  tipo_envio:              TipoEnvioCarritoSeleccion;
  paqueteria_idpaqueteria: number | null;
  paqueteria_nombre:       string | null;
}

export interface CarritoPedido {
  idsolicitud: number;
  no_pedido:   string;
  cliente:     string;
  tipo_envio:  TipoEnvioCarrito | null;
  bultos:      CarritoBulto[];
}

export interface ProcesarCarritoRequest {
  usuarios_idusuario?:     number;
  unidades_idunidad?:      number;
  costo_flete?:            number;
  fecha_entrega_estimada?: string;
  observaciones?:          string;
  pedidos: {
    idsolicitud: number;
    tipo_envio:  TipoEnvioCarrito;
    bultos: {
      idbulto:                 number;
      paqueteria_idpaqueteria: number | null;
    }[];
  }[];
}

// ==========================
// CATÁLOGO PRODUCTOS SAT
// ==========================
export interface ProductoSat {
  idproducto_sat: number;
  clave:          string;
  descripcion:    string;
}

// ==========================
// GUÍA GENERAL PAQUETERÍA
// ==========================
export interface GuiaPaqueteriaGeneral {
  idenvio:       number;
  no_pedido:     string;
  fecha_envio:   string;
  total_bultos:  number;
  paqueteria:    string;
  observaciones: string | null;
  remitente: {
    nombre_empresa: string;
    razon_social:   string;
    rfc:            string;
    telefonos:      string;
    domicilio:      string;
    colonia:        string;
    ciudad:         string;
    estado:         string;
    codigo_postal:  string;
  };
  destinatario: {
    nombre:        string;
    impresion:     string;
    rfc:           string;
    telefonos:     string;
    domicilio:     string;
    colonia:       string;
    ciudad:        string;
    estado:        string;
    codigo_postal: string;
    correo:        string;
  };
  bultos: {
    idbulto:            number;
    nombre_producto:    string;
    medida:             string;
    cantidad_unidades:  number | null;
    peso:               number | null;
    alto:               number | null;
    largo:              number | null;
    ancho:              number | null;
    clave_producto_sat: string;
    clave_unidad_sat:   string;
  }[];
}

// ==========================
// NOTA DE REMISIÓN MULTI-PEDIDO
// ==========================
export interface NotaRemisionMultiData {
  idnota:       number;
  no_nota:      string;
  created_at:   string;
  es_multi:     true;
  tipo_entrega: "recoleccion" | "local";
  chofer: { nombre: string } | null;
  unidad: { nombre: string } | null;
  envio: {
    idenvio:       null;
    tipo:          string;
    fecha_envio:   string;
    no_pedido:     string;
    observaciones: null;
  };
  cliente: {
    nombre:    string;
    rfc:       string;
    direccion: string;
  };
  pedidos: {
    idsolicitud: number;
    no_pedido:   string;
    idenvio:     number;
  }[];
  productos: {
    nombre_producto: string;
    medida:          string;
    no_pedido:       string;
    total_bultos:    number;
    total_unidades:  number | null;
    total_kg:        number | null;
  }[];
}

export interface NotaRemisionRecoleccionDatos {
  nombre_quien_recogio: string;
  empresa:              string | null;
  unidad_marca:         string | null;
  unidad_modelo:        string | null;
  unidad_placas:        string | null;
  fecha:                string | null;
}

export interface NotaRemisionLocalDatos {
  hora_salida:       string | null;
  hora_llegada:      string | null;
  observacion:       string | null;
  observacion_extra: string | null;
  firma:             string | null;
}

export interface NotaRemisionBitacoraItem {
  idnota:            number;
  no_nota:           string;
  created_at:        string;
  es_multi:          boolean;
  tipo_entrega:      "recoleccion" | "local";
  estado:            "pendiente" | "entregado";
  no_pedido:         string;
  cliente:           string;
  total_pedidos:     number;
  total_bultos:      number;
  recoleccion_datos: NotaRemisionRecoleccionDatos | null;
  local_datos:       NotaRemisionLocalDatos | null;
  chofer: { idusuario: number; nombre: string } | null;
  unidad: { idunidad: number; nombre: string } | null;
}

// ==========================
// FILTROS
// ==========================
export interface FiltrosHistorialLocal {
  fecha_inicio?: string;
  fecha_fin?:    string;
  idunidad?:     number;
  idusuario?:    number;
  no_pedido?:    string;
  cliente?:      string;
}

export interface FiltrosHistorialPaqueteria {
  fecha_inicio?: string;
  fecha_fin?:    string;
  idpaqueteria?: number;
  numero_guia?:  string;
  no_pedido?:    string;
  cliente?:      string;
  estado?:       "preparando" | "en_camino" | "entregado";
}

// ==========================
// REGISTROS HISTORIAL
// ==========================
export interface HistorialLocalItem {
  idbitacora:        number;
  fecha:             string;
  hora_salida:       string | null;
  hora_llegada:      string | null;
  observacion:       "E" | "RA" | "RD" | "PD" | null;
  observacion_extra: string | null;
  firma:             string | null;
  idenvio:           number;
  estado:            "preparando" | "en_camino" | "entregado";
  es_parcialidad:    boolean;
  no_pedido:         string;
  cliente:           string;
  total_bultos:      number;
  chofer: {
    idusuario: number;
    nombre:    string;
  };
  unidad: {
    idunidad: number;
    tipo:     string;
    nombre:   string;
  };
}

export interface HistorialPaqueteriaItem {
  idenvio:                number;
  estado:                 "preparando" | "en_camino" | "entregado";
  es_parcialidad:         boolean;
  numero_guia:            string | null;
  costo_flete:            number | null;
  fecha_envio:            string;
  fecha_entrega_estimada: string | null;
  observaciones:          string | null;
  no_pedido:              string;
  cliente:                string;
  total_bultos:           number;
  paqueteria: {
    idpaqueteria: number;
    nombre:       string;
  };
}

// ==========================
// REMISIONES
// ==========================
export interface ClienteRemision {
  idclientes:    number;
  nombre:        string;
  empresa:       string;
  total_pedidos: number;
}

export interface ProductoPedidoRemision {
  idsolicitud_producto:    number;
  nombre_producto:         string;
  medida:                  string;
  modo_cantidad:           "unidad" | "kilo";
  cantidad_total:          number | null;
  kg_total:                number | null;
  cantidad_entregada:      number;
  total_bultos_producidos: number;
  bultos_entregados:       number;
}

export interface PedidoRemision {
  idsolicitud: number;
  no_pedido:   string;
  fecha:       string;
  productos:   ProductoPedidoRemision[];
}

export interface EntregaRemision {
  idenvio:            number;
  tipo:               string;
  estado:             string;
  es_parcialidad:     boolean;
  fecha_envio:        string;
  numero_guia:        string | null;
  observaciones:      string | null;
  total_bultos:       number;
  cantidad_entregada: number;
  modo_cantidad:      "unidad" | "kilo";
  productos:          string;
  medidas:            string;
  nota_no:            string | null;
  nota_id:            number | null;
  es_multi:           boolean;
}

export interface HistorialEntregasPedido {
  idsolicitud:     number;
  entregas:        EntregaRemision[];
  total_entregas:  number;
  total_entregado: number;
  total_bultos:    number;
}