import { useState, useEffect } from "react";
import {
    getProveedorById,
    getTiposInsumo,
    crearProductoProveedor,
    actualizarProductoProveedor,
    eliminarProductoProveedor,
    getProductosSat,
    type Proveedor,
    type ProductoProveedor,
    type TipoInsumo,
    type CreateProductoDto,
    type ProductoSat,
    crearTipoInsumo
} from "../services/proveedoresService";
import { showAlert } from "./CustomAlert";
import { showConfirm } from "./CustomConfirm";
import Dashboard from "../layouts/Sidebar";

interface Props {
    proveedor: Proveedor;
    onVolver: () => void;
}

const FORM_VACIO: CreateProductoDto = {
    tipo_insumo_id: 0,
    nombre: "",
    codigo: "",
    precio: null,
    notas: "",
    clave_producto: "",
    minimo_compra: null,
    unidad: null,
    producto_sat_idproducto_sat: null,
};

export default function ProductosProveedor({ proveedor, onVolver }: Props) {
    const [productos, setProductos] = useState<ProductoProveedor[]>([]);
    const [tipos, setTipos] = useState<TipoInsumo[]>([]);
    const [productosSat, setProductosSat] = useState<ProductoSat[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroTipo, setFiltroTipo] = useState<number | null>(null);
    const [nuevoTipoNombre, setNuevoTipoNombre] = useState("");
    const [guardandoTipo, setGuardandoTipo] = useState(false);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editando, setEditando] = useState<ProductoProveedor | null>(null);
    const [form, setForm] = useState<CreateProductoDto>(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    const [eliminando, setEliminando] = useState<number | null>(null);
    const [precioTexto, setPrecioTexto] = useState("");

    const idTipoOtro = tipos.find(t => t.nombre === "Otro")?.idtipo_insumo;
    const esTipoOtro = form.tipo_insumo_id === idTipoOtro;

    useEffect(() => { cargar(); }, [proveedor.idproveedor]);

    useEffect(() => {
        getProductosSat().then(setProductosSat).catch(() => { });
    }, []);

    const cargar = async () => {
        setLoading(true);
        try {
            const [detalle, tiposData] = await Promise.all([
                getProveedorById(proveedor.idproveedor),
                getTiposInsumo(),
            ]);
            setProductos(detalle.productos);
            setTipos(tiposData);
        } catch {
            showAlert("Error al cargar datos", "error");
        } finally {
            setLoading(false);
        }
    };

    const productosFiltrados = filtroTipo
        ? productos.filter(p => p.idtipo_insumo === filtroTipo)
        : productos;

    const porTipo = productosFiltrados.reduce<Record<string, ProductoProveedor[]>>((acc, p) => {
        const key = p.tipo_insumo_nombre;
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
    }, {});

    const abrirNuevo = () => {
        setEditando(null);
        setForm({ ...FORM_VACIO, tipo_insumo_id: tipos[0]?.idtipo_insumo ?? 0 });
        setPrecioTexto("");
        setMostrarForm(true);
    };

    const abrirEditar = (p: ProductoProveedor) => {
        setEditando(p);
        setForm({
            tipo_insumo_id: p.idtipo_insumo,
            nombre: p.nombre,
            codigo: p.codigo ?? "",
            precio: p.precio,
            notas: p.notas ?? "",
            clave_producto: p.clave_producto ?? "",
            minimo_compra: p.minimo_compra,
            unidad: p.unidad as "kilos" | "pzas" | "litros" | null,
            producto_sat_idproducto_sat: p.producto_sat_idproducto_sat ?? null,
        });
        setPrecioTexto(p.precio != null ? String(p.precio) : "");
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const cerrarForm = () => {
        setMostrarForm(false);
        setEditando(null);
        setForm(FORM_VACIO);
        setPrecioTexto("");
    };

    const set = (field: keyof CreateProductoDto, value: any) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleCrearNuevoTipo = async () => {
        if (!nuevoTipoNombre.trim()) { showAlert("Escribe el nombre del nuevo tipo", "warning"); return; }
        setGuardandoTipo(true);
        try {
            const nuevo = await crearTipoInsumo(nuevoTipoNombre.trim());
            setTipos(prev => [...prev, nuevo]);
            set("tipo_insumo_id", nuevo.idtipo_insumo);
            setNuevoTipoNombre("");
            showAlert(`Tipo "${nuevo.nombre}" creado`, "success");
        } catch (error: any) {
            if (error?.response?.status === 409) {
                const existente = error.response.data.existente;
                setTipos((prev: TipoInsumo[]) =>
                    prev.find(t => t.idtipo_insumo === existente.idtipo_insumo)
                        ? prev : [...prev, existente]
                );
                set("tipo_insumo_id", existente.idtipo_insumo);
                setNuevoTipoNombre("");
                showAlert(`Se usará el tipo existente "${existente.nombre}"`, "info");
            } else {
                showAlert(error?.response?.data?.error || "Error al crear tipo", "error");
            }
        } finally {
            setGuardandoTipo(false);
        }
    };

    const handlePrecioChange = (v: string) => {
        if (!/^\d*\.?\d{0,4}$/.test(v)) return;
        setPrecioTexto(v);
        const n = parseFloat(v);
        set("precio", isNaN(n) ? null : n);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.tipo_insumo_id) { showAlert("Selecciona el tipo de insumo", "warning"); return; }
        if (!form.nombre?.trim()) { showAlert("El nombre es requerido", "warning"); return; }

        let tipoIdFinal = form.tipo_insumo_id;

        if (esTipoOtro && nuevoTipoNombre.trim()) {
            setGuardandoTipo(true);
            try {
                const nuevoTipo = await crearTipoInsumo(nuevoTipoNombre.trim());
                setTipos(prev => [...prev, nuevoTipo]);
                tipoIdFinal = nuevoTipo.idtipo_insumo;
                setNuevoTipoNombre("");
                set("tipo_insumo_id", nuevoTipo.idtipo_insumo);
            } catch (error: any) {
                if (error?.response?.status === 409) {
                    tipoIdFinal = error.response.data.existente.idtipo_insumo;
                    setNuevoTipoNombre("");
                    set("tipo_insumo_id", tipoIdFinal);
                } else {
                    showAlert(error?.response?.data?.error || "Error al crear tipo", "error");
                    setGuardandoTipo(false);
                    return;
                }
            } finally {
                setGuardandoTipo(false);
            }
        } else if (esTipoOtro && !nuevoTipoNombre.trim()) {
            showAlert("Escribe el nombre del nuevo tipo", "warning");
            return;
        }

        setGuardando(true);
        try {
            const dto: CreateProductoDto = {
                tipo_insumo_id: tipoIdFinal,
                nombre: form.nombre.trim(),
                codigo: form.codigo?.trim() || null,
                precio: form.precio,
                notas: form.notas?.trim() || null,
                clave_producto: form.clave_producto?.trim() || null,
                minimo_compra: form.minimo_compra,
                unidad: form.unidad,
                producto_sat_idproducto_sat: form.producto_sat_idproducto_sat,
            };

            if (editando) {
                const actualizado = await actualizarProductoProveedor(
                    proveedor.idproveedor, editando.idproveedor_producto, dto
                );
                setProductos(prev =>
                    prev.map(p => p.idproveedor_producto === editando.idproveedor_producto ? actualizado : p)
                );
                showAlert(`Insumo "${dto.nombre}" actualizado`, "success");
            } else {
                const nuevo = await crearProductoProveedor(proveedor.idproveedor, dto);
                setProductos(prev => [...prev, nuevo]);
                showAlert(`Insumo "${dto.nombre}" agregado`, "success");
            }
            cerrarForm();
        } catch (error: any) {
            showAlert(error?.response?.data?.error || "Error al guardar", "error");
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (p: ProductoProveedor) => {
        const ok = await showConfirm(`¿Desactivar el insumo "${p.nombre}"?`);
        if (!ok) return;
        setEliminando(p.idproveedor_producto);
        try {
            await eliminarProductoProveedor(proveedor.idproveedor, p.idproveedor_producto);
            setProductos(prev => prev.filter(x => x.idproveedor_producto !== p.idproveedor_producto));
            showAlert(`Insumo "${p.nombre}" desactivado`, "success");
        } catch {
            showAlert("Error al eliminar", "error");
        } finally {
            setEliminando(null);
        }
    };

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400";

    const PALETTE = [
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-orange-100 text-orange-700 border-orange-200",
    "bg-blue-100   text-blue-700   border-blue-200",
    "bg-teal-100   text-teal-700   border-teal-200",
    "bg-pink-100   text-pink-700   border-pink-200",
    "bg-yellow-100 text-yellow-700 border-yellow-200",
    "bg-green-100  text-green-700  border-green-200",
    "bg-red-100    text-red-700    border-red-200",
    "bg-indigo-100 text-indigo-700 border-indigo-200",
    "bg-cyan-100   text-cyan-700   border-cyan-200",
];

// Reemplaza tipoBadgeClass y getBadgeClass por esto:
const getBadgeClass = (tipo: string) => {
    const idx = [...tipo].reduce((acc, c) => acc + c.charCodeAt(0), 0) % PALETTE.length;
    return PALETTE[idx];
};

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={onVolver}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Volver">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{proveedor.nombre}</h2>
                    <p className="text-sm text-gray-500">Catálogo de insumos</p>
                </div>
                <button onClick={abrirNuevo}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo insumo
                </button>
            </div>

            {/* Formulario inline */}
            {mostrarForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-blue-900">
                            {editando ? `Editando: ${editando.nombre}` : "Nuevo insumo"}
                        </h4>
                        <button type="button" onClick={cerrarForm} className="text-blue-400 hover:text-blue-700">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tipo nuevo — fuera del form */}
                    {esTipoOtro && (
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nombre del nuevo tipo <span className="text-red-500">*</span>
                            </label>
                            <input type="text" value={nuevoTipoNombre}
                                onChange={e => setNuevoTipoNombre(e.target.value)}
                                placeholder="Ej: Barniz, Laminado, Adhesivo..."
                                className={inputClass} maxLength={100} />
                            <p className="text-xs text-blue-500 mt-1">
                                El tipo se creará automáticamente al guardar el insumo.
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3">

                        {/* Tipo + Código */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Tipo de insumo <span className="text-red-500">*</span>
                                </label>
                                <select value={form.tipo_insumo_id}
                                    onChange={e => { set("tipo_insumo_id", Number(e.target.value)); setNuevoTipoNombre(""); }}
                                    className={inputClass}>
                                    <option value={0} disabled>Seleccionar...</option>
                                    {tipos
                                        .filter(t => t.nombre !== "Otro")
                                        .map(t => (
                                            <option key={t.idtipo_insumo} value={t.idtipo_insumo}>{t.nombre}</option>
                                        ))
                                    }
                                    {idTipoOtro && (
                                        <option value={idTipoOtro}>Otro (crear nuevo tipo...)</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Código <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input type="text" value={form.codigo ?? ""}
                                    onChange={e => set("codigo", e.target.value)}
                                    placeholder="PMS-485, R-200..." className={inputClass} maxLength={80} />
                            </div>
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nombre / Color <span className="text-red-500">*</span>
                            </label>
                            <input type="text" value={form.nombre}
                                onChange={e => set("nombre", e.target.value)}
                                placeholder="Ej: Rojo intenso, Azul marino..."
                                className={inputClass} maxLength={150} />
                        </div>

                        {/* Precio + Notas */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Precio <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                    <input type="text" inputMode="decimal" value={precioTexto}
                                        onChange={e => handlePrecioChange(e.target.value)}
                                        placeholder="0.00" className={`${inputClass} pl-7`} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Notas <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input type="text" value={form.notas ?? ""}
                                    onChange={e => set("notas", e.target.value)}
                                    placeholder="Observaciones..." className={inputClass} />
                            </div>
                        </div>

                        {/* Clave SAT + Unidad + Mínimo */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Clave producto SAT <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <select
                                    value={form.producto_sat_idproducto_sat ?? ""}
                                    onChange={e => set("producto_sat_idproducto_sat", e.target.value ? Number(e.target.value) : null)}
                                    className={inputClass}
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Unidad <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <select value={form.unidad ?? ""}
                                    onChange={e => set("unidad", e.target.value || null)}
                                    className={inputClass}>
                                    <option value="">Sin especificar</option>
                                    <option value="kilos">Kilos</option>
                                    <option value="pzas">Piezas</option>
                                    <option value="litros">Litros</option>
                                                                        <option value="litros">Litros</option>

                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Mínimo de compra <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input type="text" inputMode="decimal"
                                    value={form.minimo_compra != null ? String(form.minimo_compra) : ""}
                                    onChange={e => {
                                        const v = e.target.value;
                                        if (!/^\d*\.?\d{0,2}$/.test(v)) return;
                                        set("minimo_compra", v === "" ? null : parseFloat(v));
                                    }}
                                    placeholder="0.00" className={inputClass} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={cerrarForm}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" disabled={guardando}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                                {guardando
                                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
                                    : editando ? "Guardar cambios" : "Agregar insumo"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filtros */}
            {tipos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFiltroTipo(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filtroTipo === null ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}>
                        Todos ({productos.length})
                    </button>
                    {tipos.filter(t => productos.some(p => p.idtipo_insumo === t.idtipo_insumo)).map(t => (
                        <button key={t.idtipo_insumo} onClick={() => setFiltroTipo(t.idtipo_insumo)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filtroTipo === t.idtipo_insumo ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}>
                            {t.nombre} ({productos.filter(p => p.idtipo_insumo === t.idtipo_insumo).length})
                        </button>
                    ))}
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
                </div>
            ) : Object.keys(porTipo).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="font-medium">Sin insumos registrados</p>
                    <p className="text-sm mt-1">Agrega el primero con el botón de arriba</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(porTipo).map(([tipo, items]) => (
                        <div key={tipo}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeClass(tipo)}`}>
                                    {tipo}
                                </span>
                                <span className="text-xs text-gray-400">{items.length} registro{items.length !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Nombre / Color</th>
                                            <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Clave SAT</th>
                                            <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Código</th>
                                            <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Unidad / Mín.</th>
                                            <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Precio</th>
                                            <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Notas</th>
                                            <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {items.map(p => (
                                            <tr key={p.idproveedor_producto} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900">{p.nombre}</td>
                                                <td className="px-4 py-3">
                                                    {p.producto_sat_idproducto_sat ? (
                                                        <div>
                                                            <code className="px-2 py-0.5 bg-blue-50 rounded text-xs font-mono text-blue-700">
                                                                {p.producto_sat_clave}
                                                            </code>
                                                            <p className="text-xs text-gray-400 mt-0.5 max-w-[120px] truncate">
                                                                {p.producto_sat_nombre}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {p.codigo
                                                        ? <code className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-700">{p.codigo}</code>
                                                        : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {p.unidad
                                                        ? <span className="capitalize">{p.unidad}{p.minimo_compra != null ? ` · mín ${p.minimo_compra}` : ""}</span>
                                                        : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {p.precio != null ? `$${Number(p.precio).toFixed(2)}` : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                                                    {p.notas || <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => abrirEditar(p)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button onClick={() => handleEliminar(p)} disabled={eliminando === p.idproveedor_producto}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40" title="Eliminar">
                                                            {eliminando === p.idproveedor_producto
                                                                ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}