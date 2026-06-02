import { useState, useEffect } from "react";
import { getEnviosPaqueteriaBitacora, marcarSalidaEnvio, marcarEntregaEnvio, updateEstadoEnvio } from "../services/enviosService";
import { getFotosEnvio, subirArchivo, eliminarArchivo, type Archivo } from "../services/archivos.service";
import { ESTADO_BADGE, ESTADO_LABEL, formatFechaHora } from "./enviosConstants";
import ModalEditarBitacora from "./ModalEditarBitacora";
import ModalFotoEnvio from "./ModalFotoEnvio";
import { showAlert } from "./CustomAlert";
import type { EnvioPaqueteria, BitacoraRegistro, UpdateBitacoraRequest } from "../types/envios.types";

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso), pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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

export default function BitacoraPaqueteria() {
  const [enviosPaq, setEnviosPaq] = useState<EnvioPaqueteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [expandida, setExpandida] = useState<number | null>(null);
  const [editando, setEditando] = useState<BitacoraRegistro | null>(null);
  const [formEdit, setFormEdit] = useState<UpdateBitacoraRequest & { numero_guia?: string }>({});
  const [guardando, setGuardando] = useState(false);
  const [modoModal, setModoModal] = useState<"paqueteria_entrega" | "paqueteria_edicion">("paqueteria_entrega");
  const [modalFotoPaq, setModalFotoPaq] = useState<EnvioPaqueteria | null>(null);

  const cargar = async () => {
    setLoading(true);
    try { setEnviosPaq(await getEnviosPaqueteriaBitacora()); }
    catch { showAlert("Error al cargar envíos de paquetería"); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const filtrados = enviosPaq.filter(e =>
    !busqueda.trim() ||
    e.no_pedido.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.numero_guia || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirEntregaPaqueteria = (e: EnvioPaqueteria, editar = false) => {
    setModoModal(editar ? "paqueteria_edicion" : "paqueteria_entrega");
    setEditando({
      idbitacora: e.idbitacora || 0, fecha: e.fecha_envio,
      hora_salida: e.hora_salida || null, hora_llegada: e.hora_llegada || null,
      observacion: e.observacion || null, observacion_extra: e.observacion_extra || null,
      firma: e.firma || null, created_at: "", updated_at: "",
      no_pedido: e.no_pedido, cliente: e.cliente, chofer: null, unidad: null,
      envio: { idenvio: e.idenvio, tipo: "paqueteria", estado: e.estado, numero_guia: e.numero_guia, es_parcialidad: e.es_parcialidad },
    });
    setFormEdit(editar
      ? {
          hora_salida:       (e.hora_salida    && e.hora_salida    !== "null") ? toDatetimeLocal(e.hora_salida)    : undefined,
          hora_llegada:      (e.hora_llegada   && e.hora_llegada   !== "null") ? toDatetimeLocal(e.hora_llegada)   : undefined,
          observacion_extra: e.observacion_extra || undefined,
          numero_guia:       e.numero_guia || "",
        }
      : {
          observacion_extra: undefined,
          numero_guia:       e.numero_guia || "",
        }
    );
  };

  const handleGuardar = async (data: UpdateBitacoraRequest & { numero_guia?: string }, foto?: File | null, fotosAEliminar?: string[]) => {
    if (!editando) return;
    setGuardando(true);
    try {
      await marcarEntregaEnvio(editando.envio.idenvio, {
        hora_salida: modoModal === "paqueteria_edicion" ? data.hora_salida || undefined : undefined,
        hora_llegada: modoModal === "paqueteria_edicion" ? data.hora_llegada || undefined : undefined,
        observacion_extra: data.observacion_extra || undefined,
        numero_guia: data.numero_guia || undefined,
      });
      if (fotosAEliminar?.length) await Promise.all(fotosAEliminar.map(id => eliminarArchivo(id)));
      if (foto) {
        const ext = foto.name.match(/\.[^/.]+$/)?.[0] || "";
        await subirArchivo(new File([foto], `envio-${editando.envio.idenvio}-${editando.no_pedido}-${Date.now()}${ext}`, { type: foto.type }), "fotos-envios", undefined, editando.envio.idenvio);
      }
      setEditando(null); await cargar();
    } catch (err: any) { showAlert(err.response?.data?.error || "Error al guardar cambios"); }
    finally { setGuardando(false); }
  };

  const handleCambiarEstado = async (idenvio: number, estado: string) => {
    try {
      if (estado === "en_camino") await marcarSalidaEnvio(idenvio);
      else await updateEstadoEnvio(idenvio, estado);
      await cargar();
    } catch { showAlert("Error al cambiar estado"); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 text-xs text-indigo-700">
        La responsabilidad del envío termina al obtener el número de guía de la paquetería.
      </div>
      <div className="mb-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por N° pedido, cliente o N° guía..."
          className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        {busqueda && <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>}
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
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin resultados para "{busqueda}"</td></tr>
              ) : filtrados.map(e => {
                const exp = expandida === e.idenvio;
                return (
                  <>
                    <tr key={e.idenvio} className={`cursor-pointer transition-colors ${exp ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                      onClick={() => setExpandida(exp ? null : e.idenvio)}>
                      <td className="px-3 py-3 w-8"><ChevronIcon open={exp} /></td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{new Date(e.fecha_envio).toLocaleDateString("es-MX")}</td>
                      <td className="px-3 py-3 text-blue-600 font-bold whitespace-nowrap">{e.no_pedido}</td>
                      <td className="px-3 py-3 text-gray-800 whitespace-nowrap font-medium">{e.cliente}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{e.paqueteria.nombre}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[e.estado]}`}>{ESTADO_LABEL[e.estado]}</span>
                      </td>
                      <td className="px-3 py-3 text-right"><span className="text-xs text-gray-400">{exp ? "Ocultar" : "Ver detalle"}</span></td>
                    </tr>

                    {exp && (
                      <tr key={`det-${e.idenvio}`} className="bg-slate-50 border-b border-indigo-100">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">

                            {/* Detalles envío */}
                            <Seccion title="Detalles del envío">
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">N° Guía</p>
                                {e.numero_guia
                                  ? <p className="text-xs font-mono font-medium text-gray-800">{e.numero_guia}</p>
                                  : <span className="text-xs text-orange-500 font-medium">Sin guía</span>}
                              </div>
                              <Campo label="Bultos" value={String(e.total_bultos)} />
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Tipo</p>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${e.es_parcialidad ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                                  {e.es_parcialidad ? "Parcialidad" : "Completo"}
                                </span>
                              </div>
                              <Campo label="Costo flete" value={e.costo_flete != null ? `$${Number(e.costo_flete).toLocaleString("es-MX")}` : null} />
                              {e.fecha_entrega_estimada && <Campo label="Fecha est. entrega" value={new Date(e.fecha_entrega_estimada).toLocaleDateString("es-MX")} />}
                              {e.observaciones && <div className="col-span-2"><Campo label="Obs. del envío" value={e.observaciones} /></div>}
                            </Seccion>

                            {/* Horarios + entrega */}
                            <Seccion title="Horarios / Entrega" cols={1}>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Salida</p>
                                  {e.hora_salida ? <p className="text-xs font-medium text-gray-800">{formatFechaHora(e.hora_salida)}</p> : <p className="text-xs text-gray-300">—</p>}
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Llegada</p>
                                  {e.hora_llegada ? <p className="text-xs font-medium text-gray-800">{formatFechaHora(e.hora_llegada)}</p> : <p className="text-xs text-gray-300">—</p>}
                                </div>
                              </div>
                              {e.observacion_extra && <Campo label="Obs. de entrega" value={e.observacion_extra} />}
                              {e.firma && <Campo label="Firma" value={e.firma} />}
                            </Seccion>

                            {/* Fotos */}
                            <div className="bg-white rounded-lg border border-gray-100 p-3">
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100 pb-1 mb-2">Fotos</p>
                              <PanelFotos idenvio={e.idenvio} />
                            </div>

                            {/* Acciones */}
                            <div className="sm:col-span-2 xl:col-span-3 flex items-center" onClick={ev => ev.stopPropagation()}>
                              <div className="flex gap-2 flex-wrap">
                                {["pendiente", "preparando"].includes(e.estado) && (
                                  <button onClick={() => handleCambiarEstado(e.idenvio, "en_camino")} className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg font-medium text-xs hover:bg-yellow-200">🚚 Marcar salida</button>
                                )}
                                {e.estado === "en_camino" && (
                                  <button onClick={() => abrirEntregaPaqueteria(e, false)} className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg font-medium text-xs hover:bg-green-200">✓ Marcar entregado</button>
                                )}
                                {e.estado === "entregado" && (
                                  <button onClick={() => abrirEntregaPaqueteria(e, true)} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-medium text-xs hover:bg-blue-200">✏️ Editar entrega</button>
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

      {editando && <ModalEditarBitacora registro={editando} onClose={() => setEditando(null)} onGuardar={handleGuardar} guardando={guardando} form={formEdit} setForm={setFormEdit} modo={modoModal} />}
      {modalFotoPaq && <ModalFotoEnvio modo="paqueteria" envio={modalFotoPaq} onClose={() => setModalFotoPaq(null)} onCompletado={cargar} />}
    </div>
  );
}