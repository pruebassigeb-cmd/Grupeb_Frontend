import api from "../api";
import type {
  CalcularPrecioPapelPayload,
  CalcularPrecioPapelResponse,
} from "../../types/papel/calculador-precio-papel.types";

export const calcularPrecioPapel = async (
  payload: CalcularPrecioPapelPayload,
  signal?: AbortSignal,
): Promise<CalcularPrecioPapelResponse> => {
  const { data } = await api.post<CalcularPrecioPapelResponse>(
    "/calculador-precio-papel",
    payload,
    { signal },
  );
  return data;
};
