import { useState, useEffect } from "react";
import { getRoles, getPrivilegiosByRol } from "../services/rolesService";
import { getPrivilegios } from "../services/privilegiosService";
import type { Rol } from "../types/rol.types";
import type { Privilegio } from "../types/privilegio.types";
import type { CreateUsuarioRequest, UpdateUsuarioRequest, Usuario } from "../types/usuario.types";

// Roles que tienen privilegios base en BD y no requieren selección manual
const ROLES_CON_PRIVILEGIOS_BASE = ["Planta", "Ventas"];

interface FormularioUsuarioProps {
  onSubmit: (datos: CreateUsuarioRequest | UpdateUsuarioRequest) => void;
  onCancel: () => void;
  usuarioEditar?: Usuario | null;
}

export default function FormularioUsuario({
  onSubmit,
  onCancel,
  usuarioEditar,
}: FormularioUsuarioProps) {
  const [paso, setPaso] = useState(1);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [privilegios, setPrivilegios] = useState<Privilegio[]>([]);
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const esEdicion = !!usuarioEditar;

  const [datos, setDatos] = useState<CreateUsuarioRequest | UpdateUsuarioRequest>({
    correo:        usuarioEditar?.correo        || "",
    nombre:        usuarioEditar?.nombre        || "",
    apellido:      usuarioEditar?.apellido      || "",
    telefono:      usuarioEditar?.telefono      || "",
    codigo:        "",
    roles_idroles: usuarioEditar?.roles_idroles || 0,
    privilegios:   usuarioEditar?.privilegios   || [],
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [rolesData, privilegiosData] = await Promise.all([
        getRoles(),
        getPrivilegios(),
      ]);
      setRoles(rolesData);
      setPrivilegios(privilegiosData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      alert("Error al cargar roles y privilegios");
    }
  };

  const cargarPrivilegiosDelRol = async (rolId: number) => {
    try {
      console.log(`🔄 Cargando privilegios para rol ${rolId}`);
      const privilegiosRol = await getPrivilegiosByRol(rolId);

      if (privilegiosRol.acceso_total) {
        console.log("👑 Rol con acceso total");
        setDatos({ ...datos, roles_idroles: rolId, privilegios: [] });
      } else {
        console.log(`✅ Privilegios cargados: ${privilegiosRol.privilegios.length}`);
        setDatos({
          ...datos,
          roles_idroles: rolId,
          privilegios: privilegiosRol.privilegios,
        });
      }
    } catch (error) {
      console.error("❌ Error al cargar privilegios del rol:", error);
      setDatos({ ...datos, roles_idroles: rolId });
    }
  };

  const validarCampos = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!datos.nombre || datos.nombre.trim().length < 2) {
      nuevosErrores.nombre = "El nombre debe tener al menos 2 caracteres";
    } else if (datos.nombre.length > 50) {
      nuevosErrores.nombre = "El nombre no puede exceder 50 caracteres";
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(datos.nombre)) {
      nuevosErrores.nombre = "El nombre solo puede contener letras";
    }

    if (!datos.apellido || datos.apellido.trim().length < 2) {
      nuevosErrores.apellido = "El apellido debe tener al menos 2 caracteres";
    } else if (datos.apellido.length > 50) {
      nuevosErrores.apellido = "El apellido no puede exceder 50 caracteres";
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(datos.apellido)) {
      nuevosErrores.apellido = "El apellido solo puede contener letras";
    }

    if (!datos.correo) {
      nuevosErrores.correo = "El correo es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
      nuevosErrores.correo = "El formato del correo no es válido";
    }

    if (datos.telefono && datos.telefono.trim() !== "") {
      const telefonoLimpio = datos.telefono.replace(/\D/g, "");
      if (telefonoLimpio.length !== 10) {
        nuevosErrores.telefono = "El teléfono debe tener 10 dígitos";
      }
    }

    if (!esEdicion) {
      if (!datos.codigo || datos.codigo.trim() === "") {
        nuevosErrores.codigo = "El código es requerido";
      } else if (!/^\d{5}$/.test(datos.codigo)) {
        nuevosErrores.codigo = "El código debe tener exactamente 5 dígitos";
      }
    } else {
      if (datos.codigo && datos.codigo.trim() !== "" && !/^\d{5}$/.test(datos.codigo)) {
        nuevosErrores.codigo = "El código debe tener exactamente 5 dígitos";
      }
    }

    if (!datos.roles_idroles || datos.roles_idroles === 0) {
      nuevosErrores.roles_idroles = "Debe seleccionar un rol";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDatos({ ...datos, [name]: name === "roles_idroles" ? parseInt(value) : value });
    if (errores[name]) {
      setErrores({ ...errores, [name]: "" });
    }
  };

  const handleRolChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rolId = parseInt(e.target.value);

    if (rolId === 0) {
      setDatos({ ...datos, roles_idroles: 0, privilegios: [] });
      if (errores.roles_idroles) {
        setErrores({ ...errores, roles_idroles: "" });
      }
      return;
    }

    if (errores.roles_idroles) {
      setErrores({ ...errores, roles_idroles: "" });
    }

    await cargarPrivilegiosDelRol(rolId);
  };

  const handlePrivilegioChange = (idPrivilegio: number) => {
    const privilegiosActuales = datos.privilegios || [];

    if (privilegiosActuales.includes(idPrivilegio)) {
      setDatos({
        ...datos,
        privilegios: privilegiosActuales.filter((p) => p !== idPrivilegio),
      });
    } else {
      setDatos({
        ...datos,
        privilegios: [...privilegiosActuales, idPrivilegio],
      });
    }
  };

  const handleSiguiente = () => {
    if (!validarCampos()) return;
    setPaso(2);
  };

  const handleAtras = () => setPaso(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rolSeleccionado = roles.find(r => r.idroles === datos.roles_idroles);
    const rolNombre       = rolSeleccionado?.nombre ?? "";

    // Roles con privilegios base en BD no requieren selección manual
    const tienePrivilegiosBase = ROLES_CON_PRIVILEGIOS_BASE.includes(rolNombre);

    if (
      !rolSeleccionado?.acceso_total &&
      !tienePrivilegiosBase &&
      (!datos.privilegios || datos.privilegios.length === 0)
    ) {
      alert("Debe seleccionar al menos un privilegio para usuarios sin acceso total");
      return;
    }

    setLoading(true);

    try {
      const datosFinales = { ...datos };

      if (esEdicion && (!datosFinales.codigo || datosFinales.codigo.trim() === "")) {
        delete datosFinales.codigo;
      }

      datosFinales.nombre   = datosFinales.nombre.trim();
      datosFinales.apellido = datosFinales.apellido.trim();
      datosFinales.correo   = datosFinales.correo.trim().toLowerCase();

      if (datosFinales.telefono) {
        datosFinales.telefono = datosFinales.telefono.replace(/\D/g, "");
      }

      await onSubmit(datosFinales);
    } catch (error: any) {
      console.error("Error al guardar usuario:", error);
      if (error.response?.data?.detalles) {
        const detalles = error.response.data.detalles.join("\n");
        alert(`Errores de validación:\n${detalles}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const rolSeleccionado  = roles.find(r => r.idroles === datos.roles_idroles);
  const tieneAccesoTotal = rolSeleccionado?.acceso_total || false;
  const rolNombre        = rolSeleccionado?.nombre ?? "";
  const esRolConBase     = ROLES_CON_PRIVILEGIOS_BASE.includes(rolNombre);

  return (
    <form onSubmit={handleSubmit}>
      {/* Indicador de pasos */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            paso === 1 ? "bg-blue-600 text-white" : "bg-green-600 text-white"
          }`}>
            {paso === 1 ? "1" : "✓"}
          </div>
          <div className={`w-24 h-1 ${paso === 2 ? "bg-blue-600" : "bg-gray-300"}`} />
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            paso === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
          }`}>
            2
          </div>
        </div>
      </div>

      {/* PASO 1: Datos básicos */}
      <div className={paso === 1 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {esEdicion ? "Editar Usuario" : "Datos del Usuario"}
        </h3>

        <div className="space-y-4">
          {/* Correo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico *
            </label>
            <input type="email" name="correo" value={datos.correo}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                focus:border-transparent text-gray-900 bg-white placeholder-gray-400
                ${errores.correo ? "border-red-500" : "border-gray-300"}`}
              placeholder="usuario@grupoeb.com" />
            {errores.correo && <p className="mt-1 text-sm text-red-600">{errores.correo}</p>}
          </div>

          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
              <input type="text" name="nombre" value={datos.nombre}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                  focus:border-transparent text-gray-900 bg-white placeholder-gray-400
                  ${errores.nombre ? "border-red-500" : "border-gray-300"}`}
                placeholder="Juan" />
              {errores.nombre && <p className="mt-1 text-sm text-red-600">{errores.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Apellido *</label>
              <input type="text" name="apellido" value={datos.apellido}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                  focus:border-transparent text-gray-900 bg-white placeholder-gray-400
                  ${errores.apellido ? "border-red-500" : "border-gray-300"}`}
                placeholder="Pérez" />
              {errores.apellido && <p className="mt-1 text-sm text-red-600">{errores.apellido}</p>}
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono (opcional)
            </label>
            <input type="tel" name="telefono" value={datos.telefono}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setDatos({ ...datos, telefono: value });
                if (errores.telefono) setErrores({ ...errores, telefono: "" });
              }}
              maxLength={10}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                focus:border-transparent text-gray-900 bg-white placeholder-gray-400
                ${errores.telefono ? "border-red-500" : "border-gray-300"}`}
              placeholder="3312345678" />
            {errores.telefono && <p className="mt-1 text-sm text-red-600">{errores.telefono}</p>}
          </div>

          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {esEdicion ? "Código (dejar vacío para no cambiar)" : "Código (5 dígitos) *"}
            </label>
            <input type="text" name="codigo" value={datos.codigo} maxLength={5}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setDatos({ ...datos, codigo: value });
                if (errores.codigo) setErrores({ ...errores, codigo: "" });
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                focus:border-transparent text-gray-900 bg-white placeholder-gray-400
                ${errores.codigo ? "border-red-500" : "border-gray-300"}`}
              placeholder={esEdicion ? "Dejar vacío para no cambiar" : "12345"} />
            {errores.codigo && <p className="mt-1 text-sm text-red-600">{errores.codigo}</p>}
            {esEdicion && !errores.codigo && (
              <p className="mt-1 text-xs text-gray-500">Solo ingresa un código si deseas cambiarlo</p>
            )}
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rol *</label>
            <select name="roles_idroles" value={datos.roles_idroles} onChange={handleRolChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                focus:border-transparent text-gray-900 bg-white
                ${errores.roles_idroles ? "border-red-500" : "border-gray-300"}`}>
              <option value={0}>Seleccionar rol...</option>
              {roles.map((rol) => (
                <option key={rol.idroles} value={rol.idroles}>
                  {rol.nombre}{rol.acceso_total && " (Acceso Total)"}
                </option>
              ))}
            </select>
            {errores.roles_idroles && (
              <p className="mt-1 text-sm text-red-600">{errores.roles_idroles}</p>
            )}
            {rolSeleccionado && !errores.roles_idroles && (
              <p className="mt-2 text-sm text-gray-600">{rolSeleccionado.descripcion}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button type="button" onClick={handleSiguiente}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Siguiente
          </button>
        </div>
      </div>

      {/* PASO 2: Privilegios */}
      <div className={paso === 2 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Seleccionar Privilegios</h3>

        {tieneAccesoTotal ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">✓ Este rol tiene acceso total al sistema</p>
            <p className="text-green-700 text-sm mt-1">No es necesario asignar privilegios individuales</p>
          </div>
        ) : esRolConBase && datos.privilegios && datos.privilegios.length > 0 && !datos.privilegios.some(
          p => privilegios.find(priv => priv.idprivilegios === p && !["Acceso Planta", "Crear/Editar/Aprobar/Rechazar Cotizaciones", "Crear/Editar/Eliminar Pedidos", "Editar Anticipo y Liquidacion"].includes(priv.privilegio))
        ) ? (
          // Rol con solo privilegios base — mostrar info y permitir agregar más
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 font-medium text-sm">
              ✓ Este rol incluye sus privilegios base automáticamente
            </p>
            <p className="text-blue-600 text-xs mt-1">
              Puedes agregar privilegios adicionales según sea necesario.
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4 text-sm">
              Selecciona los privilegios que tendrá este usuario
            </p>
            {datos.privilegios && datos.privilegios.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-800 text-sm">
                  Los privilegios fueron seleccionados basados en el rol elegido. Puedes modificarlos según sea necesario.
                </p>
              </div>
            )}
          </>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {privilegios.map((privilegio) => (
            <label key={privilegio.idprivilegios}
              className={`flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer
                ${tieneAccesoTotal ? "opacity-50 cursor-not-allowed" : ""}`}>
              <input type="checkbox"
                checked={datos.privilegios?.includes(privilegio.idprivilegios) || false}
                onChange={() => handlePrivilegioChange(privilegio.idprivilegios)}
                disabled={tieneAccesoTotal}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
              <span className="ml-3 text-gray-700">{privilegio.privilegio}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={handleAtras} disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Atrás
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading
              ? (esEdicion ? "Guardando..." : "Creando...")
              : (esEdicion ? "Guardar Cambios" : "Crear Usuario")}
          </button>
        </div>
      </div>
    </form>
  );
}