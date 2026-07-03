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
  PROCESOS_ORDEN_PAPEL,
  primeraLinea,
  redondear,
  validarProductoPapelParaPdf,
} from "./papel/ordenProduccionPapelPdf.helpers";

// ────────────────────────────────────────────────────────────────────────
// CAMPO "ENTREGADAS" POR PROCESO — mismo mapeo que CAMPO_PRINCIPAL_FINAL_PAPEL
// en ModalProcesoIndividualPapel.tsx. Es el campo del registro de CADA
// proceso que representa lo que ese proceso entregó realmente. Sirve para
// encadenar: la "entrada" de un proceso es SIEMPRE lo "entregado" del
// proceso anterior (nunca un campo de entrada propio) — así lo confirmó
// el usuario: la 3ra celda (Entregadas) de un proceso alimenta tanto la
// celda de "entrada" del bloque derecho del SIGUIENTE proceso, como el
// número grande del bloque izquierdo (Maquina) de ese mismo siguiente
// proceso.
// ────────────────────────────────────────────────────────────────────────
const CAMPO_ENTREGADA_POR_PROCESO: Record<NombreProcesoOrdenPapel, string> = {
  hojeado_papel: "cantidad_entregada",
  guillotina_papel: "cantidad_entregada",
  impresion_papel: "pliegos_entregados",
  laminacion_papel: "pliegos_entregados",
  barniz_uv_papel: "pliegos_entregados",
  hot_stamping_papel: "pliegos_entregados",
  texturizado_papel: "pliegos_entregados",
  alto_relieve_papel: "pliegos_entregados",
  suaje_produccion_papel: "pliegos_entregados",
  armado_papel: "bolsas_entregadas",
  empaque_papel: "bolsas_entregadas_final",
};

function obtenerCantidadEntregadaProceso(
  key: NombreProcesoOrdenPapel,
  registro: ProcesoPapelRuntime | null
): number | null {
  const reg = (registro ?? {}) as Record<string, unknown>;
  return n(reg[CAMPO_ENTREGADA_POR_PROCESO[key]]);
}

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
  // CORREGIDO: antes el texto rotado arrancaba cerca del borde inferior
  // de la celda con un offset fijo, sin importar cuánto medía el label —
  // en celdas altas (que ahora varían de alto por proceso) quedaba
  // descentrado hacia abajo. Ahora se calcula el ancho real del texto
  // (que al rotar 90° se vuelve su extensión vertical) para centrarlo de
  // verdad dentro del alto disponible de la celda.
  const anchoTextoMm = doc.getStringUnitWidth(label) * size * 0.352778;
  const startY = y + h / 2 + anchoTextoMm / 2;
  doc.text(label, x + w / 2 + size * 0.32, startY, {
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
  align: Align = "center",
  raise = 0
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
  // `raise` sube el texto del valor (útil cuando se agranda la fuente,
  // para que no quede pegado al borde inferior de la celda).
  const baseY = y + h - Math.max(2.2, (lines.length - 1) * valueSize * 0.35 + 2.2) - raise;
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
  todosLosProcesos: Array<{ key: NombreProcesoOrdenPapel; etiqueta: string }>,
  aplicanKeys: Set<NombreProcesoOrdenPapel>,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // CORREGIDO: antes se recibía la lista ya filtrada (solo los que
  // aplican), así que el recuadro solo mostraba esos — perdiendo el
  // catálogo completo que sí tenía el PDF de referencia (Hojeo, Guillo,
  // Offset, Lam, HS, AR, UV, Textu, Suaje, Armado, Rev, Empaque...). Ahora
  // se dibuja SIEMPRE el catálogo completo de procesos del sistema, y solo
  // se marca con "X" el que realmente aplica a esta orden — igual que en
  // el PDF de referencia.
  rect(doc, x, y, w, h);
  if (todosLosProcesos.length === 0) return;

  const etiquetaCorta = (p: { key: NombreProcesoOrdenPapel }): string => {
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
    return mapa[p.key] ?? p.key;
  };

  const cellW = w / todosLosProcesos.length;
  let labelSize = 4.4;
  doc.setFont("helvetica", "bold");
  todosLosProcesos.forEach((p) => {
    const etiqueta = etiquetaCorta(p);
    while (labelSize > 3.0 && doc.getStringUnitWidth(etiqueta) * labelSize * 0.352778 > cellW - 0.8) {
      labelSize -= 0.2;
    }
  });

  todosLosProcesos.forEach((p, i) => {
    const cx = x + cellW * i;
    if (i > 0) doc.line(cx, y, cx, y + h);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    doc.text(etiquetaCorta(p), cx + cellW / 2, y + h * 0.42, { align: "center" });

    if (aplicanKeys.has(p.key)) {
      doc.setFontSize(Math.min(8, h - 1.5)); // antes: Math.min(5.4, h - 2.4)
      doc.setFont("helvetica", "bold"); // opcional, para que resalte más
      doc.text("X", cx + cellW / 2, y + h - 0.8, { align: "center" });
    }
  });
}

// ────────────────────────────────────────────────────────────────────────
// Quita ".00" de medidas que no tienen decimales reales (ej. "12.00" →
// "12", "12.00+7.00x14.00" → "12+7x14"), sin tocar medidas que sí tienen
// decimales significativos (ej. "12.50" se deja igual). Puramente
// estético — no cambia el valor numérico, solo cómo se muestra.
// ────────────────────────────────────────────────────────────────────────
function sinDecimalesInnecesarios(texto: string): string {
  if (!texto) return texto;
  return texto.replace(/(\d+)\.0+(?!\d)/g, "$1");
}

function fmtCantidad(data: OrdenProduccionPapelData): string {
  const kg = n(data.kilogramos);
  const cant = n(data.cantidad);
  if (String(data.modo_cantidad ?? "").toLowerCase() === "kilo" && kg !== null) {
    return `${fmtNum(kg, 2)} kg`;
  }
  return cant !== null ? fmtNum(cant) : "";
}

// ────────────────────────────────────────────────────────────────────────
// CORREGIDO: "Pliego Hojeado" NO es un campo único en la base de datos —
// "bobina" (ancho de la bobina) y "hojeado" (medida del corte) se guardan
// SEPARADOS. El PDF tiene que CONSTRUIR la unión "bobina x hojeado" (ej.
// "61x45"), no leer un campo ya combinado (por eso antes solo se veía
// "45": ese es el valor real del campo de hojeado, nunca tuvo el "61x"
// porque ese dato vive en otro campo). Ambos valores salen de la ficha
// del producto (data.hoj_bobina/bobina_cm y data.pliego_hojeado/
// hoj_corte/pliego) — nada hardcodeado.
// ────────────────────────────────────────────────────────────────────────
function pliegoHojeadoTexto(data: OrdenProduccionPapelData): string {
  const bobina = primeraLinea(data.hoj_bobina, data.bobina_cm);
  const hojeado = primeraLinea(data.pliego_hojeado, data.hoj_corte, data.pliego);

  if (bobina && hojeado) return `${bobina}x${hojeado}`;
  return primeraLinea(hojeado, bobina);
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

// ────────────────────────────────────────────────────────────────────────
// Alto dinámico por proceso, según cuántas líneas de specs traiga
// `datos.extra`. Antes todas las filas usaban un alto fijo (15.5mm),
// obligando a apretar/recortar procesos con mucha info (Laminación, 6
// líneas) y dejando espacio de sobra en los que traen poca (UV, HS con
// 0-1 línea). Ahora, igual que en el PDF de referencia, cada fila mide
// justo lo que necesita su contenido: compacta si trae poco texto, más
// alta si trae varias líneas.
// ────────────────────────────────────────────────────────────────────────
const ALTURA_BASE_PROCESO = 11; // header + Maquina + número + línea divisoria + margen
const ALTURA_MINIMA_PROCESO = 12.5;
const ALTO_POR_LINEA_EXTRA = 2.6;

function alturaFilaProceso(datos: DatosProceso): number {
  const lineas = datos.extra.filter(Boolean).length;
  return Math.max(ALTURA_BASE_PROCESO + lineas * ALTO_POR_LINEA_EXTRA, ALTURA_MINIMA_PROCESO);
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

// ────────────────────────────────────────────────────────────────────────
// CORREGIDO: se elimina el fallback a los estimados (pliegos_impresion_
// estimados / cantidad_hojeada_calculada) en la entrada de TODOS los
// procesos salvo Hojeado/Guillotina (que sí muestran su "Cantidad
// Calculada" como entrada — son el primer proceso de la cadena, no
// heredan de nadie). El resto de los procesos ahora solo muestra el dato
// REAL capturado en el registro (reg.pliegos_entrada, etc.), quedando en
// blanco hasta que el operador lo registre desde el módulo de
// seguimiento (SeccionAvancesPapel / finalizarProcesoPapel).
// ────────────────────────────────────────────────────────────────────────
function datosProceso(
  key: NombreProcesoOrdenPapel,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null
): DatosProceso {
  const reg = registro ?? {};
  const merma = fmtNum(reg.merma);

  switch (key) {
    // Hojeado y Guillotina ahora usan el MISMO formato genérico que el
    // resto de los procesos (columna izquierda: Máquina + specs en
    // líneas separadas + "Cantidad Calculada"; columna derecha: Merma /
    // Entregadas / Observaciones / Firma). "Cantidad Calculada" es el
    // primer proceso de la cadena, así que su entrada NO se hereda de
    // nadie (se calcula desde cantidad/rendimiento — ver el loop
    // principal, sección "Entrada encadenada").
    case "hojeado_papel": {
      const anyData = data as any;
      return {
        tituloEntrada: "Cantidad Calculada",
        entrada: fmtNum(anyData.cantidad_hojeada_calculada),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.cantidad_entregada),
        unidad: "Pliegos",
        extra: [
          `Bobina: ${primeraLinea(data.hoj_bobina, data.bobina_cm)}cm`,
          `Hojeado: ${primeraLinea(data.pliego_hojeado, data.hoj_corte, data.pliego)}`,
          `Rend. Hojeado: ${primeraLinea(data.hoj_rendimiento, data.rendimiento)}`,
          `Pliego Hojeado: ${pliegoHojeadoTexto(data)}`,
        ].filter((x) => x && !x.endsWith(": ") && !x.endsWith(":cm")),
      };
    }

    case "guillotina_papel": {
      const anyData = data as any;
      return {
        tituloEntrada: "Cantidad Calculada",
        entrada: fmtNum(anyData.pliegos_impresion_estimados),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.cantidad_entregada),
        unidad: "Pliegos",
        extra: [
          `Pliego: ${primeraLinea(data.pliego, data.pliegos_guillotina)}`,
          `Rend. Guillotina: ${primeraLinea(data.rendimiento, data.hoj_rendimiento)}`,
          `Corte: ${primeraLinea(data.corte, data.corte_guillotina)}`,
          `Cortes: ${fmtNum(reg.cortes)}`,
        ].filter((x) => x && !x.endsWith(": ")),
      };
    }

    case "impresion_papel":
      return {
        tituloEntrada: "Hojas impresas",
        entrada: fmtNum(reg.pliegos_entrada),
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
        entrada: fmtNum(reg.pliegos_entrada),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [
          primeraLinea(data.laminado_acabado, data.laminado_nombre, data.laminado),
          `Metros: ${fmtNum(reg.metros)}`,
          `Rollos: ${fmtNum(reg.rollos, 2)}`,
          `Desarrollo: ${primeraLinea(reg.desarrollo_mm, data.desarrollo_laminacion_mm, data.desarrollo_mm)} mm`,
          `CTES/Mod: ${primeraLinea(reg.ctes_mod, data.ctes_mod_laminacion, data.ctes_mod)}`,
          `Bobina: ${primeraLinea(reg.bobina_cm, data.bobina_laminacion_cm, data.bobina_cm)} cm`,
        ].filter((x) => x && !x.endsWith(": ") && !x.endsWith(":  cm") && !x.endsWith(":  mm")),
      };

    case "barniz_uv_papel":
      return {
        tituloEntrada: "Hojas UV",
        entrada: fmtNum(reg.pliegos_entrada),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [],
      };

    case "hot_stamping_papel":
      return {
        tituloEntrada: "Hojas Estampadas",
        entrada: fmtNum(reg.pliegos_entrada),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [`HS: ${primeraLinea(data.foil_nombre, data.foil)}`].filter((x) => !x.endsWith(": ")),
      };

    case "texturizado_papel":
      return {
        tituloEntrada: "Hojas Texturizadas",
        entrada: fmtNum(reg.pliegos_entrada),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [`Textura: ${primeraLinea(data.textura_nombre, data.textura)}`].filter((x) => !x.endsWith(": ")),
      };

    case "alto_relieve_papel":
      return {
        tituloEntrada: "Hojas Alto Relieve",
        entrada: fmtNum(reg.pliegos_entrada),
        unidadEntrada: "Pliegos",
        merma,
        entregadas: fmtNum(reg.pliegos_entregados),
        unidad: "Pliegos",
        extra: [],
      };

    case "suaje_produccion_papel":
      return {
        tituloEntrada: "Hojas Suaje",
        entrada: fmtNum(reg.pliegos_entrada),
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
      // El bloque izquierdo de Armado ya NO usa `extra` (ver
      // armadoBlockIzquierdo más abajo, que dibuja su propia mini-tabla
      // de Tipo Pegado / Pegamento / Asa / Refuerzo-Base). Aquí solo se
      // dejan tituloEntrada/merma/entregadas/unidad, que sí usa el
      // bloque derecho (procesoBlockDerecho).
      return {
        tituloEntrada: "Pliegos",
        entrada: fmtNum(reg.pliegos_entrada),
        unidadEntrada: "",
        merma,
        entregadas: fmtNum(reg.bolsas_entregadas),
        unidad: "Bolsas",
        extra: [],
      };

    case "empaque_papel":
      // TODO: aquí es donde debe ir el cálculo final = pliegos/bolsas
      // entregadas en Hojeado/Guillotina * rendimiento de hojeado
      // (multiplicación, no división). Pendiente de confirmar la fuente
      // exacta (¿registro de hojeado_papel.cantidad_entregada?) antes de
      // implementar esta fórmula. Por ahora la entrada solo lee el
      // registro real de empaque, sin fallback calculado.
      return {
        tituloEntrada: "Revision",
        entrada: fmtNum(reg.bolsas_entrada),
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

// (Se eliminaron miniCelda() y procesoPreparacionBlock(): Hojeado y
// Guillotina ahora usan el mismo bloque genérico de 2 columnas que el
// resto de los procesos — procesoBlockIzquierdo / procesoBlockDerecho —
// en vez de una fila ancha aparte con mini-celdas.)

// Bloque IZQUIERDO: etiqueta vertical + máquina + número grande de
// entrada + datos técnicos, equivalente a las cajas "Hojeado / Impresión /
// Laminación..." del PDF de referencia.
//
// IMPORTANTE: `entradaTexto` NUNCA es un campo de entrada propio del
// proceso — es lo que "Entregadas" registró el proceso ANTERIOR (ver
// obtenerCantidadEntregadaProceso en el render principal). Este mismo
// valor es el que también se dibuja como primera celda del bloque
// derecho, para que el operario lo vea reforzado en dos lugares: el
// número grande (vista rápida) y la celda con nombre de proceso (registro
// formal junto a Merma/Entregadas).
function procesoBlockIzquierdo(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  datos: DatosProceso,
  entradaTexto: string,
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

  // Valor de entrada destacado, alineado a la derecha del bloque. Mismo
  // dato que la 1ra celda del bloque derecho (ver arriba).
  if (entradaTexto) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(entradaTexto, mainX + mainW - 2, y + 6.3, { align: "right" });
    if (datos.unidadEntrada) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
      doc.text(datos.unidadEntrada, mainX + mainW - 2, y + 8.3, { align: "right" });
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    }
  }

  doc.line(mainX, y + 8.8, mainX + mainW, y + 8.8);

  // ── Specs en líneas separadas ────────────────────────────────────────
  // ANTES se unían con " | " en un solo párrafo que se recortaba a 2
  // líneas (se veía apretado y difícil de leer, sobre todo en Laminación
  // con 6 datos). AHORA cada dato de `datos.extra` va en su propia línea,
  // igual que en el PDF de referencia (Metros / Desarrollo / CTES-Mod
  // cada uno aparte). El alto de la fila ya no es fijo: se calcula según
  // cuántas líneas trae cada proceso (ver alturaFilaProceso en el loop
  // principal), así que aquí simplemente se dibujan todas sin recorte.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  let ly = y + 11.6;
  const lineHExtra = 2.6;
  datos.extra.filter(Boolean).forEach((linea) => {
    lineText(doc, linea, mainX + 1.4, ly, mainW - 3, 5.8, false, "left", 1);
    ly += lineHExtra;
  });
}

// Celda de la cuadrícula 2x2 (Hojeado/Guillotina): borde propio, label
// chico gris arriba y valor BOLD más grande centrado abajo — más legible
// que una línea de texto plano, y con espacio para agrandar el valor.
function celdaGridInfo(doc: jsPDF, label: string, value: string, x: number, y: number, w: number, h: number) {
  rect(doc, x, y, w, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  // "sube" el label (más cerca del borde superior) para que quede más
  // separado del valor de abajo — antes se veían pegados.
  lineText(doc, label, x + w / 2, y + 2.4, w - 2, 5.6, false, "center", 1);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  lineText(doc, value, x + w / 2, y + h - 2, w - 2.4, 9.5, true, "center", 1);
}

// ────────────────────────────────────────────────────────────────────────
// Bloque IZQUIERDO específico de Hojeado/Guillotina: mismo header que el
// bloque genérico (Maquina + número de "Cantidad Calculada"), pero sus 4
// datos técnicos ya no van en líneas de texto — van en una CUADRÍCULA
// 2x2 de celdas con borde propio, en negritas y con letra más grande,
// como pidió el usuario ("celdas de 2 y 2").
//
//   Hojeado    → Bobina | Hojeado
//                Rend. Hojeado | Pliego Hojeado
//   Guillotina → Pliego | Rend. Guillotina
//                Corte | Cortes
// ────────────────────────────────────────────────────────────────────────
function prepBlockIzquierdo(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  entradaTexto: string,
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
  const maquinaTexto = valorMaquina(proceso, registro);
  lineText(doc, maquinaTexto, mainX + 1.4, y + 6.4, mainW - 26, 7.5, true, "left", 1);

  if (entradaTexto) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(entradaTexto, mainX + mainW - 2, y + 6.3, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
    doc.text("Pliegos", mainX + mainW - 2, y + 8.3, { align: "right" });
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  }

  doc.line(mainX, y + 8.8, mainX + mainW, y + 8.8);

  const reg = (registro ?? {}) as Record<string, unknown>;
  const items = proceso.key === "hojeado_papel"
    ? [
      {
        label: "Bobina", value: (() => {
          const v = primeraLinea(data.hoj_bobina, data.bobina_cm);
          return v ? `${v}cm` : "";
        })()
      },
      { label: "Hojeado", value: primeraLinea(data.pliego_hojeado, data.hoj_corte, data.pliego) },
      { label: "Rend. Hojeado", value: primeraLinea(data.hoj_rendimiento, data.rendimiento) },
      { label: "Pliego Hojeado", value: pliegoHojeadoTexto(data) },
    ]
    : [
      { label: "Pliego", value: primeraLinea(data.pliego, data.pliegos_guillotina) },
      { label: "Rend. Guillotina", value: primeraLinea(data.rendimiento, data.hoj_rendimiento) },
      { label: "Corte", value: primeraLinea(data.corte, data.corte_guillotina) },
      { label: "Cortes", value: fmtNum(reg.cortes) },
    ];

  const gridY = y + 8.8;
  const gridH = h - 8.8;
  const cellW = mainW / 2;
  const cellH = gridH / 2;

  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    celdaGridInfo(doc, item.label, item.value, mainX + col * cellW, gridY + row * cellH, cellW, cellH);
  });
}

// Segmento label:valor horizontal (label chico gris a la izquierda, valor
// bold negro a la derecha, todo en una sola línea). Usado dentro de la
// tabla de specs de Armado (Tipo Pegado / Pegamento / Asa / Refuerzo).
function segmentoEtiquetaValor(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string) {
  const midY = y + h / 2 + 1.4;
  let offsetX = 0;
  if (label) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
    doc.text(label, x, midY);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    offsetX = doc.getStringUnitWidth(label) * 5.2 * 0.352778 + 2.2;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  lineText(doc, value, x + offsetX, midY, Math.max(w - offsetX, 4), 7, true, "left", 1);
}

interface ExtraLabelValor {
  label: string;
  value: string;
}

// Alto de fila para bloqueProcesoSimple, según cuántos datos extra traiga
// (0 = UV/AR, compacto; 1 = HS/Textura; 2 = Suaje, un poco más alto).
function alturaBloqueSimple(extras: ExtraLabelValor[]): number {
  if (extras.length === 0) return 11;
  if (extras.length === 1) return 12.5;
  return 15;
}

// ────────────────────────────────────────────────────────────────────────
// Bloque IZQUIERDO reutilizable para procesos que solo llevan Máquina +
// cantidad entregada, con 0, 1 o 2 datos extra (Suaje/Matrix, Textura,
// Foil). Reemplaza a procesoBlockIzquierdo (genérico) para UV, HS,
// Textura, AR y Suaje, según el diseño exacto pedido:
//
//   UV / AR        → 2 casillas: Maquina | Numero + "Pliegos"
//   HS             → 3 casillas: Maquina | Numero + "Pliegos" | Foil (bold, sin label)
//   Textura        → 3 casillas: Maquina | Numero + "Pliegos" | "Textura" / valor (apilado)
//   Suaje          → 3 casillas: Maquina | Numero + "Pliegos" | "Suaje X" / "Matrix Y" (en línea)
// ────────────────────────────────────────────────────────────────────────
function bloqueProcesoSimple(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  registro: ProcesoPapelRuntime | null,
  entradaTexto: string,
  unidadEntrada: string,
  extras: ExtraLabelValor[],
  x: number,
  y: number,
  w: number,
  h: number
) {
  const leftW = 9;
  const mainX = x + leftW;
  const mainW = w - leftW;

  headerCellVertical(doc, proceso.etiqueta, x, y, leftW, h, 6);

  const tieneExtras = extras.length > 0;
  // Se le quita medio centímetro (5mm) a la caja de Máquina y se le suma
  // a la caja del medio (Pliegos), que se veía muy angosta con espacio
  // en blanco alrededor del número.
  const AJUSTE_MM = 5;
  const box1W = mainW * (tieneExtras ? 0.36 : 0.42) - AJUSTE_MM;
  const box2W = mainW * (tieneExtras ? 0.34 : 0.58) + AJUSTE_MM;
  const box3W = mainW - box1W - box2W;

  // Caja 1: Máquina.
  rect(doc, mainX, y, box1W, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Maquina", mainX + 1.4, y + 3);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  const maquinaTexto = primeraLinea(registro?.maquina, proceso.maquina);
  lineText(doc, maquinaTexto, mainX + 1.4, y + h / 2 + 2, box1W - 2.6, 8, true, "left", 2);

  // Caja 2: número grande + unidad (siempre "Pliegos", encadenado desde
  // el proceso anterior).
  const box2X = mainX + box1W;
  rect(doc, box2X, y, box2W, h);
  if (entradaTexto) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(entradaTexto, box2X + box2W * 0.42, y + h / 2 + 2, { align: "center" });
  }
  if (unidadEntrada) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(unidadEntrada, box2X + box2W * 0.68, y + h / 2 + 2, { align: "left" });
  }

  // Caja 3 (opcional): datos extra.
  if (tieneExtras) {
    const box3X = box2X + box2W;
    rect(doc, box3X, y, box3W, h);

    if (extras.length === 1 && !extras[0].label) {
      // HS: solo el valor, en bold, centrado (sin label — el foil no
      // lleva etiqueta visible en la referencia).
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      lineText(doc, extras[0].value, box3X + box3W / 2, y + h / 2 + 1.5, box3W - 2.4, 8, true, "center", 2);
    } else if (extras.length === 1) {
      // Textura: label arriba (chico, gris), valor abajo (bold, centrado)
      // — apilado, como en la referencia.
      labelCell(doc, extras[0].label, extras[0].value, box3X, y, box3W, h, 8, true, "center");
    } else {
      // Suaje: 2 renglones "label  valor" en línea, apilados.
      const lineasH = h / extras.length;
      extras.forEach((extra, i) => {
        const ey = y + lineasH * i;
        if (i > 0) doc.line(box3X, ey, box3X + box3W, ey);
        segmentoEtiquetaValor(doc, box3X + 1.4, ey, box3W - 1.8, lineasH, extra.label, extra.value);
      });
    }
  }
}

// ────────────────────────────────────────────────────────────────────────
// Bloque IZQUIERDO específico de Laminación. 3 casillas:
//   1. Máquina + 3 líneas de specs (Metros/Rollos, Desarrollo, CTES/Mod)
//   2. Número grande (pliegos que entraron) + "Pliegos"
//   3. Tipo de laminado (Mate/Brillante/etc.) + "Bobina: Xcm"
// ────────────────────────────────────────────────────────────────────────
function laminacionBlockIzquierdo(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  entradaTexto: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const leftW = 9;
  const mainX = x + leftW;
  const mainW = w - leftW;
  const reg = (registro ?? {}) as Record<string, unknown>;
  const anyData = data as any;

  headerCellVertical(doc, proceso.etiqueta, x, y, leftW, h, 6);

  const box1W = mainW * 0.52;

  // Caja 1: Máquina + specs.
  rect(doc, mainX, y, box1W, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Maquina", mainX + 1.4, y + 3);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  const maquinaTexto = primeraLinea(registro?.maquina, proceso.maquina);
  lineText(doc, maquinaTexto, mainX + 1.4, y + 6.4, box1W - 2.8, 7.5, true, "left", 1);

  doc.line(mainX, y + 8.6, mainX + box1W, y + 8.6);

  const metros = fmtNum(reg.metros ?? anyData.metros_laminacion_estimados);
  const rollos = fmtNum(reg.rollos ?? anyData.rollos_laminacion_estimados, 2);
  const desarrollo = primeraLinea(reg.desarrollo_mm, anyData.desarrollo_laminacion_mm, anyData.desarrollo_mm);
  const ctesMod = primeraLinea(reg.ctes_mod, anyData.ctes_mod_laminacion, anyData.ctes_mod);

  const specs = [
    metros ? `Metros: ${metros} mts${rollos ? `   ${rollos} rollos` : ""}` : "",
    desarrollo ? `Desarrollo: ${desarrollo} mm` : "",
    ctesMod ? `CTES/Mod: ${ctesMod}` : "",
  ].filter(Boolean);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  let ly = y + 11.6;
  specs.forEach((linea) => {
    lineText(doc, linea, mainX + 1.4, ly, box1W - 3, 6.6, true, "left", 1);
    ly += 3.0;
  });

  // CORREGIDO: antes "número + Pliegos" y "tipo + Bobina" eran 2
  // columnas separadas lado a lado. Ahora van en la MISMA columna
  // derecha, apiladas una arriba de la otra (separador horizontal), tal
  // como en el PDF de referencia. La línea divisoria usa el MISMO offset
  // (8.6) que la línea de box1 (Maquina/specs), para que ambas líneas
  // queden alineadas horizontalmente en toda la fila.
  const box2W = mainW - box1W;
  const box2X = mainX + box1W;
  const filaSupH = 8.6;
  const filaInfH = h - filaSupH;

  // Fila superior: número grande (entrada) + "Pliegos".
  rect(doc, box2X, y, box2W, filaSupH);
  if (entradaTexto) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(entradaTexto, box2X + box2W * 0.4, y + filaSupH / 2 + 1.6, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Pliegos", box2X + box2W * 0.65, y + filaSupH / 2 + 1.6, { align: "left" });
  }

  // Fila inferior: tipo de laminado + bobina.
  const box3Y = y + filaSupH;
  rect(doc, box2X, box3Y, box2W, filaInfH);
  const tipoLaminado = primeraLinea(data.laminado_acabado, data.laminado_nombre, data.laminado);
  // La bobina que debe mostrarse aquí es la del proceso de HOJEADO
  // (data.hoj_bobina / data.bobina_cm — el mismo dato que ya se ve en la
  // celda "Bobina" del bloque de Hojeado), no un campo propio de
  // laminación. Se deja el registro/estimado de laminación como respaldo
  // solo por si el producto no llevó hojeado (p. ej. entró por guillotina).
  const bobina = primeraLinea(data.hoj_bobina, data.bobina_cm, reg.bobina_cm, anyData.bobina_laminacion_cm);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  lineText(doc, tipoLaminado, box2X + 1.4, box3Y + filaInfH / 2 - 0.5, box2W * 0.5, 9, true, "left", 1);
  if (bobina) {
    segmentoEtiquetaValor(doc, box2X + box2W * 0.5, box3Y, box2W * 0.48, filaInfH, "Bobina:", `${bobina}cm`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Bloque IZQUIERDO específico de Empaque. 2 casillas:
//   1. Máquina
//   2. Tipo de caja seleccionada (bold, grande) + "Cantidad Xpz"
// No muestra el número de entrada aquí — ese vive en el bloque derecho
// (procesoBlockDerecho), que ya trae la cantidad real encadenada
// (entregadas de Armado × rendimiento).
// ────────────────────────────────────────────────────────────────────────
function empaqueBlockIzquierdo(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const leftW = 9;
  const mainX = x + leftW;
  const mainW = w - leftW;

  headerCellVertical(doc, proceso.etiqueta, x, y, leftW, h, 6);

  const box1W = mainW * 0.3;
  rect(doc, mainX, y, box1W, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Maquina", mainX + 1.4, y + 3);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  const maquinaTexto = primeraLinea((data as any).maquina_armado_pdf, registro?.maquina, "Manual");
  lineText(doc, maquinaTexto, mainX + 1.4, y + h / 2 + 2, box1W - 2.6, 9, true, "left", 1);

  const box2X = mainX + box1W;
  const box2W = mainW - box1W;
  rect(doc, box2X, y, box2W, h);

  const tipoCaja = primeraLinea(data.tipo_caja, data.empaque);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  lineText(doc, tipoCaja, box2X + box2W * 0.36, y + h / 2 + 1.2, box2W * 0.66, 10.5, true, "center", 1);

  const cantidad = primeraLinea(data.cantidad_por_caja, data.pzs_caja);
  if (cantidad) {
    segmentoEtiquetaValor(doc, box2X + box2W * 0.68, y, box2W * 0.3, h, "Cantidad", `${cantidad}pz`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Bloque IZQUIERDO específico de Armado (reemplaza a procesoBlockIzquierdo
// solo para esta clave). Diseño pedido explícitamente por el usuario:
//
//   Armado | Maquina/Manual | Pliegos 6,055  | Tipo Pegado   Fuelle
//          |                | Bolsas 3,027   | Pegamento     393 + Hot melt
//          |                |                | Asa  Cordel Negro    45cm
//          |                |                | Refuerzo 4x10  Base  39.5x14.5
//
// "Pliegos" = entradaTexto (lo entregado por el proceso anterior, Suaje).
// "Bolsas" = reg.bolsas_armadas (dato propio de este proceso, capturado
// por el operador). Las specs de la tabla (Tipo Pegado, Pegamento, Asa,
// Refuerzo/Base) vienen de la ficha del producto, igual que antes, solo
// que ahora en tabla en vez de una sola línea con "|".
// ────────────────────────────────────────────────────────────────────────
function armadoBlockIzquierdo(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  entradaTexto: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const leftW = 9;
  const mainX = x + leftW;
  const mainW = w - leftW;

  headerCellVertical(doc, proceso.etiqueta, x, y, leftW, h, 6);

  const maquinaW = mainW * 0.30;
  const cantW = mainW * 0.18;
  const tablaW = mainW - maquinaW - cantW;
  const maquinaX = mainX;
  const cantX = maquinaX + maquinaW;
  const tablaX = cantX + cantW;

  const maquinaTexto = primeraLinea((data as any).maquina_armado_pdf, registro?.maquina, "Manual");
  labelCell(doc, "Maquina", maquinaTexto, maquinaX, y, maquinaW, h, 10, true);

  const reg = (registro ?? {}) as Record<string, unknown>;
  labelCell(doc, "Pliegos", entradaTexto, cantX, y, cantW, h / 2, 9, true);
  labelCell(doc, "Bolsas", fmtNum(reg.bolsas_armadas), cantX, y + h / 2, cantW, h / 2, 9, true);

  rect(doc, tablaX, y, tablaW, h);
  const rowH4 = h / 4;

  const tipoPegado = primeraLinea(data.tipo_pegue, data.tipo_pegado);
  const pegamento = f(data.pegamento);
  // CORREGIDO: antes usaba data.asa_descripcion como primera opción, pero
  // ese campo normalizado YA incluye la medida al final ("Listón satinado
  // negro 12"), y el segmento angosto de al lado volvía a mostrar la
  // medida por separado — de ahí el "12" duplicado. Ahora se construye
  // SOLO con tipo + color (sin medida), dejando la medida únicamente en
  // el segmento angosto de la derecha.
  const asaValor = primeraLinea(data.asa_tipo, data.asa, data.asa_suaje) +
    (primeraLinea(data.color_asa_nombre, data.asa_color) ? ` ${primeraLinea(data.color_asa_nombre, data.asa_color)}` : "");
  // Con sufijo "cm" — antes se mostraba el número solo.
  const asaMedidaValor = primeraLinea(data.asa_medida, data.medida_asa);
  const asaMedida = asaMedidaValor ? `${asaMedidaValor}cm` : "";
  // Mismo fix que Refuerzo del bloque genérico: prioriza el campo YA
  // normalizado antes de reconstruirlo, para no duplicar el texto.
  const refuerzoValor = primeraLinea(
    data.refuerzo,
    [data.refuerzo_material, data.refuerzo_medida].map(f).filter(Boolean).join(" ")
  );
  const baseValor = primeraLinea(data.base_medida, data.base);

  const filas: Array<{ segmentos: Array<{ label: string; value: string; peso: number }> }> = [
    { segmentos: [{ label: "Tipo Pegado", value: tipoPegado, peso: 1 }] },
    { segmentos: [{ label: "Pegamento", value: pegamento, peso: 1 }] },
    {
      segmentos: [
        { label: "Asa", value: asaValor, peso: 0.72 },
        { label: "", value: asaMedida, peso: 0.28 },
      ]
    },
    {
      segmentos: [
        { label: "Refuerzo", value: refuerzoValor, peso: 0.45 },
        { label: "Base", value: baseValor, peso: 0.55 },
      ]
    },
  ];

  filas.forEach((fila, i) => {
    const ry = y + rowH4 * i;
    if (i > 0) doc.line(tablaX, ry, tablaX + tablaW, ry);

    let sx = tablaX;
    fila.segmentos.forEach((seg, si) => {
      const segW = tablaW * seg.peso;
      if (si > 0) doc.line(sx, ry, sx, ry + rowH4);
      segmentoEtiquetaValor(doc, sx + 1.4, ry, segW - 1.8, rowH4, seg.label, seg.value);
      sx += segW;
    });
  });
}

// (Se eliminó el catálogo MAQUINAS_IMPRESION: ya no se usa un checklist
// de 3 máquinas posibles — ahora Impresión solo muestra la máquina
// realmente usada, igual que el resto de los procesos.)


// ────────────────────────────────────────────────────────────────────────
// Bloque IZQUIERDO específico de Impresión (reemplaza a
// procesoBlockIzquierdo solo para esta clave). Diseño pedido explícitamente
// por el usuario, con 3 secciones:
//
//   1. Checklist de máquina (Heidelberg SM / Heidelberg MO / KBA), con la
//      usada realmente marcada.
//   2. Número grande = lo que entregó Hojeado/Guillotina (entradaTexto,
//      ya encadenado), + tipo de papel, calibre y medida de bobina x
//      hojeado (pliego hojeado).
//   3. Pantones, en formato "tintas frente x tintas vuelta" (ej. "5x1"),
//      seguido de las tintas de frente (F:) y vuelta (V:) con sus
//      pantones.
// ────────────────────────────────────────────────────────────────────────
function impresionBlockIzquierdo(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  data: OrdenProduccionPapelData,
  registro: ProcesoPapelRuntime | null,
  entradaTexto: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const leftW = 9;
  const mainX = x + leftW;
  const mainW = w - leftW;

  headerCellVertical(doc, proceso.etiqueta, x, y, leftW, h, 6);

  // CORREGIDO: antes topH/bottomH eran proporciones de h, y la posición
  // del número + "Maquina" (topH*0.42 + 3.2) caía casi exactamente en la
  // misma Y que el texto de material (topH - 3) — ambos números daban
  // ~7.6mm cuando topH≈10.6mm. El material (dibujado después, en negritas)
  // tapaba la palabra "Maquina", por eso no se veía. Ahora se usan
  // offsets FIJOS (no proporcionales) para número/label/material, con
  // separación garantizada entre cada uno.
  const topH = 15;
  const bottomH = h - topH;
  // CORREGIDO: ya no se lista el catálogo de 3 máquinas con checkbox
  // (sobraba info y además desbordaba la caja, encimándose con
  // "Pantones"). Ahora, igual que el resto de los bloques, solo se
  // muestra la máquina REALMENTE usada.
  const box1W = mainW * 0.3;
  const box2W = mainW - box1W;

  // ── Sección 1: Máquina (solo la seleccionada, sin checklist) ────────
  rect(doc, mainX, y, box1W, topH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Maquina", mainX + 1.4, y + 3);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  const maquinaTexto = primeraLinea(registro?.maquina, proceso.maquina);
  lineText(doc, maquinaTexto, mainX + 1.4, y + topH / 2 + 3, box1W - 2.6, 8, true, "left", 2);

  // ── Sección 2: número (entrada encadenada) + ficha técnica ──────────
  const box2X = mainX + box1W;
  rect(doc, box2X, y, box2W, topH);

  if (entradaTexto) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(entradaTexto, box2X + box2W / 2, y + 5.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
    // En Impresión la cantidad entregada se etiqueta "Maquina" (no
    // "Pliegos" como el resto de los procesos) — confirmado por el
    // usuario, coincide con el PDF de referencia original.
    doc.text("Maquina", box2X + box2W / 2, y + 8.5, { align: "center" });
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  }

  // Línea divisoria entre el número y el material, para que quede clara
  // la separación (mismo criterio visual que el resto de los bloques).
  doc.line(box2X, y + 10, box2X + box2W, y + 10);

  // Se quitó `data.medida` del fallback — traía solo "45" en vez de la
  // medida completa. Usa exactamente los mismos campos (en el mismo
  // orden) que ya funcionan bien en el bloque de Hojeado ("Pliego
  // Hojeado: 61x45 cm"), así que el dato queda consistente entre ambos.
  const materialTexto = primeraLinea(
    data.material_impresion,
    [primeraLinea(data.material), primeraLinea(data.calibre), pliegoHojeadoTexto(data)]
      .filter(Boolean)
      .join("  ")
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  lineText(doc, materialTexto, box2X + box2W / 2, y + 13, box2W - 3, 7.5, true, "center", 2);

  // ── Sección 3: Pantones (formato tintas frente x tintas vuelta) ─────
  rect(doc, mainX, y + topH, mainW, bottomH);

  const tintasFrenteNum = n(data.tintas_frente ?? data.tintas);
  const tintasVueltaNum = n(data.tintas_reverso ?? data.tintas_dentro ?? data.tintasDentro);
  const formatoTintas = tintasFrenteNum !== null || tintasVueltaNum !== null
    ? `${tintasFrenteNum ?? 0}x${tintasVueltaNum ?? 0}`
    : "";

  // Más tamaño, negritas y espaciado (antes quedaba muy pegado al borde
  // superior — "al ras").
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text("Pantones", mainX + 1.8, y + topH + 2.6);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  if (formatoTintas) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(formatoTintas, mainX + 17, y + topH + 2.6);
  }

  const fTexto = `F: ${tintasConPantones(data.tintas_frente ?? data.tintas, data.pantones_frente ?? data.pantones)}`;
  const vTexto = `V: ${tintasConPantones(data.tintas_reverso ?? data.tintas_dentro ?? data.tintasDentro, data.pantones_reverso ?? data.pantones_dentro ?? data.pantonesDentro)}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  let py = y + topH + 6.2;
  [fTexto, vTexto].forEach((linea) => {
    if (linea.endsWith(": ")) return;
    lineText(doc, linea, mainX + 1.8, py, mainW - 3.6, 7, true, "left", 1);
    py += 3.3;
  });
}


// Bloque DERECHO: ahora 3 columnas arriba en vez de 2 —
//   [Entrada: nombre del proceso, piezas que salieron del anterior] |
//   [Merma: lo que se perdió en este proceso] |
//   [Entregadas: lo que este proceso realmente entregó]
// — y abajo Observaciones + una casilla independiente de Firma y Fecha
// por proceso (como en el PDF de referencia). "Entregadas" de este bloque
// es, a su vez, la que alimentará la celda de "Entrada" del SIGUIENTE
// proceso (tanto aquí como en su bloque izquierdo).
function procesoBlockDerecho(
  doc: jsPDF,
  proceso: ProcesoOrdenPapelPdf,
  registro: ProcesoPapelRuntime | null,
  datos: DatosProceso,
  entradaTexto: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const topH = h * 0.42;
  const bottomH = h - topH;
  const colW = w / 3;

  labelCell(doc, datos.tituloEntrada || "Entrada", entradaTexto, x, y, colW, topH, 9, true);
  labelCell(doc, "Merma", datos.merma, x + colW, y, colW, topH, 9, true);
  labelCell(doc, "Entregadas", datos.entregadas, x + colW * 2, y, colW, topH, 9, true);

  const obsY = y + topH;
  // "Firma y Fecha" usa exactamente el mismo ancho que la columna
  // "Entregadas" (colW), y "Observaciones" el mismo ancho que
  // "Entrada + Merma" juntas (colW * 2), para que ambas filas queden
  // alineadas verticalmente tal como se pidió.
  const firmaW = colW;
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

  // El título va arriba, centrado en el espacio disponible.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Orden de Producción Papel", M + logoW + titleW / 2, y + 10, { align: "center" });

  // ── Fila de tags: ABAJO (no arriba), pegada al borde INFERIOR de la
  // celda del título, de lado a lado SIN márgenes (mismo ancho exacto que
  // la celda, arrancando en el mismo borde izquierdo). Muestra el
  // catálogo COMPLETO de procesos del sistema, marcando con "X" solo los
  // que aplican a esta orden.
  const tagsW = titleW;
  const tagsH = 8;
  const tagsX = M + logoW;
  const tagsY = y + headerH - tagsH;
  const aplicanKeys = new Set(procesos.map((p) => p.key as NombreProcesoOrdenPapel));
  processTagRow(doc, PROCESOS_ORDEN_PAPEL, aplicanKeys, tagsX, tagsY, tagsW, tagsH);

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
  labelCell(doc, "Medida", sinDecimalesInnecesarios(f(data.medida)), M + prodW + cantW, y, medW, prodH, 12, true);
  labelCell(doc, "Material", primeraLinea(data.material, data.grupo_descripcion), M + prodW + cantW + medW, y, matW, prodH, 11, true);
  labelCell(doc, "Calibre", f(data.calibre), M + prodW + cantW + medW + matW, y, calW, prodH, 11, true);
  y += prodH;

  const attrsH = 11;
  // Tercer elemento: true = "crecer" (Ancho/Fuelle/Altura/Tamaño/Suaje/
  // Rend., pedido explícitamente), false = tamaño normal (Asa/Color/
  // Pegamento/Tipo pegue, que ya se veían bien).
  const attrs: Array<[string, string, boolean]> = [
    ["Ancho", sinDecimalesInnecesarios(primeraLinea(data.ancho)), true],
    ["Fuelle", sinDecimalesInnecesarios(primeraLinea(data.fuelle, data.fuelle_fondo)), true],
    ["Altura", sinDecimalesInnecesarios(primeraLinea(data.altura)), true],
    ["Asa", primeraLinea(data.asa_tipo, data.asa, data.asa_suaje), false],
    ["Color", primeraLinea(data.color_asa_nombre, data.asa_color), false],
    ["Tamaño", primeraLinea(data.asa_medida, data.medida_asa), true],
    ["Pegamento", f(data.pegamento), false],
    ["Tipo pegue", primeraLinea(data.tipo_pegue, data.tipo_pegado), false],
    ["Suaje", primeraLinea(data.suaje_nombre, data.suaje), true],
    ["Rend.", primeraLinea(data.rendimiento, data.hoj_rendimiento), true],
  ];
  const aw = CW / attrs.length;
  attrs.forEach(([label, value, crecer], i) => {
    // "sube un poco, no tanto porque si no quedarían fuera": raise
    // pequeño (1.3mm) solo en las celdas agrandadas, para que el valor
    // más grande no quede pegado al borde inferior sin salirse del cell.
    labelCell(doc, label, value, M + aw * i, y, aw, attrsH, crecer ? 10.5 : 8, true, "center", crecer ? 1.3 : 0);
  });
  y += attrsH + 1;

  // Bloques de proceso. Hojeado/Guillotina ahora usan el MISMO esquema
  // de 2 columnas paralelas que el resto (specs / merma-entregadas-
  // observaciones-firma) — ya no llevan una fila ancha aparte con
  // mini-celdas.
  const gap = 14;
  const leftColW = CW * 0.53 - 5;
  const rightColW = CW - leftColW - gap;
  const rightX = M + leftColW + gap;
  // Armado necesita más alto porque su bloque izquierdo ahora es una
  // mini-tabla de 4 filas (Tipo Pegado / Pegamento / Asa / Refuerzo-Base)
  // en vez de una sola línea de texto con "|". El resto de los procesos
  // usa alturaFilaProceso() para calcular su alto según cuántas líneas de
  // specs traigan (ver definición arriba).
  const rowHArmado = 21;
  // Impresión necesita alto fijo: 3 filas de checklist de máquina +
  // encabezado de pantones + 2 líneas (F/V), no depende de `datos.extra`
  // porque ahora usa su propio bloque bespoke (impresionBlockIzquierdo).
  const rowHImpresion = 26;
  // Laminación necesita alto fijo: 3 líneas de specs (Metros/Rollos,
  // Desarrollo, CTES/Mod) + número + tipo/bobina.
  const rowHLaminacion = 22;
  // Empaque: 2 casillas simples, sin specs extra.
  const rowHEmpaque = 11.5;
  // Hojeado/Guillotina: header (8.8mm) + cuadrícula 2x2 de celdas más
  // grandes (2 filas de ~8mm cada una para que quepa el valor en bold 9.5pt).
  const rowHPrep = 27;
  const rowGap = 1;

  // Rendimiento de hojeado/guillotina, usado únicamente para la fórmula
  // especial de Empaque (ver más abajo).
  const rendimientoPrep = n((data as any).rendimiento) ?? n((data as any).hoj_rendimiento);

  // Datos extra por proceso para bloqueProcesoSimple (UV/HS/Textura/AR/Suaje).
  // Igual que el resto del rediseño, se leen directo de la ficha/registro
  // en vez de reconstruirse desde `datos.extra` (que ya no se usa aquí).
  const extrasPorProceso = (key: NombreProcesoOrdenPapel, registro: ProcesoPapelRuntime | null): ExtraLabelValor[] => {
    const reg = (registro ?? {}) as Record<string, unknown>;
    switch (key) {
      case "hot_stamping_papel":
        return [{ label: "", value: primeraLinea(data.foil_nombre, data.foil) }].filter((e) => e.value);
      case "texturizado_papel":
        return [{ label: "Textura", value: primeraLinea(data.textura_nombre, data.textura) }].filter((e) => e.value);
      case "suaje_produccion_papel": {
        const suaje = primeraLinea(data.numero_suaje, data.suaje_nombre, data.suaje, reg.suaje_idsuaje_papel as any);
        // CORREGIDO: antes solo leía data.matrix (ficha). Se amplía la
        // cadena de respaldo — igual que ya se hace con "suaje" arriba —
        // para revisar también el registro y el nombre alterno de ficha,
        // ya que el dato puede venir capturado en cualquiera de esos
        // lugares según el flujo con el que se haya dado de alta/avanzado
        // el producto.
        const matrix = primeraLinea(reg.matrix as any, data.matrix, (data as any).matrix_nombre);
        const extras: ExtraLabelValor[] = [];
        if (suaje) extras.push({ label: "Suaje", value: suaje });
        if (matrix) extras.push({ label: "Matrix", value: matrix });
        return extras;
      }
      default:
        return [];
    }
  };

  let filaY = y;

  procesos.forEach((proceso, idx) => {
    const registro = obtenerRegistroProcesoPapel(data, proceso.key);
    const datos = datosProceso(proceso.key, data, registro);
    const extrasSimple = extrasPorProceso(proceso.key, registro);

    const alturaFila =
      proceso.key === "armado_papel" ? rowHArmado :
        proceso.key === "impresion_papel" ? rowHImpresion :
          proceso.key === "laminacion_papel" ? rowHLaminacion :
            proceso.key === "empaque_papel" ? rowHEmpaque :
              (proceso.key === "hojeado_papel" || proceso.key === "guillotina_papel") ? rowHPrep :
                (proceso.key === "barniz_uv_papel" || proceso.key === "hot_stamping_papel" ||
                  proceso.key === "texturizado_papel" || proceso.key === "alto_relieve_papel" ||
                  proceso.key === "suaje_produccion_papel") ? alturaBloqueSimple(extrasSimple) :
                  alturaFilaProceso(datos);
    const by = filaY;

    // ── Entrada encadenada ──────────────────────────────────────────
    // La entrada de ESTE proceso es SIEMPRE lo "Entregado" del proceso
    // ANTERIOR — EXCEPTO Hojeado/Guillotina, que son el primer proceso de
    // la cadena y no heredan de nadie: su entrada es la "Cantidad
    // Calculada" (cantidad pedida / rendimiento), ya resuelta en
    // datosProceso() como `datos.entrada`.
    let entradaNum: number | null = null;
    if (proceso.key === "hojeado_papel" || proceso.key === "guillotina_papel") {
      entradaNum = n(datos.entrada);
    } else if (idx > 0) {
      const anterior = procesos[idx - 1];
      const registroAnterior = obtenerRegistroProcesoPapel(data, anterior.key);
      entradaNum = obtenerCantidadEntregadaProceso(anterior.key, registroAnterior);
    }

    // ── Caso especial: Empaque ──────────────────────────────────────
    // Durante todos los procesos intermedios se trabaja con el resultado
    // de la DIVISIÓN del rendimiento (pliegos). Empaque es el único punto
    // donde ya se necesita el resultado REAL: se multiplica lo entregado
    // por Armado por el rendimiento, en vez de solo heredar el número tal
    // cual como hacen los demás procesos.
    if (proceso.key === "empaque_papel" && entradaNum !== null && rendimientoPrep !== null && rendimientoPrep > 0) {
      entradaNum = redondear(entradaNum * rendimientoPrep);
    }

    const entradaTexto = entradaNum !== null ? fmtNum(entradaNum) : "";

    if (proceso.key === "armado_papel") {
      armadoBlockIzquierdo(doc, proceso, data, registro, entradaTexto, M, by, leftColW, alturaFila);
    } else if (proceso.key === "impresion_papel") {
      impresionBlockIzquierdo(doc, proceso, data, registro, entradaTexto, M, by, leftColW, alturaFila);
    } else if (proceso.key === "laminacion_papel") {
      laminacionBlockIzquierdo(doc, proceso, data, registro, entradaTexto, M, by, leftColW, alturaFila);
    } else if (proceso.key === "empaque_papel") {
      empaqueBlockIzquierdo(doc, proceso, data, registro, M, by, leftColW, alturaFila);
    } else if (proceso.key === "hojeado_papel" || proceso.key === "guillotina_papel") {
      prepBlockIzquierdo(doc, proceso, data, registro, entradaTexto, M, by, leftColW, alturaFila);
    } else if (
      proceso.key === "barniz_uv_papel" || proceso.key === "hot_stamping_papel" ||
      proceso.key === "texturizado_papel" || proceso.key === "alto_relieve_papel" ||
      proceso.key === "suaje_produccion_papel"
    ) {
      bloqueProcesoSimple(doc, proceso, registro, entradaTexto, datos.unidad, extrasSimple, M, by, leftColW, alturaFila);
    } else {
      procesoBlockIzquierdo(doc, proceso, data, registro, datos, entradaTexto, M, by, leftColW, alturaFila);
    }
    procesoBlockDerecho(doc, proceso, registro, datos, entradaTexto, rightX, by, rightColW, alturaFila);

    filaY += alturaFila + rowGap;
  });

  y = filaY;

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