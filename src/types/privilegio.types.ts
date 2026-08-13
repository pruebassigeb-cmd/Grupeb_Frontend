export interface Privilegio {
  idprivilegios: number;
  privilegio: string;
  acceso: boolean;
  clave?: string;
  idmodulo?: number | null;
  descripcion?: string | null;
  orden?: number;
  activo?: boolean;
  es_sistema?: boolean;
}

export interface PrivilegioModulo {
  idmodulo: number;
  clave: string;
  nombre: string;
  icono?: string | null;
  orden: number;
  idmodulo_padre?: number | null;
}

export interface CrearPrivilegioRequest {
  privilegio: string;
  clave: string;
  idmodulo: number;
  descripcion?: string;
}

export interface EditarPrivilegioRequest {
  privilegio: string;
  idmodulo: number;
  descripcion?: string;
  orden?: number;
}
