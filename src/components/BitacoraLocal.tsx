import { useState, useEffect } from "react";
import {
  getBitacora, registrarHoraSalida, updateBitacora,
  getOrCreateNotaRemision, updateEstadoEnvio,
} from "../services/enviosService";
import { getFotosEnvio, subirArchivo, eliminarArchivo, type Archivo } from "../services/archivos.service";
import { generarNotaRemision } from "../utils/generarNotaRemision";
import { OBSERVACIONES, ESTADO_BADGE, ESTADO_LABEL, formatFechaHora } from "./enviosConstants";
import ModalEditarBitacora from "./ModalEditarBitacora";
import ModalFotoEnvio from "./ModalFotoEnvio";
import { showAlert } from "./CustomAlert";
import type { BitacoraRegistro, UpdateBitacoraRequest } from "../types/envios.types";

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso), pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const ahoraDatetimeLocal = () => {
  const d = new Date(), pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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

function PanelFotos({ idenvio }: { idenvio: number }) {
  const [fotos, setFotos] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => { getFotosEnvio(idenvio).then(setFotos).catch(() => {}).finally(() => setCargando(false)); }, [idenvio]);
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

export default function BitacoraLocal() {
  const [registros, setRegistros] = useState<BitacoraRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [expandida, setExpandida] = useState<number | null>(null);
  const [editando, setEditando] = useState<BitacoraRegistro | null>(null);
  const [formEdit, setFormEdit] = useState<UpdateBitacoraRequest & { numero_guia?: string }>({});
  const [guardando, setGuardando] = useState(false);
  const [modalFotoLocal, setModalFotoLocal] = useState<BitacoraRegistro | null>(null);

  const cargar = async () => {
    setLoading(true);
    try { setRegistros(await getBitacora()); }
    catch { showAlert("Error al cargar bitácora local"); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const filtrados = registros.filter(r =>
    !busqueda.trim() ||
    r.no_pedido.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.cliente.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleHoraSalida = async (id: number) => {
    try { await registrarHoraSalida(id); await cargar(); }
    catch { showAlert("Error al registrar hora de salida"); }
  };

  const abrirEdicion = (r: BitacoraRegistro, marcarLlegada = false) => {
    setEditando(r);
    setFormEdit({
      hora_salida: r.hora_salida ? toDatetimeLocal(r.hora_salida) : undefined,
      hora_llegada: r.hora_llegada ? toDatetimeLocal(r.hora_llegada) : marcarLlegada ? ahoraDatetimeLocal() : undefined,
      observacion: r.observacion || undefined,
      observacion_extra: r.observacion_extra || undefined,
      firma: r.firma || undefined,
      numero_guia: r.envio.numero_guia || "",
    });
  };

  const handleGuardar = async (data: UpdateBitacoraRequest & { numero_guia?: string }, foto?: File | null, fotosAEliminar?: string[]) => {
    if (!editando) return;
    setGuardando(true);
    try {
      await updateBitacora(editando.idbitacora, data);
      if (data.hora_llegada) await updateEstadoEnvio(editando.envio.idenvio, "entregado");
      if (fotosAEliminar?.length) await Promise.all(fotosAEliminar.map(id => eliminarArchivo(id)));
      if (foto) {
        const ext = foto.name.match(/\.[^/.]+$/)?.[0] || "";
        await subirArchivo(new File([foto], `envio-${editando.envio.idenvio}-${editando.no_pedido}-${Date.now()}${ext}`, { type: foto.type }), "fotos-envios", undefined, editando.envio.idenvio);
      }
      setEditando(null); await cargar();
    } catch (err: any) { showAlert(err.response?.data?.error || "Error al guardar"); }
    finally { setGuardando(false); }
  };

  const handleGenerarNota = async (idenvio: number) => {
    try { await generarNotaRemision(await getOrCreateNotaRemision(idenvio)); }
    catch { showAlert("Error al generar nota de remisión"); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="bg-gray-50 rounded-lg p-3 mb-4 flex flex-wrap gap-4 text-xs text-gray-600">
        {OBSERVACIONES.map(o => <span key={o.value}><strong>{o.value}</strong> — {o.label.split(" — ")[1]}</span>)}
      </div>
      <div className="mb-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por N° pedido o cliente..."
          className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        {busqueda && <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>}
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
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin resultados para "{busqueda}"</td></tr>
              ) : filtrados.map(r => {
                const exp = expandida === r.idbitacora;
                return (
                  <>
                    <tr key={r.idbitacora} className={`cursor-pointer transition-colors ${exp ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      onClick={() => setExpandida(exp ? null : r.idbitacora)}>
                      <td className="px-3 py-3 w-8"><ChevronIcon open={exp} /></td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{new Date(r.fecha).toLocaleDateString("es-MX")}</td>
                      <td className="px-3 py-3 text-blue-600 font-bold whitespace-nowrap">{r.no_pedido}</td>
                      <td className="px-3 py-3 text-gray-800 whitespace-nowrap font-medium">{r.cliente}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.envio.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                          {r.envio.es_parcialidad ? "Parcialidad" : "Completo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[r.envio.estado]}`}>{ESTADO_LABEL[r.envio.estado]}</span>
                          {r.observacion && <span className="text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{r.observacion}</span>}
                          {r.firma && <span className="text-xs text-gray-500 truncate max-w-[90px]">{r.firma}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right"><span className="text-xs text-gray-400">{exp ? "Ocultar" : "Ver detalle"}</span></td>
                    </tr>

                    {exp && (
                      <tr key={`det-${r.idbitacora}`} className="bg-slate-50 border-b border-blue-100">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">

                            {/* Detalles del envío — chofer + unidad + fecha estimada + obs envío */}
                            <Seccion title="Detalles del envío">
                              <Campo label="Chofer" value={r.chofer?.nombre ?? "—"} />
                              <Campo label="Unidad" value={r.unidad?.nombre ?? "—"} />
                              {(r as any).fecha_entrega_estimada && (
                                <div className="col-span-2">
                                  <Campo label="Fecha est. entrega" value={new Date((r as any).fecha_entrega_estimada).toLocaleDateString("es-MX")} />
                                </div>
                              )}
                              {(r as any).observaciones_envio && (
                                <div className="col-span-2">
                                  <Campo label="Obs. del envío" value={(r as any).observaciones_envio} />
                                </div>
                              )}
                            </Seccion>

                            {/* Horarios */}
                            <Seccion title="Horarios" cols={1}>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Salida</p>
                                  {r.hora_salida ? (
                                    <p className="text-xs font-medium text-gray-800">{formatFechaHora(r.hora_salida)}</p>
                                  ) : (
                                    <button onClick={e => { e.stopPropagation(); handleHoraSalida(r.idbitacora); }}
                                      className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium hover:bg-yellow-200">
                                      Marcar salida
                                    </button>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Llegada</p>
                                  {r.hora_llegada ? (
                                    <p className="text-xs font-medium text-gray-800">{formatFechaHora(r.hora_llegada)}</p>
                                  ) : r.hora_salida ? (
                                    <button onClick={e => { e.stopPropagation(); abrirEdicion(r, true); }}
                                      className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium hover:bg-green-200">
                                      Marcar llegada
                                    </button>
                                  ) : <p className="text-xs text-gray-300">—</p>}
                                </div>
                              </div>
                            </Seccion>

                            {/* Datos entrega */}
                            <Seccion title="Datos de entrega">
                              <Campo label="N° Guía" value={r.envio.numero_guia || "—"} mono />
                              <Campo label="Firma" value={r.firma} />
                              {r.observacion && (
                                <div className="col-span-2">
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Observación</p>
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{r.observacion}</span>
                                </div>
                              )}
                              {r.observacion_extra && (
                                <div className="col-span-2">
                                  <Campo label="Notas de entrega" value={r.observacion_extra} />
                                </div>
                              )}
                            </Seccion>

                            {/* Fotos — junto a los 3 bloques */}
                            <div className="bg-white rounded-lg border border-gray-100 p-3">
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100 pb-1 mb-2">Fotos</p>
                              <PanelFotos idenvio={r.envio.idenvio} />
                            </div>

                            {/* Acciones */}
                            <div className="sm:col-span-2 xl:col-span-4 flex items-center" onClick={e => e.stopPropagation()}>
                              <div className="flex gap-2 flex-wrap">
                                <button onClick={() => abrirEdicion(r)} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200">✏️ Editar registro</button>
                                <button onClick={() => handleGenerarNota(r.envio.idenvio)} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">📄 Nota de remisión</button>
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

      {editando && <ModalEditarBitacora registro={editando} onClose={() => setEditando(null)} onGuardar={handleGuardar} guardando={guardando} form={formEdit} setForm={setFormEdit} modo="normal" />}
      {modalFotoLocal && <ModalFotoEnvio modo="local" registro={modalFotoLocal} onClose={() => setModalFotoLocal(null)} onCompletado={cargar} />}
    </div>
  );
}