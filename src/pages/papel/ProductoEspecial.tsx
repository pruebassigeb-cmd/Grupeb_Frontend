// src/pages/papel/ProductoEspecial.tsx
//
// Pantalla propia de productos especiales: listado + alta/edición con el
// formulario del diseño del cliente (FormularioProductoEspecial).
//
// Es un módulo INDEPENDIENTE del alta normal de papel: no monta Papel.tsx ni
// FormularioProductoPapelAlta.tsx, y esos dos archivos quedaron sin cambios.
// Lo único que comparte con el resto del sistema es infraestructura, no
// formulario: el layout, el hook de productos, los tipos (que son el
// contrato con el backend) y el servicio.

import { Fragment, useEffect, useMemo, useState } from "react";
import type React from "react";
import { useAuth } from "../../context/AuthContext";
import Dashboard from "../../layouts/Sidebar";
import {
  newProductoForm, newGrupo, newMaterial, newSuaje, newAcabados, newMaquinaria,
} from "../../types/papel/papel.types";
import type {
  Acabados, Maquinaria, ProductoPapelForm, ProductoPapelListItem, Suaje,
} from "../../types/papel/papel.types";
import {
  CATEGORIA_IMAGEN_PRODUCTO_ESPECIAL, crearNotaProducto, fetchProductoPapelById, subirImagenProducto,
} from "../../services/papel/papel.service";
import { useProductosPapel } from "../../hooks/papel/useProductosPapel";
import { limpiarBorrador } from "../../hooks/useBorradorFormulario";
import { claveBorradorProductoPapel } from "../../utils/clavesBorrador";
import FormularioProductoEspecial from "../../components/papel/especiales/FormularioProductoEspecial";
import type { ProductoEspecialConId } from "../../components/papel/especiales/FormularioProductoEspecial";
import { T, Boton, Entrada, IcoLapiz, IcoBote, Chip, paletaOP } from "../../components/papel/especiales/disenoEspeciales";
import { etiquetaComponente, indiceInicio, nombreComponente } from "../../components/papel/especiales/MaterialesAsignacion";
// NOMBRES_PROCESO_PAPEL (Jose, 2026-09-04): el catálogo (proceso_cat.nombre_proceso)
// trae el nombre completo tal cual se dio de alta ("Impresión Papel", "Suaje
// Papel", etc.) -- este es el mismo mapa de nombres cortos que ya usan
// Seguimiento y los modales de proceso, para que un producto especial no se
// vea distinto aquí que en el resto del sistema.
import { NOMBRES_PROCESO_PAPEL } from "../../types/papel/seguimientoPapel.types";
import type { NombreProcesoPapel } from "../../types/papel/seguimientoPapel.types";

// Nombre corto de un proceso a partir de su `tabla` (llave estable), con
// respaldo al nombre crudo del catálogo solo si la tabla no se reconoce
// (proceso nuevo aún no mapeado) -- nunca al revés, porque el nombre crudo
// SIEMPRE existe pero casi nunca es el que se quiere mostrar.
const nombreCortoDeProceso = (p: { tabla?: string | null; nombre_proceso?: string | null }): string =>
  (p.tabla && NOMBRES_PROCESO_PAPEL[p.tabla as NombreProcesoPapel]) || p.nombre_proceso || "";

// ═══════════════════════════════════════════════════════════════════════════
// MAPEOS API → FORM
// ═══════════════════════════════════════════════════════════════════════════
// Vienen de la Fase 3 (antes vivían en Papel.tsx). Se mudaron aquí porque el
// camino de edición de un producto especial ahora es de este módulo, y
// Papel.tsx volvió a quedar exactamente como estaba.
function mapApiSuajeToForm(api: any): Suaje {
  const f = newSuaje();
  if (!api) return f;
  return {
    ...f,
    numero: api.numero ?? "",
    pzs: api.pzs != null ? String(api.pzs) : "",
    tamano: api.tamano ?? "",
    corte1Tipo: api.corte1_tipo ?? "",
    corte1Medida: api.corte1_medida ?? "",
    idcat_corte: api.idcat_corte ?? null,
    idcat_punto_corte: api.idcat_punto_corte ?? null,
    dobles1Tipo: api.dobles1_tipo ?? "",
    dobles1Medida: api.dobles1_medida ?? "",
    idcat_doble: api.idcat_doble ?? null,
    idcat_punto_doble: api.idcat_punto_doble ?? null,
    metros: api.metros ?? "",
    idcat_matrix: api.idcat_matrix ?? null,
    tiempoArreglo: api.tiempo_arreglo != null ? String(api.tiempo_arreglo) : "",
    idcat_sacabocados: api.idcat_sacabocados ?? null,
    cantidad_sacabocado: api.cantidad_sacabocado != null ? String(api.cantidad_sacabocado) : "",
    idcat_perforado: api.idcat_perforado ?? null,
    cantidad_perforado: api.cantidad_perforado != null ? String(api.cantidad_perforado) : "",
    herramentalDesbarbe: api.herramental_desbarbe === true,
    noDesbarbe: api.no_desbarbe ?? "",
  };
}

function mapApiAcabadosToForm(api: any): Acabados {
  const f = newAcabados();
  if (!api) return f;
  return {
    ...f,
    idcat_tipo_pegado: api.idcat_tipo_pegado ?? null,
    idcat_pegamento: api.idcat_pegamento ?? null,
    laminados: (api.laminados ?? []).map((i: any) => i.id ?? i),
    laminadosNombres: (api.laminados ?? []).map((i: any) => i.nombre ?? ""),
    idrollo_lam: api.idrollo_lam ?? null,
    desarrolloLaminado: api.desarrollo_laminado != null ? String(api.desarrollo_laminado) : "",
    asas: (api.asas ?? []).map((i: any) => i.id ?? i),
    asasNombres: (api.asas ?? []).map((i: any) => i.nombre ?? ""),
    idcat_refuerzo_material: api.idcat_refuerzo_material ?? null,
    idcat_refuerzo_medidas: api.idcat_refuerzo_medidas ?? null,
    idcat_base_material: api.idcat_base_material ?? null,
    base_medida: api.base_medida ?? "",
    idcat_empaque: api.idcat_empaque ?? null,
    pzs_caja: api.pzs_caja != null ? String(api.pzs_caja) : "",
    llevaUv: api.lleva_uv === true,
    llevaAltoRelieve: api.lleva_alto_relieve === true,
    llevaTextura: api.lleva_textura === true,
    llevaHotStamping: api.lleva_hot_stamping === true,
  };
}

const MAQUINARIA_KEYS = [
  "hojeado_guillotina", "impresora", "hs_ar", "suaje_maquina", "uv",
  "laminado_maquina", "texturizadora", "empaque_maquina", "empalme",
  "armado", "asas_maquina", "desbarbe",
];

function mapApiMaquinariaToForm(api: any): Maquinaria {
  const f = newMaquinaria();
  if (!api) return f;
  for (const key of MAQUINARIA_KEYS) {
    f[key] = (api[key] ?? []).map((i: any) => i.id);
    f[`${key}_nombres`] = (api[key] ?? []).map((i: any) => i.nombre);
  }
  return f;
}

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE (fila expandida) — igual en espíritu al DetalleProducto de
// Papel.tsx, pero reorganizado por COMPONENTE: un especial no tiene un solo
// material/suaje/acabados/maquinaria a nivel producto (esas tres viven
// vacías a nivel producto a propósito, ver getProductoPapelById), sino uno
// por cada OP (inicio/unión/misma OP) -- así que aquí se agrupa por
// idcomponente_papel en vez de mostrar "Opciones de material" a secas.
//
// NOTA (Jose, 2026-09-02): "Tamaño" no aplica a un producto especial (una
// combinación de piezas no tiene un tamaño único de catálogo con sentido) --
// se omite a propósito tanto aquí como en la fila colapsada de la tabla.
// ═══════════════════════════════════════════════════════════════════════════
function filaDetalle(label: string, val: string | number | null | undefined) {
  return val !== null && val !== undefined && val !== "" ? (
    <div key={label} style={{ display: "flex", gap: 6, fontSize: 12, marginBottom: 2 }}>
      <span style={{ color: "#6B7280", minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#111827", fontWeight: 500 }}>{String(val)}</span>
    </div>
  ) : null;
}

function seccionSuaje(suaje: any) {
  if (!suaje) return null;
  const corteTxt = [suaje.corte1_tipo, suaje.corte1_medida].filter(Boolean).join(" — ") +
    (suaje.puntos_corte != null ? ` (${suaje.puntos_corte} pts)` : "");
  const doblesTxt = [suaje.dobles1_tipo, suaje.dobles1_medida].filter(Boolean).join(" — ") +
    (suaje.puntos_doble != null ? ` (${suaje.puntos_doble} pts)` : "");
  const filas = [
    filaDetalle("Numero", suaje.numero),
    filaDetalle("PZS", suaje.pzs),
    filaDetalle("Tamano", suaje.tamano),
    filaDetalle("Metros", suaje.metros),
    filaDetalle("Matrix", suaje.matrix_nombre),
    filaDetalle("T. arreglo", suaje.tiempo_arreglo ? `${suaje.tiempo_arreglo} min` : null),
    filaDetalle("Corte", corteTxt.trim() ? corteTxt : null),
    filaDetalle("Dobles", doblesTxt.trim() ? doblesTxt : null),
    suaje.sacabocado_nombre ? filaDetalle("Sacabocado", `${suaje.sacabocado_nombre}${suaje.sacabocado_medida ? " -- " + suaje.sacabocado_medida : ""} x ${suaje.cantidad_sacabocado ?? "--"}`) : null,
    suaje.perforado_nombre ? filaDetalle("Perforado", `${suaje.perforado_nombre}${suaje.perforado_medida ? " -- " + suaje.perforado_medida : ""} x ${suaje.cantidad_perforado ?? "--"}`) : null,
    suaje.herramental_desbarbe === true ? filaDetalle("Herramental desbarbe", suaje.no_desbarbe != null ? `Sí — No. ${suaje.no_desbarbe}` : "Sí") : null,
  ].filter(Boolean);
  if (filas.length === 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0F766E", margin: "0 0 5px" }}>Suaje</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px" }}>{filas}</div>
    </div>
  );
}

function seccionAcabados(acabados: any) {
  if (!acabados) return null;
  const filas = [
    filaDetalle("Tipo de pegado", acabados.tipo_pegado),
    filaDetalle("Pegamento", acabados.pegamento),
    acabados.laminados?.length > 0 ? filaDetalle("Laminado", acabados.laminados.map((l: any) => l.nombre).join(", ")) : null,
    filaDetalle("Rollo de laminado", acabados.rollo_lam),
    acabados.rollo_lam_medida_ancho != null ? filaDetalle("Ancho del rollo", `${Number(acabados.rollo_lam_medida_ancho)} cm`) : null,
    acabados.desarrollo_laminado != null ? filaDetalle("Desarrollo laminado", `${Number(acabados.desarrollo_laminado)} cm`) : null,
    filaDetalle("Refuerzo material", acabados.refuerzo_material),
    filaDetalle("Refuerzo medida", acabados.refuerzo_medida),
    filaDetalle("Base material", acabados.base_material),
    filaDetalle("Base medida", acabados.base_medida),
    filaDetalle("Empaque", acabados.empaque),
    filaDetalle("Pzs / caja", acabados.pzs_caja),
    acabados.asas?.length > 0 ? filaDetalle("Asas", acabados.asas.map((a: any) => a.tipo_asa).join(", ")) : null,
    acabados.lleva_uv === true ? filaDetalle("UV", "Sí") : null,
    acabados.lleva_alto_relieve === true ? filaDetalle("Alto relieve", "Sí") : null,
    acabados.lleva_textura === true ? filaDetalle("Textura", "Sí") : null,
    acabados.lleva_hot_stamping === true ? filaDetalle("Hot stamping (Foil)", "Sí") : null,
  ].filter(Boolean);
  if (filas.length === 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#92400E", margin: "0 0 5px" }}>Acabados</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px" }}>{filas}</div>
    </div>
  );
}

const MAQUINARIA_LABELS: [string, string][] = [
  ["hojeado_guillotina", "Hojeado / Guill."], ["impresora", "Impresora"], ["hs_ar", "Hs y AR"],
  ["suaje_maquina", "Suaje"], ["uv", "UV"], ["laminado_maquina", "Laminadora"],
  ["texturizadora", "Texturizadora"], ["empaque_maquina", "Empaque"], ["empalme", "Empalme"],
  ["armado", "Armado"], ["asas_maquina", "Asas"], ["desbarbe", "Desbarbe"],
];

function seccionMaquinaria(maquinaria: any) {
  if (!maquinaria) return null;
  const filas = MAQUINARIA_LABELS.map(([key, label]) => {
    const items: { id: number; nombre: string }[] = maquinaria[key] ?? [];
    return items.length > 0 ? filaDetalle(label, items.map((i) => i.nombre).join(", ")) : null;
  }).filter(Boolean);
  if (filas.length === 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#334155", margin: "0 0 5px" }}>Maquinaria</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px" }}>{filas}</div>
    </div>
  );
}

function seccionMateriales(materiales: any[]) {
  if (!materiales || materiales.length === 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3730A3", margin: "0 0 5px" }}>
        Material{materiales.length > 1 ? "es" : ""}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {materiales.map((m: any, mi: number) => (
          <div key={m.iddetalle_material ?? mi} style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "5px 8px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#6366F1", minWidth: 12 }}>{mi + 1}.</span>
              {m.tipo_papel && <span style={{ fontSize: 11.5, fontWeight: 700, color: "#111827" }}>{m.tipo_papel}</span>}
              {m.calibre && <span style={{ fontSize: 10, background: "#EEF2FF", color: "#4338CA", borderRadius: 3, padding: "0 4px", fontWeight: 600 }}>{m.calibre}</span>}
              {m.medida && <span style={{ fontSize: 10.5, color: "#6B7280" }}>{m.medida}</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1px 10px", marginTop: 2 }}>
              {[["Pliego", m.pliego], ["Rend.", m.rendimiento], ["Corte", m.corte], ["Prep.", m.metodo_preparacion]].filter(([, v]) => v).map(([lbl, val]) => (
                <span key={lbl as string} style={{ fontSize: 10.5 }}>
                  <span style={{ color: "#9CA3AF" }}>{lbl}: </span>
                  <span style={{ color: "#374151", fontWeight: 500 }}>{val as string}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function seccionProcesos(procesos: any[]) {
  if (!procesos || procesos.length === 0) {
    return (
      <p style={{ fontSize: 11.5, color: "#B45309", background: "#FEF3E2", border: "1px dashed #FBBF77", borderRadius: 6, padding: "6px 9px", margin: "0 0 10px" }}>
        Esta OP todavía no tiene procesos en su ruta.
      </p>
    );
  }
  // Jose (2026-09-04): la repetición ya no viene en un campo `veces` -- un
  // proceso repetido aparece varias VECES en la ruta, así que aquí se numera
  // cada ocurrencia ("Impresión (1ª)", "(2ª)"), igual que al armar la ruta.
  // Los procesos que van una sola vez no se numeran.
  // La repetición se numera por `tabla` (llave estable del proceso), no por
  // el nombre mostrado -- agrupar por nombre_proceso crudo rompía la cuenta
  // en cuanto dos procesos distintos con el mismo texto de catálogo caían
  // juntos, y además es lo mismo que causaba que se mostrara el nombre largo
  // de catálogo ("Impresión Papel") en vez del corto (Jose, 2026-09-04).
  const totalPorProceso = new Map<string, number>();
  procesos.forEach((p: any) => {
    const k = String(p.tabla ?? p.nombre_proceso ?? "");
    totalPorProceso.set(k, (totalPorProceso.get(k) ?? 0) + 1);
  });
  const vistas = new Map<string, number>();

  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1D4ED8", margin: "0 0 5px" }}>
        Ruta de procesos
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {procesos.map((p: any, pi: number) => {
          const k = String(p.tabla ?? p.nombre_proceso ?? "");
          const n = (vistas.get(k) ?? 0) + 1;
          vistas.set(k, n);
          const pasada = (totalPorProceso.get(k) ?? 1) > 1 ? `(${n}ª)` : "";
          return (
            <span key={p.idcomponente_papel_proceso ?? pi}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "3px 8px", fontSize: 11 }}>
              <span style={{ fontWeight: 700, color: "#1D4ED8" }}>{pi + 1}.</span>
              <span style={{ color: "#1E3A8A", fontWeight: 600 }}>{nombreCortoDeProceso(p)}</span>
              {pasada && <span style={{ color: "#1D4ED8", fontWeight: 700 }}>{pasada}</span>}
              {p.observaciones && <span style={{ color: "#64748B", fontStyle: "italic" }}>— {p.observaciones}</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function DetalleProductoEspecial({ id }: { id: number }) {
  const [detalle, setDetalle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    setError(false);
    fetchProductoPapelById(id)
      .then(d => { if (vivo) setDetalle(d); })
      .catch(() => { if (vivo) setError(true); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [id]);

  if (loading) return <div style={{ padding: 16, background: "#F9FAFB", fontSize: 12, color: "#9CA3AF" }}>Cargando detalle...</div>;
  if (error || !detalle) return <div style={{ padding: 16, background: "#F9FAFB", fontSize: 12, color: "#DC2626" }}>Error al cargar el detalle.</div>;

  const componentes: any[] = detalle.componentes ?? [];
  const materialesTodos: any[] = (detalle.grupos ?? []).flatMap((g: any) => g.materiales ?? []);
  const materialesPorComponente = (idcomponente_papel: number) =>
    materialesTodos.filter(m => m.idcomponente_papel === idcomponente_papel);

  return (
    <div style={{ padding: "14px 18px 18px", background: "#F9FAFB" }}>
      {/* ── Información general del producto ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3px 32px", marginBottom: 14 }}>
        {filaDetalle("Tipo", detalle.tipo_producto)}
        {filaDetalle("Descripción", detalle.descripcion_papel)}
        {filaDetalle("Ancho", detalle.ancho)}
        {filaDetalle("Fuelle", detalle.fuelle)}
        {filaDetalle("Altura", detalle.altura)}
        {filaDetalle("Medida", detalle.medida)}
        {filaDetalle("Tamaño de asa sugerido", detalle.tamano_asa_default)}
        {filaDetalle(
          "Costo de laminado",
          detalle.costo_laminado == null
            ? null
            : Number(detalle.costo_laminado).toLocaleString("es-MX", {
                style: "currency", currency: "MXN", minimumFractionDigits: 4, maximumFractionDigits: 4,
              })
        )}
      </div>

      {/* ── Una tarjeta por cada OP (inicio / unión / misma OP) ── */}
      {componentes.length === 0 ? (
        <p style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>
          Este producto todavía no tiene su ruta de producción armada.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: componentes.length > 0 ? 14 : 0 }}>
          {componentes.map((comp) => {
            // nombre: comp.nombre ?? "" -- getComponentes() lo trae tal cual
            // vive en la BD, y ahí puede ser NULL (mapComponenteToApi manda
            // `nombre: comp.nombre || null` al guardar una OP sin nombre
            // propio). nombreComponente() hace comp.nombre.trim(), así que
            // un null aquí tronaba toda la fila expandida (Cannot read
            // properties of null (reading 'trim')).
            const compParaEtiqueta = { id: comp.idcomponente_papel, tipo: comp.tipo, orden: comp.orden, nombre: comp.nombre ?? "" } as any;
            // as any: aquí solo se arma un objeto "compatible" con
            // ComponentePapel para reutilizar las mismas etiquetas/colores de
            // MaterialesAsignacion.tsx -- no trae procesos/suaje/acabados/
            // maquinaria (esos ya se muestran aparte, tal cual vienen de
            // getComponentes) porque ComponentePapel es el tipo del FORM de
            // alta, no el de esta vista de solo lectura. tsc infiere un shape
            // propio para el resultado de .map() aun partiendo de un any[],
            // así que sin este cast exige las propiedades completas.
            const componentesParaEtiqueta = componentes.map(c => ({ id: c.idcomponente_papel, tipo: c.tipo, orden: c.orden, nombre: c.nombre ?? "" })) as any;
            const pal = paletaOP(comp.tipo, indiceInicio(compParaEtiqueta, componentesParaEtiqueta));
            const materiales = materialesPorComponente(comp.idcomponente_papel);
            return (
              <div key={comp.idcomponente_papel} style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                <div style={{ background: pal.headBg, padding: "7px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Chip texto={etiquetaComponente(compParaEtiqueta, componentesParaEtiqueta)} bg={pal.chipBg} color={pal.chipText} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: pal.headText }}>
                    {nombreComponente(compParaEtiqueta, componentesParaEtiqueta)}
                  </span>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  {seccionMateriales(materiales)}
                  {seccionProcesos(comp.procesos)}
                  {seccionSuaje(comp.suaje)}
                  {seccionAcabados(comp.acabados)}
                  {seccionMaquinaria(comp.maquinaria)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Archivos ── */}
      {detalle.archivos?.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 8px" }}>Archivos</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {detalle.archivos.map((a: any) => (
              <a key={a.id_archivo} href={a.url} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#1D4ED8", textDecoration: "none" }}>
                <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.nombre}>{a.nombre}</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>{a.categoria}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTADO
// ═══════════════════════════════════════════════════════════════════════════
function Listado({ productos, loading, onNuevo, onEditar, onEliminar }: {
  productos: ProductoPapelListItem[];
  loading: boolean;
  onNuevo: () => void;
  onEditar: (p: ProductoPapelListItem) => void;
  onEliminar: (id: number) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [porBorrar, setPorBorrar] = useState<number | null>(null);
  // Fila expandida: al presionarla muestra toda la información del
  // producto (materiales, ruta de procesos, suaje, acabados, maquinaria y
  // archivos por cada OP), igual que ya funciona en Papel.tsx (Jose,
  // 2026-09-02: "que muestre toda la información del producto tal y como
  // funciona papel y plastico").
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const toggleExpandido = (id: number) => setExpandidoId(prev => (prev === id ? null : id));

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(p =>
      (p.descripcion_papel ?? "").toLowerCase().includes(q) ||
      (p.tipo_producto ?? "").toLowerCase().includes(q) ||
      (p.medida ?? "").toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  const th: React.CSSProperties = {
    background: "#F6F8FC", fontSize: 11.5, fontWeight: 700, color: T.ink,
    padding: "11px 12px", textAlign: "left", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "13px 12px", fontSize: 13, fontWeight: 600, color: T.inkStrong,
    borderBottom: `1px solid ${T.borderSoft}`,
  };

  return (
    <div style={{ background: T.bg, minHeight: "100%", fontFamily: T.font, color: T.ink, padding: "0 26px 46px", boxSizing: "border-box" }}>

      {porBorrar !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16,28,64,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", maxWidth: 360, width: "90%", boxShadow: "0 20px 60px rgba(16,28,64,.25)" }}>
            <p style={{ fontSize: 14.5, color: T.inkStrong, margin: "0 0 6px", fontWeight: 700 }}>¿Eliminar este producto especial?</p>
            <p style={{ fontSize: 12.5, color: T.inkSoft, margin: "0 0 18px" }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Boton onClick={() => setPorBorrar(null)}>Cancelar</Boton>
              <Boton variante="primario" style={{ background: T.danger, borderColor: T.danger }}
                onClick={() => { onEliminar(porBorrar); setPorBorrar(null); }}>Eliminar</Boton>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 0 16px", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, margin: "0 0 3px", fontWeight: 700 }}>
            Alta de productos
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: T.inkStrong }}>Productos especiales</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 260 }}>
            <Entrada value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, tipo o medida..." />
          </div>
          <Boton variante="primario" onClick={onNuevo}>+ Registrar producto especial</Boton>
        </div>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.radiusLg, boxShadow: T.shadow, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={th}>Producto</th>
              <th style={th}>Tipo</th>
              <th style={th}>Medida</th>
              <th style={{ ...th, textAlign: "center" }}>Completitud</th>
              <th style={{ ...th, textAlign: "center", width: 110 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td style={{ ...td, color: T.muted, fontWeight: 500 }} colSpan={5}>Cargando productos...</td></tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr><td style={{ ...td, color: T.muted, fontWeight: 500 }} colSpan={5}>
                {productos.length === 0
                  ? "Todavía no hay productos especiales registrados."
                  : "Ningún producto coincide con la búsqueda."}
              </td></tr>
            )}
            {filtrados.map(p => {
              const expandido = expandidoId === p.idproducto_papel;
              return (
                <Fragment key={p.idproducto_papel}>
                  <tr
                    onClick={() => toggleExpandido(p.idproducto_papel)}
                    style={{ cursor: "pointer", background: expandido ? "#EFF6FF" : undefined }}
                  >
                    <td style={{ ...td, borderBottom: expandido ? "none" : td.borderBottom }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 18, height: 18, borderRadius: 4, background: "#EFF6FF",
                          border: "1px solid #BFDBFE", fontSize: 10, color: "#1D4ED8", flexShrink: 0,
                          transition: "transform .12s", transform: expandido ? "rotate(90deg)" : "none",
                        }}>▶</span>
                        {p.descripcion_papel || "(sin nombre)"}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 500, color: T.inkSoft, borderBottom: expandido ? "none" : td.borderBottom }}>{p.tipo_producto || "—"}</td>
                    <td style={{ ...td, fontWeight: 500, color: T.inkSoft, borderBottom: expandido ? "none" : td.borderBottom }}>{p.medida || "—"}</td>
                    <td style={{ ...td, textAlign: "center", borderBottom: expandido ? "none" : td.borderBottom }}>
                      <span style={{
                        display: "inline-block", minWidth: 44, padding: "4px 9px", borderRadius: 7,
                        fontSize: 11.5, fontWeight: 700,
                        background: p.completitud_pct >= 90 ? "#E7F5EC" : p.completitud_pct >= 65 ? T.orangeBg : "#FEF2F2",
                        color: p.completitud_pct >= 90 ? T.greenDeep : p.completitud_pct >= 65 ? T.orangeText : "#B91C1C",
                      }}>{p.completitud_pct}%</span>
                    </td>
                    <td style={{ ...td, textAlign: "center", borderBottom: expandido ? "none" : td.borderBottom }} onClick={e => e.stopPropagation()}>
                      <span style={{ display: "inline-flex", gap: 14, alignItems: "center" }}>
                        <button type="button" title="Editar" onClick={() => onEditar(p)}
                          style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "grid", placeItems: "center" }}>
                          <IcoLapiz />
                        </button>
                        <button type="button" title="Eliminar" onClick={() => setPorBorrar(p.idproducto_papel)}
                          style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "grid", placeItems: "center" }}>
                          <IcoBote size={17} color={T.danger} />
                        </button>
                      </span>
                    </td>
                  </tr>
                  {expandido && (
                    <tr>
                      <td colSpan={5} style={{ padding: 0, borderBottom: `1px solid ${T.borderSoft}` }}>
                        <DetalleProductoEspecial id={p.idproducto_papel} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 10, textAlign: "right", fontSize: 11.5, color: T.muted }}>
        {filtrados.length} de {productos.length} producto{productos.length !== 1 ? "s" : ""} especial{productos.length !== 1 ? "es" : ""}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════
type Vista = "lista" | "nuevo" | "editar";

export default function ProductoEspecial() {
  useAuth();
  const { productos, loading, saving, crear, actualizar, eliminar } = useProductosPapel();
  const [vista, setVista] = useState<Vista>("lista");
  const [editForm, setEditForm] = useState<ProductoEspecialConId | undefined>(undefined);
  const [editId, setEditId] = useState<number | undefined>(undefined);

  // Esta pantalla solo ve productos especiales. es_especial lo expone
  // getProductosPapel (se agregó a esa consulta, que enumera columnas a mano).
  const especiales = useMemo(() => productos.filter(p => Boolean(p.es_especial)), [productos]);

  const volver = () => { setVista("lista"); setEditForm(undefined); setEditId(undefined); };

  const handleEditar = async (p: ProductoPapelListItem) => {
    setEditId(p.idproducto_papel);
    setEditForm(undefined);
    setVista("editar");
    try {
      const d = await fetchProductoPapelById(p.idproducto_papel);
      const form = newProductoForm();
      form.esEspecial = true;
      form.idcat_tipo_producto_papel = d.idcat_tipo_producto_papel;
      form.tipoProductoNombre = d.tipo_producto ?? "";
      form.descripcion = d.descripcion_papel ?? "";
      form.ancho = d.ancho ? String(d.ancho) : "";
      form.fuelle = d.fuelle ? String(d.fuelle) : "";
      form.altura = d.altura ? String(d.altura) : "";
      form.medida = d.medida ?? "";
      form.tamanoAsaDefault = d.tamano_asa_default ?? "";
      form.idcat_tamano_producto = d.tamano_prod ?? null;
      form.tamanoProdNombre = d.tamano_prod_nombre ?? "";
      form.costoLaminado = d.costo_laminado == null ? null : Number(d.costo_laminado);

      // Traducción de ids reales → ids locales, igual que en la Fase 3: el
      // formulario referencia materiales y componentes por su id local
      // (client_key), no por el id de base.
      const iddetalleMaterialToLocalId = new Map<number, number>();
      const idComponentePapelToLocalId = new Map<number, number>();

      form.grupos = (d.grupos ?? []).map((g: any, gi: number) => ({
        id: Date.now() + gi,
        idgrupo_papel: g.idgrupo_papel,
        precioSugerido: g.precio_sugerido ? String(g.precio_sugerido) : "",
        draft: newMaterial(),
        materiales: (g.materiales ?? []).map((m: any, mi: number) => {
          const localId = Date.now() + gi * 100 + mi;
          if (m.iddetalle_material != null) iddetalleMaterialToLocalId.set(m.iddetalle_material, localId);
          return {
            id: localId,
            iddetalle_material: m.iddetalle_material,
            idcat_tipo_papel: m.idcat_tipo_papel,
            idcat_calibre: m.idcat_calibre,
            tipo: m.tipo_papel ?? "",
            calibre: m.calibre ?? "",
            pliego: m.pliego ?? "",
            rendimiento: m.rendimiento ?? "",
            corte: m.corte ?? "",
            hojeado: {
              bobina: m.hojeado?.bobina ?? "",
              corte: m.hojeado?.corte ?? "",
              rendimiento: m.hojeado?.rendimiento ?? "",
              guillotina: m.hojeado?.guillotina ?? "",
              hilo: m.hojeado?.hilo ?? "",
              bobinaExtra: m.hojeado?.bobina_extra ?? "",
            },
            idComponenteAsignado: m.idcomponente_papel ?? null,
            ancho: m.ancho ? String(m.ancho) : "",
            fuelle: m.fuelle ? String(m.fuelle) : "",
            altura: m.altura ? String(m.altura) : "",
            medida: m.medida ?? "",
            metodoPreparacion: m.metodo_preparacion ?? "",
          };
        }),
      }));
      if (form.grupos.length === 0) form.grupos = [newGrupo()];

      form.suaje = mapApiSuajeToForm(d.suaje);
      form.acabados = mapApiAcabadosToForm(d.acabados);
      form.maquinaria = mapApiMaquinariaToForm(d.maquinaria);

      form.componentes = (d.componentes ?? []).map((comp: any, ci: number) => {
        const localId = Date.now() + ci;
        if (comp.idcomponente_papel != null) idComponentePapelToLocalId.set(comp.idcomponente_papel, localId);
        return {
          id: localId,
          idcomponente_papel: comp.idcomponente_papel,
          tipo: comp.tipo,
          orden: comp.orden ?? null,
          nombre: comp.nombre ?? "",
          esUnion: comp.es_union === true,
          // 🔁 FASE 4: se resuelve ABAJO, en un segundo paso, una vez que
          // TODOS los componentes ya están en idComponentePapelToLocalId --
          // el padre real de este componente puede aparecer MÁS ADELANTE en
          // este mismo arreglo (mismo problema que ya resuelve el bloque de
          // materiales más abajo).
          idComponentePadre: null,
          procesos: (comp.procesos ?? []).map((proceso: any, pi: number) => ({
            id: Date.now() + ci * 1000 + pi,
            idcomponente_papel_proceso: proceso.idcomponente_papel_proceso,
            idproceso_cat: proceso.idproceso_cat ?? null,
            // Antes se guardaba aquí el nombre_proceso CRUDO del catálogo
            // ("Impresión Papel", "Suaje Papel"...), y como RutaProcesos.tsx
            // prefiere procesoNombre sobre su propio acortador cuando ya
            // trae algo, cualquier producto especial ya guardado se quedaba
            // mostrando el nombre largo para siempre, aunque los procesos
            // agregados de ahí en adelante sí salieran cortos. Se usa el
            // mismo acortador que la vista de solo lectura de arriba (Jose,
            // 2026-09-04).
            procesoNombre: nombreCortoDeProceso(proceso),
            orden: proceso.orden ?? pi + 1,
            observaciones: proceso.observaciones ?? "",
            materiales: (proceso.materiales ?? []).map(
              (idReal: number) => iddetalleMaterialToLocalId.get(idReal) ?? idReal
            ),
          })),
          suaje: mapApiSuajeToForm(comp.suaje),
          acabados: mapApiAcabadosToForm(comp.acabados),
          maquinaria: mapApiMaquinariaToForm(comp.maquinaria),
        };
      });

      // 🔁 FASE 4: traduce idcomponente_papel_padre (id REAL de BD) a id
      // LOCAL, ahora que idComponentePapelToLocalId ya tiene a TODOS los
      // componentes (sin importar el orden en que vinieron del backend).
      (d.componentes ?? []).forEach((comp: any, ci: number) => {
        if (comp.idcomponente_papel_padre != null) {
          form.componentes[ci].idComponentePadre =
            idComponentePapelToLocalId.get(comp.idcomponente_papel_padre) ?? null;
        }
      });

      for (const grupo of form.grupos) {
        for (const material of grupo.materiales) {
          material.idComponenteAsignado = material.idComponenteAsignado != null
            ? idComponentePapelToLocalId.get(material.idComponenteAsignado) ?? null
            : null;
        }
      }

      const archivoImagen = (d.archivos ?? []).find(
        (a: any) => a.categoria === CATEGORIA_IMAGEN_PRODUCTO_ESPECIAL
      );
      const imagenExistente = archivoImagen
        ? { id_archivo: archivoImagen.id_archivo, url: archivoImagen.url }
        : null;

      setEditForm({ ...form, idproducto_papel: p.idproducto_papel, imagenExistente } as ProductoEspecialConId);
    } catch {
      setEditForm(newProductoForm() as ProductoEspecialConId);
    }
  };

  // La imagen del producto solo llega "pendiente" cuando se está creando uno
  // nuevo (todavía sin idproducto_papel) — al editar, ImagenProducto ya la
  // sube de una vez apenas se elige el archivo, así que aquí siempre llega
  // null en ese caso.
  const handleSave = async (form: ProductoPapelForm, imagenPendiente: File | null, notasPendientes: string[] = []) => {
    if (vista === "editar" && editId) {
      const ok = await actualizar(editId, form);
      if (ok) {
        limpiarBorrador(claveBorradorProductoPapel(editId));
        volver();
      }
      return;
    }
    const nuevoId = await crear(form);
    if (nuevoId) {
      if (imagenPendiente) {
        try {
          await subirImagenProducto(nuevoId, imagenPendiente);
        } catch {
          // El producto ya se guardó bien; que falle solo la imagen no debe
          // bloquear el alta -- se puede volver a subir editando el producto.
        }
      }
      for (const texto of notasPendientes) {
        try {
          await crearNotaProducto(nuevoId, texto);
        } catch {
          // Igual que la imagen: que falle una nota no debe bloquear el alta.
        }
      }
      limpiarBorrador(claveBorradorProductoPapel(null));
      volver();
    }
  };

  // Cancelar un alta/edición no debe dejar el borrador guardado: si no se
  // limpia aquí, la próxima vez que se entre a "Nuevo producto" (o se vuelva
  // a editar el mismo producto) reaparecen los materiales/procesos que se
  // habían empezado a capturar y luego se cancelaron (Jose).
  const handleCancelar = () => {
    limpiarBorrador(claveBorradorProductoPapel(vista === "editar" ? editId ?? null : null));
    volver();
  };

  return (
    <Dashboard>
      {vista === "lista" ? (
        <Listado
          productos={especiales}
          loading={loading}
          onNuevo={() => { setEditForm(undefined); setEditId(undefined); setVista("nuevo"); }}
          onEditar={handleEditar}
          onEliminar={eliminar}
        />
      ) : vista === "editar" && editId && editForm === undefined ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", fontSize: 14, color: T.muted, fontFamily: T.font }}>
          Cargando producto...
        </div>
      ) : (
        <FormularioProductoEspecial
          initial={editForm}
          onSave={handleSave}
          onCancel={handleCancelar}
          saving={saving}
        />
      )}
    </Dashboard>
  );
}