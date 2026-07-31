import api from "./api";
import type { Moneda } from "../utils/formatMoney";

export interface TipoCambioActual {
  idtipo_cambio: number;
  fecha: string;
  valor: number;
  origen: "banxico" | "manual";
  capturado_por: number | null;
  created_at: string;
}

export const getTipoCambioActual = async (): Promise<TipoCambioActual> => {
  const response = await api.get("/tipo-cambio/actual");
  return response.data;
};

export const getTipoCambioHistorial = async (
  limite = 30,
): Promise<TipoCambioActual[]> => {
  const response = await api.get("/tipo-cambio/historial", {
    params: { limite },
  });
  return response.data;
};

export const registrarTipoCambioManual = async (
  valor: number,
): Promise<TipoCambioActual> => {
  const response = await api.put("/tipo-cambio/manual", { valor });
  return response.data;
};

// Reexport de conveniencia para quien solo necesita el tipo Moneda al
// trabajar con este servicio.
export type { Moneda };
