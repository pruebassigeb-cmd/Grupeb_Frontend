// src/services/cotizadorLibre/cotizadorLibrePrecio.service.ts
import api from "../api";

export interface AcabadosPapelPayload {
  tintas_frente?: number;
  tintas_dentro?: number;
  laminado?: boolean;
  hot_stamping?: boolean;
  alto_relieve?: boolean;
  textura?: boolean;
  uv?: boolean;
  asa?: boolean;
}

export interface CalcularPrecioPapelPayload {
  categoria: "papel";
  cantidad: number;
  papel: {
    idproducto_papel: number;
    idgrupo_papel: number;
    acabados: AcabadosPapelPayload;
  };
}

export interface CalcularPrecioPlasticoPayload {
  categoria: "plastico";
  cantidad: number;
  plastico: {
    porKilo: number;
    tintasId?: number;
    tintasCantidad?: number;
  };
}

export type CalcularPrecioCotizadorLibrePayload =
  | CalcularPrecioPapelPayload
  | CalcularPrecioPlasticoPayload;

export interface CalcularPrecioCotizadorLibreResponse {
  disponible: boolean;
  precio_unitario: number | null;
  mensaje: string | null;
}

export const calcularPrecioCotizadorLibre = async (
  payload: CalcularPrecioCotizadorLibrePayload,
  signal?: AbortSignal
): Promise<CalcularPrecioCotizadorLibreResponse> => {
  const { data } = await api.post<CalcularPrecioCotizadorLibreResponse>(
    "/cotizador-libre/calcular-precio",
    payload,
    { signal }
  );
  return data;
};