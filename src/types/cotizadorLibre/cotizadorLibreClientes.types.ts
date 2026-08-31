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

// ✅ NUEVO — resultado del buscador de clientes para uso INTERNO (staff con
// acceso real, nunca la cuenta compartida del cliente externo). Trae datos
// de contacto SIN enmascarar a propósito — a diferencia de ImpresionCliente
// (que sí enmascara), aquí el usuario ya tiene acceso legítimo al catálogo
// real de clientes.
export interface ClienteBusquedaInterno {
  idclientes: number;
  empresa: string | null;
  correo: string | null;
  telefono: string | null;
  atencion: string | null;
  celular: string | null;
  razon_social: string | null;
  impresion: string | null;
  identificar: string | null;
}