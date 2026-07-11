import { useState, useEffect } from "react";
import {
  getTiposInsumo,
  getProveedores,
  getProductosSat,
  buscarInsumos,
  registrarInsumoRapido,
  type TipoInsumo,
  type Insumo,
  type Proveedor,
  type ProductoSat,
} from "../services/proveedoresService";
import { showAlert } from "./CustomAlert";

interface Props {
  tipoInsumoInicial: number;
  nombreInicial:     string;
  onRegistrado:      (item: Insumo) => void;
  onCancelar:        () => void;
}

// ✅ Opciones predefinidas mostradas en el <select> (la BD ya no restringe
// esto a un enum fijo — el control de valores válidos vive solo aquí).
const OPCIONES_UNIDAD = [
  { value: "", label: "Sin especificar" },
  { value: "kilos", label: "Kilos" },
  { value: "pzas", label: "Piezas" },
  { value: "litros", label: "Litros" },
  { value: "metros", label: "Metros" },
] as const;

export default function ModalRegistrarInsumo({
  tipoInsumoInicial,
  nombreInicial,
  onRegistrado,
  onCancelar,
}: Props) {
  const [tipos, setTipos]             = useState<TipoInsumo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productosSat, setProductosSat] = useState<ProductoSat[]>([]);
  const [guardando, setGuardando]     = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [duplicado, setDuplicado]     = useState<string | null>(null);

  const [form, setForm] = useState({
    tipo_insumo_id: tipoInsumoInicial,
    nombre:         nombreInicial,
    codigo:         "",
    precio:         "",
    notas:          "",
    clave_producto: "",
    minimo_compra:  "",
    unidad:         "" as string,
    producto_sat_idproducto_sat: "" as string | number,
  });
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<number[]>([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [t, p, s] = await Promise.all([
          getTiposInsumo(),
          getProveedores(),
          getProductosSat().catch(() => []),
        ]);
        setTipos(t);
        setProveedores(p);
        setProductosSat(s);
      } catch {
        showAlert("Error al cargar catálogos", "error");
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    if (!form.nombre.trim()) { setDuplicado(null); return; }
    const t = setTimeout(async () => {
      setVerificando(true);
      try {
        const resultados = await buscarInsumos(form.tipo_insumo_id, form.nombre.trim());
        const exacto = resultados.find((r) => r.nombre.toLowerCase() === form.nombre.trim().toLowerCase());
        setDuplicado(
          exacto
            ? `Ya existe "${exacto.nombre}"${
                exacto.proveedores.length > 0
                  ? ` — ${exacto.proveedores.map((p) => p.proveedor_nombre).join(", ")}`
                  : ""
              }`
            : null
        );
      } catch {
        setDuplicado(null);
      } finally {
        setVerificando(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.nombre, form.tipo_insumo_id]);

  const set = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handlePrecioChange = (v: string) => {
    if (!/^\d*\.?\d{0,4}$/.test(v)) return;
    set("precio", v);
  };

  const handleMinimoChange = (v: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(v)) return;
    set("minimo_compra", v);
  };

  const toggleProveedor = (idproveedor: number) => {
    setProveedoresSeleccionados(prev =>
      prev.includes(idproveedor) ? prev.filter(id => id !== idproveedor) : [...prev, idproveedor]
    );
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { showAlert("El nombre es requerido", "warning"); return; }
    if (duplicado)           { showAlert("Corrige el duplicado antes de guardar", "warning"); return; }

    setGuardando(true);
    try {
      const resultado = await registrarInsumoRapido({
        tipo_insumo_id: form.tipo_insumo_id,
        nombre:         form.nombre.trim(),
        codigo:         form.codigo.trim() || null,
        proveedores_ids: proveedoresSeleccionados,
        precio:         form.precio.trim() ? parseFloat(form.precio) : null,
        notas:          form.notas.trim() || null,
        clave_producto: form.clave_producto.trim() || null,
        minimo_compra:  form.minimo_compra.trim() ? parseFloat(form.minimo_compra) : null,
        unidad:         form.unidad || null,
        producto_sat_idproducto_sat: form.producto_sat_idproducto_sat
          ? Number(form.producto_sat_idproducto_sat)
          : null,
      });
      showAlert(`Insumo "${resultado.nombre}" registrado`, "success");
      onRegistrado(resultado);
    } catch (error: any) {
      const msg = error?.response?.data?.error || "Error al registrar";
      if (error?.response?.status === 409) {
        setDuplicado(msg);
        showAlert(msg, "warning");
      } else {
        showAlert(msg, "error");
      }
    } finally {
      setGuardando(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent";
  const selectClass = `${inputClass} cursor-pointer`;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Nuevo insumo</h3>
              <p className="text-xs text-gray-400">Se guardará en el catálogo de proveedores</p>
            </div>
          </div>
          <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Tipo + Código */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Tipo de insumo <span className="text-red-500">*</span>
              </label>
              <select value={form.tipo_insumo_id}
                onChange={e => set("tipo_insumo_id", Number(e.target.value))}
                className={selectClass}>
                {tipos.map(t => (
                  <option key={t.idtipo_insumo} value={t.idtipo_insumo}>{t.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Código <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" value={form.codigo}
                onChange={e => set("codigo", e.target.value)}
                placeholder="PMS-485, R-200..." className={inputClass} maxLength={80} />
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Nombre / Color <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.nombre}
              onChange={e => set("nombre", e.target.value)}
              placeholder="Ej: Rojo intenso, Azul marino..."
              className={`${inputClass} ${duplicado ? "border-amber-400 bg-amber-50" : ""}`}
              autoFocus maxLength={150} />
            {verificando && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Verificando duplicados...
              </p>
            )}
            {duplicado && !verificando && (
              <p className="text-xs text-amber-600 mt-1 font-medium">⚠ {duplicado}</p>
            )}
          </div>

          {/* Precio + Notas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Precio <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="text" inputMode="decimal" value={form.precio}
                  onChange={e => handlePrecioChange(e.target.value)}
                  placeholder="0.00" className={`${inputClass} pl-7`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Notas <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" value={form.notas}
                onChange={e => set("notas", e.target.value)}
                placeholder="Observaciones..." className={inputClass} />
            </div>
          </div>

          {/* Clave SAT + Unidad (predefinida) + Mínimo de compra */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Clave producto SAT <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                value={form.producto_sat_idproducto_sat}
                onChange={e => set("producto_sat_idproducto_sat", e.target.value)}
                className={selectClass}
              >
                <option value="">Sin especificar</option>
                {productosSat.map(s => (
                  <option key={s.idproducto_sat} value={s.idproducto_sat}>
                    {s.clave} — {s.pdft}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Unidad <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              {/* ✅ Predefinida — mismo enum que CreateProductoDto.unidad, no texto libre */}
              <select value={form.unidad}
                onChange={e => set("unidad", e.target.value)}
                className={selectClass}>
                {OPCIONES_UNIDAD.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Mínimo de compra <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" inputMode="decimal" value={form.minimo_compra}
                onChange={e => handleMinimoChange(e.target.value)}
                placeholder="0.00" className={inputClass} />
            </div>
          </div>

          {/* Proveedores — selección múltiple */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Proveedores <span className="text-xs text-gray-400 font-normal">(opcional — puedes marcar varios)</span>
            </label>
            <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
              {proveedores.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-3">No hay proveedores registrados.</p>
              ) : (
                proveedores.map(p => (
                  <label key={p.idproveedor}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer select-none">
                    <input type="checkbox"
                      checked={proveedoresSeleccionados.includes(p.idproveedor)}
                      onChange={() => toggleProveedor(p.idproveedor)}
                      className="w-4 h-4 rounded border-gray-400 text-purple-600 focus:ring-purple-400" />
                    {p.nombre}
                  </label>
                ))
              )}
            </div>
            {proveedoresSeleccionados.length > 0 && (
              <p className="text-xs text-purple-600 mt-1 font-medium">
                ✓ {proveedoresSeleccionados.length} proveedor{proveedoresSeleccionados.length > 1 ? "es" : ""} seleccionado{proveedoresSeleccionados.length > 1 ? "s" : ""}
              </p>
            )}
            {proveedoresSeleccionados.length > 1 && (
              <p className="text-xs text-gray-400 mt-1">
                El código, precio, notas y mínimo de compra se guardarán igual para los {proveedoresSeleccionados.length} proveedores marcados.
              </p>
            )}
          </div>

          {duplicado && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-700">
                Este insumo ya existe. Cambia el nombre o cancela y selecciónalo del dropdown.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onCancelar}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar}
            disabled={guardando || !!duplicado || verificando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors">
            {guardando ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
            ) : "Agregar insumo"}
          </button>
        </div>
      </div>
    </div>
  );
}