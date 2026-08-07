// src/types/cotizadorLibre/cotizadorLibreCotizaciones.types.ts

export interface AcabadosPapelGuardado {
  tintas_frente?: number;
  tintas_dentro?: number;
  idcat_laminado?: number | null;
  idfoil?: number | null;
  idcat_textura?: number | null;
  id_asa?: number | null;
  alto_relieve?: boolean;
  uv?: boolean;
}

export interface ProductoPapelGuardadoInput {
  categoria: "papel";
  idproducto_papel: number;
  idgrupo_papel: number;
  cantidad: number;
  acabados: AcabadosPapelGuardado;
}

export interface ProductoPlasticoGuardadoInput {
  categoria: "plastico";
  idconfiguracion_plastico: number;
  cantidad: number;
  tintasId: number;
}

export type ProductoGuardadoInput = ProductoPapelGuardadoInput | ProductoPlasticoGuardadoInput;

export interface CrearCotizacionRequest {
  clienteId: number;
  tipo: "cotizacion" | "pedido";
  verificado: boolean;
  productos: ProductoGuardadoInput[];
}

export interface ClienteCompletoCotizadorLibre {
  atencion: string | null;
  empresa: string | null;
  telefono: string | null;
  celular: string | null;
  correo: string | null;
  impresion: string | null;
  razon_social: string | null;
  identificar: string | null;
  rfc: string | null;
  domicilio: string | null;
  numero: string | null;
  colonia: string | null;
  codigo_postal: string | null;
  poblacion: string | null;
  estado_cliente: string | null;
}

export interface CrearCotizacionResponse {
  idsolicitud: number;
  estado: string;
  no_cotizacion: string | null;
  no_pedido: string | null;
  cliente: ClienteCompletoCotizadorLibre | null;
}

// ---- Estado local del carrito (solo frontend, no se persiste hasta guardar) ----
export interface ItemCarrito {
  idLocal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  payload: ProductoGuardadoInput;
  // Campos solo para mostrar en el PDF (no se mandan a /cotizador-libre/cotizaciones,
  // ese endpoint ya resuelve todo por IDs del lado del servidor).
  materialNombre?: string | null;
  asaNombre?: string | null;
  laminadoNombre?: string | null;
  texturaNombre?: string | null;
  foilNombre?: string | null;
  tintasCantidad?: number | null; // solo plástico
}