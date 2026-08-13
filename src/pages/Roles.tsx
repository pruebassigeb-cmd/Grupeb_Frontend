import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import Modal from "../components/Modal";
import SelectorPrivilegios from "../components/privilegios/SelectorPrivilegios";
import { showAlert } from "../components/CustomAlert";
import { showConfirm } from "../components/CustomConfirm";
import {
  getRoles,
  getPrivilegiosByRol,
  crearRol,
  editarRol,
  actualizarPrivilegiosRol,
} from "../services/rolesService";
import {
  getPrivilegios,
  getModulos,
  crearPrivilegio,
  editarPrivilegio,
  toggleActivoPrivilegio,
} from "../services/privilegiosService";
import type { Rol } from "../types/rol.types";
import type { Privilegio, PrivilegioModulo } from "../types/privilegio.types";

type Tab = "roles" | "privilegios";

// ════════════════════════════════════════════════════════════════════════
// FORMULARIO DE ROL
// ════════════════════════════════════════════════════════════════════════
function FormularioRol({
  rol, privilegios, modulos, onSubmit, onCancel,
}: {
  rol: Rol | null;
  privilegios: Privilegio[];
  modulos: PrivilegioModulo[];
  onSubmit: (datos: { nombre: string; descripcion: string; acceso_total: boolean; base: number[] }) => Promise<void>;
  onCancel: () => void;
}) {
  const [nombre, setNombre]           = useState(rol?.nombre || "");
  const [descripcion, setDescripcion] = useState(rol?.descripcion || "");
  const [accesoTotal, setAccesoTotal] = useState(rol?.acceso_total || false);
  const [base, setBase]               = useState<number[]>([]);
  const [cargandoBase, setCargandoBase] = useState(!!rol && !rol.acceso_total);
  const [guardando, setGuardando]     = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (!rol || rol.acceso_total) { setCargandoBase(false); return; }
    (async () => {
      try {
        const data = await getPrivilegiosByRol(rol.idroles);
        setBase(data.base);
      } catch {
        showAlert("No se pudo cargar la base de privilegios del rol");
      } finally {
        setCargandoBase(false);
      }
    })();
  }, [rol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setError("El nombre del rol es requerido"); return; }
    setError("");
    setGuardando(true);
    try {
      await onSubmit({ nombre: nombre.trim(), descripcion: descripcion.trim(), acceso_total: accesoTotal, base });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ej. Operador Papel" />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={accesoTotal} onChange={e => setAccesoTotal(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded" />
        Acceso total al sistema (sin restricciones de privilegios)
      </label>

      {!accesoTotal && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Privilegios base del rol</label>
          {cargandoBase ? (
            <p className="text-sm text-gray-500">Cargando privilegios...</p>
          ) : (
            <SelectorPrivilegios
              privilegios={privilegios}
              modulos={modulos}
              seleccionados={base}
              onChange={setBase}
            />
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="submit" disabled={guardando}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {guardando ? "Guardando..." : rol ? "Guardar Cambios" : "Crear Rol"}
        </button>
      </div>
    </form>
  );
}

// ════════════════════════════════════════════════════════════════════════
// FORMULARIO DE PRIVILEGIO
// ════════════════════════════════════════════════════════════════════════
function FormularioPrivilegio({
  privilegio, modulos, onSubmit, onCancel,
}: {
  privilegio: Privilegio | null;
  modulos: PrivilegioModulo[];
  onSubmit: (datos: { privilegio: string; clave: string; idmodulo: number; descripcion: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [nombre, setNombre]           = useState(privilegio?.privilegio || "");
  const [clave, setClave]             = useState(privilegio?.clave || "");
  const [idmodulo, setIdmodulo]       = useState(privilegio?.idmodulo || 0);
  const [descripcion, setDescripcion] = useState(privilegio?.descripcion || "");
  const [guardando, setGuardando]     = useState(false);
  const [error, setError]             = useState("");

  const esEdicion = !!privilegio;
  const claveValida = /^[a-z0-9]+(\.[a-z0-9_]+)+$/.test(clave.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setError("El nombre es requerido"); return; }
    if (!esEdicion && !claveValida) {
      setError("La clave debe tener el formato modulo.recurso.accion (minúsculas, sin espacios)");
      return;
    }
    if (!idmodulo) { setError("Debe seleccionar un módulo"); return; }
    setError("");
    setGuardando(true);
    try {
      await onSubmit({ privilegio: nombre.trim(), clave: clave.trim(), idmodulo, descripcion: descripcion.trim() });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre visible *</label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ej. Ver Reportes Avanzados" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Clave {esEdicion && <span className="text-xs text-gray-400 font-normal">(no editable — es la llave que usa el código)</span>}
        </label>
        <input type="text" value={clave}
          onChange={e => setClave(e.target.value.toLowerCase())}
          disabled={esEdicion}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white font-mono text-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="modulo.recurso.accion" />
        {!esEdicion && !claveValida && clave.length > 0 && (
          <p className="mt-1 text-xs text-amber-600">Formato esperado: modulo.recurso.accion</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Módulo *</label>
        <select value={idmodulo} onChange={e => setIdmodulo(Number(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value={0}>Seleccionar módulo...</option>
          {modulos.map(m => (
            <option key={m.idmodulo} value={m.idmodulo}>
              {m.idmodulo_padre ? `— ${m.nombre}` : m.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {esEdicion && privilegio?.es_sistema && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Este privilegio ya está conectado a pantallas o endpoints del sistema. Cambiar el módulo o la
          descripción es seguro; la clave no se puede tocar porque el código depende de ella.
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="submit" disabled={guardando}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {guardando ? "Guardando..." : esEdicion ? "Guardar Cambios" : "Crear Privilegio"}
        </button>
      </div>
    </form>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════
export default function Roles() {
  const [tab, setTab] = useState<Tab>("roles");
  const [roles, setRoles] = useState<Rol[]>([]);
  const [privilegios, setPrivilegios] = useState<Privilegio[]>([]);
  const [modulos, setModulos] = useState<PrivilegioModulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [modalRolAbierto, setModalRolAbierto] = useState(false);
  const [rolEditar, setRolEditar] = useState<Rol | null>(null);
  const [modalPrivAbierto, setModalPrivAbierto] = useState(false);
  const [privEditar, setPrivEditar] = useState<Privilegio | null>(null);

  const cargarTodo = async () => {
    try {
      setLoading(true);
      const [rolesData, privilegiosData, modulosData] = await Promise.all([
        getRoles(), getPrivilegios(), getModulos(),
      ]);
      setRoles(rolesData);
      setPrivilegios(privilegiosData);
      setModulos(modulosData);
    } catch {
      showAlert("Error al cargar roles y privilegios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarTodo(); }, []);

  const normalizar = (t: string) => t.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

  const rolesFiltrados = roles.filter(r =>
    !busqueda || normalizar(r.nombre).includes(normalizar(busqueda)) ||
    normalizar(r.descripcion || "").includes(normalizar(busqueda))
  );
  const privilegiosFiltrados = privilegios.filter(p =>
    !busqueda || normalizar(p.privilegio).includes(normalizar(busqueda)) ||
    normalizar(p.clave || "").includes(normalizar(busqueda))
  );

  const modulosPorId = new Map(modulos.map(m => [m.idmodulo, m]));

  // ── Roles ────────────────────────────────────────────────────────────
  const handleSubmitRol = async (datos: { nombre: string; descripcion: string; acceso_total: boolean; base: number[] }) => {
    try {
      const guardado = rolEditar
        ? await editarRol(rolEditar.idroles, { nombre: datos.nombre, descripcion: datos.descripcion, acceso_total: datos.acceso_total })
        : await crearRol({ nombre: datos.nombre, descripcion: datos.descripcion, acceso_total: datos.acceso_total });

      if (!datos.acceso_total) {
        await actualizarPrivilegiosRol(guardado.idroles, datos.base);
      }

      showAlert(rolEditar ? "Rol actualizado exitosamente" : "Rol creado exitosamente");
      setModalRolAbierto(false);
      setRolEditar(null);
      await cargarTodo();
    } catch (error: any) {
      showAlert(error.response?.data?.error || "Error al guardar el rol");
    }
  };

  // ── Privilegios ──────────────────────────────────────────────────────
  const handleSubmitPrivilegio = async (datos: { privilegio: string; clave: string; idmodulo: number; descripcion: string }) => {
    try {
      if (privEditar) {
        await editarPrivilegio(privEditar.idprivilegios, {
          privilegio: datos.privilegio, idmodulo: datos.idmodulo, descripcion: datos.descripcion,
        });
        showAlert("Privilegio actualizado exitosamente");
      } else {
        await crearPrivilegio(datos);
        showAlert("Privilegio creado exitosamente");
      }
      setModalPrivAbierto(false);
      setPrivEditar(null);
      await cargarTodo();
    } catch (error: any) {
      showAlert(error.response?.data?.error || "Error al guardar el privilegio");
    }
  };

  const handleToggleActivo = async (p: Privilegio) => {
    const accion = p.activo === false ? "activar" : "desactivar";
    const advertencia = p.es_sistema
      ? " Este privilegio ya está conectado a pantallas o endpoints del sistema — desactivarlo le quita el acceso a quien lo tenga."
      : "";
    if (!await showConfirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} "${p.privilegio}"?${advertencia}`)) return;
    try {
      await toggleActivoPrivilegio(p.idprivilegios);
      await cargarTodo();
    } catch {
      showAlert(`Error al ${accion} el privilegio`);
    }
  };

  return (
    <Dashboard>
      <h1 className="text-2xl font-bold mb-4">Roles y Privilegios</h1>
      <p className="text-slate-400 mb-6">Administra los roles del sistema y el catálogo de privilegios.</p>

      {/* TABS */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["roles", "privilegios"] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setBusqueda(""); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "roles" ? "Roles" : `Privilegios (${privilegios.length})`}
          </button>
        ))}
      </div>

      {/* BUSCADOR */}
      <div className="mb-6">
        <div className="relative">
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder={tab === "roles" ? "Buscar rol..." : "Buscar privilegio por nombre o clave..."}
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={() => tab === "roles" ? setModalRolAbierto(true) : setModalPrivAbierto(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition duration-200">
          + {tab === "roles" ? "Agregar Nuevo Rol" : "Agregar Nuevo Privilegio"}
        </button>
      </div>

      {tab === "roles" ? (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Cargando roles...</td></tr>
              ) : rolesFiltrados.length > 0 ? rolesFiltrados.map(rol => (
                <tr key={rol.idroles} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rol.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{rol.descripcion || "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${rol.acceso_total ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"}`}>
                      {rol.acceso_total ? "Acceso Total" : "Por privilegios"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => { setRolEditar(rol); setModalRolAbierto(true); }}
                      className="text-blue-600 hover:text-blue-900">Editar</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No hay roles registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clave</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Módulo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Cargando privilegios...</td></tr>
              ) : privilegiosFiltrados.length > 0 ? privilegiosFiltrados.map(p => (
                <tr key={p.idprivilegios} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {p.privilegio}
                    {p.es_sistema && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-indigo-100 text-indigo-700 rounded">
                        Sistema
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-500">{p.clave || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {p.idmodulo ? modulosPorId.get(p.idmodulo)?.nombre || "—" : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => handleToggleActivo(p)}
                      title={p.activo === false ? "Click para activar" : "Click para desactivar"}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-75 cursor-pointer
                        ${p.activo === false ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${p.activo === false ? "bg-red-500" : "bg-green-500"}`} />
                      {p.activo === false ? "Inactivo" : "Activo"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => { setPrivEditar(p); setModalPrivAbierto(true); }}
                      className="text-blue-600 hover:text-blue-900">Editar</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay privilegios registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalRolAbierto} onClose={() => { setModalRolAbierto(false); setRolEditar(null); }}
        title={rolEditar ? "Editar Rol" : "Nuevo Rol"}>
        <FormularioRol
          rol={rolEditar}
          privilegios={privilegios}
          modulos={modulos}
          onSubmit={handleSubmitRol}
          onCancel={() => { setModalRolAbierto(false); setRolEditar(null); }}
        />
      </Modal>

      <Modal isOpen={modalPrivAbierto} onClose={() => { setModalPrivAbierto(false); setPrivEditar(null); }}
        title={privEditar ? "Editar Privilegio" : "Nuevo Privilegio"}>
        <FormularioPrivilegio
          privilegio={privEditar}
          modulos={modulos}
          onSubmit={handleSubmitPrivilegio}
          onCancel={() => { setModalPrivAbierto(false); setPrivEditar(null); }}
        />
      </Modal>
    </Dashboard>
  );
}
