// ==========================
// CLIENTE (respuesta del GET)
// ==========================
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
  // Catálogos (del JOIN)
  tipo_regimen?: string;
  regimen_codigo?: string;
  tipo_pago?: string;
  metodo_codigo?: string;
  tipo_forma?: string;
  forma_codigo?: string;
  // Facturación
  rfc?: string;
  correo_facturacion?: string;
  uso_cfdi?: string;
  moneda?: string;
  // Domicilio principal
  domicilio?: string;
  numero?: string;
  colonia?: string;
  codigo_postal?: string;
  poblacion?: string;
  estado?: string;
  // Dirección de envío
  envio_id?: number;
  envio_domicilio?: string;
  envio_numero?: string;
  envio_colonia?: string;
  envio_codigo_postal?: string;
  envio_poblacion?: string;
  envio_estado?: string;
  envio_referencia?: string;
}

// ==========================
// BÚSQUEDA (GET /search)
// ==========================
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

// ==========================
// CLIENTE LIGERO (cotizaciones)
// ==========================
export interface CreateClienteLigeroRequest {
  nombre?: string;
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

// ==========================
// CREATE / UPDATE
// ==========================
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
  // Facturación
  rfc?: string;
  correo_facturacion?: string;
  uso_cfdi?: string;
  moneda?: string;
  // Domicilio principal
  domicilio?: string;
  numero?: string;
  colonia?: string;
  codigo_postal?: string;
  poblacion?: string;
  estado?: string;
  // Dirección de envío
  envio_id?: number;
  envio_domicilio?: string;
  envio_numero?: string;
  envio_colonia?: string;
  envio_codigo_postal?: string;
  envio_poblacion?: string;
  envio_estado?: string;
  envio_referencia?: string;
}

export interface UpdateClienteRequest extends CreateClienteRequest {}

// ==========================
// CATÁLOGOS
// ==========================
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