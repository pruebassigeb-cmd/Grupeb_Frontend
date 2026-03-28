export interface MetodoPago {
  idmetodo_pago: number;
  codigo:        string;
  tipo_pago:     string;
}

export interface VentaPago {
  idventa_pago:  number;
  monto:         number;
  es_anticipo:   boolean;
  observacion:   string | null;
  fecha:         string;
  metodo_pago:   string;
  idmetodo_pago: number;
}

export interface Venta {
  idventas:              number;
  solicitud_idsolicitud: number;
  // ── Original — nunca cambia ───────────────────────────────
  subtotal:              number;
  iva:                   number;
  total:                 number;
  // ── Real — calculado con producción final ─────────────────
  subtotal_real:         number | null;
  iva_real:              number | null;
  total_real:            number | null;
  diferencia_total:      number | null;
  // ── Pagos ─────────────────────────────────────────────────
  anticipo:              number;
  saldo:                 number;
  abono:                 number;
  fecha_creacion:        string;
  fecha_liquidacion?:    string | null;
  estado_id:             number;
  estado_nombre:         string;
  no_pedido:             string;
  no_cotizacion:         string | null;
  fecha_pedido:          string;
  cliente:               string;
  empresa:               string;
  telefono:              string;
  correo:                string;
  impresion?:            string | null;
  pagos:                 VentaPago[];
}

export interface DisenoProducto {
  iddiseno_producto:    number;
  idsolicitud_producto: number;
  nombre:               string;
  estado_id:            number;
  estado:               string;
  observaciones:        string | null;
  fecha:                string;
}

export interface Diseno {
  iddiseno:              number;
  solicitud_idsolicitud: number;
  estado_id:             number;
  estado_nombre:         string;
  estado_diseno:         string;
  fecha:                 string;
  no_pedido:             number;
  no_cotizacion:         number | null;
  productos:             DisenoProducto[];
  total_productos:       number;
  aprobados:             number;
  rechazados:            number;
  pendientes:            number;
  diseno_completado:     boolean;
  tiene_rechazados:      boolean;
}

export interface CondicionesProduccion {
  no_pedido:        number;
  puede_produccion: boolean;
  condiciones: {
    anticipo_cubierto:   boolean;
    anticipo_requerido:  number;
    anticipo_pagado:     number;
    diseno_completado:   boolean;
    productos_total:     number;
    productos_aprobados: number;
  };
}