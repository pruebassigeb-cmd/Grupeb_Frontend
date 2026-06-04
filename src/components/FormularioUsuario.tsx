import { useState, useEffect, useRef } from "react";
import { getRoles, getPrivilegiosByRol } from "../services/rolesService";
import { getPrivilegios } from "../services/privilegiosService";
import type { Rol } from "../types/rol.types";
import type { Privilegio } from "../types/privilegio.types";
import type { CreateUsuarioRequest, UpdateUsuarioRequest, Usuario } from "../types/usuario.types";
import { showAlert } from './CustomAlert';
import api from '../services/api';
import { buscarCodigoPostal } from "../services/codigoPostalService";

const ROLES_CON_PRIVILEGIOS_BASE = ["Planta", "Ventas", "Diseño"];
const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MAX_FOTOS_INE = 2;
const ESTADOS_MX = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
  "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango",
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "México", "Michoacán",
  "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
  "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco",
  "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
];

type FormData = (CreateUsuarioRequest | UpdateUsuarioRequest) & {
  fotoFile?: File | null;
};

interface ArchivoINE {
  id_archivo: number;
  url: string;
  public_id: string;
  nombre: string;
}

interface FormularioUsuarioProps {
  onSubmit: (datos: CreateUsuarioRequest | UpdateUsuarioRequest) => Promise<{ idusuario: number } | void>;
  onCancel: () => void;
  usuarioEditar?: Usuario | null;
}

export default function FormularioUsuario({ onSubmit, onCancel, usuarioEditar }: FormularioUsuarioProps) {
  const [paso, setPaso]               = useState(1);
  const [roles, setRoles]             = useState<Rol[]>([]);
  const [privilegios, setPrivilegios] = useState<Privilegio[]>([]);
  const [loading, setLoading]         = useState(false);
  const [errores, setErrores]         = useState<Record<string, string>>({});
  const [buscandoCP, setBuscandoCP]   = useState(false);
  const [preview, setPreview]         = useState<string | null>(usuarioEditar?.foto_url || null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [opcionesColonia, setOpcionesColonia] = useState<{ colonia: string; poblacion: string; estado: string }[]>([]);
  const [errorCP, setErrorCP]         = useState<string | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const ineInputRef                   = useRef<HTMLInputElement>(null);
  const esEdicion                     = !!usuarioEditar;

  const [fotosINE, setFotosINE]                           = useState<ArchivoINE[]>([]);
  const [archivosINEPendientes, setArchivosINEPendientes] = useState<File[]>([]);
  const [ineAEliminar, setIneAEliminar]                   = useState<number[]>([]);
  const [subiendoINE, setSubiendoINE]                     = useState(false);

  const [datos, setDatos] = useState<FormData>({
    correo:        usuarioEditar?.correo        || "",
    nombre:        usuarioEditar?.nombre        || "",
    apellido:      usuarioEditar?.apellido      || "",
    telefono:      usuarioEditar?.telefono      || "",
    codigo:        "",
    roles_idroles: usuarioEditar?.roles_idroles || 0,
    privilegios:   usuarioEditar?.privilegios   || [],
    foto_id_archivo: usuarioEditar?.foto_id_archivo || undefined,
    rfc:           usuarioEditar?.rfc           || "",
    curp:          usuarioEditar?.curp          || "",
    calle:         usuarioEditar?.calle         || "",
    numero_ext:    usuarioEditar?.numero_ext    || "",
    numero_int:    usuarioEditar?.numero_int    || "",
    colonia:       usuarioEditar?.colonia       || "",
    codigo_postal: usuarioEditar?.codigo_postal || "",
    municipio:     usuarioEditar?.municipio     || "",
    estado:        usuarioEditar?.estado        || "",
    fecha_nacimiento: usuarioEditar?.fecha_nacimiento
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

  useEffect(() => {
    if (!esEdicion || !usuarioEditar?.idusuario) return;
    (async () => {
      try {
        const res = await api.get(`/usuarios/${usuarioEditar.idusuario}/ine`);
        setFotosINE(res.data);
      } catch {
        // sin fotos aún
      }
    })();
  }, [esEdicion, usuarioEditar?.idusuario]);

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

  const handleCodigoPostalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 5);
    set("codigo_postal", value);
    setErrorCP(null);
    setOpcionesColonia([]);
    if (value.length === 5) {
      setBuscandoCP(true);
      try {
        const opciones = await buscarCodigoPostal(value);
        if (opciones && opciones.length > 0) {
          setDatos(prev => ({
            ...prev,
            municipio: opciones[0].poblacion || prev.municipio,
            estado:    opciones[0].estado    || prev.estado,
            colonia:   "",
          }));
          setOpcionesColonia(opciones);
        } else {
          setErrorCP("CP no encontrado — captura colonia, municipio y estado manualmente");
        }
      } catch {
        setErrorCP("CP no encontrado — captura colonia, municipio y estado manualmente");
      } finally {
        setBuscandoCP(false);
      }
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showAlert("La foto no debe superar 10 MB"); return; }
    setPreview(URL.createObjectURL(file));
    setDatos(prev => ({ ...prev, fotoFile: file }));
  };

  const handleEliminarFoto = () => {
    setPreview(null);
    setDatos(prev => ({ ...prev, fotoFile: null, foto_id_archivo: null as any }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── usuario_id para asociar la foto al empleado ────────────────────────────
  const subirFotoAArchivos = async (file: File, idusuario?: number): Promise<number> => {
    const formData = new FormData();
    formData.append("archivo",   file);
    formData.append("carpeta",   "usuarios");
    formData.append("tipo",      "imagen");
    formData.append("categoria", "otro");
    if (idusuario) formData.append("usuario_id", String(idusuario));
    const res = await api.post("/archivos/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.id_archivo;
  };

  const handleINEChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const totalActual  = fotosINE.length + archivosINEPendientes.length;
    const slotsLibres  = MAX_FOTOS_INE - totalActual;
    if (slotsLibres <= 0) {
      showAlert(`Solo se permiten ${MAX_FOTOS_INE} fotos de INE por usuario`);
      if (ineInputRef.current) ineInputRef.current.value = "";
      return;
    }
    const todosLosArchivos = Array.from(e.target.files);
    const candidatos       = todosLosArchivos.slice(0, slotsLibres);
    const nuevos           = candidatos.filter(f => f.size <= 10 * 1024 * 1024);
    if (nuevos.length < candidatos.length)
      showAlert("Algunos archivos superan 10 MB y no se agregaron");
    if (candidatos.length < todosLosArchivos.length)
      showAlert(`Solo se pueden agregar ${slotsLibres} foto(s) más (límite: ${MAX_FOTOS_INE})`);
    if (nuevos.length > 0) setArchivosINEPendientes(prev => [...prev, ...nuevos]);
    if (ineInputRef.current) ineInputRef.current.value = "";
  };

  const handleEliminarINEPendiente = (idx: number) => {
    setArchivosINEPendientes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEliminarINESubido = (id_archivo: number) => {
    setIneAEliminar(prev => [...prev, id_archivo]);
    setFotosINE(prev => prev.filter(f => f.id_archivo !== id_archivo));
  };

  // ── usuario_id para asociar las INE al empleado ────────────────────────────
const subirFotosINE = async (idusuario: number) => {

  for (const file of archivosINEPendientes) {
    const formData = new FormData();
    formData.append("archivo",    file);
    formData.append("carpeta",    "usuarios-ine");
    formData.append("tipo",       "imagen");
    formData.append("categoria",  "otro");
    formData.append("usuario_id", String(idusuario));
    console.log("📤 Subiendo archivo:", file.name, "| usuario_id:", idusuario);
    try {
      const res = await api.post("/archivos/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("✅ INE subida:", res.data);
    } catch (err: any) {
      console.error("❌ Error subiendo INE:", err.response?.data || err.message);
    }
  }
};

  const eliminarFotosINE = async () => {
    for (const id of ineAEliminar) {
      try {
        await api.delete(`/archivos/${id}`);
      } catch {
        console.error("No se pudo eliminar archivo INE:", id);
      }
    }
  };

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
    if (datos.telefono?.trim() && datos.telefono.replace(/\D/g, "").length !== 10)
      e.telefono = "El teléfono debe tener 10 dígitos";
    if (!esEdicion) {
      if (!datos.codigo?.trim()) e.codigo = "El código es requerido";
else if (!/^\d{4,5}$/.test(datos.codigo)) e.codigo = "El código debe tener entre 4 y 5 dígitos";
   } else if (datos.codigo?.trim() && !/^\d{4,5}$/.test(datos.codigo)) {
  e.codigo = "El código debe tener entre 4 y 5 dígitos";
    }
    if (!datos.roles_idroles || datos.roles_idroles === 0)
      e.roles_idroles = "Debe seleccionar un rol";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rolSeleccionado = roles.find(r => r.idroles === datos.roles_idroles);
    const rolNombre       = rolSeleccionado?.nombre ?? "";
    const tienePrivBase   = ROLES_CON_PRIVILEGIOS_BASE.includes(rolNombre);
    if (
      !rolSeleccionado?.acceso_total &&
      !tienePrivBase &&
      (!datos.privilegios || datos.privilegios.length === 0)
    ) {
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
          foto_id_archivo = await subirFotoAArchivos(datos.fotoFile, usuarioEditar?.idusuario);
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

      const opcionales = [
        "rfc", "curp",
        "calle", "numero_ext", "numero_int", "colonia",
        "codigo_postal", "municipio", "estado",
        "fecha_nacimiento", "nss", "tipo_sangre",
        "alergias", "enfermedades", "medicamentos",
        "emergencia_nombre", "emergencia_parentesco", "emergencia_telefono",
      ];
      for (const campo of opcionales) {
        if (datosFinales[campo] === "") datosFinales[campo] = null;
      }
      if (datosFinales.foto_id_archivo === undefined && !datos.fotoFile)
        delete datosFinales.foto_id_archivo;

      const resultado = await onSubmit(datosFinales);

      const uid: number | undefined =
        usuarioEditar?.idusuario ??
        (resultado as any)?.idusuario ??
        (resultado as any)?.usuario?.idusuario ??
        (resultado as any)?.usuario?.id;



      if (!uid) {
        console.warn("No se obtuvo idusuario para subir fotos INE");
        return;
      }

      // Eliminar primero, luego subir
      if (ineAEliminar.length > 0) {
        setSubiendoINE(true);
        try { await eliminarFotosINE(); } finally { setSubiendoINE(false); }
      }

      if (archivosINEPendientes.length > 0) {
        setSubiendoINE(true);
        try { await subirFotosINE(uid); } finally { setSubiendoINE(false); }
      }

    } catch (error: any) {
      console.error("Error al guardar usuario:", error);
      if (error.response?.data?.detalles)
        showAlert(`Errores de validación:\n${error.response.data.detalles.join("\n")}`);
    } finally {
      setLoading(false);
    }
  };

  const rolSeleccionado  = roles.find(r => r.idroles === datos.roles_idroles);
  const tieneAccesoTotal = rolSeleccionado?.acceso_total || false;
  const rolNombre        = rolSeleccionado?.nombre ?? "";
  const esRolConBase     = ROLES_CON_PRIVILEGIOS_BASE.includes(rolNombre);
  const totalINE         = fotosINE.length + archivosINEPendientes.length;

  const input = (campo?: string) =>
    `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
     text-gray-900 bg-white placeholder-gray-400
     ${campo && errores[campo] ? "border-red-500" : "border-gray-300"}`;
  const label        = "block text-sm font-medium text-gray-700 mb-1";
  const sectionTitle = "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3";
  const pasos        = ["Datos básicos", "Privilegios", "Domicilio", "Ficha médica"];

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
                    ${paso > n ? "bg-green-600 text-white" : paso === n ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
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

      {/* ══ PASO 1 ══════════════════════════════════════════════════════════ */}
      <div className={paso === 1 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {esEdicion ? "Editar Usuario" : "Datos del Usuario"}
        </h3>
        <div className="space-y-4">

          <div>
            <label className={label}>Correo Electrónico *</label>
            <input type="email" name="correo" value={datos.correo}
              onChange={handleInputChange} className={input("correo")} placeholder="usuario@grupoeb.com" />
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
                className={input("codigo")} placeholder={esEdicion ? "Dejar vacío para no cambiar" : "12345"} />
              {errores.codigo && <p className="mt-1 text-sm text-red-600">{errores.codigo}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>RFC</label>
              <input type="text" name="rfc" value={datos.rfc || ""}
                onChange={handleInputChange} maxLength={13} className={input()} placeholder="ABCD901231XXX"
                onInput={e => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase(); }} />
            </div>
            <div>
              <label className={label}>CURP</label>
              <input type="text" name="curp" value={datos.curp || ""}
                onChange={handleInputChange} maxLength={18} className={input()} placeholder="ABCD901231HJCXXX01"
                onInput={e => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase(); }} />
            </div>
          </div>

          {/* Foto perfil + INE */}
          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className={label}>Foto de Perfil</label>
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                    {preview
                      ? <img src={preview} alt="Foto" className="w-full h-full object-cover" />
                      : <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    }
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100">
                      {preview ? "Cambiar" : "Subir foto"}
                    </button>
                    {preview && (
                      <button type="button" onClick={handleEliminarFoto}
                        className="px-3 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400">JPG, PNG · Máx. 10 MB</p>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={handleFotoChange} className="hidden" />
              </div>
            </div>

            <div>
              <label className={label}>
                Foto(s) INE
                <span className={`ml-2 text-xs font-normal ${totalINE >= MAX_FOTOS_INE ? "text-amber-600" : "text-gray-400"}`}>
                  ({totalINE}/{MAX_FOTOS_INE})
                </span>
              </label>
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-3 min-h-[96px]">
                {(fotosINE.length > 0 || archivosINEPendientes.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {fotosINE.map(foto => (
                      <div key={foto.id_archivo} className="relative w-16 h-16 group flex-shrink-0">
                        <img src={foto.url} alt="INE"
                          className="w-full h-full object-cover rounded-lg border border-gray-200" />
                        <button type="button" onClick={() => handleEliminarINESubido(foto.id_archivo)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs
                            flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                          ✕
                        </button>
                      </div>
                    ))}
                    {archivosINEPendientes.map((file, idx) => (
                      <div key={idx} className="relative w-16 h-16 group flex-shrink-0">
                        <img src={URL.createObjectURL(file)} alt="INE nuevo"
                          className="w-full h-full object-cover rounded-lg border-2 border-blue-400" />
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-500/70 rounded-b-lg flex items-center justify-center py-0.5">
                          <span className="text-white text-[9px] font-medium">Nueva</span>
                        </div>
                        <button type="button" onClick={() => handleEliminarINEPendiente(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs
                            flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {totalINE < MAX_FOTOS_INE ? (
                    <button type="button" onClick={() => ineInputRef.current?.click()}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100">
                      {totalINE > 0 ? "Agregar más" : "Subir foto(s) INE"}
                    </button>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">
                      Límite de {MAX_FOTOS_INE} fotos alcanzado
                    </span>
                  )}
                  <p className="text-xs text-gray-400">JPG, PNG · Máx. 10 MB c/u</p>
                </div>
                <input ref={ineInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  multiple onChange={handleINEChange} className="hidden" />
              </div>
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

      {/* ══ PASO 2 — Privilegios ════════════════════════════════════════════ */}
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
                disabled={tieneAccesoTotal} className="w-4 h-4 text-blue-600 rounded" />
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

      {/* ══ PASO 3 — Domicilio ══════════════════════════════════════════════ */}
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
                className={`${input()} ${errorCP ? "border-orange-300" : ""}`} placeholder="44100" />
              {errorCP && <p className="mt-1 text-xs text-orange-600">{errorCP}</p>}
            </div>
            <div className="col-span-4">
              <label className={label}>Colonia</label>
              {opcionesColonia.length > 0 ? (
                <select name="colonia" value={datos.colonia || ""}
                  onChange={e => {
                    const sel = opcionesColonia.find(o => o.colonia === e.target.value);
                    setDatos(prev => ({
                      ...prev,
                      colonia:   e.target.value,
                      municipio: sel?.poblacion || prev.municipio,
                      estado:    sel?.estado    || prev.estado,
                    }));
                  }} className={input()}>
                  <option value="">Selecciona colonia...</option>
                  {opcionesColonia.map((o, i) => (
                    <option key={`${o.colonia}-${i}`} value={o.colonia}>{o.colonia}</option>
                  ))}
                </select>
              ) : (
                <input type="text" name="colonia" value={datos.colonia || ""}
                  onChange={handleInputChange} className={input()} placeholder="Centro" />
              )}
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

      {/* ══ PASO 4 — Ficha Médica ═══════════════════════════════════════════ */}
      <div className={paso === 4 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Ficha Médica</h3>
        <p className="text-sm text-gray-500 mb-6">Todos los campos son opcionales</p>
        <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-1">
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
          <button type="submit" disabled={loading || subiendoFoto || subiendoINE}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {subiendoINE    ? "Subiendo documentos..."
             : subiendoFoto ? "Subiendo foto..."
             : loading      ? (esEdicion ? "Guardando..."    : "Creando...")
             :                (esEdicion ? "Guardar Cambios" : "Crear Usuario")}
          </button>
        </div>
      </div>

    </form>
  );
}