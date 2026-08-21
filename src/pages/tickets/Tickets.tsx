import { useState, useEffect, useCallback } from "react";
import Dashboard from "../../layouts/Sidebar";
import { useAuth } from "../../context/AuthContext";
import AuditoriaDesplegable from "../../components/auditoria/AuditoriaDesplegable";
import { subirArchivo } from "../../services/archivos/archivos.service";
import { showAlert } from "../../components/CustomAlert";
import {
  crearTicket,
  getMisTickets,
  getTickets,
  getTicketDetalle,
  cambiarEstadoTicket,
  tomarTicket,
  comentarTicket,
  type Ticket,
  type TicketDetalle,
  type EstadoTicket,
  type PrioridadTicket,
} from "../../services/tickets/tickets.service";

const PRIORIDADES: PrioridadTicket[] = ["Baja", "Media", "Alta", "Urgente"];

// ── Columnas del tablero ──────────────────────────────────────────────────
// El orden importa: así se recorre el flujo natural de un ticket de
// izquierda a derecha. El "dot" es el mismo color que usa la barra
// izquierda de cada tarjeta cuando está en esa columna.
const COLUMNAS: { estado: EstadoTicket; label: string; dot: string; header: string }[] = [
  { estado: "Pendiente", label: "Pendiente", dot: "bg-amber-500", header: "border-t-amber-500" },
  { estado: "En proceso", label: "En proceso", dot: "bg-blue-600", header: "border-t-blue-600" },
  { estado: "Finalizado", label: "Finalizado", dot: "bg-emerald-500", header: "border-t-emerald-500" },
  { estado: "Cancelado", label: "Cancelado", dot: "bg-red-500", header: "border-t-red-500" },
];

const BARRA_PRIORIDAD: Record<PrioridadTicket, string> = {
  Baja: "border-l-slate-300",
  Media: "border-l-amber-400",
  Alta: "border-l-orange-500",
  Urgente: "border-l-red-600",
};
const PILDORA_PRIORIDAD: Record<PrioridadTicket, string> = {
  Baja: "bg-slate-100 text-slate-600",
  Media: "bg-amber-100 text-amber-700",
  Alta: "bg-orange-100 text-orange-700",
  Urgente: "bg-red-100 text-red-700",
};
const PILDORA_ESTADO: Record<EstadoTicket, string> = {
  Pendiente: "bg-amber-500 text-white",
  "En proceso": "bg-blue-600 text-white",
  Finalizado: "bg-emerald-500 text-white",
  Cancelado: "bg-red-500 text-white",
};

const iniciales = (nombre?: string, apellido?: string) =>
  `${nombre?.[0] ?? ""}${apellido?.[0] ?? ""}`.toUpperCase() || "?";

export default function Tickets() {
  const { user } = useAuth();
  // OJO: no se usa tienePermiso("tickets.resolver") de useAuth — esa función
  // hace bypass total con acceso_total, y Admin TAMBIÉN tiene acceso_total =
  // true igual que Super Usuario. Usarla le mostraría a Admin la cola
  // completa y los controles de resolver. Aquí se checa el rol exacto, y
  // el privilegio explícito directo del arreglo (sin pasar por el bypass) —
  // así coincide con esResolutorTickets() del backend.
  const esResolutor = user?.rol === "Super Usuario" || (user?.privilegios ?? []).includes("tickets.resolver");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cargando, setCargando] = useState(true);

  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [drawerHistorial, setDrawerHistorial] = useState<number[]>([]);
  const [detalle, setDetalle] = useState<TicketDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [filtroPrioridad, setFiltroPrioridad] = useState("Todas");
  const [verArchivados, setVerArchivados] = useState(false);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevo, setNuevo] = useState({
    titulo: "", descripcion: "", ubicacion: "", prioridad: "Media" as PrioridadTicket, idticket_relacionado: "",
  });
  const [archivosNuevo, setArchivosNuevo] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);

  const [comentarioDraft, setComentarioDraft] = useState("");
  const [comentarioInterno, setComentarioInterno] = useState(false);
  const [archivosComentario, setArchivosComentario] = useState<File[]>([]);
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const cargarLista = useCallback(async () => {
    setCargando(true);
    try {
      const data = esResolutor
        ? await getTickets({
            prioridad: filtroPrioridad !== "Todas" ? filtroPrioridad : undefined,
            archivado: verArchivados,
          })
        : await getMisTickets();
      setTickets(data);
    } catch (e) {
      console.error("❌ Error cargando tickets:", e);
    } finally {
      setCargando(false);
    }
  }, [esResolutor, filtroPrioridad, verArchivados]);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  const refrescarDetalle = async (id: number) => {
    const data = await getTicketDetalle(id);
    setDetalle(data);
  };

  const abrirTicket = async (id: number, desdeVinculo = false) => {
    if (desdeVinculo && drawerId !== null) {
      setDrawerHistorial((prev) => [...prev, drawerId]);
    } else if (!desdeVinculo) {
      setDrawerHistorial([]);
    }
    setDrawerId(id);
    setDetalle(null);
    setCargandoDetalle(true);
    try {
      await refrescarDetalle(id);
    } catch (e) {
      console.error("❌ Error cargando detalle:", e);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const regresarDrawer = () => {
    const anterior = drawerHistorial[drawerHistorial.length - 1];
    if (anterior === undefined) return;
    setDrawerHistorial((prev) => prev.slice(0, -1));
    abrirTicket(anterior);
  };

  const cerrarDrawer = () => {
    setDrawerId(null);
    setDrawerHistorial([]);
    setDetalle(null);
    setComentarioDraft("");
    setComentarioInterno(false);
    setArchivosComentario([]);
  };

  const handleCrear = async () => {
    if (!nuevo.titulo.trim() || !nuevo.descripcion.trim()) {
      showAlert("Título y descripción son requeridos", "error");
      return;
    }
    setGuardando(true);
    try {
      const creado = await crearTicket({
        titulo: nuevo.titulo,
        descripcion: nuevo.descripcion,
        ubicacion: nuevo.ubicacion || undefined,
        prioridad: nuevo.prioridad,
        idticket_relacionado: nuevo.idticket_relacionado ? Number(nuevo.idticket_relacionado) : undefined,
      });

      // El ticket ya existe — cerramos el modal de inmediato. No hacemos
      // esperar al usuario a que las fotos terminen de subir (en celular,
      // una foto de cámara puede pesar varios MB y tardar bastante con
      // datos móviles; sentía que se quedaba "trabado" creando).
      const archivosPendientes = archivosNuevo;
      setNuevo({ titulo: "", descripcion: "", ubicacion: "", prioridad: "Media", idticket_relacionado: "" });
      setArchivosNuevo([]);
      setMostrarForm(false);
      await cargarLista();
      showAlert(`Ticket ${creado.folio} creado`, "success");

      if (archivosPendientes.length > 0) {
        Promise.all(
          archivosPendientes.map((file) =>
            subirArchivo(file, "tickets", undefined, undefined, undefined, creado.idticket)
          )
        )
          .then(() => {
            if (drawerId === creado.idticket) refrescarDetalle(creado.idticket);
          })
          .catch((e) => {
            console.error("❌ Error subiendo imágenes del ticket:", e);
            showAlert("El ticket se creó, pero alguna imagen no se pudo subir. Intenta agregarla desde el ticket.", "error");
          });
      }
    } catch (e: any) {
      showAlert(e.response?.data?.error || "No se pudo crear el ticket", "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (id: number, estado: EstadoTicket) => {
    try {
      await cambiarEstadoTicket(id, estado);
      await cargarLista();
      if (drawerId === id) await refrescarDetalle(id);
    } catch (e: any) {
      showAlert(e.response?.data?.error || "No se pudo cambiar el estado", "error");
    }
  };

  const handleTomar = async (id: number) => {
    try {
      await tomarTicket(id);
      await cargarLista();
      if (drawerId === id) await refrescarDetalle(id);
    } catch (e: any) {
      showAlert(e.response?.data?.error || "Ya lo tomó alguien más", "error");
    }
  };

  const handleComentar = async (id: number) => {
    if (!comentarioDraft.trim() && archivosComentario.length === 0) return;
    setEnviandoComentario(true);
    try {
      let comentarioId: number | undefined;
      if (comentarioDraft.trim()) {
        const c = await comentarTicket(id, comentarioDraft, comentarioInterno);
        comentarioId = c.idticket_comentario;
      }

      const archivosPendientes = archivosComentario;
      setComentarioDraft("");
      setComentarioInterno(false);
      setArchivosComentario([]);
      await refrescarDetalle(id);

      // Igual que al crear el ticket: no bloquear la UI esperando a que
      // suban las fotos, que en celular pueden tardar. El comentario ya
      // quedó publicado; las imágenes aparecen solas cuando terminan.
      if (archivosPendientes.length > 0) {
        Promise.all(
          archivosPendientes.map((file) =>
            subirArchivo(file, "tickets", undefined, undefined, undefined, id, comentarioId)
          )
        )
          .then(() => refrescarDetalle(id))
          .catch((e) => {
            console.error("❌ Error subiendo imágenes del comentario:", e);
            showAlert("El comentario se envió, pero alguna imagen no se pudo subir.", "error");
          });
      }
    } catch (e: any) {
      showAlert(e.response?.data?.error || "No se pudo comentar", "error");
    } finally {
      setEnviandoComentario(false);
    }
  };

  const archivablesParaVincular = tickets.filter((t) => t.estado === "Finalizado");

  return (
    <Dashboard>
      <div className="w-full space-y-5">
        {/* ── Encabezado ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-base shadow-sm">
                🎫
              </span>
              Mesa de Tickets
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {esResolutor ? "Cola completa · toma, resuelve y cierra tickets" : "Tus tickets reportados"}
            </p>
          </div>
          <button
            onClick={() => setMostrarForm(true)}
            className="px-4 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-all self-start sm:self-auto"
          >
            + Nuevo ticket
          </button>
        </div>

        {/* ── Filtros ────────────────────────────────────────────────── */}
        {esResolutor && (
          <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value)}
              className="text-sm px-2 py-1.5 rounded-lg border border-slate-200"
            >
              <option>Todas las prioridades</option>
              {PRIORIDADES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-slate-600 ml-auto">
              <input type="checkbox" checked={verArchivados} onChange={(e) => setVerArchivados(e.target.checked)} />
              Ver archivo histórico
            </label>
          </div>
        )}

        {/* ── Tablero kanban ─────────────────────────────────────────── */}
        {cargando ? (
          <p className="text-sm text-slate-400 italic">Cargando tickets...</p>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center">
            <p className="text-sm text-slate-400">No hay tickets por aquí. 🎉</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNAS.map((col) => {
              const items = tickets.filter((t) => t.estado === col.estado);
              return (
                <div key={col.estado} className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <h2 className="text-sm font-bold text-slate-700">{col.label}</h2>
                    <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                      {items.length}
                    </span>
                  </div>
                  <div className={`flex-1 space-y-2.5 rounded-2xl border-t-4 ${col.header} bg-slate-50/60 p-2.5 min-h-[120px]`}>
                    {items.length === 0 && (
                      <p className="text-xs text-slate-300 italic px-2 py-4 text-center">vacío</p>
                    )}
                    {items.map((t) => (
                      <button
                        key={t.idticket}
                        onClick={() => abrirTicket(t.idticket)}
                        className={`w-full text-left bg-white border-l-4 ${BARRA_PRIORIDAD[t.prioridad]} border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-slate-400">{t.folio}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${PILDORA_PRIORIDAD[t.prioridad]}`}>
                            {t.prioridad}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{t.titulo}</p>
                        <div className="flex items-center justify-between mt-2">
                          {t.asignado_nombre ? (
                            <span
                              title={`${t.asignado_nombre} ${t.asignado_apellido ?? ""}`}
                              className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center"
                            >
                              {iniciales(t.asignado_nombre, t.asignado_apellido)}
                            </span>
                          ) : esResolutor && t.estado !== "Finalizado" && t.estado !== "Cancelado" ? (
                            <span className="text-[10px] font-semibold text-blue-600">Sin tomar</span>
                          ) : (
                            <span />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: nuevo ticket ─────────────────────────────────────── */}
      {mostrarForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4" onClick={() => setMostrarForm(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Nuevo ticket</h3>
              <button onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              <input
                placeholder="Título breve"
                value={nuevo.titulo}
                onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200"
              />
              <textarea
                placeholder="Describe el problema o solicitud..."
                rows={3}
                value={nuevo.descripcion}
                onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 resize-none"
              />
              <input
                placeholder="¿Dónde ocurre? ej. Seguimiento → ventana de envíos"
                value={nuevo.ubicacion}
                onChange={(e) => setNuevo({ ...nuevo, ubicacion: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={nuevo.prioridad}
                  onChange={(e) => setNuevo({ ...nuevo, prioridad: e.target.value as PrioridadTicket })}
                  className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-slate-200"
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                {archivablesParaVincular.length > 0 && (
                  <select
                    value={nuevo.idticket_relacionado}
                    onChange={(e) => setNuevo({ ...nuevo, idticket_relacionado: e.target.value })}
                    className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-slate-200"
                  >
                    <option value="">¿Ya había pasado antes? (opcional)</option>
                    {archivablesParaVincular.map((t) => (
                      <option key={t.idticket} value={t.idticket}>
                        {t.folio} — {t.titulo}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg cursor-pointer transition-colors">
                  📎 Subir imágenes (sin límite)
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setArchivosNuevo((prev) => [...prev, ...Array.from(e.target.files || [])])}
                    className="hidden"
                  />
                </label>
                {archivosNuevo.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {archivosNuevo.map((file, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setArchivosNuevo((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center bg-black/60 text-white rounded-full text-[10px] leading-none"
                          title="Quitar"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setMostrarForm(false)}
                  disabled={guardando}
                  className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrear}
                  disabled={guardando}
                  className="flex-1 py-2 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {guardando ? "Creando..." : "Crear ticket"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer: detalle del ticket ──────────────────────────────── */}
      {drawerId !== null && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={cerrarDrawer} />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto animate-[slideIn_.2s_ease-out]">
            <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

            {cargandoDetalle || !detalle ? (
              <p className="px-5 py-6 text-sm text-slate-400">Cargando...</p>
            ) : (
              <>
                <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
                  <div>
                    {drawerHistorial.length > 0 && (
                      <button
                        onClick={regresarDrawer}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 mb-1.5 flex items-center gap-1"
                      >
                        ← Regresar
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-slate-400">{detalle.folio}</span>
                    <h3 className="text-base font-bold text-slate-800 leading-snug">{detalle.titulo}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PILDORA_ESTADO[detalle.estado]}`}>
                        {detalle.estado}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PILDORA_PRIORIDAD[detalle.prioridad]}`}>
                        {detalle.prioridad}
                      </span>
                    </div>
                  </div>
                  <button onClick={cerrarDrawer} className="text-slate-400 hover:text-slate-600 text-2xl leading-none flex-shrink-0">×</button>
                </div>

                <div className="px-5 py-4 border-b border-slate-100 space-y-1.5">
                  <p className="text-sm text-slate-600">{detalle.descripcion}</p>
                  {detalle.ubicacion && <p className="text-xs text-slate-500">📍 {detalle.ubicacion}</p>}
                  <p className="text-xs text-slate-400">
                    Creado por {detalle.creador_nombre} {detalle.creador_apellido}
                  </p>
                  {detalle.relacionado_folio && detalle.idticket_relacionado && (
                    <button
                      onClick={() => abrirTicket(detalle.idticket_relacionado!, true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      ↳ vinculado a {detalle.relacionado_folio} — ver detalle completo
                    </button>
                  )}
                  {detalle.archivos.filter((a) => !a.ticket_comentario_id).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {detalle.archivos
                        .filter((a) => !a.ticket_comentario_id)
                        .map((a) => (
                          <a
                            key={a.id_archivo}
                            href={a.url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            title={a.nombre}
                            className="block w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity"
                          >
                            {a.url ? (
                              <img src={a.url} alt={a.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 bg-slate-100">
                                {a.nombre}
                              </div>
                            )}
                          </a>
                        ))}
                    </div>
                  )}
                </div>

                {esResolutor && (
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                    {detalle.asignado_a === user?.id ? (
                      <div className="flex flex-wrap gap-1.5">
                        {COLUMNAS.map((c) => (
                          <button
                            key={c.estado}
                            onClick={() => handleCambiarEstado(detalle.idticket, c.estado)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                              detalle.estado === c.estado
                                ? `${PILDORA_ESTADO[c.estado]} border-transparent`
                                : "border-slate-200 text-slate-400 hover:border-slate-300"
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    ) : detalle.asignado_a ? (
                      <p className="text-xs text-slate-500">
                        Asignado a <strong>{detalle.asignado_nombre} {detalle.asignado_apellido}</strong> — solo esa persona puede cambiar el estado
                      </p>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Nadie lo ha tomado todavía</span>
                        <button
                          onClick={() => handleTomar(detalle.idticket)}
                          className="text-xs px-3 py-1.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-lg font-semibold"
                        >
                          Tomar ticket
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="px-5 py-4 space-y-2.5">
                  {detalle.comentarios.length === 0 && (
                    <p className="text-xs italic text-slate-400">Aún no hay comentarios.</p>
                  )}
                  {detalle.comentarios.map((c) => (
                    <div
                      key={c.idticket_comentario}
                      className={`p-2.5 rounded-xl text-sm ${
                        c.es_interno ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700">
                          {c.nombre} {c.apellido}
                        </span>
                        {c.es_interno && (
                          <span className="text-[10px] font-semibold text-amber-700">🔒 Nota interna</span>
                        )}
                      </div>
                      <p className="text-slate-600">{c.comentario}</p>
                      {detalle.archivos.filter((a) => a.ticket_comentario_id === c.idticket_comentario).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {detalle.archivos
                            .filter((a) => a.ticket_comentario_id === c.idticket_comentario)
                            .map((a) => (
                              <a
                                key={a.id_archivo}
                                href={a.url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                title={a.nombre}
                                className="block w-12 h-12 rounded-md overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity"
                              >
                                {a.url && <img src={a.url} alt={a.nombre} className="w-full h-full object-cover" />}
                              </a>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-5 pb-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 transition-colors">
                    <textarea
                      value={comentarioDraft}
                      onChange={(e) => setComentarioDraft(e.target.value)}
                      placeholder="Escribe un comentario o actualización..."
                      rows={2}
                      className="w-full text-sm px-3 py-2 resize-none outline-none block"
                    />
                    {archivosComentario.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-3 pb-2">
                        {archivosComentario.map((file, i) => (
                          <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                            <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                            <button
                              onClick={() => setArchivosComentario((prev) => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center bg-black/60 text-white rounded-full text-[10px] leading-none"
                              title="Quitar"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 cursor-pointer">
                          📎 Adjuntar
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            capture="environment"
                            onChange={(e) =>
                              setArchivosComentario((prev) => [...prev, ...Array.from(e.target.files || [])])
                            }
                            className="hidden"
                          />
                        </label>
                        {esResolutor && (
                          <label className="flex items-center gap-1.5 text-xs text-slate-500">
                            <input
                              type="checkbox"
                              checked={comentarioInterno}
                              onChange={(e) => setComentarioInterno(e.target.checked)}
                            />
                            Nota interna (solo dev)
                          </label>
                        )}
                      </div>
                      <button
                        onClick={() => handleComentar(detalle.idticket)}
                        disabled={enviandoComentario}
                        className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold disabled:opacity-50"
                      >
                        {enviandoComentario ? "Enviando..." : "Enviar"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 px-5 py-4">
                  <AuditoriaDesplegable tabla="ticket" id={detalle.idticket} titulo="Historial de auditoría" />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Dashboard>
  );
}