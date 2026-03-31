import Dashboard from "../layouts/Sidebar";
import Modal from "../components/Modal";
import FormularioUsuario from "../components/FormularioUsuario";
import { useState, useEffect } from "react";
import { getUsuarios, getUsuarioById, createUsuario, updateUsuario, deleteUsuario } from "../services/usuariosService";
import type { Usuario } from "../types/usuario.types";
import type { CreateUsuarioRequest, UpdateUsuarioRequest } from "../types/usuario.types";

export default function Usuarios() {
  const [modalOpen, setModalOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const data = await getUsuarios();
      setUsuarios(data);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      alert("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const normalizarTexto = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,\-]/g, "")
      .trim();
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    if (!busqueda) return true;

    const terminoBusqueda = normalizarTexto(busqueda);

    return (
      normalizarTexto(usuario.nombre).includes(terminoBusqueda) ||
      normalizarTexto(usuario.apellido).includes(terminoBusqueda) ||
      normalizarTexto(usuario.correo).includes(terminoBusqueda) ||
      normalizarTexto(usuario.telefono || "").includes(terminoBusqueda) ||
      normalizarTexto(usuario.rol || "").includes(terminoBusqueda)
    );
  });

  const handleEditar = async (id: number) => {
    try {
      const usuario = await getUsuarioById(id);
      setUsuarioEditar(usuario);
      setModalOpen(true);
    } catch (error) {
      console.error("Error al cargar usuario:", error);
      alert("Error al cargar datos del usuario");
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

    try {
      await deleteUsuario(id);
      await cargarUsuarios();
      alert("Usuario eliminado exitosamente");
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      alert("Error al eliminar usuario");
    }
  };

  const handleAgregarUsuario = () => {
    setUsuarioEditar(null);
    setModalOpen(true);
  };

  const handleSubmit = async (datos: CreateUsuarioRequest | UpdateUsuarioRequest) => {
    try {
      if (usuarioEditar) {
        await updateUsuario(usuarioEditar.idusuario, datos as UpdateUsuarioRequest);
        alert("Usuario actualizado exitosamente");
      } else {
        await createUsuario(datos as CreateUsuarioRequest);
        alert("Usuario creado exitosamente");
      }
      
      await cargarUsuarios();
      setModalOpen(false);
      setUsuarioEditar(null);
    } catch (error: any) {
      console.error("Error al guardar usuario:", error);
      const mensaje = error.response?.data?.error || "Error al guardar usuario";
      alert(mensaje);
    }
  };

  const handleCancelar = () => {
    setModalOpen(false);
    setUsuarioEditar(null);
  };

  return (
    <Dashboard>
      <h1 className="text-2xl font-bold mb-4">Usuarios</h1>

      <p className="text-slate-400 mb-6">
        Gestiona los usuarios del sistema GRUPEB.
      </p>

      {/* BUSCADOR */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, apellido, correo, teléfono o rol..."
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {busqueda && (
          <p className="mt-2 text-sm text-gray-600">
            Se encontraron {usuariosFiltrados.length} resultado(s)
          </p>
        )}
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Apellido
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Correo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Cargando usuarios...
                </td>
              </tr>
            ) : usuariosFiltrados.length > 0 ? (
              usuariosFiltrados.map((usuario) => (
                <tr key={usuario.idusuario} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
  {`${usuario.nombre} ${usuario.apellido}`}
</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.apellido}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.correo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.telefono || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        usuario.acceso_total
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {usuario.rol || "Usuario"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditar(usuario.idusuario)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(usuario.idusuario)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {busqueda
                    ? `No se encontraron usuarios que coincidan con "${busqueda}"`
                    : "No hay usuarios registrados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* BOTÓN AGREGAR */}
      <div className="mt-6">
        <button
          onClick={handleAgregarUsuario}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition duration-200"
        >
          + Agregar Nuevo Usuario
        </button>
      </div>

      {/* MODAL */}
      <Modal 
        isOpen={modalOpen} 
        onClose={handleCancelar} 
        title={usuarioEditar ? "Editar Usuario" : "Nuevo Usuario"}
      >
        <FormularioUsuario 
          onSubmit={handleSubmit} 
          onCancel={handleCancelar}
          usuarioEditar={usuarioEditar}
        />
      </Modal>
    </Dashboard>
  );
}