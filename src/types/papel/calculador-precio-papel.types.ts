export type ReferenciaCantidadPrecioPapel = "precio1" | "precio2" | "precio3";

export interface CantidadCalculoPrecioPapelInput {
  referencia: ReferenciaCantidadPrecioPapel;
  cantidad: number;
}

export interface CalcularPrecioPapelPayload {
  idproducto_papel: number;
  idgrupo_papel: number;
  cantidades: CantidadCalculoPrecioPapelInput[];
  acabados: {
    tintas_frente: number;
    tintas_dentro: number;
    laminado: boolean;
    hot_stamping: boolean;
    alto_relieve: boolean;
    textura: boolean;
    uv: boolean;
    asa: boolean;
  };
}

export interface AdvertenciaCalculoPrecioPapel {
  codigo: string;
  mensaje: string;
  acabado_clave?: string;
  acabado_nombre?: string;
  cantidad?: number;
  escala_aplicada?: number | null;
}

export interface DesgloseCalculoPrecioPapel {
  clave: string;
  nombre: string;
  origen: "matriz" | "producto";
  tarifa_unitaria: number | null;
  multiplicador: number;
  incremento: number;
  configurado: boolean;
}

export interface ResultadoCalculoPrecioPapel {
  referencia: ReferenciaCantidadPrecioPapel;
  cantidad: number;
  escala_aplicada: { id: number; cantidad: number } | null;
  precio_base: number;
  incremento_acabados: number;
  incremento_laminado: number;
  precio_calculado: number;
  desglose: DesgloseCalculoPrecioPapel[];
  advertencias: AdvertenciaCalculoPrecioPapel[];
}

export interface CalcularPrecioPapelResponse {
  producto: {
    idproducto_papel: number;
    idgrupo_papel: number;
    id_tamano_producto: number | null;
    tamano_producto: string | null;
  };
  resultados: ResultadoCalculoPrecioPapel[];
}
