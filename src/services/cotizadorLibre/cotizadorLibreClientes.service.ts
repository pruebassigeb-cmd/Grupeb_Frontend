// src/services/cotizadorLibre/cotizadorLibreClientes.service.ts
import api from "../api";
import type {
  BuscarClienteRequest,
  BuscarClienteResponse,
  EnviarCodigoResponse,
  ConfirmarCodigoResponse,
  ClienteBusquedaInterno,
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

// ✅ NUEVO — buscador de clientes para uso interno. Requiere que el backend
// tenga montada la ruta GET /cotizador-libre/clientes/buscar-interno
// (cotizadorLibreClientes.routes.ts → buscarClientesInternoCotizadorLibre).
export const buscarClientesInterno = async (query: string): Promise<ClienteBusquedaInterno[]> => {
  const { data } = await api.get<ClienteBusquedaInterno[]>(
    "/cotizador-libre/clientes/buscar-interno",
    { params: { query } }
  );
  return data;
};

// ✅ NUEVO — coincidencia exacta sin enmascarar (correo/teléfono/RFC/
// empresa), para avisar al staff interno si el cliente que está a punto de
// registrar ya existe, antes de crear uno nuevo. Regresa hasta 5 posibles
// coincidencias en vez de solo 1 (buscarClienteCotizadorLibre) porque aquí
// el usuario sí puede ver los datos reales y elegir cuál es el correcto.
export const buscarClientesExactoInterno = async (
  payload: BuscarClienteRequest
): Promise<ClienteBusquedaInterno[]> => {
  const { data } = await api.post<ClienteBusquedaInterno[]>(
    "/cotizador-libre/clientes/buscar-exacto-interno",
    payload
  );
  return data;
};