import { useState, useEffect } from "react";
import type { Proveedor, CreateProveedorDto } from "../services/proveedoresService";
import { crearProveedor, actualizarProveedor } from "../services/proveedoresService";
import { showAlert } from "./CustomAlert";

interface Props {
  proveedor?: Proveedor | null; // null = alta, objeto = edición
  onGuardado: (p: Proveedor) => void;
  onCancel: () => void;
}

const VACIO: CreateProveedorDto = {
  nombre: "", contacto: "", telefono: "", correo: "", direccion: "", notas: "",
};

export default function FormularioProveedor({ proveedor, onGuardado, onCancel }: Props) {
  const [form, setForm]       = useState<CreateProveedorDto>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const esEdicion = !!proveedor;

  useEffect(() => {
    if (proveedor) {
      setForm({
        nombre:    proveedor.nombre    ?? "",
        contacto:  proveedor.contacto  ?? "",
        telefono:  proveedor.telefono  ?? "",
        correo:    proveedor.correo    ?? "",
        direccion: proveedor.direccion ?? "",
        notas:     proveedor.notas     ?? "",
      });
    } else {
      setForm(VACIO);
    }
  }, [proveedor]);

  const set = (field: keyof CreateProveedorDto, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { showAlert("El nombre es requerido"); return; }
    setGuardando(true);
    try {
      let resultado: Proveedor;
      if (esEdicion && proveedor) {
        resultado = await actualizarProveedor(proveedor.idproveedor, form);
      } else {
        resultado = await crearProveedor(form);
      }
      onGuardado(resultado);
    } catch (error: any) {
      showAlert(error?.response?.data?.error || "Error al guardar proveedor");
    } finally {
      setGuardando(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 text-sm";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {esEdicion ? "Editar proveedor" : "Nuevo proveedor"}
          </h3>
          <p className="text-xs text-gray-500">
            {esEdicion ? `Modificando: ${proveedor?.nombre}` : "Completa los datos del proveedor"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Nombre — obligatorio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.nombre}
            onChange={e => set("nombre", e.target.value)}
            placeholder="Ej: Tintas del Norte S.A. de C.V."
            className={inputClass}
            maxLength={150}
            autoFocus
          />
        </div>

        {/* Contacto + Teléfono */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contacto</label>
            <input
              type="text"
              value={form.contacto ?? ""}
              onChange={e => set("contacto", e.target.value)}
              placeholder="Nombre de la persona"
              className={inputClass}
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
            <input
              type="text"
              value={form.telefono ?? ""}
              onChange={e => set("telefono", e.target.value)}
              placeholder="33 1234 5678"
              className={inputClass}
              maxLength={30}
            />
          </div>
        </div>

        {/* Correo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
          <input
            type="email"
            value={form.correo ?? ""}
            onChange={e => set("correo", e.target.value)}
            placeholder="contacto@proveedor.com"
            className={inputClass}
            maxLength={100}
          />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
          <input
            type="text"
            value={form.direccion ?? ""}
            onChange={e => set("direccion", e.target.value)}
            placeholder="Calle, número, ciudad..."
            className={inputClass}
            maxLength={255}
          />
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notas <span className="text-xs text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={form.notas ?? ""}
            onChange={e => set("notas", e.target.value)}
            rows={3}
            placeholder="Condiciones de pago, tiempo de entrega, observaciones..."
           className={`${inputClass} resize-none`}
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:bg-blue-400 transition-colors"
          >
            {guardando ? (
  <>
    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
    Guardando...
  </>
) : esEdicion ? "Guardar cambios" : "Crear proveedor"}
          </button>
        </div>
      </form>
    </div>
  );
}