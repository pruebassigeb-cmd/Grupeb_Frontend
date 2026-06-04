import { useState, useEffect } from "react";
import Modal from "./../Modal";
import {
  getPaqueterias, createPaqueteria, updatePaqueteria, deletePaqueteria,
} from "../../services/enviosService";
import type { Paqueteria } from "../../types/envios.types";
import { inputClass, labelClass, buildMapsUrl, copiarLink } from "./../enviosConstants";
import { showAlert } from './../CustomAlert';
import { showConfirm } from './../CustomConfirm';
import { buscarCodigoPostal } from "../../services/codigoPostalService";

type OpcionCP = {
  colonia: string;
  poblacion: string;
  estado: string;
};
const emptyForm = {
  nombre:    "",
  telefono:  "",
  sitioweb:  "",
  calle:     "",
  numero:    "",
  colonia:   "",
  cp:        "",
  poblacion: "",
  estado:    "",
};

export default function TabPaqueterias() {
  const [paqueterias,  setPaqueterias]  = useState<Paqueteria[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [expandida,    setExpandida]    = useState<number | null>(null);
  const [editando,     setEditando]     = useState<Paqueteria | null>(null);
  const [guardando,    setGuardando]    = useState(false);
  const [form,         setForm]         = useState(emptyForm);
  const [opcionesCP,   setOpcionesCP]   = useState<OpcionCP[]>([]);
  const [buscandoCP,   setBuscandoCP]   = useState(false);
  const [errorCP,      setErrorCP]      = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try { setPaqueterias(await getPaqueterias()); }
    catch { showAlert("Error al cargar paqueterías"); }
    finally { setLoading(false); }
  };

  const buscarCP = async (cp: string) => {
    setBuscandoCP(true);
    setErrorCP(null);
    try {
      const opciones = await buscarCodigoPostal(cp);
      setOpcionesCP(opciones);
    } catch {
      setErrorCP("CP no encontrado, captura manualmente");
    } finally {
      setBuscandoCP(false);
    }
  };

  const handleCpChange = (valor: string) => {
    const limpio = valor.replace(/\D/g, "").slice(0, 5);
    setForm(prev => ({ ...prev, cp: limpio, colonia: "", poblacion: "", estado: "" }));
    setOpcionesCP([]);
    setErrorCP(null);
    if (limpio.length === 5) buscarCP(limpio);
  };

  const handleSeleccionCP = (colonia: string) => {
    const opcion = opcionesCP.find(o => o.colonia === colonia);
    if (!opcion) return;
    setForm(prev => ({
      ...prev,
      colonia: opcion.colonia,
      poblacion: opcion.poblacion,
      estado: opcion.estado,
    }));
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm(emptyForm);
    setOpcionesCP([]);
    setErrorCP(null);
    setModalOpen(true);
  };

  const abrirEditar = (p: Paqueteria) => {
    setEditando(p);
    setForm({
      nombre:    p.nombre    || "",
      telefono:  p.telefono  || "",
      sitioweb:  p.sitioweb  || "",
      calle:     p.calle     || "",
      numero:    p.numero    || "",
      colonia:   p.colonia   || "",
      cp:        p.cp        || "",
      poblacion: p.poblacion || "",
      estado:    p.estado    || "",
    });
    setOpcionesCP([]);
    setErrorCP(null);
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { showAlert("El nombre es requerido"); return; }
    setGuardando(true);
    try {
      const data = {
        nombre:    form.nombre.trim(),
        telefono:  form.telefono.trim()  || undefined,
        sitioweb:  form.sitioweb.trim()  || undefined,
        calle:     form.calle.trim()     || undefined,
        numero:    form.numero.trim()    || undefined,
        colonia:   form.colonia.trim()   || undefined,
        cp:        form.cp.trim()        || undefined,
        poblacion: form.poblacion.trim() || undefined,
        estado:    form.estado.trim()    || undefined,
      };
      if (editando) await updatePaqueteria(editando.idpaqueteria, { ...data, activo: editando.activo });
      else await createPaqueteria(data);
      setModalOpen(false);
      await cargar();
    } catch (e: any) {
      showAlert(e.response?.data?.error || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (p: Paqueteria) => {
    try {
      await updatePaqueteria(p.idpaqueteria, { nombre: p.nombre, activo: !p.activo });
      await cargar();
    } catch { showAlert("Error al actualizar estado"); }
  };

  const handleEliminar = async (id: number) => {
    if (!await showConfirm("¿Eliminar esta paquetería?")) return;
    try { await deletePaqueteria(id); await cargar(); }
    catch (e: any) { showAlert(e.response?.data?.error || "Error al eliminar"); }
  };

  const getMapsUrl = (p: Paqueteria) =>
    buildMapsUrl(p.calle || "", p.numero || "", p.colonia || "", p.poblacion || "", p.estado || "", p.cp || "");

  const tieneDireccion = (p: Paqueteria) =>
    !!(p.calle || p.poblacion || p.estado);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Paqueterías</h2>
        <button onClick={abrirCrear}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
          + Añadir Paquetería
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Nombre","Teléfono","Sitio Web","Dirección","Estado","Acciones"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paqueterias.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No hay paqueterías registradas
                </td>
              </tr>
            ) : paqueterias.map(p => (
              <>
                <tr key={p.idpaqueteria} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.telefono || "-"}</td>
                  <td className="px-4 py-3 text-xs">
                    {p.sitioweb
                      ? <a href={p.sitioweb.startsWith("http") ? p.sitioweb : `https://${p.sitioweb}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline">
                          {p.sitioweb}
                        </a>
                      : <span className="text-gray-400">-</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {[p.calle, p.numero, p.colonia, p.poblacion, p.estado, p.cp]
                      .filter(Boolean).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActivo(p)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        p.activo
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}>
                      {p.activo ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandida(expandida === p.idpaqueteria ? null : p.idpaqueteria)}
                        className="text-gray-400 hover:text-gray-700 text-xs">
                        {expandida === p.idpaqueteria ? "▲ menos" : "▼ más"}
                      </button>
                      <button onClick={() => abrirEditar(p)}
                        className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                      <button onClick={() => handleEliminar(p.idpaqueteria)}
                        className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                    </div>
                  </td>
                </tr>

                {expandida === p.idpaqueteria && (
                  <tr key={`exp-${p.idpaqueteria}`} className="bg-blue-50">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="grid grid-cols-4 gap-4 text-xs text-gray-600 mb-3">
                        <div>
                          <span className="font-semibold text-gray-700 block mb-0.5">Teléfono</span>
                          {p.telefono || <span className="text-gray-400">No registrado</span>}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 block mb-0.5">Sitio Web</span>
                          {p.sitioweb
                            ? <a href={p.sitioweb.startsWith("http") ? p.sitioweb : `https://${p.sitioweb}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 hover:underline break-all">
                                {p.sitioweb}
                              </a>
                            : <span className="text-gray-400">No registrado</span>
                          }
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 block mb-0.5">Calle y número</span>
                          {[p.calle, p.numero].filter(Boolean).join(" ") || <span className="text-gray-400">No registrado</span>}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 block mb-0.5">Colonia</span>
                          {p.colonia || <span className="text-gray-400">No registrada</span>}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 block mb-0.5">C.P.</span>
                          {p.cp || <span className="text-gray-400">No registrado</span>}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 block mb-0.5">Población</span>
                          {p.poblacion || <span className="text-gray-400">No registrada</span>}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 block mb-0.5">Estado</span>
                          {p.estado || <span className="text-gray-400">No registrado</span>}
                        </div>
                      </div>
                      {tieneDireccion(p) && (
                        <div className="flex items-center gap-2">
                          <a href={getMapsUrl(p)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 whitespace-nowrap">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            Abrir en Maps
                          </a>
                          <button onClick={() => copiarLink(getMapsUrl(p))}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 whitespace-nowrap">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Copiar link
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editando ? "Editar Paquetería" : "Nueva Paquetería"}>
        <div className="space-y-4">

          <div>
            <label className={labelClass}>Nombre *</label>
            <input type="text" value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              className={inputClass} placeholder="FedEx, Estafeta..." autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Teléfono</label>
              <input type="text" value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                className={inputClass} placeholder="33 1234 5678" />
            </div>
            <div>
              <label className={labelClass}>Sitio Web</label>
              <input type="text" value={form.sitioweb}
                onChange={e => setForm({ ...form, sitioweb: e.target.value })}
                className={inputClass} placeholder="www.fedex.com" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">
              Dirección (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Calle</label>
                <input type="text" value={form.calle}
                  onChange={e => setForm({ ...form, calle: e.target.value })}
                  className={inputClass} placeholder="Av. Revolución" />
              </div>
              <div>
                <label className={labelClass}>Número</label>
                <input type="text" value={form.numero}
                  onChange={e => setForm({ ...form, numero: e.target.value })}
                  className={inputClass} placeholder="123" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelClass}>
                  C.P.
                  {buscandoCP && (
                    <span className="ml-2 text-blue-500 text-xs font-normal">Buscando...</span>
                  )}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.cp}
                  onChange={e => handleCpChange(e.target.value)}
                  className={errorCP ? `${inputClass} border-orange-300` : inputClass}
                  placeholder="44100"
                  maxLength={5}
                />
                {errorCP && (
                  <p className="mt-1 text-xs text-amber-600">{errorCP}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Colonia</label>
                {opcionesCP.length > 0 ? (
                  <select
                    value={form.colonia}
                    onChange={(e) => handleSeleccionCP(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecciona colonia...</option>
                    {opcionesCP.map((opcion, index) => (
                      <option key={`${opcion.colonia}-${index}`} value={opcion.colonia}>
                        {opcion.colonia}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={form.colonia}
                    onChange={e => setForm({ ...form, colonia: e.target.value })}
                    className={inputClass} placeholder="Centro" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelClass}>Población / Ciudad</label>
                <input type="text" value={form.poblacion}
                  onChange={e => setForm({ ...form, poblacion: e.target.value })}
                  className={inputClass} placeholder="Guadalajara" />
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <input type="text" value={form.estado}
                  onChange={e => setForm({ ...form, estado: e.target.value })}
                  className={inputClass} placeholder="Jalisco" />
              </div>
            </div>
            {(form.calle || form.poblacion || form.estado) && (
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={buildMapsUrl(form.calle, form.numero, form.colonia, form.poblacion, form.estado, form.cp)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Verificar en Maps
                </a>
                <span className="text-xs text-gray-400">Verifica que la dirección sea correcta</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => setModalOpen(false)} disabled={guardando}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={guardando}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
              {guardando ? "Guardando..." : editando ? "Guardar Cambios" : "Crear Paquetería"}
            </button>
          </div>

        </div>
      </Modal>
    </div>
  );
}