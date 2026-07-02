// src/types/cotizaciones.types.ts
import type { MaquinariaSeleccionadaPedidoPapel } from "./papel/maquinaria-pedido.types";

export interface DetalleCotizacion {
  iddetalle: number;
  cantidad: number;
  precio_total: number;
  aprobado: boolean | null;
  precio_unitario?: number | null;
  kilogramos?: number | null;
  modo_cantidad: "unidad" | "kilo";
}

export interface MedidasProducto {
  [key: string]: string;
  altura: string;
  ancho: string;
  fuelleFondo: string;
  fuelleLateral1: string;
  fuelleLateral2: string;
  refuerzo: string;
}

export interface ProductoBaseCotizacion {
  idsolicitud?: number;
  idsolicitud_producto: number;
  idcotizacion_producto: number;
  nombre: string;
  observacion?: string | null;
  descripcion?: string | null;
  herramental_descripcion?: string | null;
  herramental_precio?: number | null;
  herramental_aprobado?: boolean | null;
  herramental_id?: number | null;
  detalles: DetalleCotizacion[];
  subtotal: number;
}

export interface ProductoPlasticoCotizacion extends ProductoBaseCotizacion {
  tipoCotizacion?: "plastico";
  tipo_material?: "plastico";
  producto_id: number;

  material: string;
  calibre: string;
  calibre_bopp?: string | null;
  medidasFormateadas: string;
  medidas: MedidasProducto;

  tintas: number;
  tintas_idtintas?: number | null;
  caras: number;
  caras_idcaras?: number | null;

  bk?: boolean | null;
  foil?: boolean | null;
  alto_rel?: boolean | null;
  laminado?: boolean | null;
  uv_br?: boolean | null;
  uvBr?: boolean | null;

  pigmentos?: string | null;
  pantones?: string[] | string | null;

  idsuaje?: number | null;
  asa_suaje?: string | null;

  color_asa_id?: number | null;
  color_asa_nombre?: string | null;
  id_color?: number | null;

  id_medidatro?: number | null;
  medida_troquel?: string | null;

  perforacion?: boolean;
  por_kilo?: string | null;
}

export interface ProductoPapelCotizacionLeido extends ProductoBaseCotizacion {
  tipoCotizacion: "papel";
  tipo_material: "papel";

  idproducto_papel: number;
  descripcion_papel: string | null;
  medida: string | null;

  idgrupo_papel: number | null;
  grupo_descripcion: string | null;
  precio_sugerido: number | null;

  tintas: number | null;
  tintasId: number | null;
  pantones: string | null;

  tintasDentroId: number | null;
  tintasDentro: number;
  pantonesDentro: string | null;

  caras: number | null;
  carasId: number | null;

  id_asa: number | null;
  asa_nombre: string | null;
  tamano_asa?: string | null;
  idcat_laminado: number | null;
  laminado_nombre: string | null;
  idfoil: number | null;
  foil_nombre: string | null;
  idcat_textura: number | null;
  textura_nombre: string | null;
  uv: boolean;
  alto_relieve: boolean;
  metodo_hojeado: "hojeado" | "guillotina" | null;
  lleva_armado: boolean;
  maquinaria_seleccionada?: MaquinariaSeleccionadaPedidoPapel;

  cargo_adicional_descripcion?: string | null;
  cargo_adicional_precio?: number | null;
}

export type ProductoCotizacion =
  | ProductoPlasticoCotizacion
  | ProductoPapelCotizacionLeido;

export interface DatosClientePdf {
  celular?: string | null;
  razon_social?: string | null;
  rfc?: string | null;
  domicilio?: string | null;
  numero?: string | null;
  colonia?: string | null;
  codigo_postal?: string | null;
  poblacion?: string | null;
  estado_cliente?: string | null;
}

export interface Cotizacion extends DatosClientePdf {
  no_cotizacion: string;
  no_pedido?: string | null;
  tipo_documento: "cotizacion" | "pedido";
  fecha: string;
  estado_id: number;
  estado: string;
  cliente_id: number;
  identificar: string | null;
  cliente: string;
  telefono: string;
  correo: string;
  empresa: string;
  impresion?: string | null;
  productos: ProductoCotizacion[];
  total: number;
  sin_iva?: boolean;
  origen_expo?: boolean;
}

export interface Pedido extends DatosClientePdf {
  no_pedido: string;
  no_cotizacion?: string | null;
  es_directo: boolean;
  fecha: string;
  estado_id: number;
  estado: string;
  prioridad: boolean;
  cliente_id: number;
  identificar: string | null;
  cliente: string;
  telefono: string;
  correo: string;
  empresa: string;
  impresion?: string | null;
  productos: ProductoCotizacion[];
  total: number;
  sin_iva?: boolean;
}

export interface DetalleCrearCotizacion {
  cantidad: number;
  precio_total: number;
  modo_cantidad: "unidad" | "kilo";
  kilogramos_ingresados?: number | null;
}

export interface ProductoPlasticoEnviarCotizacion {
  tipoCotizacion?: "plastico";
  tipo_material?: "plastico";
  productoId: number;
  tintasId: number | null;
  carasId: number | null;
  idsuaje?: number | null;
  colorAsaId?: number | null;
  idMedidaTroquel?: number | null;
  observacion?: string | null;
  descripcion?: string | null;
  pigmentos?: string | null;
  pantones?: string | null;
  porKilo?: string | null;
  perforacion?: boolean;
  herramental_descripcion?: string | null;
  herramental_precio?: number | null;
  detalles: DetalleCrearCotizacion[];
}

export interface ProductoPapelEnviarCotizacion {
  tipoCotizacion: "papel";
  tipo_material: "papel";
  idproducto_papel: number;
  nombre: string;
  idgrupo_papel: number | null;
  grupo_descripcion: string | null;
  tintasId: number | null;
  pantones: string | null;
  tintasDentroId: number | null;
  pantonesDentro: string | null;
  carasId: number | null;
  id_asa: number | null;
  tamano_asa?: string | null;
  idcat_laminado: number | null;
  idfoil: number | null;
  idcat_textura: number | null;
  uv: boolean;
  alto_relieve: boolean;
  metodo_hojeado: "hojeado" | "guillotina";
  lleva_armado: boolean;
  observacion: string | null;
  descripcion: string | null;
  cantidades: [number, number, number];
  precios: [number, number, number];
  herramental_descripcion?: string | null;
  herramental_precio?: number | null;
  cargo_adicional_descripcion?: string | null;
  cargo_adicional_precio?: number | null;
}

export type ProductoEnviarCotizacion =
  | ProductoPlasticoEnviarCotizacion
  | ProductoPapelEnviarCotizacion;

export interface CrearCotizacionPayload {
  clienteId?: number;
  tipo?: "cotizacion" | "pedido";
  prioridad?: boolean;
  sin_iva?: boolean;
  productos: any[];
  [key: string]: any;
}

export interface RespuestaCrearCotizacion {
  message: string;
  no_cotizacion?: string;
  no_pedido?: string;
  tipo: "cotizacion" | "pedido";
  sin_iva?: boolean;
}

export interface RespuestaActualizarEstado {
  message: string;
  convertida_a_pedido: boolean;
  no_pedido: string | null;
}
