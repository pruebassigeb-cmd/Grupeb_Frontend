// src/components/papel/especiales/MaterialesAsignacion.tsx
//
// Bloques 1 y 2 del diseño del cliente: la tabla "MATERIALES / COMPONENTES"
// y el panel "Asignación de materiales" con sus tres tarjetas de modo.
//
// Reproduce el mockup tal cual (colores, chips, badges M1/M2/M3, acciones de
// editar/borrar por renglón), pero SOLO con datos que ya existen hoy en la
// base: no hay "Código de material", ni "Unidad", ni "Cantidad" — esos
// campos del mockup no tienen columna en detalle_material_papel y se
// acordó no inventarlos. Las columnas Calibre, Medida y Preparación
// (Hojeado / Guillotina) sí existen y son las que Jose anotó a mano sobre
// el diseño.

import { useState } from "react";
import type React from "react";
import type { CatItem, CatKey, ComponentePapel, MaterialEntry } from "../../../types/papel/papel.types";
import { newComponente, newComponenteProceso, newMaterial } from "../../../types/papel/papel.types";
import type { ProcesoCatOpcion } from "../../../services/papel/papel.service";
import {
  T, Tarjeta, TituloSeccion, Chip, Entrada, Selector, Palomita,
  IcoCadena, IcoRamificar, IcoLapiz, IcoBote, IcoPalomita,
  colorMaterial, paletaOP,
} from "./disenoEspeciales";
// Mismo combo "elige o agrega" que ya usa el alta de papel/plástico
// normal (FormularioProductoPapelAlta.tsx) -- especiales vivía sin esto,
// con un <select> plano que obligaba a ir primero a Catálogos si el tipo
// de papel o el calibre que se necesitaba todavía no existía (Jose,
// 2026-09-02: "faltó que en los desplegables se puedan agregar en caso
// de que no tenga algún dato, tal como sucede en dar de alta productos
// de papel y plástico"). Mismo componente, mismo hook addItem -- no se
// reinventa nada, solo se conecta aquí también.
import SelConAlta from "../SelConAlta";

// ═══════════════════════════════════════════════════════════════════════════
// ETIQUETAS DE COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════
export const etiquetaComponente = (comp: ComponentePapel, componentes: ComponentePapel[]): string => {
  if (comp.tipo === "unica") return "MISMA OP";
  if (comp.tipo === "union") return "OP DE UNIÓN";
  // 🔁 FASE 4: OPC (Orden de Producción Complementaria) -- nivel intermedio,
  // numerada entre sí igual que las de inicio (por posición en el arreglo).
  if (comp.tipo === "complementaria") {
    const opcs = componentes.filter(c => c.tipo === "complementaria");
    return `OPC ${opcs.findIndex(c => c.id === comp.id) + 1}`;
  }
  const inicios = componentes.filter(c => c.tipo === "inicio");
  return `OP INICIO ${inicios.findIndex(c => c.id === comp.id) + 1}`;
};

export const indiceInicio = (comp: ComponentePapel, componentes: ComponentePapel[]): number =>
  componentes.filter(c => c.tipo === "inicio").findIndex(c => c.id === comp.id);

export const indiceComplementaria = (comp: ComponentePapel, componentes: ComponentePapel[]): number =>
  componentes.filter(c => c.tipo === "complementaria").findIndex(c => c.id === comp.id);

// Índice a usar para colorear (paletaOP) según el tipo del componente.
export const indicePaleta = (comp: ComponentePapel, componentes: ComponentePapel[]): number =>
  comp.tipo === "complementaria" ? indiceComplementaria(comp, componentes) : indiceInicio(comp, componentes);

// ═══════════════════════════════════════════════════════════════════════════
// ÁRBOL (FASE 4, Jose 2026-09-07): a qué componente alimenta cada 'inicio'/
// 'complementaria', y a qué destinos puede alimentar válidamente cada uno
// sin formar un ciclo. Espejo, en el frontend, de lo que ya valida el
// trigger componente_papel_validar_padre_trg en BD -- aquí es solo para no
// dejar ni siquiera ELEGIR una opción inválida en el desplegable.
// ═══════════════════════════════════════════════════════════════════════════
export const descendientesDe = (id: number, componentes: ComponentePapel[]): Set<number> => {
  const hijos = componentes.filter(c => c.idComponentePadre === id);
  const set = new Set<number>();
  for (const hijo of hijos) {
    set.add(hijo.id);
    for (const nieto of descendientesDe(hijo.id, componentes)) set.add(nieto);
  }
  return set;
};

// Destinos válidos para que ESTE componente alimente: cualquier
// 'complementaria' o 'union' del producto, excepto él mismo y sus propios
// descendientes (alimentar a un descendiente formaría un ciclo).
export const destinosValidosPara = (comp: ComponentePapel, componentes: ComponentePapel[]): ComponentePapel[] => {
  const descendientes = descendientesDe(comp.id, componentes);
  return componentes.filter(c =>
    (c.tipo === "complementaria" || c.tipo === "union") &&
    c.id !== comp.id &&
    !descendientes.has(c.id)
  );
};

// ── OPC: Orden de Producción Complementaria (Jose, 2026-09-07) ─────────────
// Nivel intermedio del árbol -- estructuralmente igual a la unión (junta
// insumos), solo que su resultado no es el producto terminado: alimenta a
// otro nivel (otra OPC o ya la unión). Exportadas a nivel de módulo (no
// closures del componente de abajo) para que tanto "Estructura del árbol"
// (aquí) como la conexión visual en RutaProcesos.tsx compartan exactamente
// la misma lógica sin duplicarla (Jose, 2026-09-08: "cada OPC va tener sus
// procesos asignados" + pidió poder conectar visualmente desde la ruta).
export const construirNuevaOPC = (
  componentes: ComponentePapel[]
): { nuevo: ComponentePapel; lista: ComponentePapel[] } => {
  // CORREGIDO (2026-09-08, "viola la restricción check
  // componente_papel_tipo_padre_check"): el backend EXIGE que toda
  // 'complementaria' tenga padre no nulo. El único llamador de hoy
  // (agregarOPCAqui en RutaProcesos.tsx) ya está protegido con `union &&`,
  // pero esta función es de módulo y se puede volver a usar desde otro
  // lado más adelante -- mejor que sea imposible construir una OPC
  // huérfana desde aquí, en vez de confiar en que quien la llame recuerde
  // el guard.
  let union = componentes.find(c => c.tipo === "union") ?? null;
  let base = componentes;
  if (!union) {
    union = { ...newComponente(), tipo: "union", nombre: "", orden: 0, esUnion: true, procesos: [] };
    base = [...componentes, union];
  }
  const nuevo: ComponentePapel = {
    ...newComponente(),
    tipo: "complementaria",
    nombre: "",
    orden: base.length + 1,
    esUnion: false,
    // Por default alimenta directo a la unión final -- el usuario puede
    // anidarla bajo otra OPC después, desde "Estructura del árbol" o
    // conectándola visualmente en Ruta de procesos.
    idComponentePadre: union.id,
  };
  // Va justo antes de la unión, después de todo lo demás -- mismo criterio
  // que construirNuevoInicio.
  const sinUnion = base.filter(c => c.tipo !== "union");
  const union2 = base.filter(c => c.tipo === "union");
  return { nuevo, lista: [...sinUnion, nuevo, ...union2] };
};

export const agregarOPC = (
  componentes: ComponentePapel[],
  onUpdateComponentes: (componentes: ComponentePapel[]) => void,
) => {
  const { lista } = construirNuevaOPC(componentes);
  onUpdateComponentes(lista);
};

// Quitar una OPC no puede dejar huérfano a nadie: todo lo que la
// alimentaba pasa a alimentar a lo que ELLA alimentaba (se "salta" ese
// nivel), y cualquier material que tuviera asignado directo se queda sin
// asignar (no hay a dónde reasignarlo solo, lo decide el usuario).
export const eliminarOPC = (
  id: number,
  componentes: ComponentePapel[],
  materiales: MaterialEntry[],
  onUpdateComponentes: (componentes: ComponentePapel[]) => void,
  onUpdateMateriales: (materiales: MaterialEntry[]) => void,
) => {
  const opc = componentes.find(c => c.id === id);
  if (!opc) return;
  const union = componentes.find(c => c.tipo === "union") ?? null;
  const padreDeRespaldo = opc.idComponentePadre ?? union?.id ?? null;

  const componentesActualizados = componentes
    .filter(c => c.id !== id)
    .map(c => (c.idComponentePadre === id ? { ...c, idComponentePadre: padreDeRespaldo } : c));
  const materialesActualizados = materiales.map(m =>
    m.idComponenteAsignado === id ? { ...m, idComponenteAsignado: null } : m
  );

  onUpdateComponentes(componentesActualizados);
  onUpdateMateriales(materialesActualizados);
};

// A qué componente alimenta un 'inicio'/'complementaria' -- editable desde
// "Estructura del árbol" o desde Ruta de procesos. No se ofrece "sin
// asignar": el backend exige padre en estos dos tipos
// (componente_papel_tipo_padre_check).
export const cambiarPadre = (
  id: number,
  idPadre: number | null,
  componentes: ComponentePapel[],
  onUpdateComponentes: (componentes: ComponentePapel[]) => void,
) => {
  onUpdateComponentes(componentes.map(c => (c.id === id ? { ...c, idComponentePadre: idPadre } : c)));
};

export const nombreComponente = (comp: ComponentePapel, componentes: ComponentePapel[]): string =>
  comp.nombre.trim() || etiquetaComponente(comp, componentes);

// Nombre legible de un material — el diseño lo muestra como "Multicapa" con
// su badge M1/M2/M3 al lado.
export const nombreMaterial = (m: MaterialEntry): string => m.tipo.trim() || "(sin tipo de papel)";

// El material solo tiene ancho x altura: el fuelle es del PRODUCTO (una
// bolsa tiene fuelle; una hoja de papel no), y por eso solo aparece arriba,
// en «Medida del producto».
export const medidaMaterial = (m: MaterialEntry): string => {
  const a = m.ancho.trim(), h = m.altura.trim();
  if (!a && !h) return "—";
  return `${a} x ${h}`;
};

const miniLbl: React.CSSProperties = {
  display: "block", fontSize: 9.5, fontWeight: 600, color: T.muted,
  marginBottom: 3, letterSpacing: ".03em", textTransform: "uppercase", textAlign: "left",
};

const ETIQUETA_PREPARACION: Record<string, string> = {
  "": "—",
  hojeadora: "Hojeado",
  guillotina: "Guillotina",
  // NUEVO (Jose, 2026-09-02): el material ya llega al tamaño exacto -- lo
  // compran así o lo entrega quien pidió el producto -- así que no pasa por
  // Hojeado ni Guillotina (ver filtrarPorPreparacion en RutaProcesos.tsx).
  proveedor: "Proveedor (ya viene al tamaño)",
};

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA DE MODO
// ═══════════════════════════════════════════════════════════════════════════
// Fila de lista en vez de tarjeta ancha: así nunca se sale del contenedor
// en pantallas angostas (una tarjeta de 2 columnas obligaba a un mínimo de
// ancho por columna que en pantallas chicas se salía del panel) y además
// ocupa menos espacio vertical/horizontal en general (Jose).
function TarjetaModo({ icono, titulo, texto, activa, onClick }: {
  icono: React.ReactNode;
  titulo: string;
  texto: string;
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", boxSizing: "border-box",
        border: `1px solid ${activa ? "#9BB6E8" : T.border}`,
        borderRadius: 10, background: activa ? "#F4F8FE" : "#fff",
        boxShadow: activa ? `${T.shadow}, 0 0 0 1px #9BB6E8 inset` : T.shadow,
        padding: "11px 13px", cursor: "pointer",
      }}
    >
      <span style={{ flexShrink: 0, display: "grid", placeItems: "center" }}>{icono}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3 style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: T.inkStrong }}>{titulo}</h3>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: T.inkSoft, fontWeight: 400 }}>{texto}</p>
      </div>
      <span style={{ flexShrink: 0, width: 20, height: 20, display: "grid", placeItems: "center" }}>
        {activa
          ? <Palomita size={20} />
          : <span style={{ width: 17, height: 17, borderRadius: "50%", border: `1.5px solid ${T.border}`, boxSizing: "border-box" }} />}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function MaterialesAsignacion({
  materiales,
  onUpdateMateriales,
  componentes,
  onUpdateComponentes,
  catTipoPapel,
  catCalibre,
  procesosCat,
  addItem,
}: {
  materiales: MaterialEntry[];
  onUpdateMateriales: (materiales: MaterialEntry[]) => void;
  componentes: ComponentePapel[];
  onUpdateComponentes: (componentes: ComponentePapel[]) => void;
  catTipoPapel: CatItem[];
  catCalibre: CatItem[];
  procesosCat: ProcesoCatOpcion[];
  // Mismo addItem de useCatalogosPapel() que ya usa el resto del alta —
  // FormularioProductoEspecial.tsx ya lo tenía (se lo pasaba solo a
  // RutaProcesos), aquí solo se recibe para conectarlo también a Tipo de
  // papel y Calibre.
  addItem: (key: CatKey, nombre: string) => Promise<unknown>;
}) {
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const hayUnica = componentes.some(c => c.tipo === "unica");
  const inicios = componentes.filter(c => c.tipo === "inicio");
  const modo: "unica" | "independientes" | null =
    hayUnica ? "unica" : inicios.length > 0 ? "independientes" : null;

  // ── acciones sobre materiales ───────────────────────────────────────────
  const parchar = (id: number, patch: Partial<MaterialEntry>) =>
    onUpdateMateriales(materiales.map(m => (m.id === id ? { ...m, ...patch } : m)));

  const agregarMaterial = () => {
    const nuevo = newMaterial();
    onUpdateMateriales([...materiales, nuevo]);
    setEditandoId(nuevo.id);
  };

  // Si al quitar/reasignar un material una OP DE INICIO se queda sin ningún
  // material, la OP ya no representa nada — se elimina sola en vez de
  // quedarse "colgada" en la Ruta de procesos como una caja vacía que de
  // todos modos se guardaría con el producto (Jose). "Misma OP" y "OP de
  // unión" son estructurales del modo elegido, no dependen 1 a 1 de tener
  // un material propio, así que esas nunca se autoeliminan aquí.
  const limpiarComponentesHuerfanos = (
    materialesActualizados: MaterialEntry[],
    componentesActuales: ComponentePapel[]
  ): ComponentePapel[] => {
    const idsConMaterial = new Set(
      materialesActualizados
        .map(m => m.idComponenteAsignado)
        .filter((id): id is number => id != null)
    );
    return componentesActuales.filter(c => c.tipo !== "inicio" || idsConMaterial.has(c.id));
  };

  const borrarMaterial = (id: number) => {
    const nuevosMateriales = materiales.filter(m => m.id !== id);
    onUpdateComponentes(limpiarComponentesHuerfanos(nuevosMateriales, componentes));
    onUpdateMateriales(nuevosMateriales);
    if (editandoId === id) setEditandoId(null);
  };

  // ── modos de asignación ─────────────────────────────────────────────────
  // Cambiar de modo reescribe los componentes: es la decisión estructural
  // del producto (una sola OP contra varias OP que después se unen), así
  // que no tiene sentido conservar los del modo anterior.
  const elegirMisma = () => {
    const unica: ComponentePapel = { ...newComponente(), tipo: "unica", nombre: "", orden: 1, esUnion: false };
    onUpdateComponentes([unica]);
    onUpdateMateriales(materiales.map(m => ({ ...m, idComponenteAsignado: unica.id })));
  };

  const elegirIndependientes = () => {
    // Una OP de inicio por material, más la OP de unión: "órdenes
    // independientes" ya significa, por definición, que cada material va por
    // su lado "y después se unirán" — así que la orden de unión no es una
    // tercera opción que haya que elegir aparte, viene incluida en el modo.
    //
    // 🔁 FASE 4: la unión se crea PRIMERO (para tener su id) porque cada
    // inicio necesita declarar de una vez a quién alimenta
    // (idComponentePadre) -- por default, directo a la unión final; el
    // usuario puede redirigir cualquiera hacia una OPC después, desde
    // "Estructura del árbol" más abajo.
    const union: ComponentePapel = {
      ...newComponente(),
      id: Date.now(),
      tipo: "union",
      nombre: "",
      orden: 1, // se corrige abajo, una vez que se sabe cuántos inicios hay
      esUnion: true,
      procesos: [],
    };
    const inicios: ComponentePapel[] = materiales.map((m, i) => ({
      ...newComponente(),
      id: Date.now() + i + 1,
      tipo: "inicio",
      nombre: nombreMaterial(m),
      orden: i + 1,
      esUnion: false,
      idComponentePadre: union.id,
    }));
    const lista: ComponentePapel[] = inicios.length > 0
      ? inicios
      : [{ ...newComponente(), tipo: "inicio", orden: 1, idComponentePadre: union.id }];
    // La orden de unión arranca SIN ningún proceso predeterminado (Jose,
    // 2026-09-02): antes se sembraba sola con Litolaminado, pero eso solo
    // tiene sentido cuando la unión de verdad fusiona material propio —
    // aquí, al crearse, la unión todavía no tiene ningún material asignado
    // (los materiales solo se reparten entre las OP de inicio, ver abajo).
    // Mientras no haya un producto/material asignado a la OP de unión, lo
    // correcto es dejarla sin proceso predeterminado y que el usuario arme
    // la ruta a mano -- RutaProcesos ya avisa en su panel "Reglas" si más
    // adelante le asignan material y falta Litolaminado, o si lo agregan
    // sin haberle asignado material.
    union.orden = lista.length + 1;
    onUpdateComponentes([...lista, union]);
    onUpdateMateriales(materiales.map((m, i) => ({ ...m, idComponenteAsignado: lista[i]?.id ?? null })));
  };

  const construirNuevoInicio = (nombre: string = ""): { nuevo: ComponentePapel; lista: ComponentePapel[] } => {
    // Por default alimenta directo a la unión final -- si el producto ya
    // tiene OPC, el usuario puede redirigirlo desde "Estructura del árbol".
    //
    // CORREGIDO (2026-09-08, "viola la restricción check
    // componente_papel_tipo_padre_check"): el backend EXIGE que toda OP de
    // inicio tenga padre no nulo. El único llamador de hoy (el dropdown
    // "＋ Nueva OP de inicio", que solo aparece en modo "independientes",
    // donde ya siempre existe una unión) no debería disparar el caso sin
    // unión, pero si por lo que sea llega a pasar, es mejor crear la unión
    // que falta en el momento que dejar nacer un inicio huérfano.
    let union = componentes.find(c => c.tipo === "union") ?? null;
    let base = componentes;
    if (!union) {
      union = { ...newComponente(), tipo: "union", nombre: "", orden: 0, esUnion: true, procesos: [] };
      base = [...componentes, union];
    }
    const nuevo: ComponentePapel = {
      ...newComponente(), tipo: "inicio", nombre, orden: base.length + 1, esUnion: false,
      idComponentePadre: union.id,
    };
    // La OP de unión siempre va al final de la lista.
    const sinUnion = base.filter(c => c.tipo !== "union");
    const union2 = base.filter(c => c.tipo === "union");
    return { nuevo, lista: [...sinUnion, nuevo, ...union2] };
  };

  // Reasignar un material a otra OP puede dejar huérfana la OP de la que
  // salió — por eso siempre se limpia después de mover la asignación, no
  // solo al borrar el material.
  const asignar = (materialId: number, valor: string) => {
    if (valor === "__nueva__") {
      const material = materiales.find(m => m.id === materialId);
      const { nuevo, lista } = construirNuevoInicio(material ? nombreMaterial(material) : "");
      const nuevosMateriales = materiales.map(m =>
        m.id === materialId ? { ...m, idComponenteAsignado: nuevo.id } : m
      );
      onUpdateComponentes(limpiarComponentesHuerfanos(nuevosMateriales, lista));
      onUpdateMateriales(nuevosMateriales);
      return;
    }
    const nuevoIdComponente = valor ? Number(valor) : null;
    const nuevosMateriales = materiales.map(m =>
      m.id === materialId ? { ...m, idComponenteAsignado: nuevoIdComponente } : m
    );
    // CORREGIDO (Jose, 2026-09-02: "en cuanto le doy a la palomita... me
    // sigue diciendo describe esta orden" -- y "pasa lo mismo en OP de
    // unión"): cualquier OP que nace vacía -- la OP INICIO 1 que crea
    // elegirIndependientes() cuando todavía no hay material, o la OP de
    // unión, que SIEMPRE nace sin nombre (elegirIndependientes la crea con
    // `nombre: ""` a propósito, porque normalmente no tiene material propio)
    // -- se queda sin nombre para siempre si el material se le asigna
    // DESPUÉS desde este dropdown, porque eso solo tocaba
    // idComponenteAsignado. Aquí se autoetiqueta la OP con el nombre del
    // material en cuanto se le asigna uno -- sea de inicio o de unión --
    // igual que ya hace "＋ Nueva OP de inicio", pero solo si la OP todavía
    // no tiene nombre propio (uno que el usuario ya haya escrito a mano en
    // "Describe esta orden" nunca se pisa).
    const materialAsignado = materiales.find(m => m.id === materialId);
    const componentesActualizados = componentes.map(c =>
      c.id === nuevoIdComponente && !c.nombre.trim() && materialAsignado
        ? { ...c, nombre: nombreMaterial(materialAsignado) }
        : c
    );
    onUpdateComponentes(limpiarComponentesHuerfanos(nuevosMateriales, componentesActualizados));
    onUpdateMateriales(nuevosMateriales);
  };

  // ── celdas ──────────────────────────────────────────────────────────────
  const th: React.CSSProperties = {
    background: "#F6F8FC", fontSize: 11.5, fontWeight: 700, color: T.ink,
    padding: "11px 10px", textAlign: "center", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "12px 10px", fontSize: 13, fontWeight: 600, color: T.inkStrong,
    textAlign: "center", borderBottom: `1px solid ${T.borderSoft}`,
  };

  const chipDe = (m: MaterialEntry) => {
    const comp = componentes.find(c => c.id === m.idComponenteAsignado);
    if (!comp) return <span style={{ color: T.muted, fontWeight: 500, fontSize: 12 }}>Sin asignar</span>;
    const p = paletaOP(comp.tipo, indicePaleta(comp, componentes));
    return <Chip texto={etiquetaComponente(comp, componentes)} bg={p.chipBg} color={p.chipText} />;
  };


  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.95fr 1fr", gap: 16, alignItems: "start" }}>

      {/* ─────────── MATERIALES / COMPONENTES ─────────── */}
      <Tarjeta>
        <TituloSeccion
          titulo="Materiales / Componentes"
          subtitulo="Agrega todos los materiales o componentes que intervienen en el producto. Las medidas de esta tabla son las de cada material, no las del producto."
        />

        {/* overflow:hidden (solo para recortar las esquinas de la tabla al
            border-radius) se quitó a propósito -- estaba recortando también
            el desplegable de SelConAlta cuando se abre en el último
            renglón, dejándolo cortado a la mitad (Jose). El precio es que
            las esquinas de la cabecera ya no se ven perfectamente
            redondeadas -- mucho menor problema que un desplegable inservible. */}
        <table style={{
          width: "100%", borderCollapse: "separate", borderSpacing: 0,
          border: `1px solid ${T.border}`, borderRadius: 10,
        }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 34 }}>#</th>
              <th style={{ ...th, textAlign: "left", minWidth: 190 }}>Material / Componente</th>
              <th style={{ ...th, width: 132 }}>Calibre</th>
              <th style={{ ...th, minWidth: 250 }}>Medida del material</th>
              <th style={{ ...th, width: 152 }}>Preparación</th>
              <th style={{ ...th, width: 158 }}>Asignación</th>
              <th style={{ ...th, width: 78 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {materiales.length === 0 && (
              <tr><td style={{ ...td, color: T.muted, fontWeight: 500 }} colSpan={7}>
                Todavía no hay materiales. Agrega el primero abajo.
              </td></tr>
            )}

            {materiales.map((m, i) => {
              const enEdicion = editandoId === m.id;
              return (
                <tr key={m.id}>
                  <td style={td}>{i + 1}</td>

                  <td style={{ ...td, textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <span style={{
                        width: 32, height: 28, borderRadius: 7, display: "grid", placeItems: "center",
                        color: "#fff", fontSize: 11.5, fontWeight: 700, flexShrink: 0,
                        background: colorMaterial(i),
                      }}>M{i + 1}</span>
                      {enEdicion ? (
                        <SelConAlta
                          catKey="tipo_papel"
                          options={catTipoPapel.map(c => c.nombre)}
                          value={m.tipo}
                          onChange={v => {
                            const item = catTipoPapel.find(c => c.nombre === v);
                            parchar(m.id, { idcat_tipo_papel: item?.id ?? null, tipo: v });
                          }}
                          onAdd={addItem}
                        />
                      ) : nombreMaterial(m)}
                    </div>
                  </td>

                  <td style={td}>
                    {enEdicion ? (
                      <SelConAlta
                        catKey="calibre"
                        options={catCalibre.map(c => c.nombre)}
                        value={m.calibre}
                        onChange={v => {
                          const item = catCalibre.find(c => c.nombre === v);
                          parchar(m.id, { idcat_calibre: item?.id ?? null, calibre: v });
                        }}
                        onAdd={addItem}
                      />
                    ) : (m.calibre.trim() || "—")}
                  </td>

                  <td style={td}>
                    {enEdicion ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <span style={miniLbl}>Ancho</span>
                          <Entrada value={m.ancho} onChange={v => parchar(m.id, { ancho: v })} style={{ height: 34, fontSize: 12.5, padding: "0 8px" }} />
                        </div>
                        <div>
                          <span style={miniLbl}>Altura</span>
                          <Entrada value={m.altura} onChange={v => parchar(m.id, { altura: v })} style={{ height: 34, fontSize: 12.5, padding: "0 8px" }} />
                        </div>
                      </div>
                    ) : medidaMaterial(m)}
                  </td>

                  <td style={td}>
                    {enEdicion ? (
                      <Selector
                        value={m.metodoPreparacion}
                        onChange={v => parchar(m.id, { metodoPreparacion: v })}
                        style={{ height: 34, fontSize: 12.5 }}
                      >
                        <option value="">—</option>
                        <option value="hojeadora">Hojeado</option>
                        <option value="guillotina">Guillotina</option>
                        <option value="proveedor">Proveedor (ya viene al tamaño)</option>
                      </Selector>
                    ) : (ETIQUETA_PREPARACION[m.metodoPreparacion] ?? "—")}
                  </td>

                  <td style={td}>
                    {enEdicion ? (
                      <Selector
                        value={m.idComponenteAsignado ?? ""}
                        onChange={v => asignar(m.id, v)}
                        style={{ height: 34, fontSize: 12.5 }}
                      >
                        <option value="">Sin asignar</option>
                        {componentes.map(c => {
                          // Una OP de inicio solo lleva 1 material propio (Jose,
                          // 2026-09-02: "un material no puede ser asignado a la
                          // misma OP de inicio, solo puede tener 1 por cada OP de
                          // inicio") -- si YA tiene uno (de otro material, no de
                          // este mismo renglón) se deshabilita en vez de
                          // esconderse, para que se vea que existe pero está
                          // ocupada; "＋ Nueva OP de inicio" es el camino para
                          // este material. La OP de unión sí puede llevar más de
                          // un material propio (para fusionarlos por
                          // Litolaminado), así que a ella no se le aplica esta
                          // restricción.
                          const ocupada = c.tipo === "inicio" &&
                            materiales.some(mat => mat.idComponenteAsignado === c.id && mat.id !== m.id);
                          return (
                            <option key={c.id} value={c.id} disabled={ocupada}>
                              {etiquetaComponente(c, componentes)}{ocupada ? " (ya tiene material)" : ""}
                            </option>
                          );
                        })}
                        {modo === "independientes" && <option value="__nueva__">＋ Nueva OP de inicio</option>}
                      </Selector>
                    ) : chipDe(m)}
                  </td>

                  <td style={td}>
                    <span style={{ display: "inline-flex", gap: 12, alignItems: "center", justifyContent: "center" }}>
                      <button
                        type="button" title={enEdicion ? "Listo" : "Editar"}
                        onClick={() => setEditandoId(enEdicion ? null : m.id)}
                        style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "grid", placeItems: "center" }}
                      >
                        {enEdicion
                          ? <span style={{ display: "grid", placeItems: "center", width: 17, height: 17, borderRadius: "50%", background: T.green }}><IcoPalomita size={10} /></span>
                          : <IcoLapiz />}
                      </button>
                      <button
                        type="button" title="Eliminar material"
                        onClick={() => borrarMaterial(m.id)}
                        style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "grid", placeItems: "center" }}
                      >
                        <IcoBote size={17} color={T.danger} />
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button
          type="button" onClick={agregarMaterial}
          style={{
            marginTop: 14, height: 44, padding: "0 18px", border: `1px solid ${T.border}`,
            borderRadius: 10, background: "#fff", color: T.inkStrong, fontSize: 13.5,
            fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 10, boxShadow: T.shadow,
          }}
        >
          <span style={{ fontSize: 19, color: T.primary, fontWeight: 400, lineHeight: 1 }}>+</span>
          Agregar material / componente
        </button>
      </Tarjeta>

      {/* ─────────── ASIGNACIÓN DE MATERIALES ─────────── */}
      <Tarjeta>
        <TituloSeccion
          titulo="Asignación de materiales"
          mayusculas={false}
          subtitulo="Define si cada material irá en la misma orden o en órdenes independientes."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <TarjetaModo
            icono={<IcoCadena />}
            titulo="Misma orden de producción"
            texto="Todos los materiales se trabajarán dentro de una sola orden de producción."
            activa={modo === "unica"}
            onClick={elegirMisma}
          />
          <TarjetaModo
            icono={<IcoRamificar />}
            titulo="Órdenes independientes"
            texto="Cada material se trabajará en una orden propia y después se unirán."
            activa={modo === "independientes"}
            onClick={elegirIndependientes}
          />
        </div>

        {modo === "independientes" && (
          <p style={{ margin: "14px 0 0", fontSize: 12, color: T.muted, fontWeight: 400, lineHeight: 1.6 }}>
            Asigna cada material a su orden en la columna «Asignación» de la tabla. Desde ahí también puedes crear una nueva OP de inicio.
            {" "}Las Órdenes de Producción Complementarias (OPC) -- niveles intermedios que juntan varias OP antes de la unión final -- se agregan
            y se conectan visualmente desde «Ruta de procesos».
          </p>
        )}
      </Tarjeta>
    </div>
  );
}