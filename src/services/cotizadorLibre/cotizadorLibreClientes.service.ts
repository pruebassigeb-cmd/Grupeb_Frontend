// src/services/cotizadorLibre/cotizadorLibreClientes.service.ts
import api from "../api";
import type {
  BuscarClienteRequest,
  BuscarClienteResponse,
  EnviarCodigoResponse,
  ConfirmarCodigoResponse,
} from "../../types/cotizadorLibre/cotizadorLibreClientes.types";

export const buscarClienteCotizadorLibre = async (
  payload: BuscarClienteRequest
): Promise<BuscarClienteResponse> => {
  const { data } = await api.post<BuscarClienteResponse>(
    "/cotizador-libre/clientes/buscar",
    payload
  );
  return data;
};

export const enviarCodigoVerificacion = async (
  clienteId: number
): Promise<EnviarCodigoResponse> => {
  const { data } = await api.post<EnviarCodigoResponse>(
    "/cotizador-libre/clientes/verificar/enviar",
    { cliente_id: clienteId }
  );
  return data;
};

export const confirmarCodigoVerificacion = async (
  clienteId: number,
  codigo: string
): Promise<ConfirmarCodigoResponse> => {
  const { data } = await api.post<ConfirmarCodigoResponse>(
    "/cotizador-libre/clientes/verificar/confirmar",
    { cliente_id: clienteId, codigo }
  );
  return data;
};