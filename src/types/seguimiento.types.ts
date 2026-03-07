export interface PedidoSeguimiento {
  no_pedido:          number;
  fecha:              string;
  cliente:            string;
  tipo_producto:      string;

  anticipo_requerido: number;
  anticipo_pagado:    number;
  anticipo_cubierto:  boolean;

  diseno_estado_id:   number;
  diseno_aprobado:    boolean;

  no_produccion:      string | null; // ✅ string — formato OP25001
  puede_pdf:          boolean;
}