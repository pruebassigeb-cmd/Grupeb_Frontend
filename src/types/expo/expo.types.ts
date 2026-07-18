import type { AdvertenciaCalculoPrecioPapel } from "../papel/calculador-precio-papel.types";

// src/types/expo/expo.types.ts
// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTOS DEL SISTEMA DISPONIBLES PARA PRECARGAR EL REGISTRO EXPO
// GET /expo/catalogo/opciones-registro
// ═══════════════════════════════════════════════════════════════════════════

export interface MaterialSistemaPapelExpo {
  idgrupo_papel: number;
  precio_sugerido: number | string | null;
  idcat_tipo_papel: number | null;
  tipo_papel: string | null;
  idcat_calibre: number | null;
  calibre: string | null;
}

export interface OpcionSimpleSistemaExpo {
  id: number;
  nombre: string;
}

export interface ProductoSistemaPapelExpo {
  id: number;
  categoria: "papel" | "carton";
  tipo_producto: string | null;
  descripcion: string | null;
  medida: string | null;
  ancho: number | string | null;
  fuelle: number | string | null;
  altura: number | string | null;
  tamano_prod: string | null;
  id_tamano_producto: number | null;
  tamano_producto?: string | null;
  costo_laminado: number | string | null;
  precio_500: number | string | null;
  precio_1000: number | string | null;
  precio_3000: number | string | null;
  materiales: MaterialSistemaPapelExpo[];
  laminados: OpcionSimpleSistemaExpo[];
  asas: OpcionSimpleSistemaExpo[];
  tintas_frente_default: number | null;
  tintas_dentro_default: number | null;
  hs: boolean;
  tipo_hs: string | null;
  ar: boolean;
  textura: boolean;
  tipo_textura: string | null;
  uv: boolean;
  imagen_url: string | null;
}

export interface ProductoSistemaPlasticoExpo {
  id: number;
  categoria: "plastico";
  tipo_producto: string | null;
  descripcion?: string | null;
  material: string | null;
  calibre: string | null;
  medida: string | null;
  altura: number | string | null;
  ancho: number | string | null;
  fuelle_fondo: number | string | null;
  fuelle_lateral_izquierdo: number | string | null;
  fuelle_lateral_derecho: number | string | null;
  refuerzo: number | string | null;
  tamano_prod: string | null;
  por_kilo: number | string | null;
  precio_500: number | string | null;
  precio_1000: number | string | null;
  precio_3000: number | string | null;
  pigmento: string | null;
  tintas_frente_default: number | null;
  imagen_url: string | null;
}

export interface TamanoProductoExpoOpcion {
  id: number;
  clave: string;
  nombre: string;
}

export interface OpcionesRegistroExpoResponse {
  papel: ProductoSistemaPapelExpo[];
  plastico: ProductoSistemaPlasticoExpo[];
  tamanos: TamanoProductoExpoOpcion[];
}

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
  // Referencias comerciales del Catálogo Expo. Se guardan en los campos
  // históricos precio_1000 y precio_3000, pero NUNCA alimentan las columnas
  // del cotizador ni los hooks de cálculo.
  precioReferencia500?:  string;
  precioReferencia1000?: string;
  // Papel/cartón: precio base unitario del grupo. Plástico usa precio500 como
  // precio unitario Expo. Ambos permanecen separados de las referencias.
  precioBase?: string;
  costoLaminado?: number;
  idTamanoProducto?: number;
  asasPermitidas?: AsaPermitida[] | null;
  laminadosPermitidos?: LaminadoPermitido[] | null;
  imagen:      string;
  tipo?:         string;
  ancho?:        string;
  fuelle?:       string;
  altura?:       string;
  tipoPapel?:    string;
  otro2?:        string;
  tipoProducto?: string;
  tamanoProd?:    string;
  fuelLateral?:  string;
  fuelLateral2?: string;
  fuelFondo?:    string;
  refuerzo?:     string;
  // Bolsas por kilo calculadas y guardadas en configuracion_plastico.
  // Es la base física que utiliza el calculador de precios de plástico.
  porKilo?:      number;
  troquel?:      boolean;
  perforado?:    boolean;
  configuracion_plastico_id?: number;
  idproducto_papel?:          number;
  idgrupo_papel?:     number;
  grupo_descripcion?: string;
  tintasId?:          number;
  carasId?:           number;
  origen?:            string;
  // NUEVO: pigmento (solo plástico) — antes no existía en el catálogo de
  // Expo. Se guarda en producto_acabado_default.pigmento_default, texto
  // libre (no hay catálogo con ID para pigmentos).
  pigmento?:          string;
  // NUEVO: IDs reales de los acabados por default — el <select> de la hoja
  // de cotización se ve bien mostrando el NOMBRE, pero lo que en verdad se
  // guarda al cotizar es el ID. Sin esto, un producto "tal cual" (sin que
  // el vendedor toque los selects) se guardaba con estos acabados en null.
  idLaminadoDefault?: number;
  idFoilDefault?:     number;
  idTexturaDefault?:  number;
  idAsaDefault?:      number;  // papel: idcat_tipo_asa
  idSuajeDefault?:    number;  // plástico: tipo de asa/suaje
  idColorDefault?:    number;  // plástico: color de asa
  // NUEVO: defaults de tintas — CANTIDAD (1-6), nunca un id. El backend es
  // quien resuelve la cantidad al id real de la tabla `tintas` justo antes
  // de guardar. Frente aplica a papel y plástico; dentro solo aplica a
  // papel/cartón. No se maneja pantones en este cotizador.
  tintasFrenteDefault?: number;
  tintasDentroDefault?: number;
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
  // Referencia automática del calculador. El precio final continúa siendo
  // editable; cuando precioManualN=true, un recálculo no lo sobrescribe.
  precioCalculado1: string;
  precioCalculado2: string;
  precioCalculado3: string;
  precioManual1: boolean;
  precioManual2: boolean;
  precioManual3: boolean;
  advertenciasPrecio1: AdvertenciaCalculoPrecioPapel[];
  advertenciasPrecio2: AdvertenciaCalculoPrecioPapel[];
  advertenciasPrecio3: AdvertenciaCalculoPrecioPapel[];
  calculandoPrecio: boolean;
  errorCalculoPrecio: string | null;
  // Solo aplica a productos de plástico cuyo origen sea Expo. Cuando está
  // activo, precio500 se interpreta como precio unitario comercial y el hook
  // no consulta el calculador de tarifas por kilos/tintas.
  usarPrecioUnitarioExpo?: boolean;
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
  // NUEVO: tintas como CANTIDAD (no id) — reemplaza al string libre "2x3".
  // Plástico solo usa tintasFrente; papel/cartón usan ambos lados. El id
  // real se resuelve del lado del backend justo antes de guardar. Sin
  // pantones — este cotizador solo necesita el número.
  tintasFrente:    number;
  usaTintasDentro: boolean;
  tintasDentro:    number;
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

export type ReferenciaOpcionPrecioPapelCotizacion =
  | "precio1"
  | "precio2"
  | "precio3";

export interface OpcionPrecioPapelCotizacionPayload {
  referencia: ReferenciaOpcionPrecioPapelCotizacion;
  cantidad: number;
  precio_tablero: number;
  cargo_extra_unitario: number;
  precio_final: number;
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
export const claveProducto = (p: {
  id: number;
  categoria: string;
  fuente?: string;
  idgrupo_papel?: number;
}) =>
  `${p.fuente || "sistema"}:${p.categoria}:${p.id}${
    p.idgrupo_papel ? `:g${p.idgrupo_papel}` : ""
  }`;

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
    precio1:      esPapelOCarton ? (p.precioBase || "") : p.precio500,
    precio2:      esPapelOCarton ? (p.precioBase || "") : p.precio1000,
    precio3:      esPapelOCarton ? (p.precioBase || "") : p.precio3000,
    precioCalculado1: esPapelOCarton ? (p.precioBase || "") : "",
    precioCalculado2: esPapelOCarton ? (p.precioBase || "") : "",
    precioCalculado3: esPapelOCarton ? (p.precioBase || "") : "",
    precioManual1: false,
    precioManual2: false,
    precioManual3: false,
    advertenciasPrecio1: [],
    advertenciasPrecio2: [],
    advertenciasPrecio3: [],
    calculandoPrecio: false,
    errorCalculoPrecio: null,
    // El cálculo actual continúa siendo el modo predeterminado. El vendedor
    // puede activar el precio unitario Expo desde la fila del cotizador.
    usarPrecioUnitarioExpo: false,
    cant1:        "500",
    cant2:        "1,000",
    cant3:        "3,000",
    laminacion:   esPapelOCarton ? p.laminacion : false,
    tipoLaminado: esPapelOCarton ? (p.tipoLaminado || "") : "",
    idLaminado:   esPapelOCarton ? (p.idLaminadoDefault ?? null) : null,
    hs:           esPapelOCarton ? p.hs : false,
    tipoHs:       esPapelOCarton ? (p.tipoHs || "") : "",
    idFoil:       esPapelOCarton ? (p.idFoilDefault ?? null) : null,
    ar:           esPapelOCarton ? p.ar : false,
    textura:      esPapelOCarton ? p.textura : false,
    tipoTextura:  esPapelOCarton ? (p.tipoTextura || "") : "",
    idTextura:    esPapelOCarton ? (p.idTexturaDefault ?? null) : null,
    uv:           esPapelOCarton ? p.uv : false,
    asa:          p.asa,
    tipoAsa:      p.tipoAsa || "",
    idAsa:        esPapelOCarton ? (p.idAsaDefault ?? null) : (p.idColorDefault ?? null),
    idSuaje:      esPlastico ? (p.idSuajeDefault ?? null) : null,
    // NUEVO: tintas como cantidad plana — frente aplica a todos, dentro
    // solo a papel/cartón. Sin pantones.
    tintasFrente:    p.tintasFrenteDefault ?? (esPapelOCarton ? 0 : 1),
    usaTintasDentro: esPapelOCarton ? !!p.tintasDentroDefault : false,
    tintasDentro:    esPapelOCarton ? (p.tintasDentroDefault ?? 0) : 0,
    otro:         p.otro || "",
    medida:       p.medida || "",
    material:     p.material || "",
    calibre:      p.calibre || "",
    tipoPlastico: esPlastico ? (p.tipoProducto || p.tipo || "") : "",
    // Para plástico, el campo "extra" arranca SIEMPRE en modo pigmento (no
    // en modo precio) — es el campo principal para ese tipo de producto, no
    // debe hacer falta que el vendedor lo cambie a mano cada vez. El modo
    // "precio extra" sigue disponible desde el mismo selector si se necesita.
    modoExtra:    esPlastico ? "pigmento" : "precio",
    extra:        "",
    pigmento:     esPlastico ? (p.pigmento || "") : "",
    pantones:     null,
    // Ya viajan en la consulta principal del catálogo. Se conserva fallback
    // en Expo.tsx para compatibilidad con un backend anterior.
    asasPermitidas:      p.asasPermitidas ?? null,
    laminadosPermitidos: p.laminadosPermitidos ?? null,
  };
};

export const mapearCatalogoExpoAProducto = (p: {
  idcatalogo_expo:   number;
  nombre:            string;
  descripcion?:      string | null;
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
  precio_base?:      number | null;
  costo_laminado?:   number | null;
  id_tamano_producto?: number | null;
  tamano_producto?:  string | null;
  idproducto_papel?: number | null;
  idgrupo_papel?:    number | null;
  grupo_descripcion?: string | null;
  laminados_permitidos?: LaminadoPermitido[] | null;
  asas_permitidas?: AsaPermitida[] | null;
  idcat_laminado?: number | null;
  idfoil?: number | null;
  idcat_textura?: number | null;
  idcat_tipo_asa?: number | null;
  imagen_url:        string | null;
  tipo_producto:     string | null;
  altura?:           number | null;
  ancho?:            number | null;
  fuelle?:           number | null;
  fuelle_fondo?:     number | null;
  fuelle_lateral_iz?: number | null;
  fuelle_lateral_de?: number | null;
  refuerzo?:         number | null;
  por_kilo?:         number | string | null;
  origen?:           string | null;
  // NUEVO: pigmento (plástico) — de producto_acabado_default.pigmento_default
  pigmento?:         string | null;
  // NUEVO: defaults de tintas — ya vienen como CANTIDAD (el backend hace el
  // join a `tintas` y regresa cantidad, no idtintas). Sin pantones.
  tintas_frente_default?: number | null;
  tintas_dentro_default?: number | null;
}): Producto => {
  const esPlastico = p.categoria === "plastico";
  const esPapelOCarton = p.categoria === "papel" || p.categoria === "carton";
  return {
    id:           p.idcatalogo_expo,
    fuente:       "expo",
    nombre:       esPlastico ? (p.descripcion || p.nombre || "") : p.nombre,
    categoria:    p.categoria,
    medida:       p.medida         || "",
    material:     p.material       || "",
    calibre:      p.calibre        || "",
    tintas:       p.tintas         || (esPlastico ? "1" : "0x0"),
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

    idLaminadoDefault: esPapelOCarton
      ? (p.idcat_laminado ?? undefined)
      : undefined,

    idFoilDefault: esPapelOCarton
      ? (p.idfoil ?? undefined)
      : undefined,

    idTexturaDefault: esPapelOCarton
      ? (p.idcat_textura ?? undefined)
      : undefined,

    idAsaDefault: esPapelOCarton
      ? (p.idcat_tipo_asa ?? undefined)
      : undefined,

    otro:         p.otro           || "",
    // precio500 conserva su uso actual: para plástico Expo es el precio
    // unitario comercial. Los otros dos campos históricos se exponen mediante
    // propiedades separadas y quedan fuera del cotizador.
    precio500:    p.precio_500  != null ? `$${Number(p.precio_500).toFixed(2)}`  : "",
    precio1000:   "",
    precio3000:   "",
    precioReferencia500:
      p.precio_1000 != null ? `$${Number(p.precio_1000).toFixed(2)}` : "",
    precioReferencia1000:
      p.precio_3000 != null ? `$${Number(p.precio_3000).toFixed(2)}` : "",
    precioBase:   p.precio_base != null ? `$${Number(p.precio_base).toFixed(2)}` : "",
    costoLaminado: p.costo_laminado != null ? Number(p.costo_laminado) : 0,
    idTamanoProducto: p.id_tamano_producto ?? undefined,
    imagen:       p.imagen_url     || "",
    tipo:         p.tipo_producto || "",
    tipoProducto: p.tipo_producto || "",
    altura:       p.altura            != null ? String(p.altura)            : "",
    ancho:        p.ancho             != null ? String(p.ancho)             : "",
    fuelle:       esPapelOCarton && p.fuelle != null ? String(p.fuelle)    : "",
    fuelFondo:    esPlastico && p.fuelle_fondo      != null ? String(p.fuelle_fondo)      : "",
    fuelLateral:  esPlastico && p.fuelle_lateral_iz != null ? String(p.fuelle_lateral_iz) : "",
    fuelLateral2: esPlastico && p.fuelle_lateral_de != null ? String(p.fuelle_lateral_de) : "",
    refuerzo:     esPlastico && p.refuerzo          != null ? String(p.refuerzo)          : "",
    porKilo:      esPlastico && p.por_kilo != null ? Number(p.por_kilo) : undefined,
    configuracion_plastico_id: esPlastico ? p.idcatalogo_expo : undefined,
    origen:       p.origen            || "expo",
    idproducto_papel: esPapelOCarton
      ? (p.idproducto_papel ?? p.idcatalogo_expo)
      : undefined,
    idgrupo_papel: esPapelOCarton ? (p.idgrupo_papel ?? undefined) : undefined,
    grupo_descripcion: esPapelOCarton ? (p.grupo_descripcion || undefined) : undefined,
    asasPermitidas: esPapelOCarton ? (p.asas_permitidas || null) : null,
    laminadosPermitidos: esPapelOCarton ? (p.laminados_permitidos || null) : null,
    tamanoProd: esPapelOCarton ? (p.tamano_producto || "") : undefined,
    pigmento:     esPlastico ? (p.pigmento || "") : "",
    tintasFrenteDefault: p.tintas_frente_default ?? undefined,
    tintasDentroDefault: p.tintas_dentro_default ?? undefined,
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
  imagen_url?: string | null;
  precio_500?: number | null;
  precio_1000?: number | null;
  precio_3000?: number | null;
  origen?: "sistema" | "expo" | string | null;
  pigmento?: string | null;
  asa?: boolean;
  tipo_asa?: string | null;
  idsuaje?: number | null;
  id_color?: number | null;
  // NUEVO: default de tintas frente como CANTIDAD (join a `tintas` en backend)
  tintas_frente_default?: number | null;
}): Producto => {
  const materialNorm = normalizarMaterialPlastico(p.material);
  const esBopp = materialNorm === "BOPP";
  const esExpo = p.origen === "expo";
  const calibre = esBopp
    ? (p.calibre_bopp != null ? String(p.calibre_bopp) : "")
    : (p.calibre != null ? String(p.calibre) : "");
  return {
    id:           p.id,
    fuente:       esExpo ? "expo" : "sistema",
    nombre:       p.nombre,
    categoria:    "plastico",
    medida:       p.medida || "",
    material:     materialNorm,
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
    asa:          p.asa === true,
    tipoAsa:      p.tipo_asa || "",
    otro:         "",
    pigmento:     p.pigmento || "",
    idSuajeDefault: p.idsuaje  ?? undefined,
    idColorDefault: p.id_color ?? undefined,
    tintasFrenteDefault: p.tintas_frente_default ?? undefined,
    precio500:    p.precio_500  != null ? `$${Number(p.precio_500).toFixed(2)}`  : "",
    precio1000:   esExpo
      ? ""
      : (p.precio_1000 != null ? `$${Number(p.precio_1000).toFixed(2)}` : ""),
    precio3000:   esExpo
      ? ""
      : (p.precio_3000 != null ? `$${Number(p.precio_3000).toFixed(2)}` : ""),
    precioReferencia500:
      p.precio_1000 != null ? `$${Number(p.precio_1000).toFixed(2)}` : "",
    precioReferencia1000:
      p.precio_3000 != null ? `$${Number(p.precio_3000).toFixed(2)}` : "",
    imagen:       p.imagen_url || "",
    tipo:         "",
    tipoProducto: "",
    configuracion_plastico_id: p.id,
    altura:      p.altura       != null ? String(p.altura)       : "",
    ancho:       p.ancho        != null ? String(p.ancho)        : "",
    fuelFondo:   p.fuelle_fondo != null ? String(p.fuelle_fondo) : "",
    fuelLateral: p.fuelle_latiz != null ? String(p.fuelle_latiz) : "",
    fuelLateral2:p.fuelle_latde != null ? String(p.fuelle_latde) : "",
    fuelle:      "",
    refuerzo:    p.refuerzo != null ? String(p.refuerzo) : "",
    porKilo:     p.por_kilo != null ? Number(p.por_kilo) : undefined,
    origen:      esExpo ? "expo" : "sistema",
  };
};

export const mapearPapelSistemaAProducto = (p: {
  id: number; nombre: string; medida: string | null;
  tipo_producto?: string | null;
  descripcion_papel: string | null; primer_material?: string | null;
  primer_calibre?: string | null;
  ancho?: number | null; fuelle?: number | null; altura?: number | null;
  imagen_url?: string | null;
  precio_500?: number | null;
  precio_1000?: number | null;
  precio_3000?: number | null;
  precio_base?: number | null;
  costo_laminado?: number | null;
  id_tamano_producto?: number | null;
  tamano_producto?: string | null;
  idgrupo_papel?: number | null;
  grupo_descripcion?: string | null;
  laminados_permitidos?: LaminadoPermitido[] | null;
  asas_permitidas?: AsaPermitida[] | null;
  categoria?: "papel" | "carton";
  origen?: "sistema" | "expo";
  laminacion?: boolean;
  tipo_laminado?: string | null;
  hs?: boolean;
  tipo_hs?: string | null;
  ar?: boolean;
  textura?: boolean;
  tipo_textura?: string | null;
  uv?: boolean;
  asa?: boolean;
  tipo_asa?: string | null;
  idcat_laminado?: number | null;
  idfoil?: number | null;
  idcat_textura?: number | null;
  idcat_tipo_asa?: number | null;
  // NUEVO: defaults de tintas como CANTIDAD (join a `tintas` en backend)
  tintas_frente_default?: number | null;
  tintas_dentro_default?: number | null;
}): Producto => ({
  id:           p.id,
  fuente:       p.origen === "expo" ? "expo" : "sistema",
  nombre:       p.descripcion_papel
    ? `${p.nombre} — ${p.descripcion_papel}`
    : p.nombre,
  categoria:    p.categoria || "papel",
  medida:       p.medida || "",
  material:     p.primer_material || "",
  calibre:      p.primer_calibre || "",
  tintas:       "0x0",
  laminacion:   p.laminacion === true,
  tipoLaminado: p.tipo_laminado || "",
  hs:           p.hs === true,
  tipoHs:       p.tipo_hs || "",
  ar:           p.ar === true,
  textura:      p.textura === true,
  tipoTextura:  p.tipo_textura || "",
  uv:           p.uv === true,
  asa:          p.asa === true,
  tipoAsa:      p.tipo_asa || "",
  otro:         "",
  idLaminadoDefault: p.idcat_laminado    ?? undefined,
  idFoilDefault:     p.idfoil            ?? undefined,
  idTexturaDefault:  p.idcat_textura     ?? undefined,
  idAsaDefault:      p.idcat_tipo_asa    ?? undefined,
  tintasFrenteDefault: p.tintas_frente_default ?? undefined,
  tintasDentroDefault: p.tintas_dentro_default ?? undefined,
  precio500:    p.precio_500  != null ? `$${Number(p.precio_500).toFixed(2)}`  : "",
  precio1000:   p.origen === "expo"
    ? ""
    : (p.precio_1000 != null ? `$${Number(p.precio_1000).toFixed(2)}` : ""),
  precio3000:   p.origen === "expo"
    ? ""
    : (p.precio_3000 != null ? `$${Number(p.precio_3000).toFixed(2)}` : ""),
  precioReferencia500:
    p.precio_1000 != null ? `$${Number(p.precio_1000).toFixed(2)}` : "",
  precioReferencia1000:
    p.precio_3000 != null ? `$${Number(p.precio_3000).toFixed(2)}` : "",
  precioBase:   p.precio_base != null ? `$${Number(p.precio_base).toFixed(2)}` : "",
  costoLaminado: p.costo_laminado != null ? Number(p.costo_laminado) : 0,
  idTamanoProducto: p.id_tamano_producto ?? undefined,
  tamanoProd: p.tamano_producto || "",
  imagen:       p.imagen_url || "",
  idproducto_papel: p.id,
  idgrupo_papel: p.idgrupo_papel ?? undefined,
  grupo_descripcion: p.grupo_descripcion || undefined,
  asasPermitidas: p.asas_permitidas || null,
  laminadosPermitidos: p.laminados_permitidos || null,
  tipo:         p.tipo_producto || p.nombre || "",
  tipoProducto: p.tipo_producto || p.nombre || "",
  ancho:   p.ancho  != null ? String(p.ancho)  : "",
  fuelle:  p.fuelle != null ? String(p.fuelle) : "",
  altura:  p.altura != null ? String(p.altura) : "",
  fuelFondo:    "",
  fuelLateral:  "",
  fuelLateral2: "",
  refuerzo:     "",
  origen:  p.origen === "expo" ? "expo" : "sistema",
});