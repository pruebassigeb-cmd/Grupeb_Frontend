// src/components/libre/ModalEditarCotizacionLibre.tsx
//
// Edita una Cotización Libre ya guardada: trae el detalle, lo vuelve a
// armar como renglones editables (mismo shape que al crear), deja
// quitar/agregar renglones, y al guardar reemplaza cabecera + renglones
// completos vía PUT /cotizaciones-libres/:folio.

import { useState, useEffect } from "react";
import Modal from "../Modal";
import FormularioProductoLibre from "./FormularioProductoLibre";
import {
  getCotizacionLibreDetalle,
  actualizarCotizacionLibre,
} from "../../services/cotizacionLibreService";
import type { ItemCotizacionLibre, CampoLibre as CampoLibreValor } from "../../types/cotizacion-libre.types";
import { getCatalogosPlastico } from "../../services/plastico/productosPlasticoService";
import { getColoresAsa, getMedidasTroquel, getCintaSeguridad } from "../../services/suajesService";
import { showAlert } from "../CustomAlert";

interface ModalEditarCotizacionLibreProps {
  folio: string | null;
  onClose: () => void;
  onGuardado: () => void;
}

const campoDe = (id: any, texto: any): CampoLibreValor => ({ id: id ?? null, texto: texto ?? null });

// Fila cruda de cotizacion_libre_item (GET detalle) → mismo shape anidado
// que usa el formulario al crear — así se reutiliza el mismo componente.
function inflarItemLibre(row: any): ItemCotizacionLibre {
  return {
    tipo: row.tipo,
    producto_id: row.producto_id,
    producto_texto: row.producto_texto,
    medida_texto: row.medida_texto,
    material: campoDe(row.material_id, row.material_texto),
    calibre: campoDe(row.calibre_id, row.calibre_texto),
    tintas_frente: campoDe(row.tintas_frente_id, row.tintas_frente_texto),
    tintas_dentro: campoDe(row.tintas_dentro_id, row.tintas_dentro_texto),
    pantones_texto: row.pantones_texto,
    pantones_dentro_texto: row.pantones_dentro_texto,
    caras: campoDe(row.caras_id, row.caras_texto),
    laminado: campoDe(row.laminado_id, row.laminado_texto),
    hs: campoDe(row.hs_id, row.hs_texto),
    alto_relieve: { bool: row.alto_relieve_bool, texto: row.alto_relieve_texto },
    textura: campoDe(row.textura_id, row.textura_texto),
    uv: { bool: row.uv_bool, texto: row.uv_texto },
    asa: campoDe(row.asa_id, row.asa_texto),
    color_asa: campoDe(row.color_asa_id, row.color_asa_texto),
    medida_troquel: campoDe(row.medida_troquel_id, row.medida_troquel_texto),
    cinta_seguridad: campoDe(row.cinta_seguridad_id, row.cinta_seguridad_texto),
    perforacion: row.perforacion_bool,
    pigmentos_texto: row.pigmentos_texto,
    cantidades: [row.cantidad_1, row.cantidad_2, row.cantidad_3],
    precios: [row.precio_1, row.precio_2, row.precio_3],
    notas: row.notas,
  };
}

export default function ModalEditarCotizacionLibre({ folio, onClose, onGuardado }: ModalEditarCotizacionLibreProps) {
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [renglones, setRenglones] = useState<ItemCotizacionLibre[]>([]);
  const [comentarios, setComentarios] = useState("");
  const [moneda, setMoneda] = useState<"MXN" | "USD">("MXN");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteTexto, setClienteTexto] = useState<string | null>(null);
  const [empresaTexto, setEmpresaTexto] = useState<string | null>(null);
  const [itemEditandoIndex, setItemEditandoIndex] = useState<number | null>(null);

  const [catalogosPlastico, setCatalogosPlastico] = useState({
    tiposProducto: [] as { id: number; nombre: string }[],
    materiales: [] as { id: number; nombre: string }[],
    calibres: [] as { id: number; nombre: string }[],
    coloresAsa: [] as { id: number; nombre: string }[],
    medidasTroquel: [] as { id: number; nombre: string }[],
    cintasSeguridad: [] as { id: number; nombre: string }[],
  });

  // Catálogos de plástico — los mismos que usa FormularioSolicitud.tsx,
  // aquí se traen aparte porque este modal se abre suelto desde Cotizar.tsx.
  useEffect(() => {
    Promise.all([
      getCatalogosPlastico(),
      getColoresAsa(),
      getMedidasTroquel(),
      getCintaSeguridad(),
    ])
      .then(([cat, colores, troqueles, cintas]: any) => {
        setCatalogosPlastico({
          tiposProducto: (cat.tiposProducto ?? []).map((t: any) => ({ id: t.id, nombre: t.nombre })),
          materiales: (cat.materiales ?? []).map((m: any) => ({ id: m.id, nombre: m.nombre })),
          calibres: (cat.calibres ?? []).map((c: any) => ({ id: c.id, nombre: String(c.valor) })),
          coloresAsa: (colores ?? []).map((c: any) => ({ id: c.id_color, nombre: c.color })),
          medidasTroquel: (troqueles ?? []).map((m: any) => ({ id: m.id_medidatro, nombre: m.medida })),
          cintasSeguridad: (cintas ?? []).map((c: any) => ({ id: c.id, nombre: c.medida ? `${c.nombre} (${c.medida})` : c.nombre })),
        });
      })
      .catch((err) => console.error("❌ Catálogos plástico (editar libre):", err));
  }, []);

  // Detalle de la cotización libre a editar
  useEffect(() => {
    if (!folio) return;
    setCargando(true);
    getCotizacionLibreDetalle(folio)
      .then((detalle) => {
        setRenglones((detalle.items ?? []).map(inflarItemLibre));
        setComentarios(detalle.comentarios ?? "");
        setMoneda((detalle.moneda as "MXN" | "USD") ?? "MXN");
        setClienteId(detalle.cliente_id ?? null);
        setClienteTexto(detalle.cliente_texto ?? detalle.cliente_nombre ?? null);
        setEmpresaTexto(detalle.empresa_texto ?? detalle.cliente_empresa_real ?? null);
        setItemEditandoIndex(null);
      })
      .catch((err) => {
        console.error("❌ Error al cargar cotización libre:", err);
        showAlert("No se pudo cargar la cotización libre");
        onClose();
      })
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folio]);

  const handleGuardar = async () => {
    if (!folio) return;
    if (renglones.length === 0) {
      showAlert("Agrega al menos un producto antes de guardar");
      return;
    }
    setGuardando(true);
    try {
      await actualizarCotizacionLibre(folio, {
        clienteId,
        clienteTexto,
        empresaTexto,
        moneda,
        comentarios: comentarios.trim() || null,
        items: renglones,
      });
      showAlert(`Cotización libre ${folio} actualizada correctamente.`);
      onGuardado();
      onClose();
    } catch (err: any) {
      console.error("❌ Error al actualizar cotización libre:", err);
      showAlert(err.response?.data?.error || "No se pudo guardar la cotización libre");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen={!!folio} onClose={onClose} title={folio ? `Editar cotización libre — ${folio}` : "Editar"}>
      {cargando ? (
        <div className="py-10 text-center text-gray-500 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <p className="text-gray-500 text-xs mb-0.5">
              Cliente / Empresa <span className="italic">(no editable aquí — si cambió, mejor crea una cotización nueva)</span>
            </p>
            <p className="font-medium text-gray-800">
              {clienteTexto || "—"}{empresaTexto ? ` — ${empresaTexto}` : ""}
            </p>
          </div>

          <div className="flex flex-col gap-1 max-w-[220px]">
            <label className="text-sm font-medium text-gray-700">Moneda</label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value as "MXN" | "USD")}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="MXN">Pesos mexicanos (MXN)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Comentarios</label>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={2}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>

          {renglones.length > 0 && (
            <div className="bg-white border border-purple-200 rounded-lg divide-y">
              {renglones.map((r, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-2 text-sm ${i === itemEditandoIndex ? "bg-purple-50" : ""}`}>
                  <span>
                    <strong>{r.producto_texto || (r.producto_id ? `código: ${r.producto_id}` : "(sin nombre)")}</strong>{" "}
                    <span className="text-gray-400">
                      ({r.tipo === "plastico" ? "🧴" : r.tipo === "papel" ? "📄" : "🎁"} {r.tipo})
                    </span>
                    {i === itemEditandoIndex && <span className="ml-2 text-purple-600 text-xs">✏️ Editando...</span>}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setItemEditandoIndex(i)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenglones((prev) => prev.filter((_, idx) => idx !== i));
                        if (i === itemEditandoIndex) setItemEditandoIndex(null);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <FormularioProductoLibre
            catalogosPlastico={catalogosPlastico}
            valorInicial={itemEditandoIndex != null ? renglones[itemEditandoIndex] : null}
            onCancelarEdicion={() => setItemEditandoIndex(null)}
            onAgregar={(item) => {
              if (itemEditandoIndex != null) {
                setRenglones((prev) => prev.map((r, idx) => (idx === itemEditandoIndex ? item : r)));
                setItemEditandoIndex(null);
              } else {
                setRenglones((prev) => [...prev, item]);
              }
            }}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={guardando}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={guardando}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow disabled:opacity-50 flex items-center gap-2">
              {guardando && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}