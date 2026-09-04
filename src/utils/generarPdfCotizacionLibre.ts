// src/utils/generarPdfCotizacionLibre.ts
//
// PDF "Propuesta Personalizada" para Cotización Libre.
// Maqueta calcada de la hoja impresa — A4 horizontal (297 × 210 mm):
//
//   ┌──────────────┬──────────────────────────────────────────────┐
//   │ bloque negro │ PROPUESTA / PERSONALIZADA        [ FOLIO ]   │
//   │ + tagline    │ CLIENTE EMPRESA FECHA ASESOR │ 4 beneficios  │
//   │ foto product.│ COTIZACIÓN + tabla                           │
//   │ procesos     │ Comentarios                                  │
//   ├──────────────┴──────────────────────────────────────────────┤
//   │ procesos (izq) │ +35 AÑOS │ QR web │ QR wa │ GRUPO EB │ redes│
//   └─────────────────────────────────────────────────────────────┘
//
// ASSETS: foto del panel izquierdo → src/assets/cotlibre.png
//         QR de página web       → src/assets/qrweb.png
//         QR de WhatsApp         → src/assets/qrwhatsapp.png
// Basta con colocar esos archivos en src/assets/. Si alguno falta, queda el
// espacio en blanco reservado (mismas medidas) y el resto no se mueve.
// El 4º parámetro (`assets`) permite sobrescribirlos en runtime.

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

const COL_X = 91;                  // borde donde arranca la columna derecha / la tabla
const TABLE_W = 194.5;             // hasta 285.5 → margen derecho de 11.5
const HEAD_X = 109;                // sangría del título PROPUESTA
const DER = PW - 11.5;             // borde derecho útil
const TABLA_Y = 84;
const COMENT_H_MAX = 18;
const BANDA_Y = 157;               // inicio de la banda inferior
const FOTO = { x: 0, y: 66, w: 88, h: 80 };

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
  [-0.2, 0.05, 0.3].forEach((off) => {
    doc.lines(
      [[s * 0.34, s * 0.16], [-s * 0.34, s * 0.16], [-s * 0.34, -s * 0.16]] as any,
      cx - s * 0.34, cy + off * s, [1, 1], "S", true
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

  // Foto de producto (src/assets/cotlibre.png)
  imagenOEspacio(doc, fotoBase64, FOTO.x, FOTO.y, FOTO.w, FOTO.h);

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
  texto(doc, "PROPUESTA", HEAD_X, 20, { size: 27, font: ["helvetica", "bold"], color: NEGRO });
  texto(doc, "PERSONALIZADA", HEAD_X, 33.5, { size: 27, font: ["helvetica", "bold"], color: DORADO });
  doc.setDrawColor(...DORADO);
  doc.setLineWidth(0.6);
  doc.line(HEAD_X, 39, HEAD_X + 17, 39);

  // FOLIO
  texto(doc, "FOLIO", DER - 31, 10, { size: 9.5, font: ["helvetica", "bold"], color: NEGRO, charSpace: 0.3 });
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.4);
  doc.roundedRect(DER - 32, 12.5, 32, 12, 2, 2, "S");
  texto(doc, cotizacion.folio || "", DER - 16, 20.5, { size: 11, font: ["helvetica", "bold"], color: TINTA, align: "center" });

  // ── Cliente / Empresa / Fecha / Asesor ──
  const BENEF_X = 248;                    // divisor vertical de la columna de beneficios
  const datosX0 = 100;
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
    icono(doc, cx, 49, 11, NEGRO);
    texto(doc, label, cx, 59, { size: 7.8, font: ["helvetica", "bold"], color: TINTA, align: "center", charSpace: 0.2 });
    texto(doc, valor, cx, 67.5, { size: 8.5, font: ["helvetica", "normal"], color: TINTA, align: "center", maxWidth: datosW - 5 });
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.3);
    doc.line(cx - datosW / 2 + 3, 70, cx + datosW / 2 - 3, 70);
    if (i < 3) {
      doc.setDrawColor(...GRIS_CLARO);
      doc.setLineWidth(0.25);
      doc.line(datosX0 + (i + 1) * datosW, 44, datosX0 + (i + 1) * datosW, 70);
    }
  });

  // ── Beneficios ──
  doc.setDrawColor(...GRIS_CLARO);
  doc.setLineWidth(0.25);
  doc.line(BENEF_X, 32, BENEF_X, 80);

  const beneficios: [string, string, Icono][] = [
    ["DESARROLLO", "DE RENDER", iconBolsa],
    ["FABRICACIÓN", "NACIONAL", iconCapas],
    ["CONTROL", "DE CALIDAD", iconEscudo],
    ["ENTREGA", "PROGRAMADA", iconCamion],
  ];
  beneficios.forEach(([l1, l2, icono], i) => {
    const cy = 38 + i * 13.2;
    icono(doc, BENEF_X + 6, cy, 8, DORADO);
    texto(doc, l1, BENEF_X + 12, cy - 0.6, { size: 7, font: ["helvetica", "bold"], color: TINTA, charSpace: 0.15 });
    texto(doc, l2, BENEF_X + 12, cy + 3.4, { size: 7, font: ["helvetica", "bold"], color: TINTA, charSpace: 0.15 });
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
        { content: "Cantidad 1", rowSpan: 2 },
        { content: "Cantidad 2", rowSpan: 2 },
        { content: "Cantidad 3", rowSpan: 2 },
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
      minCellHeight: 7.4,
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
      minCellHeight: 6.4,
    },
    bodyStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0:  { cellWidth: 31 },
      1:  { cellWidth: 18.8 },
      2:  { cellWidth: 17 },
      3:  { cellWidth: 12.5, fontSize: 6.2 },
      4:  { cellWidth: 16, fontSize: 6.4 },
      5:  { cellWidth: 7.2, fontSize: 6.2 },
      6:  { cellWidth: 7.5, fontSize: 6.4 },
      7:  { cellWidth: 13, fontSize: 6.4 },
      8:  { cellWidth: 6.8, fontSize: 6.4 },
      9:  { cellWidth: 12.5, fontSize: 6.4 },
      10: { cellWidth: 15, fontSize: 6 },
      11: { cellWidth: 12.6, fontSize: 7 },
      12: { cellWidth: 12.6, fontSize: 7 },
      13: { cellWidth: 12, fontSize: 7 },
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.row.index === 1) data.cell.styles.fontSize = 5.4;
    },
  });

  const finTabla = (doc as any).lastAutoTable.finalY as number;

  // ── Comentarios (se adapta al espacio que dejó la tabla) ──
  const comentY = Math.max(138, finTabla + 3);
  const comentH = Math.min(COMENT_H_MAX, BANDA_Y - 3 - comentY);
  if (comentH >= 9) {
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.35);
    doc.roundedRect(COL_X, comentY, TABLE_W, comentH, 2.5, 2.5, "S");
    texto(doc, "Comentarios:", COL_X + 4, comentY + 5.5, { size: 8.5, font: ["helvetica", "bold"], color: TINTA });
    if (cotizacion.comentarios) {
      texto(doc, cotizacion.comentarios, COL_X + 27, comentY + 5.5, {
        size: 8, font: ["helvetica", "normal"], color: [45, 45, 45], maxWidth: TABLE_W - 31,
      });
    }
    const notas = cotizacion.items
      .filter((it) => it.notas && it.notas.trim())
      .map((it) => `• ${campo(it.producto_id, it.producto_texto)}: ${it.notas}`);
    if (notas.length && comentH >= 14) {
      texto(doc, notas.join("   "), COL_X + 4, comentY + 12, {
        size: 6.6, font: ["helvetica", "normal"], color: [70, 70, 70], maxWidth: TABLE_W - 8,
      });
    }
  }

  // ═══════════ BANDA INFERIOR (derecha) ═══════════
  const aniosX = COL_X + 3;
  const aniosW = 28;
  const aniosH = 48;
  poligono(doc, [
    [aniosX, BANDA_Y],
    [aniosX + aniosW - 6, BANDA_Y],
    [aniosX + aniosW, BANDA_Y + 6],
    [aniosX + aniosW, BANDA_Y + aniosH],
    [aniosX, BANDA_Y + aniosH],
    [aniosX, BANDA_Y],
  ], NEGRO);
  texto(doc, "+35", aniosX + aniosW / 2, BANDA_Y + 22, { size: 30, font: ["helvetica", "bold"], color: DORADO_35, align: "center" });
  texto(doc, "AÑOS", aniosX + aniosW / 2, BANDA_Y + 28.5, { size: 8, font: ["helvetica", "bold"], color: DORADO_35, align: "center", charSpace: 0.6 });
  texto(doc, "CREANDO EMPAQUES", aniosX + aniosW / 2, BANDA_Y + 37, { size: 5.8, font: ["helvetica", "bold"], color: DORADO_35, align: "center" });
  texto(doc, "QUE DESTACAN", aniosX + aniosW / 2, BANDA_Y + 42, { size: 5.8, font: ["helvetica", "bold"], color: DORADO_35, align: "center" });

  // QRs
  const qr1X = aniosX + aniosW + 10;
  const qr2X = qr1X + 36;
  texto(doc, "PAGINA WEB", qr1X + 11, BANDA_Y + 11, { size: 7.2, font: ["helvetica", "bold"], color: TINTA, align: "center", charSpace: 0.15 });
  imagenOEspacio(doc, qrWebBase64, qr1X, BANDA_Y + 15, 22, 22);

  texto(doc, "CONTÁCTANOS", qr2X + 11, BANDA_Y + 7, { size: 7.2, font: ["helvetica", "bold"], color: TINTA, align: "center", charSpace: 0.15 });
  texto(doc, "POR WHATSAPP", qr2X + 11, BANDA_Y + 11, { size: 7.2, font: ["helvetica", "bold"], color: TINTA, align: "center", charSpace: 0.15 });
  imagenOEspacio(doc, qrWaBase64, qr2X, BANDA_Y + 15, 22, 22);

  // Divisores verticales de la banda — el bloque de "Condiciones de venta"
  // se ensanchó 20% (42.5mm → 51mm) recortando ese tanto del bloque de redes.
  const infoX = qr2X + 33;
  const infoW = 51;
  const infoRightX = infoX + infoW;
  doc.setDrawColor(...GRIS_CLARO);
  doc.setLineWidth(0.25);
  doc.line(qr2X - 6, BANDA_Y + 4, qr2X - 6, BANDA_Y + 40);
  doc.line(infoX - 4, BANDA_Y + 4, infoX - 4, BANDA_Y + 40);
  doc.line(infoRightX, BANDA_Y + 4, infoRightX, BANDA_Y + 40);

  // Condiciones de venta (antes iba aquí el texto genérico de "GRUPO EB")
  texto(doc, "CONDICIONES DE VENTA", infoX, BANDA_Y + 8, { size: 8.2, font: ["helvetica", "bold"], color: NEGRO });
  doc.setDrawColor(...DORADO);
  doc.setLineWidth(0.3);
  doc.line(infoX, BANDA_Y + 10, infoX + infoW - 5, BANDA_Y + 10);

  const condiciones: string[] = [
    "Fabricación: 25 días hábiles desde anticipo y arte aprobado (±20% en cantidad final).",
    "50% de anticipo y 50% antes del envío.",
    "Precios más IVA.",
    "LAB Guadalajara.",
    "Vigencia de la cotización: 15 días naturales.",
  ];
  let condY = BANDA_Y + 15;
  condiciones.forEach((c) => {
    const lineas = doc.splitTextToSize(`•  ${c}`, infoW - 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...TINTA);
    doc.text(lineas, infoX, condY);
    condY += lineas.length * 3.1 + 1.4;
  });

  // Redes sociales
  const redesX = infoRightX + 6;
  const redes: [string, string][] = [
    ["W", "grupoeb.com.mx"],
    ["IG", "eurobolsa.mx"],
    ["f", "Grupo EB"],
    ["in", "grupo eb europack"],
  ];
  redes.forEach(([glifo, handle], i) => {
    const cy = BANDA_Y + 8 + i * 10.3;
    circuloRed(doc, redesX, cy, 3.2, glifo);
    texto(doc, handle, redesX + 6, cy + 1.1, { size: 7, font: ["helvetica", "normal"], color: TINTA });
  });

  // Filete dorado inferior
  doc.setFillColor(...DORADO);
  doc.rect(0, PH - 2.2, PW, 2.2, "F");

  const nombre = `PropuestaLibre_${cotizacion.folio}.pdf`;
  const blob = doc.output("blob");
  if (descargar) entregarPdf(blob, nombre);
  if (guardarEnS3) {
    await subirPdfA3(blob, nombre, "pdfs", "cotizaciones");
  }
  return blob;
}