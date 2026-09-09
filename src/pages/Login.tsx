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

// ==========================
// Iconos SVG (sin librerías externas) — reemplazan los emojis en el kiosco
// ==========================
type IconProps = { className?: string };

const IconLock = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const IconEyeOpen = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.7 18.7 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconInfo = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const IconUser = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4" />
    <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
  </svg>
);

const IconStar = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .587l3.668 7.431L23.6 9.17l-5.8 5.652L19.335 24 12 19.897 4.665 24l1.535-9.178L.4 9.17l7.932-1.152z" />
  </svg>
);

const IconBackspace = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
    <line x1="18" y1="9" x2="12" y2="15" />
    <line x1="12" y1="9" x2="18" y2="15" />
  </svg>
);

const IconHelp = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconWifi = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

type ModoLogin = "cargando" | "COLLAGE" | "NORMAL" | "BLOQUEADO";

// ==========================
// Reloj en vivo — usado solo en el header del kiosco (COLLAGE)
// ==========================
function useRelojEnVivo() {
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return ahora;
}

// ==========================
// Teclado numérico estilo teléfono (con letras decorativas bajo cada
// dígito, como un dial pad) — para la pantalla de código en modo kiosco.
// ==========================
const TECLAS_TELEFONO: { digito: string; letras: string }[] = [
  { digito: "1", letras: "" },
  { digito: "2", letras: "ABC" },
  { digito: "3", letras: "DEF" },
  { digito: "4", letras: "GHI" },
  { digito: "5", letras: "JKL" },
  { digito: "6", letras: "MNO" },
  { digito: "7", letras: "PQRS" },
  { digito: "8", letras: "TUV" },
  { digito: "9", letras: "WXYZ" },
];

function TecladoNumerico({
  onDigito,
  onBorrar,
}: {
  onDigito: (d: string) => void;
  onBorrar: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
      {TECLAS_TELEFONO.map((t) => (
        <button
          key={t.digito}
          type="button"
          onClick={() => onDigito(t.digito)}
          className="h-10 sm:h-16 md:h-20 rounded-xl bg-white flex flex-col items-center justify-center shadow-sm hover:bg-slate-50 active:scale-95 transition-transform"
        >
          <span className="text-base sm:text-2xl font-semibold text-slate-800 leading-none">{t.digito}</span>
          {t.letras && (
            <span className="hidden sm:inline text-[10px] tracking-widest text-slate-400 mt-0.5">{t.letras}</span>
          )}
        </button>
      ))}

      <div />
      <button
        type="button"
        onClick={() => onDigito("0")}
        className="h-10 sm:h-16 md:h-20 rounded-xl bg-white flex items-center justify-center text-base sm:text-2xl font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-95 transition-transform"
      >
        0
      </button>
      <button
        type="button"
        onClick={onBorrar}
        className="h-10 sm:h-16 md:h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-200 active:scale-95 transition-transform"
        aria-label="Borrar"
      >
        <IconBackspace className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
}

// ==========================
// Helper — ID visible en la tarjeta (derivado de nombre/apellido/id reales,
// no es un campo que exista en la BD; es solo un badge de presentación).
// ==========================
function idVisible(u: CollageUsuario): string {
  const inicial = u.nombre.trim().charAt(0).toUpperCase();
  const apellidoCorto = u.apellido.trim().slice(0, 3).toUpperCase();
  const numero = String(u.id).padStart(3, "0");
  return `${inicial}${apellidoCorto}-${numero}`;
}

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

  const destino = (location.state as { from?: string } | null)?.from || "/home";

  useEffect(() => {
    if (user) {
      navigate(destino, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
  // Submit — modo COLLAGE
  // ==========================
  const enviarCodigoCollage = async (codigo: string) => {
    if (!usuarioSeleccionado || codigo.length < 4) return;
    setLoading(true);
    try {
      await loginConId(usuarioSeleccionado.id, codigo);
      navigate(destino, { replace: true });
    } catch (err: any) {
      showAlert(err.response?.data?.error || "Código incorrecto");
      setCodigoCollage("");
    } finally {
      setLoading(false);
    }
  };

  const handleDigitoCollage = (d: string) => {
    setCodigoCollage((prev) => (prev.length >= 8 ? prev : prev + d));
  };

  const handleBorrarCollage = () => {
    setCodigoCollage((prev) => prev.slice(0, -1));
  };

  // ==========================
  // Kiosco — modo COLLAGE (pantalla completa, distinta al resto)
  // ==========================
  if (modo === "COLLAGE") {
    return (
      <PantallaKiosco
        red={red}
        usuarios={usuariosCollage}
        usuarioSeleccionado={usuarioSeleccionado}
        codigo={codigoCollage}
        loading={loading}
        onSeleccionar={setUsuarioSeleccionado}
        onVolver={() => {
          setUsuarioSeleccionado(null);
          setCodigoCollage("");
        }}
        onDigito={handleDigitoCollage}
        onBorrar={handleBorrarCollage}
        onEnviar={() => enviarCodigoCollage(codigoCollage)}
      />
    );
  }

  // ==========================
  // NORMAL / BLOQUEADO / cargando — tarjeta original
  // ==========================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
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

            {modo === "cargando" && (
              <p className="text-center text-slate-400 py-10">Cargando...</p>
            )}

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

// ==========================
// Pantalla de kiosco (COLLAGE) — layout completamente distinto, pensado
// para una pantalla táctil compartida en planta/oficinas.
// ==========================
interface PantallaKioscoProps {
  red?: string;
  usuarios: CollageUsuario[];
  usuarioSeleccionado: CollageUsuario | null;
  codigo: string;
  loading: boolean;
  onSeleccionar: (u: CollageUsuario) => void;
  onVolver: () => void;
  onDigito: (d: string) => void;
  onBorrar: () => void;
  onEnviar: () => void;
}

function PantallaKiosco({
  red,
  usuarios,
  usuarioSeleccionado,
  codigo,
  loading,
  onSeleccionar,
  onVolver,
  onDigito,
  onBorrar,
  onEnviar,
}: PantallaKioscoProps) {
  const ahora = useRelojEnVivo();
  const hora = ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
  const fecha = ahora.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });

  const [mostrarCodigo, setMostrarCodigo] = useState(false);

  // Soporte de teclado físico: además del teclado táctil en pantalla, si hay
  // un teclado real conectado (o el navegador de escritorio para pruebas),
  // los dígitos 0-9, Backspace y Enter funcionan igual. Solo se activa
  // mientras se está en la pantalla de código (usuarioSeleccionado presente).
  useEffect(() => {
    if (!usuarioSeleccionado) return;

    const handler = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        onDigito(e.key);
      } else if (e.key === "Backspace") {
        onBorrar();
      } else if (e.key === "Enter") {
        onEnviar();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [usuarioSeleccionado, onDigito, onBorrar, onEnviar]);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap');
        .frase-calidad { font-family: 'Caveat', cursive; }
        .scroll-oculto {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scroll-oculto::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <header className="bg-slate-900 text-white px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img src={logo} alt="Grupo EB" className="h-6 sm:h-9 w-auto flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs sm:text-base font-bold tracking-wide leading-tight truncate">SISTEMA EB</p>
            <p className="text-[9px] sm:text-[11px] text-blue-400 font-medium tracking-wide truncate">
              AUTENTICACIÓN POR RED
            </p>
          </div>
        </div>

        <div className="hidden sm:block text-center">
          <h1 className="text-lg md:text-xl font-bold tracking-wide">
            {usuarioSeleccionado ? "LOGIN DEL OPERADOR" : "SELECCIONA TU USUARIO"}
          </h1>
          <p className="text-xs text-slate-400">
            {usuarioSeleccionado ? "Ingresa tu clave personal para iniciar sesión" : "Toca tu fotografía para iniciar sesión"}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-xs sm:text-base font-semibold leading-tight">{hora}</p>
          <p className="text-[9px] sm:text-[11px] text-slate-400">{fecha}</p>
        </div>
      </header>

      {/* Título visible en móvil, solo en la pantalla de selección — en la
          de código se omite para ganar espacio vertical, ya el panel de
          clave repite el propósito con su propio encabezado. */}
      {!usuarioSeleccionado && (
        <div className="sm:hidden text-center py-1.5 bg-white border-b border-slate-200 flex-shrink-0">
          <h1 className="text-sm font-bold text-slate-900">SELECCIONA TU USUARIO</h1>
          <p className="text-[11px] text-slate-500">Toca tu fotografía para iniciar sesión</p>
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto scroll-oculto px-3 sm:px-8 py-3 sm:py-6">
        <div className="max-w-6xl w-full mx-auto">
        {!usuarioSeleccionado ? (
          <>
            {/* Barra de contexto de red */}
            <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-3.5 mb-6 shadow-sm">
              <span className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                <IconWifi className="w-5 h-5" />
              </span>
              <div>
                <p className="font-semibold text-slate-900">{red ?? "Red autorizada"}</p>
                <p className="text-xs text-slate-500">Selecciona tu usuario para iniciar sesión</p>
              </div>
            </div>

            {/* Cuadrícula de usuarios — fotos 50% más grandes (120px vs 80px) */}
            {usuarios.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {usuarios.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onSeleccionar(u)}
                    className="bg-white border border-transparent rounded-xl p-5 flex flex-col items-center gap-3 shadow-sm hover:shadow-md hover:border-blue-300 active:scale-[0.98] transition-all"
                  >
                    <div className="w-[120px] h-[120px] rounded-full overflow-hidden bg-slate-100 border-2 border-slate-100 flex items-center justify-center flex-shrink-0">
                      {u.foto_url ? (
                        <img src={u.foto_url} alt={u.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-500 text-3xl font-semibold">
                          {u.nombre.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{u.nombre}</p>
                      {u.rol && (
                        <p className="text-xs text-blue-600 font-medium leading-tight mt-0.5">{u.rol}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-white">
                <p className="text-slate-500 text-sm">No hay usuarios disponibles.</p>
              </div>
            )}

            {/* Nota de ayuda genérica */}
            <div className="flex items-start gap-3 bg-blue-50 rounded-xl px-5 py-4 mt-6">
              <IconInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">
                Si tu fotografía no aparece en la lista, contacta a un administrador.
              </p>
            </div>
          </>
        ) : (
          /* ── Pantalla de código, tras elegir usuario ── */
          <div>
            {/* Barra superior: volver / ayuda */}
            <div className="flex items-center justify-between mb-2 sm:mb-6">
              <button
                type="button"
                onClick={onVolver}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-blue-200 text-blue-600 text-xs sm:text-sm font-medium bg-white hover:bg-blue-50 flex items-center gap-1.5"
              >
                ← Volver al inicio
              </button>
              <button
                type="button"
                onClick={() =>
                  showAlert("Contacta a tu supervisor o al área de sistemas si tienes problemas para iniciar sesión.")
                }
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-blue-200 text-blue-600 text-xs sm:text-sm font-medium bg-white hover:bg-blue-50 flex items-center gap-1.5"
              >
                <IconHelp className="w-4 h-4" />
                Ayuda
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-6 items-stretch">
              {/* ── Panel izquierdo: usuario — fila compacta en móvil, columna centrada desde sm ── */}
              <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-8 h-full flex flex-row sm:flex-col items-center justify-center sm:justify-center text-left sm:text-center gap-3 sm:gap-0">
                <div className="w-14 h-14 sm:w-48 sm:h-48 lg:w-56 lg:h-56 rounded-full overflow-hidden bg-slate-100 border-2 sm:border-4 border-white shadow-md flex items-center justify-center flex-shrink-0 sm:mb-5">
                  {usuarioSeleccionado.foto_url ? (
                    <img
                      src={usuarioSeleccionado.foto_url}
                      alt={usuarioSeleccionado.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-500 text-lg sm:text-5xl font-semibold">
                      {usuarioSeleccionado.nombre.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-base sm:text-2xl font-bold text-slate-900 truncate">{usuarioSeleccionado.nombre}</p>
                  {usuarioSeleccionado.rol && (
                    <p className="text-xs sm:text-sm text-blue-600 font-medium sm:mt-1 truncate">{usuarioSeleccionado.rol}</p>
                  )}

                  <span className="inline-flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-3 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] sm:text-sm font-medium">
                    <IconUser className="w-3 h-3 sm:w-4 sm:h-4" /> ID: {idVisible(usuarioSeleccionado)}
                  </span>

                  <p className="frase-calidad text-sm sm:text-2xl text-blue-700 mt-1 sm:mt-5 flex items-center gap-1 sm:gap-2">
                    <IconStar className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0" /> La calidad comienza contigo.
                  </p>
                </div>
              </div>

              {/* ── Panel derecho: clave ── */}
              <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-8 h-full">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-5">
                  <span className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <IconLock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-semibold text-slate-900">Ingresa tu clave</h2>
                    <p className="hidden sm:block text-xs text-slate-500">
                      Usa el teclado en pantalla o el de tu dispositivo.
                    </p>
                  </div>
                </div>

                {/* Indicador de dígitos + botón mostrar/ocultar */}
                <div className="flex items-center justify-center gap-3 bg-slate-50 rounded-xl px-3 sm:px-4 py-2 sm:py-4 mb-2 sm:mb-5">
                  <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 flex-wrap min-h-[1.25rem] sm:min-h-[1.5rem]">
                    {codigo.length === 0 ? (
                      <span className="text-xs sm:text-sm text-slate-400">Sin dígitos aún</span>
                    ) : mostrarCodigo ? (
                      codigo.split("").map((d, i) => (
                        <span key={i} className="text-base sm:text-xl font-semibold text-slate-800">
                          {d}
                        </span>
                      ))
                    ) : (
                      codigo.split("").map((_, i) => (
                        <span key={i} className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-800" />
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarCodigo((v) => !v)}
                    className="text-slate-400 hover:text-slate-700 flex-shrink-0"
                    title={mostrarCodigo ? "Ocultar clave" : "Mostrar clave"}
                  >
                    {mostrarCodigo ? <IconEyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <IconEyeOpen className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>

                <TecladoNumerico onDigito={onDigito} onBorrar={onBorrar} />

                <button
                  type="button"
                  onClick={onEnviar}
                  disabled={loading || codigo.length < 4}
                  className="w-full mt-2 sm:mt-5 py-2 sm:py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm sm:text-lg shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <IconLock className="w-4 h-4 sm:w-5 sm:h-5" />
                  {loading ? "Entrando..." : "Iniciar sesión"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Pie de página fijo — no se va con el scroll del contenido */}
      <footer className="flex-shrink-0 bg-blue-50 border-t border-blue-100 px-3 sm:px-8 py-1.5 sm:py-3 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-4 text-center">
        <span className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm text-blue-900">
          <IconInfo className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          Recuerda: la calidad no es responsabilidad de uno solo, es compromiso de todos.
        </span>
        <span className="hidden sm:inline text-blue-200">|</span>
        <span className="text-[11px] sm:text-sm font-bold text-blue-700">¡Juntos hacemos la diferencia!</span>
      </footer>
    </div>
  );
}