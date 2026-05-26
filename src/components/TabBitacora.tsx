import { useState, useRef, useEffect } from "react";
import {
  getBitacora, registrarHoraSalida, registrarHoraLlegada,
  updateBitacora, getEnviosPaqueteria, updateEstadoEnvio,
  getOrCreateNotaRemision, getEnviosRecoleccion, getFotoRecoleccion,
  getNotasRemisionBitacora, getNotaRemisionMulti,
  marcarRecolectadoNotaRemision, marcarEntregadoLocalNota,
} from "../services/enviosService";
import { getFotosEnvio, subirArchivo, getFotosNota, type Archivo } from "../services/archivos.service";
import { generarNotaRemision, generarNotaRemisionMulti } from "../utils/generarNotaRemision";
import {
  OBSERVACIONES, ESTADO_BADGE, ESTADO_LABEL, formatFechaHora,
} from "./enviosConstants";
import ModalEditarBitacora from "./ModalEditarBitacora";
import ModalFormatoCastores from "./ModalFormatoCastores";
import ModalFormatoTresGuerras from "./ModalFormatoTresGuerras";
import ModalGuiaPaqueteriaGeneral from "./ModalGuiaPaqueteriaGeneral";
import ModalFotoEnvio from "./ModalFotoEnvio";
import ModalMarcarRecoleccion from "./ModalMarcarRecoleccion";
import Modal from "./Modal";
import { inputClass, labelClass } from "./enviosConstants";
import type {
  BitacoraRegistro, UpdateBitacoraRequest,
  EnvioPaqueteria, EnvioRecoleccion, NotaRemisionBitacoraItem,
} from "../types/envios.types";
import { showAlert } from "./CustomAlert";

const IconoCamara = () => (
  <svg viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3 h-3">
    <rect x="1" y="3" width="14" height="10" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5.5 3V2C5.5 1.72 5.72 1.5 6 1.5H10C10.28 1.5 10.5 1.72 10.5 2V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="8" cy="8" r="1" fill="currentColor" fillOpacity="0.4" />
    <circle cx="9" cy="6.5" r="0.45" fill="currentColor" fillOpacity="0.7" />
    <rect x="2" y="4.5" width="2" height="1.5" rx="0.5" fill="currentColor" fillOpacity="0.5" />
  </svg>
);

// ── Modal LOCAL ──
function ModalMarcarLocalNota({ nota, onClose, onSuccess }: {
  nota: NotaRemisionBitacoraItem; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    hora_salida: "", hora_llegada: "",
    observacion: "" as "" | "E" | "RA" | "RD" | "PD",
    observacion_extra: "", firma: "",
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setGuardando(true);
    try {
      await marcarEntregadoLocalNota(nota.idnota, {
        hora_salida:       form.hora_salida       || undefined,
        hora_llegada:      form.hora_llegada      || undefined,
        observacion:       form.observacion       || undefined,
        observacion_extra: form.observacion_extra || undefined,
        firma:             form.firma             || undefined,
      });

      if (foto) {
        const ext = foto.name.match(/\.[^/.]+$/)?.[0] || "";
        const archivoRenombrado = new File(
          [foto],
          `nota-${nota.idnota}-${nota.no_nota}-${Date.now()}${ext}`,
          { type: foto.type }
        );
        await subirArchivo(archivoRenombrado, "fotos-envios", undefined, undefined, nota.idnota);
      }

      onSuccess();
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al registrar entrega");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar Entrega Local">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-blue-800">{nota.no_nota}</p>
          <p className="text-blue-600 text-xs mt-0.5">{nota.no_pedido} · {nota.cliente} · {nota.total_bultos} bulto(s)</p>
          {nota.chofer && <p className="text-blue-500 text-xs mt-0.5">Chofer: {nota.chofer.nombre}</p>}
          {nota.unidad && <p className="text-blue-500 text-xs">Unidad: {nota.unidad.nombre}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Fecha y Hora de Salida</label>
            <input type="datetime-local" value={form.hora_salida}
              onChange={e => setForm({ ...form, hora_salida: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fecha y Hora de Llegada</label>
            <input type="datetime-local" value={form.hora_llegada}
              onChange={e => setForm({ ...form, hora_llegada: e.target.value })} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Observación</label>
          <select value={form.observacion}
            onChange={e => setForm({ ...form, observacion: e.target.value as any })} className={inputClass}>
            <option value="">Sin observación</option>
            {OBSERVACIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Notas adicionales</label>
          <input type="text" value={form.observacion_extra}
            onChange={e => setForm({ ...form, observacion_extra: e.target.value })}
            className={inputClass} placeholder="Notas extras..." />
        </div>

        <div>
          <label className={labelClass}>Firma (nombre del responsable)</label>
          <input type="text" value={form.firma}
            onChange={e => setForm({ ...form, firma: e.target.value })}
            className={inputClass} placeholder="Nombre completo..." />
        </div>

        <div>
          <label className={labelClass}>Foto (recibo, comprobante, etc.)</label>
          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
              <button type="button"
                onClick={() => { setFoto(null); setPreview(null); if (inputFotoRef.current) inputFotoRef.current.value = ""; }}
                className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-200">✕</button>
            </div>
          ) : (
            <button type="button" onClick={() => inputFotoRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex flex-col items-center gap-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Tomar o seleccionar foto</span>
            </button>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} disabled={guardando}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={guardando}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
            {guardando ? "Registrando..." : "✓ Confirmar Entrega"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal RECOLECCIÓN ──
function ModalMarcarRecoleccionNota({ nota, onClose, onSuccess }: {
  nota: NotaRemisionBitacoraItem; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    nombre_quien_recogio: "", empresa: "",
    unidad_marca: "", unidad_modelo: "", unidad_placas: "",
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.nombre_quien_recogio.trim()) { showAlert("El nombre de quien recogió es obligatorio"); return; }
    setGuardando(true);
    try {
      await marcarRecolectadoNotaRemision(nota.idnota, form);

      if (foto) {
        const ext = foto.name.match(/\.[^/.]+$/)?.[0] || "";
        const archivoRenombrado = new File(
          [foto],
          `nota-${nota.idnota}-${nota.no_nota}-${Date.now()}${ext}`,
          { type: foto.type }
        );
        await subirArchivo(archivoRenombrado, "fotos-envios", undefined, undefined, nota.idnota);
      }

      onSuccess();
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al registrar recolección");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar Entrega de Nota">
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-emerald-800">{nota.no_nota}</p>
          <p className="text-emerald-600 text-xs mt-0.5">{nota.no_pedido} · {nota.cliente} · {nota.total_bultos} bulto(s)</p>
        </div>

        <div>
          <label className={labelClass}>Nombre de quien recogió *</label>
          <input type="text" value={form.nombre_quien_recogio}
            onChange={e => setForm({ ...form, nombre_quien_recogio: e.target.value })}
            className={inputClass} placeholder="Nombre completo..." />
        </div>

        <div>
          <label className={labelClass}>Empresa (opcional)</label>
          <input type="text" value={form.empresa}
            onChange={e => setForm({ ...form, empresa: e.target.value })}
            className={inputClass} placeholder="Razón social o nombre de empresa..." />
        </div>

        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Datos de la unidad (opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Marca</label>
              <input type="text" value={form.unidad_marca}
                onChange={e => setForm({ ...form, unidad_marca: e.target.value })}
                className={inputClass} placeholder="Ford, Toyota..." />
            </div>
            <div>
              <label className={labelClass}>Modelo</label>
              <input type="text" value={form.unidad_modelo}
                onChange={e => setForm({ ...form, unidad_modelo: e.target.value })}
                className={inputClass} placeholder="Transit, Ranger..." />
            </div>
          </div>
          <div>
            <label className={labelClass}>Placas</label>
            <input type="text" value={form.unidad_placas}
              onChange={e => setForm({ ...form, unidad_placas: e.target.value.toUpperCase() })}
              className={inputClass} placeholder="ABC-123" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Foto (recibo, comprobante, etc.)</label>
          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
              <button type="button"
                onClick={() => { setFoto(null); setPreview(null); if (inputFotoRef.current) inputFotoRef.current.value = ""; }}
                className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-200">✕</button>
            </div>
          ) : (
            <button type="button" onClick={() => inputFotoRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex flex-col items-center gap-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Tomar o seleccionar foto</span>
            </button>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} disabled={guardando}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={guardando || !form.nombre_quien_recogio.trim()}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {guardando ? "Registrando..." : "✓ Confirmar Entrega"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Desplegable nota — diferencia local vs recolección y carga fotos ──
function DetalleRecoleccionNota({ n }: { n: NotaRemisionBitacoraItem }) {
  const [abierto, setAbierto] = useState(false);
  const [fotos,   setFotos]   = useState<Archivo[]>([]);
  const [cargandoFotos, setCargandoFotos] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const esLocal = n.tipo_entrega === "local";
  const tieneLocal = esLocal && n.local_datos != null;
  const tieneRecoleccion = !esLocal && n.recoleccion_datos != null;
  const tieneDatos = tieneLocal || tieneRecoleccion;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setAbierto(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!tieneDatos) return <span className="text-gray-300">—</span>;

  const etiqueta = esLocal
    ? (n.local_datos?.firma || "Registrado")
    : (n.recoleccion_datos?.nombre_quien_recogio || "—");

  const toggle = async () => {
    if (!abierto && fotos.length === 0) {
      setCargandoFotos(true);
      try { setFotos(await getFotosNota(n.idnota)); }
      catch { /* silencioso */ }
      finally { setCargandoFotos(false); }
    }
    setAbierto(v => !v);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-xs">
      <button onClick={toggle} className="flex items-center gap-1 group max-w-[140px]">
        <span className="truncate font-medium text-gray-700 group-hover:text-emerald-700">{etiqueta}</span>
        <svg className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute left-0 z-[999] mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-2xl p-3 space-y-1.5 text-xs">

          {/* LOCAL */}
          {esLocal && n.local_datos && (
            <>
              {n.local_datos.firma && (
                <p className="font-semibold text-gray-800">Firma: {n.local_datos.firma}</p>
              )}
              {n.local_datos.hora_salida && (
                <p className="text-gray-600">Salida: {formatFechaHora(n.local_datos.hora_salida)}</p>
              )}
              {n.local_datos.hora_llegada && (
                <p className="text-gray-600">Llegada: {formatFechaHora(n.local_datos.hora_llegada)}</p>
              )}
              {n.local_datos.observacion && (
                <p className="text-gray-600">Obs: <span className="font-bold">{n.local_datos.observacion}</span></p>
              )}
              {n.local_datos.observacion_extra && (
                <p className="text-gray-500">{n.local_datos.observacion_extra}</p>
              )}
            </>
          )}

          {/* RECOLECCIÓN */}
          {!esLocal && n.recoleccion_datos && (
            <>
              <p className="font-semibold text-gray-800">{n.recoleccion_datos.nombre_quien_recogio}</p>
              {n.recoleccion_datos.empresa && <p className="text-gray-500">{n.recoleccion_datos.empresa}</p>}
              {n.recoleccion_datos.unidad_placas && (
                <p className="text-gray-600">Placas: <span className="font-mono">{n.recoleccion_datos.unidad_placas}</span></p>
              )}
              {(n.recoleccion_datos.unidad_marca || n.recoleccion_datos.unidad_modelo) && (
                <p className="text-gray-500">{[n.recoleccion_datos.unidad_marca, n.recoleccion_datos.unidad_modelo].filter(Boolean).join(" ")}</p>
              )}
              {n.recoleccion_datos.fecha && (
                <p className="text-gray-400">{formatFechaHora(n.recoleccion_datos.fecha)}</p>
              )}
            </>
          )}

          {/* Fotos */}
          {cargandoFotos ? (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : fotos.length > 0 ? (
            <div className="pt-1 border-t border-gray-100">
              <p className="text-gray-400 mb-1">{fotos.length} foto(s)</p>
              <div className="flex flex-wrap gap-1">
                {fotos.map(f => (
                  <a key={f.id_archivo} href={f.url} target="_blank" rel="noopener noreferrer">
                    <img src={f.url} alt={f.nombre}
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── BotonesEnvio ──
function BotonesEnvio({ idenvio, onAbrirModal, extraButtons }: {
  idenvio: number; onAbrirModal: () => void; extraButtons?: React.ReactNode;
}) {
  const [fotos, setFotos] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getFotosEnvio(idenvio).then(setFotos).catch(() => {}).finally(() => setCargando(false));
  }, [idenvio]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tieneFoto = fotos.length > 0;

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {extraButtons}
        {cargando ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        ) : tieneFoto ? (
          <button onClick={() => setAbierto(v => !v)}
            className="text-xs px-2 py-1 rounded font-medium flex items-center gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
            <IconoCamara /> Foto ✓
          </button>
        ) : (
          <button onClick={onAbrirModal}
            className="text-xs px-2 py-1 rounded font-medium flex items-center gap-1 bg-gray-800 text-white hover:bg-gray-700 transition-colors">
            <IconoCamara /> Foto
          </button>
        )}
      </div>
      {tieneFoto && abierto && (
        <div className="absolute top-8 right-0 z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-2xl p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">{fotos.length} foto(s) registrada(s)</p>
          <div className="flex flex-wrap gap-2">
            {fotos.map(f => (
              <a key={f.id_archivo} href={f.url} target="_blank" rel="noopener noreferrer" title={f.nombre}>
                <img src={f.url} alt={f.nombre}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── DetalleRecoleccion (pestaña Recolección) ──
function DetalleRecoleccion({ r }: { r: EnvioRecoleccion }) {
  const [abierto, setAbierto] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const d = r.recoleccion_datos;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!d) return <span className="text-gray-300">—</span>;

  const toggle = async () => {
    if (!abierto && d.tiene_foto && !fotoUrl) {
      setCargando(true);
      try { setFotoUrl(await getFotoRecoleccion(r.idenvio)); }
      catch { /* silencioso */ }
      finally { setCargando(false); }
    }
    setAbierto(v => !v);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-xs">
      <button onClick={toggle} className="flex items-center gap-1 group max-w-[140px]">
        <span className="truncate font-medium text-gray-700 group-hover:text-purple-700">{d.nombre_quien_recogio}</span>
        {d.tiene_foto && <span className="text-emerald-500 shrink-0">📷</span>}
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${abierto ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-2xl p-3">
          <div className="flex gap-3">
            {d.tiene_foto && (
              <div className="shrink-0">
                {cargando
                  ? <div className="w-16 h-16 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  : fotoUrl
                    ? <a href={fotoUrl} target="_blank" rel="noopener noreferrer">
                        <img src={fotoUrl} alt="foto" className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition" />
                      </a>
                    : null}
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1 text-xs">
              <p className="font-semibold text-gray-800 truncate">{d.nombre_quien_recogio}</p>
              {d.empresa && <p className="text-gray-500 truncate">{d.empresa}</p>}
              {d.unidad_placas && (
                <div className="text-gray-600"><span className="font-medium">Placas:</span> <span className="font-mono">{d.unidad_placas}</span></div>
              )}
              {(d.unidad_marca || d.unidad_modelo) && (
                <div className="text-gray-500 truncate">{[d.unidad_marca, d.unidad_modelo].filter(Boolean).join(" ")}</div>
              )}
              {d.fecha_recogido && <div className="text-gray-500">{formatFechaHora(d.fecha_recogido)}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type Seccion = "local" | "paqueteria" | "recoleccion" | "nota_remision";

export default function TabBitacora() {
  const [seccion,       setSeccion]       = useState<Seccion>("local");
  const [registros,     setRegistros]     = useState<BitacoraRegistro[]>([]);
  const [enviosPaq,     setEnviosPaq]     = useState<EnvioPaqueteria[]>([]);
  const [recolecciones, setRecolecciones] = useState<EnvioRecoleccion[]>([]);
  const [notasRemision, setNotasRemision] = useState<NotaRemisionBitacoraItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [editando,      setEditando]      = useState<BitacoraRegistro | null>(null);
  const [formEdit,      setFormEdit]      = useState<UpdateBitacoraRequest & { numero_guia?: string }>({});
  const [guardando,     setGuardando]     = useState(false);

  const [modalCastores,        setModalCastores]        = useState<number | null>(null);
  const [modalTresGuerras,     setModalTresGuerras]     = useState<number | null>(null);
  const [modalGuiaGeneral,     setModalGuiaGeneral]     = useState<number | null>(null);
  const [modalFotoPaq,         setModalFotoPaq]         = useState<EnvioPaqueteria | null>(null);
  const [modalFotoLocal,       setModalFotoLocal]       = useState<BitacoraRegistro | null>(null);
  const [modalRecoleccion,     setModalRecoleccion]     = useState<EnvioRecoleccion | null>(null);
  const [modalNotaLocal,       setModalNotaLocal]       = useState<NotaRemisionBitacoraItem | null>(null);
  const [modalNotaRecoleccion, setModalNotaRecoleccion] = useState<NotaRemisionBitacoraItem | null>(null);

  useEffect(() => { cargar(); }, [seccion]);

  const cargar = async () => {
    setLoading(true);
    try {
      if (seccion === "local")            setRegistros(await getBitacora());
      else if (seccion === "paqueteria")  setEnviosPaq(await getEnviosPaqueteria());
      else if (seccion === "recoleccion") setRecolecciones(await getEnviosRecoleccion());
      else                                setNotasRemision(await getNotasRemisionBitacora());
    } catch { showAlert("Error al cargar datos"); }
    finally { setLoading(false); }
  };

  const handleHoraSalida  = async (id: number) => { try { await registrarHoraSalida(id);  await cargar(); } catch { showAlert("Error al registrar hora de salida"); } };
  const handleHoraLlegada = async (id: number) => { try { await registrarHoraLlegada(id); await cargar(); } catch { showAlert("Error al registrar hora de llegada"); } };

  const toDatetimeLocal = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const abrirEdicion = (r: BitacoraRegistro) => {
    setEditando(r);
    setFormEdit({
      hora_salida:       r.hora_salida  ? toDatetimeLocal(r.hora_salida)  : undefined,
      hora_llegada:      r.hora_llegada ? toDatetimeLocal(r.hora_llegada) : undefined,
      observacion:       r.observacion       || undefined,
      observacion_extra: r.observacion_extra || undefined,
      firma:             r.firma             || undefined,
      numero_guia:       r.envio.numero_guia || "",
    });
  };

  const handleGuardar = async (data: UpdateBitacoraRequest & { numero_guia?: string }) => {
    if (!editando) return;
    setGuardando(true);
    try { await updateBitacora(editando.idbitacora, data); setEditando(null); await cargar(); }
    catch { showAlert("Error al guardar cambios"); }
    finally { setGuardando(false); }
  };

  const handleCambiarEstadoPaq = async (idenvio: number, estado: string) => {
    try { await updateEstadoEnvio(idenvio, estado); await cargar(); }
    catch { showAlert("Error al cambiar estado"); }
  };

  const handleGenerarNota      = async (idenvio: number) => { try { const nota = await getOrCreateNotaRemision(idenvio); await generarNotaRemision(nota); } catch { showAlert("Error al generar nota de remisión"); } };
  const handleGenerarNotaMulti = async (idnota: number)  => { try { const nota = await getNotaRemisionMulti(idnota);      await generarNotaRemisionMulti(nota); } catch { showAlert("Error al generar nota de remisión"); } };

  const abrirModalMarcarNota = (n: NotaRemisionBitacoraItem) => {
    if (n.tipo_entrega === "local") setModalNotaLocal(n);
    else setModalNotaRecoleccion(n);
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          {([
            { value: "local",         label: "Reparto Local"    },
            { value: "paqueteria",    label: "Paquetería"       },
            { value: "recoleccion",   label: "Recolección"      },
            { value: "nota_remision", label: "Nota de Remisión" },
          ] as { value: Seccion; label: string }[]).map(s => (
            <button key={s.value} onClick={() => setSeccion(s.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                seccion === s.value
                  ? s.value === "recoleccion" ? "bg-purple-600 text-white"
                  : s.value === "nota_remision" ? "bg-emerald-600 text-white"
                  : "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{s.label}</button>
          ))}
        </div>
        <button onClick={cargar} className="text-sm text-blue-600 hover:text-blue-800">Actualizar</button>
      </div>

      {/* ── LOCAL ── */}
      {seccion === "local" && (
        <div>
          <div className="bg-gray-50 rounded-lg p-3 mb-4 flex flex-wrap gap-4 text-xs text-gray-600">
            {OBSERVACIONES.map(o => (
              <span key={o.value}><strong>{o.value}</strong> — {o.label.split(" — ")[1]}</span>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Fecha","Unidad","Repartidor","N° Pedido","Tipo Envío","Salida","Llegada","N° Guía","Cliente","Obs.","Firma","Acciones"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registros.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">No hay registros en la bitácora</td></tr>
                  ) : registros.map(r => (
                    <tr key={r.idbitacora} className="hover:bg-gray-50 align-top">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{new Date(r.fecha).toLocaleDateString("es-MX")}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{r.unidad?.nombre ?? "-"}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{r.chofer?.nombre ?? "-"}</td>
                      <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">{r.no_pedido}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.envio.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                          {r.envio.es_parcialidad ? "Parcialidad" : "Completo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs">
                        {r.hora_salida ? <span className="text-gray-700">{formatFechaHora(r.hora_salida)}</span>
                          : <button onClick={() => handleHoraSalida(r.idbitacora)} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">Marcar salida</button>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs">
                        {r.hora_llegada ? <span className="text-gray-700">{formatFechaHora(r.hora_llegada)}</span>
                          : r.hora_salida
                            ? <button onClick={() => handleHoraLlegada(r.idbitacora)} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200">Marcar llegada</button>
                            : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">{r.envio.numero_guia || "-"}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{r.cliente}</td>
                      <td className="px-3 py-3 text-center">
                        {r.observacion ? <span className="font-bold text-gray-700">{r.observacion}</span> : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{r.firma || "-"}</td>
                      <td className="px-3 py-3">
                        <BotonesEnvio idenvio={r.envio.idenvio} onAbrirModal={() => setModalFotoLocal(r)}
                          extraButtons={
                            <>
                              <button onClick={() => abrirEdicion(r)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Registro</button>
                              <button onClick={() => handleGenerarNota(r.envio.idenvio)} className="text-xs text-green-600 hover:text-green-800 font-medium">Nota</button>
                            </>
                          } />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PAQUETERÍA ── */}
      {seccion === "paqueteria" && (
        <div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 text-xs text-indigo-700">
            La responsabilidad del envío termina al obtener el número de guía de la paquetería.
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Fecha","N° Pedido","Cliente","Paquetería","N° Guía","Bultos","Tipo Envío","Flete","Estado","Acciones"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {enviosPaq.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No hay envíos por paquetería registrados</td></tr>
                  ) : enviosPaq.map(e => (
                    <tr key={e.idenvio} className="hover:bg-gray-50 align-top">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{new Date(e.fecha_envio).toLocaleDateString("es-MX")}</td>
                      <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">{e.no_pedido}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{e.cliente}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{e.paqueteria.nombre}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {e.numero_guia ? <span className="text-gray-700 font-mono text-xs">{e.numero_guia}</span> : <span className="text-orange-500 text-xs font-medium">Sin guía</span>}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{e.total_bultos}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                          {e.es_parcialidad ? "Parcialidad" : "Completo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {e.costo_flete != null ? `$${Number(e.costo_flete).toLocaleString("es-MX")}` : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[e.estado]}`}>{ESTADO_LABEL[e.estado]}</span>
                      </td>
                      <td className="px-3 py-3">
                        <BotonesEnvio idenvio={e.idenvio} onAbrirModal={() => setModalFotoPaq(e)}
                          extraButtons={
                            <>
                              {e.estado === "preparando" && (
                                <button onClick={() => handleCambiarEstadoPaq(e.idenvio, "en_camino")} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">Salió</button>
                              )}
                              {e.estado === "en_camino" && (
                                <button onClick={() => handleCambiarEstadoPaq(e.idenvio, "entregado")} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200">Entregado</button>
                              )}
                            </>
                          } />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── RECOLECCIÓN ── */}
      {seccion === "recoleccion" && (
        <div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-xs text-purple-700">
            📦 Recolecciones en planta — el cliente pasa a recoger su pedido.
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Fecha","N° Pedido","Cliente","Bultos","Tipo","Fecha estimada","Estado","Quién recogió","Observaciones","Acciones"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recolecciones.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No hay recolecciones registradas</td></tr>
                  ) : recolecciones.map(r => (
                    <tr key={r.idenvio} className="hover:bg-gray-50 align-top">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{new Date(r.fecha_envio).toLocaleDateString("es-MX")}</td>
                      <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">{r.no_pedido}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{r.cliente}</td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{r.total_bultos}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                          {r.es_parcialidad ? "Parcialidad" : "Completo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {r.fecha_entrega_estimada ? new Date(r.fecha_entrega_estimada).toLocaleDateString("es-MX") : "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[r.estado]}`}>
                          {r.estado === "preparando" ? "Pendiente" : ESTADO_LABEL[r.estado]}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-[180px]"><DetalleRecoleccion r={r} /></td>
                      <td className="px-3 py-3 text-gray-500 text-xs">{r.observaciones || "-"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => handleGenerarNota(r.idenvio)} className="text-xs text-green-600 hover:text-green-800 font-medium">Nota</button>
                          {r.estado === "preparando" && (
                            <button onClick={() => setModalRecoleccion(r)}
                              className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 font-medium">
                              ✓ Marcar recogido
                            </button>
                          )}
                          {r.estado === "entregado" && <span className="text-xs text-green-600 font-medium">✓ Recogido</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTA DE REMISIÓN ── */}
      {seccion === "nota_remision" && (
        <div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-xs text-emerald-700">
            📋 Notas de remisión generadas desde el carrito multi-pedido.
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Fecha","Nota","Pedido(s)","Cliente","Tipo","Pedidos","Bultos","Chofer","Unidad","Estado","Quién recibió","Acciones"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {notasRemision.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">No hay notas de remisión registradas</td></tr>
                  ) : notasRemision.map(n => (
                    <tr key={n.idnota} className="hover:bg-gray-50 align-top">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{new Date(n.created_at).toLocaleDateString("es-MX")}</td>
                      <td className="px-3 py-3 text-emerald-700 font-bold whitespace-nowrap">{n.no_nota}</td>
                      <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">{n.no_pedido}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{n.cliente}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${n.tipo_entrega === "local" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                          {n.tipo_entrega === "local" ? "🚚 Local" : "🏭 Recolección"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{n.total_pedidos}</td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{n.total_bultos}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{n.chofer?.nombre ?? "-"}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{n.unidad?.nombre ?? "-"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${n.estado === "entregado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {n.estado === "entregado" ? "Entregado" : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-[160px]">
                        <DetalleRecoleccionNota n={n} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => handleGenerarNotaMulti(n.idnota)} className="text-xs text-green-600 hover:text-green-800 font-medium">Nota</button>
                          {n.estado === "pendiente" && (
                            <button onClick={() => abrirModalMarcarNota(n)}
                              className={`text-xs px-2 py-1 rounded font-medium ${n.tipo_entrega === "local" ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"}`}>
                              ✓ Marcar entregado
                            </button>
                          )}
                          {n.estado === "entregado" && <span className="text-xs text-green-600 font-medium">✓ Entregado</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      {editando && (
        <ModalEditarBitacora registro={editando} onClose={() => setEditando(null)}
          onGuardar={handleGuardar} guardando={guardando} form={formEdit} setForm={setFormEdit} />
      )}
      {modalCastores    !== null && <ModalFormatoCastores       idenvio={modalCastores}    onClose={() => setModalCastores(null)} />}
      {modalTresGuerras !== null && <ModalFormatoTresGuerras    idenvio={modalTresGuerras} onClose={() => setModalTresGuerras(null)} />}
      {modalGuiaGeneral !== null && <ModalGuiaPaqueteriaGeneral idenvio={modalGuiaGeneral} onClose={() => setModalGuiaGeneral(null)} />}
      {modalFotoPaq   !== null && <ModalFotoEnvio modo="paqueteria" envio={modalFotoPaq}     onClose={() => setModalFotoPaq(null)}   onCompletado={cargar} />}
      {modalFotoLocal !== null && <ModalFotoEnvio modo="local"      registro={modalFotoLocal} onClose={() => setModalFotoLocal(null)} onCompletado={cargar} />}
      {modalRecoleccion !== null && (
        <ModalMarcarRecoleccion recoleccion={modalRecoleccion}
          onClose={() => setModalRecoleccion(null)}
          onSuccess={async () => { setModalRecoleccion(null); await cargar(); }} />
      )}
      {modalNotaLocal !== null && (
        <ModalMarcarLocalNota nota={modalNotaLocal}
          onClose={() => setModalNotaLocal(null)}
          onSuccess={async () => { setModalNotaLocal(null); await cargar(); }} />
      )}
      {modalNotaRecoleccion !== null && (
        <ModalMarcarRecoleccionNota nota={modalNotaRecoleccion}
          onClose={() => setModalNotaRecoleccion(null)}
          onSuccess={async () => { setModalNotaRecoleccion(null); await cargar(); }} />
      )}
    </div>
  );
}
