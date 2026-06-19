// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Producto {
  id: number;
  nombre: string;
  categoria: "papel" | "plastico" | "carton";
  medida: string;
  material: string;
  calibre: string;
  tintas: string;
  laminacion: boolean;
  hs: boolean;
  ar: boolean;
  textura: boolean;
  uv: boolean;
  asa: boolean;
  otro: string;
  tipoLaminado?: string;
  tipoAsa?: string;
  tipoTextura?: string;
  tipoHs?: string;
  precio500: string;
  precio1000: string;
  precio3000: string;
  imagen: string;
  // campos papel / cartón
  tipo?: string;
  ancho?: string;
  fuelle?: string;
  altura?: string;
  tipoPapel?: string;
  otro2?: string;
  // campos plástico
  tipoProducto?: string;
  fuelLateral?: string;
  fuelFondo?: string;
  troquel?: boolean;
  perforado?: boolean;
}

export interface FilaProducto {
  uid: string;
  producto: Producto;
  precio1: string;
  precio2: string;
  precio3: string;
  // acabados editables por fila (independientes del producto original)
  laminacion: boolean;
  tipoLaminado: string;
  hs: boolean;
  tipoHs: string;
  ar: boolean;
  textura: boolean;
  tipoTextura: string;
  uv: boolean;
  asa: boolean;
  tipoAsa: string;
  tintas: string;
  otro: string;
  // Campos editables en tabla que antes solo vivían en estado local de FilaTabla
  // (se agregan aquí para que el snapshot de "Guardar cotización" sea completo).
  medida: string;
  material: string;     // material elegido en tabla (papel o plástico, según categoría)
  calibre: string;      // calibre elegido en tabla
  tipoPlastico: string; // Troquel / Bolsa plana / etc. (solo aplica si categoría === "plastico")
  modoExtra: "precio" | "pigmento";
  extra: string;        // cargo extra numérico, si modoExtra === "precio"
  pigmento: string;     // color elegido, si modoExtra === "pigmento"
}

export interface ClienteExpo {
  nombre: string;
  celular: string;
  correoUsuario: string;
  correoExt: string;
  correoExtCustom?: string;
  impresion: string;
  ciudad: string;
  estado: string;
  clase: "AAA" | "AA" | "A" | "";
  intereses: ("papel" | "plastico" | "cajas" | "otros")[];
  observaciones: string;
}

// ─── Registro de cotizaciones/pedidos (módulo de seguimiento) ────────────────
// Snapshot completo de una cotización guardada desde la hoja: cliente, folio,
// productos con sus precios/acabados, y un estado que avanza de
// "cotizacion" → "pedido" cuando el vendedor la aprueba.
// El campo `origen` identifica que este registro nació en el módulo Expo,
// para cuando se integre con el sistema de cotizaciones/pedidos real de GrupEB.
export type EstadoCotizacion = "cotizacion" | "pedido";

// Registra, al aprobar, qué productos quedaron y qué cantidad de cada uno
// eligió el cliente (1 de las 3 columnas: precio1/precio2/precio3).
export interface ItemPedidoAprobado {
  filaUid: string;
  cantidadElegida: "precio1" | "precio2" | "precio3";
}

export interface CotizacionGuardada {
  id: string;
  folio: string;
  origen: "expo";              // identificador de procedencia para el sistema real
  cliente: string;              // nombre del cliente al momento de guardar
  clienteData: ClienteExpo | null; // snapshot completo del prospecto, si existía
  fecha: string;                 // fecha de creación, formato legible
  estado: EstadoCotizacion;
  filas: FilaProducto[];         // snapshot de los productos cotizados
  comentarios: string;
  total: { precio1: number; precio2: number; precio3: number }; // suma de cada columna de cantidad
  // Se llena solo cuando estado === "pedido": qué productos y qué cantidad
  // de cada uno aprobó el cliente. Si un producto no aparece aquí, significa
  // que el cliente lo rechazó.
  itemsAprobados?: ItemPedidoAprobado[];
}

// ─── Constantes de opciones ───────────────────────────────────────────────────

export const OPCIONES_LAMINADO = ["Sin laminado", "Mate", "Brillante", "Soft touch", "Holográfico"] as const;
export const OPCIONES_HS       = ["Sin HS", "Hot stamping dorado", "Hot stamping plateado", "Hot stamping holográfico"] as const;
export const OPCIONES_TEXTURA  = ["Sin textura", "Piel cocodrilo", "Lino", "Cuadros", "Rombos"] as const;
export const OPCIONES_ASA      = ["Sin asa", "Cordel", "Listón satinado", "Listón popotillo", "Entorchado"] as const;

// Genera: 1x0 hasta 6x6 — frente va de 1-6, reverso va de 0-6 independiente (PAPEL/CARTÓN)
export const OPCIONES_TINTAS: string[] = (() => {
  const arr: string[] = [];
  for (let f = 1; f <= 6; f++) {
    for (let r = 0; r <= 6; r++) {
      arr.push(`${f}x${r}`);
    }
  }
  return arr;
})();

// Tintas de PLÁSTICO: solo 1 a 6, sin notación frente/reverso
export const OPCIONES_TINTAS_PLASTICO: string[] = ["1","2","3","4","5","6"];

// ─── Acabados específicos de PLÁSTICO (reemplazan laminación/HS/AR/textura/UV) ─
export const OPCIONES_TIPO_PLASTICO = ["Sin tipo","Troquel","Bolsa plana","Bolsa envíos","Asa rígida","Asa flexible"] as const;

// ─── Materiales y calibres de PLÁSTICO (encadenados) ──────────────────────────
// Los calibres de plástico son números planos, sin unidad (a diferencia de papel/cartón).
export const MATERIALES_PLASTICO = ["Alta densidad","Baja densidad","BOPP"] as const;
export const CALIBRES_PLASTICO: Record<string, string[]> = {
  "Alta densidad": ["130","140","150","175","200","225","250"],
  "Baja densidad": ["130","140","150","175","200","225","250"],
  "BOPP":           ["30","35","40","50"],
};

// ─── Materiales y calibres de PAPEL/CARTÓN (encadenados) ──────────────────────
export const MATERIALES_PAPEL = ["Multicapa","Bond","Couché","Kraft","Cartulina","Opalina"] as const;
// Calibres planos para buscador (todos juntos, con su unidad visible)
export const CALIBRES_PAPEL_FLAT: string[] = [
  "10 pt","12 pt","14 pt","16 pt","18 pt","20 pt","22 pt","24 pt",
  "130 g","150 g","200 g","250 g",
  "ECT-23","ECT-32","ECT-44",
];
export const CALIBRES_PAPEL: Record<string, string[]> = {
  puntos: ["10 pt","12 pt","14 pt","16 pt","18 pt","20 pt","22 pt","24 pt"],
  gramos: ["130 g","150 g","200 g","250 g"],
  ect:    ["ECT-23","ECT-32","ECT-44"],
};

// ─── Pigmentos de PLÁSTICO (papel no usa pigmento) ────────────────────────────
export const PIGMENTOS_PLASTICO = [
  "Natural","Blanco","Negro","Tinto","Verde","Amarillo","Café","Rojo",
] as const;

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

// ─── Medidas predefinidas por categoría ───────────────────────────────────────
export const MEDIDAS_CAT: Record<string, string[]> = {
  papel:    ["10x7 cm","15x8x20 cm","20x10x30 cm","22x15x5 cm","25x12x35 cm","30x15x40 cm","32x24 cm","40x30x15 cm"],
  carton:   ["15x10x6 cm","20x15x8 cm","25x20x10 cm","30x20x12 cm","30x20x60 cm","35x25x15 cm","40x30x15 cm","40x30x25 cm"],
  plastico: ["20x30 cm","25x35 cm","30x40 cm","35x45 cm","40x50 cm","20x25x5 cm","30x40x10 cm","40x35x10 cm"],
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const uid = () => Math.random().toString(36).slice(2, 9);

// Folio formato CO-26001: "CO-" + últimos 2 dígitos del año + consecutivo de 3 dígitos.
// Por ahora el consecutivo es aleatorio (no hay backend/DB todavía para llevar el conteo real).
const _anioCorto = new Date().getFullYear().toString().slice(-2);
const _consecutivo = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
export const FOLIO = `CO-${_anioCorto}${_consecutivo}`;

export const TODAY = new Date().toLocaleDateString("es-MX", {
  day: "2-digit", month: "short", year: "numeric",
});

/** Genera un folio nuevo (usado al crear cada cotización guardada, no solo al cargar la página) */
export const generarFolio = (): string => {
  const anio = new Date().getFullYear().toString().slice(-2);
  const consecutivo = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `CO-${anio}${consecutivo}`;
};

/** Convierte un folio de cotización (CO-26047) a folio de pedido (PE-26047) al aprobar */
export const folioAPedido = (folioCotizacion: string): string =>
  folioCotizacion.replace(/^CO-/, "PE-");

/** Convierte un string de precio "$4.80" a número */
const _num = (s: string): number => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

/** Suma las 3 columnas de precio de todas las filas de una cotización */
export const sumarTotales = (filas: FilaProducto[]) => ({
  precio1: filas.reduce((acc, f) => acc + _num(f.precio1), 0),
  precio2: filas.reduce((acc, f) => acc + _num(f.precio2), 0),
  precio3: filas.reduce((acc, f) => acc + _num(f.precio3), 0),
});

/** Construye una FilaProducto con acabados propios a partir de un Producto */
export const filaDesdeProducto = (p: Producto): FilaProducto => ({
  uid: uid(),
  producto: p,
  precio1: p.precio500,
  precio2: p.precio1000,
  precio3: p.precio3000,
  laminacion:   p.laminacion,
  tipoLaminado: p.tipoLaminado || (p.laminacion ? "Mate" : ""),
  hs:           p.hs,
  tipoHs:       p.tipoHs || (p.hs ? "Hot stamping dorado" : ""),
  ar:           p.ar,
  textura:      p.textura,
  tipoTextura:  p.tipoTextura || (p.textura ? "Piel cocodrilo" : ""),
  uv:           p.uv,
  asa:          p.asa,
  tipoAsa:      p.tipoAsa || (p.asa ? "Cordel" : ""),
  tintas:       p.tintas || "1x0",
  otro:         p.otro || "",
  medida:       p.medida || "",
  material:     p.material || "",
  calibre:      p.calibre || "",
  tipoPlastico: p.tipoProducto || "",
  modoExtra:    "precio",
  extra:        "",
  pigmento:     "",
});