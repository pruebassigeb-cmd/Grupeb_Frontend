import jsPDF from "jspdf";
import { cargarLogoBase64 } from "./Pdfutils";
import logoUrl from "../assets/logogrupeb.png";
import { subirPdfA3 } from "./pdfS3.service";
import type {
  NombreProcesoOrdenPapel,
  OrdenProduccionPapelData,
  ProcesoOrdenPapelPdf,
  ProcesoPapelRuntime,
} from "../types/papel/ordenProduccionPapel.types";
import {
  construirProcesosOrdenPapelPdf,
  f,
  fmtFecha,
  fmtNum,
  n,
  normalizarOrdenProduccionPapelData,
  obtenerRegistroProcesoPapel,
  primeraLinea,
  validarProductoPapelParaPdf,
} from "./papel/ordenProduccionPapelPdf.helpers";

const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY_DARK: [number, number, number] = [60, 60, 60];
const GRAY_LIGHT: [number, number, number] = [245, 245, 245];

const LABEL = 6;
const TEXT = 8;

type Align = "left" | "center" | "right";

// Orden visual fijo que sigue el PDF de referencia. construirProcesosOrdenPapelPdf
// regresa los procesos en el orden del catálogo PROCESOS_ORDEN_PAPEL; aquí solo
// reordenamos el resultado ya filtrado, sin tocar la lógica de negocio.
const ORDEN_VISUAL_PROCESOS: NombreProcesoOrdenPapel[] = [
  "hojeado_papel",
  "guillotina_papel",
  "impresion_papel",
  "laminacion_papel",
  "barniz_uv_papel",
  "hot_stamping_papel",
  "texturizado_papel",
  "alto_relieve_papel",
  "suaje_produccion_papel",
  "armado_papel",
  "empaque_papel",
];

function ordenarProcesosParaVisual(procesos: ProcesoOrdenPapelPdf[]): ProcesoOrdenPapelPdf[] {
  const indice = new Map(ORDEN_VISUAL_PROCESOS.map((key, i) => [key, i]));
  return [...procesos].sort((a, b) => (indice.get(a.key) ?? 99) - (indice.get(b.key) ?? 99));
}

function setBlack(doc: jsPDF) {
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

function lineText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  fontSize = TEXT,
  bold = false,
  align: Align = "left",
  maxLines = 3
) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(f(text), maxW) as string[];
  doc.text(lines.slice(0, maxLines), x, y, { align });
  return lines.slice(0, maxLines).length;
}

function rect(doc: jsPDF, x: number, y: number, w: number, h: number, fill = false) {
  setBlack(doc);
  doc.setLineWidth(0.22);
  if (fill) {
    doc.setFillColor(GRAY_LIGHT[0], GRAY_LIGHT[1], GRAY_LIGHT[2]);
    doc.rect(x, y, w, h, "FD");
  } else {
    doc.rect(x, y, w, h);
  }
}

function headerCell(doc: jsPDF, label: string, x: number, y: number, w: number, h: number, fontSize = 8) {
  doc.setFillColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.22);
  doc.rect(x, y, w, h, "FD");
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.text(label, x + w / 2, y + h / 2 + fontSize / 3, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

// Variante vertical de la celda de cabecera, usada en la columna izquierda de
// cada bloque de proceso (ej. "Hojeado", "Impresión") tal como en el PDF de
// referencia, donde la etiqueta corre de abajo hacia arriba a un costado.
// El tamaño de fuente se reduce dinámicamente si la etiqueta no cabe en la
// altura disponible, y el anclaje se calcula manualmente porque jsPDF puede
// desplazar el texto rotado fuera del rect si se usa align "center" con y
// centrado, invadiendo visualmente el bloque contiguo.
function headerCellVertical(doc: jsPDF, label: string, x: number, y: number, w: number, h: number, fontSize = 6) {
  doc.setFillColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.22);
  doc.rect(x, y, w, h, "FD");
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFont("helvetica", "bold");
  const disponible = h - 2.4;
  let size = fontSize;
  while (size > 3.4 && doc.getStringUnitWidth(label) * size * 0.352778 > disponible) {
    size -= 0.3;
  }
  doc.setFontSize(size);
  doc.text(label, x + w / 2 + size * 0.32, y + h - (h - disponible) / 2, {
    align: "left",
    angle: 90,
  });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

function labelCell(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  valueSize = 10,
  bold = true,
  align: Align = "center"
) {
  rect(doc, x, y, w, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text(label, x + 1.2, y + 3.4);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(valueSize);
  const lines = doc.splitTextToSize(f(value), w - 3) as string[];
  const baseY = y + h - Math.max(2.2, (lines.length - 1) * valueSize * 0.35 + 2.2);
  doc.text(lines.slice(0, 2), align === "left" ? x + 1.5 : x + w / 2, baseY, { align });
}

function simpleField(doc: jsPDF, label: string, value: string, x: number, y: number, w: number, h: number) {
  rect(doc, x, y, w, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text(label, x + 1.2, y + 3.2);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  lineText(doc, value, x + 1.4, y + 7.2, w - 2.8, TEXT, true);
}


function processTagRow(
  doc: jsPDF,
  procesos: ProcesoOrdenPapelPdf[],
  x: number,
  y: number,
  w: number,
  h: number
) {
  // La lista ya viene filtrada desde construirProcesosOrdenPapelPdf(data):
  // aquí NO se dibujan procesos que no aplican. Solo compactamos el visual.
  rect(doc, x, y, w, h);
  if (procesos.length === 0) return;

  const etiquetaCorta = (p: ProcesoOrdenPapelPdf): string => {
    const mapa: Partial<Record<NombreProcesoOrdenPapel, string>> = {
      hojeado_papel: "Hoj",
      guillotina_papel: "Gui",
      impresion_papel: "Imp",
      laminacion_papel: "Lam",
      barniz_uv_papel: "UV",
      hot_stamping_papel: "HS",
      texturizado_papel: "Tex",
      alto_relieve_papel: "AR",
      suaje_produccion_papel: "Suaje",
      armado_papel: "Arm",
      empaque_papel: "Emp",
    };
    return mapa[p.key as NombreProcesoOrdenPapel] ?? p.etiqueta;
  };

  const cellW = w / procesos.length;
  let labelSize = 4.4;
  doc.setFont("helvetica", "bold");
  procesos.forEach((p) => {
    const etiqueta = etiquetaCorta(p);
    while (labelSize > 3.0 && doc.getStringUnitWidth(etiqueta) * labelSize * 0.352778 > cellW - 0.8) {
      labelSize -= 0.2;
    }
  });

  procesos.forEach((p, i) => {
    const cx = x + cellW * i;
    if (i > 0) doc.line(cx, y, cx, y + h);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    doc.text(etiquetaCorta(p), cx + cellW / 2, y + h * 0.42, { align: "center" });

    doc.setFontSize(Math.min(5.4, h - 2.4));
    doc.text("X", cx + cellW / 2, y + h - 1, { align: "center" });
  });
}

function fmtCantidad(data: OrdenProduccionPapelData): string {
  const kg = n(data.kilogramos);
  const cant = n(data.cantidad);
  if (String(data.modo_cantidad ?? "").toLowerCase() === "kilo" && kg !== null) {
    return `${fmtNum(kg, 2)} kg`;
  }
  return cant !== null ? fmtNum(cant) : "";
}

function valorMaquina(proceso: ProcesoOrdenPapelPdf, registro: ProcesoPapelRuntime | null): string {
  return primeraLinea(registro?.maquina, proceso.maquina);
}

interface DatosProceso {
  tituloEntrada: string;
  entrada: string;
  unidadEntrada: string;
  merma: string;
  entregadas: string;
  unidad: string;
  extra: string[];
}

function arrTexto(value: unknown): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value).trim();
}

function tintasConPantones(cantidad: unknown, pantones: unknown): string {
  const cant = n(cantidad);
  const pant = arrTexto(pantones);
  if (cant !== null && pant) return `${fmtNum(cant)}: ${pant}`;
  if (cant !== null) return fmtNum(cant);
  return pant;
}

function entradaProceso(registroValor: unknown, ...estimados: unknown[]): string {
  return primeraLinea(fmtNum(registroValor), ...estimados.map((v) => fmtNum(v)));
}

function datosProceso(
  key: NombreProcesoOrdenPapel,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null
): DatosProceso {
  const reg = registro ?? {};
  const merma = fmtNum(reg.merma);

  switch (key) {
    case "hojeado_papel":
      return {
        tituloEntrada: "Cantidad hojeado",
        entrada: primeraLinea(
          fmtNum(reg.cantidad_hojeado),
          fmtNum(data.cantidad_hojeada_calculada),
          fmtCantidad(data)
        ),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.cantidad_entregada),
        unidad: "Pliegos",
        extra: [
          `Bobina: ${primeraLinea(data.hoj_bobina, data.bobina_cm)} cm`,
          `Hojeado: ${primeraLinea(data.hoj_hilo)}`,
          `Rend. Hojeado: ${primeraLinea(data.hoj_rendimiento, data.rendimiento)}`,
          `Pliego Hojeado: ${primeraLinea(data.pliego_hojeado, data.hoj_corte)}`,
        ].filter((x) => !x.endsWith(": ") && !x.endsWith(":  cm")),
      };

    case "guillotina_papel":
      return {
        tituloEntrada: "Pliegos/Guillotina",
        entrada: primeraLinea(
          fmtNum(reg.pliegos),
          f(data.hoj_guillotina),
          f(data.pliegos_guillotina),
          fmtNum(data.pliegos_impresion_estimados),
          fmtCantidad(data)
        ),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.cantidad_entregada),
        unidad: "Pliegos",
        extra: [
          `Pliego: ${primeraLinea(data.pliego)}`,
          `Pliegos: ${primeraLinea(data.hoj_guillotina, data.pliegos_guillotina, reg.pliegos)}`,
          `Rend. Guillotina: ${primeraLinea(data.rendimiento, data.hoj_rendimiento)}`,
          `Corte: ${primeraLinea(data.corte, data.corte_guillotina)}`,
          `Cortes: ${primeraLinea(reg.cortes)}`,
        ].filter((x) => !x.endsWith(": ")),
      };

    case "impresion_papel":
      return {
        tituloEntrada: "Hojas impresas",
        entrada: entradaProceso(
          reg.pliegos_entrada,
          data.pliegos_impresion_estimados,
          data.cantidad_hojeada_calculada
        ),
        unidadEntrada: "",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [
          primeraLinea(
            data.material_impresion,
            `${primeraLinea(data.material)} ${primeraLinea(data.calibre)} ${primeraLinea(data.pliego_hojeado, data.hoj_corte, data.pliego, data.medida)}`
          ).trim(),
          `F: ${tintasConPantones(data.tintas_frente ?? data.tintas, data.pantones_frente ?? data.pantones)}`,
          `V: ${tintasConPantones(data.tintas_reverso ?? data.tintas_dentro ?? data.tintasDentro, data.pantones_reverso ?? data.pantones_dentro ?? data.pantonesDentro)}`,
        ].filter((x) => x && !x.endsWith(": ")),
      };

    case "laminacion_papel":
      return {
        tituloEntrada: "Hojas Laminadas",
        entrada: entradaProceso(reg.pliegos_entrada, data.pliegos_impresion_estimados),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [
          primeraLinea(data.laminado_acabado, data.laminado_nombre, data.laminado),
          `Metros: ${primeraLinea(fmtNum(reg.metros), fmtNum(data.metros_laminacion_estimados))}`,
          `Rollos: ${primeraLinea(fmtNum(reg.rollos, 2), fmtNum(data.rollos_laminacion_estimados, 2))}`,
          `Desarrollo: ${primeraLinea(reg.desarrollo_mm, data.desarrollo_laminacion_mm, data.desarrollo_mm)} mm`,
          `CTES/Mod: ${primeraLinea(reg.ctes_mod, data.ctes_mod_laminacion, data.ctes_mod)}`,
          `Bobina: ${primeraLinea(reg.bobina_cm, data.bobina_laminacion_cm, data.bobina_cm)} cm`,
        ].filter((x) => x && !x.endsWith(": ") && !x.endsWith(":  cm") && !x.endsWith(":  mm")),
      };

    case "barniz_uv_papel":
      return {
        tituloEntrada: "Hojas UV",
        entrada: entradaProceso(reg.pliegos_entrada, data.pliegos_impresion_estimados),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [],
      };

    case "hot_stamping_papel":
      return {
        tituloEntrada: "Hojas Estampadas",
        entrada: entradaProceso(reg.pliegos_entrada, data.pliegos_impresion_estimados),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [`HS: ${primeraLinea(data.foil_nombre, data.foil)}`].filter((x) => !x.endsWith(": ")),
      };

    case "texturizado_papel":
      return {
        tituloEntrada: "Hojas Texturizadas",
        entrada: entradaProceso(reg.pliegos_entrada, data.pliegos_impresion_estimados),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [`Textura: ${primeraLinea(data.textura_nombre, data.textura)}`].filter((x) => !x.endsWith(": ")),
      };

    case "alto_relieve_papel":
      return {
        tituloEntrada: "Hojas Alto Relieve",
        entrada: entradaProceso(reg.pliegos_entrada, data.pliegos_impresion_estimados),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [],
      };

    case "suaje_produccion_papel":
      return {
        tituloEntrada: "Hojas Suaje",
        entrada: entradaProceso(reg.pliegos_entrada, data.pliegos_impresion_estimados),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [
          `Suaje: ${primeraLinea(data.numero_suaje, data.suaje_nombre, data.suaje, reg.suaje_idsuaje_papel)}`,
          `Matrix: ${primeraLinea(data.matrix)}`,
        ].filter((x) => !x.endsWith(": ")),
      };

    case "armado_papel":
      return {
        tituloEntrada: "Pliegos",
        entrada: entradaProceso(reg.pliegos_entrada, data.pliegos_impresion_estimados),
        unidadEntrada: "",
        merma,
        entregadas: fmtNum(reg.bolsas_entregadas),
        unidad: "Bolsas",
        extra: [
          `Bolsas: ${primeraLinea(fmtNum(reg.bolsas_armadas), fmtNum(data.bolsas_armadas_calculadas))}`,
          `Tipo Pegado: ${primeraLinea(data.tipo_pegue, data.tipo_pegado)}`,
          `Pegamento: ${f(data.pegamento)}`,
          `Asa: ${primeraLinea(data.asa_descripcion, [primeraLinea(data.asa_tipo, data.asa, data.asa_suaje), primeraLinea(data.color_asa_nombre, data.asa_color), primeraLinea(data.asa_medida, data.medida_asa)].filter(Boolean).join(" "))}`,
          `Refuerzo: ${[data.refuerzo_material, data.refuerzo_medida, data.refuerzo].map(f).filter(Boolean).join(" ")}`,
          `Base: ${primeraLinea(data.base_medida, data.base)}`,
        ].filter((x) => !x.endsWith(": ")),
      };

    case "empaque_papel":
      return {
        tituloEntrada: "Revision",
        entrada: primeraLinea(fmtNum(reg.bolsas_entrada), fmtNum(data.bolsas_armadas_calculadas)),
        unidadEntrada: "",
        merma: fmtNum(reg.revision ?? reg.merma),
        entregadas: fmtNum(reg.bolsas_entregadas_final),
        unidad: "Bolsas",
        extra: [
          `Tipo caja: ${primeraLinea(data.tipo_caja, data.empaque)}`,
          `Cantidad: ${primeraLinea(data.cantidad_por_caja, data.pzs_caja)} pz`,
        ].filter((x) => x && !x.endsWith(": ") && !x.endsWith(":  pz")),
      };
  }
}

// Mini-celda con etiqueta arriba (gris) y valor abajo (negro, centrado),
// usada dentro de la fila ancha de preparación de material (Hojeado/Guillotina).

function miniCelda(doc: jsPDF, label: string, value: string, x: number, y: number, w: number, h: number, sufijo = "") {
  rect(doc, x, y, w, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.1);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  lineText(doc, label, x + w / 2, y + 2.8, w - 1.2, 5.1, false, "center", 1);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const texto = sufijo && f(value) ? `${value} ${sufijo}` : value;
  lineText(doc, texto, x + w / 2, y + h - 2.5, w - 1.4, 7.5, true, "center", 1);
}

// Ícono simple de bobina de papel, dibujado con primitivas de jsPDF (sin
// depender de un PNG externo) para el bloque de Hojeado.
function iconoBobina(doc: jsPDF, x: number, y: number, w: number, h: number) {
  rect(doc, x, y, w, h);
  setBlack(doc);
  doc.setLineWidth(0.3);
  const cx = x + w * 0.32;
  const cy = y + h / 2;
  const rOut = Math.min(w, h) * 0.32;
  doc.circle(cx, cy, rOut);
  doc.circle(cx, cy, rOut * 0.4);
  doc.setLineWidth(0.22);
  doc.rect(x + w * 0.52, y + h * 0.22, w * 0.4, h * 0.56);
}

// Ícono simple de guillotina/corte, dibujado con primitivas de jsPDF.
function iconoGuillotina(doc: jsPDF, x: number, y: number, w: number, h: number) {
  rect(doc, x, y, w, h);
  setBlack(doc);
  doc.setLineWidth(0.25);
  const px = x + w * 0.18;
  const py = y + h * 0.28;
  const pw = w * 0.64;
  const ph = h * 0.44;
  doc.rect(px, py, pw, ph);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([1, 0.8], 0);
  doc.line(x + w / 2, y + h * 0.14, x + w / 2, y + h * 0.86);
  doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.22);
}

// Fila ancha de preparación de material (Hojeado o Guillotina, son
// excluyentes entre sí). No lleva columna de Merma/Entregadas/Firma porque
// en este paso no se reporta merma; es solo informativo de cómo se preparó
// el material, tal como en el documento de referencia.

function procesoPreparacionBlock(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const leftW = 8;
  const iconW = 17;
  const mainX = x + leftW;
  const mainW = w - leftW;
  const celdasX = mainX + iconW;
  const celdasW = mainW - iconW;
  const reg = registro ?? {};
  const anyData = data as any;

  headerCellVertical(doc, proceso.etiqueta, x, y, leftW, h, 5.8);

  if (proceso.key === "hojeado_papel") {
    iconoBobina(doc, mainX, y, iconW, h);

    // Hojeado: bobina, hojeado, rendimiento de hojeado,
    // pliego hojeado y cantidad hojeada.
    const pesos = [0.95, 1.05, 1.18, 1.25, 1.35];
    const total = pesos.reduce((a, b) => a + b, 0);
    let cx = celdasX;
    const draw = (label: string, value: string, peso: number, sufijo = "") => {
      const cw = celdasW * (peso / total);
      miniCelda(doc, label, value, cx, y, cw, h, sufijo);
      cx += cw;
    };

    draw("Bobina", primeraLinea(data.hoj_bobina, data.bobina_cm), pesos[0], "cm");
    draw("Hojeado", primeraLinea(anyData.hojeado, data.hoj_corte, data.pliego_hojeado), pesos[1]);
    draw("Rend. Hojeado", primeraLinea(data.hoj_rendimiento, anyData.rendimiento_hojeado), pesos[2]);
    draw("Pliego Hojeado", primeraLinea(data.pliego_hojeado, data.hoj_corte, data.pliego), pesos[3]);
    draw("Cantidad Hojeada", primeraLinea(fmtNum(reg.cantidad_hojeado), fmtNum(anyData.cantidad_hojeada_calculada), fmtCantidad(data)), pesos[4]);
    return;
  }

  // Guillotina: pliego, pliegos, rendimiento de guillotina,
  // corte y cortes. Es un bloque distinto a Hojeado, porque no comparten
  // los mismos datos operativos.
  iconoGuillotina(doc, mainX, y, iconW, h);

  const pesos = [1.05, 1.05, 1.28, 1.1, 0.95];
  const total = pesos.reduce((a, b) => a + b, 0);
  let cx = celdasX;
  const draw = (label: string, value: string, peso: number) => {
    const cw = celdasW * (peso / total);
    miniCelda(doc, label, value, cx, y, cw, h);
    cx += cw;
  };

  draw("Pliego", primeraLinea(data.pliego, data.pliegos_guillotina), pesos[0]);
  draw("Pliegos", primeraLinea(anyData.hoj_guillotina, anyData.pliegos_guillotina, fmtNum(reg.pliegos), fmtNum(anyData.pliegos_impresion_estimados), fmtCantidad(data)), pesos[1]);
  draw("Rend. Guillotina", primeraLinea(anyData.rendimiento_guillotina, data.rendimiento), pesos[2]);
  draw("Corte", primeraLinea(data.corte, anyData.corte_guillotina), pesos[3]);
  draw("Cortes", primeraLinea(anyData.cortes, reg.cortes), pesos[4]);
}

// Bloque IZQUIERDO: etiqueta vertical + máquina + datos técnicos/entrada,
// equivalente a las cajas "Hojeado / Impresión / Laminación..." del PDF
// de referencia.
function procesoBlockIzquierdo(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  datos: DatosProceso,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const leftW = 9;
  const mainX = x + leftW;
  const mainW = w - leftW;

  headerCellVertical(doc, proceso.etiqueta, x, y, leftW, h, 6);
  rect(doc, mainX, y, mainW, h);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Maquina", mainX + 1.4, y + 3);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  const maquinaTexto = proceso.key === "armado_papel"
    ? primeraLinea((data as any).maquina_armado_pdf, registro?.maquina, "Manual")
    : valorMaquina(proceso, registro);
  lineText(doc, maquinaTexto, mainX + 1.4, y + 6.4, mainW - 26, 7.5, true, "left", 1);

  // Valor de entrada destacado, alineado a la derecha del bloque.
  if (datos.entrada) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(datos.entrada, mainX + mainW - 2, y + 6.3, { align: "right" });
    if (datos.unidadEntrada) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
      doc.text(datos.unidadEntrada, mainX + mainW - 2, y + 8.3, { align: "right" });
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    }
  }

  doc.line(mainX, y + 8.8, mainX + mainW, y + 8.8);

  // Las specs técnicas se unen con separador. No se recorta a 3 elementos
  // porque Laminación necesita mostrar tipo, metros, rollos, desarrollo,
  // CTES/mod y bobina.
  const extra = datos.extra.join("  |  ");
  if (extra) {
    lineText(doc, extra, mainX + 1.4, y + 11.4, mainW - 3, 6, false, "left", 2);
  }
}

// Bloque DERECHO: Merma / Entregadas arriba, y abajo Observaciones + una
// casilla independiente de Firma y Fecha por proceso (como en el PDF de
// referencia, donde cada proceso lleva su propio espacio de firma).
function procesoBlockDerecho(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  registro: ProcesoPapelRuntime | null,
  datos: DatosProceso,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const topH = h * 0.42;
  const bottomH = h - topH;
  const colW = w / 2;

  labelCell(doc, "Merma", datos.merma, x, y, colW, topH, 10, true);
  labelCell(doc, "Entregadas", datos.entregadas, x + colW, y, colW, topH, 10, true);

  const obsY = y + topH;
  const firmaW = w * 0.34;
  const obsW = w - firmaW;

  // Observaciones.
  rect(doc, x, obsY, obsW, bottomH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observaciones:", x + 1.4, obsY + 3);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  const obs = primeraLinea(registro?.observaciones, registro?.observaciones_calidad);
  if (obs) lineText(doc, obs, x + 1.4, obsY + 6, obsW - 2.8, 6, false, "left", 2);

  // Firma y fecha: casilla propia por proceso.
  const firmaX = x + obsW;
  rect(doc, firmaX, obsY, firmaW, bottomH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Firma y Fecha", firmaX + firmaW / 2, obsY + 3, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.line(firmaX + 1.5, obsY + bottomH - 2.2, firmaX + firmaW - 1.5, obsY + bottomH - 2.2);
}

// Columna angosta de firmas (Ventas/Diseño/Logística) pegada al lado derecho
// del recuadro ORDEN, tal como en el documento de referencia: solo etiqueta
// chica + línea de firma, sin el formato de casilla con fondo de labelCell.
function firmasLateral(doc: jsPDF, x: number, y: number, w: number, h: number) {
  rect(doc, x, y, w, h);
  const filas: Array<"Ventas" | "Diseño" | "Logística"> = ["Ventas", "Diseño", "Logística"];
  const rowH = h / filas.length;

  filas.forEach((label, i) => {
    const ry = y + rowH * i;
    if (i > 0) doc.line(x, ry, x + w, ry);

    doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.setLineWidth(0.18);
    doc.line(x + w * 0.42, ry + rowH * 0.32, x + w * 0.72, ry + rowH * 0.1);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
    doc.text(label, x + 1.5, ry + rowH - 1.6);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  });
}

// Bloque de Almacén / Empaque final, con el mismo esquema visual de 2
// columnas que el resto de los procesos: izquierda con etiqueta vertical +
// specs (Cajas/Tarimas/Cajas por tarima/Peso/Ubicación), derecha con
// Observaciones + Firma y fecha (sin Merma/Entregadas, ya que no aplica
// a este paso).

function almacenBlockIzquierdo(doc: jsPDF, _data: OrdenProduccionPapelData, x: number, y: number, w: number, h: number) {
  const leftW = 8;
  const mainX = x + leftW;
  const mainW = w - leftW;

  headerCellVertical(doc, "Almacén", x, y, leftW, h, 5.8);
  rect(doc, mainX, y, mainW, h);

  // Solo placeholders reales de almacén. No se arrastra observación del
  // producto porque ese dato no pertenece a este bloque.
  const campos = [
    "Cajas / Bultos",
    "Tarimas",
    "Cajas x Tarima",
    "Peso",
    "Ubicación",
  ];

  const colW = mainW / campos.length;
  campos.forEach((label, i) => {
    const cx = mainX + colW * i;
    if (i > 0) doc.line(cx, y, cx, y + h);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.7);
    doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
    lineText(doc, label, cx + 1, y + 2.7, colW - 2, 4.7, false, "left", 2);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  });
}


function almacenBlockDerecho(doc: jsPDF, _data: OrdenProduccionPapelData, x: number, y: number, w: number, h: number) {
  const firmaW = w * 0.34;
  const obsW = w - firmaW;

  rect(doc, x, y, obsW, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Observaciones:", x + 1.4, y + 2.9);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

  const firmaX = x + obsW;
  rect(doc, firmaX, y, firmaW, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Firma y Fecha", firmaX + firmaW / 2, y + 2.9, { align: "center" });
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.line(firmaX + 1.5, y + h - 2, firmaX + firmaW - 1.5, y + h - 2);
}

export async function generarPdfOrdenProduccionPapel(
  dataEntrada: OrdenProduccionPapelData,
  guardarEnS3 = false
): Promise<void> {
  // Normaliza en cliente ANTES de validar/dibujar: rellena material_impresion,
  // asa_descripcion, refuerzo y recalcula estimados (pliegos, desarrollo,
  // metros, rollos, bolsas, bobina, ctes/mod) si el backend no los mandó.
  // normalizar hace `{ ...data, ...calculados }`, así que NO pisa lo que ya
  // vino bueno: solo rellena lo que falte. Esto evita celdas en blanco sin
  // depender del estado exacto del backend.
  const data = normalizarOrdenProduccionPapelData(dataEntrada);

  validarProductoPapelParaPdf(data);

  const procesos = ordenarProcesosParaVisual(construirProcesosOrdenPapelPdf(data));
  const logoBase64 = await cargarLogoBase64(logoUrl);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const PW = 216;
  const PH = 279.4;
  const M = 6;
  const CW = PW - M * 2;
  let y = M;

  // Columna lateral de firmas (Ventas/Diseño/Logística), pegada al lado
  // derecho del recuadro ORDEN. Solo el header y la fila de "Info" ceden
  // este ancho; producto, atributos y bloques de proceso siguen usando
  // el ancho completo de la página, tal como en el documento de referencia.
  const firmaColW = 18;
  const anchoConFirma = CW - firmaColW;

  // Encabezado.
  const logoW = 38;
  const ordenW = 47;
  const titleW = anchoConFirma - logoW - ordenW;
  const headerH = 23;

  rect(doc, M, y, logoW, headerH);
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", M + 1, y + 1, logoW - 2, headerH - 2);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("EB", M + logoW / 2, y + 14, { align: "center" });
    }
  }

  rect(doc, M + logoW, y, titleW, headerH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Orden de Producción Papel", M + logoW + titleW / 2, y + 9, { align: "center" });

  // Fila de tags compacta. Solo muestra procesos que realmente aplican.
  const tagsW = titleW - 10;
  const tagsH = 6.5;
  const tagsX = M + logoW + (titleW - tagsW) / 2;
  const tagsY = y + 13.2;
  processTagRow(doc, procesos, tagsX, tagsY, tagsW, tagsH);

  const ox = M + logoW + titleW;
  headerCell(doc, "ORDEN", ox, y, ordenW, 6, 10);
  labelCell(doc, "No", f(data.no_produccion ?? `PED-${data.no_pedido}`), ox, y + 6, ordenW, 9, 14, true);
  labelCell(doc, "FECHA", fmtFecha(data.fecha), ox, y + 15, ordenW, 8, 10, false);

  const firmaX = ox + ordenW;
  const firmaTop = y;
  y += headerH;

  const infoH = 12;
  const impW = anchoConFirma * 0.35;
  const entW = anchoConFirma * 0.24;
  const priW = anchoConFirma * 0.14;
  const pedW = anchoConFirma - impW - entW - priW;
  labelCell(doc, "Impresión", primeraLinea(data.impresion, data.cliente), M, y, impW, infoH, 11, true);
  labelCell(doc, "Fecha entrega", fmtFecha(data.fecha_entrega ?? null), M + impW, y, entW, infoH, 10, false);
  labelCell(doc, "Prioridad", data.prioridad ? "URGENTE" : "Normal", M + impW + entW, y, priW, infoH, 10, true);
  labelCell(doc, "Pedido", data.no_pedido, M + impW + entW + priW, y, pedW, infoH, 10, true);

  // Columna de firmas: cubre desde el header hasta el final de la fila de
  // Info, con un renglón simple por firmante (etiqueta + línea), sin el
  // formato de casilla con fondo que usan los demás campos.
  firmasLateral(doc, firmaX, firmaTop, firmaColW, headerH + infoH);

  y += infoH;

  const prodH = 13;
  const prodW = CW * 0.33;
  const cantW = CW * 0.12;
  const medW = CW * 0.22;
  const matW = CW * 0.2;
  const calW = CW - prodW - cantW - medW - matW;
  labelCell(doc, "Producto", primeraLinea(data.nombre_producto, data.descripcion), M, y, prodW, prodH, 12, true);
  labelCell(doc, "Cantidad", fmtCantidad(data), M + prodW, y, cantW, prodH, 13, true);
  labelCell(doc, "Medida", f(data.medida), M + prodW + cantW, y, medW, prodH, 12, true);
  labelCell(doc, "Material", primeraLinea(data.material, data.grupo_descripcion), M + prodW + cantW + medW, y, matW, prodH, 11, true);
  labelCell(doc, "Calibre", f(data.calibre), M + prodW + cantW + medW + matW, y, calW, prodH, 11, true);
  y += prodH;

  const attrsH = 11;
  const attrs = [
    ["Ancho", primeraLinea(data.ancho)],
    ["Fuelle", primeraLinea(data.fuelle, data.fuelle_fondo)],
    ["Altura", primeraLinea(data.altura)],
    ["Asa", primeraLinea(data.asa_tipo, data.asa, data.asa_suaje)],
    ["Color", primeraLinea(data.color_asa_nombre, data.asa_color)],
    ["Tamaño", primeraLinea(data.asa_medida, data.medida_asa)],
    ["Pegamento", f(data.pegamento)],
    ["Tipo pegue", primeraLinea(data.tipo_pegue, data.tipo_pegado)],
    ["Suaje", primeraLinea(data.suaje_nombre, data.suaje)],
    ["Rend.", primeraLinea(data.rendimiento, data.hoj_rendimiento)],
  ];
  const aw = CW / attrs.length;
  attrs.forEach(([label, value], i) => labelCell(doc, label, value, M + aw * i, y, aw, attrsH, 8, true));
  y += attrsH + 1;

  // Bloques de proceso. Hojeado/Guillotina son excluyentes entre sí y no
  // llevan Merma/Entregadas (es un paso solo informativo de cómo se preparó
  // el material), por lo que se dibujan en una fila ancha aparte con el
  // formato de mini-celdas del documento de referencia. El resto de los
  // procesos sigue el esquema de 2 columnas paralelas (specs / merma-
  // entregadas-observaciones-firma).
  const preparacion = procesos.find((p) => p.key === "hojeado_papel" || p.key === "guillotina_papel");
  const procesosDosColumnas = procesos.filter((p) => p.key !== "hojeado_papel" && p.key !== "guillotina_papel");

  const prepRowH = 14;
  if (preparacion) {
    const registro = obtenerRegistroProcesoPapel(data, preparacion.key);
    procesoPreparacionBlock(doc, preparacion, data, registro, M, y, CW, prepRowH);
    y += prepRowH + 1;
  }

  const gap = 9;
  const leftColW = CW * 0.53;
  const rightColW = CW - leftColW - gap;
  const rightX = M + leftColW + gap;
  const rowH = 15.5;
  const rowGap = 1;

  procesosDosColumnas.forEach((proceso, idx) => {
    const registro = obtenerRegistroProcesoPapel(data, proceso.key);
    const datos = datosProceso(proceso.key, data, registro);
    const by = y + idx * (rowH + rowGap);

    procesoBlockIzquierdo(doc, proceso, data, registro, datos, M, by, leftColW, rowH);
    procesoBlockDerecho(doc, proceso, registro, datos, rightX, by, rightColW, rowH);
  });

  y += procesosDosColumnas.length * (rowH + rowGap);

  // Almacén / Empaque final, con el mismo esquema visual que los demás
  // procesos (ver almacenBlockIzquierdo/Derecho).
  const almacenH = 12.5;
  if (y + almacenH > PH - M) {
    doc.addPage();
    y = M;
  }
  almacenBlockIzquierdo(doc, data, M, y, leftColW, almacenH);
  almacenBlockDerecho(doc, data, rightX, y, rightColW, almacenH);
  y += almacenH;

  const nombre = `OrdenProduccionPapel_${data.no_produccion ?? data.no_pedido}.pdf`;
  doc.save(nombre);

  if (guardarEnS3) {
    const blob = doc.output("blob");
    await subirPdfA3(blob, nombre, "pdfs", "ordenes-produccion");
  }
}