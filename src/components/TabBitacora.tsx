import { useState, useRef, useEffect } from "react";
import {
  getBitacora, registrarHoraSalida, registrarHoraLlegada,
  updateBitacora, getEnviosPaqueteria, updateEstadoEnvio,
  getOrCreateNotaRemision, getEnviosRecoleccion, getFotoRecoleccion, getNotasRemisionBitacora, getNotaRemisionMulti,
} from "../services/enviosService";
import { getFotosEnvio, type Archivo } from "../services/archivos.service";
import { generarNotaRemision, generarNotaRemisionMulti } from "../utils/generarNotaRemision";
import {
  OBSERVACIONES, ESTADO_BADGE, ESTADO_LABEL, formatFechaHora,
} from "./enviosConstants";
import ModalEditarBitacora        from "./ModalEditarBitacora";
import ModalFormatoCastores       from "./ModalFormatoCastores";
import ModalFormatoTresGuerras    from "./ModalFormatoTresGuerras";
import ModalGuiaPaqueteriaGeneral from "./ModalGuiaPaqueteriaGeneral";
import ModalFotoEnvio             from "./ModalFotoEnvio";
import ModalMarcarRecoleccion     from "./ModalMarcarRecoleccion";
import type {
  BitacoraRegistro, UpdateBitacoraRequest,
  EnvioPaqueteria, EnvioRecoleccion, NotaRemisionBitacoraItem,
} from "../types/envios.types";
import { showAlert } from "./CustomAlert";

// ── Ícono cámara ──
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

// ── Botón de foto con control: si ya hay foto → ver, si no → subir ──
function BotonesEnvio({
  idenvio, onAbrirModal, extraButtons,
}: {
  idenvio:       number;
  onAbrirModal:  () => void;
  extraButtons?: React.ReactNode;
}) {
  const [fotos,    setFotos]    = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto,  setAbierto]  = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getFotosEnvio(idenvio)
      .then(setFotos)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [idenvio]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setAbierto(false);
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
          <button
            onClick={() => setAbierto(v => !v)}
            className="text-xs px-2 py-1 rounded font-medium flex items-center gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
            <IconoCamara /> Foto ✓
          </button>
        ) : (
          <button
            onClick={onAbrirModal}
            className="text-xs px-2 py-1 rounded font-medium flex items-center gap-1 bg-gray-800 text-white hover:bg-gray-700 transition-colors">
            <IconoCamara /> Foto
          </button>
        )}
      </div>

      {/* Desplegable fotos existentes */}
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

// ── Desplegable de recolección (datos + foto) ──
function DetalleRecoleccion({ r }: { r: EnvioRecoleccion }) {
  const [abierto,  setAbierto]  = useState(false);
  const [fotoUrl,  setFotoUrl]  = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const d = r.recoleccion_datos;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setAbierto(false);
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
        <span className="truncate font-medium text-gray-700 group-hover:text-purple-700">
          {d.nombre_quien_recogio}
        </span>
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
                        <img src={fotoUrl} alt="foto"
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition" />
                      </a>
                    : null
                }
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1 text-xs">
              <p className="font-semibold text-gray-800 truncate">{d.nombre_quien_recogio}</p>
              {d.empresa && <p className="text-gray-500 truncate">{d.empresa}</p>}
              {d.unidad_placas && (
                <div className="text-gray-600">
                  <span className="font-medium">Placas:</span> <span className="font-mono">{d.unidad_placas}</span>
                </div>
              )}
              {(d.unidad_marca || d.unidad_modelo) && (
                <div className="text-gray-500 truncate">
                  {[d.unidad_marca, d.unidad_modelo].filter(Boolean).join(" ")}
                </div>
              )}
              {d.fecha_recogido && (
                <div className="text-gray-500">{formatFechaHora(d.fecha_recogido)}</div>
              )}
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

  const [modalCastores,    setModalCastores]    = useState<number | null>(null);
  const [modalTresGuerras, setModalTresGuerras] = useState<number | null>(null);
  const [modalGuiaGeneral, setModalGuiaGeneral] = useState<number | null>(null);
  const [modalFotoPaq,     setModalFotoPaq]     = useState<EnvioPaqueteria | null>(null);
  const [modalFotoLocal,   setModalFotoLocal]   = useState<BitacoraRegistro | null>(null);
  const [modalRecoleccion, setModalRecoleccion] = useState<EnvioRecoleccion | null>(null);

  useEffect(() => { cargar(); }, [seccion]);

  const cargar = async () => {
    setLoading(true);
    try {
      if (seccion === "local")           setRegistros(await getBitacora());
      else if (seccion === "paqueteria") setEnviosPaq(await getEnviosPaqueteria());
      else if (seccion === "recoleccion") setRecolecciones(await getEnviosRecoleccion());
      else                               setNotasRemision(await getNotasRemisionBitacora());
    } catch { showAlert("Error al cargar datos"); }
    finally { setLoading(false); }
  };

  const handleHoraSalida  = async (id: number) => {
    try { await registrarHoraSalida(id);  await cargar(); }
    catch { showAlert("Error al registrar hora de salida"); }
  };
  const handleHoraLlegada = async (id: number) => {
    try { await registrarHoraLlegada(id); await cargar(); }
    catch { showAlert("Error al registrar hora de llegada"); }
  };

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

  const handleGenerarNota = async (idenvio: number) => {
    try { const nota = await getOrCreateNotaRemision(idenvio); await generarNotaRemision(nota); }
    catch { showAlert("Error al generar nota de remisión"); }
  };

  const handleGenerarNotaMulti = async (idnota: number) => {
    try {
      const nota = await getNotaRemisionMulti(idnota);
      await generarNotaRemisionMulti(nota);
    } catch {
      showAlert("Error al generar nota de remisión");
    }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {([
            { value: "local",       label: "Reparto Local" },
            { value: "paqueteria",  label: "Paquetería"    },
            { value: "recoleccion", label: "Recolección"   },
            //{ value: "nota_remision", label: "Nota de Remisión" },
          ] as { value: Seccion; label: string }[]).map(s => (
            <button key={s.value} onClick={() => setSeccion(s.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                seccion === s.value
                  ? s.value === "recoleccion" ? "bg-purple-600 text-white" : s.value === "nota_remision" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {s.label}
            </button>
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
                        {r.hora_salida
                          ? <span className="text-gray-700">{formatFechaHora(r.hora_salida)}</span>
                          : <button onClick={() => handleHoraSalida(r.idbitacora)} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">Marcar salida</button>
                        }
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs">
                        {r.hora_llegada
                          ? <span className="text-gray-700">{formatFechaHora(r.hora_llegada)}</span>
                          : r.hora_salida
                            ? <button onClick={() => handleHoraLlegada(r.idbitacora)} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200">Marcar llegada</button>
                            : <span className="text-gray-300">-</span>
                        }
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">{r.envio.numero_guia || "-"}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{r.cliente}</td>
                      <td className="px-3 py-3 text-center">
                        {r.observacion ? <span className="font-bold text-gray-700">{r.observacion}</span> : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{r.firma || "-"}</td>
                      <td className="px-3 py-3">
                        <BotonesEnvio
                          idenvio={r.envio.idenvio}
                          onAbrirModal={() => setModalFotoLocal(r)}
                          extraButtons={
                            <>
                              <button onClick={() => abrirEdicion(r)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Registro</button>
                              <button onClick={() => handleGenerarNota(r.envio.idenvio)} className="text-xs text-green-600 hover:text-green-800 font-medium">Nota</button>
                            </>
                          }
                        />
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
                        {e.numero_guia
                          ? <span className="text-gray-700 font-mono text-xs">{e.numero_guia}</span>
                          : <span className="text-orange-500 text-xs font-medium">Sin guía</span>}
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
                        <BotonesEnvio
                          idenvio={e.idenvio}
                          onAbrirModal={() => setModalFotoPaq(e)}
                          extraButtons={
                            <>
                              {e.estado === "preparando" && (
                                <button onClick={() => handleCambiarEstadoPaq(e.idenvio, "en_camino")} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">Salió</button>
                              )}
                              {e.estado === "en_camino" && (
                                <button onClick={() => handleCambiarEstadoPaq(e.idenvio, "entregado")} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200">Entregado</button>
                              )}
                            </>
                          }
                        />
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
            📦 Recolecciones en planta — el cliente pasa a recoger su pedido. Al marcar como recogido se registran los datos de quien recoge.
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
                      <td className="px-3 py-3 max-w-[180px]">
                        <DetalleRecoleccion r={r} />
                      </td>
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
                          {r.estado === "entregado" && (
                            <span className="text-xs text-green-600 font-medium">✓ Recogido</span>
                          )}
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
            📋 Notas de remisión generadas desde el carrito multi-pedido. Aquí puedes reimprimir la nota y gestionar su entrega.
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Fecha","Nota","Pedido(s)","Cliente","Tipo entrega","Pedidos","Bultos","Chofer","Unidad","Acciones"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {notasRemision.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No hay notas de remisión registradas</td></tr>
                  ) : notasRemision.map(n => (
                    <tr key={n.idnota} className="hover:bg-gray-50 align-top">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{new Date(n.created_at).toLocaleDateString("es-MX")}</td>
                      <td className="px-3 py-3 text-emerald-700 font-bold whitespace-nowrap">{n.no_nota}</td>
                      <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">{n.no_pedido}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{n.cliente}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${n.tipo_entrega === "local" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                          {n.tipo_entrega === "local" ? "Local" : "Recolección"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{n.total_pedidos}</td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{n.total_bultos}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{n.chofer?.nombre ?? "-"}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{n.unidad?.nombre ?? "-"}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => handleGenerarNotaMulti(n.idnota)} className="text-xs text-green-600 hover:text-green-800 font-medium">Nota</button>
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
    </div>
  );
}