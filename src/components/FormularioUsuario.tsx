import { useState, useEffect, useRef } from "react";
import { getRoles, getPrivilegiosByRol } from "../services/rolesService";
import { getPrivilegios } from "../services/privilegiosService";
import type { Rol } from "../types/rol.types";
import type { Privilegio } from "../types/privilegio.types";
import type { CreateUsuarioRequest, UpdateUsuarioRequest, Usuario } from "../types/usuario.types";
import { showAlert } from './CustomAlert';
import api from '../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const ROLES_CON_PRIVILEGIOS_BASE = ["Planta", "Ventas", "Diseño"];

const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche",
  "Chiapas","Chihuahua","Ciudad de México","Coahuila","Colima","Durango",
  "Guanajuato","Guerrero","Hidalgo","Jalisco","México","Michoacán",
  "Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro",
  "Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco",
  "Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas",
];

// ─── Tipo interno ─────────────────────────────────────────────────────────────
type FormData = (CreateUsuarioRequest | UpdateUsuarioRequest) & { fotoFile?: File | null; fotoPreviewUrl?: string | null };

// ─── Props ────────────────────────────────────────────────────────────────────
interface FormularioUsuarioProps {
  onSubmit: (datos: CreateUsuarioRequest | UpdateUsuarioRequest) => void;
  onCancel: () => void;
  usuarioEditar?: Usuario | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const buscarCodigoPostal = async (cp: string): Promise<{ municipio: string; estado: string } | null> => {
  try {
    const res = await fetch(`https://api.zippopotam.us/mx/${cp}`);
    if (!res.ok) return null;
    const data = await res.json();
    const lugar = data.places?.[0];
    if (!lugar) return null;
    return {
      municipio: lugar["place name"] || "",
      estado:    lugar["state"]      || "",
    };
  } catch {
    return null;
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═════════════════════════════════════════════════════════════════════════════
export default function FormularioUsuario({ onSubmit, onCancel, usuarioEditar }: FormularioUsuarioProps) {
  const [paso, setPaso]           = useState(1);
  const [roles, setRoles]         = useState<Rol[]>([]);
  const [privilegios, setPrivilegios] = useState<Privilegio[]>([]);
  const [loading, setLoading]     = useState(false);
  const [errores, setErrores]     = useState<Record<string, string>>({});
  const [buscandoCP, setBuscandoCP] = useState(false);
  const [preview, setPreview]     = useState<string | null>(usuarioEditar?.foto_url || null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const esEdicion                 = !!usuarioEditar;

  const [datos, setDatos] = useState<FormData>({
    // Paso 1 - básicos
    correo:        usuarioEditar?.correo        || "",
    nombre:        usuarioEditar?.nombre        || "",
    apellido:      usuarioEditar?.apellido      || "",
    telefono:      usuarioEditar?.telefono      || "",
    codigo:        "",
    roles_idroles: usuarioEditar?.roles_idroles || 0,
    privilegios:   usuarioEditar?.privilegios   || [],
    // tabla usuarios
    foto_id_archivo: usuarioEditar?.foto_id_archivo || undefined,
    rfc:      usuarioEditar?.rfc      || "",
    curp:     usuarioEditar?.curp     || "",
    // tabla usuarios_direccion
    calle:         usuarioEditar?.calle         || "",
    numero_ext:    usuarioEditar?.numero_ext    || "",
    numero_int:    usuarioEditar?.numero_int    || "",
    colonia:       usuarioEditar?.colonia       || "",
    codigo_postal: usuarioEditar?.codigo_postal || "",
    municipio:     usuarioEditar?.municipio     || "",
    estado:        usuarioEditar?.estado        || "",
    // tabla usuarios_ficha_medica
    fecha_nacimiento:      usuarioEditar?.fecha_nacimiento
      ? usuarioEditar.fecha_nacimiento.split("T")[0] : "",
    nss:                   usuarioEditar?.nss                   || "",
    tipo_sangre:           usuarioEditar?.tipo_sangre           || "",
    alergias:              usuarioEditar?.alergias              || "",
    enfermedades:          usuarioEditar?.enfermedades          || "",
    medicamentos:          usuarioEditar?.medicamentos          || "",
    emergencia_nombre:     usuarioEditar?.emergencia_nombre     || "",
    emergencia_parentesco: usuarioEditar?.emergencia_parentesco || "",
    emergencia_telefono:   usuarioEditar?.emergencia_telefono   || "",
    fotoFile: null,
  });

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [rolesData, privilegiosData] = await Promise.all([getRoles(), getPrivilegios()]);
        setRoles(rolesData);
        setPrivilegios(privilegiosData);
      } catch {
        showAlert("Error al cargar roles y privilegios");
      }
    })();
  }, []);

  // ── Handlers generales ────────────────────────────────────────────────────
  const set = (campo: string, valor: any) => {
    setDatos(prev => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: "" }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    set(name, name === "roles_idroles" ? parseInt(value) : value);
  };

  // ── Código Postal autofill ────────────────────────────────────────────────
  const handleCodigoPostalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 5);
    set("codigo_postal", value);
    if (value.length === 5) {
      setBuscandoCP(true);
      const info = await buscarCodigoPostal(value);
      if (info) {
        setDatos(prev => ({
          ...prev,
          municipio: info.municipio || prev.municipio,
          estado:    info.estado    || prev.estado,
        }));
      }
      setBuscandoCP(false);
    }
  };

  // ── Foto ──────────────────────────────────────────────────────────────────
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showAlert("La foto no debe superar 10 MB"); return; }
    setPreview(URL.createObjectURL(file));
    setDatos(prev => ({ ...prev, fotoFile: file }));
  };

  const handleEliminarFoto = () => {
    setPreview(null);
    // null explícito para que el back sepa que debe borrar la foto
    setDatos(prev => ({ ...prev, fotoFile: null, foto_id_archivo: null as any }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const subirFotoAArchivos = async (file: File): Promise<number> => {
    const formData = new FormData();
    formData.append("archivo",   file);
    formData.append("carpeta",   "usuarios");
    formData.append("tipo",      "imagen");
    formData.append("categoria", "otro");
    const res = await api.post("/archivos/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.id_archivo;
  };

  // ── Rol y privilegios ────────────────────────────────────────────────────
  const cargarPrivilegiosDelRol = async (rolId: number) => {
    try {
      const privilegiosRol = await getPrivilegiosByRol(rolId);
      if (privilegiosRol.acceso_total) {
        setDatos(prev => ({ ...prev, roles_idroles: rolId, privilegios: [] }));
      } else {
        setDatos(prev => ({ ...prev, roles_idroles: rolId, privilegios: privilegiosRol.privilegios }));
      }
    } catch {
      setDatos(prev => ({ ...prev, roles_idroles: rolId }));
    }
  };

  const handleRolChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rolId = parseInt(e.target.value);
    if (rolId === 0) { setDatos(prev => ({ ...prev, roles_idroles: 0, privilegios: [] })); return; }
    if (errores.roles_idroles) setErrores(prev => ({ ...prev, roles_idroles: "" }));
    await cargarPrivilegiosDelRol(rolId);
  };

  const handlePrivilegioChange = (idPrivilegio: number) => {
    const actuales = datos.privilegios || [];
    setDatos(prev => ({
      ...prev,
      privilegios: actuales.includes(idPrivilegio)
        ? actuales.filter(p => p !== idPrivilegio)
        : [...actuales, idPrivilegio],
    }));
  };

  // ── Validación paso 1 ────────────────────────────────────────────────────
  const validarPaso1 = (): boolean => {
    const e: Record<string, string> = {};
    if (!datos.nombre?.trim() || datos.nombre.trim().length < 2)
      e.nombre = "El nombre debe tener al menos 2 caracteres";
    else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(datos.nombre))
      e.nombre = "El nombre solo puede contener letras";

    if (!datos.apellido?.trim() || datos.apellido.trim().length < 2)
      e.apellido = "El apellido debe tener al menos 2 caracteres";
    else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(datos.apellido))
      e.apellido = "El apellido solo puede contener letras";

    if (!datos.correo)
      e.correo = "El correo es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo))
      e.correo = "El formato del correo no es válido";

    if (datos.telefono?.trim()) {
      if (datos.telefono.replace(/\D/g, "").length !== 10)
        e.telefono = "El teléfono debe tener 10 dígitos";
    }

    if (!esEdicion) {
      if (!datos.codigo?.trim()) e.codigo = "El código es requerido";
      else if (!/^\d{5}$/.test(datos.codigo)) e.codigo = "El código debe tener exactamente 5 dígitos";
    } else if (datos.codigo?.trim() && !/^\d{5}$/.test(datos.codigo)) {
      e.codigo = "El código debe tener exactamente 5 dígitos";
    }

    if (!datos.roles_idroles || datos.roles_idroles === 0)
      e.roles_idroles = "Debe seleccionar un rol";

    setErrores(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rolSeleccionado = roles.find(r => r.idroles === datos.roles_idroles);
    const rolNombre       = rolSeleccionado?.nombre ?? "";
    const tienePrivBase   = ROLES_CON_PRIVILEGIOS_BASE.includes(rolNombre);

    if (!rolSeleccionado?.acceso_total && !tienePrivBase &&
        (!datos.privilegios || datos.privilegios.length === 0)) {
      showAlert("Debe seleccionar al menos un privilegio para usuarios sin acceso total");
      setPaso(2);
      return;
    }

    setLoading(true);
    try {
      let foto_id_archivo = datos.foto_id_archivo;
      if (datos.fotoFile) {
        setSubiendoFoto(true);
        try {
          foto_id_archivo = await subirFotoAArchivos(datos.fotoFile);
        } finally {
          setSubiendoFoto(false);
        }
      }

      const { fotoFile: _, ...resto } = datos;

      const datosFinales: any = {
        ...resto,
        foto_id_archivo,
        nombre:   datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        correo:   datos.correo.trim().toLowerCase(),
        telefono: datos.telefono ? datos.telefono.replace(/\D/g, "") : undefined,
      };

      if (esEdicion && (!datosFinales.codigo || datosFinales.codigo.trim() === ""))
        delete datosFinales.codigo;

      // Limpiar strings vacíos → null para los opcionales
      const opcionales = [
        "rfc","curp",
        "calle","numero_ext","numero_int","colonia","codigo_postal","municipio","estado",
        "fecha_nacimiento","nss","tipo_sangre","alergias","enfermedades","medicamentos",
        "emergencia_nombre","emergencia_parentesco","emergencia_telefono",
      ];
      for (const campo of opcionales) {
        if (datosFinales[campo] === "") datosFinales[campo] = null;
      }
      // Si foto_id_archivo es null, mantenerlo así (indica eliminación intencional)
      // Si es undefined y no hay archivo nuevo, no tocarlo
      if (datosFinales.foto_id_archivo === undefined && !datos.fotoFile) {
        delete datosFinales.foto_id_archivo;
      }

      await onSubmit(datosFinales);
    } catch (error: any) {
      console.error("Error al guardar usuario:", error);
      if (error.response?.data?.detalles)
        showAlert(`Errores de validación:\n${error.response.data.detalles.join("\n")}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Derivados ─────────────────────────────────────────────────────────────
  const rolSeleccionado  = roles.find(r => r.idroles === datos.roles_idroles);
  const tieneAccesoTotal = rolSeleccionado?.acceso_total || false;
  const rolNombre        = rolSeleccionado?.nombre ?? "";
  const esRolConBase     = ROLES_CON_PRIVILEGIOS_BASE.includes(rolNombre);

  // ─── Clases ────────────────────────────────────────────────────────────────
  const input = (campo?: string) =>
    `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
     text-gray-900 bg-white placeholder-gray-400
     ${campo && errores[campo] ? "border-red-500" : "border-gray-300"}`;
  const label = "block text-sm font-medium text-gray-700 mb-1";
  const sectionTitle = "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3";

  // ─── Indicador de pasos ────────────────────────────────────────────────────
  const pasos = ["Datos básicos", "Privilegios", "Domicilio", "Ficha médica"];

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <form onSubmit={handleSubmit}>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {pasos.map((nombre, i) => {
            const n = i + 1;
            return (
              <div key={n} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors
                    ${paso > n ? "bg-green-600 text-white"
                      : paso === n ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"}`}>
                    {paso > n ? "✓" : n}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${paso === n ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                    {nombre}
                  </span>
                </div>
                {i < pasos.length - 1 && (
                  <div className={`w-12 h-1 mb-4 mx-1 transition-colors ${paso > n ? "bg-blue-500" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PASO 1 — Datos básicos
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={paso === 1 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {esEdicion ? "Editar Usuario" : "Datos del Usuario"}
        </h3>

        <div className="space-y-4">
          <div>
            <label className={label}>Correo Electrónico *</label>
            <input type="email" name="correo" value={datos.correo}
              onChange={handleInputChange} className={input("correo")}
              placeholder="usuario@grupoeb.com" />
            {errores.correo && <p className="mt-1 text-sm text-red-600">{errores.correo}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Nombre *</label>
              <input type="text" name="nombre" value={datos.nombre}
                onChange={handleInputChange} className={input("nombre")} placeholder="Juan" />
              {errores.nombre && <p className="mt-1 text-sm text-red-600">{errores.nombre}</p>}
            </div>
            <div>
              <label className={label}>Apellido *</label>
              <input type="text" name="apellido" value={datos.apellido}
                onChange={handleInputChange} className={input("apellido")} placeholder="Pérez" />
              {errores.apellido && <p className="mt-1 text-sm text-red-600">{errores.apellido}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Teléfono</label>
              <input type="tel" name="telefono" value={datos.telefono}
                onChange={e => set("telefono", e.target.value.replace(/\D/g, ""))}
                maxLength={10} className={input("telefono")} placeholder="3312345678" />
              {errores.telefono && <p className="mt-1 text-sm text-red-600">{errores.telefono}</p>}
            </div>
            <div>
              <label className={label}>{esEdicion ? "Código (vacío = no cambiar)" : "Código (5 dígitos) *"}</label>
              <input type="text" name="codigo" value={datos.codigo} maxLength={5}
                onChange={e => set("codigo", e.target.value.replace(/\D/g, ""))}
                className={input("codigo")}
                placeholder={esEdicion ? "Dejar vacío para no cambiar" : "12345"} />
              {errores.codigo && <p className="mt-1 text-sm text-red-600">{errores.codigo}</p>}
            </div>
          </div>

          {/* RFC y CURP */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>RFC</label>
              <input type="text" name="rfc" value={datos.rfc || ""}
                onChange={handleInputChange} maxLength={13}
                className={input()} placeholder="ABCD901231XXX"
                onInput={e => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase(); }} />
            </div>
            <div>
              <label className={label}>CURP</label>
              <input type="text" name="curp" value={datos.curp || ""}
                onChange={handleInputChange} maxLength={18}
                className={input()} placeholder="ABCD901231HJCXXX01"
                onInput={e => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase(); }} />
            </div>
          </div>

          {/* Foto */}
          <div>
            <label className={label}>Foto</label>
            <div className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                {preview
                  ? <img src={preview} alt="Foto" className="w-full h-full object-cover" />
                  : <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                }
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100">
                  {preview ? "Cambiar" : "Subir foto"}
                </button>
                {preview && (
                  <button type="button" onClick={handleEliminarFoto}
                    className="px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">
                    Eliminar
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400">JPG, PNG · Máx. 2 MB</p>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                onChange={handleFotoChange} className="hidden" />
            </div>
          </div>

          <div>
            <label className={label}>Rol *</label>
            <select name="roles_idroles" value={datos.roles_idroles} onChange={handleRolChange}
              className={input("roles_idroles")}>
              <option value={0}>Seleccionar rol...</option>
              {roles.map(rol => (
                <option key={rol.idroles} value={rol.idroles}>
                  {rol.nombre}{rol.acceso_total && " (Acceso Total)"}
                </option>
              ))}
            </select>
            {errores.roles_idroles && <p className="mt-1 text-sm text-red-600">{errores.roles_idroles}</p>}
            {rolSeleccionado && !errores.roles_idroles && (
              <p className="mt-1 text-sm text-gray-500">{rolSeleccionado.descripcion}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button type="button" onClick={() => { if (validarPaso1()) setPaso(2); }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Siguiente</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PASO 2 — Privilegios
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={paso === 2 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Privilegios</h3>

        {tieneAccesoTotal ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800 font-medium">✓ Este rol tiene acceso total al sistema</p>
            <p className="text-green-700 text-sm mt-1">No es necesario asignar privilegios individuales</p>
          </div>
        ) : esRolConBase && datos.privilegios && datos.privilegios.length > 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 font-medium text-sm">✓ Este rol incluye sus privilegios base automáticamente</p>
            <p className="text-blue-600 text-xs mt-1">Puedes agregar privilegios adicionales.</p>
          </div>
        ) : (
          <p className="text-gray-600 mb-4 text-sm">Selecciona los privilegios que tendrá este usuario</p>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {privilegios.map(privilegio => (
            <label key={privilegio.idprivilegios}
              className={`flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer
                ${tieneAccesoTotal ? "opacity-50 cursor-not-allowed" : ""}`}>
              <input type="checkbox"
                checked={datos.privilegios?.includes(privilegio.idprivilegios) || false}
                onChange={() => handlePrivilegioChange(privilegio.idprivilegios)}
                disabled={tieneAccesoTotal}
                className="w-4 h-4 text-blue-600 rounded" />
              <span className="ml-3 text-sm text-gray-700">{privilegio.privilegio}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => setPaso(1)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Atrás</button>
          <button type="button" onClick={() => setPaso(3)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Siguiente</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PASO 3 — Domicilio
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={paso === 3 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Domicilio</h3>
        <p className="text-sm text-gray-500 mb-6">Todos los campos son opcionales</p>

        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <label className={label}>Calle</label>
              <input type="text" name="calle" value={datos.calle || ""}
                onChange={handleInputChange} className={input()} placeholder="Av. Revolución" />
            </div>
            <div className="col-span-1">
              <label className={label}>No. Ext</label>
              <input type="text" name="numero_ext" value={datos.numero_ext || ""}
                onChange={handleInputChange} className={input()} placeholder="123" />
            </div>
            <div className="col-span-1">
              <label className={label}>No. Int</label>
              <input type="text" name="numero_int" value={datos.numero_int || ""}
                onChange={handleInputChange} className={input()} placeholder="A" />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-2">
              <label className={label}>
                Código Postal
                {buscandoCP && <span className="ml-2 text-xs text-blue-500 animate-pulse">Buscando...</span>}
              </label>
              <input type="text" value={datos.codigo_postal || ""}
                onChange={handleCodigoPostalChange} maxLength={5}
                className={input()} placeholder="44100" />
            </div>
            <div className="col-span-4">
              <label className={label}>Colonia</label>
              <input type="text" name="colonia" value={datos.colonia || ""}
                onChange={handleInputChange} className={input()} placeholder="Centro" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Municipio / Población</label>
              <input type="text" name="municipio" value={datos.municipio || ""}
                onChange={handleInputChange} className={input()} placeholder="Guadalajara" />
            </div>
            <div>
              <label className={label}>Estado</label>
              <select name="estado" value={datos.estado || ""}
                onChange={handleInputChange} className={input()}>
                <option value="">Seleccionar...</option>
                {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => setPaso(2)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Atrás</button>
          <button type="button" onClick={() => setPaso(4)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Siguiente</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PASO 4 — Ficha Médica
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={paso === 4 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Ficha Médica</h3>
        <p className="text-sm text-gray-500 mb-6">Todos los campos son opcionales</p>

        <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-1">

          {/* Datos clínicos */}
          <section>
            <p className={sectionTitle}>Datos clínicos</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Fecha de Nacimiento</label>
                <input type="date" name="fecha_nacimiento" value={datos.fecha_nacimiento || ""}
                  onChange={handleInputChange} className={input()} />
              </div>
              <div>
                <label className={label}>Tipo de Sangre</label>
                <select name="tipo_sangre" value={datos.tipo_sangre || ""}
                  onChange={handleInputChange} className={input()}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_SANGRE.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className={label}>NSS (Núm. Seguro Social)</label>
                <input type="text" name="nss" value={datos.nss || ""}
                  onChange={e => set("nss", e.target.value.replace(/\D/g, "").slice(0, 11))}
                  maxLength={11} className={input()} placeholder="12345678901" />
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Padecimientos */}
          <section>
            <p className={sectionTitle}>Padecimientos</p>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={label}>Alergias</label>
                <textarea name="alergias" value={datos.alergias || ""}
                  onChange={handleInputChange} rows={2}
                  className={`${input()} resize-none`}
                  placeholder="Ej: Penicilina, mariscos, polvo..." />
              </div>
              <div>
                <label className={label}>Enfermedades / Condiciones médicas</label>
                <textarea name="enfermedades" value={datos.enfermedades || ""}
                  onChange={handleInputChange} rows={2}
                  className={`${input()} resize-none`}
                  placeholder="Ej: Diabetes tipo 2, hipertensión..." />
              </div>
              <div>
                <label className={label}>Medicamentos</label>
                <textarea name="medicamentos" value={datos.medicamentos || ""}
                  onChange={handleInputChange} rows={2}
                  className={`${input()} resize-none`}
                  placeholder="Ej: Metformina 500mg, Losartán 50mg..." />
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Contacto de emergencia */}
          <section>
            <p className={sectionTitle}>Contacto de Emergencia</p>
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-3">
                <label className={label}>Nombre</label>
                <input type="text" name="emergencia_nombre" value={datos.emergencia_nombre || ""}
                  onChange={handleInputChange} className={input()} placeholder="María García" />
              </div>
              <div className="col-span-3">
                <label className={label}>Parentesco</label>
                <input type="text" name="emergencia_parentesco" value={datos.emergencia_parentesco || ""}
                  onChange={handleInputChange} className={input()} placeholder="Madre, Esposo/a, Hermano/a..." />
              </div>
              <div className="col-span-3">
                <label className={label}>Teléfono</label>
                <input type="tel" name="emergencia_telefono" value={datos.emergencia_telefono || ""}
                  onChange={e => set("emergencia_telefono", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10} className={input()} placeholder="3312345678" />
              </div>
            </div>
          </section>

        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button type="button" onClick={() => setPaso(3)} disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Atrás</button>
          <button type="submit" disabled={loading || subiendoFoto}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {subiendoFoto
              ? "Subiendo foto..."
              : loading
                ? (esEdicion ? "Guardando..." : "Creando...")
                : (esEdicion ? "Guardar Cambios" : "Crear Usuario")}
          </button>
        </div>
      </div>

    </form>
  );
}