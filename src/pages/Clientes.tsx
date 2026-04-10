import Dashboard from "../layouts/Sidebar";
import Modal from "../components/Modal";
import FormularioCliente from "../components/FormularioCliente";
import { useState, useEffect } from "react";
import { getClientes, getClienteById, createCliente, updateCliente, deleteCliente } from "../services/clientesService";
import type { Cliente } from "../types/clientes.types";
import type { CreateClienteRequest, UpdateClienteRequest } from "../types/clientes.types";

export default function Clientes() {
  const [modalOpen,     setModalOpen]     = useState(false);
  const [busqueda,      setBusqueda]      = useState("");
  const [clientes,      setClientes]      = useState<Cliente[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const data = await getClientes();
      setClientes(data);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
      alert("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

const normalizarTexto = (texto: string | null | undefined) => {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,\-]/g, "")
    .trim();
};

const clientesFiltrados = clientes.filter((cliente) => {
  if (!busqueda) return true;

  const terminoBusqueda = normalizarTexto(busqueda);

  return (
    cliente.idclientes.toString().includes(busqueda.trim()) ||
    normalizarTexto(cliente.empresa).includes(terminoBusqueda) ||
    normalizarTexto(cliente.correo).includes(terminoBusqueda) ||
    normalizarTexto(cliente.atencion).includes(terminoBusqueda) ||
    normalizarTexto(cliente.impresion).includes(terminoBusqueda) ||
    normalizarTexto(cliente.telefono).includes(terminoBusqueda) ||
    normalizarTexto(cliente.rfc).includes(terminoBusqueda)
  );
});
  const handleEditar = async (id: number) => {
    try {
      const cliente = await getClienteById(id);
      setClienteEditar(cliente);
      setModalOpen(true);
    } catch (error) {
      console.error("Error al cargar cliente:", error);
      alert("Error al cargar datos del cliente");
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return;

    try {
      await deleteCliente(id);
      await cargarClientes();
      alert("Cliente eliminado exitosamente");
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      alert("Error al eliminar cliente");
    }
  };

  const handleAgregarCliente = () => {
    setClienteEditar(null);
    setModalOpen(true);
  };

  const handleSubmit = async (datos: CreateClienteRequest | UpdateClienteRequest) => {
    try {
      if (clienteEditar) {
        await updateCliente(clienteEditar.idclientes, datos as UpdateClienteRequest);
        alert("Cliente actualizado exitosamente");
      } else {
        await createCliente(datos as CreateClienteRequest);
        alert("Cliente creado exitosamente");
      }

      await cargarClientes();
      setModalOpen(false);
      setClienteEditar(null);
    } catch (error: any) {
      console.error("Error al guardar cliente:", error);
      const mensaje = error.response?.data?.error || "Error al guardar cliente";
      alert(mensaje);
    }
  };

  const handleCancelar = () => {
    setModalOpen(false);
    setClienteEditar(null);
  };

  return (
    <Dashboard>
      <h1 className="text-2xl font-bold mb-4">Clientes</h1>

      <p className="text-slate-400 mb-6">
        Gestiona los clientes del sistema GRUPEB.
      </p>

      {/* BUSCADOR */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por N° cliente, empresa, correo, impresión, teléfono o RFC..."
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
            Se encontraron {clientesFiltrados.length} resultado(s)
          </p>
        )}
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empresa
              </th>
              {/* ✅ Cambiado de "Atención" a "Impresión" */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Impresión
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Correo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RFC
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
                  Cargando clientes...
                </td>
              </tr>
            ) : clientesFiltrados.length > 0 ? (
              clientesFiltrados.map((cliente) => (
                <tr key={cliente.idclientes} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cliente.empresa}
                  </td>
                  {/* ✅ Cambiado de cliente.atencion a cliente.impresion */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cliente.impresion || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cliente.correo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cliente.telefono || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cliente.rfc || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditar(cliente.idclientes)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(cliente.idclientes)}
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
                    ? `No se encontraron clientes que coincidan con "${busqueda}"`
                    : "No hay clientes registrados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* BOTÓN AGREGAR */}
      <div className="mt-6">
        <button
          onClick={handleAgregarCliente}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition duration-200"
        >
          + Agregar Nuevo Cliente
        </button>
      </div>

      {/* MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCancelar}
        title={clienteEditar ? "Editar Cliente" : "Nuevo Cliente"}
      >
        <FormularioCliente
          onSubmit={handleSubmit}
          onCancel={handleCancelar}
          clienteEditar={clienteEditar}
        />
      </Modal>
    </Dashboard>
  );
}