import { useState, useEffect } from "react";
import {
  getBitacora, registrarHoraSalida, registrarHoraLlegada,
  updateBitacora, getEnviosPaqueteria, updateEstadoEnvio,
  updateGuiaEnvio, getOrCreateNotaRemision,
} from "../services/enviosService";
import { generarNotaRemision } from "../utils/generarNotaRemision";
import {
  OBSERVACIONES, ESTADO_BADGE, ESTADO_LABEL,
  formatFechaHora,
} from "./enviosConstants";
import ModalEditarBitacora        from "./ModalEditarBitacora";
import ModalGuiaPaqueteria        from "./ModalGuiaPaqueteria";
import ModalFormatoCastores       from "./ModalFormatoCastores";
import ModalFormatoTresGuerras    from "./ModalFormatoTresGuerras";
import ModalGuiaPaqueteriaGeneral from "./ModalGuiaPaqueteriaGeneral";
import ModalFotoEnvio             from "./ModalFotoEnvio";
import type { BitacoraRegistro, UpdateBitacoraRequest, EnvioPaqueteria } from "../types/envios.types";
import { showAlert } from './CustomAlert';


const esCastores    = (nombre: string) => nombre.toLowerCase().includes("castores");
const esTresGuerras = (nombre: string) => nombre.toLowerCase().includes("tres guerras");
const esGeneral     = (nombre: string) => !esCastores(nombre) && !esTresGuerras(nombre);

// Icono de cámara compacto para botones de tabla
const IconoCamara = () => (
  <svg viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3 h-3">
    <rect x="1" y="3" width="14" height="10" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5.5 3V2C5.5 1.72 5.72 1.5 6 1.5H10C10.28 1.5 10.5 1.72 10.5 2V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="8" cy="8" r="1" fill="currentColor" fillOpacity="0.4"/>
    <circle cx="9" cy="6.5" r="0.45" fill="currentColor" fillOpacity="0.7"/>
    <rect x="2" y="4.5" width="2" height="1.5" rx="0.5" fill="currentColor" fillOpacity="0.5"/>
  </svg>
);

export default function TabBitacora() {
  const [seccion,     setSeccion]     = useState<"local" | "paqueteria">("local");
  const [registros,   setRegistros]   = useState<BitacoraRegistro[]>([]);
  const [enviosPaq,   setEnviosPaq]   = useState<EnvioPaqueteria[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editando,    setEditando]    = useState<BitacoraRegistro | null>(null);
  const [editandoPaq, setEditandoPaq] = useState<EnvioPaqueteria | null>(null);
  const [formEdit,    setFormEdit]    = useState<UpdateBitacoraRequest & { numero_guia?: string }>({});
  const [guiaEdit,    setGuiaEdit]    = useState("");
  const [guardando,   setGuardando]   = useState(false);

  // Modales de formato por paquetería
  const [modalCastores,    setModalCastores]    = useState<number | null>(null);
  const [modalTresGuerras, setModalTresGuerras] = useState<number | null>(null);
  const [modalGuiaGeneral, setModalGuiaGeneral] = useState<number | null>(null);

  // Modal foto
  const [modalFotoPaq,   setModalFotoPaq]   = useState<EnvioPaqueteria | null>(null);
  const [modalFotoLocal, setModalFotoLocal] = useState<BitacoraRegistro | null>(null);

  useEffect(() => { cargar(); }, [seccion]);

  const cargar = async () => {
    setLoading(true);
    try {
      if (seccion === "local") setRegistros(await getBitacora());
      else setEnviosPaq(await getEnviosPaqueteria());
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
    const d   = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const abrirEdicion = (r: BitacoraRegistro) => {
    setEditando(r);
    setFormEdit({
      hora_salida:       r.hora_salida      ? toDatetimeLocal(r.hora_salida)  : undefined,
      hora_llegada:      r.hora_llegada     ? toDatetimeLocal(r.hora_llegada) : undefined,
      observacion:       r.observacion       || undefined,
      observacion_extra: r.observacion_extra || undefined,
      firma:             r.firma             || undefined,
      numero_guia:       r.envio.numero_guia || "",
    });
  };

  const handleGuardar = async (data: UpdateBitacoraRequest & { numero_guia?: string }) => {
    if (!editando) return;
    setGuardando(true);
    try {
      await updateBitacora(editando.idbitacora, data);
      setEditando(null);
      await cargar();
    } catch { showAlert("Error al guardar cambios"); }
    finally { setGuardando(false); }
  };

  const abrirEdicionPaq = (e: EnvioPaqueteria) => {
    setEditandoPaq(e);
    setGuiaEdit(e.numero_guia || "");
  };

  const handleGuardarGuia = async (guia: string) => {
    if (!editandoPaq) return;
    setGuardando(true);
    try {
      await updateGuiaEnvio(editandoPaq.idenvio, guia);
      setEditandoPaq(null);
      await cargar();
    } catch { showAlert("Error al guardar guía"); }
    finally { setGuardando(false); }
  };

  const handleCambiarEstadoPaq = async (idenvio: number, estado: string) => {
    try { await updateEstadoEnvio(idenvio, estado); await cargar(); }
    catch { showAlert("Error al cambiar estado"); }
  };

  const handleGenerarNota = async (idenvio: number) => {
    try {
      const nota = await getOrCreateNotaRemision(idenvio);
      await generarNotaRemision(nota);
    } catch { showAlert("Error al generar nota de remisión"); }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(["local", "paqueteria"] as const).map(s => (
            <button key={s} onClick={() => setSeccion(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                seccion === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {s === "local" ? "Reparto Local" : "Paquetería"}
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
                  ) : registros.map(r => {
                    // LOCAL: bloqueado si ya tiene número de guía registrado en el backend
                    const bloqueado = !!r.envio.numero_guia;
                    return (
                      <tr key={r.idbitacora} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                          {new Date(r.fecha).toLocaleDateString("es-MX")}
                        </td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">{r.unidad.nombre}</td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{r.chofer.nombre}</td>
                        <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">{r.no_pedido}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.envio.es_parcialidad
                              ? "bg-orange-100 text-orange-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {r.envio.es_parcialidad ? "Parcialidad" : "Completo"}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                          {r.hora_salida
                            ? <span className="text-gray-700">{formatFechaHora(r.hora_salida)}</span>
                            : <button onClick={() => handleHoraSalida(r.idbitacora)}
                                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">
                                Marcar salida
                              </button>
                          }
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                          {r.hora_llegada
                            ? <span className="text-gray-700">{formatFechaHora(r.hora_llegada)}</span>
                            : r.hora_salida
                              ? <button onClick={() => handleHoraLlegada(r.idbitacora)}
                                  className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200">
                                  Marcar llegada
                                </button>
                              : <span className="text-gray-300">-</span>
                          }
                        </td>
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">{r.envio.numero_guia || "-"}</td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{r.cliente}</td>
                        <td className="px-3 py-3 text-center">
                          {r.observacion
                            ? <span className="font-bold text-gray-700">{r.observacion}</span>
                            : <span className="text-gray-300">-</span>
                          }
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{r.firma || "-"}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => abrirEdicion(r)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                            <button onClick={() => handleGenerarNota(r.envio.idenvio)}
                              className="text-xs text-green-600 hover:text-green-800 font-medium">Nota</button>

                            {/* Botón Foto — local */}
                            <button
                              onClick={() => setModalFotoLocal(r)}
                              disabled={bloqueado}
                              title={bloqueado ? "Guía ya registrada — no se permiten más fotos" : "Subir foto de entrega"}
                              className={`text-xs px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                                bloqueado
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-gray-800 text-white hover:bg-gray-700"
                              }`}
                            >
                              <IconoCamara />
                              {bloqueado ? "Foto ✓" : "Foto"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                  ) : enviosPaq.map(e => {
                    // PAQUETERÍA: bloqueado si ya tiene número de guía registrado en el backend
                    const bloqueado = !!e.numero_guia;
                    return (
                      <tr key={e.idenvio} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">
                          {new Date(e.fecha_envio).toLocaleDateString("es-MX")}
                        </td>
                        <td className="px-3 py-3 text-blue-600 font-medium whitespace-nowrap">{e.no_pedido}</td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{e.cliente}</td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{e.paqueteria.nombre}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {e.numero_guia
                            ? <span className="text-gray-700 font-mono text-xs">{e.numero_guia}</span>
                            : <span className="text-orange-500 text-xs font-medium">Sin guía</span>
                          }
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600 text-xs">{e.total_bultos}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            e.es_parcialidad
                              ? "bg-orange-100 text-orange-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {e.es_parcialidad ? "Parcialidad" : "Completo"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                          {e.costo_flete != null ? `$${Number(e.costo_flete).toLocaleString("es-MX")}` : "-"}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[e.estado]}`}>
                            {ESTADO_LABEL[e.estado]}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 flex-wrap">

                            {e.estado !== "entregado" && (
                              <button onClick={() => abrirEdicionPaq(e)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                {e.numero_guia ? "Editar guía" : "Agregar guía"}
                              </button>
                            )}

                            {esCastores(e.paqueteria.nombre) && (
                              <button onClick={() => setModalCastores(e.idenvio)}
                                className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 font-medium">
                                Formato Castores
                              </button>
                            )}

                            {esTresGuerras(e.paqueteria.nombre) && (
                              <button onClick={() => setModalTresGuerras(e.idenvio)}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium">
                                Formato Tres Guerras
                              </button>
                            )}

                            {esGeneral(e.paqueteria.nombre) && (
                              <button onClick={() => setModalGuiaGeneral(e.idenvio)}
                                className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 font-medium">
                                Guía de envío
                              </button>
                            )}

                            {/* Botón Foto — paquetería */}
                            <button
                              onClick={() => setModalFotoPaq(e)}
                              disabled={bloqueado}
                              title={bloqueado ? "Guía ya registrada — no se permiten más fotos" : "Subir foto y registrar guía"}
                              className={`text-xs px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                                bloqueado
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-gray-800 text-white hover:bg-gray-700"
                              }`}
                            >
                              <IconoCamara />
                              {bloqueado ? "Foto ✓" : "Foto"}
                            </button>

                            {e.estado === "preparando" && (
                              <button onClick={() => handleCambiarEstadoPaq(e.idenvio, "entregado")}
                                className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200">
                                Entregado a paquetería
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modales edición ── */}
      {editando && (
        <ModalEditarBitacora
          registro={editando}
          onClose={() => setEditando(null)}
          onGuardar={handleGuardar}
          guardando={guardando}
          form={formEdit}
          setForm={setFormEdit}
        />
      )}

      {editandoPaq && (
        <ModalGuiaPaqueteria
          envio={editandoPaq}
          onClose={() => setEditandoPaq(null)}
          onGuardar={handleGuardarGuia}
          guardando={guardando}
          guia={guiaEdit}
          setGuia={setGuiaEdit}
        />
      )}

      {modalCastores !== null && (
        <ModalFormatoCastores
          idenvio={modalCastores}
          onClose={() => setModalCastores(null)}
        />
      )}

      {modalTresGuerras !== null && (
        <ModalFormatoTresGuerras
          idenvio={modalTresGuerras}
          onClose={() => setModalTresGuerras(null)}
        />
      )}

      {modalGuiaGeneral !== null && (
        <ModalGuiaPaqueteriaGeneral
          idenvio={modalGuiaGeneral}
          onClose={() => setModalGuiaGeneral(null)}
        />
      )}

      {/* Modal foto — paquetería */}
      {modalFotoPaq !== null && (
        <ModalFotoEnvio
          modo="paqueteria"
          envio={modalFotoPaq}
          onClose={() => setModalFotoPaq(null)}
          onCompletado={cargar}
        />
      )}

      {/* Modal foto — reparto local */}
      {modalFotoLocal !== null && (
        <ModalFotoEnvio
          modo="local"
          registro={modalFotoLocal}
          onClose={() => setModalFotoLocal(null)}
          onCompletado={cargar}
        />
      )}
    </div>
  );
}