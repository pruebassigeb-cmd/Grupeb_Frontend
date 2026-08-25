import { useState, useEffect, useCallback, useRef } from "react";
import Dashboard from "../../layouts/Sidebar";
import { useAuth } from "../../context/AuthContext";
import AuditoriaDesplegable from "../../components/auditoria/AuditoriaDesplegable";
import { subirArchivo } from "../../services/archivos/archivos.service";
import { showAlert } from "../../components/CustomAlert";
import {
  crearTicket,
  getTickets,
  getTicketDetalle,
  cambiarEstadoTicket,
  cambiarPrioridadTicket,
  cambiarEstrellasTicket,
  tomarTicket,
  comentarTicket,
  asignarTicketA,
  liberarTicket,
  rebotarTicket,
  getUsuariosAsignables,
  getEquipoActivo,
  getNotificacionesTickets,
  type Ticket,
  type TicketDetalle,
  type EstadoTicket,
  type PrioridadTicket,
  type UsuarioAsignable,
  type EquipoActivoItem,
} from "../../services/tickets/tickets.service";

const PRIORIDADES: PrioridadTicket[] = ["Baja", "Media", "Alta", "Urgente"];

// Urgente siempre arriba, Baja siempre abajo — mismo orden en todas las
// columnas del tablero.
const RANGO_PRIORIDAD: Record<PrioridadTicket, number> = { Urgente: 0, Alta: 1, Media: 2, Baja: 3 };

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

// Columnas del TABLERO — distinto de COLUMNAS de arriba (esas son los 4
// estados reales, usadas para los botones de cambio de estado del drawer).
// Aquí "Rebotados" es una columna visual aparte: mismo estado Pendiente,
// pero separado para que salte a la vista que ese ticket ya se le regresó
// a alguien antes. En cuanto alguien lo vuelve a tomar, sale solo de aquí
// (porque su estado deja de ser Pendiente) sin que haya que resetear nada.
interface ColumnaTablero {
  key: string;
  label: string;
  dot: string;
  header: string;
  filtro: (t: Ticket) => boolean;
}
const TABLERO_COLUMNAS: ColumnaTablero[] = [
  { key: "Rebotados", label: "Rebotados", dot: "bg-rose-500", header: "border-t-rose-500", filtro: (t) => t.estado === "Pendiente" && t.rebotado },
  { key: "Pendiente", label: "Pendiente", dot: "bg-amber-500", header: "border-t-amber-500", filtro: (t) => t.estado === "Pendiente" && !t.rebotado },
  { key: "En proceso", label: "En proceso", dot: "bg-blue-600", header: "border-t-blue-600", filtro: (t) => t.estado === "En proceso" },
  { key: "Finalizado", label: "Finalizado", dot: "bg-emerald-500", header: "border-t-emerald-500", filtro: (t) => t.estado === "Finalizado" },
  { key: "Cancelado", label: "Cancelado", dot: "bg-red-500", header: "border-t-red-500", filtro: (t) => t.estado === "Cancelado" },
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

const estaVencido = (t: Ticket) =>
  !!t.fecha_compromiso &&
  new Date(t.fecha_compromiso) < new Date() &&
  !["Finalizado", "Cancelado"].includes(t.estado);

// "Reservado" = le asignaron el ticket directo (asignarTicketA) pero
// todavía no lo confirma/toma — se queda en Pendiente a propósito, con
// dueño ya puesto, para que nadie más lo agarre mientras tanto.
const esReservado = (t: Ticket) => t.estado === "Pendiente" && !!t.asignado_a && !t.rebotado;

// % de diferencia entre lo real y lo estimado — mismo cálculo que ya se
// usaba solo dentro del drawer, ahora reutilizable para la tarjeta también.
// null si no hay con qué comparar (falta el estimado o el real).
const pctTiempo = (t: Ticket): { pct: number; sobreEstimado: boolean } | null => {
  if (t.duracion_estimada_horas == null || t.tiempo_real_horas == null || t.duracion_estimada_horas === 0) return null;
  const pct = Math.round(((t.tiempo_real_horas - t.duracion_estimada_horas) / t.duracion_estimada_horas) * 100);
  return { pct, sobreEstimado: pct > 0 };
};

// Hora de un mensaje individual, formato "6:04 p.m." — usa la zona horaria
// del navegador, que ya es la correcta (la de quien lo está viendo).
const formatearHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });

// Separador de día estilo WhatsApp: "Hoy" / "Ayer" / "25 de agosto".
const formatearSeparadorFecha = (iso: string) => {
  const fecha = new Date(iso);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const mismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (mismoDia(fecha, hoy)) return "Hoy";
  if (mismoDia(fecha, ayer)) return "Ayer";
  return fecha.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: fecha.getFullYear() !== hoy.getFullYear() ? "numeric" : undefined,
  });
};

// Estrellas 1-3 para desempatar importancia dentro de la misma prioridad.
// En modo solo-lectura son <span> (se usa dentro de la tarjeta, que ya es
// un <button> — no se puede meter un <button> dentro de otro). En modo
// editable sí son botones individuales, solo se usa en el drawer.
function Estrellas({
  valor,
  editable = false,
  onChange,
  className = "text-xs",
}: {
  valor: number;
  editable?: boolean;
  onChange?: (n: 1 | 2 | 3 | 4 | 5) => void;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {([1, 2, 3, 4, 5] as const).map((n) =>
        editable ? (
          <button
            key={n}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange?.(n);
            }}
            title={`${n} estrella${n > 1 ? "s" : ""}`}
            className="leading-none px-0.5 hover:scale-110 transition-transform"
          >
            <span className={n <= valor ? "text-amber-500" : "text-slate-300"}>★</span>
          </button>
        ) : (
          <span key={n} className={`leading-none ${n <= valor ? "text-amber-500" : "text-slate-300"}`}>
            ★
          </span>
        )
      )}
    </span>
  );
}

export default function Tickets() {
  const { user } = useAuth();
  // El acceso a tickets es 100% manual por privilegio — sin atajos por rol
  // ni por acceso_total. Antes esResolutor daba por hecho que cualquiera
  // con rol "Super Usuario" era resolutor, lo que hacía inútil desmarcar la
  // casilla en Roles y Privilegios para ese rol. Ahora depende únicamente
  // de que "tickets.crear"/"tickets.resolver" esté en user.privilegios —
  // mismo criterio exacto que esResolutorTickets()/tieneAccesoTickets() del
  // backend (tickets.controller.ts), para que nunca se desalineen.
  const privilegiosTickets = user?.privilegios ?? [];
  const tieneAcceso = privilegiosTickets.includes("tickets.crear") || privilegiosTickets.includes("tickets.resolver");
  const esResolutor = privilegiosTickets.includes("tickets.resolver");

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
    titulo: "", descripcion: "", ubicacion: "", prioridad: "Media" as PrioridadTicket, estrellas: 1 as 1 | 2 | 3 | 4 | 5, idticket_relacionado: "", es_personal: false,
  });
  const [archivosNuevo, setArchivosNuevo] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Fase 1: equipo activo (panel de devs con tickets En proceso) y usuarios
  // a los que se puede asignar directo desde el drawer.
  const [equipoActivoRaw, setEquipoActivoRaw] = useState<EquipoActivoItem[]>([]);
  const [usuariosAsignables, setUsuariosAsignables] = useState<UsuarioAsignable[]>([]);
  const [notificaciones, setNotificaciones] = useState<Record<number, boolean>>({});
  const [asignarA, setAsignarA] = useState("");
  const [asignando, setAsignando] = useState(false);
  const [liberando, setLiberando] = useState(false);
  const [motivoRebote, setMotivoRebote] = useState("");
  const [rebotarDestino, setRebotarDestino] = useState("");
  const [rebotando, setRebotando] = useState(false);
  const [mostrarRebote, setMostrarRebote] = useState(false);
  const [cambiandoPrioridad, setCambiandoPrioridad] = useState<number | null>(null);

  // Duración estimada al tomar un ticket (Fase 3)
  const [mostrarEstimacion, setMostrarEstimacion] = useState(false);
  const [estimacionDias, setEstimacionDias] = useState("");
  const [estimacionHoras, setEstimacionHoras] = useState("");
  const [estimacionMinutos, setEstimacionMinutos] = useState("");

  const [comentarioDraft, setComentarioDraft] = useState("");
  const [comentarioInterno, setComentarioInterno] = useState(false);
  const [archivosComentario, setArchivosComentario] = useState<File[]>([]);
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Evita que arrastrar el mouse (ej. seleccionando texto) desde dentro del
  // modal hacia afuera se interprete como un clic en el fondo y lo cierre.
  // Solo cierra si el mousedown Y el click ocurrieron los dos directo sobre
  // el fondo — no si el arrastre empezó adentro del contenido.
  const [mouseDownEnFondoForm, setMouseDownEnFondoForm] = useState(false);
  const [mouseDownEnFondoDrawer, setMouseDownEnFondoDrawer] = useState(false);

  const cargarLista = useCallback(async () => {
    setCargando(true);
    try {
      // Antes solo el resolutor veía la cola completa (getTickets) y el
      // Admin solo veía lo suyo (getMisTickets) — eso significaba que un
      // Admin no podía ver en qué estaba trabajando un Super Usuario. Ahora
      // cualquiera con acceso al módulo ve la cola completa; la privacidad
      // de los personales ya está protegida del lado del backend.
      const data = await getTickets({
        prioridad: filtroPrioridad !== "Todas" ? filtroPrioridad : undefined,
        archivado: verArchivados,
      });
      setTickets(data);
    } catch (e) {
      console.error("❌ Error cargando tickets:", e);
    } finally {
      setCargando(false);
    }
    // La campanita se pide aparte y no bloquea el spinner de la lista —
    // si falla, simplemente no se pinta ningún punto rojo, no truena nada.
    getNotificacionesTickets()
      .then((n) => setNotificaciones(n.porTicket))
      .catch((e) => console.error("❌ Error cargando notificaciones:", e));
  }, [filtroPrioridad, verArchivados]);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  // El panel "Equipo activo" ahora es visible para cualquiera con acceso al
  // módulo (Admin también) — es solo informativo, no da ningún poder extra.
  useEffect(() => {
    getEquipoActivo()
      .then((data) => setEquipoActivoRaw(Array.isArray(data) ? data : []))
      .catch((e) => console.error("❌ Equipo activo:", e));
  }, [tickets]);

  // El usuario logueado siempre va primero en la lista — "soy yo, quiero
  // verme de inmediato sin buscar" — el resto conserva el orden que ya
  // trae el backend (alfabético).
  const equipoActivo = [...equipoActivoRaw].sort((a, b) => {
    if (a.idusuario === user?.id) return -1;
    if (b.idusuario === user?.id) return 1;
    return 0;
  });

  // El catálogo de "a quién asignar/rebotar" también se abrió: un Admin
  // necesita esta lista para poder rebotar SU propio ticket personal directo
  // a alguien. La acción de asignación en frío (PATCH /asignar) sigue
  // siendo exclusiva de Super Usuario — eso no cambió, solo el catálogo.
  useEffect(() => {
    getUsuariosAsignables().then(setUsuariosAsignables).catch((e) => console.error("❌ Usuarios asignables:", e));
  }, []);

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
      // El backend ya marcó ticket_visto al servir el detalle — reflejamos
      // eso de inmediato en la UI sin esperar al próximo cargarLista().
      setNotificaciones((prev) => ({ ...prev, [id]: false }));
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
    setAsignarA("");
    setMotivoRebote("");
    setRebotarDestino("");
    setMostrarRebote(false);
    setMostrarEstimacion(false);
    setEstimacionDias("");
    setEstimacionHoras("");
    setEstimacionMinutos("");
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
        estrellas: nuevo.estrellas,
        idticket_relacionado: nuevo.idticket_relacionado ? Number(nuevo.idticket_relacionado) : undefined,
        es_personal: nuevo.es_personal,
      });

      // El ticket ya existe — cerramos el modal de inmediato. No hacemos
      // esperar al usuario a que las fotos terminen de subir (en celular,
      // una foto de cámara puede pesar varios MB y tardar bastante con
      // datos móviles; sentía que se quedaba "trabado" creando).
      const archivosPendientes = archivosNuevo;
      setNuevo({ titulo: "", descripcion: "", ubicacion: "", prioridad: "Media", estrellas: 1, idticket_relacionado: "", es_personal: false });
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
      const dias = Number(estimacionDias) || 0;
      const horas = Number(estimacionHoras) || 0;
      const minutos = Number(estimacionMinutos) || 0;
      await tomarTicket(id, { dias_habiles: dias, horas_habiles: horas, minutos_habiles: minutos });
      setEstimacionDias("");
      setEstimacionHoras("");
      setEstimacionMinutos("");
      setMostrarEstimacion(false);
      await cargarLista();
      if (drawerId === id) await refrescarDetalle(id);
    } catch (e: any) {
      showAlert(e.response?.data?.error || "Ya lo tomó alguien más", "error");
    }
  };

  const handleAsignarA = async (id: number) => {
    if (!asignarA) return;
    setAsignando(true);
    try {
      await asignarTicketA(id, Number(asignarA));
      setAsignarA("");
      await cargarLista();
      if (drawerId === id) await refrescarDetalle(id);
      showAlert("Ticket asignado", "success");
    } catch (e: any) {
      showAlert(e.response?.data?.error || "No se pudo asignar", "error");
    } finally {
      setAsignando(false);
    }
  };

  const handleLiberar = async (id: number) => {
    setLiberando(true);
    try {
      await liberarTicket(id);
      await cargarLista();
      if (drawerId === id) await refrescarDetalle(id);
      showAlert("Ticket liberado — cualquier dev lo puede tomar ahora", "success");
    } catch (e: any) {
      showAlert(e.response?.data?.error || "No se pudo liberar", "error");
    } finally {
      setLiberando(false);
    }
  };

  const handleRebotar = async (id: number) => {
    setRebotando(true);
    try {
      await rebotarTicket(id, motivoRebote.trim() || undefined, rebotarDestino ? Number(rebotarDestino) : undefined);
      setMotivoRebote("");
      setRebotarDestino("");
      setMostrarRebote(false);
      await cargarLista();
      if (drawerId === id) await refrescarDetalle(id);
      showAlert(rebotarDestino ? "Ticket rebotado directo a la persona" : "Ticket regresado a la cola", "success");
    } catch (e: any) {
      showAlert(e.response?.data?.error || "No se pudo rebotar", "error");
    } finally {
      setRebotando(false);
    }
  };

  const handleCambiarPrioridad = async (id: number, prioridad: PrioridadTicket) => {
    setCambiandoPrioridad(id);
    try {
      await cambiarPrioridadTicket(id, prioridad);
      await cargarLista();
      if (drawerId === id) await refrescarDetalle(id);
    } catch (e: any) {
      showAlert(e.response?.data?.error || "No se pudo cambiar la prioridad", "error");
    } finally {
      setCambiandoPrioridad(null);
    }
  };

  const handleCambiarEstrellas = async (id: number, estrellas: 1 | 2 | 3 | 4 | 5) => {
    try {
      await cambiarEstrellasTicket(id, estrellas);
      await cargarLista();
      if (drawerId === id) await refrescarDetalle(id);
    } catch (e: any) {
      showAlert(e.response?.data?.error || "No se pudieron cambiar las estrellas", "error");
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

  // Con "Ver archivo histórico" activo, solo Finalizado y Cancelado pueden
  // tener algo (son los únicos estados que el cron archiva) — mostrar
  // Rebotados/Pendiente/En proceso vacíos ahí no aporta nada.
  const columnasVisibles = verArchivados
    ? TABLERO_COLUMNAS.filter((c) => c.key === "Finalizado" || c.key === "Cancelado")
    : TABLERO_COLUMNAS;
  const gridColsClass = verArchivados
    ? "xl:grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)]"
    : "xl:grid-cols-[minmax(155px,1fr)_minmax(220px,2fr)_minmax(220px,2fr)_minmax(155px,1fr)_minmax(155px,1fr)]";

  // Altura real del tablero, medida en JS — no una clase de Tailwind con
  // calc(100vh-...), que en este build no estaba surtiendo efecto (por eso
  // ninguna columna se recortaba y cada una crecía a su tamaño natural,
  // dejando hueco debajo de las más cortas). Esto sí es 100% responsive:
  // se recalcula solo con cada resize, sin importar el tamaño de pantalla.
  const tableroRef = useRef<HTMLDivElement>(null);
  const [alturaTablero, setAlturaTablero] = useState<number | null>(null);

  useEffect(() => {
    const calcular = () => {
      // Por debajo de xl (1280px) el tablero se apila en 1-2 columnas de
      // flujo normal — ahí no aplica altura fija, se deja crecer natural.
      if (window.innerWidth < 1280 || !tableroRef.current) {
        setAlturaTablero(null);
        return;
      }
      const top = tableroRef.current.getBoundingClientRect().top;
      const disponible = window.innerHeight - top - 16;
      setAlturaTablero(Math.max(disponible, 320));
    };
    calcular();
    window.addEventListener("resize", calcular);
    return () => window.removeEventListener("resize", calcular);
  }, [cargando]);

  // Blindaje extra: aunque el Sidebar/rutas ya no deberían dejar entrar a
  // nadie sin el privilegio real, esto evita que alguien vea el tablero
  // completo si llega por URL directa y le falta la casilla en Roles.
  if (!tieneAcceso) {
    return (
      <Dashboard>
        <div className="max-w-md mx-auto mt-16 text-center bg-white border border-slate-200 rounded-2xl p-8">
          <p className="text-3xl mb-2">🔒</p>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Sin acceso a Mesa de Tickets</h2>
          <p className="text-sm text-slate-500">
            Tu cuenta no tiene el privilegio de tickets asignado. Pídele a un administrador que te lo active desde
            Roles y Privilegios.
          </p>
        </div>
      </Dashboard>
    );
  }

  return (
    <Dashboard>
      <div className="w-full space-y-5">
        <style>{`
          .scroll-oculto { scrollbar-width: none; -ms-overflow-style: none; }
          .scroll-oculto::-webkit-scrollbar { display: none; }
        `}</style>
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

        {/* ── Tablero kanban + equipo activo ───────────────────────────── */}
        {cargando ? (
          <p className="text-sm text-slate-400 italic">Cargando tickets...</p>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center">
            <p className="text-sm text-slate-400">No hay tickets por aquí. 🎉</p>
          </div>
        ) : (
          <div
            ref={tableroRef}
            className="flex flex-col xl:flex-row gap-4 items-stretch"
            style={alturaTablero ? { height: `${alturaTablero}px` } : undefined}
          >
            {/* Pendiente y En proceso ocupan el doble de ancho que
                Finalizado y Cancelado. Mínimos bajos a propósito — mejor
                que las columnas se achiquen a que aparezca scroll
                horizontal (eso ya se probó y cortaba contenido a la vista).
                Un solo cálculo de altura arriba en vez de repetido en cada
                columna — así todas usan exactamente el mismo espacio
                disponible y no queda hueco entre la más corta y el resto. */}
            <div className={`flex-1 grid grid-cols-1 sm:grid-cols-2 ${gridColsClass} xl:grid-rows-[minmax(0,1fr)] gap-3 xl:items-stretch`}>
                {columnasVisibles.map((col) => {
                  const items = tickets
                    .filter(col.filtro)
                  .sort((a, b) => {
                    const porPrioridad = RANGO_PRIORIDAD[a.prioridad] - RANGO_PRIORIDAD[b.prioridad];
                    if (porPrioridad !== 0) return porPrioridad;
                    // Misma prioridad — desempata con estrellas, más
                    // estrellas primero (3 antes que 1).
                    return b.estrellas - a.estrellas;
                  });
                return (
                  <div key={col.key} className="flex flex-col min-w-0 xl:h-full">
                    <div className="flex items-center gap-2 mb-3 px-1 flex-shrink-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <h2 className="text-sm font-bold text-slate-700">{col.label}</h2>
                      <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                        {items.length}
                      </span>
                    </div>
                    <div className={`scroll-oculto flex-1 min-h-0 space-y-2.5 rounded-2xl border-t-4 ${col.header} bg-slate-50/60 p-2.5 overflow-y-auto`}>
                      {items.length === 0 && (
                        <p className="text-xs text-slate-300 italic px-2 py-4 text-center">vacío</p>
                      )}
                      {items.map((t) => (
                        <button
                          key={t.idticket}
                          onClick={() => abrirTicket(t.idticket)}
                          className={`relative w-full text-left bg-white border-l-4 ${BARRA_PRIORIDAD[t.prioridad]} border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
                        >
                          <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
                            <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{t.folio}</span>
                            <div className="flex items-center gap-1 flex-wrap justify-end min-w-0">
                              {notificaciones[t.idticket] && (
                                <span
                                  title="Algo nuevo sin leer"
                                  className="w-5 h-5 rounded-full bg-rose-600 flex items-center justify-center text-[11px] leading-none animate-pulse flex-shrink-0"
                                >
                                  🔔
                                </span>
                              )}
                              {t.es_personal && (
                                <span
                                  title="Ticket personal"
                                  className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[9px] flex-shrink-0"
                                >
                                  🔒
                                </span>
                              )}
                              {t.rebotado && (
                                <span
                                  title="Rebotado"
                                  className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[9px] flex-shrink-0"
                                >
                                  ↻
                                </span>
                              )}
                              {esReservado(t) && (
                                <span
                                  title="Reservado — asignado, falta confirmar"
                                  className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[9px] flex-shrink-0"
                                >
                                  📌
                                </span>
                              )}
                              {estaVencido(t) && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-600 text-white">
                                  ⏰ Vencido
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${PILDORA_PRIORIDAD[t.prioridad]}`}>
                                {t.prioridad}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 flex-1">{t.titulo}</p>
                            <Estrellas valor={t.estrellas} className="text-[10px] flex-shrink-0" />
                          </div>
                          {t.fecha_compromiso && (
                            <p className={`text-[10px] mb-1 ${estaVencido(t) ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                              📅{" "}
                              {new Date(t.fecha_compromiso).toLocaleString("es-MX", {
                                day: "2-digit",
                                month: "short",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                          {(() => {
                            const resultado = pctTiempo(t);
                            if (!resultado) return null;
                            return (
                              <p className={`text-[10px] font-semibold mb-1 ${resultado.sobreEstimado ? "text-red-600" : "text-emerald-600"}`}>
                                {resultado.sobreEstimado ? "⚠️" : "✅"} {Math.abs(resultado.pct)}%{" "}
                                {resultado.sobreEstimado ? "más lento" : "más rápido"} de lo estimado
                              </p>
                            );
                          })()}
                          <div className="flex items-center justify-between mt-2">
                            {t.asignado_nombre ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                {t.asignado_foto_url ? (
                                  <img
                                    src={t.asignado_foto_url}
                                    alt={t.asignado_nombre}
                                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                    {iniciales(t.asignado_nombre, t.asignado_apellido)}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-600 truncate">{t.asignado_nombre}</span>
                              </div>
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

            {/* Panel de equipo activo — visible para cualquiera con acceso
                al módulo (Admin también), y solo si hay alguien con algo En
                proceso. Si el único dev que anda con tickets asignados no
                tiene nada activo, el panel ni aparece. */}
            {equipoActivo.length > 0 && (
              <div className="w-full xl:w-72 flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-3.5 xl:h-full flex flex-col">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 px-0.5 flex-shrink-0">
                  Equipo activo
                </h3>
                <div className="scroll-oculto flex-1 min-h-0 space-y-5 overflow-y-auto">
                  {equipoActivo.map((dev) => {
                    const enProceso = dev.tickets.filter((t) => t.estado === "En proceso").length;
                    return (
                      <div key={dev.idusuario}>
                        <div className="flex items-center gap-3 mb-2">
                          {dev.foto_url ? (
                            <img src={dev.foto_url} alt={dev.nombre} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <span className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-700 text-xl font-bold flex items-center justify-center flex-shrink-0">
                              {iniciales(dev.nombre, dev.apellido)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">
                              {dev.nombre} {dev.apellido}
                              {dev.idusuario === user?.id && (
                                <span className="ml-1.5 text-[9px] font-bold text-blue-600 align-middle">TÚ</span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {enProceso} en proceso
                              {dev.tickets.length > enProceso && ` · ${dev.tickets.length - enProceso} por confirmar`}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1 pl-1">
                          {dev.tickets.map((t) => {
                            // Mismo ticket, 3 lecturas posibles: ya en
                            // proceso de verdad (sin indicador), se lo
                            // rebotaron directo (↻) o se lo asignaron
                            // directo y todavía no lo confirma (📌).
                            const indicador =
                              t.estado === "En proceso" ? null : t.rebotado ? "↻" : "📌";
                            return (
                              <button
                                key={t.idticket}
                                onClick={() => abrirTicket(t.idticket)}
                                className={`w-full text-left text-xs truncate flex items-center gap-1 ${
                                  indicador ? "text-amber-600 hover:text-amber-700" : "text-slate-500 hover:text-blue-600"
                                }`}
                                title={indicador === "↻" ? "Rebotado — sin confirmar" : indicador === "📌" ? "Reservado — sin confirmar" : t.titulo}
                              >
                                <span>· {t.titulo}</span>
                                {indicador && <span className="flex-shrink-0">{indicador}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: nuevo ticket ─────────────────────────────────────── */}
      {mostrarForm && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4"
          onMouseDown={(e) => setMouseDownEnFondoForm(e.target === e.currentTarget)}
          onClick={(e) => {
            if (mouseDownEnFondoForm && e.target === e.currentTarget) setMostrarForm(false);
          }}
        >
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
                rows={6}
                value={nuevo.descripcion}
                onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 resize-y min-h-[120px]"
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
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-xs text-slate-500">Importancia dentro de esta prioridad:</span>
                <Estrellas
                  valor={nuevo.estrellas}
                  editable
                  onChange={(n) => setNuevo({ ...nuevo, estrellas: n })}
                  className="text-base"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nuevo.es_personal}
                  onChange={(e) => setNuevo({ ...nuevo, es_personal: e.target.checked })}
                />
                🔒 Ticket personal — se autoasigna a mí, nadie más lo ve como pendiente
              </label>

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
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onMouseDown={(e) => setMouseDownEnFondoDrawer(e.target === e.currentTarget)}
            onClick={(e) => {
              if (mouseDownEnFondoDrawer && e.target === e.currentTarget) cerrarDrawer();
            }}
          />
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
                      {detalle.creado_por === user?.id ? (
                        <select
                          value={detalle.prioridad}
                          disabled={cambiandoPrioridad === detalle.idticket}
                          onChange={(e) => handleCambiarPrioridad(detalle.idticket, e.target.value as PrioridadTicket)}
                          title="Cambiar prioridad"
                          className={`text-[10px] font-bold pl-2 pr-1 py-0.5 rounded-full border-none appearance-none cursor-pointer disabled:opacity-50 ${PILDORA_PRIORIDAD[detalle.prioridad]}`}
                        >
                          {PRIORIDADES.map((p) => (
                            <option key={p} value={p} className="bg-white text-slate-700">
                              {p}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          title="Solo quien reportó el ticket puede cambiar la prioridad"
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PILDORA_PRIORIDAD[detalle.prioridad]}`}
                        >
                          {detalle.prioridad}
                        </span>
                      )}
                      <Estrellas
                        valor={detalle.estrellas}
                        editable={detalle.creado_por === user?.id}
                        onChange={(n) => handleCambiarEstrellas(detalle.idticket, n)}
                        className="text-sm"
                      />
                      {detalle.es_personal && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          🔒 Personal
                        </span>
                      )}
                      {detalle.rebotado && (
                        <span
                          title={detalle.motivo_rebote || undefined}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700"
                        >
                          ↻ Rebotado{detalle.motivo_rebote ? ": " + detalle.motivo_rebote : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={cerrarDrawer} className="text-slate-400 hover:text-slate-600 text-2xl leading-none flex-shrink-0">×</button>
                </div>

                <div className="px-5 py-4 border-b border-slate-100 space-y-1.5">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{detalle.descripcion}</p>
                  {detalle.ubicacion && <p className="text-xs text-slate-500">📍 {detalle.ubicacion}</p>}
                  <p className="text-xs text-slate-400">
                    Creado por {detalle.creador_nombre} {detalle.creador_apellido}
                  </p>
                  {detalle.fecha_compromiso && (
                    <p className={`text-xs font-semibold ${
                      new Date(detalle.fecha_compromiso) < new Date() && !["Finalizado", "Cancelado"].includes(detalle.estado)
                        ? "text-red-600"
                        : "text-slate-500"
                    }`}>
                      📅 Compromiso: {new Date(detalle.fecha_compromiso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {new Date(detalle.fecha_compromiso) < new Date() && !["Finalizado", "Cancelado"].includes(detalle.estado) && " — vencido"}
                    </p>
                  )}
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

                {/* Ya NO exclusivo de Super Usuario — Admin también puede
                    asignar directo (ver el selector al final del bloque).
                    "Tomar ticket" (agarrar de la cola) sí sigue siendo
                    exclusivo de resolutor, por eso ese botón puntual todavía
                    checa esResolutor más abajo. */}
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 space-y-2.5">
                  {detalle.asignado_a === user?.id && detalle.estado !== "Pendiente" ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
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
                        {!["Finalizado", "Cancelado"].includes(detalle.estado) && (
                          <button
                            onClick={() => setMostrarRebote((v) => !v)}
                            className="text-xs px-2.5 py-1 rounded-lg font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50 ml-auto"
                          >
                            ↻ Rebotar
                          </button>
                        )}
                      </div>
                      {mostrarRebote && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 space-y-1.5">
                          <input
                            value={motivoRebote}
                            onChange={(e) => setMotivoRebote(e.target.value)}
                            placeholder="Motivo (opcional) — ej. falta material"
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-rose-200 bg-white"
                          />
                          <div className="flex items-center gap-1.5">
                            <select
                              value={rebotarDestino}
                              onChange={(e) => setRebotarDestino(e.target.value)}
                              className="flex-1 text-xs px-2 py-1.5 rounded-md border border-rose-200 bg-white"
                            >
                              <option value="">Sin asignar — vuelve al montón</option>
                              {usuariosAsignables
                                .filter((u) => u.idusuario !== detalle.asignado_a)
                                .map((u) => (
                                  <option key={u.idusuario} value={u.idusuario}>
                                    Rebotar directo a {u.nombre} {u.apellido} · {u.rol}
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={() => handleRebotar(detalle.idticket)}
                              disabled={rebotando}
                              className="text-xs px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold disabled:opacity-50"
                            >
                              {rebotando ? "..." : "Confirmar"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : detalle.asignado_a === user?.id && detalle.estado === "Pendiente" ? (
                    // Reservado para mí (asignación directa o rebote con
                    // destino) pero todavía no lo confirmo — mismo flujo de
                    // "Tomar ticket" con estimado, solo que aquí el ticket
                    // ya es mío de entrada. También puedo rebotarlo sin
                    // confirmarlo, si no me toca a mí resolverlo.
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-amber-700">
                          {detalle.rebotado ? "↻ Te rebotaron este ticket" : "📌 Reservado para ti"} — falta confirmar
                        </span>
                        <button
                          onClick={() => setMostrarEstimacion((v) => !v)}
                          className="text-xs px-3 py-1.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-lg font-semibold flex-shrink-0"
                        >
                          Confirmar y tomar
                        </button>
                      </div>
                      {mostrarEstimacion && (
                        <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
                          <p className="text-[11px] text-slate-500">
                            ¿Cuánto crees que te va a tomar? Opcional — horas hábiles (L-V, 8am-6pm).
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={estimacionDias}
                                onChange={(e) => setEstimacionDias(e.target.value.replace(/\D/g, ""))}
                                placeholder="0"
                                className="w-14 text-xs px-2 py-1.5 rounded-md border border-slate-200"
                              />
                              <span className="text-xs text-slate-500">días</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={estimacionHoras}
                                onChange={(e) => setEstimacionHoras(e.target.value.replace(/\D/g, ""))}
                                placeholder="0"
                                className="w-14 text-xs px-2 py-1.5 rounded-md border border-slate-200"
                              />
                              <span className="text-xs text-slate-500">horas</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={estimacionMinutos}
                                onChange={(e) => setEstimacionMinutos(e.target.value.replace(/\D/g, ""))}
                                placeholder="0"
                                className="w-14 text-xs px-2 py-1.5 rounded-md border border-slate-200"
                              />
                              <span className="text-xs text-slate-500">min</span>
                            </div>
                            <button
                              onClick={() => handleTomar(detalle.idticket)}
                              className="ml-auto text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold"
                            >
                              Confirmar
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => setMostrarRebote((v) => !v)}
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        ↻ Prefiero rebotarlo sin confirmar
                      </button>
                      {mostrarRebote && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 space-y-1.5">
                          <input
                            value={motivoRebote}
                            onChange={(e) => setMotivoRebote(e.target.value)}
                            placeholder="Motivo (opcional) — ej. falta material"
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-rose-200 bg-white"
                          />
                          <div className="flex items-center gap-1.5">
                            <select
                              value={rebotarDestino}
                              onChange={(e) => setRebotarDestino(e.target.value)}
                              className="flex-1 text-xs px-2 py-1.5 rounded-md border border-rose-200 bg-white"
                            >
                              <option value="">Sin asignar — vuelve al montón</option>
                              {usuariosAsignables
                                .filter((u) => u.idusuario !== detalle.asignado_a)
                                .map((u) => (
                                  <option key={u.idusuario} value={u.idusuario}>
                                    Rebotar directo a {u.nombre} {u.apellido} · {u.rol}
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={() => handleRebotar(detalle.idticket)}
                              disabled={rebotando}
                              className="text-xs px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold disabled:opacity-50"
                            >
                              {rebotando ? "..." : "Confirmar"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : detalle.asignado_a ? (
                    <p className="text-xs text-slate-500">
                      {esReservado(detalle) || detalle.rebotado
                        ? <>Reservado para <strong>{detalle.asignado_nombre} {detalle.asignado_apellido}</strong> — todavía no lo confirma</>
                        : <>Asignado a <strong>{detalle.asignado_nombre} {detalle.asignado_apellido}</strong> — solo esa persona puede cambiar el estado</>}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Nadie lo ha tomado todavía</span>
                        {esResolutor && (
                          <button
                            onClick={() => setMostrarEstimacion((v) => !v)}
                            className="text-xs px-3 py-1.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-lg font-semibold"
                          >
                            Tomar ticket
                          </button>
                        )}
                      </div>
                      {mostrarEstimacion && esResolutor && (
                        <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
                          <p className="text-[11px] text-slate-500">
                            ¿Cuánto crees que te va a tomar? Opcional — horas hábiles (L-V, 8am-6pm).
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={estimacionDias}
                                onChange={(e) => setEstimacionDias(e.target.value.replace(/\D/g, ""))}
                                placeholder="0"
                                className="w-14 text-xs px-2 py-1.5 rounded-md border border-slate-200"
                              />
                              <span className="text-xs text-slate-500">días</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={estimacionHoras}
                                onChange={(e) => setEstimacionHoras(e.target.value.replace(/\D/g, ""))}
                                placeholder="0"
                                className="w-14 text-xs px-2 py-1.5 rounded-md border border-slate-200"
                              />
                              <span className="text-xs text-slate-500">horas</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={estimacionMinutos}
                                onChange={(e) => setEstimacionMinutos(e.target.value.replace(/\D/g, ""))}
                                placeholder="0"
                                className="w-14 text-xs px-2 py-1.5 rounded-md border border-slate-200"
                              />
                              <span className="text-xs text-slate-500">min</span>
                            </div>
                            <button
                              onClick={() => handleTomar(detalle.idticket)}
                              className="ml-auto text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold"
                            >
                              Confirmar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Asignación directa — ahora disponible para Admin
                      también, no solo resolutor. Sirve para reasignar sin
                      importar si ya alguien lo tiene. */}
                  {!["Finalizado", "Cancelado"].includes(detalle.estado) && usuariosAsignables.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={asignarA}
                        onChange={(e) => setAsignarA(e.target.value)}
                        className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="">Asignar directo a...</option>
                        {usuariosAsignables
                          .filter((u) => u.idusuario !== detalle.asignado_a)
                          .map((u) => (
                            <option key={u.idusuario} value={u.idusuario}>
                              {u.nombre} {u.apellido} · {u.rol}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleAsignarA(detalle.idticket)}
                        disabled={!asignarA || asignando}
                        className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold disabled:opacity-40"
                      >
                        {asignando ? "..." : "Asignar"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Liberar: convierte un ticket personal en uno normal
                    disponible para cualquier dev. Lo puede hacer el dueño
                    del pendiente o cualquier resolutor. */}
                {detalle.es_personal &&
                  !["Finalizado", "Cancelado"].includes(detalle.estado) &&
                  (detalle.creado_por === user?.id || esResolutor) && (
                    <div className="px-5 py-3 border-b border-slate-100 bg-purple-50 flex items-center justify-between gap-2">
                      <span className="text-xs text-purple-700">🔒 Este es un ticket personal</span>
                      <button
                        onClick={() => handleLiberar(detalle.idticket)}
                        disabled={liberando}
                        className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50"
                      >
                        {liberando ? "..." : "Liberar como normal"}
                      </button>
                    </div>
                  )}

                {detalle.estado === "Finalizado" &&
                  pctTiempo(detalle) &&
                  (() => {
                    const estimado = detalle.duracion_estimada_horas!;
                    const real = detalle.tiempo_real_horas!;
                    const { pct, sobreEstimado } = pctTiempo(detalle)!;
                    const base = Math.max(estimado, real);
                    const anchoEstimado = Math.min((estimado / base) * 100, 100);
                    const anchoReal = Math.min((real / base) * 100, 100);
                    return (
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2.5">
                          Tiempo estimado vs. real
                        </h4>
                        <div className="space-y-2.5">
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                              <span>Estimado</span>
                              <span>{estimado} h</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-400 rounded-full" style={{ width: `${anchoEstimado}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                              <span>Real</span>
                              <span>{real} h</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${sobreEstimado ? "bg-red-500" : "bg-emerald-500"}`}
                                style={{ width: `${anchoReal}%` }}
                              />
                            </div>
                          </div>
                          <p className={`text-xs font-semibold ${sobreEstimado ? "text-red-600" : "text-emerald-600"}`}>
                            {sobreEstimado
                              ? `⚠️ Se tardó ${pct}% más de lo estimado`
                              : `✅ Terminó ${Math.abs(pct)}% más rápido de lo estimado`}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                <div className="px-5 py-4 space-y-2.5">
                  {detalle.comentarios.length === 0 && (
                    <p className="text-xs italic text-slate-400">Aún no hay comentarios.</p>
                  )}
                  {detalle.comentarios.map((c, i) => {
                    const anterior = detalle.comentarios[i - 1];
                    const mostrarSeparador =
                      !anterior || formatearSeparadorFecha(c.created_at) !== formatearSeparadorFecha(anterior.created_at);
                    return (
                      <div key={c.idticket_comentario}>
                        {mostrarSeparador && (
                          <div className="flex items-center justify-center py-1.5">
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-3 py-1">
                              {formatearSeparadorFecha(c.created_at)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`p-2.5 rounded-xl text-sm ${
                            c.es_interno ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-xs font-semibold text-slate-700 truncate">
                              {c.nombre} {c.apellido}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {c.es_interno && (
                                <span className="text-[10px] font-semibold text-amber-700">🔒 Nota interna</span>
                              )}
                              <span className="text-[10px] text-slate-400">{formatearHora(c.created_at)}</span>
                            </div>
                          </div>
                          <p className="text-slate-600 whitespace-pre-wrap">{c.comentario}</p>
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
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 pb-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 transition-colors">
                    <textarea
                      value={comentarioDraft}
                      onChange={(e) => setComentarioDraft(e.target.value)}
                      placeholder="Escribe un comentario o actualización..."
                      rows={3}
                      className="w-full text-sm px-3 py-2 resize-y outline-none block min-h-[70px]"
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