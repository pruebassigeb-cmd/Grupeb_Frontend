export interface Usuario {
  idusuario:      number;
  nombre:         string;
  apellido:       string;
  correo:         string;
  telefono?:      string;
  codigo?:        string;
  roles_idroles?: number;
  rol?:           string;
  acceso_total?:  boolean;
  created_at?:    string;
  activo?:        boolean;
  privilegios?:   number[];

  // tabla usuarios
  foto_id_archivo?: number;
  foto_public_id?:  string;
  foto_url?:        string; // URL firmada generada por el backend
  rfc?:             string;
  curp?:            string;

  // tabla usuarios_direccion
  calle?:         string;
  numero_ext?:    string;
  numero_int?:    string;
  colonia?:       string;
  codigo_postal?: string;
  municipio?:     string;
  estado?:        string;

  // tabla usuarios_ficha_medica
  fecha_nacimiento?:      string;
  nss?:                   string;
  tipo_sangre?:           string;
  alergias?:              string;
  enfermedades?:          string;
  medicamentos?:          string;
  emergencia_nombre?:     string;
  emergencia_parentesco?: string;
  emergencia_telefono?:   string;
}

interface CamposExtras {
  foto_id_archivo?: number;
  rfc?:             string;
  curp?:            string;
  // dirección
  calle?:         string;
  numero_ext?:    string;
  numero_int?:    string;
  colonia?:       string;
  codigo_postal?: string;
  municipio?:     string;
  estado?:        string;
  // ficha médica
  fecha_nacimiento?:      string;
  nss?:                   string;
  tipo_sangre?:           string;
  alergias?:              string;
  enfermedades?:          string;
  medicamentos?:          string;
  emergencia_nombre?:     string;
  emergencia_parentesco?: string;
  emergencia_telefono?:   string;
}

export interface CreateUsuarioRequest extends CamposExtras {
  nombre:        string;
  apellido:      string;
  correo:        string;
  telefono?:     string;
  codigo:        string;
  roles_idroles: number;
  privilegios?:  number[];
}

export interface UpdateUsuarioRequest extends CamposExtras {
  nombre:        string;
  apellido:      string;
  correo:        string;
  telefono?:     string;
  codigo?:       string;
  roles_idroles: number;
  privilegios?:  number[];
}