// src/components/papel/especiales/FormularioProductoEspecial.tsx
//
// Formulario COMPLETO y autónomo de productos especiales, armado sobre el
// diseño que mandó el cliente (breadcrumb, encabezado con acciones, campos
// del producto, Materiales / Componentes, Asignación y Ruta de procesos).
//
// A propósito NO reutiliza FormularioProductoPapelAlta.tsx: Jose pidió
// "módulos propios y no alimentarlo con lo que ya cuento", así que el alta
// normal de papel se queda intacta y este módulo vive por su cuenta. Lo
// único compartido es lo que es infraestructura y no formulario: el tipo
// ProductoPapelForm (es el contrato con el backend, que ya acepta
// componentes desde la Fase 2), los catálogos y el guardado de borrador.
//
// Del diseño se omiten los campos que no existen en la base y que se acordó
// no inventar: "Código del producto", "Unidad", "Cantidad" y el código por
// material. Lo que sí se muestra es todo real: nombre, tipo de producto,
// la medida del producto (ancho/fuelle/altura + la medida calculada) y el
// estatus. El desplegable de "Tamaño" se quitó a pedido de Jose.

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { newProductoForm, newGrupo } from "../../../types/papel/papel.types";
import type {
  CatItem, Catalogs, ComponentePapel, MaterialEntry, ProductoPapelForm,
} from "../../../types/papel/papel.types";
import { useCatalogosPapel } from "../../../hooks/papel/useCatalogosPapel";
import {
  CATEGORIA_IMAGEN_PRODUCTO_ESPECIAL, eliminarArchivoProducto, fetchProcesosCat,
  fetchProductoPapelById, subirImagenProducto, type ProcesoCatOpcion,
} from "../../../services/papel/papel.service";
import { leerBorrador, useAutoguardarBorrador } from "../../../hooks/useBorradorFormulario";
import { claveBorradorProductoPapel } from "../../../utils/clavesBorrador";
import { showConfirm } from "../../CustomConfirm";
import MaterialesAsignacion from "./MaterialesAsignacion";
import RutaProcesos from "./RutaProcesos";
import {
  T, Etiqueta, Campo, Entrada, Boton,
  IcoCheckCirculo,
} from "./disenoEspeciales";
// Mismo combo "elige o agrega" que el alta de papel/plástico normal
// (Jose, 2026-09-02: faltaba aquí -- "Tipo de producto" era un <select>
// plano, sin poder agregar uno nuevo sin ir primero a Catálogos).
import SelConAlta from "../SelConAlta";

export interface ImagenProductoExistente {
  id_archivo: number;
  url: string;
}

export interface ProductoEspecialConId extends ProductoPapelForm {
  idproducto_papel?: number;
  // Cargada aparte por ProductoEspecial.tsx (viene de d.archivos, filtrando
  // por categoria) — no vive en ProductoPapelForm porque no es un campo del
  // formulario que se guarde con mapFormToApi, es un archivo aparte.
  imagenExistente?: ImagenProductoExistente | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGEN DEL PRODUCTO
// ═══════════════════════════════════════════════════════════════════════════
// No hay columna nueva en producto_papel: reutiliza el mismo sistema
// genérico de archivos que ya usa el alta normal para "imagen-suaje-papel"
// (tabla `archivos`, categoria libre por idproducto_papel), solo que con la
// categoria "imagen-producto-especial". Antes de que exista el producto
// (alta nueva) el archivo se guarda como pendiente y se sube en cuanto
// ProductoEspecial.tsx tiene el id real, igual que ya hacía SecArchivos en
// el formulario normal de papel.
function ImagenProducto({ idproducto, isEdit, inicial, pendiente, onPendiente, onActualChange }: {
  idproducto: number | null;
  isEdit: boolean;
  inicial: ImagenProductoExistente | null;
  pendiente: File | null;
  onPendiente: (file: File | null) => void;
  // Avisa al padre cuál es la imagen "ya subida" vigente en este momento --
  // se actualiza sola al subir/quitar en modo edición (donde el cambio es
  // inmediato, no queda pendiente). El padre la usa para mostrarla en la
  // tarjeta "Producto terminado" de Ruta de procesos.
  onActualChange?: (img: ImagenProductoExistente | null) => void;
}) {
  const [actual, setActualState] = useState<ImagenProductoExistente | null>(inicial);
  const setActual = (img: ImagenProductoExistente | null) => {
    setActualState(img);
    onActualChange?.(img);
  };
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => { setActual(inicial); }, [inicial]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const previewPendiente = useMemo(() => {
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    if (!pendiente) return null;
    const url = URL.createObjectURL(pendiente);
    previewUrlRef.current = url;
    return url;
  }, [pendiente]);

  const elegirArchivo = async (file: File) => {
    setError("");
    if (!isEdit || !idproducto) {
      onPendiente(file);
      return;
    }
    setSubiendo(true);
    try {
      // Solo una imagen de portada por producto: si ya había una, se
      // reemplaza en vez de acumularse.
      if (actual) await eliminarArchivoProducto(actual.id_archivo).catch(() => {});
      await subirImagenProducto(idproducto, file);
      const d = await fetchProductoPapelById(idproducto);
      const img = (d.archivos ?? []).find((a: any) => a.categoria === CATEGORIA_IMAGEN_PRODUCTO_ESPECIAL) ?? null;
      setActual(img ? { id_archivo: img.id_archivo, url: img.url } : null);
    } catch (e: any) {
      setError(e?.message || "No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async () => {
    if (pendiente) { onPendiente(null); return; }
    if (!actual) return;
    if (!(await showConfirm("¿Quitar la imagen del producto?"))) return;
    setSubiendo(true);
    setError("");
    try {
      await eliminarArchivoProducto(actual.id_archivo);
      setActual(null);
    } catch (e: any) {
      setError(e?.message || "No se pudo quitar la imagen");
    } finally {
      setSubiendo(false);
    }
  };

  const src = previewPendiente || actual?.url || null;

  return (
    <Campo>
      <Etiqueta>Imagen del producto</Etiqueta>
      <input
        ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { if (e.target.files?.[0]) elegirArchivo(e.target.files[0]); e.target.value = ""; }}
      />
      <div
        onClick={() => !subiendo && inputRef.current?.click()}
        title={src ? "Cambiar imagen" : "Agregar imagen"}
        style={{
          width: 84, height: 42, borderRadius: 9, border: `1px solid ${T.border}`,
          background: src ? "#fff" : "#F6F8FC", position: "relative", overflow: "hidden",
          boxShadow: T.shadow, cursor: subiendo ? "wait" : "pointer", boxSizing: "border-box",
        }}
      >
        {src ? (
          <img src={src} alt="Imagen del producto" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", fontSize: 17, color: T.muted }}>+</span>
        )}
        {subiendo && (
          <span style={{
            position: "absolute", inset: 0, background: "rgba(255,255,255,.75)",
            display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 600, color: T.inkStrong,
          }}>Subiendo...</span>
        )}
        {src && !subiendo && (
          <button
            type="button" onClick={e => { e.stopPropagation(); quitar(); }} title="Quitar imagen"
            style={{
              position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: "50%",
              border: "none", background: T.danger, color: "#fff", fontSize: 10, fontWeight: 700,
              cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1, padding: 0,
            }}
          >×</button>
        )}
      </div>
      {error && <p style={{ margin: "4px 0 0", fontSize: 10, color: "#B91C1C" }}>{error}</p>}
      {!isEdit && pendiente && !error && (
        <p style={{ margin: "4px 0 0", fontSize: 10, color: T.muted }}>Se subirá al guardar.</p>
      )}
    </Campo>
  );
}

// Un borrador guardado antes de que existieran esEspecial/componentes (o un
// producto viejo) se restaura sin esos campos; sanear evita que la pantalla
// truene al primer render — es el mismo bug que reportó Jose al marcar el
// checkbox en la versión anterior.
function sanear(f: ProductoPapelForm): ProductoPapelForm {
  const grupos = (f.grupos ?? []).map(g => ({
    ...g,
    materiales: (g.materiales ?? []).map(m => ({
      ...m,
      idComponenteAsignado: m.idComponenteAsignado ?? null,
      ancho: m.ancho ?? "", fuelle: m.fuelle ?? "", altura: m.altura ?? "",
      medida: m.medida ?? "", metodoPreparacion: m.metodoPreparacion ?? "",
    })),
  }));
  return {
    ...f,
    esEspecial: true,
    componentes: (f.componentes ?? []).map(c => ({ ...c, procesos: c.procesos ?? [] })),
    grupos: grupos.length > 0 ? grupos : [newGrupo()],
  };
}

const miniLbl: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 600, color: T.muted,
  marginBottom: 3, letterSpacing: ".03em", textTransform: "uppercase",
};

export default function FormularioProductoEspecial({ initial, onSave, onCancel, saving }: {
  initial?: ProductoEspecialConId;
  onSave: (form: ProductoPapelForm, imagenPendiente: File | null, notasPendientes: string[]) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const esEdicion = !!initial;
  const claveBorrador = claveBorradorProductoPapel(initial?.idproducto_papel);
  const [borradorInicial] = useState(() => leerBorrador<ProductoPapelForm>(claveBorrador));
  const [form, setForm] = useState<ProductoPapelForm>(
    () => sanear(borradorInicial ?? initial ?? newProductoForm())
  );
  const [imagenPendiente, setImagenPendiente] = useState<File | null>(null);
  // Imagen ya subida vigente (null si el producto todavía no tiene una) --
  // se usa junto con imagenPendiente para que "Producto terminado" en Ruta
  // de procesos muestre la foto real del producto en cuanto exista.
  const [imagenActual, setImagenActual] = useState<ImagenProductoExistente | null>(initial?.imagenExistente ?? null);
  const [notasPendientes, setNotasPendientes] = useState<string[]>([]);
  useAutoguardarBorrador(claveBorrador, form, true);

  // Preview local del archivo todavía no subido (alta nueva, antes de que
  // exista idproducto_papel) -- mismo patrón que usa ImagenProducto para su
  // propio thumbnail, pero aquí se necesita también en el padre para
  // pasárselo a RutaProcesos.
  const previewPendienteUrlRef = useRef<string | null>(null);
  const previewPendienteUrl = useMemo(() => {
    if (previewPendienteUrlRef.current) { URL.revokeObjectURL(previewPendienteUrlRef.current); previewPendienteUrlRef.current = null; }
    if (!imagenPendiente) return null;
    const url = URL.createObjectURL(imagenPendiente);
    previewPendienteUrlRef.current = url;
    return url;
  }, [imagenPendiente]);
  useEffect(() => () => {
    if (previewPendienteUrlRef.current) URL.revokeObjectURL(previewPendienteUrlRef.current);
  }, []);
  const imagenProductoUrl = previewPendienteUrl || imagenActual?.url || null;

  const { catalogs, addItem } = useCatalogosPapel();
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [procesosCat, setProcesosCat] = useState<ProcesoCatOpcion[]>([]);
  const [errorProcesos, setErrorProcesos] = useState("");

  useEffect(() => {
    let vivo = true;
    fetchProcesosCat()
      .then(d => { if (vivo) setProcesosCat(d); })
      .catch((e: any) => { if (vivo) setErrorProcesos(e?.message || "No se pudo cargar el catálogo de procesos"); });
    return () => { vivo = false; };
  }, []);

  const upd = (patch: Partial<ProductoPapelForm>) => setForm(prev => ({ ...prev, ...patch }));

  // Medida = mismo formato que ya usa el resto del sistema.
  useEffect(() => {
    const a = form.ancho.trim(), f = form.fuelle.trim(), h = form.altura.trim();
    const medida = (a || h) ? (f && f !== "0" ? `${a}+${f}x${h}` : `${a}x${h}`) : "";
    if (medida !== form.medida) upd({ medida });
  }, [form.ancho, form.fuelle, form.altura]);

  // Medida de la base: se calcula sola, restando 0.5 al ancho y al fuelle
  // del producto — misma fórmula que calcBase() en el alta normal de papel.
  // Se escribe en los acabados de TODOS los componentes, que es donde el
  // backend la guarda (acabados_papel.base_medida por componente) y de donde
  // la lee el PDF en el bloque de Armado.
  useEffect(() => {
    const a = parseFloat(form.ancho), f = parseFloat(form.fuelle);
    const base = (!isNaN(a) && !isNaN(f))
      ? `${(a - 0.5).toFixed(1)}x${(f - 0.5).toFixed(1)} cm`
      : "";
    setForm(prev => {
      if (prev.componentes.every(c => c.acabados.base_medida === base)) return prev;
      return {
        ...prev,
        componentes: prev.componentes.map(c => ({
          ...c,
          acabados: { ...c.acabados, base_medida: base },
        })),
      };
    });
  }, [form.ancho, form.fuelle, form.componentes.length]);

  // Los especiales trabajan con un solo grupo: el precio sigue viviendo a
  // nivel producto y el diseño no muestra opciones de material por grupo.
  const materiales: MaterialEntry[] = form.grupos[0]?.materiales ?? [];
  const setMateriales = (nuevos: MaterialEntry[]) =>
    setForm(prev => {
      const grupos = prev.grupos.length > 0 ? [...prev.grupos] : [newGrupo()];
      grupos[0] = { ...grupos[0], materiales: nuevos };
      return { ...prev, grupos };
    });

  const setComponentes = (componentes: ComponentePapel[]) => upd({ componentes });

  // Costo base del producto especial: reutiliza precio_sugerido del Grupo 1
  // (grupo_papel), el mismo campo que ya usa el alta normal como "Costo" por
  // opción -- aquí solo hay un grupo, así que funciona como precio único del
  // producto completo (Jose). No hace falta columna ni endpoint nuevos: el
  // resto del sistema ya lee esto como "costo base" (ver costo_base_grupo1
  // en producto_papel.controller.ts).
  const precioBase = form.grupos[0]?.precioSugerido ?? "";
  const setPrecioBase = (v: string) =>
    setForm(prev => {
      const grupos = prev.grupos.length > 0 ? [...prev.grupos] : [newGrupo()];
      grupos[0] = { ...grupos[0], precioSugerido: v };
      return { ...prev, grupos };
    });

  const catalogosSeguros = (catalogs ?? {}) as Catalogs;
  const listaCat = (clave: string): CatItem[] => {
    const l = (catalogosSeguros as unknown as Record<string, CatItem[]>)[clave];
    return Array.isArray(l) ? l : [];
  };
  const catTipoPapel = useMemo(() => listaCat("tipo_papel"), [catalogs]);
  const catCalibre = useMemo(() => listaCat("calibre"), [catalogs]);
  const catTipoProducto = useMemo(() => listaCat("tipo_producto"), [catalogs]);

  // Un producto especial sin ruta de procesos no sirve para nada aguas
  // abajo: la cotización/pedido decide qué campos ofrecer (impresión,
  // laminado, asa...) justamente a partir de esos procesos, y la orden de
  // producción se arma con ellos. Antes se dejaba guardar así y el producto
  // aparecía "vacío" al cotizarlo (Jose), por eso se valida aquí.
  const etiquetaOrden = (comp: ComponentePapel): string => {
    if (comp.tipo === "unica") return "la orden de producción";
    if (comp.tipo === "union") return "la OP de unión";
    // 🔁 FASE 4: 'complementaria' (OPC) necesitaba su propia rama -- sin
    // esto caía al cálculo de "inicios" de abajo, que la busca en el
    // arreglo equivocado y siempre da -1 (mensaje vacío "OP INICIO ").
    if (comp.tipo === "complementaria") {
      const opcs = form.componentes.filter(c => c.tipo === "complementaria");
      const i = opcs.findIndex(c => c.id === comp.id);
      return `la OPC ${i >= 0 ? i + 1 : ""}`.trim();
    }
    const inicios = form.componentes.filter(c => c.tipo === "inicio");
    const i = inicios.findIndex(c => c.id === comp.id);
    return `OP INICIO ${i >= 0 ? i + 1 : ""}`.trim();
  };

  const guardar = async () => {
    setErrorGuardar(null);

    if (form.componentes.length === 0) {
      setErrorGuardar("Define la ruta de procesos antes de guardar: elige un modo de asignación y agrega al menos un proceso.");
      return;
    }
    const sinProcesos = form.componentes.filter(c => (c.procesos ?? []).length === 0);
    if (sinProcesos.length === form.componentes.length) {
      setErrorGuardar("El producto no tiene ni un proceso en su ruta. Agrega al menos uno (impresión, laminación, armado...) antes de guardar.");
      return;
    }
    if (sinProcesos.length > 0) {
      setErrorGuardar(`Falta agregar procesos en ${sinProcesos.map(etiquetaOrden).join(", ")}.`);
      return;
    }

    // NUEVO (Jose, 2026-09-01): Litolaminado en un nodo que junta insumos
    // (la OP de unión) SIN material propio asignado no tiene nada que
    // fusionar -- es un junte lógico de piezas (cajas de regalo, roscas de
    // reyes), no debería llevar ese proceso. Se bloquea el guardado; el caso
    // inverso (material propio sin Litolaminado) solo se avisa como
    // sugerencia en el panel "Reglas" de RutaProcesos, no bloquea.
    //
    // 🔁 FASE 4 (Jose, 2026-09-07): una OPC es estructuralmente igual a la
    // unión para este propósito (también junta insumos), así que la misma
    // regla se revisa para CADA nodo que junta insumos -- unión Y cualquier
    // OPC -- no solo la unión.
    const catLito = procesosCat.find(p => p.tabla === "litolaminado_papel");
    const nodosQueJuntan = form.componentes.filter(c => c.tipo === "union" || c.tipo === "complementaria");
    for (const nodo of nodosQueJuntan) {
      const litoEnNodo = catLito
        ? (nodo.procesos ?? []).some(p => p.idproceso_cat === catLito.idproceso_cat)
        : false;
      const materialNodo = materiales.filter(m => m.idComponenteAsignado === nodo.id);
      if (litoEnNodo && materialNodo.length === 0) {
        setErrorGuardar(
          `${etiquetaOrden(nodo)} lleva Litolaminado en su ruta pero no tiene ningún material propio asignado -- sin material que fusionar, ese proceso no debería estar ahí. Asígnale un material o quita Litolaminado de su ruta.`
        );
        return;
      }
    }

    // 🔁 FASE 4: toda OP de inicio y toda OPC debe declarar a quién alimenta
    // (idComponentePadre) -- la unión, o otra OPC. Sin esto el guardado
    // igual fallaría en el backend (componente_papel_tipo_padre_check /
    // el trigger de validación), pero con un error de base de datos en vez
    // de uno que el usuario entienda -- se valida aquí primero.
    const sinPadre = form.componentes.filter(
      c => (c.tipo === "inicio" || c.tipo === "complementaria") && c.idComponentePadre == null
    );
    if (sinPadre.length > 0) {
      setErrorGuardar(
        `Falta indicar a qué orden alimenta ${sinPadre.map(etiquetaOrden).join(", ")} -- ve a "Estructura del árbol", en Asignación de materiales.`
      );
      return;
    }

    try {
      await onSave({ ...form, esEspecial: true }, imagenPendiente, notasPendientes);
    } catch (e: any) {
      setErrorGuardar(e?.message || "No se pudo guardar el producto.");
    }
  };

  return (
    <div style={{
      background: T.bg, minHeight: "100%", fontFamily: T.font, color: T.ink,
      padding: "0 26px 46px", boxSizing: "border-box",
    }}>

      {/* ─────────── breadcrumb ─────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600 }}>
          <span onClick={onCancel} style={{ color: T.primary, cursor: "pointer" }}>Productos especiales</span>
          <span style={{ color: "#A8B6D4", fontWeight: 400 }}>›</span>
          <span style={{ color: T.inkStrong, fontWeight: 700 }}>
            {esEdicion ? "Editar producto" : "Nuevo producto"}
          </span>
        </div>
      </div>

      {/* ─────────── encabezado + acciones ─────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: T.inkStrong, letterSpacing: "-.01em" }}>
            {esEdicion ? "Editar producto especial" : "Nuevo producto especial"}
          </h1>
          {/* Estatus: sólo la píldora, sin rótulo ni caja — antes ocupaba una
              fila entera del grid de arriba y empujaba todo hacia abajo. */}
          <span style={{
            background: T.greenBg, color: T.greenDeep, fontSize: 12,
            fontWeight: 700, padding: "4px 11px", borderRadius: 999, whiteSpace: "nowrap",
          }}>
            Activo
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {errorGuardar && (
            <span style={{
              display: "flex", alignItems: "center", height: 38, padding: "0 12px", fontSize: 12,
              fontWeight: 600, color: "#B91C1C", background: "#FEF2F2",
              border: "1px solid #FECACA", borderRadius: 8,
            }}>{errorGuardar}</span>
          )}
          <Boton onClick={onCancel} disabled={saving}>Cancelar</Boton>
          <Boton variante="primario" onClick={guardar} disabled={saving}>
            <IcoCheckCirculo /> {saving ? "Guardando..." : esEdicion ? "Guardar cambios" : "Guardar producto"}
          </Boton>
        </div>
      </div>

      {/* ─────────── campos del producto ─────────── */}
      {/* Ancho/Fuelle/Altura van agrupados y rotulados «Medida del producto»
          a propósito: en la tabla de abajo cada material tiene TAMBIÉN su
          propia medida, y sin el rótulo las dos se confunden. */}
      <div style={{
        display: "grid", gridTemplateColumns: ".45fr 1.3fr 1.05fr 1.75fr .6fr",
        gap: 12, marginBottom: 16, alignItems: "end",
      }}>
        <ImagenProducto
          idproducto={initial?.idproducto_papel ?? null}
          isEdit={esEdicion}
          inicial={initial?.imagenExistente ?? null}
          pendiente={imagenPendiente}
          onPendiente={setImagenPendiente}
          onActualChange={setImagenActual}
        />

        <Campo>
          <Etiqueta requerido>Nombre del producto</Etiqueta>
          <Entrada value={form.descripcion} onChange={v => upd({ descripcion: v })} placeholder="Ej. Caja Gorra Litholaminada f/V" />
        </Campo>

        <Campo>
          <Etiqueta requerido>Tipo de producto</Etiqueta>
          <SelConAlta
            catKey="tipo_producto"
            options={catTipoProducto.map(c => c.nombre)}
            value={form.tipoProductoNombre}
            onChange={v => {
              const item = catTipoProducto.find(c => c.nombre === v);
              upd({ idcat_tipo_producto_papel: item?.id ?? null, tipoProductoNombre: v });
            }}
            onAdd={addItem}
          />
        </Campo>

        <div style={{
          border: `1px solid ${T.border}`, borderRadius: 10, background: "#fff",
          padding: "10px 12px 11px", boxShadow: T.shadow, minWidth: 0,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.ink, letterSpacing: ".05em", textTransform: "uppercase" }}>
              Medida del producto
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: form.medida ? T.inkStrong : T.muted }}>
              {form.medida || "—"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <span style={miniLbl}>Ancho</span>
              <Entrada value={form.ancho} onChange={v => upd({ ancho: v })} style={{ height: 36, fontSize: 13 }} />
            </div>
            <div>
              <span style={miniLbl}>Fuelle</span>
              <Entrada value={form.fuelle} onChange={v => upd({ fuelle: v })} style={{ height: 36, fontSize: 13 }} />
            </div>
            <div>
              <span style={miniLbl}>Altura</span>
              <Entrada value={form.altura} onChange={v => upd({ altura: v })} style={{ height: 36, fontSize: 13 }} />
            </div>
          </div>
        </div>

        <Campo>
          <Etiqueta>Costo base (MXN)</Etiqueta>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: T.muted, pointerEvents: "none",
            }}>$</span>
            <Entrada
              value={precioBase}
              onChange={v => setPrecioBase(v.replace(/[^0-9.]/g, ""))}
              style={{ height: 42, paddingLeft: 20, fontSize: 13 }}
            />
          </div>
        </Campo>
      </div>

      {/* ─────────── materiales + asignación ─────────── */}
      <MaterialesAsignacion
        materiales={materiales}
        onUpdateMateriales={setMateriales}
        componentes={form.componentes}
        onUpdateComponentes={setComponentes}
        catTipoPapel={catTipoPapel}
        catCalibre={catCalibre}
        procesosCat={procesosCat}
        addItem={addItem}
      />

      {/* ─────────── ruta de procesos ─────────── */}
      <RutaProcesos
        componentes={form.componentes}
        onUpdateComponentes={setComponentes}
        materiales={materiales}
        onUpdateMateriales={setMateriales}
        catalogs={catalogosSeguros}
        addItem={addItem}
        nombreProducto={form.descripcion}
        procesosCat={procesosCat}
        errorProcesos={errorProcesos}
        idproducto={initial?.idproducto_papel ?? null}
        notasPendientes={notasPendientes}
        onNotasPendientesChange={setNotasPendientes}
        tamanoAsaDefault={form.tamanoAsaDefault}
        onTamanoAsaDefaultChange={v => upd({ tamanoAsaDefault: v })}
        imagenProductoUrl={imagenProductoUrl}
        // Para exportar el diagrama hace falta LEER los bytes de la imagen, y
        // contra la URL firmada de S3 eso lo bloquea CORS. Con el id_archivo,
        // RutaProcesos la baja por la API (que sí puede) en vez de por S3.
        // Solo aplica a la imagen ya guardada: la que apenas se eligió y no se
        // ha subido se lee de su blob: local, que no tiene ese problema.
        imagenProductoIdArchivo={imagenActual?.id_archivo ?? null}
      />

      {/* ─────────── acciones al pie (como en el diseño) ─────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <Boton onClick={onCancel} disabled={saving}>Cancelar</Boton>
        <Boton variante="primario" onClick={guardar} disabled={saving}>
          <IcoCheckCirculo /> {saving ? "Guardando..." : esEdicion ? "Guardar cambios" : "Guardar producto"}
        </Boton>
      </div>
    </div>
  );
}