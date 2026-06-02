import { useState, useEffect, useRef } from "react";
import { getEnviosRecoleccion, marcarRecolectado, getOrCreateNotaRemision } from "../services/enviosService";
import { getFotosEnvio, subirArchivo, eliminarArchivo, type Archivo } from "../services/archivos.service";
import { generarNotaRemision } from "../utils/generarNotaRemision";
import { ESTADO_BADGE, ESTADO_LABEL, formatFechaHora, inputClass, labelClass } from "./enviosConstants";
import ModalMarcarRecoleccion from "./ModalMarcarRecoleccion";
import Modal from "./Modal";
import { showAlert } from "./CustomAlert";
import type { EnvioRecoleccion } from "../types/envios.types";

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

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

function PanelFotos({ idenvio }: { idenvio: number }) {
  const [fotos, setFotos] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => { getFotosEnvio(idenvio).then(setFotos).catch(() => {}).finally(() => setCargando(false)); }, [idenvio]);
  if (cargando) return <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />;
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

function ModalEditarRecoleccion({ recoleccion, onClose, onGuardar, guardando }: {
  recoleccion: EnvioRecoleccion;
  onClose: () => void;
  onGuardar: (datos: any, foto?: File | null, fotosAEliminar?: string[]) => Promise<void>;
  guardando: boolean;
}) {
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const d = recoleccion.recoleccion_datos;
  const [form, setForm] = useState({ nombre_quien_recogio: d?.nombre_quien_recogio || "", empresa: d?.empresa || "", unidad_marca: d?.unidad_marca || "", unidad_modelo: d?.unidad_modelo || "", unidad_placas: d?.unidad_placas || "", observacion_extra: d?.observacion_extra || "" });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fotoActual, setFotoActual] = useState<Archivo | null>(null);
  const [fotosAEliminar, setFotosAEliminar] = useState<string[]>([]);
  const [cargandoFoto, setCargandoFoto] = useState(true);

  useEffect(() => {
    let mounted = true;
    setCargandoFoto(true); setFoto(null); setPreview(null); setFotoActual(null); setFotosAEliminar([]);
    getFotosEnvio(recoleccion.idenvio)
      .then(fotos => { if (!mounted) return; setFotoActual(fotos[0] ?? null); setPreview(fotos[0]?.url ?? null); })
      .catch(() => { if (!mounted) return; })
      .finally(() => { if (mounted) setCargandoFoto(false); });
    return () => { mounted = false; };
  }, [recoleccion.idenvio]);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (fotoActual) setFotosAEliminar(prev => prev.includes(fotoActual.id_archivo) ? prev : [...prev, fotoActual.id_archivo]);
    setFoto(file); setPreview(URL.createObjectURL(file));
  };
  const quitarFoto = () => {
    if (fotoActual) setFotosAEliminar(prev => prev.includes(fotoActual.id_archivo) ? prev : [...prev, fotoActual.id_archivo]);
    setFoto(null); setFotoActual(null); setPreview(null);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  };

  return (
    <Modal isOpen onClose={onClose} title="Editar Entrega de Recolección">
      <div className="space-y-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-purple-800">{recoleccion.no_pedido} - {recoleccion.cliente}</p>
          <p className="text-purple-600 text-xs mt-0.5">{recoleccion.total_bultos} bulto(s)</p>
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
        <div><label className={labelClass}>Observaciones de entrega</label>
          <input type="text" value={form.observacion_extra} onChange={e => setForm({...form, observacion_extra: e.target.value})} className={inputClass} placeholder="Notas u observaciones de entrega..." /></div>
        <div>
          <label className={labelClass}>Foto / comprobante</label>
          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
          {cargandoFoto ? (
            <div className="flex items-center justify-center py-8 border border-gray-200 rounded-lg bg-gray-50"><div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : preview ? (
            <div className="space-y-2">
              <div className="relative"><img src={preview} alt="Vista previa" className="w-full max-h-56 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                <button type="button" onClick={quitarFoto} disabled={guardando} className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-200 disabled:opacity-50">✕</button>
              </div>
              <button type="button" onClick={() => inputFotoRef.current?.click()} disabled={guardando} className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50">Reemplazar foto</button>
            </div>
          ) : (
            <button type="button" onClick={() => inputFotoRef.current?.click()} disabled={guardando} className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-500 hover:border-purple-400 hover:text-purple-500 transition-colors flex flex-col items-center gap-2 disabled:opacity-50">
              <span>Tomar o seleccionar foto</span>
            </button>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} disabled={guardando} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={() => onGuardar({ nombre_quien_recogio: form.nombre_quien_recogio.trim(), empresa: form.empresa.trim() || undefined, unidad_marca: form.unidad_marca.trim() || undefined, unidad_modelo: form.unidad_modelo.trim() || undefined, unidad_placas: form.unidad_placas.trim() || undefined, observacion_extra: form.observacion_extra.trim() || undefined }, foto, fotosAEliminar)}
            disabled={guardando || !form.nombre_quien_recogio.trim()} className="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50">
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function BitacoraRecoleccion() {
  const [recolecciones, setRecolecciones] = useState<EnvioRecoleccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [expandida, setExpandida] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [modalRecoleccion, setModalRecoleccion] = useState<EnvioRecoleccion | null>(null);
  const [editandoRecoleccion, setEditandoRecoleccion] = useState<EnvioRecoleccion | null>(null);

  const cargar = async () => {
    setLoading(true);
    try { setRecolecciones(await getEnviosRecoleccion()); }
    catch { showAlert("Error al cargar recolecciones"); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const filtradas = recolecciones.filter(r =>
    !busqueda.trim() ||
    r.no_pedido.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.cliente.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleGenerarNota = async (idenvio: number) => {
    try { await generarNotaRemision(await getOrCreateNotaRemision(idenvio)); }
    catch { showAlert("Error al generar nota de remisión"); }
  };

  const handleGuardarRecoleccion = async (datos: any, foto?: File | null, fotosAEliminar?: string[]) => {
    if (!editandoRecoleccion) return;
    setGuardando(true);
    try {
      await marcarRecolectado(editandoRecoleccion.idenvio, datos);
      if (fotosAEliminar?.length) await Promise.all(fotosAEliminar.map(id => eliminarArchivo(id)));
      if (foto) {
        const ext = foto.name.match(/\.[^/.]+$/)?.[0] || "";
        await subirArchivo(new File([foto], `recoleccion-${editandoRecoleccion.idenvio}-${editandoRecoleccion.no_pedido}-${Date.now()}${ext}`, { type: foto.type }), "fotos-envios", undefined, editandoRecoleccion.idenvio);
      }
      setEditandoRecoleccion(null); await cargar();
    } catch (err: any) { showAlert(err.response?.data?.error || "Error al guardar recolección"); }
    finally { setGuardando(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-xs text-purple-700">
        📦 Recolecciones en planta — el cliente pasa a recoger su pedido.
      </div>
      <div className="mb-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por N° pedido o cliente..."
          className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
        {busqueda && <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>}
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
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin resultados para "{busqueda}"</td></tr>
              ) : filtradas.map(r => {
                const exp = expandida === r.idenvio;
                const d = r.recoleccion_datos;
                return (
                  <>
                    <tr key={r.idenvio} className={`cursor-pointer transition-colors ${exp ? "bg-purple-50" : "hover:bg-gray-50"}`}
                      onClick={() => setExpandida(exp ? null : r.idenvio)}>
                      <td className="px-3 py-3 w-8"><ChevronIcon open={exp} /></td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{new Date(r.fecha_envio).toLocaleDateString("es-MX")}</td>
                      <td className="px-3 py-3 text-blue-600 font-bold whitespace-nowrap">{r.no_pedido}</td>
                      <td className="px-3 py-3 text-gray-800 whitespace-nowrap font-medium">{r.cliente}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[r.estado]}`}>{ESTADO_LABEL[r.estado] ?? r.estado}</span>
                      </td>
                      <td className="px-3 py-3 text-right"><span className="text-xs text-gray-400">{exp ? "Ocultar" : "Ver detalle"}</span></td>
                    </tr>

                    {exp && (
                      <tr key={`det-${r.idenvio}`} className="bg-slate-50 border-b border-purple-100">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">

                            {/* Detalles envío */}
                            <Seccion title="Detalles">
                              <Campo label="Bultos" value={String(r.total_bultos)} />
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Tipo</p>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                                  {r.es_parcialidad ? "Parcialidad" : "Completo"}
                                </span>
                              </div>
                              {r.fecha_entrega_estimada && <div className="col-span-2"><Campo label="Fecha est. recolección" value={new Date(r.fecha_entrega_estimada).toLocaleDateString("es-MX")} /></div>}
                              {r.observaciones && <div className="col-span-2"><Campo label="Obs. del envío" value={r.observaciones} /></div>}
                            </Seccion>

                            {/* Datos recolección */}
                            {d ? (
                              <Seccion title="Datos de recolección">
                                <div className="col-span-2"><Campo label="Quien recogió" value={d.nombre_quien_recogio} /></div>
                                {d.empresa && <div className="col-span-2"><Campo label="Empresa" value={d.empresa} /></div>}
                                {d.unidad_placas && <Campo label="Placas" value={d.unidad_placas} mono />}
                                {(d.unidad_marca || d.unidad_modelo) && <Campo label="Unidad" value={[d.unidad_marca, d.unidad_modelo].filter(Boolean).join(" ")} />}
                                {d.fecha_recogido && <div className="col-span-2"><Campo label="Fecha recogido" value={formatFechaHora(d.fecha_recogido)} /></div>}
                                {d.observacion_extra && <div className="col-span-2"><Campo label="Obs. de entrega" value={d.observacion_extra} /></div>}
                              </Seccion>
                            ) : (
                              <div className="bg-white rounded-lg border border-gray-100 p-3 flex items-center justify-center text-xs text-gray-400">Sin datos de recolección aún</div>
                            )}

                            {/* Fotos */}
                            <div className="bg-white rounded-lg border border-gray-100 p-3">
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100 pb-1 mb-2">Fotos</p>
                              <PanelFotos idenvio={r.idenvio} />
                            </div>

                            {/* Acciones */}
                            <div className="sm:col-span-2 xl:col-span-3 flex items-center" onClick={ev => ev.stopPropagation()}>
                              <div className="flex gap-2 flex-wrap">
                                <button onClick={() => handleGenerarNota(r.idenvio)} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium text-xs hover:bg-green-200">📄 Nota de remisión</button>
                                {["pendiente", "preparando"].includes(r.estado) && (
                                  <button onClick={() => setModalRecoleccion(r)} className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg font-medium text-xs hover:bg-purple-200">✓ Marcar recogido</button>
                                )}
                                {r.estado === "entregado" && (
                                  <button onClick={() => setEditandoRecoleccion(r)} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-medium text-xs hover:bg-blue-200">✏️ Editar entrega</button>
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

      {modalRecoleccion && <ModalMarcarRecoleccion recoleccion={modalRecoleccion} onClose={() => setModalRecoleccion(null)} onSuccess={async () => { setModalRecoleccion(null); await cargar(); }} />}
      {editandoRecoleccion && <ModalEditarRecoleccion recoleccion={editandoRecoleccion} onClose={() => setEditandoRecoleccion(null)} onGuardar={handleGuardarRecoleccion} guardando={guardando} />}
    </div>
  );
}