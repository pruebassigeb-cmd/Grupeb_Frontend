import { useState, useEffect, useCallback, useRef } from "react";
import {
  getBitacora, registrarHoraSalida, registrarHoraLlegada,
  updateBitacora, getEnviosPaqueteria, updateEstadoEnvio,
  getOrCreateNotaRemision, getEnviosRecoleccion, getFotoRecoleccion,
  getNotasRemisionBitacora, getNotaRemisionMulti,
  marcarRecolectadoNotaRemision, marcarSalidaLocalNota, marcarEntregadoLocalNota,
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

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// ── Modal LLEGADA LOCAL (solo registra llegada + firma + obs) ──
function ModalMarcarLlegadaNota({ nota, onClose, onSuccess }: {
  nota: NotaRemisionBitacoraItem; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    hora_llegada: "",
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
        hora_llegada:      form.hora_llegada      || undefined,
        observacion:       form.observacion       || undefined,
        observacion_extra: form.observacion_extra || undefined,
        firma:             form.firma             || undefined,
      });
      if (foto) {
        const ext = foto.name.match(/\.[^/.]+$/)?.[0] || "";
        const archivoRenombrado = new File([foto], `nota-${nota.idnota}-${nota.no_nota}-${Date.now()}${ext}`, { type: foto.type });
        await subirArchivo(archivoRenombrado, "fotos-envios", undefined, undefined, nota.idnota);
      }
      onSuccess();
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al registrar llegada");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar Llegada / Entrega">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-blue-800">{nota.no_nota}</p>
          <p className="text-blue-600 text-xs mt-0.5">{nota.no_pedido} · {nota.cliente} · {nota.total_bultos} bulto(s)</p>
          {nota.chofer && <p className="text-blue-500 text-xs mt-0.5">Chofer: {nota.chofer.nombre}</p>}
          {nota.unidad && <p className="text-blue-500 text-xs">Unidad: {nota.unidad.nombre}</p>}
          {nota.local_datos?.hora_salida && (
            <p className="text-blue-500 text-xs mt-1">🚚 Salida registrada: {formatFechaHora(nota.local_datos.hora_salida)}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Fecha y Hora de Llegada</label>
          <input type="datetime-local" value={form.hora_llegada} onChange={e => setForm({ ...form, hora_llegada: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Observación</label>
          <select value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value as any })} className={inputClass}>
            <option value="">Sin observación</option>
            {OBSERVACIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Notas adicionales</label>
          <input type="text" value={form.observacion_extra} onChange={e => setForm({ ...form, observacion_extra: e.target.value })} className={inputClass} placeholder="Notas extras..." />
        </div>
        <div>
          <label className={labelClass}>Firma (nombre del responsable)</label>
          <input type="text" value={form.firma} onChange={e => setForm({ ...form, firma: e.target.value })} className={inputClass} placeholder="Nombre completo..." />
        </div>
        <div>
          <label className={labelClass}>Foto (recibo, comprobante, etc.)</label>
          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
              <button type="button" onClick={() => { setFoto(null); setPreview(null); if (inputFotoRef.current) inputFotoRef.current.value = ""; }}
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
          <button onClick={onClose} disabled={guardando} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={guardando} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
            {guardando ? "Registrando..." : "✓ Confirmar Llegada"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal RECOLECCIÓN NOTA ──
function ModalMarcarRecoleccionNota({ nota, onClose, onSuccess }: {
  nota: NotaRemisionBitacoraItem; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ nombre_quien_recogio: "", empresa: "", unidad_marca: "", unidad_modelo: "", unidad_placas: "" });
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
        const archivoRenombrado = new File([foto], `nota-${nota.idnota}-${nota.no_nota}-${Date.now()}${ext}`, { type: foto.type });
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
          <input type="text" value={form.nombre_quien_recogio} onChange={e => setForm({ ...form, nombre_quien_recogio: e.target.value })} className={inputClass} placeholder="Nombre completo..." />
        </div>
        <div>
          <label className={labelClass}>Empresa (opcional)</label>
          <input type="text" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} className={inputClass} placeholder="Razón social o nombre de empresa..." />
        </div>
        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Datos de la unidad (opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Marca</label>
              <input type="text" value={form.unidad_marca} onChange={e => setForm({ ...form, unidad_marca: e.target.value })} className={inputClass} placeholder="Ford, Toyota..." />
            </div>
            <div>
              <label className={labelClass}>Modelo</label>
              <input type="text" value={form.unidad_modelo} onChange={e => setForm({ ...form, unidad_modelo: e.target.value })} className={inputClass} placeholder="Transit, Ranger..." />
            </div>
          </div>
          <div>
            <label className={labelClass}>Placas</label>
            <input type="text" value={form.unidad_placas} onChange={e => setForm({ ...form, unidad_placas: e.target.value.toUpperCase() })} className={inputClass} placeholder="ABC-123" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Foto (recibo, comprobante, etc.)</label>
          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
              <button type="button" onClick={() => { setFoto(null); setPreview(null); if (inputFotoRef.current) inputFotoRef.current.value = ""; }}
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
          <button onClick={onClose} disabled={guardando} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={guardando || !form.nombre_quien_recogio.trim()}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {guardando ? "Registrando..." : "✓ Confirmar Entrega"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Panel de fotos para el detalle expandido ──
function PanelFotosEnvio({ idenvio, onAbrirModal }: { idenvio: number; onAbrirModal: () => void }) {
  const [fotos, setFotos] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getFotosEnvio(idenvio).then(setFotos).catch(() => {}).finally(() => setCargando(false));
  }, [idenvio]);

  if (cargando) return <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />;

  if (fotos.length === 0) {
    return (
      <button onClick={onAbrirModal}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-700 transition-colors font-medium">
        <IconoCamara /> Agregar foto
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 font-medium">{fotos.length} foto(s)</p>
      <div className="flex flex-wrap gap-2">
        {fotos.map(f => (
          <a key={f.id_archivo} href={f.url} target="_blank" rel="noopener noreferrer" title={f.nombre}>
            <img src={f.url} alt={f.nombre} className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer shadow-sm" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Panel de fotos para notas ──
function PanelFotosNota({ idnota }: { idnota: number }) {
  const [fotos, setFotos] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getFotosNota(idnota).then(setFotos).catch(() => {}).finally(() => setCargando(false));
  }, [idnota]);

  if (cargando) return <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />;
  if (fotos.length === 0) return <span className="text-xs text-gray-400">Sin fotos</span>;

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 font-medium">{fotos.length} foto(s)</p>
      <div className="flex flex-wrap gap-2">
        {fotos.map(f => (
          <a key={f.id_archivo} href={f.url} target="_blank" rel="noopener noreferrer">
            <img src={f.url} alt={f.nombre} className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition shadow-sm" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ── DetalleRecoleccion (pestaña Recolección) ──
function DetalleRecoleccionInline({ r }: { r: EnvioRecoleccion }) {
  const [fotos, setFotos] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const d = r.recoleccion_datos;

  useEffect(() => {
    getFotosEnvio(r.idenvio).then(setFotos).catch(() => {}).finally(() => setCargando(false));
  }, [r.idenvio]);

  if (!d) return <span className="text-gray-400 text-xs">Sin datos de recolección</span>;

  return (
    <div className="flex gap-6 flex-wrap text-xs">
      {/* Datos quien recogió */}
      <div className="space-y-1 min-w-[140px]">
        <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Quien recogió</p>
        <p className="font-semibold text-gray-800">{d.nombre_quien_recogio}</p>
        {d.empresa && <p className="text-gray-500">{d.empresa}</p>}
        {d.unidad_placas && (
          <p><span className="text-gray-500">Placas: </span><span className="font-mono text-gray-700">{d.unidad_placas}</span></p>
        )}
        {(d.unidad_marca || d.unidad_modelo) && (
          <p className="text-gray-500">{[d.unidad_marca, d.unidad_modelo].filter(Boolean).join(" ")}</p>
        )}
        {d.fecha_recogido && <p className="text-gray-400">{formatFechaHora(d.fecha_recogido)}</p>}
      </div>

      {/* Fotos */}
      <div className="space-y-1">
        <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Fotos</p>
        {cargando
          ? <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          : fotos.length > 0
            ? <div className="flex flex-wrap gap-2">
                {fotos.map(f => (
                  <a key={f.id_archivo} href={f.url} target="_blank" rel="noopener noreferrer">
                    <img src={f.url} alt={f.nombre} className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition shadow-sm" />
                  </a>
                ))}
              </div>
            : <span className="text-gray-400">Sin fotos</span>}
      </div>
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

  // búsqueda por sección
  const [busquedaLocal,   setBusquedaLocal]   = useState("");
  const [busquedaPaq,     setBusquedaPaq]     = useState("");
  const [busquedaRec,     setBusquedaRec]     = useState("");
  const [busquedaNota,    setBusquedaNota]    = useState("");

  // filas expandidas por sección
  const [expandidaLocal,   setExpandidaLocal]   = useState<number | null>(null);
  const [expandidaPaq,     setExpandidaPaq]     = useState<number | null>(null);
  const [expandidaRec,     setExpandidaRec]     = useState<number | null>(null);
  const [expandidaNota,    setExpandidaNota]    = useState<number | null>(null);

  const [modalFotoPaq,         setModalFotoPaq]         = useState<EnvioPaqueteria | null>(null);
  const [modalFotoLocal,       setModalFotoLocal]       = useState<BitacoraRegistro | null>(null);
  const [modalRecoleccion,     setModalRecoleccion]     = useState<EnvioRecoleccion | null>(null);
  const [modalNotaLlegada,     setModalNotaLlegada]     = useState<NotaRemisionBitacoraItem | null>(null);
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

  // Filtros client-side
  const q = (s: string) => s.toLowerCase();
  const registrosFiltrados    = registros.filter(r => !busquedaLocal.trim() || q(r.no_pedido).includes(q(busquedaLocal)) || q(r.cliente).includes(q(busquedaLocal)));
  const enviosPaqFiltrados    = enviosPaq.filter(e => !busquedaPaq.trim() || q(e.no_pedido).includes(q(busquedaPaq)) || q(e.cliente).includes(q(busquedaPaq)) || q(e.numero_guia || "").includes(q(busquedaPaq)));
  const recoleccionesFiltradas = recolecciones.filter(r => !busquedaRec.trim() || q(r.no_pedido).includes(q(busquedaRec)) || q(r.cliente).includes(q(busquedaRec)));
  const notasFiltradas        = notasRemision.filter(n => !busquedaNota.trim() || q(n.no_nota).includes(q(busquedaNota)) || q(n.no_pedido).includes(q(busquedaNota)) || q(n.cliente).includes(q(busquedaNota)));

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

  const handleMarcarSalidaNota = async (idnota: number) => {
    try { await marcarSalidaLocalNota(idnota); await cargar(); }
    catch { showAlert("Error al registrar salida"); }
  };

  const abrirModalMarcarNota = (n: NotaRemisionBitacoraItem) => {
    if (n.tipo_entrega === "local") setModalNotaLlegada(n);
    else setModalNotaRecoleccion(n);
  };

  const toggleFila = (
    id: number,
    get: number | null,
    set: (v: number | null) => void
  ) => set(get === id ? null : id);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Selector de sección */}
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

      {/* ══════════════════════════════════════════════════════════
          LOCAL
      ══════════════════════════════════════════════════════════ */}
      {seccion === "local" && (
        <div>
          <div className="bg-gray-50 rounded-lg p-3 mb-4 flex flex-wrap gap-4 text-xs text-gray-600">
            {OBSERVACIONES.map(o => (
              <span key={o.value}><strong>{o.value}</strong> — {o.label.split(" — ")[1]}</span>
            ))}
          </div>
          {/* Buscador */}
          <div className="mb-4 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={busquedaLocal} onChange={e => setBusquedaLocal(e.target.value)}
              placeholder="Buscar por N° pedido o cliente..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            {busquedaLocal && (
              <button onClick={() => setBusquedaLocal("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["", "Fecha", "N° Pedido", "Cliente", "Tipo Envío", "Estado", ""].map((h, i) => (
                      <th key={i} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registros.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay registros en la bitácora</td></tr>
                  ) : registrosFiltrados.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin resultados para "{busquedaLocal}"</td></tr>
                  ) : registrosFiltrados.map(r => {
                    const expandido = expandidaLocal === r.idbitacora;
                    return (
                      <>
                        {/* FILA PRINCIPAL */}
                        <tr
                          key={r.idbitacora}
                          className={`cursor-pointer transition-colors ${expandido ? "bg-blue-50" : "hover:bg-gray-50"}`}
                          onClick={() => toggleFila(r.idbitacora, expandidaLocal, setExpandidaLocal)}
                        >
                          <td className="px-3 py-3 w-8">
                            <ChevronIcon open={expandido} />
                          </td>
                          <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">
                            {new Date(r.fecha).toLocaleDateString("es-MX")}
                          </td>
                          <td className="px-3 py-3 text-blue-600 font-bold whitespace-nowrap">{r.no_pedido}</td>
                          <td className="px-3 py-3 text-gray-800 whitespace-nowrap font-medium">{r.cliente}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.envio.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                              {r.envio.es_parcialidad ? "Parcialidad" : "Completo"}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[r.envio.estado]}`}>
                                {ESTADO_LABEL[r.envio.estado]}
                              </span>
                              {r.observacion && (
                                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{r.observacion}</span>
                              )}
                              {r.firma && (
                                <span className="text-xs text-gray-500 truncate max-w-[90px]">{r.firma}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs text-gray-400">{expandido ? "Ocultar" : "Ver detalle"}</span>
                          </td>
                        </tr>

                        {/* FILA EXPANDIDA */}
                        {expandido && (
                          <tr key={`det-${r.idbitacora}`} className="bg-blue-50 border-b border-blue-100">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">

                                {/* Unidad y repartidor */}
                                <div className="space-y-2">
                                  <p className="text-gray-400 uppercase tracking-wide font-semibold">Unidad / Repartidor</p>
                                  <p className="text-gray-700 font-medium">{r.unidad?.nombre ?? "—"}</p>
                                  <p className="text-gray-600">{r.chofer?.nombre ?? "—"}</p>
                                </div>

                                {/* Horarios */}
                                <div className="space-y-2">
                                  <p className="text-gray-400 uppercase tracking-wide font-semibold">Horarios</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Salida:</span>
                                    {r.hora_salida
                                      ? <span className="text-gray-700 font-medium">{formatFechaHora(r.hora_salida)}</span>
                                      : <button onClick={e => { e.stopPropagation(); handleHoraSalida(r.idbitacora); }}
                                          className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 font-medium">
                                          Marcar salida
                                        </button>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Llegada:</span>
                                    {r.hora_llegada
                                      ? <span className="text-gray-700 font-medium">{formatFechaHora(r.hora_llegada)}</span>
                                      : r.hora_salida
                                        ? <button onClick={e => { e.stopPropagation(); handleHoraLlegada(r.idbitacora); }}
                                            className="px-2 py-0.5 bg-green-100 text-green-800 rounded hover:bg-green-200 font-medium">
                                            Marcar llegada
                                          </button>
                                        : <span className="text-gray-300">—</span>}
                                  </div>
                                </div>

                                {/* Observación y firma */}
                                <div className="space-y-2">
                                  <p className="text-gray-400 uppercase tracking-wide font-semibold">Observación / Firma</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">N° Guía:</span>
                                    <span className="font-mono text-gray-700">{r.envio.numero_guia || "—"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Obs:</span>
                                    {r.observacion
                                      ? <span className="font-bold text-gray-700">{r.observacion}</span>
                                      : <span className="text-gray-300">—</span>}
                                  </div>
                                  {r.observacion_extra && <p className="text-gray-500 italic">{r.observacion_extra}</p>}
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Firma:</span>
                                    <span className="text-gray-700">{r.firma || "—"}</span>
                                  </div>
                                </div>

                                {/* Fotos */}
                                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                                  <p className="text-gray-400 uppercase tracking-wide font-semibold">Fotos</p>
                                  <PanelFotosEnvio
                                    idenvio={r.envio.idenvio}
                                    onAbrirModal={() => setModalFotoLocal(r)}
                                  />
                                </div>

                                {/* Acciones */}
                                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                  <p className="text-gray-400 uppercase tracking-wide font-semibold">Acciones</p>
                                  <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => abrirEdicion(r)}
                                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors">
                                      ✏️ Editar registro
                                    </button>
                                    <button onClick={() => handleGenerarNota(r.envio.idenvio)}
                                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors">
                                      📄 Nota de remisión
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PAQUETERÍA
      ══════════════════════════════════════════════════════════ */}
      {seccion === "paqueteria" && (
        <div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 text-xs text-indigo-700">
            La responsabilidad del envío termina al obtener el número de guía de la paquetería.
          </div>
          {/* Buscador */}
          <div className="mb-4 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={busquedaPaq} onChange={e => setBusquedaPaq(e.target.value)}
              placeholder="Buscar por N° pedido, cliente o N° guía..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
            {busquedaPaq && (
              <button onClick={() => setBusquedaPaq("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["", "Fecha", "N° Pedido", "Cliente", "Paquetería", "Estado", ""].map((h, i) => (
                      <th key={i} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {enviosPaq.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay envíos por paquetería registrados</td></tr>
                  ) : enviosPaqFiltrados.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin resultados para "{busquedaPaq}"</td></tr>
                  ) : enviosPaqFiltrados.map(e => {
                    const expandido = expandidaPaq === e.idenvio;
                    return (
                      <>
                        {/* FILA PRINCIPAL */}
                        <tr
                          key={e.idenvio}
                          className={`cursor-pointer transition-colors ${expandido ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                          onClick={() => toggleFila(e.idenvio, expandidaPaq, setExpandidaPaq)}
                        >
                          <td className="px-3 py-3 w-8"><ChevronIcon open={expandido} /></td>
                          <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{new Date(e.fecha_envio).toLocaleDateString("es-MX")}</td>
                          <td className="px-3 py-3 text-blue-600 font-bold whitespace-nowrap">{e.no_pedido}</td>
                          <td className="px-3 py-3 text-gray-800 whitespace-nowrap font-medium">{e.cliente}</td>
                          <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{e.paqueteria.nombre}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[e.estado]}`}>{ESTADO_LABEL[e.estado]}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs text-gray-400">{expandido ? "Ocultar" : "Ver detalle"}</span>
                          </td>
                        </tr>

                        {/* FILA EXPANDIDA */}
                        {expandido && (
                          <tr key={`det-${e.idenvio}`} className="bg-indigo-50 border-b border-indigo-100">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="flex gap-6 flex-wrap text-xs">

                                {/* Columna izquierda: detalles + acciones */}
                                <div className="flex gap-6 flex-wrap flex-1 min-w-0">
                                  <div className="space-y-1.5 min-w-[160px]">
                                    <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2">Detalles del envío</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">N° Guía:</span>
                                      {e.numero_guia
                                        ? <span className="font-mono font-medium text-gray-700">{e.numero_guia}</span>
                                        : <span className="text-orange-500 font-medium">Sin guía</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">Bultos:</span>
                                      <span className="font-medium text-gray-700">{e.total_bultos}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">Tipo:</span>
                                      <span className={`px-2 py-0.5 rounded-full font-medium ${e.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                                        {e.es_parcialidad ? "Parcialidad" : "Completo"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">Flete:</span>
                                      <span className="text-gray-700 font-medium">
                                        {e.costo_flete != null ? `$${Number(e.costo_flete).toLocaleString("es-MX")}` : "—"}
                                      </span>
                                    </div>
                                    {e.fecha_entrega_estimada && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Entrega est.:</span>
                                        <span className="text-gray-700">{new Date(e.fecha_entrega_estimada).toLocaleDateString("es-MX")}</span>
                                      </div>
                                    )}
                                    {e.observaciones && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-gray-500">Obs.:</span>
                                        <span className="text-gray-600 italic">{e.observaciones}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Acciones */}
                                  <div className="space-y-2" onClick={ev => ev.stopPropagation()}>
                                    <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2">Acciones</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {e.estado === "pendiente" && (
                                        <button onClick={() => handleCambiarEstadoPaq(e.idenvio, "en_camino")}
                                          className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg font-medium hover:bg-yellow-200">
                                          🚚 Marcar salida
                                        </button>
                                      )}
                                      {e.estado === "en_camino" && (
                                        <button onClick={() => handleCambiarEstadoPaq(e.idenvio, "entregado")}
                                          className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg font-medium hover:bg-green-200">
                                          ✓ Marcar entregado
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Columna derecha: fotos */}
                                <div className="space-y-2 shrink-0">
                                  <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2">Fotos</p>
                                  <PanelFotosEnvio idenvio={e.idenvio} onAbrirModal={() => setModalFotoPaq(e)} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          RECOLECCIÓN
      ══════════════════════════════════════════════════════════ */}
      {seccion === "recoleccion" && (
        <div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-xs text-purple-700">
            📦 Recolecciones en planta — el cliente pasa a recoger su pedido.
          </div>
          {/* Buscador */}
          <div className="mb-4 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={busquedaRec} onChange={e => setBusquedaRec(e.target.value)}
              placeholder="Buscar por N° pedido o cliente..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
            {busquedaRec && (
              <button onClick={() => setBusquedaRec("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["", "Fecha", "N° Pedido", "Cliente", "Estado", ""].map((h, i) => (
                      <th key={i} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recolecciones.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay recolecciones registradas</td></tr>
                  ) : recoleccionesFiltradas.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin resultados para "{busquedaRec}"</td></tr>
                  ) : recoleccionesFiltradas.map(r => {
                    const expandido = expandidaRec === r.idenvio;
                    return (
                      <>
                        <tr
                          key={r.idenvio}
                          className={`cursor-pointer transition-colors ${expandido ? "bg-purple-50" : "hover:bg-gray-50"}`}
                          onClick={() => toggleFila(r.idenvio, expandidaRec, setExpandidaRec)}
                        >
                          <td className="px-3 py-3 w-8"><ChevronIcon open={expandido} /></td>
                          <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{new Date(r.fecha_envio).toLocaleDateString("es-MX")}</td>
                          <td className="px-3 py-3 text-blue-600 font-bold whitespace-nowrap">{r.no_pedido}</td>
                          <td className="px-3 py-3 text-gray-800 whitespace-nowrap font-medium">{r.cliente}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[r.estado]}`}>
                              {ESTADO_LABEL[r.estado] ?? r.estado}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs text-gray-400">{expandido ? "Ocultar" : "Ver detalle"}</span>
                          </td>
                        </tr>

                        {expandido && (
                          <tr key={`det-${r.idenvio}`} className="bg-purple-50 border-b border-purple-100">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="flex gap-6 flex-wrap text-xs">

                                {/* Detalles + acciones */}
                                <div className="flex gap-6 flex-wrap flex-1 min-w-0">
                                  <div className="space-y-1.5 min-w-[140px]">
                                    <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2">Detalles</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">Bultos:</span>
                                      <span className="font-medium text-gray-700">{r.total_bultos}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">Tipo:</span>
                                      <span className={`px-2 py-0.5 rounded-full font-medium ${r.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                                        {r.es_parcialidad ? "Parcialidad" : "Completo"}
                                      </span>
                                    </div>
                                    {r.fecha_entrega_estimada && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Fecha est.:</span>
                                        <span className="text-gray-700">{new Date(r.fecha_entrega_estimada).toLocaleDateString("es-MX")}</span>
                                      </div>
                                    )}
                                    {r.observaciones && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-gray-500">Obs.:</span>
                                        <span className="text-gray-600 italic">{r.observaciones}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Acciones */}
                                  <div className="space-y-2" onClick={ev => ev.stopPropagation()}>
                                    <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2">Acciones</p>
                                    <div className="flex gap-2 flex-wrap">
                                      <button onClick={() => handleGenerarNota(r.idenvio)}
                                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">
                                        📄 Nota de remisión
                                      </button>
                                      {r.estado === "pendiente" && (
                                        <button onClick={() => setModalRecoleccion(r)}
                                          className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg font-medium hover:bg-purple-200">
                                          ✓ Marcar recogido
                                        </button>
                                      )}
                                      {r.estado === "entregado" && (
                                        <span className="text-xs text-green-600 font-medium self-center">✓ Ya recogido</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Datos recolección + fotos */}
                                <div className="shrink-0">
                                  <DetalleRecoleccionInline r={r} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          NOTA DE REMISIÓN
      ══════════════════════════════════════════════════════════ */}
      {seccion === "nota_remision" && (
        <div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-xs text-emerald-700">
            📋 Notas de remisión generadas desde el carrito multi-pedido.
          </div>
          {/* Buscador */}
          <div className="mb-4 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={busquedaNota} onChange={e => setBusquedaNota(e.target.value)}
              placeholder="Buscar por N° nota, N° pedido o cliente..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
            {busquedaNota && (
              <button onClick={() => setBusquedaNota("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["", "Fecha", "Nota", "Cliente", "Tipo", "Estado", ""].map((h, i) => (
                      <th key={i} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {notasRemision.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay notas de remisión registradas</td></tr>
                  ) : notasFiltradas.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin resultados para "{busquedaNota}"</td></tr>
                  ) : notasFiltradas.map(n => {
                    const expandido = expandidaNota === n.idnota;
                    return (
                      <>
                        <tr
                          key={n.idnota}
                          className={`cursor-pointer transition-colors ${expandido ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                          onClick={() => toggleFila(n.idnota, expandidaNota, setExpandidaNota)}
                        >
                          <td className="px-3 py-3 w-8"><ChevronIcon open={expandido} /></td>
                          <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{new Date(n.created_at).toLocaleDateString("es-MX")}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="text-emerald-700 font-bold">{n.no_nota}</span>
                            <span className="ml-2 text-blue-600 text-xs font-medium">{n.no_pedido}</span>
                          </td>
                          <td className="px-3 py-3 text-gray-800 whitespace-nowrap font-medium">{n.cliente}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${n.tipo_entrega === "local" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                              {n.tipo_entrega === "local" ? "🚚 Local" : "🏭 Recolección"}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {(() => {
                              if (n.estado === "entregado")
                                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Entregado</span>;
                              if (n.tipo_entrega === "local" && n.local_datos?.hora_salida)
                                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">En camino</span>;
                              return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Pendiente</span>;
                            })()}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs text-gray-400">{expandido ? "Ocultar" : "Ver detalle"}</span>
                          </td>
                        </tr>

                        {expandido && (
                          <tr key={`det-${n.idnota}`} className="bg-emerald-50 border-b border-emerald-100">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="flex gap-6 flex-wrap text-xs">

                                {/* Detalles + datos entrega + acciones */}
                                <div className="flex gap-6 flex-wrap flex-1 min-w-0">

                                  {/* Info */}
                                  <div className="space-y-1.5 min-w-[160px]">
                                    <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2">Detalles</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">Pedido(s):</span>
                                      <span className="text-blue-600 font-medium">{n.no_pedido}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">Total pedidos:</span>
                                      <span className="font-medium text-gray-700">{n.total_pedidos}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">Total bultos:</span>
                                      <span className="font-medium text-gray-700">{n.total_bultos}</span>
                                    </div>
                                    {n.chofer && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Chofer:</span>
                                        <span className="text-gray-700">{n.chofer.nombre}</span>
                                      </div>
                                    )}
                                    {n.unidad && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Unidad:</span>
                                        <span className="text-gray-700">{n.unidad.nombre}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Observaciones de la nota */}
                                  {n.observaciones && (
                                    <div className="space-y-1 min-w-[150px] max-w-[220px]">
                                      <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Observaciones</p>
                                      <p className="text-gray-700 text-xs bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5 italic">{n.observaciones}</p>
                                    </div>
                                  )}

                                  {/* Datos entrega */}
                                  <div className="space-y-1.5 min-w-[150px]">
                                    <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2">
                                      {n.tipo_entrega === "local" ? "Datos entrega" : "Datos recolección"}
                                    </p>
                                    {n.tipo_entrega === "local" && n.local_datos ? (
                                      <>
                                        {n.local_datos.firma && <p><span className="text-gray-500">Firma: </span><span className="font-medium text-gray-800">{n.local_datos.firma}</span></p>}
                                        {n.local_datos.hora_salida && <p><span className="text-gray-500">Salida: </span>{formatFechaHora(n.local_datos.hora_salida)}</p>}
                                        {n.local_datos.hora_llegada && <p><span className="text-gray-500">Llegada: </span>{formatFechaHora(n.local_datos.hora_llegada)}</p>}
                                        {n.local_datos.observacion && <p><span className="text-gray-500">Obs: </span><span className="font-bold">{n.local_datos.observacion}</span></p>}
                                        {n.local_datos.observacion_extra && <p className="text-gray-500 italic">{n.local_datos.observacion_extra}</p>}
                                      </>
                                    ) : n.tipo_entrega === "recoleccion" && n.recoleccion_datos ? (
                                      <>
                                        <p className="font-semibold text-gray-800">{n.recoleccion_datos.nombre_quien_recogio}</p>
                                        {n.recoleccion_datos.empresa && <p className="text-gray-500">{n.recoleccion_datos.empresa}</p>}
                                        {n.recoleccion_datos.unidad_placas && <p><span className="text-gray-500">Placas: </span><span className="font-mono">{n.recoleccion_datos.unidad_placas}</span></p>}
                                        {(n.recoleccion_datos.unidad_marca || n.recoleccion_datos.unidad_modelo) && (
                                          <p className="text-gray-500">{[n.recoleccion_datos.unidad_marca, n.recoleccion_datos.unidad_modelo].filter(Boolean).join(" ")}</p>
                                        )}
                                        {n.recoleccion_datos.fecha && <p className="text-gray-400">{formatFechaHora(n.recoleccion_datos.fecha)}</p>}
                                      </>
                                    ) : (
                                      <span className="text-gray-400">Sin datos aún</span>
                                    )}
                                  </div>

                                  {/* Acciones */}
                                  <div className="space-y-2" onClick={ev => ev.stopPropagation()}>
                                    <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2">Acciones</p>
                                    <div className="flex gap-2 flex-wrap">
                                      <button onClick={() => handleGenerarNotaMulti(n.idnota)}
                                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">
                                        📄 Descargar nota
                                      </button>

                                      {/* LOCAL: flujo salida → llegada */}
                                      {n.tipo_entrega === "local" && n.estado === "pendiente" && !n.local_datos?.hora_salida && (
                                        <button onClick={() => handleMarcarSalidaNota(n.idnota)}
                                          className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg font-medium hover:bg-yellow-200">
                                          🚚 Marcar salida
                                        </button>
                                      )}
                                      {n.tipo_entrega === "local" && n.estado === "pendiente" && n.local_datos?.hora_salida && (
                                        <button onClick={() => abrirModalMarcarNota(n)}
                                          className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-medium hover:bg-blue-200">
                                          ✓ Marcar llegada
                                        </button>
                                      )}

                                      {/* RECOLECCIÓN */}
                                      {n.tipo_entrega === "recoleccion" && n.estado === "pendiente" && (
                                        <button onClick={() => abrirModalMarcarNota(n)}
                                          className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg font-medium hover:bg-emerald-200">
                                          ✓ Marcar recogido
                                        </button>
                                      )}

                                      {n.estado === "entregado" && (
                                        <span className="text-xs text-green-600 font-medium self-center">✓ Entregado</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Fotos */}
                                <div className="shrink-0 space-y-2">
                                  <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2">Fotos</p>
                                  <PanelFotosNota idnota={n.idnota} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modales ── */}
      {editando && (
        <ModalEditarBitacora registro={editando} onClose={() => setEditando(null)}
          onGuardar={handleGuardar} guardando={guardando} form={formEdit} setForm={setFormEdit} />
      )}
      {modalFotoPaq   !== null && <ModalFotoEnvio modo="paqueteria" envio={modalFotoPaq}     onClose={() => setModalFotoPaq(null)}   onCompletado={cargar} />}
      {modalFotoLocal !== null && <ModalFotoEnvio modo="local"      registro={modalFotoLocal} onClose={() => setModalFotoLocal(null)} onCompletado={cargar} />}
      {modalRecoleccion !== null && (
        <ModalMarcarRecoleccion recoleccion={modalRecoleccion}
          onClose={() => setModalRecoleccion(null)}
          onSuccess={async () => { setModalRecoleccion(null); await cargar(); }} />
      )}
      {modalNotaLlegada !== null && (
        <ModalMarcarLlegadaNota nota={modalNotaLlegada}
          onClose={() => setModalNotaLlegada(null)}
          onSuccess={async () => { setModalNotaLlegada(null); await cargar(); }} />
      )}
      {modalNotaRecoleccion !== null && (
        <ModalMarcarRecoleccionNota nota={modalNotaRecoleccion}
          onClose={() => setModalNotaRecoleccion(null)}
          onSuccess={async () => { setModalNotaRecoleccion(null); await cargar(); }} />
      )}
    </div>
  );
}