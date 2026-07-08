export interface Producto {
  id:          number;
  fuente?:     "expo" | "sistema";
  nombre:      string;
  categoria:   "papel" | "plastico" | "carton";
  medida:      string;
  material:    string;
  calibre:     string;
  tintas:      string;
  laminacion:  boolean;
  hs:          boolean;
  ar:          boolean;
  textura:     boolean;
  uv:          boolean;
  asa:         boolean;
  otro:        string;
  tipoLaminado?: string;
  tipoAsa?:      string;
  tipoTextura?:  string;
  tipoHs?:       string;
  precio500:   string;
  precio1000:  string;
  precio3000:  string;
  imagen:      string;
  tipo?:         string;
  ancho?:        string;
  fuelle?:       string;
  altura?:       string;
  tipoPapel?:    string;
  otro2?:        string;
  tipoProducto?: string;
  fuelLateral?:  string;
  fuelLateral2?: string;
  fuelFondo?:    string;
  refuerzo?:     string;
  troquel?:      boolean;
  perforado?:    boolean;
  configuracion_plastico_id?: number;
  idproducto_papel?:          number;
  idgrupo_papel?:     number;
  grupo_descripcion?: string;
  tintasId?:          number;
  carasId?:           number;
  origen?:            string;
}

// Opciones filtradas por producto de papel del sistema
export interface AsaPermitida    { idcat_tipo_asa: number; nombre: string; }
export interface LaminadoPermitido { idcat_laminado: number; nombre: string; }

export interface FilaProducto {
  uid:          string;
  producto:     Producto;
  precio1:      string;
  precio2:      string;
  precio3:      string;
  // Cantidades PROPIAS de este producto — ya no son compartidas entre
  // productos de la misma cotización. Cada fila elige su propia cantidad
  // para cada una de sus hasta 3 columnas de precio.
  cant1:        string;
  cant2:        string;
  cant3:        string;
  laminacion:   boolean;
  tipoLaminado: string;
  idLaminado:   number | null;
  hs:           boolean;
  tipoHs:       string;
  idFoil:       number | null;
  ar:           boolean;
  textura:      boolean;
  tipoTextura:  string;
  idTextura:    number | null;
  uv:           boolean;
  asa:          boolean;
  tipoAsa:      string;
  idAsa:        number | null;
  idSuaje:      number | null;
  tintas:       string;
  otro:         string;
  medida:       string;
  material:     string;
  calibre:      string;
  tipoPlastico: string;
  modoExtra:    "precio" | "pigmento";
  extra:        string;
  pigmento:     string;
  pantones?:    string | null;
  // Opciones filtradas para productos de papel del sistema
  // Si viene con datos, FilaTabla usará estas en vez del catálogo completo
  asasPermitidas?:      AsaPermitida[]     | null;
  laminadosPermitidos?: LaminadoPermitido[] | null;
}

export interface ClienteExpo {
  nombre:           string;
  celular:          string;
  correoUsuario:    string;
  correoExt:        string;
  correoExtCustom?: string;
  impresion:        string;
  ciudad:           string;
  estado:           string;
  clase:            "AAA" | "AA" | "A" | "";
  intereses:        ("papel" | "plastico" | "cajas" | "otros")[];
  observaciones:    string;
}

export type EstadoCotizacion = "cotizacion" | "pedido";

export interface ItemPedidoAprobado {
  filaUid:              string;
  cantidadElegida:      "precio1" | "precio2" | "precio3";
  idsolicitud_producto?: number;
  idsolicitud_detalle?:  number;
}

export interface CotizacionGuardada {
  id:            string;
  folio:         string;
  idsolicitud?:  number;
  origen:        "expo";
  cliente:       string;
  clienteData:   ClienteExpo | null;
  clienteId?:    number;
  fecha:         string;
  estado:        EstadoCotizacion;
  filas:         FilaProducto[];
  comentarios:   string;
  total:         { precio1: number; precio2: number; precio3: number };
  itemsAprobados?: ItemPedidoAprobado[];
  folioPedido?:  string;
}

export const OPCIONES_TINTAS: string[] = (() => {
  const arr: string[] = [];
  for (let f = 1; f <= 6; f++) for (let r = 0; r <= 6; r++) arr.push(`${f}x${r}`);
  return arr;
})();

export const OPCIONES_TINTAS_PLASTICO: string[] = ["1", "2", "3", "4", "5", "6"];

export const OPCIONES_TIPO_PLASTICO = ["Sin tipo", "Troquel", "Bolsa plana", "Bolsa envíos", "Asa rígida", "Asa flexible"] as const;

export const MATERIALES_PLASTICO = ["Alta densidad", "Baja densidad", "BOPP"] as const;
export const CALIBRES_PLASTICO: Record<string, string[]> = {
  "Alta densidad": ["130", "140", "150", "175", "200", "225", "250"],
  "Baja densidad": ["130", "140", "150", "175", "200", "225", "250"],
  "BOPP":          ["30", "35", "40", "50"],
};

export const MATERIALES_PAPEL = ["Multicapa", "Bond", "Couché", "Kraft", "Cartulina", "Opalina"] as const;
export const CALIBRES_PAPEL_FLAT: string[] = [
  "10 pt", "12 pt", "14 pt", "16 pt", "18 pt", "20 pt", "22 pt", "24 pt",
  "130 g", "150 g", "200 g", "250 g", "ECT-23", "ECT-32", "ECT-44",
];
export const CALIBRES_PAPEL: Record<string, string[]> = {
  puntos: ["10 pt", "12 pt", "14 pt", "16 pt", "18 pt", "20 pt", "22 pt", "24 pt"],
  gramos: ["130 g", "150 g", "200 g", "250 g"],
  ect:    ["ECT-23", "ECT-32", "ECT-44"],
};

export const PIGMENTOS_PLASTICO = ["Natural", "Blanco", "Negro", "Tinto", "Verde", "Amarillo", "Café", "Rojo"] as const;

export const CATS = [
  { key: "papel",    label: "Papel",    color: "#A0845C", emoji: "📄" },
  { key: "plastico", label: "Plástico", color: "#5C8FA0", emoji: "🧴" },
  { key: "carton",   label: "Cartón",   color: "#8A7A5C", emoji: "📦" },
] as const;

export const ESTADOS_MX = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
  "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango",
  "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco",
  "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla",
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora",
  "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
] as const;

export const MEDIDAS_CAT: Record<string, string[]> = {
  papel:    ["10x7 cm", "15x8x20 cm", "20x10x30 cm", "22x15x5 cm", "25x12x35 cm", "30x15x40 cm", "32x24 cm", "40x30x15 cm"],
  carton:   ["15x10x6 cm", "20x15x8 cm", "25x20x10 cm", "30x20x12 cm", "30x20x60 cm", "35x25x15 cm", "40x30x15 cm", "40x30x25 cm"],
  plastico: ["20x30 cm", "25x35 cm", "30x40 cm", "35x45 cm", "40x50 cm", "20x25x5 cm", "30x40x10 cm", "40x35x10 cm"],
};

export const CORREO_EXT = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com",
  "live.com", "protonmail.com", "me.com", "msn.com",
] as const;

export const CLIENTE_VACIO: ClienteExpo = {
  nombre: "", celular: "", correoUsuario: "", correoExt: "gmail.com",
  correoExtCustom: "", impresion: "", ciudad: "", estado: "Jalisco",
  clase: "", intereses: [], observaciones: "",
};

export const uid = () => Math.random().toString(36).slice(2, 9);

// Clave única real de un producto: el id solo NO alcanza porque
// configuracion_plastico.id y producto_papel.id son autoincrementales
// independientes y pueden colisionar (ej: plástico id=7 y papel id=7).
export const claveProducto = (p: { id: number; categoria: string; fuente?: string }) =>
  `${p.fuente || "sistema"}:${p.categoria}:${p.id}`;

export const TODAY = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

export const folioAPedido = (folioCotizacion: string): string =>
  folioCotizacion.replace(/^COT/, "P");

const _num = (s: string): number => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

export const sumarTotales = (filas: FilaProducto[]) => ({
  precio1: filas.reduce((acc, f) => acc + _num(f.precio1), 0),
  precio2: filas.reduce((acc, f) => acc + _num(f.precio2), 0),
  precio3: filas.reduce((acc, f) => acc + _num(f.precio3), 0),
});

export const filaDesdeProducto = (p: Producto): FilaProducto => {
  const esPlastico = p.categoria === "plastico";
  const esPapelOCarton = p.categoria === "papel" || p.categoria === "carton";
  return {
    uid:          uid(),
    producto:     p,
    precio1:      p.precio500,
    precio2:      p.precio1000,
    precio3:      p.precio3000,
    cant1:        "500",
    cant2:        "1,000",
    cant3:        "3,000",
    laminacion:   esPapelOCarton ? p.laminacion : false,
    tipoLaminado: esPapelOCarton ? (p.tipoLaminado || "") : "",
    idLaminado:   null,
    hs:           esPapelOCarton ? p.hs : false,
    tipoHs:       esPapelOCarton ? (p.tipoHs || "") : "",
    idFoil:       null,
    ar:           esPapelOCarton ? p.ar : false,
    textura:      esPapelOCarton ? p.textura : false,
    tipoTextura:  esPapelOCarton ? (p.tipoTextura || "") : "",
    idTextura:    null,
    uv:           esPapelOCarton ? p.uv : false,
    asa:          p.asa,
    tipoAsa:      p.tipoAsa || "",
    idAsa:        null,
    idSuaje:      null,
    tintas:       p.tintas || (esPlastico ? "1" : "1x0"),
    otro:         p.otro || "",
    medida:       p.medida || "",
    material:     p.material || "",
    calibre:      p.calibre || "",
    tipoPlastico: esPlastico ? (p.tipoProducto || p.tipo || "") : "",
    modoExtra:    "precio",
    extra:        "",
    pigmento:     "",
    pantones:     null,
    // Se populan en Expo.tsx al hacer addProd, solo para papel del sistema
    asasPermitidas:      null,
    laminadosPermitidos: null,
  };
};

export const mapearCatalogoExpoAProducto = (p: {
  idcatalogo_expo:   number;
  nombre:            string;
  categoria:         "papel" | "plastico" | "carton";
  medida:            string | null;
  material:          string | null;
  calibre:           string | null;
  tintas:            string | null;
  laminacion:        boolean;
  tipo_laminado:     string | null;
  hs:                boolean;
  tipo_hs:           string | null;
  ar:                boolean;
  textura:           boolean;
  tipo_textura:      string | null;
  uv:                boolean;
  asa:               boolean;
  tipo_asa:          string | null;
  otro:              string | null;
  precio_500:        number | null;
  precio_1000:       number | null;
  precio_3000:       number | null;
  imagen_url:        string | null;
  tipo_producto:     string | null;
  altura?:           number | null;
  ancho?:            number | null;
  fuelle?:           number | null;
  fuelle_fondo?:     number | null;
  fuelle_lateral_iz?: number | null;
  fuelle_lateral_de?: number | null;
  refuerzo?:         number | null;
  origen?:           string | null;
}): Producto => {
  const esPlastico = p.categoria === "plastico";
  const esPapelOCarton = p.categoria === "papel" || p.categoria === "carton";
  return {
    id:           p.idcatalogo_expo,
    fuente:       "expo",
    nombre:       p.nombre,
    categoria:    p.categoria,
    medida:       p.medida         || "",
    material:     p.material       || "",
    calibre:      p.calibre        || "",
    tintas:       p.tintas         || (esPlastico ? "1" : "1x0"),
    laminacion:   esPapelOCarton ? p.laminacion : false,
    tipoLaminado: esPapelOCarton ? (p.tipo_laminado || "") : "",
    hs:           esPapelOCarton ? p.hs : false,
    tipoHs:       esPapelOCarton ? (p.tipo_hs || "") : "",
    ar:           esPapelOCarton ? p.ar : false,
    textura:      esPapelOCarton ? p.textura : false,
    tipoTextura:  esPapelOCarton ? (p.tipo_textura || "") : "",
    uv:           esPapelOCarton ? p.uv : false,
    asa:          p.asa,
    tipoAsa:      p.tipo_asa       || "",
    otro:         p.otro           || "",
    precio500:    p.precio_500  != null ? `$${Number(p.precio_500).toFixed(2)}`  : "",
    precio1000:   p.precio_1000 != null ? `$${Number(p.precio_1000).toFixed(2)}` : "",
    precio3000:   p.precio_3000 != null ? `$${Number(p.precio_3000).toFixed(2)}` : "",
    imagen:       p.imagen_url     || "",
    tipo:         esPlastico ? (p.tipo_producto || "") : "",
    tipoProducto: esPlastico ? (p.tipo_producto || "") : "",
    altura:       p.altura            != null ? String(p.altura)            : "",
    ancho:        p.ancho             != null ? String(p.ancho)             : "",
    fuelle:       esPapelOCarton && p.fuelle != null ? String(p.fuelle)    : "",
    fuelFondo:    esPlastico && p.fuelle_fondo      != null ? String(p.fuelle_fondo)      : "",
    fuelLateral:  esPlastico && p.fuelle_lateral_iz != null ? String(p.fuelle_lateral_iz) : "",
    fuelLateral2: esPlastico && p.fuelle_lateral_de != null ? String(p.fuelle_lateral_de) : "",
    refuerzo:     esPlastico && p.refuerzo          != null ? String(p.refuerzo)          : "",
    origen:       p.origen            || "expo",
  };
};

const normalizarMaterialPlastico = (material: string | null): string => {
  const m = (material || "").toLowerCase();
  if (m.includes("alta")) return "Alta densidad";
  if (m.includes("baja")) return "Baja densidad";
  if (m.includes("bopp") || m.includes("celofan") || m.includes("celofán")) return "BOPP";
  return material || "";
};

export const mapearPlasticoSistemaAProducto = (p: {
  id: number; nombre: string; medida: string | null;
  material: string | null; calibre: number | null; calibre_bopp: number | null; por_kilo: number | null;
  altura?: number | null; ancho?: number | null; fuelle_fondo?: number | null;
  fuelle_latiz?: number | null; fuelle_latde?: number | null; refuerzo?: number | null;
}): Producto => {
  const calibre = p.calibre_bopp
    ? String(p.calibre_bopp)
    : p.calibre ? String(p.calibre) : "";
  return {
    id:           p.id,
    fuente:       "sistema",
    nombre:       p.nombre,
    categoria:    "plastico",
    medida:       p.medida || "",
    material:     normalizarMaterialPlastico(p.material),
    calibre,
    tintas:       "1",
    laminacion:   false,
    tipoLaminado: "",
    hs:           false,
    tipoHs:       "",
    ar:           false,
    textura:      false,
    tipoTextura:  "",
    uv:           false,
    asa:          false,
    tipoAsa:      "",
    otro:         "",
    precio500:    "",
    precio1000:   "",
    precio3000:   "",
    imagen:       "",
    tipo:         "",
    tipoProducto: "",
    configuracion_plastico_id: p.id,
    altura:      p.altura       != null ? String(p.altura)       : "",
    ancho:       p.ancho        != null ? String(p.ancho)        : "",
    fuelFondo:   p.fuelle_fondo != null ? String(p.fuelle_fondo) : "",
    fuelLateral: p.fuelle_latiz != null ? String(p.fuelle_latiz) : "",
    fuelLateral2:p.fuelle_latde != null ? String(p.fuelle_latde) : "",
    fuelle:      "",
    refuerzo:    "",
    origen:      "sistema",
  };
};

export const mapearPapelSistemaAProducto = (p: {
  id: number; nombre: string; medida: string | null;
  descripcion_papel: string | null; primer_material?: string | null;
  primer_calibre?: string | null;
  ancho?: number | null; fuelle?: number | null; altura?: number | null;
}): Producto => ({
  id:           p.id,
  fuente:       "sistema",
  nombre:       p.descripcion_papel
    ? `${p.nombre} — ${p.descripcion_papel}`
    : p.nombre,
  categoria:    "papel",
  medida:       p.medida || "",
  material:     p.primer_material || "",
  calibre:      p.primer_calibre || "",
  tintas:       "1x0",
  laminacion:   false,
  tipoLaminado: "",
  hs:           false,
  tipoHs:       "",
  ar:           false,
  textura:      false,
  tipoTextura:  "",
  uv:           false,
  asa:          false,
  tipoAsa:      "",
  otro:         "",
  precio500:    "",
  precio1000:   "",
  precio3000:   "",
  imagen:       "",
  idproducto_papel: p.id,
  tipo:         "",
  tipoProducto: "",
  ancho:   p.ancho  != null ? String(p.ancho)  : "",
  fuelle:  p.fuelle != null ? String(p.fuelle) : "",
  altura:  p.altura != null ? String(p.altura) : "",
  fuelFondo:    "",
  fuelLateral:  "",
  fuelLateral2: "",
  refuerzo:     "",
  origen:  "sistema",
});