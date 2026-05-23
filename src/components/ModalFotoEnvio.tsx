import { useState, useRef, useCallback, useEffect } from "react";
import { subirArchivo, getFotosEnvio, type Archivo } from "../services/archivos.service";
import { updateGuiaEnvio } from "../services/enviosService";
import { showAlert } from "./CustomAlert";
import type { EnvioPaqueteria, BitacoraRegistro } from "../types/envios.types";

interface PropsBase {
  onClose:      () => void;
  onCompletado: () => void;
}
interface PropsPaqueteria extends PropsBase {
  modo:  "paqueteria";
  envio: EnvioPaqueteria;
}
interface PropsLocal extends PropsBase {
  modo:     "local";
  registro: BitacoraRegistro;
}
type Props = PropsPaqueteria | PropsLocal;
type Paso  = "formulario" | "subiendo" | "completado";

export default function ModalFotoEnvio(props: Props) {
  const esPaqueteria = props.modo === "paqueteria";

  const idenvio    = esPaqueteria ? props.envio.idenvio               : props.registro.envio.idenvio;
  const noPedido   = esPaqueteria ? props.envio.no_pedido              : props.registro.no_pedido;
  const cliente    = esPaqueteria ? props.envio.cliente                : props.registro.cliente;
  const guiaActual = esPaqueteria ? props.envio.numero_guia   || ""   : props.registro.envio.numero_guia || "";

  const [paso,          setPaso]          = useState<Paso>("formulario");
  const [numeroGuia,    setNumeroGuia]    = useState(guiaActual);
  const [fotoPreview,   setFotoPreview]   = useState<string | null>(null);
  const [fotoFile,      setFotoFile]      = useState<File | null>(null);
  const [fotosExist,    setFotosExist]    = useState<Archivo[]>([]);
  const [cargandoFotos, setCargandoFotos] = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [progresoMsg,   setProgresoMsg]   = useState("");
  const [dragging,      setDragging]      = useState(false);

  const inputFotoRef = useRef<HTMLInputElement>(null);

  // Cargar fotos existentes del envío al abrir
  useEffect(() => {
    getFotosEnvio(idenvio)
      .then(setFotosExist)
      .catch(() => {})
      .finally(() => setCargandoFotos(false));
  }, [idenvio]);

  const obtenerExtension = (nombre: string) => {
    const partes = nombre.split(".");
    return partes.length > 1 ? `.${partes.pop()}` : "";
  };

  const procesarArchivo = (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Solo se permiten imágenes."); return; }
    if (file.size > 10 * 1024 * 1024)   { setError("La imagen no puede superar 10 MB."); return; }
    setError(null);
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSeleccionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    procesarArchivo(file);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  };

  const handleQuitarFoto = () => { setFotoFile(null); setFotoPreview(null); };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file);
  }, []);

  const tieneGuia    = numeroGuia.trim().length > 0;
  const tieneFoto    = fotoFile !== null;
  const puedeGuardar = esPaqueteria ? tieneGuia : tieneGuia || tieneFoto;

  const handleGuardar = async () => {
    if (!puedeGuardar) return;
    setPaso("subiendo");
    try {
      if (tieneGuia) {
        setProgresoMsg("Guardando número de guía…");
        await updateGuiaEnvio(idenvio, numeroGuia.trim());
      }
      if (tieneFoto) {
        setProgresoMsg("Subiendo foto a Fotos de Envíos…");
        const archivoRenombrado = new File(
          [fotoFile!],
          `envio-${idenvio}-pedido-${noPedido}-${Date.now()}${obtenerExtension(fotoFile!.name)}`,
          { type: fotoFile!.type }
        );
        // ← Guardar con envio_id para que aparezca en el gestor vinculada al envío
        await subirArchivo(archivoRenombrado, "fotos-envios", undefined, idenvio);
      }
      setPaso("completado");
    } catch {
      showAlert("Error al guardar. Intenta nuevamente.");
      setPaso("formulario");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {paso === "completado"
                ? "¡Registro completado!"
                : esPaqueteria ? "Registrar entrega a paquetería" : "Registrar foto de reparto"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Pedido <span className="font-semibold text-blue-600">{noPedido}</span>{" · "}{cliente}
            </p>
          </div>
          {paso !== "subiendo" && (
            <button onClick={props.onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* SUBIENDO */}
          {paso === "subiendo" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              </div>
              <p className="text-sm text-gray-600 font-medium">{progresoMsg}</p>
            </div>
          )}

          {/* COMPLETADO */}
          {paso === "completado" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div className="text-center space-y-1">
                {tieneGuia && (
                  <p className="text-sm font-semibold text-gray-800">
                    Guía <span className="text-blue-600 font-mono">{numeroGuia}</span> registrada
                  </p>
                )}
                {tieneFoto
                  ? <p className="text-xs text-gray-500">La foto fue guardada en <strong>Fotos de Envíos</strong></p>
                  : <p className="text-xs text-gray-400">Sin foto adjunta</p>
                }
              </div>
              {fotoPreview && (
                <img src={fotoPreview} alt="Foto de envío"
                  className="w-48 h-36 object-cover rounded-xl border border-gray-200 shadow-sm" />
              )}
              <button onClick={() => { props.onCompletado(); props.onClose(); }}
                className="mt-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors">
                Cerrar
              </button>
            </div>
          )}

          {/* FORMULARIO */}
          {paso === "formulario" && (
            <>
              {/* ── Fotos ya registradas ── */}
              {!cargandoFotos && fotosExist.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Fotos registradas ({fotosExist.length})
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {fotosExist.map(f => (
                      <a key={f.id_archivo} href={f.url} target="_blank" rel="noopener noreferrer" title={f.nombre}>
                        <img src={f.url} alt={f.nombre}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {cargandoFotos && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  Cargando fotos existentes…
                </div>
              )}

              {/* Número de guía — pre-cargada si ya existe */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Número de guía
                  {esPaqueteria && <span className="text-red-500 ml-0.5">*</span>}
                  {!esPaqueteria && <span className="text-gray-400 font-normal ml-1">(opcional)</span>}
                </label>
                <input
                  type="text"
                  value={numeroGuia}
                  onChange={e => setNumeroGuia(e.target.value)}
                  placeholder="Ej. 1234567890"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent font-mono"
                />
                {guiaActual && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    Guía registrada: <span className="font-mono font-semibold">{guiaActual}</span>
                  </p>
                )}
              </div>

              {/* Zona de foto */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  {fotosExist.length > 0 ? "Agregar otra foto" : "Foto del envío"}
                  <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                </label>

                {fotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border-2 border-blue-300 bg-gray-50">
                    <img src={fotoPreview} alt="Vista previa" className="w-full h-52 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"/>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 bg-white/90 rounded-lg px-2.5 py-1">
                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                        </svg>
                        <span className="text-xs font-semibold text-gray-700 truncate max-w-[180px]">{fotoFile?.name}</span>
                      </div>
                      <button onClick={handleQuitarFoto}
                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Cambiar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputFotoRef.current?.click()}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all p-6 flex flex-col items-center gap-4 ${
                      dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}>
                    <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
                      dragging ? "bg-blue-500 shadow-blue-200" : "bg-gray-800"
                    }`}>
                      <svg viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
                        <rect x="2" y="8" width="36" height="22" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="2"/>
                        <path d="M13 8V6C13 5.45 13.45 5 14 5H26C26.55 5 27 5.45 27 6V8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="20" cy="19" r="7" stroke="white" strokeWidth="2"/>
                        <circle cx="20" cy="19" r="4" fill="white" fillOpacity="0.25"/>
                        <circle cx="22.5" cy="16.5" r="1.2" fill="white" fillOpacity="0.7"/>
                        <rect x="6" y="12" width="4" height="3" rx="1" fill="white" fillOpacity="0.6"/>
                      </svg>
                      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${dragging ? "bg-yellow-300" : "bg-teal-400"}`}/>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">
                        {dragging ? "Suelta la imagen aquí" : "Toca para seleccionar una foto"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Galería · Archivos · Cámara &nbsp;·&nbsp; Máx. 10 MB</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-medium shadow-sm pointer-events-none">
                        <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        Galería
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-full text-xs font-medium shadow-sm pointer-events-none">
                        <svg viewBox="0 0 16 14" fill="none" className="w-3 h-3">
                          <rect x="1" y="3" width="14" height="10" rx="1.5" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.2"/>
                          <path d="M5.5 3V2C5.5 1.72 5.72 1.5 6 1.5H10C10.28 1.5 10.5 1.72 10.5 2V3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                          <circle cx="8" cy="8" r="2.8" stroke="white" strokeWidth="1.2"/>
                          <circle cx="8" cy="8" r="1.2" fill="white" fillOpacity="0.35"/>
                          <circle cx="9.2" cy="6.5" r="0.5" fill="white" fillOpacity="0.7"/>
                        </svg>
                        Cámara
                      </span>
                    </div>
                  </div>
                )}

                <input ref={inputFotoRef} type="file" accept="image/*" capture="environment"
                  onChange={handleSeleccionarFoto} className="hidden" />

                {error && (
                  <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    {error}
                  </p>
                )}
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex gap-2.5">
                <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-xs text-indigo-700 leading-relaxed">
                  {esPaqueteria
                    ? "El número de guía es obligatorio. La foto es opcional pero recomendada como evidencia."
                    : "La foto y el número de guía son opcionales. Registra al menos uno para guardar."
                  }
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {paso === "formulario" && (
          <div className="px-6 pb-5 flex gap-3">
            <button onClick={props.onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={!puedeGuardar}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                puedeGuardar ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              Guardar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}