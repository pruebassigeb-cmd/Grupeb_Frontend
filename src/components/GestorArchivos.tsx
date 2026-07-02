import { useState, useEffect, useRef } from "react";
import type { Archivo, CarpetaFrontend, Estadisticas, SubcarpetaPDF, SubcarpetaSuaje, SubcarpetaCatalogo } from "../services/archivos.service";
import { subirArchivo, listarArchivos, eliminarArchivo, CARPETAS_LABELS, obtenerEstadisticas, SUBCARPETAS_PDF, SUBCARPETAS_SUAJE, SUBCARPETAS_CATALOGO } from "../services/archivos.service";
import { verificarCodigo } from "../services/backup.service";
import Dashboard from "../layouts/Sidebar";
import { showAlert } from './CustomAlert';
import { showConfirm } from './CustomConfirm';
import { useAuth } from "../context/AuthContext";

type Vista = "carpetas" | "subcarpetas" | "archivos";
type OrdenTipo = "fecha_desc" | "fecha_asc" | "nombre_asc" | "nombre_desc" | "tamano_asc" | "tamano_desc" | "tipo_asc";
type AgrupaTipo = "ninguno" | "semana" | "mes" | "año";

const CARPETAS_OPTIONS: { value: CarpetaFrontend; label: string }[] = [
  { value: "disenos", label: "Diseños" },
  { value: "pdfs", label: "PDFs" },
  { value: "fotos-envios", label: "Fotos de Envíos" },
  { value: "backups", label: "Backups BD" },
  { value: "suaje", label: "Suajes" }, 
  { value: "catalogoproductos", label: "Catálogo de Productos" },
];

const CARPETAS_PROTEGIDAS: CarpetaFrontend[] = ["backups"];

// Carpetas que tienen subcarpetas y deben mostrar la vista intermedia
const CARPETAS_CON_SUBCARPETAS: CarpetaFrontend[] = ["pdfs", "suaje", "catalogoproductos"];
const ORDEN_OPTIONS: { value: OrdenTipo; label: string }[] = [
  { value: "fecha_desc", label: "Fecha: más reciente" },
  { value: "fecha_asc", label: "Fecha: más antiguo" },
  { value: "nombre_asc", label: "Nombre: A → Z" },
  { value: "nombre_desc", label: "Nombre: Z → A" },
  { value: "tamano_desc", label: "Tamaño: mayor" },
  { value: "tamano_asc", label: "Tamaño: menor" },
  { value: "tipo_asc", label: "Tipo de archivo" },
];

const AGRUPA_OPTIONS: { value: AgrupaTipo; label: string }[] = [
  { value: "ninguno", label: "Sin agrupar" },
  { value: "semana", label: "Por semana" },
  { value: "mes", label: "Por mes" },
  { value: "año", label: "Por año" },
];

// ── Modal código carpeta protegida ──────────────────────────
interface ModalCodigoProps {
  onConfirmar: (codigo: string) => Promise<void>;
  onCerrar: () => void;
}

function ModalCodigoCarpeta({ onConfirmar, onCerrar }: ModalCodigoProps) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  const handleSubmit = async () => {
    if (!codigo.trim()) { setError("Ingresa tu código"); return; }
    setCargando(true);
    setError("");
    try {
      await onConfirmar(codigo);
    } catch {
      setError("Código incorrecto");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Carpeta protegida</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ingresa tu código de administrador para acceder a <strong>Backups BD</strong></p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">Código de administrador</label>
            <div className="relative">
              <input
                type={mostrar ? "text" : "password"}
                value={codigo}
                onChange={e => { setCodigo(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                autoFocus
                className={`w-full px-4 py-2.5 pr-10 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${error ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-amber-300"
                  }`}
              />
              <button type="button" onClick={() => setMostrar(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {mostrar ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCerrar} disabled={cargando}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={cargando || !codigo.trim()}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {cargando ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Ingresar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────
const ordenarArchivos = (archivos: Archivo[], orden: OrdenTipo): Archivo[] => {
  return [...archivos].sort((a, b) => {
    switch (orden) {
      case "fecha_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "fecha_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "nombre_asc": return a.nombre.localeCompare(b.nombre, "es");
      case "nombre_desc": return b.nombre.localeCompare(a.nombre, "es");
      case "tamano_desc": return b.tamano_kb - a.tamano_kb;
      case "tamano_asc": return a.tamano_kb - b.tamano_kb;
      case "tipo_asc": return a.tipo.localeCompare(b.tipo);
      default: return 0;
    }
  });
};

const getClaveGrupo = (fecha: string, agrupacion: AgrupaTipo): string => {
  const d = new Date(fecha);
  if (agrupacion === "año") return `${d.getFullYear()}`;
  if (agrupacion === "mes") return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  if (agrupacion === "semana") {
    const lunes = new Date(d);
    const dia = d.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    lunes.setDate(d.getDate() + diff);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    const fmtCorto = (f: Date) => f.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
    return `Semana del ${fmtCorto(lunes)} al ${fmtCorto(domingo)}, ${lunes.getFullYear()}`;
  }
  return "Todos";
};

const agruparArchivos = (archivos: Archivo[], agrupacion: AgrupaTipo): { clave: string; items: Archivo[] }[] => {
  if (agrupacion === "ninguno") return [{ clave: "", items: archivos }];
  const mapa = new Map<string, Archivo[]>();
  for (const archivo of archivos) {
    const clave = getClaveGrupo(archivo.created_at, agrupacion);
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave)!.push(archivo);
  }
  return Array.from(mapa.entries()).map(([clave, items]) => ({ clave, items }));
};

// Devuelve las subcarpetas según la carpeta activa
const getSubcarpetasDeCarpeta = (carpeta: CarpetaFrontend) => {
  if (carpeta === "pdfs") return SUBCARPETAS_PDF;
  if (carpeta === "suaje") return SUBCARPETAS_SUAJE;
  if (carpeta === "catalogoproductos") return SUBCARPETAS_CATALOGO;
  return [];
};

// ── Componente principal ─────────────────────────────────────
export default function GestorArchivos() {
  const { user } = useAuth();

  if (!user?.acceso_total) {
    return (
      <Dashboard>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800">Acceso restringido</p>
            <p className="text-sm text-gray-500 mt-1">Solo administradores pueden acceder a esta sección.</p>
          </div>
        </div>
      </Dashboard>
    );
  }

  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState(false);
  const [vista, setVista] = useState<Vista>("carpetas");
  const [carpetaActiva, setCarpetaActiva] = useState<CarpetaFrontend | null>(null);
const [subcarpetaActiva, setSubcarpetaActiva] = useState<SubcarpetaPDF | SubcarpetaSuaje | SubcarpetaCatalogo | null>(null);
  const [carpetaSeleccion, setCarpetaSeleccion] = useState<CarpetaFrontend>("disenos");
  const [subcarpetaSeleccion, setSubcarpetaSeleccion] = useState<SubcarpetaPDF | SubcarpetaSuaje | SubcarpetaCatalogo | null>(null);
  const [modalSubir, setModalSubir] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [confirmTexto, setConfirmTexto] = useState("");
  const [archivosModal, setArchivosModal] = useState<File[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [orden, setOrden] = useState<OrdenTipo>("fecha_desc");
  const [agrupacion, setAgrupacion] = useState<AgrupaTipo>("ninguno");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarAgrupa, setMostrarAgrupa] = useState(false);
  const [gruposColapsados, setGruposColapsados] = useState<Set<string>>(new Set());
  const [carpetasDesbloqueadas, setCarpetasDesbloqueadas] = useState<Set<CarpetaFrontend>>(new Set());
  const [modalCodigoCarpeta, setModalCodigoCarpeta] = useState<CarpetaFrontend | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const filtrosRef = useRef<HTMLDivElement>(null);
  const grupaRef = useRef<HTMLDivElement>(null);

  const cargarArchivos = async () => {
    try {
      setCargando(true);
      const [data, stats] = await Promise.all([listarArchivos(), obtenerEstadisticas()]);
      setArchivos(data);
      setEstadisticas(stats);
    } catch (error) {
      console.error("Error al cargar archivos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarArchivos(); }, []);

  useEffect(() => {
    const handleClickFuera = (e: MouseEvent) => {
      if (filtrosRef.current && !filtrosRef.current.contains(e.target as Node)) setMostrarFiltros(false);
      if (grupaRef.current && !grupaRef.current.contains(e.target as Node)) setMostrarAgrupa(false);
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  useEffect(() => {
    setSeleccionados(new Set());
    setModoSeleccion(false);
    setGruposColapsados(new Set());
  }, [carpetaActiva, subcarpetaActiva, vista]);

  useEffect(() => { setGruposColapsados(new Set()); }, [agrupacion]);

  const toggleGrupo = (clave: string) => {
    setGruposColapsados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(clave)) nuevo.delete(clave);
      else nuevo.add(clave);
      return nuevo;
    });
  };

  const abrirCarpeta = (carpeta: CarpetaFrontend) => {
    if (CARPETAS_PROTEGIDAS.includes(carpeta) && !carpetasDesbloqueadas.has(carpeta)) {
      setModalCodigoCarpeta(carpeta);
      return;
    }
    _abrirCarpetaDirecta(carpeta);
  };

  const _abrirCarpetaDirecta = (carpeta: CarpetaFrontend) => {
    setCarpetaActiva(carpeta);
    setSubcarpetaActiva(null);
    setBusqueda("");
    setOrden("fecha_desc");
    setAgrupacion("ninguno");
    if (CARPETAS_CON_SUBCARPETAS.includes(carpeta)) {
      setVista("subcarpetas");
    } else {
      setVista("archivos");
    }
  };

  const abrirSubcarpeta = (subcarpeta: SubcarpetaPDF | SubcarpetaSuaje) => {
    setSubcarpetaActiva(subcarpeta);
    setVista("archivos");
    setBusqueda("");
    setOrden("fecha_desc");
    setAgrupacion("ninguno");
  };

  const volverACarpetas = () => {
    setCarpetaActiva(null);
    setSubcarpetaActiva(null);
    setVista("carpetas");
    setBusqueda("");
    setSeleccionados(new Set());
    setModoSeleccion(false);
  };

  const volverASubcarpetas = () => {
    setSubcarpetaActiva(null);
    setVista("subcarpetas");
    setBusqueda("");
    setSeleccionados(new Set());
    setModoSeleccion(false);
  };

  const handleVerificarCodigoCarpeta = async (codigo: string) => {
    if (!modalCodigoCarpeta) return;
    await verificarCodigo(codigo);
    setCarpetasDesbloqueadas(prev => new Set(prev).add(modalCodigoCarpeta));
    setModalCodigoCarpeta(null);
    _abrirCarpetaDirecta(modalCodigoCarpeta);
  };

  const handleSeleccionArchivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setArchivosModal(Array.from(e.target.files));
    setModalSubir(true);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleConfirmarSubida = async () => {
    setSubiendo(true);
    try {
      for (const file of archivosModal) {
        await subirArchivo(file, carpetaSeleccion, subcarpetaSeleccion ?? undefined);
      }
      await cargarArchivos();
      setModalSubir(false);
      setArchivosModal([]);
      setSubcarpetaSeleccion(null);
    } catch (error) {
      console.error("Error al subir:", error);
      showAlert("Error al subir archivo");
    } finally {
      setSubiendo(false);
    }
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  };

  const toggleSeleccionTodos = () => {
    if (seleccionados.size === archivosFiltradosYOrdenados.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(archivosFiltradosYOrdenados.map(a => a.id_archivo)));
    }
  };

  const cancelarSeleccion = () => {
    setSeleccionados(new Set());
    setModoSeleccion(false);
  };

  const descargarSeleccionados = () => {
    archivos.filter(a => seleccionados.has(a.id_archivo)).forEach(archivo => {
      const link = document.createElement("a");
      link.href = archivo.url; link.target = "_blank"; link.download = archivo.nombre;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    });
  };

  const handleConfirmarEliminacion = async () => {
    if (confirmTexto !== "eliminar") return;
    setEliminando(true);
    try {
      for (const id of Array.from(seleccionados)) await eliminarArchivo(id);
      setArchivos(prev => prev.filter(a => !seleccionados.has(a.id_archivo)));
      const stats = await obtenerEstadisticas();
      setEstadisticas(stats);
      setSeleccionados(new Set());
      setModoSeleccion(false);
      setModalEliminar(false);
      setConfirmTexto("");
    } catch (error) {
      console.error("Error al eliminar:", error);
      showAlert("Error al eliminar archivos");
    } finally {
      setEliminando(false);
    }
  };

  const handleEliminarUno = async (id: string, nombre: string) => {
    if (!await showConfirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await eliminarArchivo(id);
      setArchivos(prev => prev.filter(a => a.id_archivo !== id));
      const stats = await obtenerEstadisticas();
      setEstadisticas(stats);
    } catch (error) {
      console.error("Error al eliminar:", error);
      showAlert("Error al eliminar archivo");
    }
  };

  // Filtrar archivos según carpeta y subcarpeta activa
  const archivosDeCarpeta = archivos.filter(a => {
    if (a.carpeta !== carpetaActiva) return false;
    if (subcarpetaActiva) return a.subcarpeta === subcarpetaActiva;
    if (!CARPETAS_CON_SUBCARPETAS.includes(carpetaActiva!)) return true;
    return false;
  });

  const archivosFiltradosYOrdenados = ordenarArchivos(
    archivosDeCarpeta.filter(a => a.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    orden
  );
  const grupos = agruparArchivos(archivosFiltradosYOrdenados, agrupacion);

  const contarPorCarpeta = (carpeta: CarpetaFrontend) => archivos.filter(a => a.carpeta === carpeta).length;

  const contarPorSubcarpeta = (subcarpeta: string) =>
    archivos.filter(a => a.carpeta === carpetaActiva && a.subcarpeta === subcarpeta).length;

  const formatFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  const formatTamano = (kb: number) => kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
  const getExtension = (nombre: string) => nombre.split(".").pop()?.toUpperCase() ?? "FILE";

  const ordenActualLabel = ORDEN_OPTIONS.find(o => o.value === orden)?.label ?? "Ordenar";
  const agrupaActualLabel = AGRUPA_OPTIONS.find(o => o.value === agrupacion)?.label ?? "Agrupar";

  // Label de subcarpeta activa (busca en PDF y Suaje)
const subcarpetaLabel = carpetaActiva === "suaje"
    ? SUBCARPETAS_SUAJE.find(s => s.value === subcarpetaActiva)?.label ?? ""
    : carpetaActiva === "catalogoproductos"
    ? SUBCARPETAS_CATALOGO.find(s => s.value === subcarpetaActiva)?.label ?? ""
    : SUBCARPETAS_PDF.find(s => s.value === subcarpetaActiva)?.label ?? "";

  // Subcarpetas para el modal de subida según carpeta seleccionada
  const subcarpetasDelModal = getSubcarpetasDeCarpeta(carpetaSeleccion);
  const necesitaSubcarpeta = CARPETAS_CON_SUBCARPETAS.includes(carpetaSeleccion);

  const todosSeleccionados =
    archivosFiltradosYOrdenados.length > 0 &&
    seleccionados.size === archivosFiltradosYOrdenados.length;

  const renderPreview = (archivo: Archivo) => {
    if (archivo.tipo === "image") {
      return <img src={archivo.url} alt={archivo.nombre} className="w-full h-full object-cover"
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />;
    }
    if (archivo.tipo === "pdf") {
      return (
        <div className="flex flex-col items-center gap-1">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-bold text-red-500">PDF</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-1">
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs font-bold text-gray-500">{getExtension(archivo.nombre)}</span>
      </div>
    );
  };

  const renderIconoCarpeta = (carpeta: CarpetaFrontend) => {
const colores: Record<CarpetaFrontend, string> = {
      "disenos": "text-blue-400",
      "pdfs": "text-red-400",
      "fotos-envios": "text-green-400",
      "backups": "text-gray-400",
      "suaje": "text-purple-400",
      "catalogoproductos": "text-amber-400",
    };
    return (
      <svg className={`w-16 h-16 ${colores[carpeta]}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
      </svg>
    );
  };

  const renderIconoSubcarpeta = (carpeta: CarpetaFrontend | null) => {
    const color = carpeta === "suaje" ? "text-purple-300" : "text-red-300";
    return (
      <svg className={`w-12 h-12 ${color}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
      </svg>
    );
  };

  const renderGrillaArchivos = (items: Archivo[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map(archivo => {
        const estaSeleccionado = seleccionados.has(archivo.id_archivo);
        return (
          <div key={archivo.id_archivo}
            className={`group relative bg-white border-2 rounded-xl overflow-hidden transition-all ${estaSeleccionado ? "border-blue-500 shadow-md" : "border-gray-200 hover:shadow-md"
              }`}>
            {modoSeleccion && (
              <div className="absolute top-2 left-2 z-10" onClick={() => toggleSeleccion(archivo.id_archivo)}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${estaSeleccionado ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300 hover:border-blue-400"
                  }`}>
                  {estaSeleccionado && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            )}
            <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => modoSeleccion && toggleSeleccion(archivo.id_archivo)}>
              {renderPreview(archivo)}
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-700 font-medium truncate" title={archivo.nombre}>{archivo.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatTamano(archivo.tamano_kb)} · {formatFecha(archivo.created_at)}</p>
            </div>
            {!modoSeleccion && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a href={archivo.url} target="_blank" rel="noopener noreferrer"
                  className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors" title="Ver / Descargar">
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                <button onClick={() => handleEliminarUno(archivo.id_archivo, archivo.nombre)}
                  className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors" title="Eliminar">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Breadcrumb dinámico ──────────────────────────────────────
  const renderBreadcrumb = () => {
    if (vista === "carpetas") return null;
    return (
      <div className="flex items-center gap-2">
        <button onClick={volverACarpetas}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Archivos</span>
        </button>
        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {vista === "archivos" && subcarpetaActiva ? (
          <>
            <button onClick={volverASubcarpetas}
              className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
              {CARPETAS_LABELS[carpetaActiva!]}
            </button>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </>
        ) : null}
      </div>
    );
  };

  const getTituloActual = () => {
    if (vista === "carpetas") return "Archivos";
    if (vista === "subcarpetas") return CARPETAS_LABELS[carpetaActiva!];
    if (subcarpetaActiva) return subcarpetaLabel;
    return CARPETAS_LABELS[carpetaActiva!];
  };

  const getSubtituloActual = () => {
    if (vista === "carpetas") return "Selecciona una carpeta para ver su contenido";
    if (vista === "subcarpetas") return "Selecciona una subcarpeta";
    return `${archivosFiltradosYOrdenados.length} de ${archivosDeCarpeta.length} archivo${archivosDeCarpeta.length !== 1 ? "s" : ""}`;
  };

  // Número de subcarpetas para mostrar en el badge de la carpeta
const getNumSubcarpetas = (carpeta: CarpetaFrontend) => {
    if (carpeta === "pdfs") return SUBCARPETAS_PDF.length;
    if (carpeta === "suaje") return SUBCARPETAS_SUAJE.length;
    if (carpeta === "catalogoproductos") return SUBCARPETAS_CATALOGO.length;
    return 0;
  };

  return (
    <Dashboard>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {renderBreadcrumb()}
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {getTituloActual()}
                {vista === "archivos" && carpetaActiva && CARPETAS_PROTEGIDAS.includes(carpetaActiva) && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Protegida
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{getSubtituloActual()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {vista === "archivos" && !modoSeleccion && (
              <button onClick={() => setModoSeleccion(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Seleccionar
              </button>
            )}
            <button onClick={() => inputRef.current?.click()} disabled={subiendo}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Subir archivo
            </button>
          </div>
          <input ref={inputRef} type="file" multiple
            accept="image/*,application/pdf,.sql,.dump,.backup,.gz,.zip,.tar"
            onChange={handleSeleccionArchivos} className="hidden" />
        </div>

        {/* Widget almacenamiento */}
        {estadisticas && vista === "carpetas" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Almacenamiento usado</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {estadisticas.almacenamiento.mb < 1024
                    ? `${estadisticas.almacenamiento.mb} MB`
                    : `${estadisticas.almacenamiento.gb} GB`
                  } de {estadisticas.almacenamiento.limite_gb} GB
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{estadisticas.almacenamiento.porcentaje}%</p>
                <p className="text-xs text-gray-400">{estadisticas.total_archivos} archivos</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all duration-500 ${estadisticas.almacenamiento.porcentaje > 80 ? "bg-red-500"
                  : estadisticas.almacenamiento.porcentaje > 60 ? "bg-amber-500"
                    : "bg-blue-600"
                }`} style={{ width: `${Math.max(estadisticas.almacenamiento.porcentaje, 0.5)}%` }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              {[
                { label: "Diseños", value: estadisticas.por_carpeta.disenos, color: "bg-blue-50 text-blue-700" },
                { label: "PDFs", value: estadisticas.por_carpeta.pdfs, color: "bg-red-50 text-red-700" },
                { label: "Fotos de Envíos", value: estadisticas.por_carpeta.fotos_envios, color: "bg-green-50 text-green-700" },
                { label: "Backups BD", value: estadisticas.por_carpeta.backups, color: "bg-gray-100 text-gray-700" },
                { label: "Suajes", value: estadisticas.por_carpeta.suaje, color: "bg-purple-50 text-purple-700" },
              ].map(item => (
                <div key={item.label} className={`rounded-xl px-3 py-2 ${item.color}`}>
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="text-sm font-bold mt-0.5">
                    {item.value < 1024 ? `${item.value} MB` : `${(item.value / 1024).toFixed(2)} GB`}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-1 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full bg-blue-400" /> {estadisticas.total_imagenes} imágenes
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full bg-red-400" /> {estadisticas.total_pdfs} PDFs
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full bg-gray-400" /> {estadisticas.total_documentos} documentos
              </div>
            </div>
          </div>
        )}

        {/* Barra búsqueda / orden / agrupación */}
        {vista === "archivos" && (
          <div className="space-y-3">
            {modoSeleccion && (
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                <input type="checkbox" checked={todosSeleccionados} onChange={toggleSeleccionTodos}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                <span className="text-sm font-medium text-blue-800 flex-1">
                  {seleccionados.size === 0
                    ? "Ningún archivo seleccionado"
                    : `${seleccionados.size} archivo${seleccionados.size !== 1 ? "s" : ""} seleccionado${seleccionados.size !== 1 ? "s" : ""}`}
                </span>
                {seleccionados.size > 0 && (
                  <div className="flex items-center gap-2">
                    <button onClick={descargarSeleccionados}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar ({seleccionados.size})
                    </button>
                    <button onClick={() => { setModalEliminar(true); setConfirmTexto(""); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar ({seleccionados.size})
                    </button>
                  </div>
                )}
                <button onClick={cancelarSeleccion}
                  className="text-blue-500 hover:text-blue-700 text-xs font-medium transition-colors">
                  Cancelar
                </button>
              </div>
            )}

            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-48">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar archivos..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 focus:border-transparent" />
                {busqueda && (
                  <button onClick={() => setBusqueda("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="relative" ref={filtrosRef}>
                <button onClick={() => { setMostrarFiltros(prev => !prev); setMostrarAgrupa(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${mostrarFiltros ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <span className="hidden sm:inline">{ordenActualLabel}</span>
                  <span className="sm:hidden">Ordenar</span>
                  <svg className={`w-3.5 h-3.5 transition-transform ${mostrarFiltros ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mostrarFiltros && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ordenar por</p>
                    </div>
                    {ORDEN_OPTIONS.map(op => (
                      <button key={op.value} onClick={() => { setOrden(op.value); setMostrarFiltros(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${orden === op.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                          }`}>
                        {op.label}
                        {orden === op.value && (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={grupaRef}>
                <button onClick={() => { setMostrarAgrupa(prev => !prev); setMostrarFiltros(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${mostrarAgrupa || agrupacion !== "ninguno" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="hidden sm:inline">{agrupaActualLabel}</span>
                  <span className="sm:hidden">Agrupar</span>
                  {agrupacion !== "ninguno" && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
                  <svg className={`w-3.5 h-3.5 transition-transform ${mostrarAgrupa ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mostrarAgrupa && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agrupar por</p>
                    </div>
                    {AGRUPA_OPTIONS.map(op => (
                      <button key={op.value} onClick={() => { setAgrupacion(op.value); setMostrarAgrupa(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${agrupacion === op.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                          }`}>
                        {op.label}
                        {agrupacion === op.value && (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Vista carpetas */}
        {vista === "carpetas" && (
          cargando ? (
            <div className="flex justify-center py-12">
              <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {CARPETAS_OPTIONS.map(carpeta => {
                const total = contarPorCarpeta(carpeta.value);
                const protegida = CARPETAS_PROTEGIDAS.includes(carpeta.value);
                const desbloqueada = carpetasDesbloqueadas.has(carpeta.value);
                const conSub = CARPETAS_CON_SUBCARPETAS.includes(carpeta.value);
                const numSub = getNumSubcarpetas(carpeta.value);
                return (
                  <button key={carpeta.value} onClick={() => abrirCarpeta(carpeta.value)}
                    className="flex flex-col items-center gap-3 p-6 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all group text-center relative">
                    {protegida && (
                      <div className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center ${desbloqueada ? "bg-green-100" : "bg-amber-100"
                        }`}>
                        <svg className={`w-3.5 h-3.5 ${desbloqueada ? "text-green-600" : "text-amber-600"}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d={desbloqueada
                              ? "M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                              : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"}
                          />
                        </svg>
                      </div>
                    )}
                    {conSub && (
                      <div className="absolute top-2.5 left-2.5 px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded text-xs font-semibold">
                        {numSub}
                      </div>
                    )}
                    {renderIconoCarpeta(carpeta.value)}
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                        {carpeta.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {total} archivo{total !== 1 ? "s" : ""}
                        {conSub ? ` · ${numSub} subcarpetas` : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* Vista subcarpetas — dinámica según carpeta activa */}
        {vista === "subcarpetas" && carpetaActiva && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {getSubcarpetasDeCarpeta(carpetaActiva).map(sub => {
              const total = contarPorSubcarpeta(sub.value);
              return (
                <button key={sub.value} onClick={() => abrirSubcarpeta(sub.value as any)}
                  className={`flex flex-col items-center gap-3 p-5 bg-white border border-gray-200 rounded-2xl transition-all group text-center ${carpetaActiva === "suaje"
                      ? "hover:border-purple-300 hover:shadow-md"
                      : "hover:border-red-300 hover:shadow-md"
                    }`}>
                  {renderIconoSubcarpeta(carpetaActiva)}
                  <div>
                    <p className={`text-sm font-semibold text-gray-800 transition-colors ${carpetaActiva === "suaje"
                        ? "group-hover:text-purple-600"
                        : "group-hover:text-red-600"
                      }`}>
                      {sub.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {total} archivo{total !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Vista archivos */}
        {vista === "archivos" && (
          archivosFiltradosYOrdenados.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">
                {busqueda ? `No se encontraron archivos para "${busqueda}"` : "Esta carpeta está vacía"}
              </p>
              {!busqueda && (
                <button onClick={() => inputRef.current?.click()}
                  className="mt-3 text-sm text-blue-600 hover:underline">
                  Subir el primer archivo
                </button>
              )}
            </div>
          ) : agrupacion === "ninguno" ? (
            renderGrillaArchivos(archivosFiltradosYOrdenados)
          ) : (
            <div className="space-y-6">
              {grupos.map(({ clave, items }) => {
                const colapsado = gruposColapsados.has(clave);
                return (
                  <div key={clave} className="space-y-3">
                    <button onClick={() => toggleGrupo(clave)} className="flex items-center gap-3 w-full group">
                      <div className="flex items-center gap-2 flex-1">
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${colapsado ? "-rotate-90" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700 capitalize group-hover:text-blue-700 transition-colors">{clave}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                          {items.length} archivo{items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-gray-200" />
                    </button>
                    {!colapsado && renderGrillaArchivos(items)}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Modal código carpeta protegida */}
      {modalCodigoCarpeta !== null && (
        <ModalCodigoCarpeta
          onConfirmar={handleVerificarCodigoCarpeta}
          onCerrar={() => setModalCodigoCarpeta(null)}
        />
      )}

      {/* Modal subir archivo */}
      {modalSubir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Selecciona la carpeta destino</h2>
              <p className="text-sm text-gray-500 mt-1">
                {archivosModal.length} archivo{archivosModal.length !== 1 ? "s" : ""} seleccionado{archivosModal.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="space-y-1 max-h-28 overflow-y-auto">
              {archivosModal.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-xs text-gray-700 truncate">{f.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              ))}
            </div>

            {/* Selector carpeta */}
            <div className="grid grid-cols-2 gap-2">
              {CARPETAS_OPTIONS.map(c => (
                <button key={c.value} onClick={() => { setCarpetaSeleccion(c.value); setSubcarpetaSeleccion(null); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${carpetaSeleccion === c.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                  </svg>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Selector subcarpeta — dinámica según carpeta seleccionada */}
            {necesitaSubcarpeta && subcarpetasDelModal.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Subcarpeta de {CARPETAS_LABELS[carpetaSeleccion]}
                </label>
                <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {subcarpetasDelModal.map(sub => (
                    <button key={sub.value}
                      onClick={() => setSubcarpetaSeleccion(sub.value as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${subcarpetaSeleccion === sub.value
                          ? carpetaSeleccion === "suaje"
                            ? "border-purple-400 bg-purple-50 text-purple-700 font-semibold"
                            : "border-red-400 bg-red-50 text-red-700 font-semibold"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}>
                      <svg className={`w-4 h-4 flex-shrink-0 ${carpetaSeleccion === "suaje" ? "text-purple-300" : "text-red-300"
                        }`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                      </svg>
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setModalSubir(false); setArchivosModal([]); setSubcarpetaSeleccion(null); }}
                disabled={subiendo}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleConfirmarSubida}
                disabled={subiendo || (necesitaSubcarpeta && !subcarpetaSeleccion)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {subiendo ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Subiendo...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Subir a {subcarpetaSeleccion
                      ? subcarpetasDelModal.find(s => s.value === subcarpetaSeleccion)?.label
                      : CARPETAS_LABELS[carpetaSeleccion]}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación múltiple */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Eliminar archivos</h2>
                <p className="text-sm text-gray-500 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1 max-h-36 overflow-y-auto">
              {archivos.filter(a => seleccionados.has(a.id_archivo)).map(a => (
                <div key={a.id_archivo} className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="text-xs text-red-700 truncate">{a.nombre}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Escribe <span className="font-bold text-red-600">eliminar</span> para confirmar
              </label>
              <input type="text" value={confirmTexto} onChange={e => setConfirmTexto(e.target.value)}
                placeholder="eliminar"
                className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-colors ${confirmTexto === "eliminar"
                    ? "border-red-400 focus:ring-red-200 bg-red-50"
                    : "border-gray-200 focus:ring-blue-200"
                  }`} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setModalEliminar(false); setConfirmTexto(""); }} disabled={eliminando}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleConfirmarEliminacion}
                disabled={confirmTexto !== "eliminar" || eliminando}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {eliminando ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar {seleccionados.size} archivo{seleccionados.size !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
}