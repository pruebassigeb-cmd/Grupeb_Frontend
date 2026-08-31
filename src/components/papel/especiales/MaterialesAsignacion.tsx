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
import type { CatItem, ComponentePapel, MaterialEntry } from "../../../types/papel/papel.types";
import { newComponente, newComponenteProceso, newMaterial } from "../../../types/papel/papel.types";
import type { ProcesoCatOpcion } from "../../../services/papel/papel.service";
import {
  T, Tarjeta, TituloSeccion, Chip, Entrada, Selector, Palomita,
  IcoCadena, IcoRamificar, IcoLapiz, IcoBote, IcoPalomita,
  colorMaterial, paletaOP,
} from "./disenoEspeciales";

// ═══════════════════════════════════════════════════════════════════════════
// ETIQUETAS DE COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════
export const etiquetaComponente = (comp: ComponentePapel, componentes: ComponentePapel[]): string => {
  if (comp.tipo === "unica") return "MISMA OP";
  if (comp.tipo === "union") return "OP DE UNIÓN";
  const inicios = componentes.filter(c => c.tipo === "inicio");
  return `OP INICIO ${inicios.findIndex(c => c.id === comp.id) + 1}`;
};

export const indiceInicio = (comp: ComponentePapel, componentes: ComponentePapel[]): number =>
  componentes.filter(c => c.tipo === "inicio").findIndex(c => c.id === comp.id);

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
}: {
  materiales: MaterialEntry[];
  onUpdateMateriales: (materiales: MaterialEntry[]) => void;
  componentes: ComponentePapel[];
  onUpdateComponentes: (componentes: ComponentePapel[]) => void;
  catTipoPapel: CatItem[];
  catCalibre: CatItem[];
  procesosCat: ProcesoCatOpcion[];
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
    const inicios: ComponentePapel[] = materiales.map((m, i) => ({
      ...newComponente(),
      id: Date.now() + i,
      tipo: "inicio",
      nombre: nombreMaterial(m),
      orden: i + 1,
      esUnion: false,
    }));
    const lista: ComponentePapel[] = inicios.length > 0
      ? inicios
      : [{ ...newComponente(), tipo: "inicio", orden: 1 }];
    // La orden de unión arranca SIEMPRE con el Litolaminado: es el proceso
    // donde físicamente se juntan las piezas de las órdenes de inicio, así
    // que se siembra solo (Jose). Si por lo que sea no está en el catálogo,
    // la orden se crea vacía y el usuario la arma a mano.
    const lito = procesosCat.find(p => p.tabla === "litolaminado_papel");
    const primerProceso = lito
      ? [{
          ...newComponenteProceso(),
          idproceso_cat: lito.idproceso_cat,
          procesoNombre: lito.nombre_proceso,
          orden: 1,
        }]
      : [];
    const union: ComponentePapel = {
      ...newComponente(),
      id: Date.now() + lista.length + 1,
      tipo: "union",
      nombre: "",
      orden: lista.length + 1,
      esUnion: true,
      procesos: primerProceso,
    };
    onUpdateComponentes([...lista, union]);
    onUpdateMateriales(materiales.map((m, i) => ({ ...m, idComponenteAsignado: lista[i]?.id ?? null })));
  };

  const construirNuevoInicio = (nombre: string = ""): { nuevo: ComponentePapel; lista: ComponentePapel[] } => {
    const nuevo: ComponentePapel = {
      ...newComponente(), tipo: "inicio", nombre, orden: componentes.length + 1, esUnion: false,
    };
    // La OP de unión siempre va al final de la lista.
    const sinUnion = componentes.filter(c => c.tipo !== "union");
    const union = componentes.filter(c => c.tipo === "union");
    return { nuevo, lista: [...sinUnion, nuevo, ...union] };
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
    onUpdateComponentes(limpiarComponentesHuerfanos(nuevosMateriales, componentes));
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
    const p = paletaOP(comp.tipo, indiceInicio(comp, componentes));
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

        <table style={{
          width: "100%", borderCollapse: "separate", borderSpacing: 0,
          border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden",
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
                        <Selector
                          value={m.idcat_tipo_papel ?? ""}
                          onChange={v => {
                            const item = catTipoPapel.find(c => String(c.id) === v);
                            parchar(m.id, { idcat_tipo_papel: item?.id ?? null, tipo: item?.nombre ?? "" });
                          }}
                          style={{ height: 34, fontSize: 12.5 }}
                        >
                          <option value="">Selecciona...</option>
                          {catTipoPapel.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </Selector>
                      ) : nombreMaterial(m)}
                    </div>
                  </td>

                  <td style={td}>
                    {enEdicion ? (
                      <Selector
                        value={m.idcat_calibre ?? ""}
                        onChange={v => {
                          const item = catCalibre.find(c => String(c.id) === v);
                          parchar(m.id, { idcat_calibre: item?.id ?? null, calibre: item?.nombre ?? "" });
                        }}
                        style={{ height: 34, fontSize: 12.5 }}
                      >
                        <option value="">—</option>
                        {catCalibre.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </Selector>
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
                        {componentes.map(c => (
                          <option key={c.id} value={c.id}>{etiquetaComponente(c, componentes)}</option>
                        ))}
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
          </p>
        )}
      </Tarjeta>
    </div>
  );
}