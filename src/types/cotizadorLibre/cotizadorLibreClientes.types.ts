// src/types/cotizadorLibre/cotizadorLibreClientes.types.ts

export interface BuscarClienteRequest {
  empresa?: string;
  rfc?: string;
  telefono?: string;
  correo?: string;
}

export interface ImpresionCliente {
  correo_mask: string | null;
  telefono_mask: string | null;
}

export type BuscarClienteResponse =
  | { match: false }
  | { match: true; cliente_id: number; impresion: ImpresionCliente };

export interface EnviarCodigoResponse {
  enviado: true;
  expira_en: string;
}

export type MotivoFalloVerificacion =
  | "sin_codigo_activo"
  | "expirado"
  | "demasiados_intentos"
  | "codigo_incorrecto";

export type ConfirmarCodigoResponse =
  | { verificado: true }
  | { verificado: false; motivo: MotivoFalloVerificacion; intentos_restantes?: number };