// src/components/papel/especiales/RutaProcesos.tsx
//
// Bloque 3 del diseño del cliente: "RUTA DE PROCESOS", en sus dos variantes:
//
//   · Órdenes independientes  → columnas de OP de inicio, conectores
//     punteados hacia el PUNTO DE UNIÓN, la OP DE UNIÓN y el recuadro
//     PRODUCTO TERMINADO, más la leyenda de colores y los tres paneles de
//     abajo (Resumen / Reglas / Notas).      [imagen 1 del cliente]
//
//   · Misma orden de producción → paleta lateral "Procesos disponibles" y
//     la cadena horizontal de tarjetas con Material principal / Máquina /
//     Observaciones, más la barra de totales.  [imagen 2 del cliente]
//
// Igual que el resto del módulo: solo se muestran datos que YA existen.
// Del mockup se omiten a propósito los folios de orden (OP-IN-001...), el
// "Tiempo estándar estimado" y el pie "Orden terminada": los folios los
// genera el motor de producción al emitir la orden (Fase 7) y los otros dos
// no tienen columna en la base.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import type {
  Acabados, CatItem, CatKey, Catalogs, ComponentePapel, ComponenteProceso,
  MaterialEntry, Suaje,
} from "../../../types/papel/papel.types";
import { newComponenteProceso } from "../../../types/papel/papel.types";
import {
  actualizarNotaProducto, crearNotaProducto, eliminarNotaProducto, fetchNotasProducto,
  fetchContenidoArchivo,
  type NotaProducto, type ProcesoCatOpcion,
} from "../../../services/papel/papel.service";
import { showConfirm } from "../../CustomConfirm";
import {
  T, Tarjeta, TituloSeccion, Boton, Selector, Entrada, Palomita,
  IconoProcesoCuadro, IcoAgarre, IcoBote, IcoLista, IcoFlecha, IcoPalomita,
  IlustracionCaja, paletaOP, colorProceso,
} from "./disenoEspeciales";
import {
  etiquetaComponente, indicePaleta, nombreMaterial,
  agregarOPC, eliminarOPC, cambiarPadre, destinosValidosPara,
} from "./MaterialesAsignacion";

// ═══════════════════════════════════════════════════════════════════════════
// PROCESO → CATÁLOGO DE MAQUINARIA
// ═══════════════════════════════════════════════════════════════════════════
// Espejo de CLAVE_MAQUINA_POR_TABLA en procesosPapel.controller.ts: se mapea
// por la columna `tabla` de proceso_cat (no por nombre), que es el mismo
// campo con el que el motor decide la máquina de un proceso real.
// OJO -- son DOS cosas distintas y antes se usaba una sola llave para ambas,
// que es de donde salía el bug (Jose, 2026-09-04): al cambiar la máquina de
// Hot Stamping se cambiaba también la de Alto Relieve.
//
//   · CATALOGO_MAQUINA_POR_TABLA = de qué lista se eligen las máquinas.
//     Hot Stamping y Alto Relieve comparten lista de verdad (cat_hs_ar):
//     son las mismas máquinas físicas.
//   · CLAVE_MAQUINA_POR_TABLA = en qué casilla se GUARDA lo elegido.
//     Aquí sí tienen que ser distintas, si no se pisan entre ellas.
//
// Hojeado/Guillotina siguen compartiendo casilla porque su catálogo trae
// `tipo_maquina` y el selector sabe cuál de los dos ids tocar; cat_hs_ar no
// tiene esa columna, así que ahí la única salida es separar la casilla.
const CATALOGO_MAQUINA_POR_TABLA: Record<string, CatKey> = {
  hojeado_papel: "hojeado_guillotina" as CatKey,
  guillotina_papel: "hojeado_guillotina" as CatKey,
  impresion_papel: "impresora" as CatKey,
  laminacion_papel: "laminado_maquina" as CatKey,
  barniz_uv_papel: "uv" as CatKey,
  hot_stamping_papel: "hs_ar" as CatKey,
  texturizado_papel: "texturizadora" as CatKey,
  alto_relieve_papel: "hs_ar" as CatKey,   // misma lista que Hot Stamping
  suaje_produccion_papel: "suaje_maquina" as CatKey,
  desbarbe_papel: "desbarbe" as CatKey,
  armado_papel: "armado" as CatKey,
  empaque_papel: "empaque_maquina" as CatKey,
  litolaminado_papel: "empalme" as CatKey,
};

const CLAVE_MAQUINA_POR_TABLA: Record<string, CatKey> = {
  hojeado_papel: "hojeado_guillotina" as CatKey,
  guillotina_papel: "hojeado_guillotina" as CatKey,
  impresion_papel: "impresora" as CatKey,
  laminacion_papel: "laminado_maquina" as CatKey,
  barniz_uv_papel: "uv" as CatKey,
  hot_stamping_papel: "hs_ar" as CatKey,
  texturizado_papel: "texturizadora" as CatKey,
  // Casilla PROPIA: guarda en maquinaria_alto_relieve (que ya existía en BD),
  // aunque las opciones salgan de cat_hs_ar.
  alto_relieve_papel: "alto_relieve_maquina" as CatKey,
  suaje_produccion_papel: "suaje_maquina" as CatKey,
  desbarbe_papel: "desbarbe" as CatKey,
  armado_papel: "armado" as CatKey,
  empaque_papel: "empaque_maquina" as CatKey,
  litolaminado_papel: "empalme" as CatKey,
  // pegado_papel y especial_papel NO tienen catálogo de máquina en BD
  // todavía (Fase 2): Pegado guarda "maquina" como texto libre capturado en
  // producción, no preseleccionable aquí; Especial nunca lleva máquina.
};

const TIPO_MAQUINA_POR_TABLA: Record<string, "hojeadora" | "guillotina"> = {
  hojeado_papel: "hojeadora",
  guillotina_papel: "guillotina",
};

// Nombres cortos para mostrar en "+ Agregar proceso" y en las tarjetas ya
// agregadas -- el catálogo (proceso_cat.nombre_proceso) trae "Empaque
// Papel", "Suaje Papel", etc., pero Jose los quiere igual que en
// Seguimiento: solo "Empaque", "Suaje", etc. Mismo texto que
// NOMBRES_PROCESO_PAPEL en seguimientoPapel.types.ts, para que no se vea
// distinto entre pantallas (Jose, 2026-09-03). A nivel de módulo porque
// varias funciones de este archivo (DetalleProceso, TarjetaOP,
// VistaMismaOrden, RutaProcesos) lo necesitan por igual.
const NOMBRE_PROCESO_CORTO: Record<string, string> = {
  hojeado_papel: "Hojeado",
  guillotina_papel: "Guillotina",
  impresion_papel: "Impresión",
  laminacion_papel: "Laminación",
  barniz_uv_papel: "Barniz UV",
  hot_stamping_papel: "Hot Stamping",
  texturizado_papel: "Texturizado",
  alto_relieve_papel: "Alto Relieve",
  litolaminado_papel: "Litolaminado",
  suaje_produccion_papel: "Suaje",
  desbarbe_papel: "Desbarbe",
  armado_papel: "Armado",
  especial_papel: "Especial",
  empaque_papel: "Empaque",
};

// Solo acorta el nombre cuando viene del catálogo (tabla reconocida) -- si
// algún día se agrega una tabla nueva sin mapear, o el nombre ya viene de
// un texto custom (procesoNombre editado a mano), se deja tal cual en vez
// de mostrar vacío o "undefined".
const nombreCortoProceso = (tabla: string | undefined | null, fallback: string): string =>
  (tabla && NOMBRE_PROCESO_CORTO[tabla]) || fallback;

// Numera las ocurrencias repetidas del mismo proceso dentro de UNA ruta
// (Jose, 2026-09-04): si Impresión va tres veces, sus tarjetas se leen
// "Impresión (1ª)", "(2ª)", "(3ª)" -- ese número es la `pasada` con la que
// después se registra en planta. Un proceso que aparece una sola vez NO se
// numera (devuelve cadena vacía), para no ensuciar la ruta normal.
//
// Devuelve un mapa por id de proceso, porque el número depende de la POSICIÓN
// en la ruta y esa cambia al arrastrar -- no se puede guardar en la tarjeta.
function etiquetasPasada(
  procesos: { id: number; idproceso_cat: number | null }[],
  catPorId: Map<number, ProcesoCatOpcion>,
): Map<number, string> {
  const tablaDe = (p: { idproceso_cat: number | null }): string =>
    (p.idproceso_cat != null ? catPorId.get(p.idproceso_cat)?.tabla : undefined) ?? "";

  const totalPorTabla = new Map<string, number>();
  procesos.forEach(p => {
    const t = tablaDe(p);
    totalPorTabla.set(t, (totalPorTabla.get(t) ?? 0) + 1);
  });

  const vistas = new Map<string, number>();
  const out = new Map<number, string>();
  procesos.forEach(p => {
    const t = tablaDe(p);
    const n = (vistas.get(t) ?? 0) + 1;
    vistas.set(t, n);
    out.set(p.id, (totalPorTabla.get(t) ?? 1) > 1 ? ` (${n}ª)` : "");
  });
  return out;
}

// ── Reordenar tarjetas con arrastre suave y soporte táctil ────────────────
// Jose (2026-09-04): el arrastre nativo de HTML5 se veía "cortado" (la tarjeta
// desaparecía y reaparecía de golpe) y en pantalla táctil de plano no jala.
// Esto lo reemplaza con Pointer Events, que son los mismos para mouse, dedo y
// lápiz, así que una sola implementación cubre los tres:
//
//   · la tarjeta tomada se levanta y SIGUE al dedo/cursor en tiempo real
//   · las demás se hacen a un lado con una transición suave, abriendo el hueco
//     donde va a caer -- no brincan al soltar
//   · si tocas y sueltas SIN mover, la tarjeta se queda SELECCIONADA; luego
//     tocas otra y se coloca ahí. Con el dedo eso es mucho más cómodo que
//     mantener el arrastre, y es lo que pidió Jose ("que se seleccione").
//
// `eje` es "y" para la lista vertical de las tarjetas de OP y "x" para la
// cadena horizontal de la vista "misma orden".
function useReordenar(
  ids: number[],
  eje: "x" | "y",
  mover: (idOrigen: number, idDestino: number) => void,
) {
  const [tomado, setTomado] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [delta, setDelta] = useState(0);
  const [destino, setDestino] = useState<number | null>(null);

  const nodos = useRef(new Map<number, HTMLElement>());
  const inicio = useRef(0);
  const medidas = useRef<{ centro: number; tam: number }[]>([]);
  const idxOrigen = useRef(-1);

  const registrar = (id: number) => (el: HTMLElement | null) => {
    if (el) nodos.current.set(id, el);
    else nodos.current.delete(id);
  };

  // Se mide UNA vez al tomar la tarjeta: durante el arrastre las posiciones
  // reales cambian (las demás se están corriendo), así que hay que decidir
  // contra la foto del inicio, no contra lo que se ve en ese instante.
  const medir = () => {
    medidas.current = ids.map(id => {
      const r = nodos.current.get(id)?.getBoundingClientRect();
      if (!r) return { centro: 0, tam: 0 };
      return eje === "y"
        ? { centro: r.top + r.height / 2, tam: r.height }
        : { centro: r.left + r.width / 2, tam: r.width };
    });
  };

  const coord = (e: React.PointerEvent) => (eje === "y" ? e.clientY : e.clientX);

  const alTomar = (id: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (tomado != null) {
      // Segundo toque en la MISMA tarjeta: se suelta. En OTRA: se coloca ahí.
      if (tomado === id) setTomado(null);
      else { mover(tomado, id); setTomado(null); }
      return;
    }
    idxOrigen.current = ids.indexOf(id);
    if (idxOrigen.current < 0) return;
    medir();
    inicio.current = coord(e);
    setTomado(id);
    setArrastrando(false);
    setDelta(0);
    setDestino(idxOrigen.current);
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* navegador viejo: se sigue sin captura */ }
  };

  const alMover = (e: React.PointerEvent) => {
    if (tomado == null || idxOrigen.current < 0) return;
    const d = coord(e) - inicio.current;
    // Umbral: menos de 5px es un toque, no un arrastre -- así un tap limpio
    // no se convierte en un micro-movimiento accidental.
    if (!arrastrando && Math.abs(d) < 5) return;
    if (!arrastrando) setArrastrando(true);
    setDelta(d);

    const m = medidas.current;
    const o = idxOrigen.current;
    const centroActual = (m[o]?.centro ?? 0) + d;
    let idx = o;
    for (let i = 0; i < m.length; i++) {
      if (i === o) continue;
      if (i < o && centroActual < m[i].centro) idx = Math.min(idx, i);
      if (i > o && centroActual > m[i].centro) idx = Math.max(idx, i);
    }
    setDestino(idx);
  };

  const alSoltar = () => {
    if (tomado == null) return;
    if (arrastrando) {
      const idDestino = destino != null ? ids[destino] : null;
      if (idDestino != null && idDestino !== tomado) mover(tomado, idDestino);
      setTomado(null);
    }
    // Si NO se arrastró, la tarjeta se queda seleccionada a propósito: es el
    // modo "toco esta, toco dónde va" para pantallas táctiles.
    setArrastrando(false);
    setDelta(0);
    setDestino(null);
  };

  const cancelar = () => {
    setTomado(null); setArrastrando(false); setDelta(0); setDestino(null);
  };

  // Handlers listos para poner en la tarjeta (o en el asa).
  const asaProps = (id: number) => ({
    onPointerDown: alTomar(id),
    onPointerMove: alMover,
    onPointerUp: alSoltar,
    onPointerCancel: cancelar,
  });

  const estilo = (id: number): React.CSSProperties => {
    const i = ids.indexOf(id);
    const esTomada = tomado === id;
    const o = idxOrigen.current;
    const tamOrigen = medidas.current[o]?.tam ?? 0;

    if (esTomada && arrastrando) {
      return {
        transform: `${eje === "y" ? `translateY(${delta}px)` : `translateX(${delta}px)`} scale(1.03)`,
        transition: "none",
        position: "relative", zIndex: 30,
        boxShadow: "0 14px 30px rgba(21,42,102,.24)",
        cursor: "grabbing", touchAction: "none", willChange: "transform",
      };
    }

    let corrimiento = 0;
    if (arrastrando && destino != null && o >= 0 && !esTomada) {
      if (i > o && i <= destino) corrimiento = -tamOrigen;
      else if (i < o && i >= destino) corrimiento = tamOrigen;
    }

    return {
      transform: corrimiento
        ? (eje === "y" ? `translateY(${corrimiento}px)` : `translateX(${corrimiento}px)`)
        : undefined,
      transition: "transform 190ms cubic-bezier(.2,.8,.3,1), box-shadow 160ms ease",
      position: esTomada ? "relative" : undefined,
      zIndex: esTomada ? 20 : undefined,
      boxShadow: esTomada ? "0 8px 20px rgba(21,42,102,.20)" : undefined,
      touchAction: "none", cursor: "grab",
    };
  };

  return { tomado, arrastrando, registrar, asaProps, estilo, cancelar };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
interface MaterialRef { id: number; etiqueta: string; }

const refsDeComponente = (materiales: MaterialEntry[], idComponente: number): MaterialRef[] =>
  materiales
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.idComponenteAsignado === idComponente)
    .map(({ m, i }) => ({ id: m.id, etiqueta: `${nombreMaterial(m)} (M${i + 1})` }));

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR LA RUTA COMO DIAGRAMA (SVG / PNG)
// ═══════════════════════════════════════════════════════════════════════════
// Jose (2026-09-04): poder sacar la ruta de flujo como archivo para abrirla en
// el navegador (o mandarla / imprimirla) sin tener que entrar al sistema.
//
// El SVG se arma a mano, sin librerías, y queda AUTOCONTENIDO: sin fuentes
// externas, sin imágenes ligadas, sin CSS de fuera. Eso importa por dos
// razones: se abre igual en cualquier navegador, y es lo que permite
// convertirlo a PNG con canvas sin que el navegador "manche" el lienzo y
// bloquee la exportación.

const escaparXml = (s: string): string =>
  String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const recortar = (s: string, max: number): string =>
  s.length <= max ? s : s.slice(0, Math.max(0, max - 1)).trimEnd() + "…";

// Una tarjeta del diagrama = una OP (de inicio, de unión, o la única).
// Es EL MISMO contenido que se ve en pantalla: encabezado con su nombre,
// descripción y material, y abajo la lista de procesos en orden.
interface ProcesoSvg {
  nombre: string;   // "Hojeado", "Impresión Papel"...
  pasada: string;   // "(2ª)" cuando el proceso se repite; "" si va una sola vez
  detalle: string;  // el mismo resumen de una línea que sale bajo el proceso
  color: string;    // color del cuadrito del proceso (colorProceso)
  // Los mismos campos que la tarjeta ancha de "misma orden" muestra por
  // separado en pantalla. En el modo con unión no se usan: ahí el detalle va
  // resumido en una sola línea y la información completa vive en las hojas
  // de abajo, porque las tarjetas de OP son angostas y no caben.
  materiales: string;
  maquina: string;
  observaciones: string;
}
interface TarjetaSvg {
  titulo: string;
  descripcion: string;
  material: string;
  procesos: ProcesoSvg[];
  paleta: { headBg: string; headText: string };
}
interface DiagramaSvg {
  nombreProducto: string;
  inicios: TarjetaSvg[];
  union: TarjetaSvg | null;
  unica: TarjetaSvg | null;
  // Foto del producto ya convertida a data URI (o null para usar el dibujo
  // predeterminado). Tiene que venir embebida, no como URL: si no, el archivo
  // deja de ser autocontenido.
  imagenProducto: string | null;
}

// Ancho aproximado de un carácter, para poder partir el texto en renglones
// sin poder medirlo de verdad (en un SVG que se arma como texto no hay canvas
// donde medir). Es una estimación conservadora para una tipografía sans.
const anchoCaracter = (fontSize: number) => fontSize * 0.53;

const partirTexto = (texto: string, anchoMax: number, fontSize: number, maxRenglones = 3): string[] => {
  const cw = anchoCaracter(fontSize);
  const porRenglon = Math.max(4, Math.floor(anchoMax / cw));
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  const renglones: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const tentativo = actual ? `${actual} ${palabra}` : palabra;
    if (tentativo.length <= porRenglon) { actual = tentativo; continue; }
    if (actual) renglones.push(actual);
    actual = palabra.length > porRenglon ? recortar(palabra, porRenglon) : palabra;
    if (renglones.length === maxRenglones) break;
  }
  if (actual && renglones.length < maxRenglones) renglones.push(actual);
  if (renglones.length === maxRenglones && palabras.length > 0) {
    const ultimo = renglones[maxRenglones - 1];
    const usadas = renglones.join(" ").split(/\s+/).length;
    if (usadas < palabras.length) renglones[maxRenglones - 1] = recortar(ultimo + " …", porRenglon);
  }
  return renglones.length > 0 ? renglones : [""];
};

// ── Medidas del diagrama (las mismas proporciones que la pantalla) ────────
const D = {
  PAD: 30,
  CARD_W: 206,       // igual que la tarjeta de OP en pantalla
  PUNTO_W: 150,
  PROD_W: 186,
  FILA_H: 34,        // alto de cada renglón de proceso
  FILA_GAP: 7,
  CUERPO_PAD: 9,
  GAP_CARDS: 22,     // separación vertical entre OP de inicio
  GAP_COL: 74,       // separación horizontal entre columnas del flujo
  GAP_PROD: 46,
};

// La descripción y el material se parten en renglones en vez de recortarse:
// "(usa las piezas de sus OP de inicio)" no cabe en uno solo y cortarlo dejaba
// un "(usa las piezas de sus OP de in…" que no dice nada.
const renglonesDescripcion = (t: TarjetaSvg): string[] =>
  t.descripcion ? partirTexto(t.descripcion, D.CARD_W - 22, 11, 2) : [];
const renglonesMaterial = (t: TarjetaSvg): string[] =>
  partirTexto(t.material, D.CARD_W - 22, 10.5, 2);

const altoEncabezadoTarjeta = (t: TarjetaSvg): number =>
  13 + 16 + renglonesDescripcion(t).length * 15 + renglonesMaterial(t).length * 14 + 11;

const altoCuerpoTarjeta = (t: TarjetaSvg): number =>
  t.procesos.length === 0
    ? D.CUERPO_PAD * 2 + 30
    : D.CUERPO_PAD * 2 + t.procesos.length * D.FILA_H + (t.procesos.length - 1) * D.FILA_GAP;

const altoTarjeta = (t: TarjetaSvg): number => altoEncabezadoTarjeta(t) + altoCuerpoTarjeta(t);

// Dibuja una tarjeta de OP tal cual se ve en pantalla.
function dibujarTarjeta(t: TarjetaSvg, x: number, y: number): string {
  const w = D.CARD_W;
  const hEnc = altoEncabezadoTarjeta(t);
  const h = altoTarjeta(t);
  const cx = x + w / 2;
  const partes: string[] = [];

  // Contenedor + encabezado de color (solo las esquinas de arriba redondeadas:
  // se logra pintando el encabezado redondeado y tapando su mitad de abajo).
  partes.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#FFFFFF" stroke="#E4E9F2"/>`,
    `<path d="M ${x} ${y + 12} a 12 12 0 0 1 12 -12 h ${w - 24} a 12 12 0 0 1 12 12 v ${hEnc - 12} h -${w} z" fill="${t.paleta.headBg}"/>`,
  );

  let ty = y + 13 + 12;
  partes.push(
    `<text x="${cx}" y="${ty}" text-anchor="middle" font-size="12.5" font-weight="700" letter-spacing="0.4" fill="${t.paleta.headText}">${escaparXml(recortar(t.titulo, 24))}</text>`
  );
  renglonesDescripcion(t).forEach(ln => {
    ty += 15;
    partes.push(`<text x="${cx}" y="${ty}" text-anchor="middle" font-size="11" fill="#4A66B4">${escaparXml(ln)}</text>`);
  });
  renglonesMaterial(t).forEach(ln => {
    ty += 14;
    partes.push(`<text x="${cx}" y="${ty}" text-anchor="middle" font-size="10.5" fill="#4A66B4">${escaparXml(ln)}</text>`);
  });

  // Cuerpo: los procesos, en orden, uno por renglón.
  let fy = y + hEnc + D.CUERPO_PAD;
  if (t.procesos.length === 0) {
    partes.push(
      `<rect x="${x + D.CUERPO_PAD}" y="${fy}" width="${w - D.CUERPO_PAD * 2}" height="30" rx="7" fill="#FEF3E2" stroke="#F7C182" stroke-dasharray="4 3"/>`,
      `<text x="${cx}" y="${fy + 19}" text-anchor="middle" font-size="10.5" fill="#C2710C">Esta orden todavía no tiene procesos.</text>`,
    );
  } else {
    t.procesos.forEach((p, i) => {
      const icoX = x + D.CUERPO_PAD + 9;
      partes.push(
        `<rect x="${x + D.CUERPO_PAD}" y="${fy}" width="${w - D.CUERPO_PAD * 2}" height="${D.FILA_H}" rx="9" fill="#FFFFFF" stroke="#EDF1F7"/>`,
        `<rect x="${icoX}" y="${fy + 6}" width="22" height="22" rx="6" fill="${p.color}"/>`,
        `<rect x="${icoX + 6}" y="${fy + 12}" width="10" height="10" rx="2" fill="#FFFFFF" opacity="0.9"/>`,
        `<text x="${icoX + 32}" y="${fy + 22}" font-size="11.5" font-weight="700" fill="#142E75">${escaparXml(recortar(`${i + 1}. ${p.nombre}`, 20))}` +
          (p.pasada ? `<tspan fill="#1D4ED8"> ${escaparXml(p.pasada)}</tspan>` : "") +
        `</text>`,
      );
      fy += D.FILA_H + D.FILA_GAP;
    });
  }
  return partes.join("\n");
}

// Medidas de la tarjeta "PRODUCTO TERMINADO", calcadas del componente
// ProductoTerminado que se ve en pantalla (encabezado naranja, cuerpo blanco,
// recuadro de 108 de alto, palomita de 34 y la leyenda de dos renglones).
const PROD = {
  HEAD_H: 58,
  PAD: 14,
  IMG_H: 108,
  GAP_PAL: 10,
  PAL: 34,
  GAP_TXT: 14,
  TXT_H: 34,
  BOTTOM: 16,
};
const ALTO_PRODUCTO =
  PROD.HEAD_H + PROD.PAD + PROD.IMG_H + PROD.GAP_PAL + PROD.PAL + PROD.GAP_TXT + PROD.TXT_H + PROD.BOTTOM;

// La misma ilustración de caja abierta que usa la pantalla (IlustracionCaja en
// disenoEspeciales.tsx): mismos trazos, mismo viewBox 128x112 dibujado a
// 112x98. Se copia aquí porque el SVG se arma como texto, no como JSX.
const ILUSTRACION_CAJA_PATHS = [
  `<path d="M18 56 L66 33 L62 5 Q36 13 12 29 Z"/>`,
  `<path d="M66 33 L110 54 L115 33 Q94 23 70 17 Z"/>`,
  `<path d="M18 56 L64 78 L110 54 L66 33 Z"/>`,
  `<path d="M18 56 L18 84 L64 106 L110 82 L110 54"/>`,
  `<path d="M64 78 L64 106"/>`,
  `<path d="M25 58 L66 41 L103 56" stroke-width="1.2" opacity="0.45"/>`,
].join("");

// Caja "PRODUCTO TERMINADO". Igual que en pantalla: si el producto tiene
// imagen se muestra esa foto, y si no, el dibujo predeterminado de la caja
// (Jose, 2026-09-04). La imagen entra como data URI para que el SVG siga
// siendo autocontenido -- si dependiera de una URL, ni se vería al abrir el
// archivo aparte ni se podría convertir a PNG.
function dibujarProductoTerminado(
  nombreProducto: string, imagenDataUri: string | null, x: number, y: number,
): string {
  const w = D.PROD_W;
  const cx = x + w / 2;
  const partes: string[] = [];
  const h = ALTO_PRODUCTO;

  // Tarjeta blanca con borde naranja + banda de encabezado naranja arriba.
  partes.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#FFFFFF" stroke="#F7C182" stroke-width="1.5"/>`,
    `<path d="M ${x} ${y + 12} a 12 12 0 0 1 12 -12 h ${w - 24} a 12 12 0 0 1 12 12 v ${PROD.HEAD_H - 12} h -${w} z" fill="#FEF3E2"/>`,
    `<text x="${cx}" y="${y + 24}" text-anchor="middle" font-size="12" font-weight="700" letter-spacing="0.4" fill="#C2710C">PRODUCTO TERMINADO</text>`,
  );
  partirTexto(nombreProducto || "(sin nombre)", w - 24, 11.5, 2).forEach((ln, i) =>
    partes.push(`<text x="${cx}" y="${y + 42 + i * 14}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#C2710C">${escaparXml(ln)}</text>`)
  );

  const imgX = x + PROD.PAD;
  const imgY = y + PROD.HEAD_H + PROD.PAD;
  const imgW = w - PROD.PAD * 2;

  if (imagenDataUri) {
    // Recorte redondeado + "slice" = el object-fit: cover de la pantalla.
    const idClip = `cp${Math.round(x)}_${Math.round(y)}`;
    partes.push(
      `<clipPath id="${idClip}"><rect x="${imgX}" y="${imgY}" width="${imgW}" height="${PROD.IMG_H}" rx="9"/></clipPath>`,
      `<rect x="${imgX}" y="${imgY}" width="${imgW}" height="${PROD.IMG_H}" rx="9" fill="#F6F8FC"/>`,
      `<image href="${escaparXml(imagenDataUri)}" xlink:href="${escaparXml(imagenDataUri)}" x="${imgX}" y="${imgY}" width="${imgW}" height="${PROD.IMG_H}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${idClip})"/>`,
      `<rect x="${imgX}" y="${imgY}" width="${imgW}" height="${PROD.IMG_H}" rx="9" fill="none" stroke="#E4E9F2"/>`,
    );
  } else {
    // Dibujo predeterminado, centrado en el mismo hueco de 108 de alto.
    const escala = 112 / 128;
    const tx = cx - 56;
    const ty = imgY + (PROD.IMG_H - 98) / 2;
    partes.push(
      `<g transform="translate(${tx} ${ty}) scale(${escala})" fill="none" stroke="#22377F" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${ILUSTRACION_CAJA_PATHS}</g>`
    );
  }

  // Palomita verde
  const palCy = imgY + PROD.IMG_H + PROD.GAP_PAL + PROD.PAL / 2;
  partes.push(
    `<circle cx="${cx}" cy="${palCy}" r="17" fill="#16A34A"/>`,
    `<path d="M ${cx - 7.5} ${palCy} l 5 5 l 10 -10" stroke="#FFFFFF" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  );

  const ty2 = palCy + PROD.PAL / 2 + PROD.GAP_TXT;
  partes.push(
    `<text x="${cx}" y="${ty2 + 6}" text-anchor="middle" font-size="12" font-weight="600" fill="#142E75">Listo para despacho</text>`,
    `<text x="${cx}" y="${ty2 + 23}" text-anchor="middle" font-size="12" font-weight="600" fill="#142E75">o entrega al cliente.</text>`,
  );

  return partes.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA ANCHA DE PROCESO — solo para "misma orden de producción"
// ═══════════════════════════════════════════════════════════════════════════
// Jose (2026-09-04): en ese modo la pantalla encadena los procesos de
// izquierda a derecha y cada tarjeta ya trae su información adentro
// (materiales, máquina, observaciones). Como son anchas, aquí SÍ cabe todo
// junto y no hace falta la sección de hojas de abajo -- esa existe solo
// porque las tarjetas de OP del modo con unión son angostas.
const PROC = { W: 210, PAD: 14, ICONO: 29, GAP_ICONO: 11, LINEA: 14 };

const anchoTextoProceso = PROC.W - PROC.PAD * 2;
const anchoTituloProceso = anchoTextoProceso - PROC.ICONO - PROC.GAP_ICONO;

// Los renglones se calculan una sola vez y se reutilizan para medir y para
// dibujar, así el alto y el contenido nunca se desincronizan.
function renglonesProceso(p: ProcesoSvg, indice: number) {
  return {
    titulo: partirTexto(`${indice + 1}. ${p.nombre}`, anchoTituloProceso, 12.5, 2),
    observaciones: p.observaciones ? partirTexto(p.observaciones, anchoTextoProceso, 11, 3) : [],
    materiales: partirTexto(p.materiales || "—", anchoTextoProceso, 11, 3),
    maquina: partirTexto(p.maquina || "—", anchoTextoProceso, 11, 2),
  };
}

function altoTarjetaProcesoAncha(p: ProcesoSvg, indice: number): number {
  const r = renglonesProceso(p, indice);
  let h = PROC.PAD;
  h += Math.max(PROC.ICONO, r.titulo.length * 16) + (p.pasada ? 13 : 0);
  if (r.observaciones.length) h += 6 + r.observaciones.length * PROC.LINEA;
  h += 14 + 13 + r.materiales.length * PROC.LINEA;   // separador + etiqueta + valor
  h += 12 + 13 + r.maquina.length * PROC.LINEA;
  return h + PROC.PAD;
}

function dibujarTarjetaProcesoAncha(p: ProcesoSvg, indice: number, x: number, y: number, alto: number): string {
  const r = renglonesProceso(p, indice);
  const partes: string[] = [
    `<rect x="${x}" y="${y}" width="${PROC.W}" height="${alto}" rx="12" fill="#FFFFFF" stroke="#E4E9F2"/>`,
    `<rect x="${x + PROC.PAD}" y="${y + PROC.PAD}" width="${PROC.ICONO}" height="${PROC.ICONO}" rx="8" fill="${p.color}"/>`,
    `<rect x="${x + PROC.PAD + 9}" y="${y + PROC.PAD + 9}" width="11" height="11" rx="2.5" fill="#FFFFFF" opacity="0.92"/>`,
  ];

  const tx = x + PROC.PAD + PROC.ICONO + PROC.GAP_ICONO;
  let ty = y + PROC.PAD + 14;
  r.titulo.forEach(ln => {
    partes.push(`<text x="${tx}" y="${ty}" font-size="12.5" font-weight="700" fill="#142E75">${escaparXml(ln)}</text>`);
    ty += 16;
  });
  if (p.pasada) {
    partes.push(`<text x="${tx}" y="${ty}" font-size="10.5" font-weight="700" fill="#1D4ED8">${escaparXml(p.pasada)}</text>`);
    ty += 13;
  }

  let cy = y + PROC.PAD + Math.max(PROC.ICONO, r.titulo.length * 16) + (p.pasada ? 13 : 0);
  if (r.observaciones.length) {
    cy += 6;
    r.observaciones.forEach(ln => {
      partes.push(`<text x="${x + PROC.PAD}" y="${cy + 10}" font-size="11" fill="#4A66B4">${escaparXml(ln)}</text>`);
      cy += PROC.LINEA;
    });
  }

  const bloque = (etiqueta: string, renglones: string[], separacion: number) => {
    cy += separacion;
    partes.push(`<text x="${x + PROC.PAD}" y="${cy + 4}" font-size="10" font-weight="600" fill="#7C8DB5">${escaparXml(etiqueta)}</text>`);
    cy += 13;
    renglones.forEach(ln => {
      partes.push(`<text x="${x + PROC.PAD}" y="${cy + 10}" font-size="11" font-weight="700" fill="#142E75">${escaparXml(ln)}</text>`);
      cy += PROC.LINEA;
    });
  };
  bloque("Materiales:", r.materiales, 14);
  bloque("Máquina:", r.maquina, 12);

  return partes.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// El SVG completo: arriba el diagrama tal cual se ve en pantalla, abajo una
// hoja por OP con la información capturada de cada proceso.
// ═══════════════════════════════════════════════════════════════════════════
function construirSvgRuta(d: DiagramaSvg): string {
  // "Misma orden de producción" tiene su propio dibujo: cadena horizontal de
  // tarjetas anchas, cada una con su información adentro.
  if (d.unica) return construirSvgMismaOrden(d, d.unica);
  return construirSvgConUnion(d);
}

function construirSvgMismaOrden(d: DiagramaSvg, comp: TarjetaSvg): string {
  const { PAD, PROD_W, GAP_PROD } = D;
  const TITULO_H = 62;
  const FLECHA = 46;
  const partes: string[] = [];

  const procesos = comp.procesos;
  const altoFila = procesos.length
    ? Math.max(...procesos.map((p, i) => altoTarjetaProcesoAncha(p, i)))
    : 120;

  const anchoCadena = procesos.length
    ? procesos.length * PROC.W + (procesos.length - 1) * FLECHA
    : 240;

  const altoDiagrama = Math.max(altoFila, ALTO_PRODUCTO);
  const cy = TITULO_H + altoDiagrama / 2;
  const xProd = PAD + anchoCadena + GAP_PROD;
  const W = xProd + PROD_W + PAD;
  const H = TITULO_H + altoDiagrama + PAD;

  partes.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Poppins, Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif">`,
    `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`,
    `<defs><marker id="flS" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
      `<path d="M 0 0 L 10 5 L 0 10 z" fill="#142E75"/></marker></defs>`,
    `<text x="${PAD}" y="30" font-size="17" font-weight="700" fill="#142E75">${escaparXml(recortar(d.nombreProducto || "Ruta de procesos", 70))}</text>`,
    `<text x="${PAD}" y="48" font-size="11" fill="#7C8DB5">Ruta de procesos · Misma orden de producción · ${escaparXml(recortar(comp.material.replace(/^\(|\)$/g, ""), 60))}</text>`,
  );

  if (procesos.length === 0) {
    partes.push(
      `<rect x="${PAD}" y="${cy - 26}" width="${anchoCadena}" height="52" rx="9" fill="#FEF3E2" stroke="#F7C182" stroke-dasharray="5 4"/>`,
      `<text x="${PAD + anchoCadena / 2}" y="${cy + 4}" text-anchor="middle" font-size="12" fill="#C2710C">Esta orden todavía no tiene procesos.</text>`,
    );
  } else {
    procesos.forEach((p, i) => {
      const x = PAD + i * (PROC.W + FLECHA);
      partes.push(dibujarTarjetaProcesoAncha(p, i, x, cy - altoFila / 2, altoFila));
      if (i < procesos.length - 1) {
        partes.push(`<line x1="${x + PROC.W + 10}" y1="${cy}" x2="${x + PROC.W + FLECHA - 10}" y2="${cy}" stroke="#142E75" stroke-width="1.8" marker-end="url(#flS)"/>`);
      }
    });
  }

  partes.push(
    `<line x1="${PAD + anchoCadena + 10}" y1="${cy}" x2="${xProd - 10}" y2="${cy}" stroke="#142E75" stroke-width="1.8" marker-end="url(#flS)"/>`,
    dibujarProductoTerminado(d.nombreProducto, d.imagenProducto, xProd, cy - ALTO_PRODUCTO / 2),
    `</svg>`,
  );
  return partes.join("\n");
}

function construirSvgConUnion(d: DiagramaSvg): string {
  const { PAD, CARD_W, PUNTO_W, PROD_W, GAP_CARDS, GAP_COL, GAP_PROD } = D;
  const TITULO_H = 56;
  const partes: string[] = [];

  const tarjetas: TarjetaSvg[] = d.unica
    ? [d.unica]
    : [...d.inicios, ...(d.union ? [d.union] : [])];

  // ── Geometría del diagrama ──────────────────────────────────────────────
  const hayUnion = !d.unica && d.union != null;
  const altosInicio = (d.unica ? [d.unica] : d.inicios).map(altoTarjeta);
  const altoColumna1 = altosInicio.reduce((a, b) => a + b, 0) + Math.max(0, altosInicio.length - 1) * GAP_CARDS;

  const xCol1 = PAD;
  const xPunto = xCol1 + CARD_W + GAP_COL;
  const xUnion = xPunto + PUNTO_W + GAP_COL;
  const xProd = hayUnion ? xUnion + CARD_W + GAP_PROD : xPunto;

  const altoUnion = d.union ? altoTarjeta(d.union) : 0;
  const ALTO_PROD = ALTO_PRODUCTO;
  const ALTO_PUNTO = 96;

  const altoDiagrama = Math.max(altoColumna1, altoUnion, ALTO_PROD, ALTO_PUNTO);
  const yDiag = TITULO_H;
  const cyDiag = yDiag + altoDiagrama / 2;
  const anchoDiagrama = (hayUnion ? xProd + PROD_W : xPunto + PROD_W) + PAD;

  // ── Geometría de la sección de información ──────────────────────────────
  const HOJA_W = 336;
  const HOJA_GAP = 26;
  const COL_INFO = 152;                       // dónde arranca la columna derecha
  const ANCHO_INFO = HOJA_W - COL_INFO - 14;
  const ANCHO_NOMBRE = COL_INFO - 25 - 8;
  const porFila = Math.min(3, Math.max(1, tarjetas.length));
  const anchoHojas = PAD * 2 + porFila * HOJA_W + (porFila - 1) * HOJA_GAP;

  // Alto de un renglón: manda el que ocupe más, el nombre del proceso o su
  // información -- los dos pueden partirse en varios renglones.
  const altoRenglon = (p: ProcesoSvg): number => Math.max(
    26,
    10 + Math.max(
      partirTexto(p.detalle || "Sin datos capturados", ANCHO_INFO, 10).length,
      partirTexto(p.nombre, ANCHO_NOMBRE, 10.5, 2).length + (p.pasada ? 1 : 0),
    ) * 13,
  );

  const altoHoja = (t: TarjetaSvg): number => {
    let alto = 34; // encabezado interno de la hoja (Proceso / Información)
    if (t.procesos.length === 0) return alto + 34;
    for (const p of t.procesos) alto += altoRenglon(p);
    return alto + 14;
  };

  const filasHojas: TarjetaSvg[][] = [];
  for (let i = 0; i < tarjetas.length; i += porFila) filasHojas.push(tarjetas.slice(i, i + porFila));
  const altosFila = filasHojas.map(f => Math.max(...f.map(altoHoja)) + 26); // + etiqueta de arriba
  const SEC2_TITULO_H = 54;
  const altoSeccion2 = tarjetas.length === 0 ? 0
    : SEC2_TITULO_H + altosFila.reduce((a, b) => a + b, 0) + (altosFila.length - 1) * 24;

  const W = Math.max(anchoDiagrama, anchoHojas, 720);
  const H = yDiag + altoDiagrama + 34 + altoSeccion2 + PAD;

  // ── Cabecera ────────────────────────────────────────────────────────────
  partes.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Poppins, Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif">`,
    `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`,
    `<defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
      `<path d="M 0 0 L 10 5 L 0 10 z" fill="#A9BADB"/></marker>` +
      `<marker id="flS" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
      `<path d="M 0 0 L 10 5 L 0 10 z" fill="#142E75"/></marker></defs>`,
    `<text x="${PAD}" y="32" font-size="17" font-weight="700" fill="#142E75">${escaparXml(recortar(d.nombreProducto || "Ruta de procesos", 70))}</text>`,
    `<text x="${PAD}" y="49" font-size="11" fill="#7C8DB5">Ruta de procesos del producto especial</text>`,
  );

  // ── Diagrama ────────────────────────────────────────────────────────────
  const centrosInicio: number[] = [];
  let yy = yDiag + (altoDiagrama - altoColumna1) / 2;
  (d.unica ? [d.unica] : d.inicios).forEach(t => {
    const h = altoTarjeta(t);
    partes.push(dibujarTarjeta(t, xCol1, yy));
    centrosInicio.push(yy + h / 2);
    yy += h + GAP_CARDS;
  });

  if (hayUnion && d.union) {
    // Llave de las OP de inicio hacia el punto de unión
    const bus = xCol1 + CARD_W + 37;
    const yBus1 = centrosInicio[0];
    const yBus2 = centrosInicio[centrosInicio.length - 1];
    partes.push(`<line x1="${bus}" y1="${yBus1}" x2="${bus}" y2="${yBus2}" stroke="#A9BADB" stroke-width="1.5" stroke-dasharray="5 4"/>`);
    centrosInicio.forEach(cy => {
      partes.push(`<line x1="${xCol1 + CARD_W}" y1="${cy}" x2="${bus}" y2="${cy}" stroke="#A9BADB" stroke-width="1.5" stroke-dasharray="5 4"/>`);
    });
    partes.push(`<line x1="${bus}" y1="${cyDiag}" x2="${xPunto - 4}" y2="${cyDiag}" stroke="#A9BADB" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#fl)"/>`);

    // Punto de unión
    const yPunto = cyDiag - ALTO_PUNTO / 2;
    const cxPunto = xPunto + PUNTO_W / 2;
    partes.push(
      `<rect x="${xPunto}" y="${yPunto}" width="${PUNTO_W}" height="${ALTO_PUNTO}" rx="11" fill="#E7F5EC" stroke="#9AD3B4"/>`,
      `<text x="${cxPunto}" y="${yPunto + 24}" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="0.4" fill="#15803D">PUNTO DE UNIÓN</text>`,
    );
    const nombresInicio = d.inicios.map(t => t.titulo).join(" y ");
    partirTexto(`Se unirán los resultados de ${nombresInicio}.`, PUNTO_W - 22, 10, 4)
      .forEach((ln, i) => partes.push(
        `<text x="${cxPunto}" y="${yPunto + 43 + i * 13}" text-anchor="middle" font-size="10" fill="#15803D">${escaparXml(ln)}</text>`
      ));

    partes.push(`<line x1="${xPunto + PUNTO_W}" y1="${cyDiag}" x2="${xUnion - 4}" y2="${cyDiag}" stroke="#A9BADB" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#fl)"/>`);

    // OP de unión
    partes.push(dibujarTarjeta(d.union, xUnion, cyDiag - altoUnion / 2));

    // Flecha sólida al producto terminado
    partes.push(`<line x1="${xUnion + CARD_W + 8}" y1="${cyDiag}" x2="${xProd - 8}" y2="${cyDiag}" stroke="#142E75" stroke-width="1.8" marker-end="url(#flS)"/>`);
    partes.push(dibujarProductoTerminado(d.nombreProducto, d.imagenProducto, xProd, cyDiag - ALTO_PROD / 2));
  } else {
    partes.push(`<line x1="${xCol1 + CARD_W + 8}" y1="${cyDiag}" x2="${xPunto - 8}" y2="${cyDiag}" stroke="#142E75" stroke-width="1.8" marker-end="url(#flS)"/>`);
    partes.push(dibujarProductoTerminado(d.nombreProducto, d.imagenProducto, xPunto, cyDiag - ALTO_PROD / 2));
  }

  // ── Sección 2: información de cada proceso ──────────────────────────────
  if (tarjetas.length > 0) {
    let ys = yDiag + altoDiagrama + 34;
    partes.push(
      `<line x1="${PAD}" y1="${ys}" x2="${W - PAD}" y2="${ys}" stroke="#E4E9F2" stroke-width="1"/>`,
      `<text x="${PAD}" y="${ys + 30}" font-size="14" font-weight="700" fill="#142E75">Información de los procesos</text>`,
      `<text x="${PAD}" y="${ys + 46}" font-size="10.5" fill="#7C8DB5">Lo capturado en cada proceso de la ruta, por orden de producción.</text>`,
    );
    ys += SEC2_TITULO_H;

    filasHojas.forEach((fila, fi) => {
      fila.forEach((t, ti) => {
        const hx = PAD + ti * (HOJA_W + HOJA_GAP);
        const hAlto = Math.max(...fila.map(altoHoja));

        // Etiqueta arriba de la hoja
        partes.push(
          `<text x="${hx + 2}" y="${ys + 13}" font-size="11.5" font-weight="700" fill="#142E75">${escaparXml(recortar(t.titulo, 30))}</text>`,
          `<text x="${hx + 2}" y="${ys + 26}" font-size="10" fill="#7C8DB5">${escaparXml(recortar(t.material, 42))}</text>`,
        );

        const hy = ys + 34;
        partes.push(`<rect x="${hx}" y="${hy}" width="${HOJA_W}" height="${hAlto}" rx="4" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.4"/>`);

        // Encabezado de columnas
        partes.push(
          `<text x="${hx + 12}" y="${hy + 22}" font-size="10" font-weight="700" letter-spacing="0.3" fill="#7C8DB5">PROCESO</text>`,
          `<text x="${hx + COL_INFO}" y="${hy + 22}" font-size="10" font-weight="700" letter-spacing="0.3" fill="#7C8DB5">INFORMACIÓN</text>`,
          `<line x1="${hx + 10}" y1="${hy + 30}" x2="${hx + HOJA_W - 10}" y2="${hy + 30}" stroke="#E4E9F2"/>`,
        );

        let fy = hy + 34;
        if (t.procesos.length === 0) {
          partes.push(`<text x="${hx + 12}" y="${fy + 18}" font-size="10.5" fill="#C2710C" font-style="italic">Sin procesos en la ruta.</text>`);
        } else {
          t.procesos.forEach((p, pi) => {
            const info = partirTexto(p.detalle || "Sin datos capturados", ANCHO_INFO, 10);
            const nombreLns = partirTexto(p.nombre, ANCHO_NOMBRE, 10.5, 2);
            const alto = altoRenglon(p);
            if (pi > 0) partes.push(`<line x1="${hx + 10}" y1="${fy}" x2="${hx + HOJA_W - 10}" y2="${fy}" stroke="#EDF1F7"/>`);
            partes.push(`<rect x="${hx + 12}" y="${fy + 6}" width="8" height="8" rx="2" fill="${p.color}"/>`);
            nombreLns.forEach((ln, li) => partes.push(
              `<text x="${hx + 25}" y="${fy + 14 + li * 12}" font-size="10.5" font-weight="700" fill="#142E75">${escaparXml(li === 0 ? `${pi + 1}. ${ln}` : ln)}</text>`
            ));
            if (p.pasada) {
              partes.push(`<text x="${hx + 25}" y="${fy + 14 + nombreLns.length * 12}" font-size="9.5" font-weight="700" fill="#1D4ED8">${escaparXml(p.pasada)}</text>`);
            }
            info.forEach((ln, li) => partes.push(
              `<text x="${hx + COL_INFO}" y="${fy + 14 + li * 13}" font-size="10" fill="#4A66B4">${escaparXml(ln)}</text>`
            ));
            fy += alto;
          });
        }
      });
      ys += altosFila[fi];
    });
  }

  partes.push(`</svg>`);
  return partes.join("\n");
}

// Dispara la descarga de un archivo en el navegador.
function descargarArchivo(contenido: Blob, nombre: string): void {
  const url = URL.createObjectURL(contenido);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera con retraso: si se revoca de inmediato, algunos navegadores
  // cancelan la descarga antes de haberla leído.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Lee una imagen y la devuelve como data URI acotado, lista para meterse
// dentro del SVG. Tiene que ir embebida y no como URL: si no, el archivo no se
// vería al abrirlo por su cuenta y en el paso a PNG el canvas quedaría
// "manchado" y el navegador bloquearía la exportación.
//
// Se repinta en un canvas en vez de copiar los bytes tal cual porque así se
// acota el tamaño: una foto de celular de 4000px metida entera como data URI
// dejaría un SVG de varios MB imposible de mandar por correo. Se limita el
// lado largo y se guarda como JPEG sobre fondo blanco (el mismo fondo que ya
// tiene el recuadro en la tarjeta; sin él, una imagen con transparencia
// quedaría en negro al pasar a JPEG).
//
// Solo sirve para URLs que el navegador SÍ deje leer: blob:, data: y el mismo
// origen. Contra una URL firmada de S3 devuelve null por CORS -- para esa está
// fetchContenidoArchivo, que pasa por la API.
const MAX_LADO_IMAGEN = 720;

function imagenAcotadaDesdeUrl(url: string): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    // Solo afecta a URLs de otro dominio; en blob:/data:/mismo origen es inocuo.
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const anchoNat = img.naturalWidth || img.width;
        const altoNat = img.naturalHeight || img.height;
        if (!anchoNat || !altoNat) { resolve(null); return; }
        const escala = Math.min(1, MAX_LADO_IMAGEN / Math.max(anchoNat, altoNat));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(anchoNat * escala));
        canvas.height = Math.max(1, Math.round(altoNat * escala));
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const salida = canvas.toDataURL("image/jpeg", 0.85);
        resolve(salida.startsWith("data:image/") ? salida : null);
      } catch {
        resolve(null);   // canvas "manchado": la imagen es de otro dominio sin CORS
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Mismo tratamiento, pero partiendo de los bytes que ya se tienen en mano.
async function blobAImagenAcotada(blob: Blob): Promise<string | null> {
  const url = URL.createObjectURL(blob);
  try {
    return await imagenAcotadaDesdeUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Convierte el SVG a PNG usando un canvas. `escala` 2 da una imagen nítida
// para pantalla e impresión sin volverse pesadísima.
function svgAPng(svg: string, escala = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const blobSvg = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blobSvg);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error("No se pudo crear el canvas")); return; }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error("No se pudo generar el PNG"))), "image/png");
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer el SVG")); };
    img.src = url;
  });
}

const refDeMaterial = (materiales: MaterialEntry[], id: number): string => {
  const i = materiales.findIndex(m => m.id === id);
  return i < 0 ? "—" : `${nombreMaterial(materiales[i])} (M${i + 1})`;
};

// Texto corto que va debajo del nombre del proceso en la vista de columnas:
// primero la máquina elegida, si no las observaciones, si no nada.
const detalleCorto = (
  proceso: ComponenteProceso, comp: ComponentePapel, cat: ProcesoCatOpcion | undefined, catalogs: Catalogs,
): string => {
  const clave = cat ? CLAVE_MAQUINA_POR_TABLA[cat.tabla] : undefined;
  if (clave) {
    // Los ids salen de la CASILLA; los nombres, de la LISTA (que para Alto
    // Relieve es la de Hot Stamping).
    const claveCat = (cat ? CATALOGO_MAQUINA_POR_TABLA[cat.tabla] : undefined) ?? clave;
    const ids = (comp.maquinaria[clave] ?? []) as number[];
    const items = (catalogs?.[claveCat] ?? []) as CatItem[];
    const nombres = ids.map(id => items.find(i => i.id === id)?.nombre).filter(Boolean) as string[];
    if (nombres.length > 0) return nombres.join(" · ");
  }
  return proceso.observaciones.trim();
};

// ═══════════════════════════════════════════════════════════════════════════
// SELECTOR DE MÁQUINA
// ═══════════════════════════════════════════════════════════════════════════
// El diseño (segunda imagen, recuadros "Offset" / "Laminado" / "Suaje")
// muestra desplegables simples por proceso. Se guarda en la maquinaria del
// COMPONENTE, con la misma clave que ya usa el backend, como arreglo de 0 o
// 1 elemento — el shape que papel.service.ts y el controlador ya esperan.
function SelectorMaquina({ clave, claveCatalogo, tipoMaquina, comp, catalogs, onCambiar }: {
  /** Casilla donde se guarda lo elegido (comp.maquinaria[clave]). */
  clave: CatKey;
  /** Lista de la que se elige. Casi siempre igual a `clave`; Alto Relieve es
   *  la excepción: guarda en su casilla pero lista de la de Hot Stamping. */
  claveCatalogo?: CatKey;
  tipoMaquina?: "hojeadora" | "guillotina";
  comp: ComponentePapel;
  catalogs: Catalogs;
  onCambiar: (patch: Record<string, number[] | string[]>) => void;
}) {
  const todos = (catalogs?.[claveCatalogo ?? clave] ?? []) as CatItem[];
  const items = tipoMaquina ? todos.filter(i => i.tipo_maquina === tipoMaquina) : todos;

  const idsActuales = (comp.maquinaria[clave] ?? []) as number[];
  const nombresActuales = (comp.maquinaria[`${clave}_nombres`] ?? []) as string[];

  // Hojeado y Guillotina comparten el arreglo hojeado_guillotina (hasta una
  // máquina de cada tipo), así que aquí solo se toca el id de ESTE tipo.
  const idDeEsteSelector = tipoMaquina
    ? idsActuales.find(id => todos.find(i => i.id === id)?.tipo_maquina === tipoMaquina) ?? null
    : idsActuales[0] ?? null;

  const elegir = (valor: string) => {
    const nuevoId = valor ? Number(valor) : null;
    const nuevoNombre = nuevoId != null ? items.find(i => i.id === nuevoId)?.nombre ?? "" : "";
    if (!tipoMaquina) {
      onCambiar({
        [clave]: nuevoId != null ? [nuevoId] : [],
        [`${clave}_nombres`]: nuevoId != null ? [nuevoNombre] : [],
      });
      return;
    }
    const pares = idsActuales.map((id, i) => ({ id, nombre: nombresActuales[i] ?? "" }));
    const sinEsteTipo = pares.filter(p => p.id !== idDeEsteSelector);
    const siguiente = nuevoId != null ? [...sinEsteTipo, { id: nuevoId, nombre: nuevoNombre }] : sinEsteTipo;
    onCambiar({
      [clave]: siguiente.map(p => p.id),
      [`${clave}_nombres`]: siguiente.map(p => p.nombre),
    });
  };

  return (
    <Selector value={idDeEsteSelector ?? ""} onChange={elegir} style={{ height: 36, fontSize: 12.5 }}>
      <option value="">Sin máquina</option>
      {items.map(i => (
        <option key={i.id} value={i.id}>
          {i.numero_maquina ? `${i.nombre} (${i.numero_maquina})` : i.nombre}
        </option>
      ))}
    </Selector>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPOS QUE PIDE CADA PROCESO
// ═══════════════════════════════════════════════════════════════════════════
// Sacados de lo que el generador de PDF de la orden de producción imprime
// en el bloque de cada proceso (generarPdfOrdenProduccionPapel.ts:
// bloqueHojeado, bloqueGuillotina, bloqueImpresion, bloqueLaminacion,
// bloqueArmado, bloqueEmpaque y extrasPorProceso). Aquí se capturan a nivel
// COMPONENTE, que es justo lo que la Fase 1 habilitó al meter
// idcomponente_papel en suaje_papel / acabados_papel / las 12 tablas de
// maquinaria: cada orden de un producto especial lleva su propia ficha.
//
// Hojeado y Guillotina son la excepción: sus datos (bobina, corte, hilo,
// pliego, rendimiento) viven en el MATERIAL, no en el componente, porque
// describen cómo se prepara ese papel en concreto — por eso esos dos
// procesos editan el material asignado a la orden.
//
// Lo que el PDF imprime pero NO se captura aquí, porque no existe a nivel
// producto sino a nivel pedido (viene de la cotización): tintas y pantones
// de Impresión, el foil de Hot Stamping y la textura de Texturizado. En esos
// tres se muestra una nota en vez de inventar campos.

const bloqueCampos: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9,
};

const lbl: React.CSSProperties = {
  display: "block", fontSize: 10.5, fontWeight: 700, color: T.muted,
  letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 5,
};

const nota: React.CSSProperties = {
  margin: 0, fontSize: 11, color: T.inkSoft, background: "#F7F9FC",
  border: `1px dashed ${T.border}`, borderRadius: 7, padding: "7px 9px", lineHeight: 1.5,
};

function CampoTxt({ etiqueta, valor, onChange, ancho }: {
  etiqueta: string; valor: string; onChange: (v: string) => void; ancho?: boolean;
}) {
  return (
    <div style={ancho ? { gridColumn: "span 2" } : undefined}>
      <span style={lbl}>{etiqueta}</span>
      <Entrada value={valor} onChange={onChange} style={{ height: 34, fontSize: 12.5 }} />
    </div>
  );
}

// onAdd opcional: mismo hook (useCatalogosPapel().addItem) que ya usa
// CampoCatMulti — Jose pidió que TODOS los desplegables de la ruta puedan
// dar de alta una opción nueva sin salir del formulario, igual que en el
// alta normal de papel/plástico. Aquí es de un solo valor, así que el
// patrón es más simple: un botón "+" junto al selector que abre un input
// inline en vez del dropdown propio de CampoCatMulti.
function CampoCat({ etiqueta, clave, catalogs, valor, onChange, onAdd, ancho }: {
  etiqueta: string; clave: string; catalogs: Catalogs;
  valor: number | null; onChange: (id: number | null, nombre: string) => void;
  onAdd?: (key: CatKey, nombre: string) => Promise<unknown>;
  ancho?: boolean;
}) {
  const items = ((catalogs as unknown as Record<string, CatItem[]>)[clave] ?? []) as CatItem[];
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);

  const handleAdd = async () => {
    const t = newVal.trim();
    if (!t || !onAdd) return;
    setSaving(true);
    try { await onAdd(clave as CatKey, t); setNewVal(""); setAdding(false); }
    finally { setSaving(false); }
  };

  return (
    <div style={ancho ? { gridColumn: "span 2" } : undefined}>
      <span style={lbl}>{etiqueta}</span>
      {adding ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            ref={addRef} type="text" value={newVal} onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewVal(""); } }}
            placeholder={`Nueva opción de "${etiqueta}"`}
            style={{ flex: 1, height: 34, padding: "0 8px", border: `1px solid ${T.primary}`, borderRadius: 5, fontSize: 12.5, outline: "none", color: "#111827", boxSizing: "border-box" }}
          />
          <button type="button" onClick={handleAdd} disabled={saving}
            style={{ height: 34, padding: "0 8px", background: T.primary, border: "none", borderRadius: 5, cursor: saving ? "wait" : "pointer", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {saving ? "..." : "OK"}
          </button>
          <button type="button" onClick={() => { setAdding(false); setNewVal(""); }}
            style={{ height: 34, padding: "0 8px", background: "#F3F4F6", border: "none", borderRadius: 5, cursor: "pointer", color: "#6B7280", fontSize: 13, flexShrink: 0 }}>
            X
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 4 }}>
          <Selector
            value={valor ?? ""}
            onChange={v => {
              const it = items.find(i => String(i.id) === v);
              onChange(it?.id ?? null, it?.nombre ?? "");
            }}
            style={{ height: 34, fontSize: 12.5, flex: 1 }}
          >
            <option value="">—</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </Selector>
          {onAdd && (
            <button type="button" onClick={() => setAdding(true)} title={`Agregar nueva opción a "${etiqueta}"`}
              style={{ height: 34, width: 30, flexShrink: 0, background: "#F3F4F6", border: `1px solid ${T.border}`, borderRadius: 5, cursor: "pointer", color: T.primary, fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
              +
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CampoCheck({ etiqueta, valor, onChange }: {
  etiqueta: string; valor: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label style={{
      gridColumn: "span 2", display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
      fontSize: 12, fontWeight: 600, color: valor ? T.primary : T.inkStrong,
    }}>
      <input type="checkbox" checked={valor} onChange={e => onChange(e.target.checked)}
        style={{ width: 15, height: 15, accentColor: T.primary, cursor: "pointer" }} />
      {etiqueta}
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPO CAT — MULTISELECCIÓN (mismo patrón que AsaMultiSelect en el alta
// normal de papel — FormularioProductoPapelAlta.tsx): checkboxes, "seleccionar
// todo" y alta de opción nueva sin salir del campo.
// ═══════════════════════════════════════════════════════════════════════════
function CampoCatMulti({ etiqueta, clave, catalogs, selectedIds, selectedNames, onChange, onAdd, ancho }: {
  etiqueta: string; clave: CatKey; catalogs: Catalogs;
  selectedIds: number[]; selectedNames: string[];
  onChange: (ids: number[], nombres: string[]) => void;
  onAdd?: (key: CatKey, nombre: string) => Promise<unknown>;
  ancho?: boolean;
}) {
  const catItems = ((catalogs as unknown as Record<string, CatItem[]>)[clave] ?? []) as CatItem[];
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAdding(false); setNewVal(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);

  const toggle = (item: CatItem) => {
    const existe = selectedIds.includes(item.id);
    onChange(
      existe ? selectedIds.filter(i => i !== item.id) : [...selectedIds, item.id],
      existe ? selectedNames.filter(n => n !== item.nombre) : [...selectedNames, item.nombre],
    );
  };

  const handleAdd = async () => {
    const t = newVal.trim();
    if (!t || !onAdd) return;
    setSaving(true);
    try { await onAdd(clave, t); setNewVal(""); setAdding(false); }
    finally { setSaving(false); }
  };

  const todosSeleccionados = catItems.length > 0 && catItems.every(item => selectedIds.includes(item.id));
  const handleToggleTodos = () => {
    if (todosSeleccionados) onChange([], []);
    else onChange(catItems.map(i => i.id), catItems.map(i => i.nombre));
  };

  return (
    // minWidth: 0 es necesario porque este div es un item de un grid de
    // columnas "1fr 1fr" (bloqueCampos): por default un grid item no se
    // encoge más allá del min-content de su contenido, y el texto acumulado
    // de selectedNames.join(", ") con whiteSpace:"nowrap" puede ser muy
    // largo -- sin esto la columna crecía para caber todo el texto y el
    // "..." (textOverflow: ellipsis) del botón nunca se activaba (Jose,
    // 2026-09-02: "cuando se puedan seleccionar multiples productos se
    // vayan acumulando, pero cuando la celda sea sobrepasada coloca solo
    // '...'").
    <div ref={ref} style={{ position: "relative", minWidth: 0, ...(ancho ? { gridColumn: "span 2" } : {}) }}>
      <span style={lbl}>{etiqueta}</span>
      <button type="button" onClick={() => { setOpen(!open); setAdding(false); }}
        style={{
          width: "100%", height: 34, padding: "0 8px", border: `1px solid ${T.border}`, borderRadius: 5,
          fontSize: 12.5, color: selectedIds.length ? T.inkStrong : T.muted, background: "#fff", outline: "none",
          cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
          boxSizing: "border-box", overflow: "hidden", minWidth: 0,
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
          {selectedIds.length === 0 ? "—" : selectedNames.join(", ")}
        </span>
        <span style={{ fontSize: 11, color: T.muted, flexShrink: 0, marginLeft: 4, userSelect: "none" }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 3px)", left: 0, background: "#fff",
          // Autoajustable: crece con el nombre más largo del catálogo (hasta
          // un tope razonable) en vez de quedarse pegado al ancho angosto
          // del campo que lo dispara.
          width: "max-content", minWidth: "100%", maxWidth: "min(320px, 90vw)",
          border: `1px solid ${T.border}`, borderRadius: 6, zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          padding: "4px 0", maxHeight: 220, overflowY: "auto", overflowX: "auto",
        }}>
          {catItems.length > 0 && (
            <div style={{ borderBottom: "1px solid #F3F4F6", padding: "3px 8px 5px" }}>
              <button type="button" onClick={handleToggleTodos}
                style={{ width: "100%", padding: "3px 4px", border: "none", background: "transparent", color: todosSeleccionados ? T.danger : "#374151", fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: 600 }}>
                {todosSeleccionados ? "✕ Deseleccionar todo" : "✓ Seleccionar todo"}
              </button>
            </div>
          )}
          {catItems.map(item => (
            <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#111827", whiteSpace: "nowrap", background: selectedIds.includes(item.id) ? "#EFF6FF" : "transparent" }}>
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item)} style={{ width: 14, height: 14, accentColor: T.primary, cursor: "pointer", flexShrink: 0 }} />
              {item.nombre}
            </label>
          ))}
          {onAdd && (
            <div style={{ borderTop: "1px solid #F3F4F6", marginTop: 2, paddingTop: 2 }}>
              {adding ? (
                <div style={{ display: "flex", gap: 4, padding: "5px 8px", alignItems: "center" }}>
                  <input ref={addRef} type="text" value={newVal} onChange={e => setNewVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewVal(""); } }}
                    style={{ flex: 1, height: 28, padding: "0 8px", border: `1px solid ${T.primary}`, borderRadius: 4, fontSize: 12, outline: "none", color: "#111827" }} />
                  <button onClick={handleAdd} disabled={saving} style={{ height: 28, padding: "0 8px", background: T.primary, border: "none", borderRadius: 4, cursor: saving ? "wait" : "pointer", color: "#fff", fontSize: 12, fontWeight: 700 }}>{saving ? "..." : "OK"}</button>
                  <button onClick={() => { setAdding(false); setNewVal(""); }} style={{ height: 28, padding: "0 6px", background: "#F3F4F6", border: "none", borderRadius: 4, cursor: "pointer", color: "#6B7280", fontSize: 13 }}>X</button>
                </div>
              ) : (
                <button type="button" onClick={() => setAdding(true)}
                  style={{ width: "100%", padding: "6px 12px", border: "none", background: "transparent", color: T.primary, fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: 600 }}>
                  + Agregar nuevo...
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE EXPANDIBLE DE UN PROCESO
// ═══════════════════════════════════════════════════════════════════════════
function DetalleProceso({
  proceso, comp, cat, catalogs, materiales, procesosCat, onProceso, onMaquinaria, onComp, onMaterial,
  tamanoAsaDefault, onTamanoAsaDefaultChange, addItem,
}: {
  proceso: ComponenteProceso;
  comp: ComponentePapel;
  cat: ProcesoCatOpcion | undefined;
  catalogs: Catalogs;
  materiales: MaterialEntry[];
  procesosCat: ProcesoCatOpcion[];
  onProceso: (patch: Partial<ComponenteProceso>) => void;
  onMaquinaria: (patch: Record<string, number[] | string[]>) => void;
  onComp: (patch: Partial<ComponentePapel>) => void;
  onMaterial: (id: number, patch: Partial<MaterialEntry>) => void;
  tamanoAsaDefault: string;
  onTamanoAsaDefaultChange: (v: string) => void;
  addItem?: (key: CatKey, nombre: string) => Promise<unknown>;
}) {
  const tabla = cat?.tabla ?? "";
  const clave = CLAVE_MAQUINA_POR_TABLA[tabla];
  const claveCatalogo = CATALOGO_MAQUINA_POR_TABLA[tabla] ?? clave;
  const tipoMaquina = TIPO_MAQUINA_POR_TABLA[tabla];
  const refs = refsDeComponente(materiales, comp.id);

  const suaje = (patch: Partial<Suaje>) => onComp({ suaje: { ...comp.suaje, ...patch } });
  const acab = (patch: Partial<Acabados>) => onComp({ acabados: { ...comp.acabados, ...patch } });

  // Material sobre el que trabaja este proceso: el que tenga marcado, o el
  // único asignado a la orden si no hay marca.
  const idMat = proceso.materiales[0] ?? refs[0]?.id ?? null;
  const mat = idMat != null ? materiales.find(m => m.id === idMat) ?? null : null;
  const hoj = (patch: Partial<MaterialEntry["hojeado"]>) => {
    if (!mat) return;
    onMaterial(mat.id, { hojeado: { ...mat.hojeado, ...patch } });
  };

  const especificos = () => {
    switch (tabla) {
      case "hojeado_papel": {
        if (!mat) return <p style={nota}>Asigna un material a esta orden para capturar los datos del hojeado.</p>;
        // Hojeado y Guillotina son excluyentes en "+ Agregar proceso" (se
        // filtran según el método de preparación del material — Jose), pero
        // a veces un mismo material hojeado también necesita pasar por
        // guillotina después. En vez de que el usuario tenga que forzar esa
        // segunda tarjeta, este checkbox la agrega/quita automáticamente
        // justo después de este proceso, ligada al mismo material.
        const catGuillotina = procesosCat.find(p => p.tabla === "guillotina_papel");
        const ligado = comp.procesos.find(p => {
          if (p.id === proceso.id || p.idproceso_cat == null) return false;
          return procesosCat.find(c => c.idproceso_cat === p.idproceso_cat)?.tabla === "guillotina_papel";
        }) ?? null;
        const ligarGuillotina = (activar: boolean) => {
          if (activar) {
            if (ligado || !catGuillotina) return;
            const i = comp.procesos.findIndex(p => p.id === proceso.id);
            const nuevo: ComponenteProceso = {
              ...newComponenteProceso(),
              idproceso_cat: catGuillotina.idproceso_cat,
              procesoNombre: nombreCortoProceso(catGuillotina.tabla, catGuillotina.nombre_proceso),
              materiales: [...proceso.materiales],
            };
            const copia = [...comp.procesos];
            copia.splice(i + 1, 0, nuevo);
            onComp({ procesos: copia.map((p, j) => ({ ...p, orden: j + 1 })) });
          } else {
            if (!ligado) return;
            onComp({ procesos: comp.procesos.filter(p => p.id !== ligado.id).map((p, j) => ({ ...p, orden: j + 1 })) });
          }
        };
        return (
          <>
            <div style={bloqueCampos}>
              <CampoTxt etiqueta="Bobina (cm)" valor={mat.hojeado.bobina} onChange={v => hoj({ bobina: v })} />
              <CampoTxt etiqueta="Corte (cm)" valor={mat.hojeado.corte} onChange={v => hoj({ corte: v })} />
              <CampoTxt etiqueta="Rendimiento" valor={mat.hojeado.rendimiento} onChange={v => hoj({ rendimiento: v })} />
            </div>
            <div style={bloqueCampos}>
              <CampoCheck etiqueta="Lleva guillotina" valor={!!ligado} onChange={ligarGuillotina} />
            </div>
            {ligado && (
              <p style={nota}>Se agregó "Guillotina" a la ruta justo después de este proceso, con el mismo material.</p>
            )}
            {!catGuillotina && (
              <p style={nota}>No se encontró "Guillotina" en el catálogo de procesos.</p>
            )}
          </>
        );
      }

      case "guillotina_papel":
        if (!mat) return <p style={nota}>Asigna un material a esta orden para capturar los datos de la guillotina.</p>;
        return (
          <div style={bloqueCampos}>
            <CampoTxt etiqueta="Pliego" valor={mat.pliego} onChange={v => onMaterial(mat.id, { pliego: v })} />
            <CampoTxt etiqueta="Rendimiento" valor={mat.rendimiento} onChange={v => onMaterial(mat.id, { rendimiento: v })} />
            <CampoTxt etiqueta="Corte (cm)" valor={mat.corte} onChange={v => onMaterial(mat.id, { corte: v })} ancho />
          </div>
        );

      case "impresion_papel":
        return <p style={nota}>Las tintas y los pantones se capturan al levantar el pedido, no aquí: cambian de un pedido a otro aunque el producto sea el mismo.</p>;

      case "laminacion_papel":
        // "Medida" es el tamaño del asa (producto_papel.tamano_asa_default,
        // ya existe en la base) -- se captura aquí porque es donde tiene
        // sentido para Jose, aunque es un dato del producto, no del
        // componente. El tipo/color de Laminado sí se captura aquí, con
        // multiselección -- igual que en el alta normal de papel.
        return (
          <div style={bloqueCampos}>
            <CampoCatMulti
              etiqueta="Laminado" clave={"laminado" as CatKey} catalogs={catalogs}
              selectedIds={comp.acabados.laminados} selectedNames={comp.acabados.laminadosNombres}
              onChange={(ids, nombres) => acab({ laminados: ids, laminadosNombres: nombres })}
              onAdd={addItem}
              ancho
            />
            <CampoCat
              etiqueta="Rollo de laminado" clave="rollo_lam" catalogs={catalogs}
              valor={comp.acabados.idrollo_lam}
              onChange={(id, nombre) => acab({ idrollo_lam: id, rolloLamNombre: nombre })}
            onAdd={addItem}
            />
            <CampoTxt
              etiqueta="Desarrollo de laminado (cm)" valor={comp.acabados.desarrolloLaminado}
              onChange={v => acab({ desarrolloLaminado: v.replace(/[^0-9.]/g, "") })} ancho
            />
            <CampoTxt
              etiqueta="Medida (tamaño de asa)" valor={tamanoAsaDefault}
              onChange={onTamanoAsaDefaultChange}
            />
          </div>
        );

      // Estos cuatro ya no preguntan "¿lleva X?" con checkbox: que el proceso
      // esté en la ruta ya significa que sí lo lleva (Jose) -- el sí/no de
      // verdad se pregunta al levantar el pedido (HS, textura, foil, etc.),
      // no aquí en el alta. El flag que espera el backend (lleva_uv, etc.)
      // se pone en true solo con agregar el proceso -- ver agregarProceso.
      case "barniz_uv_papel":
        return <p style={nota}>Al llevar este proceso en la ruta, el producto queda marcado con barniz UV.</p>;

      case "hot_stamping_papel":
        return <p style={nota}>Al llevar este proceso en la ruta, el producto queda marcado con hot stamping. El foil se elige al levantar el pedido: el mismo producto puede pedirse con foils distintos.</p>;

      case "texturizado_papel":
        return <p style={nota}>Al llevar este proceso en la ruta, el producto queda marcado con textura. La textura concreta se elige al levantar el pedido.</p>;

      case "alto_relieve_papel":
        return <p style={nota}>Al llevar este proceso en la ruta, el producto queda marcado con alto relieve.</p>;

      // Solo tres datos (Jose): el suaje, sus piezas y el matrix. El resto
      // de columnas de suaje_papel (tamaño, mm, tiempo de arreglo,
      // sacabocados, perforado) siguen existiendo en la base y las sigue
      // capturando el alta normal de papel; en un producto especial no se
      // piden.
      case "suaje_produccion_papel":
        return (
          <div style={bloqueCampos}>
            <CampoTxt etiqueta="Suaje" valor={comp.suaje.numero} onChange={v => suaje({ numero: v })} />
            <CampoTxt etiqueta="Piezas (PZS)" valor={comp.suaje.pzs} onChange={v => suaje({ pzs: v })} />
            <CampoCat
              etiqueta="Matrix" clave="matrix" catalogs={catalogs}
              valor={comp.suaje.idcat_matrix}
              onChange={(id, nombre) => suaje({ idcat_matrix: id, matrix: nombre })}
              ancho
            onAdd={addItem}
            />
          </div>
        );

      // REVERTIDO (Jose, 2026-09-03): Pegado y Empaque resultaron ser el
      // mismo proceso en la práctica, así que Pegado se quitó del catálogo
      // seleccionable (ver getProcesosCat en producto_papel.controller.ts y
      // ORDEN_CANONICO_TABLAS arriba) -- ya no se puede agregar a una ruta
      // nueva. Este "case" se deja SOLO para no tronar si una orden vieja ya
      // lo tenía capturado desde antes de este cambio (Fase 2, 2026-09-02);
      // "qué se pega" ahora se captura directo en Armado, ver más abajo.
      case "pegado_papel":
        return (
          <div style={bloqueCampos}>
            <CampoCat
              etiqueta="Tipo de pegado" clave="tipo_pegado" catalogs={catalogs}
              valor={comp.acabados.idcat_tipo_pegado_pegado}
              onChange={id => acab({ idcat_tipo_pegado_pegado: id })}
              onAdd={addItem}
            />
            <CampoTxt
              etiqueta="Qué se pega" valor={comp.acabados.queSePega}
              onChange={v => acab({ queSePega: v })}
              ancho
            />
          </div>
        );

      case "armado_papel":
        return (
          <div style={bloqueCampos}>
            <CampoCat
              etiqueta="Tipo de pegado" clave="tipo_pegado" catalogs={catalogs}
              valor={comp.acabados.idcat_tipo_pegado}
              onChange={id => acab({ idcat_tipo_pegado: id })}
            onAdd={addItem}
            />
            <CampoCat
              etiqueta="Pegamento" clave="pegamento" catalogs={catalogs}
              valor={comp.acabados.idcat_pegamento}
              onChange={id => acab({ idcat_pegamento: id })}
            onAdd={addItem}
            />
            {/* Jose, 2026-09-03: Pegado se quitó como proceso aparte (era lo
                mismo que Empaque) -- lo único que valía la pena conservar de
                ahí, "qué se pega", se captura aquí, opcional. */}
            <CampoTxt
              etiqueta="Qué se pega (opcional)" valor={comp.acabados.queSePega}
              onChange={v => acab({ queSePega: v })}
              ancho
            />
            <CampoCatMulti
              etiqueta="Asa" clave={"tipo_asa" as CatKey} catalogs={catalogs}
              selectedIds={comp.acabados.asas} selectedNames={comp.acabados.asasNombres}
              onChange={(ids, nombres) => acab({ asas: ids, asasNombres: nombres })}
              onAdd={addItem}
            />
            <CampoCat
              etiqueta="Refuerzo — material" clave="refuerzo_material" catalogs={catalogs}
              valor={comp.acabados.idcat_refuerzo_material}
              onChange={id => acab({ idcat_refuerzo_material: id })}
            onAdd={addItem}
            />
            <CampoCat
              etiqueta="Refuerzo — medida" clave="refuerzo_medidas" catalogs={catalogs}
              valor={comp.acabados.idcat_refuerzo_medidas}
              onChange={(id, nombre) => acab({ idcat_refuerzo_medidas: id, refuerzoMedidaNombre: nombre })}
            onAdd={addItem}
            />
            <CampoCat
              etiqueta="Base — material" clave="refuerzo_material" catalogs={catalogs}
              valor={comp.acabados.idcat_base_material}
              onChange={id => acab({ idcat_base_material: id })}
            onAdd={addItem}
            />
            <div style={{ gridColumn: "span 2" }}>
              <span style={lbl}>Base — medida (automática)</span>
              <Entrada value={comp.acabados.base_medida} readOnly style={{ height: 34, fontSize: 12.5 }} />
              <span style={{ display: "block", fontSize: 10.5, color: T.muted, marginTop: 4, lineHeight: 1.5 }}>
                Se calcula del ancho y el fuelle del producto, restando 0.5 a cada uno.
              </span>
            </div>
          </div>
        );

      case "empaque_papel":
        return (
          <div style={bloqueCampos}>
            <CampoCat
              etiqueta="Tipo de empaque" clave="empaque" catalogs={catalogs}
              valor={comp.acabados.idcat_empaque}
              onChange={id => acab({ idcat_empaque: id })}
            onAdd={addItem}
            />
            <CampoTxt etiqueta="Piezas por caja" valor={comp.acabados.pzs_caja} onChange={v => acab({ pzs_caja: v.replace(/[^0-9]/g, "") })} />
          </div>
        );

      default:
        return null;
    }
  };

  const extra = especificos();

  return (
    <div style={{
      borderTop: `1px solid ${T.borderSoft}`, marginTop: 8, paddingTop: 10,
      display: "flex", flexDirection: "column", gap: 11,
    }}>
      {clave ? (
        <div>
          <span style={lbl}>{tipoMaquina === "guillotina" ? "Guillotina" : tipoMaquina === "hojeadora" ? "Hojeadora" : "Máquina"}</span>
          <SelectorMaquina clave={clave} claveCatalogo={claveCatalogo} tipoMaquina={tipoMaquina} comp={comp} catalogs={catalogs} onCambiar={onMaquinaria} />
        </div>
      ) : (
        <p style={nota}>Este proceso no tiene máquina asociada en el catálogo.</p>
      )}

      {extra}

      <div>
        <span style={lbl}>Materiales</span>
        {refs.length === 0 ? (
          <p style={nota}>Esta orden todavía no tiene materiales asignados.</p>
        ) : refs.length === 1 ? (
          <span style={{ fontSize: 12, color: T.inkStrong, fontWeight: 600 }}>{refs[0].etiqueta}</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {refs.map(r => (
              <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.inkStrong, cursor: "pointer" }}>
                <input
                  type="checkbox" checked={proceso.materiales.includes(r.id)}
                  onChange={e => onProceso({
                    materiales: e.target.checked
                      ? [...proceso.materiales, r.id]
                      : proceso.materiales.filter(id => id !== r.id),
                  })}
                  style={{ width: 14, height: 14, accentColor: T.primary, cursor: "pointer" }}
                />
                {r.etiqueta}
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <span style={lbl}>Observaciones</span>
        <textarea
          value={proceso.observaciones} rows={2}
          onChange={e => onProceso({ observaciones: e.target.value })}
          placeholder="Notas para este proceso (opcional)"
          style={{
            width: "100%", padding: "7px 9px", border: `1px solid ${T.border}`, borderRadius: 8,
            fontSize: 12, color: T.inkStrong, background: "#fff", outline: "none",
            boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
          }}
        />
      </div>

      {/* El campo "Se repite (veces)" se retiró (Jose, 2026-09-04): la
          repetición ya no es un número dentro del proceso, sino cuántas veces
          aparece el proceso EN LA RUTA. Agregarlo otra vez desde el picker es
          lo que lo repite, y así las repeticiones ya no tienen que ser
          consecutivas (Impresión -> Laminación -> Impresión ahora se puede). */}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RUTEO ORTOGONAL DE LAS LÍNEAS DEL ÁRBOL (FASE 4, Jose 2026-09-08:
// "evitar que las flechas queden debajo de los componentes, o sea que hagan
// la función de ser rectas, pero doblarse cuando sea necesario en lugar de
// que sean flechas directas sin importar entorno y componentes").
// ═══════════════════════════════════════════════════════════════════════════
// Antes cada línea era una curva directa origen→destino, que se metía por
// debajo de cualquier tarjeta que estuviera en medio. Ahora se rutea en
// tramos rectos (horizontal/vertical) que se doblan por los pasillos libres
// entre columnas y por los carriles libres entre tarjetas, probando cada
// tramo contra TODAS las demás tarjetas antes de aceptarlo.
//
// Todo esto son funciones puras a nivel de módulo, a propósito: el script de
// prueba las extrae de este archivo entre los marcadores <<<RUTEO>>> y las
// corre en un navegador real contra el layout de verdad -- así lo que se
// verifica es exactamente este código, no una copia que se pueda desfasar.
// <<<RUTEO>>>
type RectRuta = { top: number; left: number; right: number; bottom: number };
type PuntoRuta = { x: number; y: number };

// Aire mínimo entre una línea y el borde de una tarjeta. 9 está elegido a
// propósito: los huecos verticales entre tarjetas apiladas son de 22px, así
// que dejan 11px de cada lado -- con 9 sí se pueden usar como carril, con
// 13 no cabía ninguno y todo se iba a rodear por arriba/abajo de todo.
const SEP_RUTA = 9;
const RADIO_RUTA = 7;

// ¿El tramo (siempre horizontal o vertical) pisa alguna de estas tarjetas?
const tramoChoca = (obst: RectRuta[], x1: number, y1: number, x2: number, y2: number): boolean => {
  const ax = Math.min(x1, x2), bx = Math.max(x1, x2);
  const ay = Math.min(y1, y2), by = Math.max(y1, y2);
  return obst.some(r =>
    bx > r.left - SEP_RUTA && ax < r.right + SEP_RUTA &&
    by > r.top - SEP_RUTA && ay < r.bottom + SEP_RUTA
  );
};

// Pasillos verticales libres: se agrupan las tarjetas en columnas por su
// rango horizontal y se devuelve el centro del hueco entre columna y
// columna (más uno a cada extremo, para poder rodear por fuera).
const pasillosVerticales = (todas: RectRuta[]): number[] => {
  const cols: { l: number; r: number }[] = [];
  [...todas].sort((a, b) => a.left - b.left).forEach(r => {
    const ult = cols[cols.length - 1];
    if (ult && r.left <= ult.r + 1) ult.r = Math.max(ult.r, r.right);
    else cols.push({ l: r.left, r: r.right });
  });
  const xs: number[] = [];
  for (let i = 0; i < cols.length - 1; i++) xs.push((cols[i].r + cols[i + 1].l) / 2);
  if (cols.length > 0) {
    xs.push(cols[cols.length - 1].r + 37);
    if (cols[0].l - 37 > 4) xs.push(cols[0].l - 37);
  }
  return xs;
};

// Carriles horizontales libres: por arriba de todo, por abajo de todo, y el
// centro de cada hueco entre dos tarjetas apiladas.
const carrilesHorizontales = (todas: RectRuta[]): number[] => {
  if (todas.length === 0) return [];
  const ys: number[] = [
    Math.min(...todas.map(r => r.top)) - (SEP_RUTA + 7),
    Math.max(...todas.map(r => r.bottom)) + (SEP_RUTA + 7),
  ];
  const orden = [...todas].sort((a, b) => a.top - b.top);
  for (let i = 0; i < orden.length - 1; i++) {
    if (orden[i + 1].top - orden[i].bottom > 2 * SEP_RUTA) {
      ys.push((orden[i].bottom + orden[i + 1].top) / 2);
    }
  }
  return ys;
};

// Devuelve los vértices del recorrido: sale del borde de `o`, se dobla lo
// que haga falta por pasillos/carriles libres, y entra al borde de `d`.
// `obst` son todas las tarjetas MENOS el origen y el destino (a esas dos sí
// tiene que tocarlas); `todas` incluye todo, para detectar columnas/huecos.
const rutaOrtogonal = (o: RectRuta, d: RectRuta, obst: RectRuta[], todas: RectRuta[]): PuntoRuta[] => {
  const oy = (o.top + o.bottom) / 2;
  const dy = (d.top + d.bottom) / 2;
  const libre = (x1: number, y1: number, x2: number, y2: number) => !tramoChoca(obst, x1, y1, x2, y2);
  const pasillos = pasillosVerticales(todas);

  // 1) Misma columna y pegadas (una OPC arriba de otra): recta vertical por
  //    el hueco, sin rodeos.
  const solapaX = Math.min(o.right, d.right) - Math.max(o.left, d.left);
  if (solapaX > 20) {
    const cx = (Math.max(o.left, d.left) + Math.min(o.right, d.right)) / 2;
    if (d.top >= o.bottom && libre(cx, o.bottom, cx, d.top)) {
      return [{ x: cx, y: o.bottom }, { x: cx, y: d.top }];
    }
    if (d.bottom <= o.top && libre(cx, o.top, cx, d.bottom)) {
      return [{ x: cx, y: o.top }, { x: cx, y: d.bottom }];
    }
  }

  if (d.left >= o.right) {
    // 2) Destino a la derecha (el caso normal): "Z" de tres tramos por el
    //    pasillo que quede libre -- se prueba primero el más pegado al
    //    destino, para que la línea corra derecho lo más lejos posible.
    const entre = pasillos.filter(x => x > o.right + 4 && x < d.left - 4).sort((a, b) => b - a);
    for (const cx of entre) {
      if (libre(o.right, oy, cx, oy) && libre(cx, oy, cx, dy) && libre(cx, dy, d.left, dy)) {
        return [{ x: o.right, y: oy }, { x: cx, y: oy }, { x: cx, y: dy }, { x: d.left, y: dy }];
      }
    }
    // 3) Si ningún pasillo sirve solo, se sale al primer pasillo, se viaja
    //    por un carril libre (el más cercano a la altura media del tramo) y
    //    se baja/sube en el último pasillo antes del destino.
    if (entre.length > 0) {
      const c1 = Math.min(...entre), c2 = Math.max(...entre);
      const carriles = carrilesHorizontales(todas)
        .sort((a, b) => Math.abs(a - (oy + dy) / 2) - Math.abs(b - (oy + dy) / 2));
      for (const ly of carriles) {
        if (libre(o.right, oy, c1, oy) && libre(c1, oy, c1, ly) && libre(c1, ly, c2, ly) &&
            libre(c2, ly, c2, dy) && libre(c2, dy, d.left, dy)) {
          return [
            { x: o.right, y: oy }, { x: c1, y: oy }, { x: c1, y: ly },
            { x: c2, y: ly }, { x: c2, y: dy }, { x: d.left, y: dy },
          ];
        }
      }
    }
    // 4) Último recurso: Z por el punto medio. Puede rozar algo, pero la
    //    línea nunca deja de dibujarse ni apunta a otro lado.
    const cx = (o.right + d.left) / 2;
    return [{ x: o.right, y: oy }, { x: cx, y: oy }, { x: cx, y: dy }, { x: d.left, y: dy }];
  }

  // 5) Destino a la izquierda o traslapado: sale por la derecha, rodea por
  //    el pasillo libre más cercano y entra por la derecha del destino.
  const porFuera = pasillos.filter(x => x > Math.max(o.right, d.right) + 4).sort((a, b) => a - b);
  for (const cx of porFuera) {
    if (libre(o.right, oy, cx, oy) && libre(cx, oy, cx, dy) && libre(cx, dy, d.right, dy)) {
      return [{ x: o.right, y: oy }, { x: cx, y: oy }, { x: cx, y: dy }, { x: d.right, y: dy }];
    }
  }
  const cx = Math.max(o.right, d.right) + 37;
  return [{ x: o.right, y: oy }, { x: cx, y: oy }, { x: cx, y: dy }, { x: d.right, y: dy }];
};

// Vértices -> path de SVG, con las esquinas apenas redondeadas (se sigue
// leyendo como tramos rectos, nomás no pica en las vueltas).
const caminoDesdePuntos = (pts: PuntoRuta[]): string => {
  const p = pts.filter((punto, i) => i === 0 || punto.x !== pts[i - 1].x || punto.y !== pts[i - 1].y);
  if (p.length < 2) return "";
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 1; i < p.length - 1; i++) {
    const act = p[i], prev = p[i - 1], sig = p[i + 1];
    const d1 = Math.hypot(act.x - prev.x, act.y - prev.y);
    const d2 = Math.hypot(sig.x - act.x, sig.y - act.y);
    if (d1 === 0 || d2 === 0) continue;
    const r = Math.max(0, Math.min(RADIO_RUTA, d1 / 2, d2 / 2));
    const a = { x: act.x + ((prev.x - act.x) / d1) * r, y: act.y + ((prev.y - act.y) / d1) * r };
    const b = { x: act.x + ((sig.x - act.x) / d2) * r, y: act.y + ((sig.y - act.y) / d2) * r };
    d += ` L ${a.x} ${a.y} Q ${act.x} ${act.y} ${b.x} ${b.y}`;
  }
  const fin = p[p.length - 1];
  return `${d} L ${fin.x} ${fin.y}`;
};

// Nivel de una OPC contando saltos hasta la unión: 1 = alimenta directo a la
// unión, 2 = alimenta a una OPC de nivel 1, etc. Sirve para acomodar las
// columnas (Jose, 2026-09-08: "si una OPC depende de otra OPC, que la OPC se
// ponga frente de la OPC padre"): a mayor nivel, más a la izquierda.
const nivelOPC = (comp: ComponentePapel, componentes: ComponentePapel[]): number => {
  let n = 0;
  let actual: ComponentePapel | undefined = comp;
  const vistos = new Set<number>();
  while (actual && actual.tipo === "complementaria" && !vistos.has(actual.id)) {
    vistos.add(actual.id);
    n++;
    const padre: ComponentePapel | undefined = componentes.find(c => c.id === actual!.idComponentePadre);
    if (!padre || padre.tipo !== "complementaria") break;
    actual = padre;
  }
  return Math.max(1, n);
};
// <<<FIN RUTEO>>>

// ═══════════════════════════════════════════════════════════════════════════
// NODO CONECTABLE (FASE 4, Jose 2026-09-08) — envoltura para conectar el
// árbol de OPC visualmente desde aquí, sin duplicar la lógica de destinos
// válidos/ciclos (misma destinosValidosPara que usa "Estructura del árbol").
// Mientras hay una conexión en curso (origenConexion != null), cualquier
// nodo que sea un destino válido para ese origen se resalta y se vuelve
// clicable en cualquier parte de la tarjeta; el resto se queda igual que
// siempre (no intercepta clics para no estorbar con nombre/procesos).
// ═══════════════════════════════════════════════════════════════════════════
function NodoConectable({ comp, componentes, origenConexion, onConectarAqui, children }: {
  comp: ComponentePapel;
  componentes: ComponentePapel[];
  origenConexion: ComponentePapel | null;
  onConectarAqui: (id: number) => void;
  children: React.ReactNode;
}) {
  const esOrigen = origenConexion?.id === comp.id;
  const esDestinoValido = origenConexion != null && !esOrigen &&
    destinosValidosPara(origenConexion, componentes).some(d => d.id === comp.id);

  // Siempre el MISMO div (nunca un Fragment de por medio): si la envoltura
  // cambiara de tipo entre renders, React desmontaría y volvería a montar
  // todo lo de adentro (la TarjetaOP, con su estado local de "Mover
  // procesos" y sus refs de medición) cada vez que esta tarjeta empieza o
  // deja de ser un destino válido -- justo el mismo bug de fondo que ya
  // pasó una vez con TarjetaOP (ver su comentario, "pierde el foco después
  // de cada carácter"). Aquí solo cambian estilos/handlers, nunca el tipo.
  return (
    <div
      onClick={esDestinoValido ? () => onConectarAqui(comp.id) : undefined}
      style={{
        borderRadius: 12, position: "relative",
        outline: esDestinoValido ? `2px dashed ${T.primary}` : "none",
        outlineOffset: 3, cursor: esDestinoValido ? "pointer" : "inherit",
      }}
    >
      {esDestinoValido && (
        <span style={{
          position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
          background: T.primary, color: "#fff", fontSize: 10, fontWeight: 700,
          padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap", zIndex: 2,
        }}>
          Conectar aquí
        </span>
      )}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA DE OP (columna) — vista de "órdenes independientes"
// ═══════════════════════════════════════════════════════════════════════════
// A nivel de MÓDULO (no dentro de RutaProcesos): si se define adentro, cada
// render de RutaProcesos (por ejemplo cada tecla que se escribe en un campo
// de DetalleProceso, que vive aquí abajo) crea una identidad de componente
// nueva, y React desmonta y vuelve a montar toda la tarjeta -- inputs
// incluidos -- perdiendo el foco después de cada carácter (justo el bug que
// reportó Jose: "solo me permite un solo carácter"). Por eso todo lo que
// renderiza un <input>/<textarea> de este árbol (TarjetaOP, VistaMismaOrden,
// PanelNotas) se saca de adentro y recibe lo que necesita por props.
function TarjetaOP({
  comp, cardRef, componentes, materiales, catalogs, procesosCat, catPorId,
  pantallaCompleta, compacta, abierto, setAbierto, inicios,
  setArrastrandoId, setSobreId, eligiendoEn, setEligiendoEn,
  tamanoAsaDefault, onTamanoAsaDefaultChange, addItem,
  parcharComp, parcharMaquinaria, parcharMaterial, parcharProceso, quitarProceso,
  reordenarProcesos, acomodarRuta, rutaYaAcomodada,
}: {
  comp: ComponentePapel;
  cardRef?: (el: HTMLDivElement | null) => void;
  componentes: ComponentePapel[];
  materiales: MaterialEntry[];
  catalogs: Catalogs;
  procesosCat: ProcesoCatOpcion[];
  catPorId: Map<number, ProcesoCatOpcion>;
  pantallaCompleta: boolean;
  compacta: boolean;
  abierto: number | null;
  setAbierto: (v: number | null) => void;
  inicios: ComponentePapel[];
  setArrastrandoId: (v: number | null) => void;
  setSobreId: (v: number | null) => void;
  eligiendoEn: { id: number; top: number; left: number; width: number } | null;
  setEligiendoEn: (v: { id: number; top: number; left: number; width: number } | null) => void;
  tamanoAsaDefault: string;
  onTamanoAsaDefaultChange: (v: string) => void;
  addItem?: (key: CatKey, nombre: string) => Promise<unknown>;
  parcharComp: (id: number, patch: Partial<ComponentePapel>) => void;
  parcharMaquinaria: (comp: ComponentePapel, patch: Record<string, number[] | string[]>) => void;
  parcharMaterial: (id: number, patch: Partial<MaterialEntry>) => void;
  parcharProceso: (comp: ComponentePapel, procesoId: number, patch: Partial<ComponenteProceso>) => void;
  quitarProceso: (comp: ComponentePapel, procesoId: number) => void;
  reordenarProcesos: (comp: ComponentePapel, idArrastrado: number, idDestino: number) => void;
  acomodarRuta: (comp: ComponentePapel) => void;
  rutaYaAcomodada: (comp: ComponentePapel) => boolean;
}) {
  const pal = paletaOP(comp.tipo, indicePaleta(comp, componentes));
  const refs = refsDeComponente(materiales, comp.id);

  // Mover procesos DENTRO de esta ruta. Es un modo aparte (botón "Mover
  // procesos") en vez de estar siempre activo: así en pantalla táctil no se
  // arrastra sin querer al intentar abrir un proceso, y queda clarísimo
  // cuándo se está reacomodando (Jose, 2026-09-04). Una tarjeta solo se
  // mueve entre las de su propia OP -- no se pasan de una OP a otra.
  const [modoMover, setModoMover] = useState(false);
  const pasadas = etiquetasPasada(comp.procesos, catPorId);
  const enModoMover = modoMover && !pantallaCompleta && comp.procesos.length > 1;
  const reord = useReordenar(
    comp.procesos.map(p => p.id),
    "y",
    (a, b) => reordenarProcesos(comp, a, b),
  );

  return (
    <div ref={cardRef} style={{ width: 206, flexShrink: 0 }}>
      <div style={{
        border: `1px solid ${T.border}`, borderRadius: 12, overflow: "visible",
        background: "#fff", boxShadow: T.shadow, position: "relative",
      }}>
        <div style={{ padding: "13px 12px", textAlign: "center", background: pal.headBg, borderRadius: "11px 11px 0 0", position: "relative" }}>
          {comp.tipo === "inicio" && inicios.length > 1 && (
            <span
              draggable
              onDragStart={(e) => { e.stopPropagation(); setArrastrandoId(comp.id); }}
              onDragEnd={() => { setArrastrandoId(null); setSobreId(null); }}
              title="Arrastra para reordenar"
              style={{
                position: "absolute", top: 8, right: 8, cursor: "grab",
                display: "grid", placeItems: "center", color: pal.headText, opacity: 0.65,
              }}
            >
              <IcoAgarre />
            </span>
          )}
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.03em", marginBottom: 5, color: pal.headText }}>
            {etiquetaComponente(comp, componentes)}
          </div>
          <input
            value={comp.nombre}
            onChange={e => parcharComp(comp.id, { nombre: e.target.value })}
            placeholder="Describe esta orden"
            style={{
              width: "100%", border: "none", background: "transparent", textAlign: "center",
              fontSize: 11.5, fontWeight: 500, color: T.inkSoft, outline: "none",
              fontFamily: "inherit", padding: 0,
            }}
          />
          <div style={{ fontSize: 11.5, fontWeight: 500, color: T.inkSoft, marginTop: 3 }}>
            {refs.length === 0
              ? (["union", "complementaria"].includes(comp.tipo)
                // La OP de unión (y, FASE 4, cualquier OPC) sin material
                // propio NO es un error ni un dato faltante -- es lo
                // normal: recibe las piezas ya hechas de sus órdenes de
                // origen en vez de partir de un material propio (Jose,
                // 2026-09-02: "en el apartado de op de union cada que no
                // tenga material asignado aqui hay que cambiar la
                // leyenda", porque "(sin material asignado)" sonaba a que
                // faltaba algo).
                ? "(usa las piezas de sus órdenes de origen)"
                : "(sin material asignado)")
              : `(Material: ${refs.map(r => r.etiqueta).join(", ")})`}
          </div>
        </div>

        <div style={{ padding: 9, position: "relative" }}>
          {comp.procesos.length === 0 && (
            <p style={{
              margin: "2px 0 8px", fontSize: 11, color: T.orangeText, background: T.orangeBg,
              border: `1px dashed ${T.orangeBorder}`, borderRadius: 7, padding: "6px 8px", lineHeight: 1.5,
            }}>
              Esta orden todavía no tiene procesos.
            </p>
          )}

          {comp.procesos.map((proceso, i) => {
            const cat = proceso.idproceso_cat != null ? catPorId.get(proceso.idproceso_cat) : undefined;
            // El catálogo resuelto por tabla SIEMPRE gana sobre procesoNombre
            // (Jose, 2026-09-04): procesoNombre es un campo que solo vive en
            // memoria/borrador -- un borrador guardado antes de que existiera
            // este acortador, o restaurado de una sesión vieja, puede traer
            // atrapado el nombre crudo del catálogo ("Impresión Papel") y
            // antes se quedaba así para siempre porque procesoNombre ganaba
            // la carrera. Ahora solo se usa procesoNombre cuando el catálogo
            // no se puede resolver (proceso quitado del catálogo, por ejemplo).
            const nombre = (cat ? nombreCortoProceso(cat.tabla, cat.nombre_proceso) : null) || proceso.procesoNombre || "—";
            const detalle = detalleCorto(proceso, comp, cat, catalogs);
            // En modo mover no se abre el detalle: la tarjeta entera es el asa,
            // así que un toque significa "tomar", no "abrir".
            const expandido = !pantallaCompleta && !enModoMover && abierto === proceso.id;
            const seleccionada = reord.tomado === proceso.id;
            return (
              <div
                key={proceso.id}
                ref={reord.registrar(proceso.id)}
                data-proceso-card={proceso.id}
                {...(enModoMover ? reord.asaProps(proceso.id) : {})}
                style={{
                  border: `1px solid ${seleccionada ? T.primary : expandido ? "#BFD3F2" : T.borderSoft}`,
                  borderRadius: 9, padding: "9px 10px", marginBottom: 7,
                  background: seleccionada ? "#F4F8FE" : "#fff",
                  ...(enModoMover ? reord.estilo(proceso.id) : {}),
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  {enModoMover && (
                    <span
                      title="Arrástralo, o tócalo y luego toca dónde va"
                      style={{ display: "grid", placeItems: "center", color: seleccionada ? T.primary : T.inkSoft, opacity: seleccionada ? 1 : 0.55, flexShrink: 0 }}
                    >
                      <IcoAgarre />
                    </span>
                  )}
                  <IconoProcesoCuadro nombre={nombre} />
                  <span
                    onClick={() => { if (!pantallaCompleta && !enModoMover) setAbierto(expandido ? null : proceso.id); }}
                    style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2, flex: 1, cursor: pantallaCompleta || enModoMover ? "inherit" : "pointer" }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.inkStrong, lineHeight: 1.35 }}>
                      {i + 1}. {nombre}
                      {pasadas.get(proceso.id) && (
                        <span style={{ color: T.primary, fontWeight: 700 }}>{pasadas.get(proceso.id)}</span>
                      )}
                    </span>
                    {!compacta && !pantallaCompleta && detalle && (
                      <span style={{ fontSize: 11, fontWeight: 400, color: T.inkSoft, lineHeight: 1.4 }}>{detalle}</span>
                    )}
                  </span>
                </div>

                {expandido && (
                  <>
                    <DetalleProceso
                      proceso={proceso} comp={comp} cat={cat} catalogs={catalogs} materiales={materiales}
                      procesosCat={procesosCat}
                      tamanoAsaDefault={tamanoAsaDefault} onTamanoAsaDefaultChange={onTamanoAsaDefaultChange}
                      onProceso={patch => parcharProceso(comp, proceso.id, patch)}
                      onMaquinaria={patch => parcharMaquinaria(comp, patch)}
                      onComp={patch => parcharComp(comp.id, patch)}
                      onMaterial={parcharMaterial}
                      addItem={addItem}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button type="button" onClick={() => quitarProceso(comp, proceso.id)}
                        style={{ ...miniBtn(false), marginLeft: "auto", color: T.danger, borderColor: "#F5C2C2" }}>Quitar</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Modo "Mover procesos" (Jose, 2026-09-04): mientras está prendido,
              cada tarjeta se puede arrastrar o tocar-y-colocar. Apagado, las
              tarjetas se comportan como siempre (tocar = abrir el detalle). */}
          {!pantallaCompleta && comp.procesos.length > 1 && (
            <button
              type="button"
              onClick={() => { setModoMover(v => !v); reord.cancelar(); setAbierto(null); }}
              style={{
                width: "100%", height: 28, borderRadius: 8,
                border: `1px solid ${enModoMover ? T.primary : T.borderSoft}`,
                background: enModoMover ? "#EFF6FF" : "#fff",
                color: enModoMover ? T.primary : T.inkSoft,
                fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", marginBottom: 7,
              }}
            >
              {enModoMover ? "✓ Listo de mover" : "⇅ Mover procesos"}
            </button>
          )}

          {enModoMover && (
            <p style={{
              margin: "0 0 7px", fontSize: 10.5, lineHeight: 1.5, color: T.primary,
              background: "#F4F8FE", border: "1px dashed #A9C3EE", borderRadius: 7, padding: "5px 7px",
            }}>
              {reord.tomado != null
                ? "Ahora toca el proceso del lugar a donde quieres moverlo."
                : "Arrastra un proceso, o tócalo y luego toca dónde va."}
            </p>
          )}

          {/* Jose (2026-09-04): el acomodo al orden canónico ya no pasa solo al
              agregar -- ahora se pide con este botón, y solo aparece cuando de
              verdad cambiaría algo, para no ofrecer una acción que no hace nada. */}
          {!pantallaCompleta && comp.procesos.length > 1 && !rutaYaAcomodada(comp) && (
            <button
              type="button"
              onClick={() => acomodarRuta(comp)}
              title="Reordena esta ruta al orden normal de producción"
              style={{
                width: "100%", height: 28, borderRadius: 8, border: `1px solid ${T.borderSoft}`,
                background: "#fff", color: T.inkSoft, fontSize: 11.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", marginBottom: 7,
              }}
            >
              ↕ Acomodar al orden normal
            </button>
          )}

          {!pantallaCompleta && (
            <button
              type="button"
              onClick={(e) => {
                if (eligiendoEn?.id === comp.id) { setEligiendoEn(null); return; }
                const btn = e.currentTarget;
                // Centra el botón en pantalla ANTES de medir su posición, así el
                // desplegable siempre aparece visible aunque el botón estuviera
                // arriba/abajo del área visible (Jose). "auto" para que el scroll
                // sea inmediato y el getBoundingClientRect() de abajo ya sea el
                // definitivo (con "smooth" el rect quedaría desfasado).
                btn.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
                const r = btn.getBoundingClientRect();
                setEligiendoEn({ id: comp.id, top: r.bottom + 4, left: r.left, width: r.width });
              }}
              style={{
                width: "100%", height: 34, borderRadius: 8, border: "1px dashed #A9C3EE",
                background: "#F4F8FE", color: T.primary, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              + Agregar proceso
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VISTA "MISMA ORDEN": paleta + cadena horizontal
// ═══════════════════════════════════════════════════════════════════════════
function VistaMismaOrden({
  comp, pantallaCompleta, filtrarPorPreparacion, procesosCat, agregarProceso,
  catPorId, catalogs, materiales, abierto, setAbierto, compacta,
  tamanoAsaDefault, onTamanoAsaDefaultChange, parcharProceso, parcharMaquinaria,
  parcharComp, parcharMaterial, addItem, quitarProceso, nombreProducto,
  reordenarProcesos, acomodarRuta, rutaYaAcomodada,
}: {
  comp: ComponentePapel;
  pantallaCompleta: boolean;
  filtrarPorPreparacion: (comp: ComponentePapel, lista: ProcesoCatOpcion[]) => ProcesoCatOpcion[];
  procesosCat: ProcesoCatOpcion[];
  agregarProceso: (comp: ComponentePapel, cat: ProcesoCatOpcion) => void;
  catPorId: Map<number, ProcesoCatOpcion>;
  catalogs: Catalogs;
  materiales: MaterialEntry[];
  abierto: number | null;
  setAbierto: (v: number | null) => void;
  compacta: boolean;
  tamanoAsaDefault: string;
  onTamanoAsaDefaultChange: (v: string) => void;
  parcharProceso: (comp: ComponentePapel, procesoId: number, patch: Partial<ComponenteProceso>) => void;
  parcharMaquinaria: (comp: ComponentePapel, patch: Record<string, number[] | string[]>) => void;
  parcharComp: (id: number, patch: Partial<ComponentePapel>) => void;
  parcharMaterial: (id: number, patch: Partial<MaterialEntry>) => void;
  addItem?: (key: CatKey, nombre: string) => Promise<unknown>;
  quitarProceso: (comp: ComponentePapel, procesoId: number) => void;
  nombreProducto: string;
  reordenarProcesos: (comp: ComponentePapel, idArrastrado: number, idDestino: number) => void;
  acomodarRuta: (comp: ComponentePapel) => void;
  rutaYaAcomodada: (comp: ComponentePapel) => boolean;
}) {
  const [modoMover, setModoMover] = useState(false);
  const pasadas = etiquetasPasada(comp.procesos, catPorId);
  const enModoMover = modoMover && !pantallaCompleta && comp.procesos.length > 1;
  const reord = useReordenar(
    comp.procesos.map(p => p.id),
    "x",
    (a, b) => reordenarProcesos(comp, a, b),
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: pantallaCompleta ? "1fr" : "186px 1fr", gap: 18, alignItems: "start" }}>
      {!pantallaCompleta && (
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, background: "#FBFCFE", padding: "14px 12px" }}>
        <h4 style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: T.inkStrong }}>Procesos disponibles</h4>
        <p style={{ fontSize: 11.5, color: T.inkSoft, margin: "0 0 12px", fontWeight: 400 }}>
          Toca uno para agregarlo. Tócalo otra vez para repetirlo en la ruta.
        </p>
        {/* Jose (2026-09-04): los procesos que ya están en la ruta YA NO se
            deshabilitan -- volver a tocarlos es justo la forma de repetirlos.
            Se muestra cuántas veces va cada uno para que se vea de un vistazo. */}
        {filtrarPorPreparacion(comp, procesosCat).map(p => {
          const cuantas = comp.procesos.filter(cp => cp.idproceso_cat === p.idproceso_cat).length;
          const nombreCorto = nombreCortoProceso(p.tabla, p.nombre_proceso);
          return (
            <button
              key={p.idproceso_cat} type="button"
              onClick={() => agregarProceso(comp, p)}
              title={cuantas > 0 ? `Ya va ${cuantas} ${cuantas === 1 ? "vez" : "veces"} -- agregar otra` : "Agregar a la ruta"}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 11, background: "#fff",
                border: `1px solid ${cuantas > 0 ? "#BFD3F2" : T.borderSoft}`, borderRadius: 9,
                padding: "8px 10px", marginBottom: 6, cursor: "pointer",
                fontFamily: "inherit", textAlign: "left",
              }}
            >
              <IconoProcesoCuadro nombre={nombreCorto} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.inkStrong, flex: 1 }}>{nombreCorto}</span>
              {cuantas > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: T.primary, flexShrink: 0 }}>×{cuantas}</span>
              )}
            </button>
          );
        })}
      </div>
      )}

      <div style={{ minWidth: 0 }}>
        {comp.procesos.length === 0 ? (
          <p style={{
            margin: 0, fontSize: 12.5, color: T.orangeText, background: T.orangeBg,
            border: `1px dashed ${T.orangeBorder}`, borderRadius: 9, padding: "12px 14px",
          }}>
            Elige procesos de la lista de la izquierda para armar la ruta.
          </p>
        ) : (
          <>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 10 }}>
            {!pantallaCompleta && comp.procesos.length > 1 && (
              <button
                type="button"
                onClick={() => { setModoMover(v => !v); reord.cancelar(); setAbierto(null); }}
                style={{
                  height: 28, borderRadius: 8,
                  border: `1px solid ${enModoMover ? T.primary : T.borderSoft}`,
                  background: enModoMover ? "#EFF6FF" : "#fff",
                  color: enModoMover ? T.primary : T.inkSoft,
                  fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", padding: "0 12px",
                }}
              >
                {enModoMover ? "✓ Listo de mover" : "⇅ Mover procesos"}
              </button>
            )}

            {!pantallaCompleta && comp.procesos.length > 1 && !rutaYaAcomodada(comp) && (
              <button
                type="button"
                onClick={() => acomodarRuta(comp)}
                title="Reordena esta ruta al orden normal de producción"
                style={{
                  height: 28, borderRadius: 8, border: `1px solid ${T.borderSoft}`, background: "#fff",
                  color: T.inkSoft, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", padding: "0 12px",
                }}
              >
                ↕ Acomodar al orden normal
              </button>
            )}

            {enModoMover && (
              <span style={{ fontSize: 11, color: T.primary, fontWeight: 500 }}>
                {reord.tomado != null
                  ? "Ahora toca el proceso del lugar a donde quieres moverlo."
                  : "Arrastra un proceso, o tócalo y luego toca dónde va."}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "stretch", overflowX: "auto", paddingBottom: 6 }}>
            {comp.procesos.map((proceso, i) => {
              const cat = proceso.idproceso_cat != null ? catPorId.get(proceso.idproceso_cat) : undefined;
              // Ver comentario arriba (VistaMismaOrden hermana): el catálogo
              // resuelto por tabla siempre gana sobre un procesoNombre que
              // pueda venir atrapado con el nombre crudo de un borrador viejo.
              const nombre = (cat ? nombreCortoProceso(cat.tabla, cat.nombre_proceso) : null) || proceso.procesoNombre || "—";
              const clave = cat ? CLAVE_MAQUINA_POR_TABLA[cat.tabla] : undefined;
              const claveCat = (cat ? CATALOGO_MAQUINA_POR_TABLA[cat.tabla] : undefined) ?? clave;
              const ids = clave ? ((comp.maquinaria[clave] ?? []) as number[]) : [];
              const items = claveCat ? ((catalogs?.[claveCat] ?? []) as CatItem[]) : [];
              const maquina = ids.map(id => items.find(x => x.id === id)?.nombre).filter(Boolean).join(" · ");
              const usados = proceso.materiales.length > 0
                ? proceso.materiales.map(id => refDeMaterial(materiales, id))
                : refsDeComponente(materiales, comp.id).map(r => r.etiqueta);
              const expandido = !pantallaCompleta && !enModoMover && abierto === proceso.id;
              const seleccionada = reord.tomado === proceso.id;
              return (
                <div
                  key={proceso.id}
                  ref={reord.registrar(proceso.id)}
                  data-proceso-card={proceso.id}
                  {...(enModoMover ? reord.asaProps(proceso.id) : {})}
                  style={{
                    display: "flex", alignItems: "stretch",
                    ...(enModoMover ? reord.estilo(proceso.id) : {}),
                  }}
                >
                  <div style={{
                    width: 210, flexShrink: 0,
                    border: `1px solid ${seleccionada ? T.primary : expandido ? "#BFD3F2" : T.border}`,
                    borderRadius: 12, background: seleccionada ? "#F4F8FE" : "#fff",
                    boxShadow: T.shadow, padding: "14px 14px 16px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 12 }}>
                      {enModoMover && (
                        <span
                          title="Arrástralo, o tócalo y luego toca dónde va"
                          style={{ display: "grid", placeItems: "center", color: seleccionada ? T.primary : T.inkSoft, opacity: seleccionada ? 1 : 0.55, flexShrink: 0, marginTop: 2 }}
                        >
                          <IcoAgarre />
                        </span>
                      )}
                      <IconoProcesoCuadro nombre={nombre} />
                      <span
                        onClick={() => { if (!pantallaCompleta && !enModoMover) setAbierto(expandido ? null : proceso.id); }}
                        style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, cursor: pantallaCompleta || enModoMover ? "inherit" : "pointer" }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.inkStrong, lineHeight: 1.35 }}>
                          {i + 1}. {nombre}
                          {pasadas.get(proceso.id) && (
                            <span style={{ color: T.primary, fontWeight: 700 }}>{pasadas.get(proceso.id)}</span>
                          )}
                        </span>
                        {proceso.observaciones.trim() && !compacta && !pantallaCompleta && (
                          <span style={{ fontSize: 12, color: T.inkSoft, fontWeight: 400, lineHeight: 1.55 }}>{proceso.observaciones}</span>
                        )}
                      </span>
                    </div>

                    {!compacta && !pantallaCompleta && (
                      <>
                        <Fld k={usados.length > 1 ? "Materiales:" : "Material principal:"} v={usados.length ? usados.join(" · ") : "—"} />
                        <Fld k="Máquina:" v={maquina || "—"} />
                      </>
                    )}

                    {expandido && (
                      <>
                        <DetalleProceso
                          proceso={proceso} comp={comp} cat={cat} catalogs={catalogs} materiales={materiales}
                          procesosCat={procesosCat}
                          tamanoAsaDefault={tamanoAsaDefault} onTamanoAsaDefaultChange={onTamanoAsaDefaultChange}
                          onProceso={patch => parcharProceso(comp, proceso.id, patch)}
                          onMaquinaria={patch => parcharMaquinaria(comp, patch)}
                          onComp={patch => parcharComp(comp.id, patch)}
                          onMaterial={parcharMaterial}
                          addItem={addItem}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                          <button type="button" onClick={() => quitarProceso(comp, proceso.id)}
                            style={{ ...miniBtn(false), marginLeft: "auto", color: T.danger, borderColor: "#F5C2C2" }}>Quitar</button>
                        </div>
                      </>
                    )}
                  </div>
                  {i < comp.procesos.length - 1 && (
                    <div style={{ width: 46, flexShrink: 0, display: "grid", placeItems: "center", color: T.inkStrong }}>
                      <IcoFlecha ancho={26} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>
        )}

        <div style={{
          marginTop: 16, border: `1px solid ${T.border}`, borderRadius: 11, background: "#FBFCFE",
          padding: "13px 20px", display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap",
        }}>
          <Stat k="Modo de asignación" v="Misma orden" />
          <Stat k="Materiales utilizados" v={String(materiales.length)} />
          <Stat k="Procesos en la ruta" v={String(comp.procesos.length)} />
          <Stat k="Producto final" v={nombreProducto.trim() || "—"} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL DE NOTAS
// ═══════════════════════════════════════════════════════════════════════════
function PanelNotas({
  idproducto, notasPendientes, onNotasPendientesChange,
}: {
  idproducto: number | null;
  notasPendientes: string[];
  onNotasPendientesChange: (notas: string[]) => void;
}) {
  const [notas, setNotas] = useState<NotaProducto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoNueva, setGuardandoNueva] = useState(false);
  const [editandoId, setEditandoId] = useState<number | string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState("");
  const [ocupado, setOcupado] = useState<number | string | null>(null);

  useEffect(() => {
    if (!idproducto) { setNotas([]); return; }
    let vivo = true;
    setCargando(true);
    fetchNotasProducto(idproducto)
      .then(d => { if (vivo) setNotas(d); })
      .catch((e: any) => { if (vivo) setError(e?.message || "No se pudieron cargar las notas"); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [idproducto]);

  // Vista unificada: mismas filas numeradas para las notas ya guardadas
  // (id numérico real) y las pendientes de un producto sin guardar (id
  // "pendiente-<índice>", solo texto en memoria).
  const lista: { id: number | string; texto: string }[] = idproducto
    ? notas.map(n => ({ id: n.idnota_producto_papel, texto: n.texto }))
    : notasPendientes.map((texto, i) => ({ id: `pendiente-${i}`, texto }));

  const agregar = async () => {
    const texto = nuevaNota.trim();
    if (!texto) return;
    if (!idproducto) {
      onNotasPendientesChange([...notasPendientes, texto]);
      setNuevaNota("");
      return;
    }
    setGuardandoNueva(true);
    setError("");
    try {
      const nota = await crearNotaProducto(idproducto, texto);
      setNotas(prev => [...prev, nota]);
      setNuevaNota("");
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la nota");
    } finally {
      setGuardandoNueva(false);
    }
  };

  const guardarEdicion = async (id: number | string) => {
    const texto = textoEdicion.trim();
    if (!texto) return;
    if (typeof id === "string") {
      const idx = Number(id.replace("pendiente-", ""));
      const copia = [...notasPendientes];
      copia[idx] = texto;
      onNotasPendientesChange(copia);
      setEditandoId(null);
      return;
    }
    setOcupado(id);
    setError("");
    try {
      const nota = await actualizarNotaProducto(id, texto);
      setNotas(prev => prev.map(n => (n.idnota_producto_papel === id ? nota : n)));
      setEditandoId(null);
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar la nota");
    } finally {
      setOcupado(null);
    }
  };

  const borrar = async (id: number | string) => {
    if (!(await showConfirm("¿Eliminar esta nota?"))) return;
    if (typeof id === "string") {
      const idx = Number(id.replace("pendiente-", ""));
      onNotasPendientesChange(notasPendientes.filter((_, i) => i !== idx));
      return;
    }
    setOcupado(id);
    setError("");
    try {
      await eliminarNotaProducto(id);
      setNotas(prev => prev.filter(n => n.idnota_producto_papel !== id));
    } catch (e: any) {
      setError(e?.message || "No se pudo eliminar la nota");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div style={{ ...panel, marginTop: 16 }}>
      <h3 style={panelTitulo}>Notas</h3>

      {error && (
        <p style={{ margin: "0 0 8px", fontSize: 11.5, color: "#B91C1C" }}>{error}</p>
      )}

      {!idproducto && (
        <p style={{ margin: "0 0 8px", fontSize: 11, color: T.muted }}>
          Se guardan en cuanto guardes el producto.
        </p>
      )}

      {cargando ? (
        <p style={{ margin: 0, fontSize: 12.5, color: T.muted }}>Cargando notas...</p>
      ) : lista.length === 0 ? (
        <p style={{ margin: "0 0 10px", fontSize: 12.5, color: T.muted }}>Todavía no hay notas.</p>
      ) : (
        // Enlistado, no tarjetas -- mismo formato que traía el texto
        // automático de antes (numerado, sin caja alrededor de cada
        // una), solo que ahora cada renglón es una nota real que se
        // puede editar o borrar (Jose).
        <div style={{ marginBottom: 10 }}>
          {lista.map((n, i) => {
            const enEdicion = editandoId === n.id;
            const ocupadoAqui = ocupado === n.id;
            return (
              <div key={n.id} style={{
                display: "flex", gap: 8, alignItems: "flex-start",
                padding: "6px 0", borderBottom: `1px solid ${T.borderSoft}`,
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.muted, flexShrink: 0, minWidth: 16 }}>
                  {i + 1}.
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {enEdicion ? (
                    <>
                      <textarea
                        value={textoEdicion} rows={2} autoFocus
                        onChange={e => setTextoEdicion(e.target.value)}
                        style={{
                          width: "100%", padding: "6px 8px", border: `1px solid ${T.border}`, borderRadius: 6,
                          fontSize: 12, color: T.inkStrong, background: "#fff", outline: "none",
                          boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
                        }}
                      />
                      <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => setEditandoId(null)} style={miniBtn(false)}>Cancelar</button>
                        <button
                          type="button" onClick={() => guardarEdicion(n.id)}
                          disabled={ocupadoAqui} style={miniBtn(ocupadoAqui)}
                        >{ocupadoAqui ? "Guardando..." : "Guardar"}</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: T.inkStrong, whiteSpace: "pre-wrap" }}>
                        {n.texto}
                      </p>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => { setEditandoId(n.id); setTextoEdicion(n.texto); }}
                          style={miniBtn(false)}
                        >Editar</button>
                        <button
                          type="button" onClick={() => borrar(n.id)}
                          disabled={ocupadoAqui}
                          style={{ ...miniBtn(ocupadoAqui), color: T.danger, borderColor: "#F5C2C2" }}
                        >{ocupadoAqui ? "..." : "Eliminar"}</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <textarea
        value={nuevaNota} rows={2}
        onChange={e => setNuevaNota(e.target.value)}
        placeholder="Escribe una nota y agrégala..."
        style={{
          width: "100%", padding: "7px 9px", border: `1px solid ${T.border}`, borderRadius: 8,
          fontSize: 12, color: T.inkStrong, background: "#fff", outline: "none",
          boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <button
          type="button" onClick={agregar} disabled={guardandoNueva || !nuevaNota.trim()}
          style={miniBtn(guardandoNueva || !nuevaNota.trim())}
        >{guardandoNueva ? "Agregando..." : "+ Agregar nota"}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function RutaProcesos({
  componentes, onUpdateComponentes, materiales, onUpdateMateriales, catalogs, nombreProducto,
  procesosCat, errorProcesos, idproducto, notasPendientes, onNotasPendientesChange,
  tamanoAsaDefault, onTamanoAsaDefaultChange, addItem, imagenProductoUrl,
  imagenProductoIdArchivo,
}: {
  componentes: ComponentePapel[];
  onUpdateComponentes: (componentes: ComponentePapel[]) => void;
  materiales: MaterialEntry[];
  onUpdateMateriales: (materiales: MaterialEntry[]) => void;
  catalogs: Catalogs;
  nombreProducto: string;
  procesosCat: ProcesoCatOpcion[];
  errorProcesos: string;
  // Permite dar de alta un valor nuevo de catálogo (Laminado, Asa, ...)
  // desde los multiselect de esta pantalla, sin salir a Catálogos.
  addItem?: (key: CatKey, nombre: string) => Promise<unknown>;
  // Las notas (ver PanelNotas) se guardan contra el producto real cuando ya
  // existe. Si todavía no existe (alta nueva sin guardar) se acumulan en
  // memoria via notasPendientes y se guardan en cuanto se cree el producto.
  idproducto: number | null;
  notasPendientes: string[];
  onNotasPendientesChange: (notas: string[]) => void;
  // "Medida" que se pide dentro del proceso de Laminación: en realidad es
  // el tamaño del asa (campo de producto, ya existente en la base como
  // producto_papel.tamano_asa_default) -- se captura aquí porque es donde
  // tiene sentido para el usuario, no porque sea un dato del componente
  // (Jose: "es el largo de la asa, el tamaño de asa").
  tamanoAsaDefault: string;
  onTamanoAsaDefaultChange: (v: string) => void;
  // Imagen real del producto (la que se sube en el campo "Imagen del
  // producto" del encabezado) -- si existe, la tarjeta "Producto terminado"
  // la muestra en vez del dibujo genérico de caja. Puede ser la URL ya
  // subida o una preview local (blob:) mientras el producto todavía no
  // existe. null/undefined = no hay imagen todavía, se usa el dibujo.
  imagenProductoUrl?: string | null;
  // id del archivo en la tabla `archivos`, para poder bajar la imagen YA
  // GUARDADA por la API en vez de por la URL firmada de S3 (que CORS no deja
  // leer). Solo se usa para exportar el diagrama; la pantalla sigue pintando
  // la foto con imagenProductoUrl, que para MOSTRAR sí funciona.
  imagenProductoIdArchivo?: number | null;
}) {
  const errorCat = errorProcesos;
  const [compacta, setCompacta] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);

  // NUEVO (Jose, 2026-09-02): al agregar un proceso, la tarjeta se abre
  // más abajo y había que bajar manualmente para verla. En vez de eso, se
  // centra sola en pantalla apenas se abre -- ya sea porque se acaba de
  // agregar (ver agregarProceso) o porque el usuario la abrió a mano.
  useEffect(() => {
    if (abierto == null) return;
    const el = document.querySelector(`[data-proceso-card="${abierto}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [abierto]);
  // Antes se anclaba con position:absolute dentro de la tarjeta -- el
  // contenedor de las OP tiene overflowX:"auto" para el scroll horizontal, y
  // eso hace que el navegador también recorte el eje vertical (así funciona
  // la spec de overflow), así que el menú de procesos aparecía cortado o
  // empujado por debajo del recuadro en vez de pegado al botón (Jose). Ahora
  // se guarda la posición real del botón (getBoundingClientRect) y el menú
  // se manda por portal a document.body con position:fixed, fuera de ese
  // contenedor, así ya no lo recorta nada.
  const [eligiendoEn, setEligiendoEn] = useState<{ id: number; top: number; left: number; width: number } | null>(null);
  // Botón "Previsualizar": abre la ruta completa en pantalla completa para
  // verla sin que el módulo quede achicado dentro del layout normal (Jose).
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  const catPorId = useMemo(() => {
    const m = new Map<number, ProcesoCatOpcion>();
    procesosCat.forEach(p => m.set(p.idproceso_cat, p));
    return m;
  }, [procesosCat]);

  // ── Orden canónico de la ruta ────────────────────────────────────────
  // Jose (2026-09-03): la ruta se tiene que acomodar SOLA en este orden sin
  // importar en qué secuencia se hayan ido agregando los procesos al dar de
  // alta -- antes solo existía una regla dura (Litolaminado siempre antes de
  // Suaje); ahora es un orden completo y agregar un proceso siempre
  // reacomoda la lista entera, no solo lo inserta en su hueco.
  //
  // Coincide con ORDEN_CLAVES_PAPEL en procesosPapel.controller.ts (backend,
  // papel normal) salvo por dos diferencias a propósito:
  //   - aquí SÍ entra litolaminado_papel (exclusivo de especiales -- el
  //     backend lo excluye porque nunca aplica a papel normal), colocado
  //     antes de suaje: es donde se juntan las piezas, suajear antes de
  //     litolaminar no tiene sentido físico (regla ya existente).
  //   - pegado_papel YA NO aparece: Jose confirmó que Pegado y Empaque son
  //     el mismo proceso en la práctica, así que se quitó como proceso
  //     seleccionable (ver "armado_papel" más abajo, que ahora captura
  //     opcionalmente qué se pega) -- se deja fuera de este orden a
  //     propósito para que ya no se pueda agregar.
  const ORDEN_CANONICO_TABLAS: string[] = [
    "hojeado_papel", "guillotina_papel", "impresion_papel", "laminacion_papel",
    "barniz_uv_papel", "hot_stamping_papel", "texturizado_papel", "alto_relieve_papel",
    "litolaminado_papel", "suaje_produccion_papel", "desbarbe_papel", "armado_papel",
    "especial_papel", "empaque_papel",
  ];

  const tablaDe = (p: ComponenteProceso): string =>
    (p.idproceso_cat != null ? catPorId.get(p.idproceso_cat)?.tabla : undefined) ?? "";

  // Procesos que no están en el orden canónico (por ejemplo uno viejo ya
  // capturado, como pegado_papel en una orden previa a este cambio) se
  // quedan al final, en el orden relativo en que ya estaban -- no
  // desaparecen ni truenan, solo no participan del reacomodo automático.
  const indiceCanonico = (tabla: string): number => {
    const i = ORDEN_CANONICO_TABLAS.indexOf(tabla);
    return i === -1 ? ORDEN_CANONICO_TABLAS.length : i;
  };

  // Reacomoda TODA la lista según el orden canónico -- no solo inserta el
  // nuevo en su hueco. Estable (Array.prototype.sort en V8/Node es estable
  // desde ES2019) para que dos procesos con el mismo índice canónico (o dos
  // "no reconocidos") no se brinquen entre sí sin motivo.
  const ordenarCanonico = (lista: ComponenteProceso[]): ComponenteProceso[] =>
    [...lista].sort((a, b) => indiceCanonico(tablaDe(a)) - indiceCanonico(tablaDe(b)));

  const renumerar = (lista: ComponenteProceso[]): ComponenteProceso[] =>
    lista.map((p, i) => ({ ...p, orden: i + 1 }));

  const unica = componentes.find(c => c.tipo === "unica") ?? null;
  const inicios = componentes.filter(c => c.tipo === "inicio");
  const union = componentes.find(c => c.tipo === "union") ?? null;
  // 🔁 FASE 4: OPC (Orden de Producción Complementaria) -- nivel(es)
  // intermedio(s) opcionales. No participan de la geometría del diagrama
  // medido de abajo (eso sigue siendo solo inicios→unión, ver geomFlujo);
  // se renderizan aparte, en su propia columna, más adelante.
  const opcs = componentes.filter(c => c.tipo === "complementaria");

  // 🔁 FASE 4 (Jose, 2026-09-08: "si una OPC depende de otra OPC, que la OPC
  // se ponga frente de la OPC padre o principal"): las OPC ya no van todas
  // en una sola columna, sino una columna por NIVEL del árbol. Nivel 1 =
  // alimenta directo a la unión (queda pegada a ella, hasta la derecha);
  // nivel 2 = alimenta a una OPC de nivel 1, y por lo tanto se dibuja ANTES
  // que ella; y así hasta donde el usuario quiera anidar. Así el flujo se
  // lee siempre de izquierda a derecha y las líneas nunca tienen que
  // regresarse.
  const columnasOPC: ComponentePapel[][] = (() => {
    const porNivel = new Map<number, ComponentePapel[]>();
    opcs.forEach(c => {
      const n = nivelOPC(c, componentes);
      porNivel.set(n, [...(porNivel.get(n) ?? []), c]);
    });
    return [...porNivel.entries()].sort((a, b) => b[0] - a[0]).map(([, lista]) => lista);
  })();

  // ── Conectores del diagrama (medidos, en forma de llave/corchete) ────────
  // Las OP de inicio se apilan en una sola columna (son independientes entre
  // sí -- pueden arrancar todas al mismo tiempo, no una tras otra -- así que
  // Jose pidió que se vieran "encimadas", no en columnas horizontales). El
  // contenedor centra verticalmente con CSS (align-items: center) al Punto
  // de Unión y a la OP de Unión contra el alto total de la pila, así que ya
  // no hace falta calcular un marginTop a mano: solo se miden las tarjetas
  // reales para dibujar las líneas de la llave (una pata por OP de inicio,
  // convergiendo en una barra vertical que sale, ya centrada, hacia el Punto
  // de Unión).
  const contenedorFlujoRef = useRef<HTMLDivElement>(null);
  const inicioCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const puntoUnionCardRef = useRef<HTMLDivElement>(null);
  const unionCardRef = useRef<HTMLDivElement>(null);
  const [geomFlujo, setGeomFlujo] = useState<{
    ancho: number;
    alto: number;
    trunkX: number;
    stubsInicio: { x: number; y: number }[];
    spineTop: number;
    spineBottom: number;
    entradaPunto: { x: number; y: number } | null;
    salidaPunto: { x: number; y: number } | null;
    entradaUnion: { x: number; y: number } | null;
  } | null>(null);

  useLayoutEffect(() => {
    // 🔁 FASE 4 (Jose, 2026-09-08): esta llave asume que TODAS las OP de
    // inicio van directo a la unión -- deja de ser cierto en cuanto hay una
    // OPC (puede que alguna alimente a la OPC en su lugar). Con al menos
    // una OPC se usa geomArbol/overlayArbol en su lugar (líneas
    // individuales por cada padre real). Sin ninguna OPC, esta llave se
    // queda exactamente como estaba (cero riesgo para el caso de siempre).
    if (unica || !union || inicios.length === 0 || opcs.length > 0) { setGeomFlujo(null); return; }
    const contenedor = contenedorFlujoRef.current;
    if (!contenedor) return;

    const recalcular = () => {
      const contRect = contenedor.getBoundingClientRect();
      // Mismo ajuste de scroll que en geomArbol (ver más abajo): el SVG vive
      // dentro del contenedor con overflow:auto, así que las coordenadas
      // tienen que ser del CONTENIDO, no de la parte visible.
      const relativo = (r: DOMRect) => ({
        top: r.top - contRect.top + contenedor.scrollTop,
        left: r.left - contRect.left + contenedor.scrollLeft,
        right: r.right - contRect.left + contenedor.scrollLeft,
        bottom: r.bottom - contRect.top + contenedor.scrollTop,
      });

      const tarjetasInicio = inicios
        .map(c => inicioCardRefs.current.get(c.id))
        .filter((el): el is HTMLDivElement => !!el)
        .map(el => relativo(el.getBoundingClientRect()));
      if (tarjetasInicio.length === 0) { setGeomFlujo(null); return; }

      // Barra vertical de la llave: justo a la mitad del hueco después de
      // las tarjetas de inicio (todas miden 206 de ancho + 74 de hueco).
      const trunkX = Math.max(...tarjetasInicio.map(r => r.right)) + 37;
      const stubsInicio = tarjetasInicio.map(r => ({ x: r.right, y: (r.top + r.bottom) / 2 }));
      const spineTop = Math.min(...stubsInicio.map(p => p.y));
      const spineBottom = Math.max(...stubsInicio.map(p => p.y));
      const spineMid = (spineTop + spineBottom) / 2;

      let entradaPunto: { x: number; y: number } | null = null;
      let salidaPunto: { x: number; y: number } | null = null;
      if (puntoUnionCardRef.current) {
        const r = relativo(puntoUnionCardRef.current.getBoundingClientRect());
        const centroY = (r.top + r.bottom) / 2;
        entradaPunto = { x: r.left, y: centroY };
        salidaPunto = { x: r.right, y: centroY };
      }

      let entradaUnion: { x: number; y: number } | null = null;
      if (unionCardRef.current) {
        const r = relativo(unionCardRef.current.getBoundingClientRect());
        entradaUnion = { x: r.left, y: (r.top + r.bottom) / 2 };
      }

      setGeomFlujo({
        ancho: contenedor.scrollWidth,
        alto: contenedor.scrollHeight,
        trunkX,
        stubsInicio,
        spineTop,
        spineBottom,
        entradaPunto,
        salidaPunto,
        entradaUnion,
      });
    };

    recalcular();
    // Se observa el contenedor Y cada tarjeta por separado: si una tarjeta
    // que no es la más alta cambia de tamaño (se abre un proceso, se agrega
    // uno nuevo...) el contenedor completo puede no cambiar de alto, pero esa
    // tarjeta sí se movió y su línea necesita recalcularse igual.
    const ro = new ResizeObserver(recalcular);
    ro.observe(contenedor);
    inicioCardRefs.current.forEach(el => ro.observe(el));
    if (puntoUnionCardRef.current) ro.observe(puntoUnionCardRef.current);
    if (unionCardRef.current) ro.observe(unionCardRef.current);
    window.addEventListener("resize", recalcular);
    return () => { ro.disconnect(); window.removeEventListener("resize", recalcular); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicios.length, opcs.length, union, unica, materiales, componentes, compacta, pantallaCompleta]);

  const overlayConectores = geomFlujo && (
    <svg
      width={geomFlujo.ancho} height={geomFlujo.alto}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <defs>
        <marker id="flechaConectorFlujo" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={T.dash} />
        </marker>
      </defs>
      {/* Patas de la llave: una por cada OP de inicio, del borde de su
          tarjeta a la barra vertical. */}
      {geomFlujo.stubsInicio.map((p, i) => (
        <path
          key={i}
          d={`M ${p.x} ${p.y} H ${geomFlujo.trunkX}`}
          stroke={T.dash} strokeWidth={1.7} strokeDasharray="7 6" strokeLinecap="round" fill="none"
        />
      ))}
      {/* La barra vertical de la llave (solo visible con 2+ OP de inicio). */}
      {geomFlujo.spineBottom > geomFlujo.spineTop && (
        <path
          d={`M ${geomFlujo.trunkX} ${geomFlujo.spineTop} V ${geomFlujo.spineBottom}`}
          stroke={T.dash} strokeWidth={1.7} strokeDasharray="7 6" strokeLinecap="round" fill="none"
        />
      )}
      {/* Salida de la llave, desde su centro exacto, al Punto de Unión. Con
          align-items:center el Punto de Unión ya debería quedar a la misma
          altura que el centro de la llave, pero por si acaso hay un pequeño
          desnivel, se corrige con un tramo vertical corto antes de entrar. */}
      {geomFlujo.entradaPunto && (
        <path
          d={`M ${geomFlujo.trunkX} ${(geomFlujo.spineTop + geomFlujo.spineBottom) / 2} H ${geomFlujo.entradaPunto.x - 14} V ${geomFlujo.entradaPunto.y} H ${geomFlujo.entradaPunto.x}`}
          stroke={T.dash} strokeWidth={1.7} strokeDasharray="7 6" strokeLinecap="round" fill="none"
          markerEnd="url(#flechaConectorFlujo)"
        />
      )}
      {geomFlujo.salidaPunto && geomFlujo.entradaUnion && (
        <path
          d={`M ${geomFlujo.salidaPunto.x} ${geomFlujo.salidaPunto.y} H ${(geomFlujo.salidaPunto.x + geomFlujo.entradaUnion.x) / 2} V ${geomFlujo.entradaUnion.y} H ${geomFlujo.entradaUnion.x}`}
          stroke={T.dash} strokeWidth={1.7} strokeDasharray="7 6" strokeLinecap="round" fill="none"
          markerEnd="url(#flechaConectorFlujo)"
        />
      )}
    </svg>
  );

  // ── Hojeado / Guillotina según el método de preparación del material ──
  // "+ Agregar proceso" solo debe ofrecer el que corresponde a lo que se
  // eligió en Preparación (Hojeado o Guillotina) para el/los materiales de
  // esa OP, no los dos (Jose). Si hay materiales con métodos distintos, o
  // ninguno capturado, no se filtra nada. El checkbox "Lleva guillotina"
  // dentro del detalle de Hojeado es la única forma de tener ambos en la
  // misma OP (ver DetalleProceso).
  // Ordena SIEMPRE según ORDEN_CANONICO_TABLAS antes de devolver -- mismo
  // orden que Seguimiento, sin importar en qué orden venga procesosCat del
  // backend (Jose, 2026-09-03).
  const ordenarCatalogoCanonico = (lista: ProcesoCatOpcion[]): ProcesoCatOpcion[] =>
    [...lista].sort((a, b) => indiceCanonico(a.tabla) - indiceCanonico(b.tabla));

  const filtrarPorPreparacion = (comp: ComponentePapel, lista: ProcesoCatOpcion[]): ProcesoCatOpcion[] => {
    // ✅ NUEVO (Jose, 2026-09-05): "Empaquetado" siempre va en la OP de
    // unión -- es la orden principal, la última por la que pasa todo el
    // producto -- así que ahí ya no se puede elegir a mano: se engancha
    // solo al último proceso real de esa ruta (ver asegurarAnclaEmpaquePapel
    // en bultos.controller.ts y esUltimoProceso en
    // ModalProcesoIndividualEspecial.tsx). Una OP "única" (sin unión
    // separada) es igual de terminal que la unión, así que se trata igual.
    // Solo una OP de inicio puede seguir agregándolo a mano, para los casos
    // que sí necesitan empaquetarse por separado antes de llegar a unión.
    const listaBase = (comp.tipo === "union" || comp.tipo === "unica")
      ? lista.filter(p => p.tabla !== "empaque_papel")
      : lista;

    const metodos = new Set(
      materiales.filter(m => m.idComponenteAsignado === comp.id).map(m => m.metodoPreparacion).filter(Boolean)
    );
    if (metodos.size !== 1) return ordenarCatalogoCanonico(listaBase);
    const metodo = [...metodos][0];
    // "Proveedor" (Jose, 2026-09-02): el material ya llega al tamaño exacto
    // -- lo compran así o se lo entrega quien pidió el producto -- así que
    // ni Hojeado ni Guillotina aplican, ninguno de los dos se ofrece.
    if (metodo === "proveedor") {
      return ordenarCatalogoCanonico(listaBase.filter(p => p.tabla !== "hojeado_papel" && p.tabla !== "guillotina_papel"));
    }
    const tablaExcluida = metodo === "hojeadora" ? "guillotina_papel"
      : metodo === "guillotina" ? "hojeado_papel" : null;
    return ordenarCatalogoCanonico(tablaExcluida ? listaBase.filter(p => p.tabla !== tablaExcluida) : listaBase);
  };

  // ── Arrastrar tarjetas OP INICIO para reordenarlas ─────────────────────
  // Los procesos dentro de cada OP son lineales y no se arrastran (Jose):
  // lo único que se puede reordenar arrastrando son las tarjetas OP INICIO
  // entre sí. La unión y "misma orden" no se arrastran (solo hay una).
  const [arrastrandoId, setArrastrandoId] = useState<number | null>(null);
  const [sobreId, setSobreId] = useState<number | null>(null);

  const reordenarInicios = (idArrastrado: number, idDestino: number) => {
    if (idArrastrado === idDestino) return;
    const actuales = componentes.filter(c => c.tipo === "inicio");
    const iOrigen = actuales.findIndex(c => c.id === idArrastrado);
    const iDestino = actuales.findIndex(c => c.id === idDestino);
    if (iOrigen < 0 || iDestino < 0) return;
    const copia = [...actuales];
    const [item] = copia.splice(iOrigen, 1);
    copia.splice(iDestino, 0, item);
    // Se reinsertan en las mismas posiciones que ya ocupaban los "inicio"
    // dentro de componentes, sin tocar el resto (unión, etc.).
    let cursor = 0;
    onUpdateComponentes(componentes.map(c => (c.tipo === "inicio" ? copia[cursor++] : c)));
  };
  const totalProcesos = componentes.reduce((n, c) => n + c.procesos.length, 0);

  // ═══════════════════════════════════════════════════════════════════════
  // OPC: conexión visual del árbol desde Ruta de procesos (Jose, 2026-09-08)
  // ═══════════════════════════════════════════════════════════════════════
  // Antes solo se podía armar el árbol (a qué alimenta cada OP de inicio o
  // cada OPC) desde el desplegable de "Estructura del árbol" en
  // MaterialesAsignacion.tsx. Jose pidió que también se pudiera hacer aquí,
  // de forma visual: tocar "alimenta a: ..." bajo una OP de inicio o una
  // OPC arranca el "modo conexión"; mientras está activo, cualquier OPC o
  // la OP de unión que sea un destino válido para ESA orden (sin formar un
  // ciclo -- misma regla de destinosValidosPara que ya usa "Estructura del
  // árbol", y que el trigger de BD vuelve a validar del lado del servidor)
  // se resalta con un contorno y una etiqueta "Conectar aquí"; tocarla
  // completa la conexión (cambiarPadre) y cierra el modo. Se puede cancelar
  // tocando de nuevo la etiqueta de origen o el botón "Cancelar" del aviso.
  //
  // "OPC ilimitadas y anidables" (Jose): agregarOPC/eliminarOPC/cambiarPadre
  // son las MISMAS funciones (a nivel de módulo, sin estado propio) que ya
  // usa "Estructura del árbol" -- se les pasa componentes/materiales y los
  // callbacks de actualización de aquí, así que ambas pantallas quedan
  // siempre sincronizadas sin duplicar la lógica de árbol/ciclos.
  const [conectandoDesdeId, setConectandoDesdeId] = useState<number | null>(null);
  const origenConexion = conectandoDesdeId != null
    ? componentes.find(c => c.id === conectandoDesdeId) ?? null
    : null;

  const agregarOPCAqui = () => agregarOPC(componentes, onUpdateComponentes);
  const eliminarOPCAqui = (id: number) => {
    eliminarOPC(id, componentes, materiales, onUpdateComponentes, onUpdateMateriales);
    setConectandoDesdeId(v => (v === id ? null : v));
  };
  const conectarA = (destinoId: number) => {
    if (conectandoDesdeId == null) return;
    cambiarPadre(conectandoDesdeId, destinoId, componentes, onUpdateComponentes);
    setConectandoDesdeId(null);
  };

  // Botón DENTRO de la tarjeta, en la esquina superior izquierda (Jose,
  // 2026-09-08: "el botón que te pedí reubicar sigue estando debajo y fuera
  // del cuadro de la OP cuando tiene que encontrarse en la esquina superior
  // izquierda algo como '->'"). Va sobre el encabezado de color de la
  // TarjetaOP -- del lado opuesto al asa de arrastre, que vive en la esquina
  // superior derecha -- anclado al contenedor position:relative que envuelve
  // cada TarjetaOP (ver los .map() de abajo).
  //
  // A dónde alimenta ya NO se escribe aquí: eso ahora se ve en la línea
  // punteada que sale de la tarjeta y apunta a su destino (overlayArbol). El
  // botón solo dispara/cancela el modo conexión, y deja el nombre del
  // destino en el tooltip por si la línea no alcanza a leerse.
  const botonAlimentaA = (comp: ComponentePapel) => {
    const destino = componentes.find(c => c.id === comp.idComponentePadre);
    const esOrigenActivo = conectandoDesdeId === comp.id;
    return (
      <button
        type="button"
        onClick={() => setConectandoDesdeId(v => (v === comp.id ? null : comp.id))}
        title={esOrigenActivo
          ? "Cancelar: toca aquí de nuevo, o toca el destino resaltado"
          : `Alimenta a: ${destino ? etiquetaComponente(destino, componentes) : "—"} — toca para cambiarlo`}
        style={{
          position: "absolute", top: 7, left: 7, width: 24, height: 24, borderRadius: 8,
          display: "grid", placeItems: "center", padding: 0, zIndex: 2,
          fontSize: 13, fontWeight: 700, lineHeight: 1, fontFamily: "inherit", cursor: "pointer",
          border: `1px solid ${esOrigenActivo ? T.primary : T.border}`,
          background: esOrigenActivo ? T.primary : "#fff",
          color: esOrigenActivo ? "#fff" : T.inkStrong,
          boxShadow: T.shadow,
        }}
      >
        →
      </button>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Líneas de conexión reales del árbol (Jose, 2026-09-08: "tiene que
  // reubicarse en toda la ruta"): en cuanto hay al menos una OPC, la llave
  // medida de arriba (geomFlujo) ya no aplica -- esa asume que TODAS las OP
  // de inicio van directo a la unión, y con OPC eso ya no es cierto (puede
  // que una alimente a una OPC en vez de a la unión). En su lugar se mide,
  // para cada OP de inicio y cada OPC, una línea punteada individual hacia
  // SU padre real (idComponentePadre) -- inicio→OPC, inicio→unión, OPC→OPC
  // u OPC→unión, cualquier combinación y cualquier nivel de anidamiento. Se
  // recalculan solas cuando cambia el árbol o el tamaño de cualquier
  // tarjeta (mismo patrón que geomFlujo, con ResizeObserver).
  //
  // Cuando NO hay ninguna OPC, este overlay se apaga (geomArbol = null) y
  // se sigue usando geomFlujo/overlayConectores tal cual, sin ningún riesgo
  // para el caso de siempre (2 niveles, inicio→unión).
  // ═══════════════════════════════════════════════════════════════════════
  const opcCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [geomArbol, setGeomArbol] = useState<{ ancho: number; alto: number; lineas: { id: number; d: string }[] } | null>(null);

  const elDeComponente = (comp: ComponentePapel): HTMLDivElement | null => {
    if (comp.tipo === "inicio") return inicioCardRefs.current.get(comp.id) ?? null;
    if (comp.tipo === "complementaria") return opcCardRefs.current.get(comp.id) ?? null;
    if (comp.tipo === "union") return unionCardRef.current;
    return null;
  };

  useLayoutEffect(() => {
    if (unica || opcs.length === 0) { setGeomArbol(null); return; }
    const contenedor = contenedorFlujoRef.current;
    if (!contenedor) return;

    const origenes = [...inicios, ...opcs].filter(c => c.idComponentePadre != null);

    const recalcular = () => {
      const contRect = contenedor.getBoundingClientRect();
      // CORREGIDO (Jose, 2026-09-08: "las flechas siguen sin reubicarse"):
      // el contenedor del diagrama tiene overflow:auto, y el SVG va con
      // position:absolute DENTRO de él -- o sea que se desplaza junto con el
      // contenido. getBoundingClientRect() en cambio devuelve coordenadas de
      // la parte VISIBLE, así que sin sumarle el scroll las líneas quedaban
      // corridas justo lo que el usuario hubiera desplazado el diagrama a lo
      // ancho (que es casi siempre: con una OPC de por medio, el flujo ya no
      // cabe en el ancho del formulario). Sumando scrollLeft/scrollTop las
      // coordenadas quedan en el mismo espacio que el SVG y las flechas caen
      // exactamente en el borde de la tarjeta a la que apuntan.
      const relativo = (r: DOMRect) => ({
        top: r.top - contRect.top + contenedor.scrollTop,
        left: r.left - contRect.left + contenedor.scrollLeft,
        right: r.right - contRect.left + contenedor.scrollLeft,
        bottom: r.bottom - contRect.top + contenedor.scrollTop,
      });

      // Se miden TODAS las tarjetas una sola vez: cada una es a la vez
      // posible extremo de una línea y obstáculo para las demás (Jose,
      // 2026-09-08: que las flechas no queden por debajo de los componentes).
      const rects = new Map<number, RectRuta>();
      [...inicios, ...opcs, ...(union ? [union] : [])].forEach(c => {
        const el = elDeComponente(c);
        if (el) rects.set(c.id, relativo(el.getBoundingClientRect()));
      });
      const todas = [...rects.values()];

      const lineas: { id: number; d: string }[] = [];
      origenes.forEach(comp => {
        const destino = componentes.find(c => c.id === comp.idComponentePadre);
        const rOrigen = rects.get(comp.id);
        const rDestino = destino ? rects.get(destino.id) : undefined;
        if (!rOrigen || !rDestino) return;
        // Obstáculos = todas menos las dos puntas (a esas sí tiene que tocarlas).
        const obst = [...rects.entries()]
          .filter(([id]) => id !== comp.id && id !== destino!.id)
          .map(([, r]) => r);
        lineas.push({ id: comp.id, d: caminoDesdePuntos(rutaOrtogonal(rOrigen, rDestino, obst, todas)) });
      });
      setGeomArbol({ ancho: contenedor.scrollWidth, alto: contenedor.scrollHeight, lineas });
    };

    recalcular();
    const ro = new ResizeObserver(recalcular);
    ro.observe(contenedor);
    inicioCardRefs.current.forEach(el => ro.observe(el));
    opcCardRefs.current.forEach(el => ro.observe(el));
    if (unionCardRef.current) ro.observe(unionCardRef.current);
    window.addEventListener("resize", recalcular);
    return () => { ro.disconnect(); window.removeEventListener("resize", recalcular); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicios.length, opcs.length, union, unica, componentes, compacta, pantallaCompleta]);

  const overlayArbol = geomArbol && (
    <svg
      width={geomArbol.ancho} height={geomArbol.alto}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <defs>
        <marker id="flechaConectorArbol" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={T.dash} />
        </marker>
      </defs>
      {geomArbol.lineas.map(l => (
        <path
          key={l.id}
          d={l.d}
          stroke={T.dash} strokeWidth={1.7} strokeDasharray="7 6" strokeLinecap="round" fill="none"
          markerEnd="url(#flechaConectorArbol)"
        />
      ))}
    </svg>
  );

  // ── mutaciones ──────────────────────────────────────────────────────────
  const parcharComp = (id: number, patch: Partial<ComponentePapel>) =>
    onUpdateComponentes(componentes.map(c => (c.id === id ? { ...c, ...patch } : c)));

  const parcharMaquinaria = (comp: ComponentePapel, patch: Record<string, number[] | string[]>) =>
    parcharComp(comp.id, { maquinaria: { ...comp.maquinaria, ...patch } });

  const parcharMaterial = (id: number, patch: Partial<MaterialEntry>) =>
    onUpdateMateriales(materiales.map(m => (m.id === id ? { ...m, ...patch } : m)));

  const parcharProceso = (comp: ComponentePapel, procesoId: number, patch: Partial<ComponenteProceso>) =>
    parcharComp(comp.id, { procesos: comp.procesos.map(p => (p.id === procesoId ? { ...p, ...patch } : p)) });

  // Procesos cuyo acabado "lleva X" ya no se pregunta con checkbox: con
  // agregarlos a la ruta basta para marcarlo (Jose). Al quitarlos, se
  // desmarca igual, para no dejar un acabado "encendido" sin su proceso.
  const TABLA_A_LLEVA: Partial<Record<string, keyof Acabados>> = {
    barniz_uv_papel: "llevaUv",
    hot_stamping_papel: "llevaHotStamping",
    texturizado_papel: "llevaTextura",
    alto_relieve_papel: "llevaAltoRelieve",
  };

  // Jose (2026-09-04): el proceso se agrega DONDE VA EN LA FILA, al final, y de
  // ahí el usuario lo mueve arrastrando. Ya NO se reacomoda solo al orden
  // canónico -- ese acomodo ahora es un botón ("Acomodar") que se pide a mano,
  // porque el orden real de la ruta lo decide quien la arma, no el catálogo.
  //
  // Y ya NO se impide agregar un proceso que ya está en la ruta: agregarlo otra
  // vez ES la forma de repetirlo (antes era el campo "veces"). Cada tarjeta es
  // una pasada independiente, con su material, su máquina y su posición.
  const agregarProceso = (comp: ComponentePapel, cat: ProcesoCatOpcion) => {
    const nuevo = newComponenteProceso();
    nuevo.idproceso_cat = cat.idproceso_cat;
    nuevo.procesoNombre = nombreCortoProceso(cat.tabla, cat.nombre_proceso);
    nuevo.orden = comp.procesos.length + 1;
    const refs = refsDeComponente(materiales, comp.id);
    if (refs.length === 1) nuevo.materiales = [refs[0].id];
    const campoLleva = TABLA_A_LLEVA[cat.tabla];
    parcharComp(comp.id, {
      procesos: renumerar([...comp.procesos, nuevo]),
      ...(campoLleva ? { acabados: { ...comp.acabados, [campoLleva]: true } } : {}),
    });
    setEligiendoEn(null);
    setAbierto(nuevo.id);
  };

  const quitarProceso = (comp: ComponentePapel, procesoId: number) => {
    const proceso = comp.procesos.find(p => p.id === procesoId);
    const tabla = proceso?.idproceso_cat != null ? catPorId.get(proceso.idproceso_cat)?.tabla : undefined;
    const campoLleva = tabla ? TABLA_A_LLEVA[tabla] : undefined;
    const restantes = comp.procesos.filter(p => p.id !== procesoId);
    // Con procesos repetidos, el acabado solo se apaga cuando se va la ÚLTIMA
    // ocurrencia. Si todavía queda otra tarjeta del mismo proceso en la ruta,
    // el acabado sigue encendido -- si no, quitar la 2ª pasada de Barniz UV
    // apagaría el acabado dejando viva la 1ª (Jose, 2026-09-04).
    const quedaOtra = tabla != null && restantes.some(
      p => (p.idproceso_cat != null ? catPorId.get(p.idproceso_cat)?.tabla : undefined) === tabla
    );
    parcharComp(comp.id, {
      procesos: renumerar(restantes),
      ...(campoLleva && !quedaOtra ? { acabados: { ...comp.acabados, [campoLleva]: false } } : {}),
    });
  };

  // ── Reordenar procesos DENTRO de una ruta (arrastrar y soltar) ──────────
  // Jose (2026-09-04): antes los procesos de una OP eran lineales y no se
  // movían; ahora se toman y se sueltan en otra posición de su propia ruta.
  // Solo se mueven entre procesos de la MISMA OP -- una tarjeta no se puede
  // pasar a otra OP arrastrándola.
  const reordenarProcesos = (comp: ComponentePapel, idArrastrado: number, idDestino: number) => {
    if (idArrastrado === idDestino) return;
    const iOrigen = comp.procesos.findIndex(p => p.id === idArrastrado);
    const iDestino = comp.procesos.findIndex(p => p.id === idDestino);
    if (iOrigen < 0 || iDestino < 0) return;
    const copia = [...comp.procesos];
    const [item] = copia.splice(iOrigen, 1);
    copia.splice(iDestino, 0, item);
    parcharComp(comp.id, { procesos: renumerar(copia) });
  };

  // Acomoda UNA ruta al orden canónico, a petición del usuario (botón
  // "Acomodar"). Es lo que antes pasaba solo en cada alta de proceso.
  const acomodarRuta = (comp: ComponentePapel) => {
    parcharComp(comp.id, { procesos: renumerar(ordenarCanonico(comp.procesos)) });
  };

  // ¿Esta ruta ya está en orden canónico? Sirve para no ofrecer "Acomodar"
  // cuando no cambiaría nada.
  const rutaYaAcomodada = (comp: ComponentePapel): boolean => {
    const actual = comp.procesos.map(p => p.id).join(",");
    const ordenada = ordenarCanonico(comp.procesos).map(p => p.id).join(",");
    return actual === ordenada;
  };

  const borrarTodo = async () => {
    if (totalProcesos === 0) return;
    const ok = await showConfirm("Se van a quitar TODOS los procesos de la ruta. ¿Continuar?");
    if (!ok) return;
    onUpdateComponentes(componentes.map(c => ({ ...c, procesos: [] })));
  };

  // ── Exportar la ruta como diagrama ──────────────────────────────────────
  // Jose (2026-09-04): un archivo con la ruta de flujo, para abrirlo en el
  // navegador, mandarlo o imprimirlo sin entrar al sistema. El SVG es el
  // "bueno" (texto real, se puede acercar sin pixelearse); el PNG es para
  // pegarlo donde no acepten SVG (WhatsApp, Word, un correo).
  // Convierte un componente a la tarjeta que dibuja el SVG. Es EXACTAMENTE lo
  // que se ve en pantalla: mismo encabezado, misma descripción, mismo material,
  // los mismos procesos en el mismo orden y con los mismos colores. Además se
  // lleva el resumen de cada proceso (`detalleCorto`, el mismo texto que sale
  // bajo el nombre en la tarjeta) para la sección de información de abajo.
  const tarjetaParaSvg = (c: ComponentePapel): TarjetaSvg => {
    const pasadas = etiquetasPasada(c.procesos, catPorId);
    const refs = refsDeComponente(materiales, c.id);
    const pal = paletaOP(c.tipo, indicePaleta(c, componentes));
    return {
      titulo: etiquetaComponente(c, componentes),
      descripcion: (c.nombre ?? "").trim(),
      material: refs.length === 0
        ? (["union", "complementaria"].includes(c.tipo) ? "(usa las piezas de sus órdenes de origen)" : "(sin material asignado)")
        : `(Material: ${refs.map(r => r.etiqueta).join(", ")})`,
      procesos: c.procesos.map(p => {
        const cat = p.idproceso_cat != null ? catPorId.get(p.idproceso_cat) : undefined;
        // Mismo criterio que en las tarjetas en pantalla: el catálogo por
        // tabla gana sobre procesoNombre, para que el diagrama tampoco
        // arrastre un nombre crudo atrapado en un borrador viejo.
        const nombre = (cat ? nombreCortoProceso(cat.tabla, cat.nombre_proceso) : null) || p.procesoNombre || "—";
        const resumen = detalleCorto(p, c, cat, catalogs);
        const obs = (p.observaciones ?? "").trim();

        // Materiales y máquina por separado, resueltos igual que en
        // VistaMismaOrden: si el proceso no marcó materiales propios, hereda
        // los del componente (que es lo que muestra la pantalla).
        const usados = p.materiales.length > 0
          ? p.materiales.map(id => refDeMaterial(materiales, id))
          : refsDeComponente(materiales, c.id).map(r => r.etiqueta);
        const claveMaq = cat ? CLAVE_MAQUINA_POR_TABLA[cat.tabla] : undefined;
        const claveMaqCat = (cat ? CATALOGO_MAQUINA_POR_TABLA[cat.tabla] : undefined) ?? claveMaq;
        const idsMaq = claveMaq ? ((c.maquinaria[claveMaq] ?? []) as number[]) : [];
        const itemsMaq = claveMaqCat ? ((catalogs?.[claveMaqCat] ?? []) as CatItem[]) : [];
        const maquina = idsMaq.map(id => itemsMaq.find(x => x.id === id)?.nombre).filter(Boolean).join(" · ");

        return {
          nombre,
          pasada: (pasadas.get(p.id) ?? "").trim(),
          detalle: [resumen, obs].filter(Boolean).join(" · "),
          color: colorProceso(nombre),
          materiales: usados.length ? usados.join(" · ") : "—",
          maquina: maquina || "—",
          observaciones: obs,
        };
      }),
      paleta: { headBg: pal.headBg, headText: pal.headText },
    };
  };

  // Igual que en pantalla: si el producto tiene imagen se usa esa foto en la
  // tarjeta de PRODUCTO TERMINADO, y si no, el dibujo predeterminado. La foto
  // se embebe (data URI) para que el archivo siga siendo autocontenido.
  //
  // Se intenta en este orden, del que más probabilidad tiene al que menos:
  //   1. La que se acaba de elegir y AÚN NO SE SUBE (blob:/data:). Vive en el
  //      navegador, así que se lee directo -- aquí no hay CORS que valga.
  //   2. La que ya está guardada: por la API (fetchContenidoArchivo), NO por la
  //      URL firmada de S3. El bucket no publica Access-Control-Allow-Origin,
  //      así que leer sus bytes desde el navegador siempre falla; el servidor
  //      sí puede bajarla y reenviarla. Además así la URL firmada nunca sale
  //      del servidor y el acceso queda sujeto al token del usuario.
  //   3. Como último recurso, la URL directa. Hoy no va a pasar por CORS, pero
  //      si algún día se configura el bucket empieza a funcionar sola.
  const imagenParaDiagrama = async (): Promise<string | null> => {
    if (imagenProductoUrl && (imagenProductoUrl.startsWith("blob:") || imagenProductoUrl.startsWith("data:"))) {
      const local = await imagenAcotadaDesdeUrl(imagenProductoUrl);
      if (local) return local;
    }
    if (imagenProductoIdArchivo != null) {
      const blob = await fetchContenidoArchivo(imagenProductoIdArchivo);
      if (blob) {
        const porApi = await blobAImagenAcotada(blob);
        if (porApi) return porApi;
      }
    }
    if (imagenProductoUrl) return await imagenAcotadaDesdeUrl(imagenProductoUrl);
    return null;
  };

  const diagramaParaSvg = async (): Promise<DiagramaSvg> => ({
    nombreProducto: nombreProducto.trim(),
    inicios: inicios.map(tarjetaParaSvg),
    union: union ? tarjetaParaSvg(union) : null,
    unica: unica ? tarjetaParaSvg(unica) : null,
    imagenProducto: await imagenParaDiagrama(),
  });

  const nombreArchivoRuta = (ext: string): string => {
    const base = (nombreProducto || "").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // quita acentos
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    return `ruta-${base || "producto"}.${ext}`;
  };

  const svgDeLaRuta = async () => construirSvgRuta(await diagramaParaSvg());

  const descargarSvg = async () => {
    descargarArchivo(
      new Blob([await svgDeLaRuta()], { type: "image/svg+xml;charset=utf-8" }),
      nombreArchivoRuta("svg"),
    );
  };

  const descargarPng = async () => {
    try {
      descargarArchivo(await svgAPng(await svgDeLaRuta()), nombreArchivoRuta("png"));
    } catch {
      await showConfirm(
        "No se pudo generar la imagen PNG en este navegador. Descarga el SVG: se abre igual en el navegador y se ve mejor."
      );
    }
  };

  // ── piezas visuales ─────────────────────────────────────────────────────
  const botonesCabecera = (
    <>
      <Boton onClick={borrarTodo} disabled={totalProcesos === 0}><IcoBote /> Borrar todo</Boton>
      {/* 🔁 FASE 4: agregar OPC desde aquí mismo -- solo tiene sentido cuando
          ya existe la OP de unión (modo "órdenes independientes"). */}
      {union && (
        <Boton
          onClick={agregarOPCAqui}
          style={{ border: `1px dashed ${T.orangeBorder}`, background: T.orangeBg, color: T.orangeText }}
        >
          <span style={{ fontSize: 16, fontWeight: 400, lineHeight: 1 }}>+</span> Agregar OPC
        </Boton>
      )}
      <Boton onClick={() => setCompacta(v => !v)}><IcoLista /> {compacta ? "Vista detallada" : "Vista compacta"}</Boton>
      <Boton onClick={() => setPantallaCompleta(true)}><IcoLista /> Previsualizar</Boton>
      <Boton onClick={descargarSvg} disabled={totalProcesos === 0}><IcoFlecha ancho={16} /> Diagrama SVG</Boton>
      <Boton onClick={descargarPng} disabled={totalProcesos === 0}><IcoFlecha ancho={16} /> Diagrama PNG</Boton>
    </>
  );

  // El componente al que le corresponde el picker abierto (puede ser una OP
  // de inicio, una OPC o la de unión/única -- todas usan TarjetaOP).
  //
  // CORREGIDO (2026-09-08, reporte de Jose "ya no me permite agregar
  // procesos a la OPC"): esta lista se armó en FASE 1 (solo inicio/unión) y
  // nunca se actualizó al agregar las OPC en FASE 4 ni el modo "misma
  // orden" (unica). Como resultado, al hacer clic en "+ agregar proceso"
  // sobre una tarjeta de OPC, `eligiendoEn.id` sí se fijaba, pero esta
  // búsqueda no la encontraba entre inicios/unión -> compEligiendo quedaba
  // en null -> el picker se abría vacío/invisible (ver el early return de
  // más abajo: `if (!eligiendoEn || !compEligiendo) return null`).
  const compEligiendo = eligiendoEn
    ? [...inicios, ...opcs, ...(union ? [union] : []), ...(unica ? [unica] : [])]
        .find(c => c.id === eligiendoEn.id) ?? null
    : null;

  // El picker antes se anclaba con position:absolute DENTRO de la tarjeta,
  // adentro del contenedor con overflowX:"auto" del carrusel de OP -- por la
  // spec de overflow, poner overflow-x distinto de "visible" hace que el
  // navegador trate overflow-y como "auto" también, así que el menú
  // aparecía cortado/empujado por debajo del recuadro en vez de pegado al
  // botón (Jose). Ahora vive en un portal a document.body, con
  // position:fixed anclado a la posición real del botón que lo abrió, así
  // ese contenedor ya no lo puede recortar.
  //
  // Antes tenía un <div> invisible cubriendo TODO el viewport (position:fixed,
  // inset:0) sólo para detectar el clic-afuera-para-cerrar -- pero eso también
  // interceptaba cualquier scroll/click/drag debajo mientras el picker estaba
  // abierto, dejando la página "congelada" (Jose). Se reemplaza por el mismo
  // patrón sin overlay que usa CampoCatMulti: un ref sobre el cuadro del picker
  // + un listener de "mousedown" en document que sólo cierra si el clic cayó
  // fuera del cuadro, sin bloquear nada más. El botón "+ Agregar proceso" que
  // lo abre se centra en pantalla al hacer clic (ver su onClick más arriba),
  // igual que ya hace la tarjeta de detalle con su propio scrollIntoView.
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eligiendoEn) return;
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setEligiendoEn(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [eligiendoEn]);

  const PickerProcesos = () => {
    if (!eligiendoEn || !compEligiendo) return null;
    // Jose (2026-09-04): ya NO se filtran los procesos que ya están en la
    // ruta -- volver a elegirlos es la forma de repetirlos. Lo único que se
    // sigue filtrando es lo que no aplica por método de preparación
    // (Hojeado/Guillotina cuando el material llega del proveedor).
    const disponibles = filtrarPorPreparacion(compEligiendo, procesosCat);
    const vecesEnRuta = (idproceso_cat: number): number =>
      compEligiendo.procesos.filter(cp => cp.idproceso_cat === idproceso_cat).length;
    return createPortal(
      <div ref={pickerRef} style={{
        position: "fixed", top: eligiendoEn.top, left: eligiendoEn.left,
        width: Math.max(eligiendoEn.width, 210), zIndex: 2060,
        background: "#fff", border: `1px solid ${T.border}`, borderRadius: 9,
        boxShadow: "0 8px 24px rgba(21,42,102,.14)", padding: "4px 0",
        maxHeight: 280, overflowY: "auto",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 10px 5px", marginBottom: 2, borderBottom: `1px solid ${T.borderSoft}`,
        }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".04em" }}>
            Elige un proceso
          </span>
          <button
            type="button" onClick={() => setEligiendoEn(null)} title="Cerrar"
            style={{
              border: "none", background: "none", cursor: "pointer", fontSize: 16,
              lineHeight: 1, color: T.muted, padding: 2, display: "grid", placeItems: "center",
            }}
          >×</button>
        </div>
        {disponibles.length === 0 ? (
          <div style={{ padding: "8px 10px", fontSize: 11.5, color: T.muted }}>
            No hay procesos disponibles para esta orden.
          </div>
        ) : disponibles.map(p => {
          const nombreCorto = nombreCortoProceso(p.tabla, p.nombre_proceso);
          const cuantas = vecesEnRuta(p.idproceso_cat);
          return (
            <button
              key={p.idproceso_cat} type="button" onClick={() => agregarProceso(compEligiendo, p)}
              title={cuantas > 0 ? `Ya va ${cuantas} ${cuantas === 1 ? "vez" : "veces"} en esta ruta -- agregar otra` : undefined}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "7px 11px",
                border: "none", background: "transparent", cursor: "pointer", textAlign: "left",
                fontSize: 12.5, fontWeight: 600, color: T.inkStrong, fontFamily: "inherit",
              }}
            >
              <IconoProcesoCuadro nombre={nombreCorto} size={22} />
              <span style={{ flex: 1 }}>{nombreCorto}</span>
              {cuantas > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: T.primary, flexShrink: 0 }}>×{cuantas}</span>
              )}
            </button>
          );
        })}
      </div>,
      document.body
    );
  };

  // Espaciador: reserva el hueco entre tarjetas donde antes vivía cada
  // conector individual. Las líneas ahora se dibujan todas juntas en
  // overlayConectores (arriba), medidas contra las tarjetas reales.
  const EspacioConector = () => (
    <div style={{ width: 74, flexShrink: 0 }} />
  );

  const PuntoDeUnion = ({ cardRef }: { cardRef?: (el: HTMLDivElement | null) => void }) => (
    <div ref={cardRef} style={{ width: 150, flexShrink: 0 }}>
      <div style={{
        background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 11,
        padding: "15px 13px", textAlign: "center",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.greenDeep, letterSpacing: "0.03em", marginBottom: 7 }}>
          PUNTO DE UNIÓN
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.65, color: T.inkStrong }}>
          Se unirán los resultados de {inicios.map(c => etiquetaComponente(c, componentes)).join(" y ")}
          {union && refsDeComponente(materiales, union.id).length > 0 &&
            `, y se agregará ${refsDeComponente(materiales, union.id).map(r => r.etiqueta).join(", ")}`}.
        </div>
      </div>
    </div>
  );

  const ProductoTerminado = () => (
    <div style={{
      width: 186, flexShrink: 0, border: `1.5px solid ${T.orangeBorder}`, borderRadius: 12,
      overflow: "hidden", background: "#fff",
    }}>
      <div style={{ background: T.orangeBg, padding: "13px 12px", textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.orangeText, letterSpacing: "0.03em", marginBottom: 4 }}>
          PRODUCTO TERMINADO
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.orangeText }}>
          {nombreProducto.trim() || "(sin nombre)"}
        </div>
      </div>
      <div style={{ padding: "14px 14px 18px", textAlign: "center" }}>
        {/* Si ya se subió una imagen del producto (o hay una preview local
            mientras se está dando de alta), se muestra esa foto de verdad en
            vez del dibujo genérico -- ese dibujo queda como predeterminado
            solo mientras no hay ninguna imagen (Jose). */}
        {imagenProductoUrl ? (
          <div style={{
            width: "100%", height: 108, borderRadius: 9, overflow: "hidden",
            border: `1px solid ${T.border}`, background: "#F6F8FC",
          }}>
            <img
              src={imagenProductoUrl}
              alt="Producto terminado"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ) : (
          <div style={{ height: 108, display: "grid", placeItems: "center" }}>
            <IlustracionCaja />
          </div>
        )}
        <div style={{ margin: "8px auto 0", width: 34 }}><Palomita size={34} /></div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.inkStrong, lineHeight: 1.6, marginTop: 12 }}>
          Listo para despacho<br />o entrega al cliente.
        </div>
      </div>
    </div>
  );

  const Leyenda = () => (
    <div style={{
      marginTop: 18, border: `1px solid ${T.border}`, borderRadius: 10, background: "#FBFCFE",
      padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 18, flexWrap: "wrap",
    }}>
      <span style={leg}>
        <span style={{ ...dot, background: "#1D5DB8" }} /><span style={{ ...dot, background: T.purple, marginLeft: -4 }} />
        Órdenes de inicio (independientes)
      </span>
      <span style={leg}><span style={{ ...dot, background: T.green }} />Punto de unión (espera a que las OP de inicio estén completas)</span>
      <span style={leg}><span style={{ ...dot, background: T.greenDeep }} />Orden de unión (continúa el flujo)</span>
      <span style={leg}><span style={{ ...dot, background: T.orange }} />Fin del flujo</span>
      {opcs.length > 0 && (
        <span style={{ ...leg, color: T.muted, fontWeight: 500 }}>
          Toca el botón "→" de una tarjeta para cambiar a qué orden alimenta.
        </span>
      )}
    </div>
  );

  // Notas de verdad: observaciones generales del producto que el usuario
  // escribe y guarda, en vez del texto que antes se armaba solo a partir de
  // los materiales (Jose pidió justo eso: que ya no sean automáticas, sino
  // una lista que él genere y pueda editar). Se guardan de verdad en
  // producto_papel_nota (FK a producto_papel) — pero Jose también pidió
  // poder escribirlas desde el alta de un producto nuevo, ANTES de que
  // exista ese id. Mientras no haya idproducto, las notas viven en memoria
  // (notasPendientes, subido por FormularioProductoEspecial) y se suben una
  // por una en cuanto el producto se crea — mismo patrón que la imagen
  // pendiente.
  // (PanelNotas se movió a nivel de módulo — ver más abajo — para no
  // recrear su identidad de componente (y perder el foco de sus inputs) en
  // cada render de RutaProcesos.)

  // ── paneles de abajo (resumen / reglas / notas) ─────────────────────────
  const Paneles = () => {
    const reglas: string[] = [];
    if (inicios.length > 0) reglas.push("Las OP de inicio se trabajan de forma independiente.");
    if (union && inicios.length > 0) {
      reglas.push(`El punto de unión esperará a que ${inicios.length === 1 ? "la OP de inicio esté completa" : `las ${inicios.length} OP de inicio estén completas`}.`);
      const extra = refsDeComponente(materiales, union.id);
      if (extra.length > 0) reglas.push(`En la orden de unión se agregará ${extra.map(r => r.etiqueta).join(", ")}.`);
    }
    if (unica) reglas.push("Todos los materiales se trabajan dentro de la misma orden de producción.");
    const hayLito = componentes.some(c => c.procesos.some(p => tablaDe(p) === "litolaminado_papel"));
    if (hayLito) reglas.push("El litolaminado va antes del suaje: es donde se juntan las piezas y arranca la orden de unión.");

    // 🔁 FASE 4 (Jose, 2026-09-07): hay 0 o más OPC (Orden de Producción
    // Complementaria), nivel(es) intermedio(s) opcionales entre las OP de
    // inicio y la unión final.
    if (opcs.length > 0) {
      reglas.push(
        `Hay ${opcs.length} ${opcs.length === 1 ? "Orden de Producción Complementaria (OPC)" : "Órdenes de Producción Complementarias (OPC)"}: cada una junta el resultado de sus órdenes de origen antes de pasarlo al siguiente nivel.`
      );
    }

    // NUEVO (Jose, 2026-09-01): si un nodo que junta insumos (unión, o FASE
    // 4 cualquier OPC) NO tiene material propio, es solo un junte lógico de
    // piezas (como cajas de regalo o roscas de reyes) -- no necesita
    // Litolaminado, no se pegan. Si SÍ tiene material propio, ese material
    // es justo lo que fusiona las piezas de sus órdenes de origen, y
    // Litolaminado sí aplica. Las dos combinaciones "raras" se avisan aquí;
    // la primera además bloquea guardar (ver guardar() en
    // FormularioProductoEspecial.tsx) porque describe un proceso sin nada
    // que procesar.
    //
    // 🔁 FASE 4: antes esto solo revisaba la unión -- una OPC es
    // estructuralmente lo mismo para este propósito, así que se revisan
    // juntas en un solo bucle.
    const nombreNodoRegla = (nodo: ComponentePapel) =>
      nodo.tipo === "union" ? "OP de unión" : etiquetaComponente(nodo, componentes);
    for (const nodo of [...(union ? [union] : []), ...opcs]) {
      const materialNodo = refsDeComponente(materiales, nodo.id);
      const litoEnNodo = nodo.procesos.some(p => tablaDe(p) === "litolaminado_papel");
      if (litoEnNodo && materialNodo.length === 0) {
        reglas.push(`⚠ La ${nombreNodoRegla(nodo)} lleva Litolaminado pero no tiene material propio asignado — sin material que fusionar, ese proceso no debería estar en su ruta.`);
      } else if (!litoEnNodo && materialNodo.length > 0) {
        reglas.push(`La ${nombreNodoRegla(nodo)} tiene material propio asignado: probablemente necesite Litolaminado en su ruta para fusionarlo con las piezas de sus órdenes de origen.`);
      }
    }

    if (totalProcesos > 0) reglas.push("Al terminar el último proceso de la ruta, el producto queda terminado.");

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        <div style={panel}>
          <h3 style={panelTitulo}>Resumen de la ruta</h3>
          {unica
            ? <Kv k="Modo de asignación:" v="Misma orden" />
            : <>
                <Kv k="Órdenes de inicio:" v={String(inicios.length)} />
                <Kv k="Orden de unión:" v={union ? "1" : "0"} />
              </>}
          <Kv k="Total de procesos:" v={String(totalProcesos)} />
          <Kv k="Materiales utilizados:" v={String(materiales.length)} />
          <Kv k="Producto final:" v={nombreProducto.trim() || "—"} />
        </div>

        <div style={panel}>
          <h3 style={panelTitulo}>Reglas del flujo</h3>
          {reglas.length === 0
            ? <p style={{ margin: 0, fontSize: 12.5, color: T.muted }}>Arma la ruta para ver sus reglas.</p>
            : reglas.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.6, color: T.inkStrong, fontWeight: 500, padding: "4px 0" }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", background: T.green, flexShrink: 0, display: "grid", placeItems: "center", marginTop: 2 }}>
                    <IcoPalomita size={10} />
                  </span>
                  {r}
                </div>
              ))}
        </div>
      </div>
    );
  };

  // (VistaMismaOrden se movió a nivel de módulo — ver más abajo — por la
  // misma razón que TarjetaOP y PanelNotas.)

  // ── render ──────────────────────────────────────────────────────────────
  if (componentes.length === 0) {
    return (
      <Tarjeta>
        <TituloSeccion titulo="Ruta de procesos" subtitulo="Primero elige un modo de asignación en el panel de arriba." />
        <p style={{
          margin: 0, fontSize: 12.5, color: T.muted, background: "#F7F9FC",
          border: `1px dashed ${T.border}`, borderRadius: 9, padding: "14px 16px",
        }}>
          Elige «Misma orden de producción» o «Órdenes independientes» para empezar a construir el flujo.
        </p>
      </Tarjeta>
    );
  }

  // El diagrama en sí (sin título ni leyenda) -- se reutiliza tal cual en la
  // vista normal y en la previsualización de pantalla completa, así nunca se
  // montan dos copias de las tarjetas de OP con el mismo estado.
  //
  // Las OP de inicio van APILADAS en una sola columna, no en columnas una al
  // lado de la otra: son independientes entre sí -- pueden arrancar todas al
  // mismo tiempo, ninguna espera a la anterior -- y solo se juntan hasta el
  // Punto de Unión (Jose). El contenedor centra todo verticalmente con
  // align-items: center contra el alto total de la pila, así el Punto de
  // Unión y la OP de Unión siempre quedan a la altura del centro sin cálculo
  // manual.
  const diagramaFlujo = unica ? (
    <VistaMismaOrden
      comp={unica}
      pantallaCompleta={pantallaCompleta}
      filtrarPorPreparacion={filtrarPorPreparacion}
      procesosCat={procesosCat}
      agregarProceso={agregarProceso}
      catPorId={catPorId}
      catalogs={catalogs}
      materiales={materiales}
      abierto={abierto}
      setAbierto={setAbierto}
      compacta={compacta}
      tamanoAsaDefault={tamanoAsaDefault}
      onTamanoAsaDefaultChange={onTamanoAsaDefaultChange}
      parcharProceso={parcharProceso}
      parcharMaquinaria={parcharMaquinaria}
      parcharComp={parcharComp}
      parcharMaterial={parcharMaterial}
      addItem={addItem}
      quitarProceso={quitarProceso}
      reordenarProcesos={reordenarProcesos}
      acomodarRuta={acomodarRuta}
      rutaYaAcomodada={rutaYaAcomodada}
      nombreProducto={nombreProducto}
    />
  ) : (
    <>
      {/* 🔁 FASE 4 (Jose, 2026-09-08): aviso de "modo conexión" -- fuera del
          contenedor con scroll horizontal, para que siempre se vea aunque
          el diagrama sea más ancho que la pantalla. */}
      {origenConexion && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          background: "#EFF6FF", border: "1px solid #BFD3F2", borderRadius: 10,
          padding: "9px 14px", margin: "0 0 12px", fontSize: 12.5, fontWeight: 600, color: T.primary,
        }}>
          Toca la orden resaltada a la que alimentará {etiquetaComponente(origenConexion, componentes)}.
          <button
            type="button"
            onClick={() => setConectandoDesdeId(null)}
            style={{ marginLeft: "auto", border: "none", background: "none", color: T.primary, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}
          >
            Cancelar
          </button>
        </div>
      )}
      <div
        ref={contenedorFlujoRef}
        style={{ display: "flex", alignItems: "center", overflow: "auto", padding: "26px 4px", position: "relative" }}
      >
      {overlayConectores}
      {overlayArbol}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {inicios.map((comp) => (
          <div
            key={comp.id}
            onDragOver={(e) => { if (arrastrandoId != null) { e.preventDefault(); setSobreId(comp.id); } }}
            onDragLeave={() => setSobreId(v => (v === comp.id ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              if (arrastrandoId != null) reordenarInicios(arrastrandoId, comp.id);
              setArrastrandoId(null);
              setSobreId(null);
            }}
            style={{
              opacity: arrastrandoId === comp.id ? 0.45 : 1,
              outline: sobreId === comp.id && arrastrandoId !== null && arrastrandoId !== comp.id ? `2px dashed ${T.primary}` : "none",
              outlineOffset: 2, borderRadius: 12, transition: "opacity .12s",
            }}
          >
            {/* 🔁 FASE 4: con al menos una OPC en el producto, ya no es obvio
                que TODA OP de inicio alimente a la unión -- puede que
                alimente a una OPC en su lugar. El botón "→" (esquina superior
                izquierda de la tarjeta, ver botonAlimentaA) la reconecta; la
                línea punteada real la dibuja overlayArbol arriba. Sin
                ninguna OPC no hay ambigüedad, así que ninguno de los dos se
                muestra. */}
            <div style={{ position: "relative" }}>
              <TarjetaOP
                comp={comp}
                cardRef={el => {
                  if (el) inicioCardRefs.current.set(comp.id, el);
                  else inicioCardRefs.current.delete(comp.id);
                }}
                componentes={componentes}
                materiales={materiales}
                catalogs={catalogs}
                procesosCat={procesosCat}
                catPorId={catPorId}
                pantallaCompleta={pantallaCompleta}
                compacta={compacta}
                abierto={abierto}
                setAbierto={setAbierto}
                inicios={inicios}
                setArrastrandoId={setArrastrandoId}
                setSobreId={setSobreId}
                eligiendoEn={eligiendoEn}
                setEligiendoEn={setEligiendoEn}
                tamanoAsaDefault={tamanoAsaDefault}
                onTamanoAsaDefaultChange={onTamanoAsaDefaultChange}
                addItem={addItem}
                parcharComp={parcharComp}
                parcharMaquinaria={parcharMaquinaria}
                parcharMaterial={parcharMaterial}
                parcharProceso={parcharProceso}
                quitarProceso={quitarProceso}
                reordenarProcesos={reordenarProcesos}
                acomodarRuta={acomodarRuta}
                rutaYaAcomodada={rutaYaAcomodada}
              />
              {opcs.length > 0 && botonAlimentaA(comp)}
            </div>
          </div>
        ))}
      </div>

      {/* ── OPC: Orden de Producción Complementaria (FASE 4, Jose 2026-09-07,
          conexión visual agregada 2026-09-08, línea real 2026-09-08) ── Cada
          OPC recibe su propia tarjeta, totalmente funcional (agregar/editar/
          borrar procesos, exactamente igual que cualquier otra OP), en su
          columna entre las OP de inicio y la unión -- una columna POR NIVEL
          del árbol (ver columnasOPC): si una OPC alimenta a otra, la que
          alimenta se dibuja antes que su padre. A dónde alimenta se declara
          y se cambia aquí mismo con el botón "→" de la esquina de la
          tarjeta: arranca el modo conexión, y mientras está activo esta y
          las demás OPC/unión válidas como destino (NodoConectable, respeta
          destinosValidosPara -- ninguna puede apuntarse a sí misma ni a un
          descendiente propio) se resaltan y se vuelven clicables. La línea
          punteada real hacia el padre de cada una la dibuja overlayArbol
          (arriba, ruteada en tramos rectos que esquivan las demás tarjetas)
          -- reemplaza a la llave de geomFlujo, que solo servía para el caso
          sin OPC. El marginLeft hace de EspacioConector entre columnas. */}
      {columnasOPC.map((columna, iCol) => (
          <div key={`opc-col-${iCol}`} style={{ display: "flex", flexDirection: "column", gap: 22, marginLeft: 74 }}>
            {columna.map((comp) => (
              <NodoConectable key={comp.id} comp={comp} componentes={componentes} origenConexion={origenConexion} onConectarAqui={conectarA}>
                <div
                  ref={el => {
                    if (el) opcCardRefs.current.set(comp.id, el);
                    else opcCardRefs.current.delete(comp.id);
                  }}
                  style={{ position: "relative" }}
                >
                  <TarjetaOP
                    comp={comp}
                    componentes={componentes}
                    materiales={materiales}
                    catalogs={catalogs}
                    procesosCat={procesosCat}
                    catPorId={catPorId}
                    pantallaCompleta={pantallaCompleta}
                    compacta={compacta}
                    abierto={abierto}
                    setAbierto={setAbierto}
                    inicios={inicios}
                    setArrastrandoId={setArrastrandoId}
                    setSobreId={setSobreId}
                    eligiendoEn={eligiendoEn}
                    setEligiendoEn={setEligiendoEn}
                    tamanoAsaDefault={tamanoAsaDefault}
                    onTamanoAsaDefaultChange={onTamanoAsaDefaultChange}
                    addItem={addItem}
                    parcharComp={parcharComp}
                    parcharMaquinaria={parcharMaquinaria}
                    parcharMaterial={parcharMaterial}
                    parcharProceso={parcharProceso}
                    quitarProceso={quitarProceso}
                    reordenarProcesos={reordenarProcesos}
                    acomodarRuta={acomodarRuta}
                    rutaYaAcomodada={rutaYaAcomodada}
                  />
                  <button
                    type="button"
                    title="Eliminar OPC"
                    onClick={() => eliminarOPCAqui(comp.id)}
                    style={{
                      position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%",
                      border: `1px solid ${T.border}`, background: "#fff", boxShadow: T.shadow,
                      display: "grid", placeItems: "center", cursor: "pointer", padding: 0, zIndex: 1,
                    }}
                  >
                    <IcoBote size={12} color={T.danger} />
                  </button>
                  {botonAlimentaA(comp)}
                </div>
              </NodoConectable>
            ))}
          </div>
      ))}

      {union && (
        <>
          <EspacioConector />
          {/* Con al menos una OPC, "Punto de unión" (la llave + el rombo)
              deja de ser cierto -- puede que la unión reciba de una OPC en
              vez de directo de una OP de inicio -- así que se apaga y la
              tarjeta de unión pasa directo, alimentada por las líneas de
              overlayArbol como cualquier otro destino. */}
          {opcs.length === 0 && (
            <>
              <PuntoDeUnion cardRef={el => { puntoUnionCardRef.current = el; }} />
              <EspacioConector />
            </>
          )}
          <NodoConectable comp={union} componentes={componentes} origenConexion={origenConexion} onConectarAqui={conectarA}>
            <TarjetaOP
              comp={union}
              cardRef={el => { unionCardRef.current = el; }}
              componentes={componentes}
              materiales={materiales}
              catalogs={catalogs}
              procesosCat={procesosCat}
              catPorId={catPorId}
              pantallaCompleta={pantallaCompleta}
              compacta={compacta}
              abierto={abierto}
              setAbierto={setAbierto}
              inicios={inicios}
              setArrastrandoId={setArrastrandoId}
              setSobreId={setSobreId}
              eligiendoEn={eligiendoEn}
              setEligiendoEn={setEligiendoEn}
              tamanoAsaDefault={tamanoAsaDefault}
              onTamanoAsaDefaultChange={onTamanoAsaDefaultChange}
              addItem={addItem}
              parcharComp={parcharComp}
              parcharMaquinaria={parcharMaquinaria}
              parcharMaterial={parcharMaterial}
              parcharProceso={parcharProceso}
              quitarProceso={quitarProceso}
              reordenarProcesos={reordenarProcesos}
              acomodarRuta={acomodarRuta}
              rutaYaAcomodada={rutaYaAcomodada}
            />
          </NodoConectable>
        </>
      )}
      <div style={{ width: 62, flexShrink: 0, display: "grid", placeItems: "center", color: T.inkStrong }}>
        <IcoFlecha />
      </div>
      <ProductoTerminado />
      </div>
    </>
  );

  // Solo el diagrama de flujo (la Tarjeta) -- Resumen, Reglas y Notas se
  // quedan siempre en la vista normal, "Previsualizar" es nada más para ver
  // completo el diagrama cuando no cabe en el ancho del formulario (Jose).
  const flujo = (
    <Tarjeta>
      <TituloSeccion
        titulo={unica ? "Ruta de procesos (misma orden de producción)" : "Ruta de procesos (flujo de producción)"}
        subtitulo={unica
          ? "Define la secuencia de procesos que seguirá el producto usando todos los materiales seleccionados."
          : "Construye el flujo de producción con órdenes de inicio independientes y una orden de unión."}
        accion={botonesCabecera}
      />

      {errorCat && (
        <p style={{
          fontSize: 12, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA",
          borderRadius: 8, padding: "8px 12px", margin: "0 0 14px",
        }}>{errorCat}</p>
      )}

      {diagramaFlujo}
      {!unica && <Leyenda />}
    </Tarjeta>
  );

  // El "Previsualizar" ahora abre ÚNICAMENTE el diagrama, maximizado a toda
  // la pantalla -- nada de título, reglas ni leyenda, solo el botón de
  // cerrar y el diagrama completo, como si se abriera un visor de diagramas
  // (Jose). El módulo vive dentro del layout normal del formulario (ancho
  // limitado, scroll de la página), y con varias OP de inicio apiladas el
  // diagrama puede ser más alto de lo que cabe ahí -- de eso se trata esta
  // vista. Se reemplaza el diagrama normal por el de pantalla completa (no
  // se montan los dos a la vez) para no duplicar las tarjetas de OP con el
  // mismo estado.
  return (
    <>
      {pantallaCompleta ? createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 2000, background: T.bg,
          display: "flex", flexDirection: "column", fontFamily: T.font,
        }}>
          <div style={{ flex: "none", display: "flex", justifyContent: "flex-end", padding: "14px 20px" }}>
            <Boton onClick={() => setPantallaCompleta(false)}>✕ Cerrar previsualización</Boton>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 20px 24px" }}>
            {diagramaFlujo}
          </div>
        </div>,
        document.body
      ) : flujo}

      <Paneles />
      <PanelNotas
        idproducto={idproducto}
        notasPendientes={notasPendientes}
        onNotasPendientesChange={onNotasPendientesChange}
      />

      <PickerProcesos />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PIEZAS CHICAS
// ═══════════════════════════════════════════════════════════════════════════
const leg: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 600, color: T.ink,
};
const dot: React.CSSProperties = { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 };
const panel: React.CSSProperties = {
  background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12,
  padding: "16px 18px", boxShadow: T.shadow,
};
const panelTitulo: React.CSSProperties = {
  margin: "0 0 12px", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.04em",
  textTransform: "uppercase", color: T.inkStrong,
};

const miniBtn = (deshabilitado: boolean): React.CSSProperties => ({
  height: 26, minWidth: 30, padding: "0 9px", borderRadius: 6,
  border: `1px solid ${T.border}`, background: "#fff",
  color: deshabilitado ? "#C7D0E2" : T.ink, fontSize: 11.5, fontWeight: 600,
  cursor: deshabilitado ? "not-allowed" : "pointer", fontFamily: "inherit",
});

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 12.5, padding: "4px 0" }}>
      <span style={{ color: T.inkSoft, fontWeight: 400 }}>{k}</span>
      <span style={{ color: T.inkStrong, fontWeight: 700, textAlign: "right" }}>{v}</span>
    </div>
  );
}

function Fld({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ marginTop: 11 }}>
      <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 400 }}>{k}</div>
      <div style={{ fontSize: 12.5, color: T.inkStrong, fontWeight: 600, lineHeight: 1.5 }}>{v}</div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: "#EEF3FB", display: "grid", placeItems: "center", color: T.primary }}>
        <IcoLista size={16} />
      </span>
      <span>
        <span style={{ display: "block", fontSize: 11.5, color: T.inkSoft, fontWeight: 400 }}>{k}</span>
        <span style={{ display: "block", fontSize: 13.5, color: T.inkStrong, fontWeight: 700, marginTop: 1 }}>{v}</span>
      </span>
    </span>
  );
}