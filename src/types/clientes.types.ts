// Interfaces para Cliente
export interface Cliente {
  idclientes: number;
  empresa: string;
  correo: string;
  telefono?: string;
  atencion?: string;
  razon_social?: string;
  impresion?: string;
  celular?: string;
  fecha?: string;
  regimen_fiscal_idregimen_fiscal: number;
  metodo_pago_idmetodo_pago: number;
  forma_pago_idforma_pago: number;
  // Datos de catálogos (del JOIN)
  tipo_regimen?: string;
  regimen_codigo?: string;
  tipo_pago?: string;
  metodo_codigo?: string;
  tipo_forma?: string;
  forma_codigo?: string;
  // Datos de facturación
  rfc?: string;
  correo_facturacion?: string;
  uso_cfdi?: string;
  moneda?: string;
  // Datos de domicilio
  domicilio?: string;
  numero?: string;
  colonia?: string;
  codigo_postal?: string;
  poblacion?: string;
  estado?: string;
}

// ====================================
// NUEVAS INTERFACES PARA BÚSQUEDA
// ====================================

// Cliente simplificado para búsqueda (solo campos que devuelve /search)
export interface ClienteBusqueda {
  idclientes: number;
  empresa: string | null;
  correo: string | null;
  telefono: string | null;
  atencion: string | null;
  celular: string | null;
  razon_social: string | null;
  impresion: string | null;
}

// ====================================
// NUEVAS INTERFACES PARA CLIENTE LIGERO
// ====================================

export interface CreateClienteLigeroRequest {
  nombre?: string;      // Va al campo "atencion"
  telefono?: string;
  correo?: string;
  empresa?: string;
}

export interface CreateClienteLigeroResponse {
  message: string;
  cliente: {
    id: number;
    nombre: string | null;
    empresa: string | null;
    correo: string | null;
    telefono: string | null;
  };
}

// ====================================
// INTERFACES EXISTENTES
// ====================================

export interface CreateClienteRequest {
  empresa: string;
  correo: string;
  telefono?: string;
  atencion?: string;
  razon_social?: string;
  impresion?: string;
  celular?: string;
  regimen_fiscal_idregimen_fiscal: number;
  metodo_pago_idmetodo_pago: number;
  forma_pago_idforma_pago: number;
  // Datos de facturación
  rfc?: string;
  correo_facturacion?: string;
  uso_cfdi?: string;
  moneda?: string;
  // Datos de domicilio
  domicilio?: string;
  numero?: string;
  colonia?: string;
  codigo_postal?: string;
  poblacion?: string;
  estado?: string;
}

export interface UpdateClienteRequest extends CreateClienteRequest {}

// Interfaces para Catálogos
export interface RegimenFiscal {
  idregimen_fiscal: number;
  tipo_regimen: string;
  codigo: string;
}

export interface MetodoPago {
  idmetodo_pago: number;
  codigo: string;
  tipo_pago: string;
}

export interface FormaPago {
  idforma_pago: number;
  tipo_forma: string;
  codigo: string;
}