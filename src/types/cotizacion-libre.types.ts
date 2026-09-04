// src/types/cotizacion-libre.types.ts

export type TipoCotizacionLibre = "plastico" | "papel" | "especial";

// Cada campo con catálogo llega/se manda así — igual patrón en los 3 tipos.
export interface CampoLibre {
  id?: number | null;
  texto?: string | null;
}

export interface CampoLibreBooleano {
  bool?: boolean | null;
  texto?: string | null; // nota opcional (ej. "alto relieve solo en logo")
}

export interface ItemCotizacionLibre {
  tipo: TipoCotizacionLibre;
  producto_id?: number | null;
  producto_texto?: string | null;
  medida_texto?: string | null;

  material?: CampoLibre;
  calibre?: CampoLibre;

  tintas_frente?: CampoLibre;
  tintas_dentro?: CampoLibre; // solo papel/especial
  pantones_texto?: string | null;
  pantones_dentro_texto?: string | null;

  caras?: CampoLibre; // solo plástico

  // Acabados papel/especial
  laminado?: CampoLibre;
  hs?: CampoLibre; // foil / hot stamping
  alto_relieve?: CampoLibreBooleano;
  textura?: CampoLibre;
  uv?: CampoLibreBooleano;
  asa?: CampoLibre;

  // Acabados plástico
  color_asa?: CampoLibre;
  medida_troquel?: CampoLibre;
  cinta_seguridad?: CampoLibre;
  perforacion?: boolean;
  pigmentos_texto?: string | null;

  cantidades: [number | null, number | null, number | null];
  precios: [number | null, number | null, number | null];
  notas?: string | null;
}

export interface CrearCotizacionLibrePayload {
  clienteId?: number | null;
  clienteTexto?: string | null;
  empresaTexto?: string | null;
  asesorId?: number | null;
  moneda?: "MXN" | "USD";
  sinRemision?: boolean;
  comentarios?: string | null;
  items: ItemCotizacionLibre[];
}

export interface RespuestaCrearCotizacionLibre {
  message: string;
  folio: string;
  id: number;
}

// Shape reducido, pensado para mezclarse con `Cotizacion` en el listado.
export interface CotizacionLibreResumen {
  folio: string;
  es_libre: true;
  tipos: TipoCotizacionLibre[];
  total_productos: number;
  fecha: string;
  moneda: "MXN" | "USD";
  estatus: string;
  cliente: string | null;
  empresa: string | null;
  total: number;
}

export interface CotizacionLibreDetalle {
  id: number;
  folio: string;
  cliente_id: number | null;
  cliente_texto: string | null;
  empresa_texto: string | null;
  fecha: string;
  asesor_id: number | null;
  moneda: "MXN" | "USD";
  sin_remision: boolean;
  comentarios: string | null;
  estatus: string;
  cliente_nombre?: string | null;
  cliente_empresa_real?: string | null;
  asesor_nombre?: string | null;
  asesor_apellido?: string | null;
  items: any[]; // filas crudas de cotizacion_libre_item
}