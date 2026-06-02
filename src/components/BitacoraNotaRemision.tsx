import { useState, useEffect, useRef } from "react";
import {
  getNotasRemisionBitacora, getNotaRemisionMulti,
  marcarRecolectadoNotaRemision, marcarSalidaLocalNota, marcarEntregadoLocalNota,
} from "../services/enviosService";
import { getFotosNota, subirArchivo, type Archivo } from "../services/archivos.service";
import { generarNotaRemisionMulti } from "../utils/generarNotaRemision";
import { OBSERVACIONES, formatFechaHora, inputClass, labelClass } from "./enviosConstants";
import Modal from "./Modal";
import { showAlert } from "./CustomAlert";
import type { NotaRemisionBitacoraItem } from "../types/envios.types";

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const OBS_LABEL: Record<string, string> = {
  E: "Entregado", RA: "Rechazado — Ausente", RD: "Rechazado — Dirección", PD: "Pendiente de entrega",
};

function Campo({ label, value, mono = false, badgeClass }: { label: string; value?: string | null; mono?: boolean; badgeClass?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">{label}</p>
      {badgeClass
        ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>{value}</span>
        : <p className={`text-xs text-gray-800 ${mono ? "font-mono" : "font-medium"} break-words`}>{value}</p>
      }
    </div>
  );
}

function Seccion({ title, cols = 2, children }: { title: string; cols?: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100 pb-1 mb-2">{title}</p>
      <div className={`grid grid-cols-${cols} gap-x-4 gap-y-2`}>{children}</div>
    </div>
  );
}

function PanelFotosNota({ idnota }: { idnota: number }) {
  const [fotos, setFotos] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => { getFotosNota(idnota).then(setFotos).catch(() => {}).finally(() => setCargando(false)); }, [idnota]);
  if (cargando) return <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />;
  if (!fotos.length) return <span className="text-xs text-gray-400">Sin fotos</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {fotos.map(f => (
        <a key={f.id_archivo} href={f.url} target="_blank" rel="noopener noreferrer">
          <img src={f.url} alt={f.nombre} className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition shadow-sm" />
        </a>
      ))}
    </div>
  );
}

// ── Modal llegada local ───────────────────────────────────────
function ModalMarcarLlegadaNota({ nota, onClose, onSuccess }: { nota: NotaRemisionBitacoraItem; onClose: () => void; onSuccess: () => void }) {
  const d = nota.local_datos;
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const dt = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };
  const [form, setForm] = useState({
    hora_llegada:     toLocal(d?.hora_llegada ?? null),
    observacion:      (d?.observacion ?? "") as "" | "E" | "RA" | "RD" | "PD",
    observacion_extra: d?.observacion_extra ?? "",
    firma:            d?.firma ?? "",
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fotoExistente, setFotoExistente] = useState<Archivo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getFotosNota(nota.idnota)
      .then(fotos => { if (fotos[0]) { setFotoExistente(fotos[0]); setPreview(fotos[0].url); } })
      .catch(() => {});
  }, [nota.idnota]);

  const handleSubmit = async () => {
    setGuardando(true);
    try {
      await marcarEntregadoLocalNota(nota.idnota, { hora_llegada: form.hora_llegada || undefined, observacion: form.observacion || undefined, observacion_extra: form.observacion_extra || undefined, firma: form.firma || undefined });
      if (foto) {
        const ext = foto.name.match(/\.[^/.]+$/)?.[0] || "";
        await subirArchivo(new File([foto], `nota-${nota.idnota}-${nota.no_nota}-${Date.now()}${ext}`, { type: foto.type }), "fotos-envios", undefined, undefined, nota.idnota);
      }
      onSuccess();
    } catch (err: any) { showAlert(err.response?.data?.error || "Error al registrar llegada"); }
    finally { setGuardando(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar Llegada / Entrega">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-blue-800">{nota.no_nota}</p>
          <p className="text-blue-600 text-xs mt-0.5">{nota.no_pedido} · {nota.cliente} · {nota.total_bultos} bulto(s)</p>
          {nota.chofer && <p className="text-blue-500 text-xs mt-0.5">Chofer: {nota.chofer.nombre}</p>}
          {nota.unidad && <p className="text-blue-500 text-xs">Unidad: {nota.unidad.nombre}</p>}
          {nota.local_datos?.hora_salida && <p className="text-blue-500 text-xs mt-1">🚚 Salida: {formatFechaHora(nota.local_datos.hora_salida)}</p>}
        </div>
        <div><label className={labelClass}>Fecha y Hora de Llegada</label>
          <input type="datetime-local" value={form.hora_llegada} onChange={e => setForm({...form, hora_llegada: e.target.value})} className={inputClass} /></div>
        <div><label className={labelClass}>Observación</label>
          <select value={form.observacion} onChange={e => setForm({...form, observacion: e.target.value as any})} className={inputClass}>
            <option value="">Sin observación</option>
            {OBSERVACIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></div>
        <div><label className={labelClass}>Notas adicionales</label>
          <input type="text" value={form.observacion_extra} onChange={e => setForm({...form, observacion_extra: e.target.value})} className={inputClass} placeholder="Notas extras..." /></div>
        <div><label className={labelClass}>Firma (nombre del responsable)</label>
          <input type="text" value={form.firma} onChange={e => setForm({...form, firma: e.target.value})} className={inputClass} placeholder="Nombre completo..." /></div>
        <div>
          <label className={labelClass}>Foto (recibo, comprobante, etc.)</label>
          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f){setFoto(f);setPreview(URL.createObjectURL(f));} }} />
          {preview ? (
            <div className="relative"><img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
              <button type="button" onClick={() => {setFoto(null);setPreview(null);if(inputFotoRef.current)inputFotoRef.current.value="";}} className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-200">✕</button>
            </div>
          ) : (
            <button type="button" onClick={() => inputFotoRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
              📷 Tomar o seleccionar foto
            </button>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} disabled={guardando} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={guardando} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">{guardando ? "Registrando..." : "✓ Confirmar Llegada"}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal recolección nota — igual que recolección individual + observacion_extra ──
function ModalMarcarRecoleccionNota({ nota, onClose, onSuccess }: { nota: NotaRemisionBitacoraItem; onClose: () => void; onSuccess: () => void }) {
  const rd = nota.recoleccion_datos;
  const [form, setForm] = useState({
    nombre_quien_recogio: rd?.nombre_quien_recogio ?? "",
    empresa:              rd?.empresa              ?? "",
    unidad_marca:         rd?.unidad_marca         ?? "",
    unidad_modelo:        rd?.unidad_modelo        ?? "",
    unidad_placas:        rd?.unidad_placas        ?? "",
    observacion_extra:    rd?.observacion_extra    ?? "",
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fotoExistente, setFotoExistente] = useState<Archivo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getFotosNota(nota.idnota)
      .then(fotos => { if (fotos[0]) { setFotoExistente(fotos[0]); setPreview(fotos[0].url); } })
      .catch(() => {});
  }, [nota.idnota]);

  const handleSubmit = async () => {
    if (!form.nombre_quien_recogio.trim()) { showAlert("El nombre de quien recogió es obligatorio"); return; }
    setGuardando(true);
    try {
      await marcarRecolectadoNotaRemision(nota.idnota, {
        nombre_quien_recogio: form.nombre_quien_recogio,
        empresa: form.empresa || undefined,
        unidad_marca: form.unidad_marca || undefined,
        unidad_modelo: form.unidad_modelo || undefined,
        unidad_placas: form.unidad_placas || undefined,
        observacion_extra: form.observacion_extra || undefined,
      });
      if (foto) {
        const ext = foto.name.match(/\.[^/.]+$/)?.[0] || "";
        await subirArchivo(new File([foto], `nota-${nota.idnota}-${nota.no_nota}-${Date.now()}${ext}`, { type: foto.type }), "fotos-envios", undefined, undefined, nota.idnota);
      }
      onSuccess();
    } catch (err: any) { showAlert(err.response?.data?.error || "Error al registrar recolección"); }
    finally { setGuardando(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar Entrega de Nota">
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-emerald-800">{nota.no_nota}</p>
          <p className="text-emerald-600 text-xs mt-0.5">{nota.no_pedido} · {nota.cliente} · {nota.total_bultos} bulto(s)</p>
        </div>
        <div><label className={labelClass}>Nombre de quien recogió *</label>
          <input type="text" value={form.nombre_quien_recogio} onChange={e => setForm({...form, nombre_quien_recogio: e.target.value})} className={inputClass} placeholder="Nombre completo..." /></div>
        <div><label className={labelClass}>Empresa (opcional)</label>
          <input type="text" value={form.empresa} onChange={e => setForm({...form, empresa: e.target.value})} className={inputClass} placeholder="Razón social o nombre de empresa..." /></div>
        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Datos de la unidad (opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Marca</label><input type="text" value={form.unidad_marca} onChange={e => setForm({...form, unidad_marca: e.target.value})} className={inputClass} placeholder="Ford, Toyota..." /></div>
            <div><label className={labelClass}>Modelo</label><input type="text" value={form.unidad_modelo} onChange={e => setForm({...form, unidad_modelo: e.target.value})} className={inputClass} placeholder="Transit, Ranger..." /></div>
          </div>
          <div><label className={labelClass}>Placas</label><input type="text" value={form.unidad_placas} onChange={e => setForm({...form, unidad_placas: e.target.value.toUpperCase()})} className={inputClass} placeholder="ABC-123" /></div>
        </div>
        {/* observacion_extra — igual que recolección individual */}
        <div><label className={labelClass}>Observaciones de entrega</label>
          <input type="text" value={form.observacion_extra} onChange={e => setForm({...form, observacion_extra: e.target.value})} className={inputClass} placeholder="Notas u observaciones de la entrega..." /></div>
        <div>
          <label className={labelClass}>Foto (recibo, comprobante, etc.)</label>
          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f){setFoto(f);setPreview(URL.createObjectURL(f));} }} />
          {preview ? (
            <div className="relative"><img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
              <button type="button" onClick={() => {setFoto(null);setPreview(null);if(inputFotoRef.current)inputFotoRef.current.value="";}} className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-200">✕</button>
            </div>
          ) : (
            <button type="button" onClick={() => inputFotoRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
              📷 Tomar o seleccionar foto
            </button>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} disabled={guardando} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={guardando || !form.nombre_quien_recogio.trim()} className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50">{guardando ? "Registrando..." : "✓ Confirmar Entrega"}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function BitacoraNotaRemision() {
  const [notasRemision, setNotasRemision] = useState<NotaRemisionBitacoraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [expandida, setExpandida] = useState<number | null>(null);
  const [modalNotaLlegada, setModalNotaLlegada] = useState<NotaRemisionBitacoraItem | null>(null);
  const [modalNotaRecoleccion, setModalNotaRecoleccion] = useState<NotaRemisionBitacoraItem | null>(null);

  const cargar = async () => {
    setLoading(true);
    try { setNotasRemision(await getNotasRemisionBitacora()); }
    catch { showAlert("Error al cargar notas de remisión"); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const filtradas = notasRemision.filter(n =>
    !busqueda.trim() ||
    n.no_nota.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.no_pedido.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.cliente.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleGenerarNotaMulti = async (idnota: number) => {
    try { await generarNotaRemisionMulti(await getNotaRemisionMulti(idnota)); }
    catch { showAlert("Error al generar nota de remisión"); }
  };

  const handleMarcarSalidaNota = async (idnota: number) => {
    try { await marcarSalidaLocalNota(idnota); await cargar(); }
    catch { showAlert("Error al registrar salida"); }
  };

  const abrirModalMarcarNota = (n: NotaRemisionBitacoraItem) => {
    if (n.tipo_entrega === "local") setModalNotaLlegada(n);
    else setModalNotaRecoleccion(n);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-xs text-emerald-700">
        📋 Notas de remisión generadas desde el carrito multi-pedido.
      </div>
      <div className="mb-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por N° nota, N° pedido o cliente..."
          className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
        {busqueda && <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>}
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
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin resultados para "{busqueda}"</td></tr>
              ) : filtradas.map(n => {
                const exp = expandida === n.idnota;
                return (
                  <>
                    <tr key={n.idnota} className={`cursor-pointer transition-colors ${exp ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                      onClick={() => setExpandida(exp ? null : n.idnota)}>
                      <td className="px-3 py-3 w-8"><ChevronIcon open={exp} /></td>
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
                        {n.estado === "entregado"
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Entregado</span>
                          : n.tipo_entrega === "local" && n.local_datos?.hora_salida
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">En camino</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Pendiente</span>
                        }
                      </td>
                      <td className="px-3 py-3 text-right"><span className="text-xs text-gray-400">{exp ? "Ocultar" : "Ver detalle"}</span></td>
                    </tr>

                    {exp && (
                      <tr key={`det-${n.idnota}`} className="bg-slate-50 border-b border-emerald-100">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">

                            {/* Info general */}
                            <Seccion title="Detalles">
                              <Campo label="Pedido(s)" value={n.no_pedido} />
                              <Campo label="Total pedidos" value={String(n.total_pedidos)} />
                              <Campo label="Total bultos" value={String(n.total_bultos)} />
                              {n.chofer && <Campo label="Chofer" value={n.chofer.nombre} />}
                              {n.unidad && <div className="col-span-2"><Campo label="Unidad" value={n.unidad.nombre} /></div>}
                              {n.fecha_entrega_estimada && <div className="col-span-2"><Campo label="Fecha est. entrega" value={new Date(n.fecha_entrega_estimada).toLocaleDateString("es-MX")} /></div>}
                              {n.observaciones && <div className="col-span-2">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Obs. de la nota</p>
                                <p className="text-xs text-amber-800 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 italic">{n.observaciones}</p>
                              </div>}
                            </Seccion>

                            {/* Datos entrega según tipo */}
                            {n.tipo_entrega === "local" ? (
                              <Seccion title="Datos de entrega local" cols={1}>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Salida</p>
                                    {n.local_datos?.hora_salida ? <p className="text-xs font-medium text-gray-800">{formatFechaHora(n.local_datos.hora_salida)}</p> : <p className="text-xs text-gray-300">—</p>}
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Llegada</p>
                                    {n.local_datos?.hora_llegada ? <p className="text-xs font-medium text-gray-800">{formatFechaHora(n.local_datos.hora_llegada)}</p> : <p className="text-xs text-gray-300">—</p>}
                                  </div>
                                </div>
                                {n.local_datos?.firma && <Campo label="Firma" value={n.local_datos.firma} />}
                                {n.local_datos?.observacion && <Campo label="Observación" value={OBS_LABEL[n.local_datos.observacion] ?? n.local_datos.observacion} badgeClass="bg-amber-100 text-amber-800" />}
                                {n.local_datos?.observacion_extra && <Campo label="Notas de entrega" value={n.local_datos.observacion_extra} />}
                              </Seccion>
                            ) : n.recoleccion_datos ? (
                              <Seccion title="Datos de recolección">
                                <div className="col-span-2"><Campo label="Quien recogió" value={n.recoleccion_datos.nombre_quien_recogio} /></div>
                                {n.recoleccion_datos.empresa && <div className="col-span-2"><Campo label="Empresa" value={n.recoleccion_datos.empresa} /></div>}
                                {n.recoleccion_datos.unidad_placas && <Campo label="Placas" value={n.recoleccion_datos.unidad_placas} mono />}
                                {(n.recoleccion_datos.unidad_marca || n.recoleccion_datos.unidad_modelo) && <Campo label="Unidad" value={[n.recoleccion_datos.unidad_marca, n.recoleccion_datos.unidad_modelo].filter(Boolean).join(" ")} />}
                                {n.recoleccion_datos.fecha && <div className="col-span-2"><Campo label="Fecha recogido" value={formatFechaHora(n.recoleccion_datos.fecha)} /></div>}
                                {n.recoleccion_datos.observacion_extra && <div className="col-span-2"><Campo label="Obs. de entrega" value={n.recoleccion_datos.observacion_extra} /></div>}
                              </Seccion>
                            ) : (
                              <div className="bg-white rounded-lg border border-gray-100 p-3 flex items-center justify-center text-xs text-gray-400">Sin datos de entrega aún</div>
                            )}

                            {/* Fotos */}
                            <div className="bg-white rounded-lg border border-gray-100 p-3">
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100 pb-1 mb-2">Fotos</p>
                              <PanelFotosNota idnota={n.idnota} />
                            </div>

                            {/* Acciones */}
                            <div className="sm:col-span-2 xl:col-span-3 flex items-center" onClick={ev => ev.stopPropagation()}>
                              <div className="flex gap-2 flex-wrap">
                                <button onClick={() => handleGenerarNotaMulti(n.idnota)} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium text-xs hover:bg-green-200">📄 Descargar nota</button>
                                {n.tipo_entrega === "local" && n.estado === "pendiente" && !n.local_datos?.hora_salida && (
                                  <button onClick={() => handleMarcarSalidaNota(n.idnota)} className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg font-medium text-xs hover:bg-yellow-200">🚚 Marcar salida</button>
                                )}
                                {n.tipo_entrega === "local" && n.estado === "pendiente" && n.local_datos?.hora_salida && (
                                  <button onClick={() => abrirModalMarcarNota(n)} className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-medium text-xs hover:bg-blue-200">✓ Marcar llegada</button>
                                )}
                                {n.tipo_entrega === "recoleccion" && n.estado === "pendiente" && (
                                  <button onClick={() => abrirModalMarcarNota(n)} className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg font-medium text-xs hover:bg-emerald-200">✓ Marcar recogido</button>
                                )}
                                {n.estado === "entregado" && (
                                  <>
                                    <span className="text-xs text-green-600 font-medium self-center">✓ Entregado</span>
                                    <button onClick={() => abrirModalMarcarNota(n)} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-medium text-xs hover:bg-blue-200">✏️ Editar entrega</button>
                                  </>
                                )}
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

      {modalNotaLlegada && <ModalMarcarLlegadaNota nota={modalNotaLlegada} onClose={() => setModalNotaLlegada(null)} onSuccess={async () => { setModalNotaLlegada(null); await cargar(); }} />}
      {modalNotaRecoleccion && <ModalMarcarRecoleccionNota nota={modalNotaRecoleccion} onClose={() => setModalNotaRecoleccion(null)} onSuccess={async () => { setModalNotaRecoleccion(null); await cargar(); }} />}
    </div>
  );
}