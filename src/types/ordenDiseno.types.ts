export interface OrdenDiseno {
  idorden_diseno:      number;
  solicitud_id:        number;
  no_pedido:           string;
  estado:              "en_revision" | "aprobado" | "rechazado";
  version_actual:      number;
  created_at:          string;
  autorizado_at:       string | null;
  no_cotizacion:       string | null;
  cliente_nombre:      string;
  cliente_empresa:     string;
  idclientes:          number;
  total_participantes: number;
  ultima_actividad:    string | null;
  ultimo_mensaje:      string | null;
}

export interface Participante {
  idparticipante:  number;
  usuario_id:      number;
  rol_en_orden:    "diseno" | "ventas" | "otro";
  agregado_at:     string;
  nombre:          string;
  apellido:        string;
  rol_sistema:     string;
}

export interface ArchivoRevision {
  id_archivo:    number;
  nombre:        string;
  url:           string;
  public_id:     string;
  tipo:          string;
  mime_type:     string;
  resource_type: string;
}

export interface RevisionDiseno {
  idrevision:           number;
  numero_version:       number;
  tipo:                 "render" | "feedback";
  observaciones:        string | null;
  created_at:           string;
  subido_por_id:        number;
  subido_por_nombre:    string;
  subido_por_apellido:  string;
  archivos:             ArchivoRevision[];
}

export interface MensajeDiseno {
  idmensaje:        number;
  contenido:        string;
  tipo:             "texto" | "archivo" | "sistema";
  revision_id:      number | null;
  created_at:       string;
  usuario_id:       number | null;
  usuario_nombre:   string | null;
  usuario_apellido: string | null;
}

export interface OrdenDisenoDetalle extends OrdenDiseno {
  participantes: Participante[];
  revisiones:    RevisionDiseno[];
  mensajes:      MensajeDiseno[];
}

export interface Notificacion {
  idnotificacion: number;
  modulo:         string;
  tipo:           string;
  entidad_id:     number | null;
  mensaje:        string;
  leido:          boolean;
  created_at:     string;
}

export interface UsuarioParticipante {
  idusuario: number;
  nombre:    string;
  apellido:  string;
  rol:       string;
}