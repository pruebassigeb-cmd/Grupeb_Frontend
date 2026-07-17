// src/services/plastico/calculadorPrecioPlastico.service.ts
import api from "../api";
import type {
  CalcularPreciosPlasticoBatchInput,
  CalcularPreciosPlasticoBatchResponse,
} from "../../types/plastico/calculador-precio-plastico.types";

export async function calcularPreciosPlasticoBatch(
  input: CalcularPreciosPlasticoBatchInput,
  signal?: AbortSignal,
): Promise<CalcularPreciosPlasticoBatchResponse> {
  const { data } = await api.post<CalcularPreciosPlasticoBatchResponse>(
    "/calcular-precios-batch",
    input,
    { signal },
  );

  return data;
}
