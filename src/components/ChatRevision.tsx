import { useState, useEffect, useRef, useCallback } from "react";
import {
  getMensajes,
  enviarMensaje,
  aprobarOrdenDiseno,
  getOrdenDisenoById,
} from "../services/ordenDisenoService";
import type {
  MensajeDiseno,
  OrdenDisenoDetalle,
  RevisionDiseno,
} from "../types/ordenDiseno.types";
import SubirRender from "./SubirRender";
import HistorialVersiones from "./HistorialVersiones";
import ModalAprobarDiseno from "./ModalAprobarDiseno";
import Modal from "./Modal";
import { usePermisos } from "../hooks/usePermiso";

const POLLING_MS = 3000;

const fmtHora = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
};

const fmtFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
};

function ArchivosRevision({
  revision,
  esMio,
}: {
  revision: RevisionDiseno;
  esMio: boolean;
}) {
  if (!revision.archivos || revision.archivos.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 mt-1 ${esMio ? "justify-end" : "justify-start"}`}>
      {revision.archivos.map((archivo) => {
        const esPdf    = archivo.mime_type === "application/pdf";
        const esImagen = archivo.mime_type?.startsWith("image/");

        return (
          <a
            key={archivo.id_archivo}
            href={archivo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            {esImagen ? (
              <div className="flex flex-col gap-1">
                <div className="w-40 h-28 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                  <img
                    src={archivo.url}
                    alt={archivo.nombre}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 max-w-[160px] truncate">   
                  {archivo.nombre.length > 20
                    ? archivo.nombre.substring(0, 20) + "..."
                    : archivo.nombre}
                </span>
              </div>
            ) : esPdf ? (
              <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-colors max-w-[200px] ${
                esMio
                  ? "bg-blue-500 border-blue-400 hover:bg-blue-400"
                  : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  esMio ? "bg-blue-400" : "bg-red-100"
                }`}>
                  <svg className={`w-4 h-4 ${esMio ? "text-white" : "text-red-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className={`text-xs truncate ${esMio ? "text-white" : "text-gray-700"}`}>
                  {archivo.nombre.length > 18
                    ? archivo.nombre.substring(0, 18) + "..."
                    : archivo.nombre}
                </span>
              </div>
            ) : (
              <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-colors ${
                esMio
                  ? "bg-blue-500 border-blue-400 hover:bg-blue-400"
                  : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              }`}>
                <svg className={`w-4 h-4 flex-shrink-0 ${esMio ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className={`text-xs truncate max-w-[140px] ${esMio ? "text-white" : "text-gray-700"}`}>
                  {archivo.nombre.length > 18
                    ? archivo.nombre.substring(0, 18) + "..."
                    : archivo.nombre}
                </span>
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}

interface Props {
  idorden:   number;
  usuarioId: number;
  onClose:   () => void;
}

type PanelActivo = "chat" | "historial" | "participantes";

export default function ChatRevision({ idorden, usuarioId, onClose }: Props) {
  const { puedeEditarDiseno, puedeOrdenDiseno } = usePermisos({
    puedeEditarDiseno: "Editar Diseño",
    puedeOrdenDiseno:  "Orden de Diseño",
  });

  const [orden,        setOrden]        = useState<OrdenDisenoDetalle | null>(null);
  const [mensajes,     setMensajes]     = useState<MensajeDiseno[]>([]);
  const [texto,        setTexto]        = useState("");
  const [loading,      setLoading]      = useState(true);
  const [enviando,     setEnviando]     = useState(false);
  const [panel,        setPanel]        = useState<PanelActivo>("chat");
  const [modalSubir,   setModalSubir]   = useState<"render" | "feedback" | null>(null);
  const [modalAprobar, setModalAprobar] = useState(false);
  const [aprobando,    setAprobando]    = useState(false);

  const chatRef        = useRef<HTMLDivElement>(null);
  const pollingRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const ultimoMsgRef   = useRef<string | undefined>(undefined);
  const aprobadoRef    = useRef<boolean>(false);
  const revisionMapRef = useRef<Map<number, RevisionDiseno>>(new Map());
  const cargarOrdenRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const cargarOrden = useCallback(async () => {
    try {
      const data = await getOrdenDisenoById(idorden);
      setOrden(data);
      setMensajes(data.mensajes);
      aprobadoRef.current = data.estado === "aprobado";
      if (data.mensajes.length > 0) {
        ultimoMsgRef.current = data.mensajes[data.mensajes.length - 1].created_at;
      }
      revisionMapRef.current = new Map(data.revisiones.map((r: RevisionDiseno) => [r.idrevision, r]));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [idorden]);

  useEffect(() => {
    cargarOrdenRef.current = cargarOrden;
  }, [cargarOrden]);

  useEffect(() => {
    cargarOrden();
  }, [cargarOrden]);

  useEffect(() => {
    const poll = async () => {
      if (aprobadoRef.current) return;
      try {
        const desde = ultimoMsgRef.current
          ? new Date(new Date(ultimoMsgRef.current).getTime() - 1000).toISOString()
          : undefined;
        const nuevos = await getMensajes(idorden, desde);
        if (nuevos.length > 0) {
          const hayRevisionNueva = nuevos.some(
            (m: MensajeDiseno) =>
              m.tipo === "sistema" &&
              m.revision_id &&
              !revisionMapRef.current.has(m.revision_id)
          );

          if (hayRevisionNueva) {
            await cargarOrdenRef.current();
            return;
          }

          setMensajes(prev => {
            const idsExistentes = new Set(prev.map((m: MensajeDiseno) => m.idmensaje));
            const filtrados = nuevos.filter((m: MensajeDiseno) => !idsExistentes.has(m.idmensaje));
            if (filtrados.length === 0) return prev;
            ultimoMsgRef.current = filtrados[filtrados.length - 1].created_at;
            return [...prev, ...filtrados];
          });
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    };

    pollingRef.current = setInterval(poll, POLLING_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [idorden]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensajes]);

  const handleEnviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try {
      await enviarMensaje(idorden, texto.trim());
      setTexto("");
      const nuevos = await getMensajes(idorden);
      setMensajes(nuevos);
      if (nuevos.length > 0) {
        ultimoMsgRef.current = nuevos[nuevos.length - 1].created_at;
      }
    } catch (e: any) {
      alert(e.response?.data?.error || "Error al enviar mensaje");
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const handleAprobar = async () => {
    setAprobando(true);
    try {
      await aprobarOrdenDiseno(idorden);
      aprobadoRef.current = true;
      await cargarOrden();
      setModalAprobar(false);
    } catch (e: any) {
      alert(e.response?.data?.error || "Error al aprobar");
    } finally {
      setAprobando(false);
    }
  };

  const handleRevisionExitosa = async () => {
    setModalSubir(null);
    await cargarOrden();
    const nuevos = await getMensajes(idorden);
    setMensajes(nuevos);
    if (nuevos.length > 0) {
      ultimoMsgRef.current = nuevos[nuevos.length - 1].created_at;
    }
  };

  if (loading || !orden) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const aprobado  = orden.estado === "aprobado";
  const versiones = orden.revisiones.filter(r => r.tipo === "render").length;

  const revisionMap = new Map<number, RevisionDiseno>(
    orden.revisiones.map(r => [r.idrevision, r])
  );

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 520 }}>

      {/* ── Header ── */}
      <div className={`px-4 py-3 rounded-t-xl border-b ${
        aprobado ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900 text-sm">
              {orden.no_pedido}
              {orden.no_cotizacion ? ` · Cot. #${orden.no_cotizacion}` : ""}
              {" · "}v{orden.version_actual}
            </p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            aprobado ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
          }`}>
            {aprobado ? "✓ Aprobado" : "En revisión"}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {(["chat", "historial", "participantes"] as PanelActivo[]).map(tab => (
            <button
              key={tab}
              onClick={() => setPanel(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                panel === tab
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "chat"
                ? "💬 Chat"
                : tab === "historial"
                ? `📋 Historial (${orden.revisiones.length})`
                : `👥 Participantes (${orden.participantes.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Panel Chat ── */}
      {panel === "chat" && (
        <>
          <div
            ref={chatRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50"
            style={{ maxHeight: 340 }}
          >
            {mensajes.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                Aún no hay mensajes. ¡Empieza la conversación!
              </div>
            ) : mensajes.map((msg, idx) => {
              const esMio      = msg.usuario_id === usuarioId;
              const esSistema  = msg.tipo === "sistema";
              const anterior   = idx > 0 ? mensajes[idx - 1] : null;
              const mismoFecha = anterior
                ? fmtFecha(anterior.created_at) === fmtFecha(msg.created_at)
                : false;

              const revision = (esSistema && msg.revision_id)
                ? revisionMap.get(msg.revision_id)
                : undefined;

              // La revisión la subió el usuario actual si subido_por_id === usuarioId
              const revisionEsMia = revision
                ? revision.subido_por_id === usuarioId
                : false;

              return (
                <div key={msg.idmensaje}>
                  {!mismoFecha && (
                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 px-2">
                        {fmtFecha(msg.created_at)}
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}

                  {/* Mensaje de sistema — pill centrado */}
                  {esSistema && (
                    <div className="flex justify-center mb-1">
                      <span className="text-xs text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full">
                        {msg.contenido}
                      </span>
                    </div>
                  )}

                  {/* Mensaje de texto normal */}
                  {!esSistema && (
                    <div className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs lg:max-w-sm flex flex-col ${esMio ? "items-end" : "items-start"}`}>
                        {!esMio && (
                          <span className="text-xs text-gray-500 mb-0.5 px-1">
                            {msg.usuario_nombre} {msg.usuario_apellido}
                          </span>
                        )}
                        <div className={`px-3 py-2 rounded-2xl text-sm ${
                          esMio
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                        }`}>
                          {msg.contenido}
                        </div>
                        <span className="text-xs text-gray-400 mt-0.5 px-1">
                          {fmtHora(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Observaciones de la revisión — como burbuja de mensaje */}
                  {revision?.observaciones && (
                    <div className={`flex ${revisionEsMia ? "justify-end" : "justify-start"} mt-1`}>
                      <div className={`max-w-xs lg:max-w-sm flex flex-col ${revisionEsMia ? "items-end" : "items-start"}`}>
                        {!revisionEsMia && (
                          <span className="text-xs text-gray-500 mb-0.5 px-1">
                            {revision.subido_por_nombre} {revision.subido_por_apellido}
                          </span>
                        )}
                        <div className={`px-3 py-2 rounded-2xl text-sm ${
                          revisionEsMia
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                        }`}>
                          {revision.observaciones}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Archivos de la revisión */}
                  {revision && (
                    <div className={`flex ${revisionEsMia ? "justify-end" : "justify-start"} mt-1`}>
                      <div className="max-w-xs lg:max-w-sm">
                        <ArchivosRevision
                          revision={revision}
                          esMio={revisionEsMia}
                        />
                        <span className={`text-xs text-gray-400 mt-0.5 px-1 block ${revisionEsMia ? "text-right" : "text-left"}`}>
                          {fmtHora(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Acciones rápidas ── */}
          {!aprobado && (
            <div className="flex gap-2 px-4 py-2 bg-white border-t border-gray-100 flex-wrap">
              {puedeEditarDiseno && (
                <button
                  onClick={() => setModalSubir("render")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Subir render
                </button>
              )}

              {puedeOrdenDiseno && !puedeEditarDiseno && (
                <button
                  onClick={() => setModalSubir("feedback")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Feedback cliente
                </button>
              )}

              {puedeEditarDiseno && (
                <button
                  onClick={() => setModalAprobar(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-semibold text-green-700 transition-colors ml-auto"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Aprobar diseño
                </button>
              )}
            </div>
          )}

          {/* ── Input de texto ── */}
          {!aprobado ? (
            <div className="flex items-end gap-2 px-4 py-3 bg-white border-t border-gray-200">
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Escribe un mensaje... (Enter para enviar)"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-800 bg-gray-50 focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none"
                style={{ maxHeight: 100 }}
              />
              <button
                onClick={handleEnviar}
                disabled={enviando || !texto.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {enviando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 bg-green-50 border-t border-green-200 text-center">
              <p className="text-xs text-green-700 font-medium">
                ✓ Diseño aprobado el {fmtFecha(orden.autorizado_at!)} — Solo lectura
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Panel Historial ── */}
      {panel === "historial" && (
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50" style={{ maxHeight: 440 }}>
          <HistorialVersiones
            revisiones={orden.revisiones}
            idorden={idorden}
            onActualizar={cargarOrden}
          />
        </div>
      )}

      {/* ── Panel Participantes ── */}
      {panel === "participantes" && (
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 space-y-2" style={{ maxHeight: 440 }}>
          {orden.participantes.map(p => (
            <div key={p.idparticipante} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-700">
                  {p.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {p.nombre} {p.apellido}
                </p>
                <p className="text-xs text-gray-400">{p.rol_sistema}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Botón cerrar ── */}
      <div className="flex justify-end px-4 py-3 border-t border-gray-100 bg-white rounded-b-xl">
        <button
          onClick={onClose}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>

      {/* ── Modal subir render/feedback ── */}
      {modalSubir && (
        <Modal
          isOpen={!!modalSubir}
          onClose={() => setModalSubir(null)}
          title={modalSubir === "render" ? "Subir Render" : "Registrar Feedback"}
        >
          <SubirRender
            idorden={idorden}
            noPedido={orden.no_pedido}
            tipo={modalSubir}
            onSuccess={handleRevisionExitosa}
            onCancel={() => setModalSubir(null)}
          />
        </Modal>
      )}

      {/* ── Modal aprobar ── */}
      {modalAprobar && (
        <Modal
          isOpen={modalAprobar}
          onClose={() => setModalAprobar(false)}
          title="Aprobar Diseño"
        >
          <ModalAprobarDiseno
            noPedido={orden.no_pedido}
            versiones={versiones}
            onConfirm={handleAprobar}
            onCancel={() => setModalAprobar(false)}
            aprobando={aprobando}
          />
        </Modal>
      )}
    </div>
  );
}