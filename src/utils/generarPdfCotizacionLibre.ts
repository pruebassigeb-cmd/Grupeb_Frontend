
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { cargarLogoBase64 } from "./Pdfutils";
import logoUrl from "../assets/logogrupeb.png";
import fotoCotLibreUrl from "../assets/cotlibre.png";
import { subirPdfA3 } from "../services/pdfS3.service";
import { entregarPdf } from "./entregarPdf";
import { formatMoney, type Moneda } from "./formatMoney";

export interface ItemCotizacionLibrePdf {
  tipo: "plastico" | "papel" | "especial";
  producto_id?: number | null;
  producto_texto?: string | null;
  medida_texto?: string | null;
  material_id?: number | null;
  material_texto?: string | null;
  calibre_id?: number | null;
  calibre_texto?: string | null;
  tintas_frente_id?: number | null;
  tintas_frente_texto?: string | null;
  tintas_dentro_id?: number | null;
  tintas_dentro_texto?: string | null;
  pantones_texto?: string | null;
  pantones_dentro_texto?: string | null;
  laminado_id?: number | null;
  laminado_texto?: string | null;
  hs_id?: number | null;
  hs_texto?: string | null;
  alto_relieve_bool?: boolean | null;
  textura_id?: number | null;
  textura_texto?: string | null;
  uv_bool?: boolean | null;
  asa_id?: number | null;
  asa_texto?: string | null;
  color_asa_id?: number | null;
  color_asa_texto?: string | null;
  medida_troquel_id?: number | null;
  medida_troquel_texto?: string | null;
  cinta_seguridad_id?: number | null;
  cinta_seguridad_texto?: string | null;
  perforacion_bool?: boolean | null;
  pigmentos_texto?: string | null;
  caras_id?: number | null;
  caras_texto?: string | null;
  cantidad_1?: number | null; precio_1?: number | null;
  cantidad_2?: number | null; precio_2?: number | null;
  cantidad_3?: number | null; precio_3?: number | null;
  notas?: string | null;
}

export interface CotizacionLibrePdf {
  folio: string;
  fecha: string;
  cliente?: string | null;
  empresa?: string | null;
  asesor?: string | null;
  comentarios?: string | null;
  moneda?: Moneda;
  items: ItemCotizacionLibrePdf[];
}

/** Imágenes opcionales de la plantilla (dataURL o URL importada por el bundler). */
export interface AssetsPropuesta {
  fotoProducto?: string;
  qrWeb?: string;
  qrWhatsapp?: string;
}

// Los QR se generan en vivo con la librería `qrcode` — no dependen de que
// existan archivos en src/assets/. `assets.qrWeb`/`assets.qrWhatsapp` siguen
// disponibles para forzar una imagen distinta si algún día hiciera falta.
const URL_PAGINA_WEB = "https://grupoeb.com.mx/";
const URL_WHATSAPP = "https://wa.me/523339540924"; // formato click-to-chat estándar

async function generarQR(texto: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(texto, {
      margin: 1,
      width: 240,
      color: { dark: "#161616", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}

const campo = (id?: number | null, texto?: string | null): string => {
  if (texto) return texto;
  if (id != null) return `código: ${id}`;
  return "";
};

// ── Paleta ────────────────────────────────────────────────────────────────
const NEGRO: [number, number, number] = [22, 22, 22];
const DORADO: [number, number, number] = [176, 141, 87];
const DORADO_35: [number, number, number] = [228, 173, 58]; // #E4AD3A — bloque "+35 AÑOS"
const TINTA: [number, number, number] = [28, 28, 28];
const GRIS_CLARO: [number, number, number] = [190, 190, 190];

// ── Geometría de la hoja (mm) — A4 horizontal ─────────────────────────────
const PW = 297;
const PH = 210;

// Coordenadas ajustadas a la maqueta de referencia A4 horizontal.
// La tabla se redujo 5% de ancho (manteniendo su borde derecho fijo en
// DER=290, o sea "empujándola a la derecha") y ese espacio liberado
// (10.5 mm) se le dio a la foto de producto, que ahora es un poco más ancha.
const TABLE_W_ORIGINAL = 210.5;
const TABLE_W = TABLE_W_ORIGINAL * 0.95;      // 200.0 mm (antes 210.5)
const DER = PW - 7;
const COL_X = DER - TABLE_W;                  // 90 mm (antes 79.5)
const DELTA_COL_X = COL_X - 79.5;             // 10.5 mm ganados por la foto
const HEAD_X = 93.5;               // sangría del título (un poco más a la derecha)
const TABLA_Y = 66;
const COMENT_H_MAX = 20;
// ── Bloque inferior (Comentarios / +35 años / QRs / Planta / Condiciones) ──
// Antes estas piezas vivían en coordenadas Y fijas (Comentarios se calculaba
// desde el final de la tabla, pero +35/QR/Planta/Condiciones arrancaban
// siempre en y=135 y y=115 sin importar qué tan abajo terminara la tabla o
// el cuadro de Comentarios). Con tablas de 5+ renglones y celdas de 2 líneas
// (material+calibre, cantidad+precio) el final real de la tabla cae más
// abajo de lo que esas coordenadas fijas asumían, y todo se encimaba.
// Ahora el bloque completo se ancla dinámicamente al final de la tabla,
// aprovechando el espacio libre que sobraba antes del filete dorado inferior.
const GAP_TABLA_COMENT = 3;        // tabla → cuadro de Comentarios
const GAP_COMENT_BLOQUE = 5;       // Comentarios → fila de +35/QR/Planta
// BLOQUE_INF_H ya no es un valor fijo: en la referencia real, la caja negra
// de "+35 años" y el marco de "Condiciones de venta" llegan casi hasta el
// filete dorado inferior (aprovechando TODO el espacio libre) — antes se
// cortaban a los 41 mm dejando un hueco en blanco grande abajo. Ahora se
// calcula al vuelo como "todo lo que sobra hasta el límite inferior".
const LIMITE_INFERIOR = PH - 6.5 - 1.5; // aire mínimo antes del filete dorado inferior
// La foto es el fondo de TODA la columna izquierda (desde el borde superior
// de la hoja hasta antes de "TODOS LOS PROCESOS..."), y la cinta diagonal +
// logo + tagline se dibujan DESPUÉS (más abajo en este archivo) para quedar
// por encima de ella. Su ancho ahora incluye los 10.5 mm liberados de la
// tabla, y su alto se recorta un poco (150→142) para dejar aire real antes
// del texto "TODOS LOS PROCESOS..." (que sigue arrancando en y=152).
const FOTO = { x: 0, y: 0, w: 78 + DELTA_COL_X, h: 142 };

type Doc = jsPDF;

// ── Utilidades de dibujo ──────────────────────────────────────────────────
function poligono(doc: Doc, pts: [number, number][], color: [number, number, number]) {
  const rel = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
  doc.setFillColor(...color);
  doc.lines(rel as any, pts[0][0], pts[0][1], [1, 1], "F", true);
}

function texto(
  doc: Doc,
  txt: string,
  x: number,
  y: number,
  opts: {
    size?: number;
    font?: [string, string];
    color?: [number, number, number];
    align?: "left" | "center" | "right";
    maxWidth?: number;
    charSpace?: number;
    lineHeight?: number;
  } = {}
) {
  const { size = 8, font = ["helvetica", "normal"], color = TINTA, align = "left" } = opts;
  doc.setFont(font[0], font[1]);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  if (opts.lineHeight) doc.setLineHeightFactor(opts.lineHeight);
  doc.text(txt, x, y, {
    align,
    maxWidth: opts.maxWidth,
    charSpace: opts.charSpace,
  } as any);
  if (opts.lineHeight) doc.setLineHeightFactor(1.15);
}

/** Dibuja la imagen si existe; si no, deja el lugar vacío (sin marca alguna). */
function imagenOEspacio(
  doc: Doc,
  data: string | null | undefined,
  x: number, y: number, w: number, h: number
) {
  if (!data) return;
  try { doc.addImage(data, x, y, w, h); } catch { /* el lugar queda vacío */ }
}

// ── Íconos de línea ───────────────────────────────────────────────────────
type Icono = (doc: Doc, cx: number, cy: number, s: number, c: [number, number, number]) => void;

const trazo = (doc: Doc, c: [number, number, number], w = 0.35) => {
  doc.setDrawColor(...c);
  doc.setLineWidth(w);
};

const iconPersona: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.45);
  doc.circle(cx, cy - s * 0.26, s * 0.2, "S");
  // Hombros: recta corta + curva + recta corta (sin cerrar, para no formar triángulo)
  doc.lines(
    [
      [0, -s * 0.1],
      [s * 0.06, -s * 0.24, s * 0.62, -s * 0.24, s * 0.68, 0],
      [0, s * 0.1],
    ] as any,
    cx - s * 0.34, cy + s * 0.44, [1, 1], "S"
  );
};

const iconEdificio: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.45);
  const w = s * 0.62, h = s * 0.86;
  doc.rect(cx - w / 2, cy - h / 2, w, h, "S");
  doc.line(cx - w / 2, cy - h / 2 + h * 0.14, cx + w / 2, cy - h / 2 + h * 0.14);
  trazo(doc, c, 0.3);
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 3; k++) {
      const bx = cx - w / 2 + w * 0.14 + k * w * 0.28;
      const by = cy - h / 2 + h * 0.24 + r * h * 0.17;
      doc.rect(bx, by, w * 0.15, h * 0.1, "S");
    }
  }
};

const iconCalendario: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.45);
  const w = s * 0.8, h = s * 0.74;
  doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 0.6, 0.6, "S");
  doc.setFillColor(...c);
  doc.rect(cx - w / 2, cy - h / 2, w, h * 0.26, "F");
  doc.line(cx - w * 0.26, cy - h / 2 - s * 0.12, cx - w * 0.26, cy - h / 2 + s * 0.06);
  doc.line(cx + w * 0.26, cy - h / 2 - s * 0.12, cx + w * 0.26, cy - h / 2 + s * 0.06);
  trazo(doc, c, 0.25);
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 4; k++) {
      doc.rect(cx - w * 0.38 + k * w * 0.25, cy - h * 0.14 + r * h * 0.22, w * 0.13, h * 0.12, "S");
    }
  }
};

const iconBolsa: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.4);
  const w = s * 0.62, h = s * 0.62;
  doc.rect(cx - w / 2, cy - h / 2 + s * 0.12, w, h, "S");
  doc.lines(
    [[0, -s * 0.2], [w * 0.34, 0], [0, s * 0.2]] as any,
    cx - w * 0.17, cy - h / 2 + s * 0.12, [1, 1], "S"
  );
};

const iconCapas: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.4);
  // Antes el rombo arrancaba en (cx-0.34s, y0) y con esos mismos segmentos
  // relativos terminaba centrado en (cx-0.34s, y0+0.16s) — es decir, el
  // ícono completo quedaba ~2.3 mm corrido a la IZQUIERDA de cx en vez de
  // centrado, y por eso se veía descuadrado frente a los otros 3 íconos.
  // Arrancando en (cx, y0-0.16s) el mismo rombo queda centrado en (cx, y0).
  [-0.2, 0.05, 0.3].forEach((off) => {
    const y0 = cy + off * s;
    doc.lines(
      [[s * 0.34, s * 0.16], [-s * 0.34, s * 0.16], [-s * 0.34, -s * 0.16]] as any,
      cx, y0 - s * 0.16, [1, 1], "S", true
    );
  });
};

const iconEscudo: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.4);
  const w = s * 0.6, h = s * 0.78;
  doc.lines(
    [[w, 0], [0, h * 0.5], [-w / 2, h * 0.5], [-w / 2, -h * 0.5]] as any,
    cx - w / 2, cy - h / 2, [1, 1], "S", true
  );
  trazo(doc, c, 0.5);
  doc.lines([[w * 0.16, h * 0.16], [w * 0.32, -h * 0.3]] as any, cx - w * 0.22, cy, [1, 1], "S");
};

const iconCamion: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.4);
  const w = s * 0.78, h = s * 0.4;
  doc.rect(cx - w / 2, cy - h / 2, w * 0.6, h, "S");
  doc.lines(
    [[w * 0.28, 0], [w * 0.12, h * 0.35], [0, h * 0.65], [-w * 0.4, 0]] as any,
    cx - w / 2 + w * 0.6, cy - h / 2 + s * 0.02, [1, 1], "S", true
  );
  doc.circle(cx - w * 0.2, cy + h / 2 + s * 0.08, s * 0.08, "S");
  doc.circle(cx + w * 0.24, cy + h / 2 + s * 0.08, s * 0.08, "S");
  trazo(doc, c, 0.3);
  [-0.16, 0, 0.16].forEach((o) => doc.line(cx - w * 0.62, cy + o * s, cx - w * 0.5, cy + o * s));
};

const iconLapiz: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.lines(
    [[s * 0.5, -s * 0.5], [s * 0.14, s * 0.14], [-s * 0.5, s * 0.5], [-s * 0.2, 0.02]] as any,
    cx - s * 0.32, cy + s * 0.32, [1, 1], "S", true
  );
  doc.line(cx - s * 0.42, cy + s * 0.42, cx + s * 0.42, cy + s * 0.42);
};

const iconImpresora: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.rect(cx - s * 0.42, cy - s * 0.1, s * 0.84, s * 0.34, "S");
  doc.rect(cx - s * 0.24, cy - s * 0.4, s * 0.48, s * 0.3, "S");
  doc.rect(cx - s * 0.2, cy + s * 0.24, s * 0.4, s * 0.16, "S");
  trazo(doc, c, 0.25);
  doc.line(cx - s * 0.42, cy + s * 0.06, cx + s * 0.42, cy + s * 0.06);
};

const iconSuaje: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.rect(cx - s * 0.34, cy - s * 0.3, s * 0.68, s * 0.44, "S");
  doc.lines(
    [[s * 0.14, -s * 0.16], [s * 0.68, 0], [-s * 0.14, s * 0.16]] as any,
    cx - s * 0.34, cy - s * 0.3, [1, 1], "S"
  );
  doc.line(cx + s * 0.34, cy - s * 0.3, cx + s * 0.48, cy - s * 0.46);
  doc.line(cx + s * 0.48, cy - s * 0.46, cx + s * 0.48, cy - s * 0.02);
  doc.line(cx + s * 0.48, cy - s * 0.02, cx + s * 0.34, cy + s * 0.14);
};

const iconGota: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.lines(
    [[s * 0.26, s * 0.34], [-s * 0.26, s * 0.3], [-s * 0.26, -s * 0.3]] as any,
    cx, cy - s * 0.4, [1, 1], "S", true
  );
};

const iconEnsamble: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.rect(cx - s * 0.34, cy - s * 0.12, s * 0.68, s * 0.42, "S");
  doc.line(cx - s * 0.34, cy - s * 0.12, cx, cy - s * 0.34);
  doc.line(cx, cy - s * 0.34, cx + s * 0.34, cy - s * 0.12);
  doc.line(cx, cy - s * 0.34, cx, cy + s * 0.3);
};

const iconEstrella: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s * 0.44 : s * 0.18;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const rel = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
  doc.lines(rel as any, pts[0][0], pts[0][1], [1, 1], "S", true);
};

const iconRollo: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.ellipse(cx - s * 0.22, cy, s * 0.14, s * 0.3, "S");
  doc.line(cx - s * 0.22, cy - s * 0.3, cx + s * 0.4, cy - s * 0.3);
  doc.line(cx - s * 0.22, cy + s * 0.3, cx + s * 0.4, cy + s * 0.3);
  doc.line(cx + s * 0.4, cy - s * 0.3, cx + s * 0.4, cy + s * 0.3);
};

const iconHotStamping: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.rect(cx - s * 0.3, cy - s * 0.42, s * 0.6, s * 0.26, "S");
  doc.line(cx, cy - s * 0.42, cx, cy - s * 0.52);
  doc.rect(cx - s * 0.42, cy + s * 0.16, s * 0.84, s * 0.16, "S");
  trazo(doc, c, 0.25);
  doc.line(cx - s * 0.2, cy - s * 0.16, cx - s * 0.2, cy + s * 0.16);
  doc.line(cx + s * 0.2, cy - s * 0.16, cx + s * 0.2, cy + s * 0.16);
};

const iconAltoRelieve: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.rect(cx - s * 0.4, cy - s * 0.34, s * 0.8, s * 0.68, "S");
  trazo(doc, c, 0.3);
  doc.lines([[s * 0.18, -s * 0.24], [s * 0.18, s * 0.24]] as any, cx - s * 0.18, cy + s * 0.14, [1, 1], "S");
};

const iconBarnizUV: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.rect(cx - s * 0.28, cy - s * 0.46, s * 0.56, s * 0.24, "S");
  doc.rect(cx - s * 0.44, cy + s * 0.24, s * 0.88, s * 0.16, "S");
  trazo(doc, c, 0.25);
  [-0.18, 0, 0.18].forEach((o) => doc.line(cx + o * s, cy - s * 0.2, cx + o * s, cy + s * 0.2));
};

const iconTexturizado: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.3);
  doc.rect(cx - s * 0.4, cy - s * 0.4, s * 0.8, s * 0.8, "S");
  for (let i = 1; i < 4; i++) {
    doc.line(cx - s * 0.4 + (i * s * 0.8) / 4, cy - s * 0.4, cx - s * 0.4 + (i * s * 0.8) / 4, cy + s * 0.4);
    doc.line(cx - s * 0.4, cy - s * 0.4 + (i * s * 0.8) / 4, cx + s * 0.4, cy - s * 0.4 + (i * s * 0.8) / 4);
  }
};

const iconLitolaminado: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.lines([[s * 0.8, 0], [s * 0.16, -s * 0.2], [-s * 0.8, 0]] as any, cx - s * 0.44, cy + s * 0.2, [1, 1], "S", true);
  doc.lines([[s * 0.8, 0], [s * 0.16, -s * 0.2], [-s * 0.8, 0]] as any, cx - s * 0.44, cy - s * 0.06, [1, 1], "S", true);
};

const iconExtrusion: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.rect(cx - s * 0.44, cy - s * 0.16, s * 0.44, s * 0.4, "S");
  doc.rect(cx + s * 0.04, cy - s * 0.36, s * 0.4, s * 0.6, "S");
  trazo(doc, c, 0.25);
  doc.line(cx - s * 0.44, cy + s * 0.06, cx, cy + s * 0.06);
};

const iconInyeccion: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.rect(cx - s * 0.46, cy - s * 0.06, s * 0.92, s * 0.3, "S");
  doc.rect(cx - s * 0.26, cy - s * 0.36, s * 0.34, s * 0.3, "S");
  trazo(doc, c, 0.25);
  doc.line(cx + s * 0.16, cy - s * 0.2, cx + s * 0.4, cy - s * 0.2);
};

const iconFlexo: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.rect(cx - s * 0.44, cy - s * 0.3, s * 0.88, s * 0.5, "S");
  trazo(doc, c, 0.25);
  doc.line(cx - s * 0.44, cy + s * 0.02, cx + s * 0.44, cy + s * 0.02);
  doc.line(cx - s * 0.16, cy - s * 0.3, cx - s * 0.16, cy + s * 0.02);
  doc.line(cx + s * 0.16, cy - s * 0.3, cx + s * 0.16, cy + s * 0.02);
  doc.line(cx - s * 0.3, cy + s * 0.2, cx + s * 0.3, cy + s * 0.32);
};

/** Pin de ubicación relleno (gota con punto blanco), como el de la referencia. */
const iconPinRelleno: Icono = (doc, cx, cy, s, c) => {
  doc.setFillColor(...c);
  doc.circle(cx, cy - s * 0.12, s * 0.42, "F");
  doc.triangle(
    cx - s * 0.36, cy + s * 0.05,
    cx + s * 0.36, cy + s * 0.05,
    cx, cy + s * 0.62,
    "F"
  );
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy - s * 0.12, s * 0.17, "F");
};

/** Pin de ubicación en línea (contorno), para usarse dentro de círculos
 * pequeños dorados como el de "Condiciones de venta" — el relleno negro de
 * iconPinRelleno se ve pesado a ese tamaño. */
const iconPinLinea: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.circle(cx, cy - s * 0.12, s * 0.32, "S");
  doc.lines(
    [[-s * 0.22, s * 0.32], [s * 0.22, 0]] as any,
    cx - s * 0.22, cy + s * 0.08, [1, 1], "S"
  );
  doc.setFillColor(...c);
  doc.circle(cx, cy - s * 0.12, s * 0.1, "F");
};

/** Reloj de línea (círculo + manecillas), para "Vigencia de la cotización". */
const iconRelojLinea: Icono = (doc, cx, cy, s, c) => {
  trazo(doc, c, 0.35);
  doc.circle(cx, cy, s * 0.4, "S");
  doc.line(cx, cy, cx, cy - s * 0.24);
  doc.line(cx, cy, cx + s * 0.18, cy + s * 0.06);
};

/** Teléfono relleno (círculo + auricular en blanco), como el de la referencia. */
const iconTelefonoRelleno: Icono = (doc, cx, cy, s, c) => {
  doc.setFillColor(...c);
  doc.circle(cx, cy, s * 0.46, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(s * 0.13);
  doc.line(cx - s * 0.15, cy + s * 0.17, cx + s * 0.15, cy - s * 0.17);
  doc.setFillColor(255, 255, 255);
  doc.circle(cx - s * 0.15, cy + s * 0.17, s * 0.1, "F");
  doc.circle(cx + s * 0.15, cy - s * 0.17, s * 0.1, "F");
};

/** Círculo de red social con un glifo/inicial dentro. */
function circuloRed(doc: Doc, cx: number, cy: number, r: number, glifo: string) {
  doc.setFillColor(...NEGRO);
  doc.circle(cx, cy, r, "F");
  texto(doc, glifo, cx, cy + r * 0.38, {
    size: r * 2.0,
    font: ["helvetica", "bold"],
    color: [255, 255, 255],
    align: "center",
  });
}

// ── Función principal ─────────────────────────────────────────────────────
export async function generarPdfCotizacionLibre(
  cotizacion: CotizacionLibrePdf,
  guardarEnS3 = false,
  descargar = true,
  assets: AssetsPropuesta = {}
): Promise<Blob> {
  const logoBase64 = await cargarLogoBase64(logoUrl).catch(() => null);
  const fotoBase64 = assets.fotoProducto
    ?? (await cargarLogoBase64(fotoCotLibreUrl).catch(() => null));
  const qrWebBase64 = assets.qrWeb ?? (await generarQR(URL_PAGINA_WEB));
  const qrWaBase64 = assets.qrWhatsapp ?? (await generarQR(URL_WHATSAPP));
  const moneda: Moneda = cotizacion.moneda ?? "MXN";

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setLineHeightFactor(1.15);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PW, PH, "F");

  // ═══════════ COLUMNA IZQUIERDA ═══════════

  // Foto de producto (src/assets/cotlibre.png) — ahora es el fondo de toda
  // la columna izquierda (de arriba a abajo), por eso se dibuja PRIMERO;
  // la cinta negra/dorada, el logo y el tagline van justo después para
  // quedar por encima de ella y seguir siendo legibles.
  // NOTA: se probó un difuminado en los bordes derecho/inferior a base de
  // franjas rectangulares con opacidad decreciente, pero al renderizar se
  // veía como líneas/bandas marcadas (efecto "persiana") en vez de un
  // desvanecido suave — jsPDF no mezcla bien tantos rects semitransparentes
  // superpuestos. Se quitó; la foto queda con borde limpio, sin difuminar.
  imagenOEspacio(doc, fotoBase64, FOTO.x, FOTO.y, FOTO.w, FOTO.h);

  // Bloque negro diagonal (sangra por el borde izquierdo y superior)
  poligono(doc, [[0, 0], [50, 0], [50, 45], [0, 61], [0, 0]], NEGRO);
  poligono(doc, [[0, 62.5], [50, 46.5], [50, 49], [0, 65], [0, 62.5]], DORADO);

  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", 25 - 16, 6, 32, 18); } catch { /* noop */ }
  }
  texto(doc, "Eurobolsa", 25, 30, { size: 15, font: ["times", "bolditalic"], color: DORADO, align: "center" });
  texto(doc, "EMPACAMOS", 25, 38, { size: 8.5, font: ["helvetica", "bold"], color: [255, 255, 255], align: "center", charSpace: 0.2 });
  texto(doc, "EXPERIENCIAS", 25, 43.5, { size: 8.5, font: ["helvetica", "bold"], color: [255, 255, 255], align: "center", charSpace: 0.2 });

  // Tagline
  texto(doc, "Empaques que", 56, 16, { size: 13, font: ["times", "italic"], color: [60, 60, 60] });
  texto(doc, "destacan.", 56, 24, { size: 13, font: ["times", "italic"], color: [60, 60, 60] });
  texto(doc, "Marcas que", 56, 33.5, { size: 13, font: ["times", "italic"], color: [60, 60, 60] });
  texto(doc, "inspiran.", 56, 41.5, { size: 13, font: ["times", "italic"], color: [60, 60, 60] });
  doc.setDrawColor(...DORADO);
  doc.setLineWidth(0.4);
  doc.line(56, 47, 80, 47);

  // Rejilla de procesos
  texto(doc, "TODOS LOS PROCESOS DENTRO DE NUESTRA PLANTA", 6, 152, {
    size: 6.8, font: ["helvetica", "bold"], color: TINTA, charSpace: 0.1,
  });

  const procesos: [string, Icono][][] = [
    [["DISEÑO", iconLapiz], ["IMPRESIÓN", iconImpresora], ["SUAJE", iconSuaje],
     ["PEGADO", iconGota], ["ENSAMBLE", iconEnsamble], ["ACABADOS\nESPECIALES", iconEstrella]],
    [["LAMINADO", iconRollo], ["HOT\nSTAMPING", iconHotStamping], ["ALTO\nRELIEVE", iconAltoRelieve],
     ["BARNIZ\nUV", iconBarnizUV], ["TEXTURIZADO", iconTexturizado]],
    [["LITOLAMINADO", iconLitolaminado], ["EXTRUSIÓN", iconExtrusion],
     ["INYECCION", iconInyeccion], ["FLEXO", iconFlexo]],
  ];
  const procX0 = 10;
  const procDX = 15.4;
  const procY0 = 160;
  const procDY = 17.5;
  procesos.forEach((fila, r) => {
    fila.forEach(([label, icono], k) => {
      const cx = procX0 + k * procDX;
      const cy = procY0 + r * procDY;
      icono(doc, cx, cy, 7.5, DORADO);
      texto(doc, label, cx, cy + 7, {
        size: 4.9, font: ["helvetica", "normal"], color: TINTA, align: "center", lineHeight: 1.25,
      });
    });
  });

  // ═══════════ ENCABEZADO DERECHO ═══════════
  texto(doc, "PROPUESTA", HEAD_X, 14, { size: 26, font: ["helvetica", "bold"], color: NEGRO });
  texto(doc, "PERSONALIZADA", HEAD_X, 25.5, { size: 26, font: ["helvetica", "bold"], color: DORADO });
  doc.setDrawColor(...DORADO);
  doc.setLineWidth(0.6);
  doc.line(HEAD_X, 29.5, HEAD_X + 12, 29.5);

  // FOLIO
  texto(doc, "FOLIO", DER - 31, 7.5, { size: 9.5, font: ["helvetica", "bold"], color: DORADO, charSpace: 0.3 });
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.4);
  doc.roundedRect(DER - 32, 9.5, 32, 12.5, 2.5, 2.5, "S");
  texto(doc, cotizacion.folio || "", DER - 16, 17.8, { size: 10.5, font: ["helvetica", "bold"], color: TINTA, align: "center" });

  // ── Cliente / Empresa / Fecha / Asesor ──
  const BENEF_X = 238.5;
  const datosX0 = 86;
  const datosW = (BENEF_X - 4 - datosX0) / 4;
  const datos: [string, string, Icono][] = [
    ["CLIENTE", cotizacion.cliente || "", iconPersona],
    ["EMPRESA", cotizacion.empresa || "", iconEdificio],
    ["FECHA", cotizacion.fecha
      ? new Date(cotizacion.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
      : "", iconCalendario],
    ["ASESOR", cotizacion.asesor || "", iconPersona],
  ];
  datos.forEach(([label, valor, icono], i) => {
    const cx = datosX0 + i * datosW + datosW / 2;
    icono(doc, cx, 35, 9.5, NEGRO);
    texto(doc, label, cx, 43.5, { size: 7.2, font: ["helvetica", "bold"], color: TINTA, align: "center", charSpace: 0.2 });
    texto(doc, valor, cx, 51.5, { size: 7.7, font: ["helvetica", "normal"], color: TINTA, align: "center", maxWidth: datosW - 4 });
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.3);
    doc.line(cx - datosW / 2 + 2, 53, cx + datosW / 2 - 2, 53);
    if (i < 3) {
      doc.setDrawColor(...GRIS_CLARO);
      doc.setLineWidth(0.25);
      doc.line(datosX0 + (i + 1) * datosW, 31, datosX0 + (i + 1) * datosW, 53);
    }
  });

  // ── Beneficios ──
  doc.setDrawColor(...GRIS_CLARO);
  doc.setLineWidth(0.25);
  doc.line(BENEF_X, 27, BENEF_X, 62);

  const beneficios: [string, string, Icono][] = [
    ["DESARROLLO", "DE RENDER", iconBolsa],
    ["FABRICACIÓN", "NACIONAL", iconCapas],
    ["CONTROL", "DE CALIDAD", iconEscudo],
    ["ENTREGA", "PROGRAMADA", iconCamion],
  ];
  beneficios.forEach(([l1, l2, icono], i) => {
    // Espaciado un poco más generoso (8.3 en vez de 8.0) para que se sientan
    // organizados y no apretados, y el bloque de texto (2 líneas) recentrado
    // respecto al ícono: antes (-0.5 / +3) dejaba el centro visual del texto
    // ~1.2 mm por debajo del centro del ícono; con (-1.0 / +2.5) quedan
    // alineados al mismo eje horizontal.
    const cy = 31.5 + i * 8.3;
    icono(doc, BENEF_X + 5.5, cy, 6.8, DORADO);
    texto(doc, l1, BENEF_X + 11, cy - 1.0, { size: 6.1, font: ["helvetica", "bold"], color: TINTA, charSpace: 0.1 });
    texto(doc, l2, BENEF_X + 11, cy + 2.5, { size: 6.1, font: ["helvetica", "bold"], color: TINTA, charSpace: 0.1 });
  });

  // ═══════════ TABLA DE COTIZACIÓN ═══════════
  texto(doc, "COTIZACIÓN", COL_X + 2, TABLA_Y - 3, { size: 11.5, font: ["helvetica", "bold"], color: TINTA });

  /** Cada una de las 3 escalas cantidad/precio, por separado (no apiladas). */
  const cantidadPrecioTexto = (it: ItemCotizacionLibrePdf, n: 1 | 2 | 3): string => {
    const cant = (it as any)[`cantidad_${n}`];
    const precio = (it as any)[`precio_${n}`];
    if (!cant) return "";
    const pz = `${Number(cant).toLocaleString("es-MX")} pz`;
    return precio ? `${pz}\n${formatMoney(Number(precio), moneda)}` : pz;
  };

  const filas = cotizacion.items.map((it) => {
    const tintasFrente = campo(it.tintas_frente_id, it.tintas_frente_texto);
    const tintasDentro = campo(it.tintas_dentro_id, it.tintas_dentro_texto);
    const caras = campo(it.caras_id, it.caras_texto);
    const material = [campo(it.material_id, it.material_texto), campo(it.calibre_id, it.calibre_texto)]
      .filter(Boolean).join("\n");

    return [
      campo(it.producto_id, it.producto_texto),
      it.medida_texto || "",
      material,
      it.tipo === "plastico"
        ? [tintasFrente, caras ? `${caras} cara(s)` : ""].filter(Boolean).join("\n")
        : [tintasFrente, tintasDentro].filter(Boolean).join(" / "),
      it.tipo === "plastico" ? "" : campo(it.laminado_id, it.laminado_texto),
      it.tipo === "plastico" ? "" : campo(it.hs_id, it.hs_texto),
      it.tipo === "plastico" ? "" : (it.alto_relieve_bool ? "Sí" : ""),
      it.tipo === "plastico" ? "" : campo(it.textura_id, it.textura_texto),
      it.tipo === "plastico" ? "" : (it.uv_bool ? "Sí" : ""),
      it.tipo === "plastico" ? campo(it.color_asa_id, it.color_asa_texto) : campo(it.asa_id, it.asa_texto),
      it.pigmentos_texto || "",
      cantidadPrecioTexto(it, 1),
      cantidadPrecioTexto(it, 2),
      cantidadPrecioTexto(it, 3),
    ];
  });

  // La hoja impresa tiene 5 renglones: se completan en blanco.
  const FILAS_MIN = 5;
  while (filas.length < FILAS_MIN) filas.push(new Array(14).fill(""));

  autoTable(doc, {
    startY: TABLA_Y,
    margin: { left: COL_X, right: PW - COL_X - TABLE_W },
    tableWidth: TABLE_W,
    head: [
      [
        { content: "Producto", rowSpan: 2 },
        { content: "Medida", rowSpan: 2 },
        { content: "Material\nCalibre", rowSpan: 2 },
        { content: "Tintas\nF/V", rowSpan: 2 },
        { content: "Acabados", colSpan: 7 },
        { content: "Cantidad /\nPrecio 1", rowSpan: 2 },
        { content: "Cantidad /\nPrecio 2", rowSpan: 2 },
        { content: "Cantidad /\nPrecio 3", rowSpan: 2 },
      ] as any,
      ["Laminación", "HS", "AR", "Textura", "UV", "Asa", "Otro /\nPigmento"],
    ],
    body: filas,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: { top: 1.3, bottom: 1.3, left: 1, right: 1 },
      textColor: TINTA,
      lineColor: NEGRO,
      lineWidth: 0.2,
      valign: "middle",
      halign: "center",
      minCellHeight: 8.05, // 7.0 × 1.15 — tabla 15% más alta (empuja lo de abajo, que ya está anclado a finTabla)
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: NEGRO,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 6.2,
      lineColor: [255, 255, 255],
      lineWidth: 0.2,
      minCellHeight: 6.9, // 6.0 × 1.15 — mismo +15% en el encabezado
    },
    bodyStyles: { fillColor: [255, 255, 255] },
    // Anchos de columna × 0.95 (mismo 5% que se le quitó a TABLE_W), para
    // que la tabla completa (no solo su ancho total) se reduzca de forma
    // pareja en vez de que autoTable reparta la diferencia como quiera.
    columnStyles: {
      0:  { cellWidth: 29.45 },
      1:  { cellWidth: 17.86 },
      2:  { cellWidth: 16.15 },
      3:  { cellWidth: 11.88, fontSize: 6.2 },
      4:  { cellWidth: 15.2, fontSize: 6.4 },
      5:  { cellWidth: 6.84, fontSize: 6.2 },
      6:  { cellWidth: 7.13, fontSize: 6.4 },
      7:  { cellWidth: 12.35, fontSize: 6.4 },
      8:  { cellWidth: 6.46, fontSize: 6.4 },
      9:  { cellWidth: 11.88, fontSize: 6.4 },
      10: { cellWidth: 14.25, fontSize: 6 },
      11: { cellWidth: 17.1, fontSize: 6.8 },
      12: { cellWidth: 17.1, fontSize: 6.8 },
      13: { cellWidth: 17.1, fontSize: 6.8 },
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.row.index === 1) data.cell.styles.fontSize = 5.4;
    },
  });

  const finTabla = (doc as any).lastAutoTable.finalY as number;

  // ── Comentarios ──
  // Arranca justo debajo del final real de la tabla (que varía según el
  // número de renglones y si el contenido de alguna celda hizo wrap a 2
  // líneas). Su alto se limita para siempre dejar sitio a la fila de
  // +35 años/QR/Planta que va después, sin salirse del filete dorado inferior.
  const comentX = COL_X;
  // Se reduce lo mismo que creció COL_X (DELTA_COL_X) para que el borde
  // derecho del cuadro se quede fijo donde estaba (no se meta en el
  // separador/recuadro de Condiciones de venta).
  const comentW = 158 - DELTA_COL_X;
  const comentY = finTabla + GAP_TABLA_COMENT;
  // Se reserva el alto mínimo que necesita el contenido de la fila
  // +35 años/QR/Planta (MIN_BLOQUE_INF_H) para que Comentarios nunca se la
  // coma — pero esa fila luego se estira con lo que sobre hasta el filete
  // dorado (ver "aniosH" más abajo), en vez de quedarse fija en ese mínimo.
  const MIN_BLOQUE_INF_H = 46;
  const espacioDisponibleComent =
    LIMITE_INFERIOR - MIN_BLOQUE_INF_H - GAP_COMENT_BLOQUE - comentY;
  const comentH = Math.max(10, Math.min(COMENT_H_MAX, espacioDisponibleComent));
  if (comentH >= 9) {
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.35);
    doc.roundedRect(comentX, comentY, comentW, comentH, 2.5, 2.5, "S");
    texto(doc, "Comentarios:", comentX + 4, comentY + 5.2, {
      size: 8.2, font: ["helvetica", "bold"], color: TINTA
    });
    if (cotizacion.comentarios) {
      texto(doc, cotizacion.comentarios, comentX + 29, comentY + 5.2, {
        size: 7.7, font: ["helvetica", "normal"], color: [45, 45, 45], maxWidth: comentW - 33
      });
    }

    const notas = cotizacion.items
      .filter((it) => it.notas && it.notas.trim())
      .map((it) => `• ${campo(it.producto_id, it.producto_texto)}: ${it.notas}`);

    if (notas.length && comentH >= 14) {
      texto(doc, notas.join("   "), comentX + 4, comentY + 11.5, {
        size: 6.3, font: ["helvetica", "normal"], color: [70, 70, 70], maxWidth: comentW - 8
      });
    }
  }

  // ═══════════ BLOQUE INFERIOR ═══════════
  // La referencia coloca estos módulos por encima del filete inferior,
  // dejando el bloque de condiciones a la derecha del todo.
  // "bloqueY" (antes fijo en 135) ahora arranca justo debajo del cuadro de
  // Comentarios ya calculado, así nunca se encima con él aunque la tabla
  // tenga más renglones de lo habitual.
  const bloqueY = comentY + comentH + GAP_COMENT_BLOQUE;

  // +35 AÑOS
  const aniosX = COL_X - 1;
  const aniosW = 25;
  const aniosY = bloqueY;
  // Antes fijo en 41 mm (dejaba un hueco en blanco grande antes del filete
  // dorado). Ahora se estira hasta el límite inferior real, igual que en
  // la maqueta de referencia, donde la caja negra llega casi hasta la banda.
  const aniosH = Math.max(MIN_BLOQUE_INF_H, LIMITE_INFERIOR - aniosY);
  poligono(doc, [
    [aniosX, aniosY],
    [aniosX + aniosW - 6, aniosY],
    [aniosX + aniosW, aniosY + 6],
    [aniosX + aniosW, aniosY + aniosH],
    [aniosX, aniosY + aniosH],
    [aniosX, aniosY],
  ], NEGRO);
  texto(doc, "+35", aniosX + aniosW / 2, aniosY + 19, {
    size: 28, font: ["helvetica", "bold"], color: DORADO_35, align: "center"
  });
  texto(doc, "AÑOS", aniosX + aniosW / 2, aniosY + 25.5, {
    size: 7.6, font: ["helvetica", "bold"], color: DORADO_35, align: "center", charSpace: 0.5
  });
  texto(doc, "CREANDO EMPAQUES", aniosX + aniosW / 2, aniosY + 34, {
    size: 5.4, font: ["helvetica", "bold"], color: DORADO_35, align: "center"
  });
  texto(doc, "QUE DESTACAN", aniosX + aniosW / 2, aniosY + 38.5, {
    size: 5.4, font: ["helvetica", "bold"], color: DORADO_35, align: "center"
  });

  // QRs
  // NOTA: antes el separador y el ícono de "Planta y Oficinas" caían
  // literalmente ENCIMA del QR de WhatsApp (qr2 llegaba hasta x=169.5,
  // pero pinX arrancaba en 166) — de ahí el círculo negro que tapaba
  // la esquina del segundo QR. Se recalculan los anchos dejando un
  // respiro (gap) real de al menos 4 mm entre cada bloque.
  const QR_W = 22;
  const GAP = 6;
  const qr1X = aniosX + aniosW + GAP + 4;      // 113.5
  const qr1CX = qr1X + QR_W / 2;
  const sep1X = qr1X + QR_W + GAP / 2;         // separador tras QR1
  const qr2X = sep1X + GAP / 2 + 2;            // 143.5
  const qr2CX = qr2X + QR_W / 2;
  const sep2X = qr2X + QR_W + GAP / 2;         // separador tras QR2 (~174.5)

  // Los QR y el bloque de "Planta y Oficinas" bajan un poco más que el
  // texto "+35 AÑOS" (que se queda donde estaba) — de ahí este desfase
  // aparte, sumado solo a este grupo de elementos.
  const QR_PLANTA_OFFSET = 4;

  texto(doc, "PAGINA WEB", qr1CX, aniosY + QR_PLANTA_OFFSET + 8, {
    size: 6.9, font: ["helvetica", "bold"], color: TINTA, align: "center", charSpace: 0.1
  });
  imagenOEspacio(doc, qrWebBase64, qr1X, aniosY + QR_PLANTA_OFFSET + 12, QR_W, QR_W);

  texto(doc, "CONTÁCTANOS", qr2CX, aniosY + QR_PLANTA_OFFSET + 4, {
    size: 6.9, font: ["helvetica", "bold"], color: TINTA, align: "center", charSpace: 0.1
  });
  texto(doc, "POR WHATSAPP", qr2CX, aniosY + QR_PLANTA_OFFSET + 8, {
    size: 6.9, font: ["helvetica", "bold"], color: TINTA, align: "center", charSpace: 0.1
  });
  imagenOEspacio(doc, qrWaBase64, qr2X, aniosY + QR_PLANTA_OFFSET + 12, QR_W, QR_W);
  texto(doc, "grupoeb.com.mx", qr1CX, aniosY + QR_PLANTA_OFFSET + 38, {
    size: 6.2, font: ["helvetica", "bold"], color: TINTA, align: "center"
  });
  texto(doc, "33 3954-0924", qr2CX, aniosY + QR_PLANTA_OFFSET + 38, {
    size: 6.2, font: ["helvetica", "bold"], color: TINTA, align: "center"
  });

  // Separadores del bloque inferior
  doc.setDrawColor(...GRIS_CLARO);
  doc.setLineWidth(0.25);
  doc.line(sep1X, aniosY + QR_PLANTA_OFFSET + 4, sep1X, aniosY + QR_PLANTA_OFFSET + 39);
  doc.line(sep2X, aniosY + QR_PLANTA_OFFSET + 4, sep2X, aniosY + QR_PLANTA_OFFSET + 39);
  // El separador vertical (239, …) que cierra el bloque de Planta/Condiciones
  // se dibuja más abajo, una vez calculados infoY/infoH.

  // Planta y oficinas — arranca DESPUÉS del segundo separador para no
  // volver a pisar el QR de WhatsApp.
  const plantaX = sep2X + GAP / 2;   // ~177.5
  const pinX = plantaX + 5;          // ~182.5
  const plantaTextX = pinX + 8;      // ~190.5
  texto(doc, "Planta y Oficinas", plantaTextX, aniosY + QR_PLANTA_OFFSET + 8, {
    size: 7.5, font: ["helvetica", "bold"], color: TINTA
  });

  // Ícono de ubicación (pin relleno, no el "globo" hueco de antes)
  iconPinRelleno(doc, pinX, aniosY + QR_PLANTA_OFFSET + 15.5, 9, NEGRO);
  texto(doc, "Rogelio Ledesma #102", plantaTextX, aniosY + QR_PLANTA_OFFSET + 13.5, { size: 6.5, color: TINTA });
  texto(doc, "Col. Cruz Vieja", plantaTextX, aniosY + QR_PLANTA_OFFSET + 18, { size: 6.5, color: TINTA });
  texto(doc, "Tlajomulco de Zúñiga, Jalisco", plantaTextX, aniosY + QR_PLANTA_OFFSET + 22.5, { size: 6.5, color: TINTA });
  texto(doc, "C.P. 45644", plantaTextX, aniosY + QR_PLANTA_OFFSET + 27, { size: 6.5, color: TINTA });

  // Ícono de teléfono (auricular real, antes era un círculo negro sin dibujo
  // porque el glifo "⌕" no se ve en Helvetica)
  iconTelefonoRelleno(doc, pinX, aniosY + QR_PLANTA_OFFSET + 34, 9, NEGRO);
  texto(doc, "33 3125-9595", plantaTextX, aniosY + QR_PLANTA_OFFSET + 33, { size: 6.5, font: ["helvetica", "bold"], color: TINTA });
  texto(doc, "33 3180-1460", plantaTextX, aniosY + QR_PLANTA_OFFSET + 37, { size: 6.5, font: ["helvetica", "bold"], color: TINTA });
  texto(doc, "33 3180-3373", plantaTextX + 29, aniosY + QR_PLANTA_OFFSET + 37, { size: 6.5, font: ["helvetica", "bold"], color: TINTA });

  // Condiciones de venta — caja independiente como en la referencia.
  // Antes la nota en cursiva (agregada en el ajuste anterior) quedaba
  // pegada/encimada con el círculo "50%" de la fila siguiente porque las
  // filas usaban un salto fijo de ~9-10 mm sin contar el espacio extra que
  // ocupa esa nota de 2 líneas. Ahora cada fila tiene una posición Y fija,
  // calculada para dejar aire real entre el contenido de una fila y el
  // círculo/ícono de la siguiente.
  const infoX = 242.5;
  const infoW = 47;
  // El marco de Condiciones arranca a la misma altura que el cuadro de
  // Comentarios (igual que en la referencia) y se estira hasta el límite
  // inferior real — en la maqueta original este marco llega prácticamente
  // hasta el filete dorado, no se queda corto a la mitad de la hoja.
  const infoY = comentY;
  const infoH = LIMITE_INFERIOR - infoY;

  doc.setDrawColor(...GRIS_CLARO);
  doc.setLineWidth(0.25);
  doc.line(239, infoY, 239, infoY + infoH);

  doc.setDrawColor(...DORADO);
  doc.setLineWidth(0.7);
  doc.roundedRect(infoX, infoY, infoW, infoH, 4, 4, "S");

  texto(doc, "CONDICIONES DE VENTA", infoX + infoW / 2, infoY + 5.2, {
    size: 6.8, font: ["helvetica", "bold"], color: TINTA, align: "center"
  });
  doc.setDrawColor(...DORADO);
  doc.setLineWidth(0.4);
  doc.line(infoX + 5, infoY + 7.8, infoX + infoW - 5, infoY + 7.8);

  // Antes cada círculo mostraba un glifo unicode (▣, ⌂, ◷) que Helvetica no
  // sabe dibujar y se veía como basura ("%£", "#", "%+"). Ahora, cuando el
  // "icon" es una función Icono, se dibuja un ícono vectorial real dentro
  // del círculo; "50%" y "$" siguen siendo texto porque esos sí se ven bien.
  const condRow = (y: number, icon: string | Icono, lines: string[], nota?: string) => {
    doc.setDrawColor(...DORADO);
    doc.setLineWidth(0.45);
    doc.circle(infoX + 5.3, y, 3.0, "S");
    if (typeof icon === "string") {
      texto(doc, icon, infoX + 5.3, y + 1.2, {
        size: 4.8, font: ["helvetica", "bold"], color: DORADO, align: "center"
      });
    } else {
      icon(doc, infoX + 5.3, y, 3.6, DORADO);
    }
    lines.forEach((line, idx) => texto(doc, line, infoX + 11, y - 1.4 + idx * 2.8, {
      size: 5.4, font: ["helvetica", idx === 0 ? "bold" : "normal"], color: TINTA
    }));
    // Nota aclaratoria en cursiva dorada, con su propio espacio reservado
    // (ya no se calcula pegada al final de "lines", así deja de encimarse
    // con la fila de abajo).
    if (nota) {
      texto(doc, nota, infoX + 11, y - 1.4 + lines.length * 2.8 + 2.2, {
        size: 4.6, font: ["helvetica", "italic"], color: DORADO, maxWidth: infoW - 15, lineHeight: 1.2
      });
    }
  };

  // Posiciones proporcionales al alto real de la caja (infoH) — antes eran
  // offsets fijos pensados para una caja de 70 mm; si la caja ahora es más
  // alta (porque hay más espacio libre), las 5 filas se reparten en todo el
  // alto disponible en vez de quedar apelmazadas arriba con un hueco vacío
  // debajo (igual que se reparten en la maqueta de referencia).
  const condRowY = (frac: number) => infoY + frac * infoH;
  condRow(
    condRowY(0.1714), iconCalendario,
    ["Tiempo de fabricación: 25 días", "hábiles a partir de la recepción del", "anticipo y la aprobación final del arte."],
    "*La fabricación puede variar ± 20% en la cantidad final fabricada"
  );
  condRow(condRowY(0.5), "50%", ["50% de anticipo y", "50% antes del envío."]);
  condRow(condRowY(0.6429), "$", ["Precios más IVA."]);
  condRow(condRowY(0.7571), iconPinLinea, ["LAB Guadalajara"]);
  condRow(condRowY(0.8714), iconRelojLinea, ["Vigencia de la cotización:", "15 días naturales"]);


  // Filete dorado inferior con transición tonal para aproximar la banda de la referencia.
  const segmentos = 40;
  const yBanda = PH - 6.5;
  const hBanda = 6.5;
  for (let i = 0; i < segmentos; i++) {
    const t = i / (segmentos - 1);
    const wave = Math.abs(t - 0.5) * 2;
    const r = Math.round(218 - 45 * wave);
    const g = Math.round(164 - 48 * wave);
    const b = Math.round(61 - 22 * wave);
    doc.setFillColor(r, g, b);
    doc.rect((PW / segmentos) * i, yBanda, PW / segmentos + 0.2, hBanda, "F");
  }

  const nombre = `PropuestaLibre_${cotizacion.folio}.pdf`;
  const blob = doc.output("blob");
  if (descargar) entregarPdf(blob, nombre);
  if (guardarEnS3) {
    await subirPdfA3(blob, nombre, "pdfs", "cotizaciones");
  }
  return blob;
}