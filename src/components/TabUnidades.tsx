import { useState, useEffect } from "react";
import Modal from "./Modal";
import { getUnidades, createUnidad, updateUnidad, deleteUnidad } from "../services/enviosService";
import type { Unidad } from "../types/envios.types";
import { inputClass, labelClass } from "./enviosConstants";
import { showAlert } from './CustomAlert';
import { showConfirm } from './CustomConfirm';



const emptyForm = {
  tipo: "", marca: "", modelo: "", placa: "",
  num_serie: "", num_motor: "", color: "", propietario: "",
};

export default function TabUnidades() {
  const [unidades,  setUnidades]  = useState<Unidad[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando,  setEditando]  = useState<Unidad | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form,      setForm]      = useState(emptyForm);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try { setUnidades(await getUnidades()); }
    catch { showAlert("Error al cargar unidades"); }
    finally { setLoading(false); }
  };

  const abrirCrear = () => { setEditando(null); setForm(emptyForm); setModalOpen(true); };

  const abrirEditar = (u: Unidad) => {
    setEditando(u);
    setForm({
      tipo: u.tipo || "", marca: u.marca || "", modelo: u.modelo || "",
      placa: u.placa || "", num_serie: u.num_serie || "", num_motor: u.num_motor || "",
      color: u.color || "", propietario: u.propietario || "",
    });
    setModalOpen(true);
  };

  const handleToggleActivo = async (u: Unidad) => {
    try {
      await updateUnidad(u.idunidad, {
        tipo: u.tipo, marca: u.marca, modelo: u.modelo, placa: u.placa,
        num_serie: u.num_serie, num_motor: u.num_motor,
        color: u.color, propietario: u.propietario, activo: !u.activo,
      });
      await cargar();
    } catch { showAlert("Error al actualizar estado"); }
  };

  const handleEliminar = async (id: number) => {
    if (!await showConfirm("¿Eliminar esta unidad?")) return;
    try { await deleteUnidad(id); await cargar(); }
    catch (e: any) { showAlert(e.response?.data?.error || "Error al eliminar"); }
  };

  const handleGuardar = async () => {
    if (!form.tipo || !form.marca || !form.modelo || !form.placa) {
      showAlert("Tipo, marca, modelo y placa son requeridos"); return;
    }
    setGuardando(true);
    try {
      if (editando) await updateUnidad(editando.idunidad, { ...form, activo: editando.activo });
      else await createUnidad(form);
      setModalOpen(false);
      await cargar();
    } catch (e: any) { showAlert(e.response?.data?.error || "Error al guardar"); }
    finally { setGuardando(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Unidades</h2>
        <button onClick={abrirCrear}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
          + Agregar Unidad
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Tipo","Marca","Modelo","Placa","Color","Propietario","Estado","Acciones"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {unidades.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hay unidades registradas</td></tr>
            ) : unidades.map(u => (
              <tr key={u.idunidad} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{u.tipo}</td>
                <td className="px-4 py-3 text-gray-700">{u.marca}</td>
                <td className="px-4 py-3 text-gray-700">{u.modelo}</td>
                <td className="px-4 py-3 font-mono text-gray-700">{u.placa}</td>
                <td className="px-4 py-3 text-gray-500">{u.color || "-"}</td>
                <td className="px-4 py-3 text-gray-500">{u.propietario || "-"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleActivo(u)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                      u.activo
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                    {u.activo ? "Activa" : "Inactiva"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => abrirEditar(u)} className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                    <button onClick={() => handleEliminar(u.idunidad)} className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editando ? "Editar Unidad" : "Nueva Unidad"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tipo *</label>
              <input type="text" value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
                className={inputClass} placeholder="Camioneta, Van, Pick-up..." />
            </div>
            <div>
              <label className={labelClass}>Marca *</label>
              <input type="text" value={form.marca}
                onChange={e => setForm({ ...form, marca: e.target.value })}
                className={inputClass} placeholder="Ford, Toyota..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Modelo *</label>
              <input type="text" value={form.modelo}
                onChange={e => setForm({ ...form, modelo: e.target.value })}
                className={inputClass} placeholder="Transit, Hilux..." />
            </div>
            <div>
              <label className={labelClass}>Placa *</label>
              <input type="text" value={form.placa}
                onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                className={inputClass} placeholder="ABC-123" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Núm. Serie (VIN)</label>
              <input type="text" value={form.num_serie}
                onChange={e => setForm({ ...form, num_serie: e.target.value })}
                className={inputClass} placeholder="VIN..." />
            </div>
            <div>
              <label className={labelClass}>Núm. Motor</label>
              <input type="text" value={form.num_motor}
                onChange={e => setForm({ ...form, num_motor: e.target.value })}
                className={inputClass} placeholder="..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Color</label>
              <input type="text" value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className={inputClass} placeholder="Blanco, Negro..." />
            </div>
            <div>
              <label className={labelClass}>Propietario</label>
              <input type="text" value={form.propietario}
                onChange={e => setForm({ ...form, propietario: e.target.value })}
                className={inputClass} placeholder="Grupeb SA de CV..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} disabled={guardando}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={guardando}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
              {guardando ? "Guardando..." : editando ? "Guardar Cambios" : "Crear Unidad"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}