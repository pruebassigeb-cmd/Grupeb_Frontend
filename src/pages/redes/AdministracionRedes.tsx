import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";
import { esAdminOSuperUsuario } from "../../utils/permisosUsuario";
import { showAlert } from "../../components/CustomAlert";
import Dashboard from "../../layouts/Sidebar";
import {
  listarRedesService,
  crearRedService,
  actualizarRedService,
  cambiarEstadoRedService,
  eliminarRedService,
  listarSightingsService,
  promoverSightingService,
  ignorarSightingService,
  type Red,
  type RedPayload,
  type Sighting,
  type LoginMode,
} from "../../services/redesService";

const MODOS: LoginMode[] = ["COLLAGE", "NORMAL", "BLOQUEADO"];

const ETIQUETA_MODO: Record<LoginMode, string> = {
  COLLAGE: "Collage (selección por foto)",
  NORMAL: "Normal (correo + código)",
  BLOQUEADO: "Bloqueado (sin acceso)",
};

const MODO_ESTILO: Record<LoginMode, string> = {
  COLLAGE: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
  NORMAL: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20",
  BLOQUEADO: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
};

const MODO_PUNTO: Record<LoginMode, string> = {
  COLLAGE: "bg-blue-500",
  NORMAL: "bg-slate-400",
  BLOQUEADO: "bg-red-500",
};

const MODO_ICONO: Record<LoginMode, string> = {
  COLLAGE: "🖼️",
  NORMAL: "🔑",
  BLOQUEADO: "🚫",
};

function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// ==========================
// Tarjeta de resumen (stat)
// ==========================
function StatCard({
  label,
  valor,
  icono,
  acento,
}: {
  label: string;
  valor: number;
  icono: string;
  acento: "blue" | "green" | "amber";
}) {
  const estilos: Record<string, { borde: string; badge: string }> = {
    blue: { borde: "border-l-blue-500", badge: "bg-blue-50 text-blue-600" },
    green: { borde: "border-l-emerald-500", badge: "bg-emerald-50 text-emerald-600" },
    amber: { borde: "border-l-amber-500", badge: "bg-amber-50 text-amber-600" },
  };
  const e = estilos[acento];
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${e.borde} px-5 py-4 shadow-sm flex items-center gap-4`}>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${e.badge}`}>
        {icono}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900 leading-none">{valor}</p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

// ==========================
// Formulario de alta/edición de red
// ==========================
interface RedFormProps {
  inicial: RedPayload;
  ipBloqueada?: boolean; // true cuando viene de "promover" — la IP no se edita, es la del avistamiento
  acento?: "blue" | "amber";
  titulo: string;
  onCancelar: () => void;
  onGuardar: (payload: RedPayload) => Promise<void>;
}

function RedForm({ inicial, ipBloqueada, acento = "blue", titulo, onCancelar, onGuardar }: RedFormProps) {
  const [form, setForm] = useState<RedPayload>(inicial);
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      showAlert("El nombre es requerido");
      return;
    }
    if (!ipBloqueada && !form.ip_publica.trim()) {
      showAlert("La IP pública es requerida");
      return;
    }

    setGuardando(true);
    try {
      await onGuardar(form);
    } finally {
      setGuardando(false);
    }
  };

  const bordeAcento = acento === "amber" ? "border-l-amber-500" : "border-l-blue-500";

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white border border-slate-200 border-l-4 ${bordeAcento} rounded-xl p-5 space-y-4 shadow-sm`}
    >
      <h3 className="text-sm font-semibold text-slate-800">{titulo}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="Planta, Oficinas..."
            disabled={guardando}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">IP pública</label>
          <input
            type="text"
            value={form.ip_publica}
            onChange={(e) => setForm({ ...form, ip_publica: e.target.value.trim() })}
            className="w-full px-3 py-2 rounded-md border border-slate-300 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
            placeholder="187.x.x.10"
            disabled={guardando || ipBloqueada}
          />
          {ipBloqueada && (
            <p className="text-xs text-slate-500 mt-1">
              Se toma de la IP detectada — no se puede cambiar aquí.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Modo</label>
          <select
            value={form.login_mode}
            onChange={(e) => setForm({ ...form, login_mode: e.target.value as LoginMode })}
            className="w-full px-3 py-2 rounded-md border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            disabled={guardando}
          >
            {MODOS.map((m) => (
              <option key={m} value={m}>
                {ETIQUETA_MODO[m]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            id={`activa-${titulo}`}
            type="checkbox"
            checked={form.activa}
            onChange={(e) => setForm({ ...form, activa: e.target.checked })}
            disabled={guardando}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor={`activa-${titulo}`} className="text-sm text-slate-700">
            Red activa
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Descripción (opcional)
          </label>
          <textarea
            value={form.descripcion ?? ""}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            rows={2}
            disabled={guardando}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

// ==========================
// Panel lateral — guía rápida de los 3 modos
// ==========================
function GuiaModos() {
  const items: { modo: LoginMode; texto: string }[] = [
    { modo: "COLLAGE", texto: "Selector de foto, para redes internas de confianza (Planta, Oficinas)." },
    { modo: "NORMAL", texto: "Correo + código, el login de siempre. Es el default para IPs no registradas." },
    { modo: "BLOQUEADO", texto: "Sin acceso al sistema. Útil para redes de invitados." },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Guía rápida de modos</h2>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.modo} className="flex gap-3">
            <span className="text-lg leading-none mt-0.5">{MODO_ICONO[it.modo]}</span>
            <div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${MODO_ESTILO[it.modo]}`}>
                {it.modo}
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">{it.texto}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-500 leading-relaxed">
          Desactivar una red no bloquea a nadie: solo apaga su modo especial
          y todos caen a <span className="font-medium text-slate-700">NORMAL</span> mientras esté inactiva.
        </p>
      </div>
    </div>
  );
}

// ==========================
// Contenido de la página (sin el Sidebar — se envuelve al final)
// ==========================
function AdministracionRedesContenido() {
  const [tab, setTab] = useState<"redes" | "sightings">("redes");

  const [redes, setRedes] = useState<Red[]>([]);
  const [cargandoRedes, setCargandoRedes] = useState(true);
  const [editando, setEditando] = useState<Red | null>(null);
  const [creando, setCreando] = useState(false);

  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [cargandoSightings, setCargandoSightings] = useState(true);
  const [promoviendo, setPromoviendo] = useState<Sighting | null>(null);

  const cargarRedes = async () => {
    setCargandoRedes(true);
    try {
      const data = await listarRedesService();
      setRedes(data);
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al cargar redes");
    } finally {
      setCargandoRedes(false);
    }
  };

  const cargarSightings = async () => {
    setCargandoSightings(true);
    try {
      const data = await listarSightingsService("pendiente");
      setSightings(data);
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al cargar IPs detectadas");
    } finally {
      setCargandoSightings(false);
    }
  };

  useEffect(() => {
    cargarRedes();
    cargarSightings();
  }, []);

  // ── Redes: alta ──
  const handleCrear = async (payload: RedPayload) => {
    try {
      await crearRedService(payload);
      setCreando(false);
      cargarRedes();
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al crear la red");
    }
  };

  // ── Redes: edición ──
  const handleActualizar = async (payload: RedPayload) => {
    if (!editando) return;
    try {
      await actualizarRedService(editando.id_red, payload);
      setEditando(null);
      cargarRedes();
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al actualizar la red");
    }
  };

  // ── Redes: activar/desactivar ──
  const handleToggleActiva = async (red: Red) => {
    try {
      await cambiarEstadoRedService(red.id_red, !red.activa);
      cargarRedes();
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al cambiar el estado");
    }
  };

  // ── Redes: eliminar ──
  const handleEliminar = async (red: Red) => {
    if (!window.confirm(`¿Eliminar la red "${red.nombre}"?`)) return;
    try {
      await eliminarRedService(red.id_red);
      cargarRedes();
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al eliminar la red");
    }
  };

  // ── Sightings: ignorar ──
  const handleIgnorar = async (s: Sighting) => {
    if (!window.confirm(`¿Ignorar ${s.ip_publica}? No es una red de la empresa.`)) return;
    try {
      await ignorarSightingService(s.id_avistamiento);
      cargarSightings();
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al ignorar el avistamiento");
    }
  };

  // ── Sightings: promover ──
  const handlePromover = async (payload: RedPayload) => {
    if (!promoviendo) return;
    try {
      await promoverSightingService(promoviendo.id_avistamiento, {
        nombre: payload.nombre,
        login_mode: payload.login_mode,
        activa: payload.activa,
        descripcion: payload.descripcion,
      });
      setPromoviendo(null);
      cargarSightings();
      cargarRedes();
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Error al promover el avistamiento");
    }
  };

  const totalRedes = redes.length;
  const redesActivas = redes.filter((r) => r.activa).length;

  return (
    <div className="w-full">
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center text-2xl flex-shrink-0">
          🌐
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Administración de redes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Define qué pantalla de login le corresponde a cada red según su IP pública.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Redes registradas" valor={totalRedes} icono="📡" acento="blue" />
        <StatCard label="Redes activas" valor={redesActivas} icono="✅" acento="green" />
        <StatCard label="IPs por revisar" valor={sightings.length} icono="🔍" acento="amber" />
      </div>

      {/* Layout principal: contenido + panel de guía */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Columna principal ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            <button
              onClick={() => setTab("redes")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === "redes"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Redes autorizadas
            </button>
            <button
              onClick={() => setTab("sightings")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                tab === "sightings"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              IPs detectadas
              {sightings.length > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5">
                  {sightings.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Tab: Redes autorizadas ── */}
          {tab === "redes" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                {!creando && (
                  <button
                    onClick={() => setCreando(true)}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow-sm"
                  >
                    + Agregar red
                  </button>
                )}
              </div>

              {creando && (
                <RedForm
                  titulo="Nueva red"
                  inicial={{ nombre: "", ip_publica: "", login_mode: "NORMAL", activa: true, descripcion: "" }}
                  onCancelar={() => setCreando(false)}
                  onGuardar={handleCrear}
                />
              )}

              {cargandoRedes ? (
                <p className="text-slate-500 text-sm py-10 text-center">Cargando redes...</p>
              ) : redes.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-slate-300 rounded-xl bg-white">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-slate-500 text-sm">Todavía no hay redes registradas.</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Agrega una a mano, o espera a que aparezca en "IPs detectadas".
                  </p>
                </div>
              ) : (
                <>
                  {/* ── Vista tabla (md en adelante) ── */}
                  <div className="hidden md:block overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Nombre</th>
                          <th className="text-left px-4 py-3 font-medium">IP pública</th>
                          <th className="text-left px-4 py-3 font-medium">Modo</th>
                          <th className="text-left px-4 py-3 font-medium">Estado</th>
                          <th className="text-right px-4 py-3 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {redes.map((red) =>
                          editando?.id_red === red.id_red ? (
                            <tr key={red.id_red}>
                              <td colSpan={5} className="p-3 bg-slate-50">
                                <RedForm
                                  titulo={`Editar "${red.nombre}"`}
                                  inicial={{
                                    nombre: red.nombre,
                                    ip_publica: red.ip_publica,
                                    login_mode: red.login_mode,
                                    activa: red.activa,
                                    descripcion: red.descripcion ?? "",
                                  }}
                                  onCancelar={() => setEditando(null)}
                                  onGuardar={handleActualizar}
                                />
                              </td>
                            </tr>
                          ) : (
                            <tr key={red.id_red} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
                                    {MODO_ICONO[red.login_mode]}
                                  </span>
                                  <span className="text-slate-900 font-medium">{red.nombre}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-slate-600">{red.ip_publica}</td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${MODO_ESTILO[red.login_mode]}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${MODO_PUNTO[red.login_mode]}`} />
                                  {red.login_mode}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <button
                                  onClick={() => handleToggleActiva(red)}
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                    red.activa
                                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100"
                                      : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-400/20 hover:bg-slate-200"
                                  }`}
                                  title="Clic para cambiar"
                                >
                                  {red.activa ? "Activa" : "Inactiva"}
                                </button>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => setEditando(red)}
                                    className="px-2.5 py-1 rounded-md text-blue-600 hover:bg-blue-50 text-xs font-medium"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleEliminar(red)}
                                    className="px-2.5 py-1 rounded-md text-red-600 hover:bg-red-50 text-xs font-medium"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Vista tarjetas (móvil) — todo apilado en vertical, sin scroll horizontal ── */}
                  <div className="md:hidden space-y-3">
                    {redes.map((red) =>
                      editando?.id_red === red.id_red ? (
                        <RedForm
                          key={red.id_red}
                          titulo={`Editar "${red.nombre}"`}
                          inicial={{
                            nombre: red.nombre,
                            ip_publica: red.ip_publica,
                            login_mode: red.login_mode,
                            activa: red.activa,
                            descripcion: red.descripcion ?? "",
                          }}
                          onCancelar={() => setEditando(null)}
                          onGuardar={handleActualizar}
                        />
                      ) : (
                        <div key={red.id_red} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                              {MODO_ICONO[red.login_mode]}
                            </span>
                            <div className="min-w-0">
                              <p className="text-slate-900 font-medium truncate">{red.nombre}</p>
                              <p className="font-mono text-xs text-slate-500 truncate">{red.ip_publica}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${MODO_ESTILO[red.login_mode]}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${MODO_PUNTO[red.login_mode]}`} />
                              {red.login_mode}
                            </span>
                            <button
                              onClick={() => handleToggleActiva(red)}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                red.activa
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                  : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-400/20"
                              }`}
                            >
                              {red.activa ? "Activa" : "Inactiva"}
                            </button>
                          </div>

                          <div className="flex gap-2 pt-1 border-t border-slate-100 -mx-4 px-4 pt-3">
                            <button
                              onClick={() => setEditando(red)}
                              className="flex-1 px-3 py-1.5 rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 text-xs font-medium"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleEliminar(red)}
                              className="flex-1 px-3 py-1.5 rounded-md text-red-600 bg-red-50 hover:bg-red-100 text-xs font-medium"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Tab: IPs detectadas ── */}
          {tab === "sightings" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                IPs que han entrado a la pantalla de login sin estar registradas.
                Promuévelas si son de la empresa, o ignóralas si no lo son — de
                cualquier forma seguirán entrando por el modo normal.
              </p>

              {cargandoSightings ? (
                <p className="text-slate-500 text-sm py-10 text-center">Cargando...</p>
              ) : sightings.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-slate-300 rounded-xl bg-white">
                  <p className="text-3xl mb-2">✨</p>
                  <p className="text-slate-500 text-sm">No hay IPs pendientes por revisar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sightings.map((s) =>
                    promoviendo?.id_avistamiento === s.id_avistamiento ? (
                      <RedForm
                        key={s.id_avistamiento}
                        titulo={`Promover ${s.ip_publica}`}
                        acento="amber"
                        inicial={{ nombre: "", ip_publica: s.ip_publica, login_mode: "NORMAL", activa: true, descripcion: "" }}
                        ipBloqueada
                        onCancelar={() => setPromoviendo(null)}
                        onGuardar={handlePromover}
                      />
                    ) : (
                      <div
                        key={s.id_avistamiento}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-sm flex-shrink-0">
                            🔍
                          </span>
                          <div className="min-w-0">
                            <p className="font-mono text-slate-900 text-sm truncate">{s.ip_publica}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Visto {s.veces_vista} {s.veces_vista === 1 ? "vez" : "veces"} · última vez{" "}
                              {formatearFecha(s.ultima_vez)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPromoviendo(s)}
                            className="flex-1 sm:flex-none px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                          >
                            Promover
                          </button>
                          <button
                            onClick={() => handleIgnorar(s)}
                            className="flex-1 sm:flex-none px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50"
                          >
                            Ignorar
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Columna lateral: guía rápida ── */}
        <div className="lg:col-span-1">
          <GuiaModos />
        </div>
      </div>
    </div>
  );
}

// ==========================
// Página — protección + Sidebar
// ==========================
export default function AdministracionRedes() {
  const { user } = useAuth();

  // Protección extra por código, mismo patrón que /backups en App.tsx — la
  // ruta no exige permisoPantalla porque esto no es un privilegio granular
  // de los que se gestionan en Roles: es exclusivo de admin/superusuario.
  if (!esAdminOSuperUsuario(user)) {
    return <Navigate to="/sin-acceso" replace />;
  }

  return (
    <Dashboard>
      <AdministracionRedesContenido />
    </Dashboard>
  );
}