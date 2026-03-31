import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SinAcceso() {
  const navigate  = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icono */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Texto */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Acceso restringido
        </h1>

        <p className="text-slate-400 mb-2">
          No tienes permisos para acceder a esta sección.
        </p>

        {user && (
          <p className="text-slate-500 text-sm mb-8">
            Sesión iniciada como{" "}
            <span className="text-slate-300 font-medium">
              {user.nombre} {user.apellido}
            </span>{" "}
            —{" "}
            <span className="text-slate-400">{user.rol}</span>
          </p>
        )}

        {/* Botón */}
        <button
          onClick={() => navigate("/home")}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}