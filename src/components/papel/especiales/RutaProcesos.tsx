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

import { useEffect, useMemo, useState } from "react";
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
  armado_papel: "armado" as CatKey,
  empaque_papel: "empaque_maquina" as CatKey,
  litolaminado_papel: "empalme" as CatKey,
};

const TIPO_MAQUINA_POR_TABLA: Record<string, "hojeadora" | "guillotina"> = {
  hojeado_papel: "hojeadora",
  guillotina_papel: "guillotina",
};

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

function CampoCat({ etiqueta, clave, catalogs, valor, onChange, ancho }: {
  etiqueta: string; clave: string; catalogs: Catalogs;
  valor: number | null; onChange: (id: number | null, nombre: string) => void; ancho?: boolean;
}) {
  const items = ((catalogs as unknown as Record<string, CatItem[]>)[clave] ?? []) as CatItem[];
  return (
    <div style={ancho ? { gridColumn: "span 2" } : undefined}>
      <span style={lbl}>{etiqueta}</span>
      <Selector
        value={valor ?? ""}
        onChange={v => {
          const it = items.find(i => String(i.id) === v);
          onChange(it?.id ?? null, it?.nombre ?? "");
        }}
        style={{ height: 34, fontSize: 12.5 }}
      >
        <option value="">—</option>
        {items.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
      </Selector>
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
// DETALLE EXPANDIBLE DE UN PROCESO
// ═══════════════════════════════════════════════════════════════════════════
function DetalleProceso({
  proceso, comp, cat, catalogs, materiales, procesosCat, onProceso, onMaquinaria, onComp, onMaterial,
  tamanoAsaDefault, onTamanoAsaDefaultChange,
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
              procesoNombre: catGuillotina.nombre_proceso,
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
        // El color/tipo de laminado (catálogo "Laminado") ya no se pregunta
        // aquí: se determina hasta el pedido (Jose). "Medida" es el tamaño
        // del asa (producto_papel.tamano_asa_default, ya existe en la base)
        // -- se captura aquí porque es donde tiene sentido para Jose, aunque
        // es un dato del producto, no del componente.
        return (
          <div style={bloqueCampos}>
            <CampoCat
              etiqueta="Rollo de laminado" clave="rollo_lam" catalogs={catalogs}
              valor={comp.acabados.idrollo_lam}
              onChange={(id, nombre) => acab({ idrollo_lam: id, rolloLamNombre: nombre })}
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
            />
            <CampoCat
              etiqueta="Pegamento" clave="pegamento" catalogs={catalogs}
              valor={comp.acabados.idcat_pegamento}
              onChange={id => acab({ idcat_pegamento: id })}
            />
            <CampoCat
              etiqueta="Asa" clave="tipo_asa" catalogs={catalogs}
              valor={comp.acabados.asas[0] ?? null}
              onChange={(id, nombre) => acab({
                asas: id != null ? [id] : [],
                asasNombres: id != null ? [nombre] : [],
              })}
            />
            <CampoCat
              etiqueta="Refuerzo — material" clave="refuerzo_material" catalogs={catalogs}
              valor={comp.acabados.idcat_refuerzo_material}
              onChange={id => acab({ idcat_refuerzo_material: id })}
            />
            <CampoCat
              etiqueta="Refuerzo — medida" clave="refuerzo_medidas" catalogs={catalogs}
              valor={comp.acabados.idcat_refuerzo_medidas}
              onChange={(id, nombre) => acab({ idcat_refuerzo_medidas: id, refuerzoMedidaNombre: nombre })}
            />
            <CampoCat
              etiqueta="Base — material" clave="refuerzo_material" catalogs={catalogs}
              valor={comp.acabados.idcat_base_material}
              onChange={id => acab({ idcat_base_material: id })}
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function RutaProcesos({
  componentes, onUpdateComponentes, materiales, onUpdateMateriales, catalogs, nombreProducto,
  procesosCat, errorProcesos, idproducto, notasPendientes, onNotasPendientesChange,
  tamanoAsaDefault, onTamanoAsaDefaultChange,
}: {
  componentes: ComponentePapel[];
  onUpdateComponentes: (componentes: ComponentePapel[]) => void;
  materiales: MaterialEntry[];
  onUpdateMateriales: (materiales: MaterialEntry[]) => void;
  catalogs: Catalogs;
  nombreProducto: string;
  procesosCat: ProcesoCatOpcion[];
  errorProcesos: string;
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
}) {
  const errorCat = errorProcesos;
  const [compacta, setCompacta] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);
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

  // ── Precedencia: el Litolaminado va SIEMPRE antes del Suaje ───────────
  // Es donde se juntan las piezas; suajear antes de litolaminar no tiene
  // sentido físico (Jose). Es la única regla dura de la ruta: el resto del
  // orden lo decide quien captura.
  const tablaDe = (p: ComponenteProceso): string =>
    (p.idproceso_cat != null ? catPorId.get(p.idproceso_cat)?.tabla : undefined) ?? "";

  const rompeReglaLito = (lista: ComponenteProceso[]): boolean => {
    const iLito = lista.findIndex(p => tablaDe(p) === "litolaminado_papel");
    const iSuaje = lista.findIndex(p => tablaDe(p) === "suaje_produccion_papel");
    return iLito >= 0 && iSuaje >= 0 && iLito > iSuaje;
  };

  // Coloca un proceso recién agregado donde le toca en vez de siempre al
  // final: el Litolaminado se mete antes del Suaje, y el Suaje después del
  // Litolaminado.
  const insertarConRegla = (lista: ComponenteProceso[], nuevo: ComponenteProceso, tabla: string): ComponenteProceso[] => {
    if (tabla === "litolaminado_papel") {
      const iSuaje = lista.findIndex(p => tablaDe(p) === "suaje_produccion_papel");
      if (iSuaje >= 0) return [...lista.slice(0, iSuaje), nuevo, ...lista.slice(iSuaje)];
    }
    return [...lista, nuevo];
  };

  const renumerar = (lista: ComponenteProceso[]): ComponenteProceso[] =>
    lista.map((p, i) => ({ ...p, orden: i + 1 }));

  const unica = componentes.find(c => c.tipo === "unica") ?? null;
  const inicios = componentes.filter(c => c.tipo === "inicio");
  const union = componentes.find(c => c.tipo === "union") ?? null;

  // ── Hojeado / Guillotina según el método de preparación del material ──
  // "+ Agregar proceso" solo debe ofrecer el que corresponde a lo que se
  // eligió en Preparación (Hojeado o Guillotina) para el/los materiales de
  // esa OP, no los dos (Jose). Si hay materiales con métodos distintos, o
  // ninguno capturado, no se filtra nada. El checkbox "Lleva guillotina"
  // dentro del detalle de Hojeado es la única forma de tener ambos en la
  // misma OP (ver DetalleProceso).
  const filtrarPorPreparacion = (comp: ComponentePapel, lista: ProcesoCatOpcion[]): ProcesoCatOpcion[] => {
    const metodos = new Set(
      materiales.filter(m => m.idComponenteAsignado === comp.id).map(m => m.metodoPreparacion).filter(Boolean)
    );
    if (metodos.size !== 1) return lista;
    const tablaExcluida = [...metodos][0] === "hojeadora" ? "guillotina_papel"
      : [...metodos][0] === "guillotina" ? "hojeado_papel" : null;
    return tablaExcluida ? lista.filter(p => p.tabla !== tablaExcluida) : lista;
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
    nuevo.procesoNombre = cat.nombre_proceso;
    nuevo.orden = comp.procesos.length + 1;
    const refs = refsDeComponente(materiales, comp.id);
    if (refs.length === 1) nuevo.materiales = [refs[0].id];
    const campoLleva = TABLA_A_LLEVA[cat.tabla];
    parcharComp(comp.id, {
      procesos: renumerar(insertarConRegla(comp.procesos, nuevo, cat.tabla)),
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
  // ese contenedor ya no lo puede recortar. También tiene una X explícita y
  // un overlay invisible detrás para cerrarlo con un clic fuera.
  const PickerProcesos = () => {
    if (!eligiendoEn || !compEligiendo) return null;
    const disponibles = filtrarPorPreparacion(
      compEligiendo,
      procesosCat.filter(p => !compEligiendo.procesos.some(cp => cp.idproceso_cat === p.idproceso_cat))
    );
    return createPortal(
      <>
        <div
          onClick={() => setEligiendoEn(null)}
          style={{ position: "fixed", inset: 0, zIndex: 2050, background: "transparent" }}
        />
        <div style={{
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
          ) : disponibles.map(p => (
            <button
              key={p.idproceso_cat} type="button" onClick={() => agregarProceso(compEligiendo, p)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "7px 11px",
                border: "none", background: "transparent", cursor: "pointer", textAlign: "left",
                fontSize: 12.5, fontWeight: 600, color: T.inkStrong, fontFamily: "inherit",
              }}
            >
              <IconoProcesoCuadro nombre={p.nombre_proceso} size={22} />
              {p.nombre_proceso}
            </button>
          ))}
        </div>
      </>,
      document.body
    );
  };

  // Una tarjeta de OP (columna) — vista de "órdenes independientes".
  const TarjetaOP = ({ comp }: { comp: ComponentePapel }) => {
    const pal = paletaOP(comp.tipo, indiceInicio(comp, componentes));
    const refs = refsDeComponente(materiales, comp.id);
    return (
      <div style={{ width: 206, flexShrink: 0 }}>
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
              {refs.length === 0 ? "(sin material asignado)" : `(Material: ${refs.map(r => r.etiqueta).join(", ")})`}
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
              const nombre = proceso.procesoNombre || cat?.nombre_proceso || "—";
              const detalle = detalleCorto(proceso, comp, cat, catalogs);
              const expandido = !pantallaCompleta && abierto === proceso.id;
              return (
                <div key={proceso.id} style={{
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
                  const r = e.currentTarget.getBoundingClientRect();
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
  };

  const Conector = ({ variante }: { variante: "baja" | "entra" | "sube" }) => (
    <div style={{ width: 74, flexShrink: 0, alignSelf: "stretch", position: "relative", minHeight: 150 }}>
      <svg width={74} height={300} viewBox="0 0 74 300" fill="none" style={{ position: "absolute", top: 60, left: 0 }}>
        {variante === "baja" && (
          <path d="M0 34 H38 V210" stroke={T.dash} strokeWidth={1.7} strokeDasharray="7 6" strokeLinecap="round" />
        )}
        {variante === "entra" && (
          <>
            <path d="M0 34 H26 V126 H66" stroke={T.dash} strokeWidth={1.7} strokeDasharray="7 6" strokeLinecap="round" />
            <path d="M60 120 L69 126 L60 132" stroke={T.dash} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {variante === "sube" && (
          <path d="M0 126 H36 V34 H74" stroke={T.dash} strokeWidth={1.7} strokeDasharray="7 6" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );

  const PuntoDeUnion = () => (
    <div style={{ width: 150, flexShrink: 0, marginTop: 96 }}>
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
      overflow: "hidden", background: "#fff", alignSelf: "flex-start", marginTop: 14,
    }}>
      <div style={{ background: T.orangeBg, padding: "13px 12px", textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.orangeText, letterSpacing: "0.03em", marginBottom: 4 }}>
          PRODUCTO TERMINADO
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.orangeText }}>
          {nombreProducto.trim() || "(sin nombre)"}
        </div>
      </div>
      <div style={{ padding: "16px 14px 18px", textAlign: "center" }}>
        <IlustracionCaja />
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
  const PanelNotas = () => {
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
  };

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

  // ── vista "misma orden": paleta + cadena horizontal ─────────────────────
  const VistaMismaOrden = ({ comp }: { comp: ComponentePapel }) => (
    <div style={{ display: "grid", gridTemplateColumns: pantallaCompleta ? "1fr" : "186px 1fr", gap: 18, alignItems: "start" }}>
      {!pantallaCompleta && (
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, background: "#FBFCFE", padding: "14px 12px" }}>
        <h4 style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: T.inkStrong }}>Procesos disponibles</h4>
        <p style={{ fontSize: 11.5, color: T.inkSoft, margin: "0 0 12px", fontWeight: 400 }}>Toca uno para agregarlo</p>
        {filtrarPorPreparacion(comp, procesosCat).map(p => {
          const yaEsta = comp.procesos.some(cp => cp.idproceso_cat === p.idproceso_cat);
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
              <IconoProcesoCuadro nombre={p.nombre_proceso} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.inkStrong }}>{p.nombre_proceso}</span>
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
              const nombre = proceso.procesoNombre || cat?.nombre_proceso || "—";
              const clave = cat ? CLAVE_MAQUINA_POR_TABLA[cat.tabla] : undefined;
              const ids = clave ? ((comp.maquinaria[clave] ?? []) as number[]) : [];
              const items = clave ? ((catalogs?.[clave] ?? []) as CatItem[]) : [];
              const maquina = ids.map(id => items.find(x => x.id === id)?.nombre).filter(Boolean).join(" · ");
              const usados = proceso.materiales.length > 0
                ? proceso.materiales.map(id => refDeMaterial(materiales, id))
                : refsDeComponente(materiales, comp.id).map(r => r.etiqueta);
              const expandido = !pantallaCompleta && abierto === proceso.id;
              return (
                <div key={proceso.id} style={{ display: "flex", alignItems: "stretch" }}>
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

      {unica ? <VistaMismaOrden comp={unica} /> : (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingBottom: 4 }}>
            {inicios.map((comp, i) => (
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
                  display: "flex", alignItems: "stretch",
                  opacity: arrastrandoId === comp.id ? 0.45 : 1,
                  outline: sobreId === comp.id && arrastrandoId !== null && arrastrandoId !== comp.id ? `2px dashed ${T.primary}` : "none",
                  outlineOffset: 2, borderRadius: 12, transition: "opacity .12s",
                }}
              >
                <TarjetaOP comp={comp} />
                {union && <Conector variante={i === inicios.length - 1 ? "entra" : "baja"} />}
              </div>
            ))}
            {union && (
              <>
                <PuntoDeUnion />
                <Conector variante="sube" />
                <TarjetaOP comp={union} />
              </>
            )}
            <div style={{ width: 62, flexShrink: 0, display: "grid", placeItems: "center", alignSelf: "center", color: T.inkStrong }}>
              <IcoFlecha />
            </div>
            <ProductoTerminado />
          </div>
          <Leyenda />
        </>
      )}
    </Tarjeta>
  );

  // El "Previsualizar" abre SOLO el diagrama en pantalla completa: el
  // módulo vive dentro del layout normal del formulario (ancho limitado,
  // scroll de la página), y con órdenes independientes + unión el flujo
  // horizontal no cabe -- Jose pidió una forma de verlo completo sin ese
  // límite. Resumen/Reglas/Notas no van aquí, se quedan abajo en la vista
  // normal. Se reemplaza el diagrama normal por el de pantalla completa (no
  // se montan los dos a la vez) para no duplicar las tarjetas de OP con el
  // mismo estado.
  return (
    <>
      {pantallaCompleta ? createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 2000, background: T.bg,
          overflow: "auto", padding: "18px 26px 40px", fontFamily: T.font,
        }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Boton onClick={() => setPantallaCompleta(false)}>✕ Cerrar previsualización</Boton>
          </div>
          {flujo}
        </div>,
        document.body
      ) : flujo}

      <Paneles />
      <PanelNotas />

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