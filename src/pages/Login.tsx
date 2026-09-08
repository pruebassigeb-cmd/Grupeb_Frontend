import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { showAlert } from "../components/CustomAlert";
import {
  loginModeService,
  collageUsuariosService,
  type CollageUsuario,
} from "../services/authService";
import logo from "../assets/grupeblanco.png";
import bolsas from "../assets/bolsas.png";

type ModoLogin = "cargando" | "COLLAGE" | "NORMAL" | "BLOQUEADO";

export default function Login() {
  const [modo, setModo] = useState<ModoLogin>("cargando");
  const [red, setRed] = useState<string | undefined>();

  // ── Estado modo NORMAL ──
  const [correo, setCorreo] = useState("");
  const [codigoNormal, setCodigoNormal] = useState("");

  // ── Estado modo COLLAGE ──
  const [usuariosCollage, setUsuariosCollage] = useState<CollageUsuario[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<CollageUsuario | null>(null);
  const [codigoCollage, setCodigoCollage] = useState("");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loginConId } = useAuth();

  // Ruta a la que hay que regresar tras autenticar — la puso ProtectedRoute
  // en el state al mandarte para acá (ej. un link de un correo a /diseno).
  const destino = (location.state as { from?: string } | null)?.from || "/home";

  // Si abres el link del correo en una pestaña nueva pero ya tienes sesión
  // activa (localStorage con el user guardado), no tiene caso mostrarte el
  // formulario — te manda directo a donde ibas.
  useEffect(() => {
    if (user) {
      navigate(destino, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Módulo de autenticación por red: al cargar la pantalla (y antes de
  // cualquier sesión), se pregunta al backend qué modo le toca a esta IP.
  useEffect(() => {
    let activo = true;

    (async () => {
      try {
        const data = await loginModeService();
        if (!activo) return;

        setModo(data.mode);
        setRed(data.network);

        if (data.mode === "COLLAGE") {
          const usuarios = await collageUsuariosService();
          if (activo) setUsuariosCollage(usuarios);
        }
      } catch {
        // Si /login-mode falla del todo (no solo un 403 controlado), no se
        // deja a nadie sin poder entrar — se cae al formulario normal,
        // igual que hace el backend cuando la consulta a BD falla.
        if (activo) setModo("NORMAL");
      }
    })();

    return () => {
      activo = false;
    };
  }, []);

  // ==========================
  // Submit — modo NORMAL
  // ==========================
  const handleSubmitNormal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correo || !correo.includes("@")) {
      showAlert("Ingresa un correo válido");
      return;
    }
    if (codigoNormal.length < 4) {
      showAlert("El código debe tener al menos 4 dígitos");
      return;
    }

    setLoading(true);
    try {
      await login(correo, codigoNormal);
      navigate(destino, { replace: true });
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // Submit — modo COLLAGE (tras elegir foto)
  // ==========================
  const handleSubmitCollage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioSeleccionado) return;

    if (codigoCollage.length < 4) {
      showAlert("El código debe tener al menos 4 dígitos");
      return;
    }

    setLoading(true);
    try {
      await loginConId(usuarioSeleccionado.id, codigoCollage);
      navigate(destino, { replace: true });
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Código incorrecto");
      setCodigoCollage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <style>{`
        .scroll-oculto {
          scrollbar-width: none;       /* Firefox */
          -ms-overflow-style: none;    /* Edge/IE viejos */
        }
        .scroll-oculto::-webkit-scrollbar {
          display: none;               /* Chrome, Safari, Edge nuevo */
        }
      `}</style>
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* IZQUIERDA */}
        <div className="hidden md:flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold text-white mb-6">BIENVENIDO</h1>
          <img src={bolsas} alt="Bolsas" className="max-w-sm w-full" />
        </div>

        {/* DERECHA */}
        <div className="flex justify-center">
          <div className="w-full max-w-md bg-slate-900/80 backdrop-blur rounded-2xl shadow-2xl p-8 border border-slate-700">
            <img src={logo} alt="Grupo EB" className="w-28 mx-auto mb-4" />

            {/* ── Cargando modo ── */}
            {modo === "cargando" && (
              <p className="text-center text-slate-400 py-10">Cargando...</p>
            )}

            {/* ── BLOQUEADO ── */}
            {modo === "BLOQUEADO" && (
              <>
                <h2 className="text-2xl font-semibold text-white text-center mb-3">
                  Acceso no permitido
                </h2>
                <p className="text-sm text-slate-400 text-center">
                  Esta red no tiene permitido acceder al sistema.
                </p>
              </>
            )}

            {/* ── NORMAL ── */}
            {modo === "NORMAL" && (
              <>
                <h2 className="text-2xl font-semibold text-white text-center mb-6">
                  Inicio de sesión
                </h2>
                <form onSubmit={handleSubmitNormal} className="space-y-5">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value.trim().toLowerCase())}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none transition-colors"
                      required
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      Código de acceso
                    </label>
                    <input
                      type="password"
                      value={codigoNormal}
                      inputMode="numeric"
                      onChange={(e) => setCodigoNormal(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none transition-colors"
                      required
                      disabled={loading}
                      autoComplete="off"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Iniciando sesión..." : "Entrar"}
                  </button>
                </form>
              </>
            )}

            {/* ── COLLAGE: selector de foto ── */}
            {modo === "COLLAGE" && !usuarioSeleccionado && (
              <>
                <h2 className="text-2xl font-semibold text-white text-center mb-1">
                  Selecciona tu usuario
                </h2>
                {red && (
                  <p className="text-xs text-slate-500 text-center mb-6">{red}</p>
                )}

                {usuariosCollage.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1 scroll-oculto">
                    {usuariosCollage.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUsuarioSeleccionado(u)}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-700 border-2 border-transparent group-hover:border-blue-500 transition-colors flex items-center justify-center">
                          {u.foto_url ? (
                            <img src={u.foto_url} alt={u.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-lg font-semibold">
                              {u.nombre.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-300 text-center leading-tight">
                          {u.nombre}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">
                    No hay usuarios disponibles.
                  </p>
                )}
              </>
            )}

            {/* ── COLLAGE: código tras elegir foto ── */}
            {modo === "COLLAGE" && usuarioSeleccionado && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setUsuarioSeleccionado(null);
                    setCodigoCollage("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 mb-4"
                >
                  ← Elegir otro usuario
                </button>

                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center mb-3">
                    {usuarioSeleccionado.foto_url ? (
                      <img
                        src={usuarioSeleccionado.foto_url}
                        alt={usuarioSeleccionado.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-semibold">
                        {usuarioSeleccionado.nombre.charAt(0)}
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium">{usuarioSeleccionado.nombre}</p>
                </div>

                <form onSubmit={handleSubmitCollage} className="space-y-5">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1 text-center">
                      Código de acceso
                    </label>
                    <input
                      type="password"
                      value={codigoCollage}
                      inputMode="numeric"
                      autoFocus
                      onChange={(e) => setCodigoCollage(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none transition-colors text-center tracking-widest"
                      required
                      disabled={loading}
                      autoComplete="off"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Iniciando sesión..." : "Entrar"}
                  </button>
                </form>
              </>
            )}

            {modo !== "BLOQUEADO" && (
              <p className="text-xs text-slate-500 text-center mt-6">
                Acceso restringido
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}