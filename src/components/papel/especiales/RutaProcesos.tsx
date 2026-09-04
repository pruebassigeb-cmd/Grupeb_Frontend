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
  type NotaProducto, type ProcesoCatOpcion,
} from "../../../services/papel/papel.service";
import { showConfirm } from "../../CustomConfirm";
import {
  T, Tarjeta, TituloSeccion, Boton, Selector, Entrada, Palomita,
  IconoProcesoCuadro, IcoAgarre, IcoBote, IcoLista, IcoFlecha, IcoPalomita,
  IlustracionCaja, paletaOP,
} from "./disenoEspeciales";
import { etiquetaComponente, indiceInicio, nombreMaterial } from "./MaterialesAsignacion";

// ═══════════════════════════════════════════════════════════════════════════
// PROCESO → CATÁLOGO DE MAQUINARIA
// ═══════════════════════════════════════════════════════════════════════════
// Espejo de CLAVE_MAQUINA_POR_TABLA en procesosPapel.controller.ts: se mapea
// por la columna `tabla` de proceso_cat (no por nombre), que es el mismo
// campo con el que el motor decide la máquina de un proceso real.
const CLAVE_MAQUINA_POR_TABLA: Record<string, CatKey> = {
  hojeado_papel: "hojeado_guillotina" as CatKey,
  guillotina_papel: "hojeado_guillotina" as CatKey,
  impresion_papel: "impresora" as CatKey,
  laminacion_papel: "laminado_maquina" as CatKey,
  barniz_uv_papel: "uv" as CatKey,
  hot_stamping_papel: "hs_ar" as CatKey,
  texturizado_papel: "texturizadora" as CatKey,
  alto_relieve_papel: "hs_ar" as CatKey,
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

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
interface MaterialRef { id: number; etiqueta: string; }

const refsDeComponente = (materiales: MaterialEntry[], idComponente: number): MaterialRef[] =>
  materiales
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.idComponenteAsignado === idComponente)
    .map(({ m, i }) => ({ id: m.id, etiqueta: `${nombreMaterial(m)} (M${i + 1})` }));

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
    const ids = (comp.maquinaria[clave] ?? []) as number[];
    const items = (catalogs?.[clave] ?? []) as CatItem[];
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
function SelectorMaquina({ clave, tipoMaquina, comp, catalogs, onCambiar }: {
  clave: CatKey;
  tipoMaquina?: "hojeadora" | "guillotina";
  comp: ComponentePapel;
  catalogs: Catalogs;
  onCambiar: (patch: Record<string, number[] | string[]>) => void;
}) {
  const todos = (catalogs?.[clave] ?? []) as CatItem[];
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
          <SelectorMaquina clave={clave} tipoMaquina={tipoMaquina} comp={comp} catalogs={catalogs} onCambiar={onMaquinaria} />
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

      {/* NUEVO (Fase 2, Jose 2026-09-01): cuántas veces se repite este
          proceso antes de pasar al siguiente ("Laminación x2"). 1 = sin
          repetición, comportamiento de siempre. */}
      <div style={{ maxWidth: 160 }}>
        <span style={lbl}>Se repite (veces)</span>
        <input
          type="number" min={1} step={1}
          value={proceso.veces ?? 1}
          onChange={e => {
            const n = Math.max(1, Math.round(Number(e.target.value) || 1));
            onProceso({ veces: n });
          }}
          style={{
            width: "100%", height: 34, padding: "0 8px", border: `1px solid ${T.border}`, borderRadius: 5,
            fontSize: 12.5, color: T.inkStrong, background: "#fff", outline: "none", boxSizing: "border-box",
          }}
        />
        {(proceso.veces ?? 1) > 1 && (
          <span style={{ display: "block", fontSize: 10.5, color: T.muted, marginTop: 4, lineHeight: 1.5 }}>
            Este proceso se corre {proceso.veces} veces seguidas antes de pasar al siguiente de la ruta.
          </span>
        )}
      </div>
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
}) {
  const pal = paletaOP(comp.tipo, indiceInicio(comp, componentes));
  const refs = refsDeComponente(materiales, comp.id);
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
              ? (comp.tipo === "union"
                // La OP de unión sin material propio NO es un error ni un
                // dato faltante -- es lo normal: recibe las piezas ya
                // hechas de sus OP de inicio en vez de partir de un
                // material propio (Jose, 2026-09-02: "en el apartado de op
                // de union cada que no tenga material asignado aqui hay
                // que cambiar la leyenda", porque "(sin material
                // asignado)" sonaba a que faltaba algo).
                ? "(usa las piezas de sus OP de inicio)"
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
            const nombre = proceso.procesoNombre || nombreCortoProceso(cat?.tabla, cat?.nombre_proceso ?? "") || "—";
            const detalle = detalleCorto(proceso, comp, cat, catalogs);
            const expandido = !pantallaCompleta && abierto === proceso.id;
            return (
              <div key={proceso.id} data-proceso-card={proceso.id} style={{
                border: `1px solid ${expandido ? "#BFD3F2" : T.borderSoft}`, borderRadius: 9,
                padding: "9px 10px", marginBottom: 7, background: "#fff",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <IconoProcesoCuadro nombre={nombre} />
                  <span
                    onClick={() => { if (!pantallaCompleta) setAbierto(expandido ? null : proceso.id); }}
                    style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2, flex: 1, cursor: pantallaCompleta ? "default" : "pointer" }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.inkStrong, lineHeight: 1.35 }}>
                      {i + 1}. {nombre}
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
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: pantallaCompleta ? "1fr" : "186px 1fr", gap: 18, alignItems: "start" }}>
      {!pantallaCompleta && (
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, background: "#FBFCFE", padding: "14px 12px" }}>
        <h4 style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: T.inkStrong }}>Procesos disponibles</h4>
        <p style={{ fontSize: 11.5, color: T.inkSoft, margin: "0 0 12px", fontWeight: 400 }}>Toca uno para agregarlo</p>
        {filtrarPorPreparacion(comp, procesosCat).map(p => {
          const yaEsta = comp.procesos.some(cp => cp.idproceso_cat === p.idproceso_cat);
          const nombreCorto = nombreCortoProceso(p.tabla, p.nombre_proceso);
          return (
            <button
              key={p.idproceso_cat} type="button" disabled={yaEsta}
              onClick={() => agregarProceso(comp, p)}
              title={yaEsta ? "Ya está en la ruta" : "Agregar a la ruta"}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 11, background: "#fff",
                border: `1px solid ${T.borderSoft}`, borderRadius: 9, padding: "8px 10px", marginBottom: 6,
                cursor: yaEsta ? "not-allowed" : "pointer", opacity: yaEsta ? 0.45 : 1,
                fontFamily: "inherit", textAlign: "left",
              }}
            >
              <IconoProcesoCuadro nombre={nombreCorto} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.inkStrong }}>{nombreCorto}</span>
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
          <div style={{ display: "flex", alignItems: "stretch", overflowX: "auto", paddingBottom: 6 }}>
            {comp.procesos.map((proceso, i) => {
              const cat = proceso.idproceso_cat != null ? catPorId.get(proceso.idproceso_cat) : undefined;
              const nombre = proceso.procesoNombre || nombreCortoProceso(cat?.tabla, cat?.nombre_proceso ?? "") || "—";
              const clave = cat ? CLAVE_MAQUINA_POR_TABLA[cat.tabla] : undefined;
              const ids = clave ? ((comp.maquinaria[clave] ?? []) as number[]) : [];
              const items = clave ? ((catalogs?.[clave] ?? []) as CatItem[]) : [];
              const maquina = ids.map(id => items.find(x => x.id === id)?.nombre).filter(Boolean).join(" · ");
              const usados = proceso.materiales.length > 0
                ? proceso.materiales.map(id => refDeMaterial(materiales, id))
                : refsDeComponente(materiales, comp.id).map(r => r.etiqueta);
              const expandido = !pantallaCompleta && abierto === proceso.id;
              return (
                <div key={proceso.id} data-proceso-card={proceso.id} style={{ display: "flex", alignItems: "stretch" }}>
                  <div style={{
                    width: 210, flexShrink: 0, border: `1px solid ${expandido ? "#BFD3F2" : T.border}`,
                    borderRadius: 12, background: "#fff", boxShadow: T.shadow, padding: "14px 14px 16px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 12 }}>
                      <IconoProcesoCuadro nombre={nombre} />
                      <span
                        onClick={() => { if (!pantallaCompleta) setAbierto(expandido ? null : proceso.id); }}
                        style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, cursor: pantallaCompleta ? "default" : "pointer" }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.inkStrong, lineHeight: 1.35 }}>{i + 1}. {nombre}</span>
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
    if (unica || !union || inicios.length === 0) { setGeomFlujo(null); return; }
    const contenedor = contenedorFlujoRef.current;
    if (!contenedor) return;

    const recalcular = () => {
      const contRect = contenedor.getBoundingClientRect();
      const relativo = (r: DOMRect) => ({
        top: r.top - contRect.top, left: r.left - contRect.left,
        right: r.right - contRect.left, bottom: r.bottom - contRect.top,
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
  }, [inicios.length, union, unica, materiales, componentes, compacta, pantallaCompleta]);

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
    const metodos = new Set(
      materiales.filter(m => m.idComponenteAsignado === comp.id).map(m => m.metodoPreparacion).filter(Boolean)
    );
    if (metodos.size !== 1) return ordenarCatalogoCanonico(lista);
    const metodo = [...metodos][0];
    // "Proveedor" (Jose, 2026-09-02): el material ya llega al tamaño exacto
    // -- lo compran así o se lo entrega quien pidió el producto -- así que
    // ni Hojeado ni Guillotina aplican, ninguno de los dos se ofrece.
    if (metodo === "proveedor") {
      return ordenarCatalogoCanonico(lista.filter(p => p.tabla !== "hojeado_papel" && p.tabla !== "guillotina_papel"));
    }
    const tablaExcluida = metodo === "hojeadora" ? "guillotina_papel"
      : metodo === "guillotina" ? "hojeado_papel" : null;
    return ordenarCatalogoCanonico(tablaExcluida ? lista.filter(p => p.tabla !== tablaExcluida) : lista);
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

  const agregarProceso = (comp: ComponentePapel, cat: ProcesoCatOpcion) => {
    const nuevo = newComponenteProceso();
    nuevo.idproceso_cat = cat.idproceso_cat;
    nuevo.procesoNombre = nombreCortoProceso(cat.tabla, cat.nombre_proceso);
    nuevo.orden = comp.procesos.length + 1;
    const refs = refsDeComponente(materiales, comp.id);
    if (refs.length === 1) nuevo.materiales = [refs[0].id];
    const campoLleva = TABLA_A_LLEVA[cat.tabla];
    parcharComp(comp.id, {
      procesos: renumerar(ordenarCanonico([...comp.procesos, nuevo])),
      ...(campoLleva ? { acabados: { ...comp.acabados, [campoLleva]: true } } : {}),
    });
    setEligiendoEn(null);
    setAbierto(nuevo.id);
  };

  const quitarProceso = (comp: ComponentePapel, procesoId: number) => {
    const proceso = comp.procesos.find(p => p.id === procesoId);
    const tabla = proceso?.idproceso_cat != null ? catPorId.get(proceso.idproceso_cat)?.tabla : undefined;
    const campoLleva = tabla ? TABLA_A_LLEVA[tabla] : undefined;
    parcharComp(comp.id, {
      procesos: comp.procesos.filter(p => p.id !== procesoId).map((p, i) => ({ ...p, orden: i + 1 })),
      ...(campoLleva ? { acabados: { ...comp.acabados, [campoLleva]: false } } : {}),
    });
  };

  const borrarTodo = async () => {
    if (totalProcesos === 0) return;
    const ok = await showConfirm("Se van a quitar TODOS los procesos de la ruta. ¿Continuar?");
    if (!ok) return;
    onUpdateComponentes(componentes.map(c => ({ ...c, procesos: [] })));
  };

  // ── piezas visuales ─────────────────────────────────────────────────────
  const botonesCabecera = (
    <>
      <Boton onClick={borrarTodo} disabled={totalProcesos === 0}><IcoBote /> Borrar todo</Boton>
      <Boton onClick={() => setCompacta(v => !v)}><IcoLista /> {compacta ? "Vista detallada" : "Vista compacta"}</Boton>
      <Boton onClick={() => setPantallaCompleta(true)}><IcoLista /> Previsualizar</Boton>
    </>
  );

  // El componente al que le corresponde el picker abierto (puede ser una OP
  // de inicio o la de unión, las dos usan TarjetaOP).
  const compEligiendo = eligiendoEn
    ? [...inicios, ...(union ? [union] : [])].find(c => c.id === eligiendoEn.id) ?? null
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
    const disponibles = filtrarPorPreparacion(
      compEligiendo,
      procesosCat.filter(p => !compEligiendo.procesos.some(cp => cp.idproceso_cat === p.idproceso_cat))
    );
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
            Ya se agregaron todos los procesos disponibles.
          </div>
        ) : disponibles.map(p => {
          const nombreCorto = nombreCortoProceso(p.tabla, p.nombre_proceso);
          return (
            <button
              key={p.idproceso_cat} type="button" onClick={() => agregarProceso(compEligiendo, p)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "7px 11px",
                border: "none", background: "transparent", cursor: "pointer", textAlign: "left",
                fontSize: 12.5, fontWeight: 600, color: T.inkStrong, fontFamily: "inherit",
              }}
            >
              <IconoProcesoCuadro nombre={nombreCorto} size={22} />
              {nombreCorto}
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

    // NUEVO (Jose, 2026-09-01): si la unión NO tiene material propio, es
    // solo un junte lógico de piezas (como cajas de regalo o roscas de
    // reyes) -- no necesita Litolaminado, no se pegan. Si SÍ tiene material
    // propio, ese material es justo lo que fusiona las piezas de las OP de
    // inicio, y Litolaminado sí aplica. Las dos combinaciones "raras" se
    // avisan aquí; la primera además bloquea guardar (ver guardar() más
    // abajo) porque describe un proceso sin nada que procesar.
    if (union) {
      const materialUnion = refsDeComponente(materiales, union.id);
      const litoEnUnion = union.procesos.some(p => tablaDe(p) === "litolaminado_papel");
      if (litoEnUnion && materialUnion.length === 0) {
        reglas.push("⚠ La OP de unión lleva Litolaminado pero no tiene material propio asignado — sin material que fusionar, ese proceso no debería estar en su ruta.");
      } else if (!litoEnUnion && materialUnion.length > 0) {
        reglas.push("La OP de unión tiene material propio asignado: probablemente necesite Litolaminado en su ruta para fusionarlo con las piezas de las OP de inicio.");
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
      nombreProducto={nombreProducto}
    />
  ) : (
    <div
      ref={contenedorFlujoRef}
      style={{ display: "flex", alignItems: "center", overflow: "auto", padding: "26px 4px", position: "relative" }}
    >
      {overlayConectores}
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
            />
          </div>
        ))}
      </div>
      {union && (
        <>
          <EspacioConector />
          <PuntoDeUnion cardRef={el => { puntoUnionCardRef.current = el; }} />
          <EspacioConector />
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
          />
        </>
      )}
      <div style={{ width: 62, flexShrink: 0, display: "grid", placeItems: "center", color: T.inkStrong }}>
        <IcoFlecha />
      </div>
      <ProductoTerminado />
    </div>
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