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

import { useMemo, useState } from "react";
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
import { T, Boton, Entrada, IcoLapiz, IcoBote } from "../../components/papel/especiales/disenoEspeciales";

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
              <th style={th}>Tamaño</th>
              <th style={{ ...th, textAlign: "center" }}>Completitud</th>
              <th style={{ ...th, textAlign: "center", width: 110 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td style={{ ...td, color: T.muted, fontWeight: 500 }} colSpan={6}>Cargando productos...</td></tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr><td style={{ ...td, color: T.muted, fontWeight: 500 }} colSpan={6}>
                {productos.length === 0
                  ? "Todavía no hay productos especiales registrados."
                  : "Ningún producto coincide con la búsqueda."}
              </td></tr>
            )}
            {filtrados.map(p => (
              <tr key={p.idproducto_papel}>
                <td style={td}>{p.descripcion_papel || "(sin nombre)"}</td>
                <td style={{ ...td, fontWeight: 500, color: T.inkSoft }}>{p.tipo_producto || "—"}</td>
                <td style={{ ...td, fontWeight: 500, color: T.inkSoft }}>{p.medida || "—"}</td>
                <td style={{ ...td, fontWeight: 500, color: T.inkSoft }}>{p.tamano_prod_nombre || "—"}</td>
                <td style={{ ...td, textAlign: "center" }}>
                  <span style={{
                    display: "inline-block", minWidth: 44, padding: "4px 9px", borderRadius: 7,
                    fontSize: 11.5, fontWeight: 700,
                    background: p.completitud_pct >= 90 ? "#E7F5EC" : p.completitud_pct >= 65 ? T.orangeBg : "#FEF2F2",
                    color: p.completitud_pct >= 90 ? T.greenDeep : p.completitud_pct >= 65 ? T.orangeText : "#B91C1C",
                  }}>{p.completitud_pct}%</span>
                </td>
                <td style={{ ...td, textAlign: "center" }}>
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
            ))}
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
          procesos: (comp.procesos ?? []).map((proceso: any, pi: number) => ({
            id: Date.now() + ci * 1000 + pi,
            idcomponente_papel_proceso: proceso.idcomponente_papel_proceso,
            idproceso_cat: proceso.idproceso_cat ?? null,
            procesoNombre: proceso.nombre_proceso ?? "",
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